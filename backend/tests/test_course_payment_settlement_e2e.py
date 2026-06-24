"""P0 集成测试：验证"上课→扣课时→算钱"闭环端到端。

核心业务闭环：
1. 收款 → 充课时 (POST /payments → children.totalhours += N)
2. 上课 → 扣课时 + 自动生成结算 (PUT /courses/{id} status=completed
   → children.usedhours += hours + settlements 自动插入)
3. 结算付款 (PUT /settlements/{id}/pay → status=pending→paid)
4. 课时余额 = totalhours - usedhours

验证点:
- 正向闭环：收款→排课→完成→课时正确→结算正确→付款
- 余额不足场景：学员课时不足时仍可完成课程(usedhours 超过 totalhours)
- 多学员同课程：每人都扣课时，结算只有一笔
- 自定义课时数：hours=2 时扣2课时
- 结算幂等：同一课程不会生成两笔 settlement
- calc-hours 与手动结算一致性
"""

import pytest
from datetime import date, timedelta
from httpx import AsyncClient

from tests.conftest import (
    TEACHER_USERNAME,
    login_admin, login_teacher, login_parent, auth_headers,
)
from app.core.database import get_supabase


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_teacher_id() -> str:
    sb = get_supabase()
    r = sb.table("teachers").select("id").eq("username", TEACHER_USERNAME).limit(1).execute()
    assert r.data, "测试教师不存在"
    return r.data[0]["id"]


def _get_child_id_by_parent_phone(phone: str) -> str | None:
    sb = get_supabase()
    u = sb.table("users").select("id").eq("phone", phone).eq("role", "parent").limit(1).execute()
    if not u.data:
        return None
    c = sb.table("children").select("id").eq("parent_id", u.data[0]["id"]).limit(1).execute()
    return c.data[0]["id"] if c.data else None


def _get_child_hours(child_id: str) -> dict:
    """返回 {totalhours, usedhours} 直接从 DB 读。"""
    sb = get_supabase()
    r = sb.table("children").select("totalhours, usedhours").eq("id", child_id).limit(1).execute()
    assert r.data, f"学员 {child_id} 不存在"
    return {
        "totalhours": r.data[0].get("totalhours") or 0,
        "usedhours": r.data[0].get("usedhours") or 0,
    }


def _set_teacher_hourly_rate(teacher_id: str, rate: float):
    """直接更新教师时薪（测试用）。"""
    sb = get_supabase()
    sb.table("teachers").update({"hourly_rate": rate}).eq("id", teacher_id).execute()


def _reset_child_hours(child_id: str, total: int = 0, used: int = 0):
    """重置学员课时（测试隔离用）。"""
    sb = get_supabase()
    sb.table("children").update({"totalhours": total, "usedhours": used}).eq("id", child_id).execute()


def _cleanup_courses_and_settlements(teacher_id: str):
    """清理该教师的课程、课程学员、反馈和自动结算。"""
    sb = get_supabase()
    courses = sb.table("courses").select("id").eq("teacher_id", teacher_id).execute()
    for c in (courses.data or []):
        cid = c["id"]
        sb.table("course_students").delete().eq("course_id", cid).execute()
        sb.table("feedbacks").delete().eq("course_id", cid).execute()
        # 清理该课程关联的自动结算
        sb.table("settlements").delete().eq("note", f"auto:course:{cid}").execute()
    sb.table("courses").delete().eq("teacher_id", teacher_id).execute()
    # 兜底：清理该教师关联的课程已被删除但结算残留的记录
    # （只有 auto:course: 开头的——非手动创建的结算）
    remaining = sb.table("settlements").select("id,note").eq("teacher_id", teacher_id).execute()
    for s in (remaining.data or []):
        note = s.get("note") or ""
        if note.startswith("auto:course:"):
            sb.table("settlements").delete().eq("id", s["id"]).execute()


def _cleanup_payments_for_child(child_id: str):
    """清理学员对应的支付记录并重置课时。"""
    sb = get_supabase()
    sb.table("payments").delete().eq("child_id", child_id).execute()


async def _full_setup(client: AsyncClient, admin_token: str, teacher_id: str,
                      child_id: str, course_date: str | None = None,
                      hours: float | None = None) -> dict:
    """创建一节课程。返回课程 JSON。"""
    today = course_date or date.today().isoformat()
    body = {
        "date": today,
        "start_time": "14:00:00",
        "end_time": "15:00:00",
        "teacher_id": teacher_id,
        "child_ids": [child_id],
    }
    if hours is not None:
        body["hours"] = hours
    resp = await client.post("/api/v1/courses", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 201, f"创建课程失败: {resp.text}"
    return resp.json()


# ===================================================================
# 测试 1：完整正向闭环 — 收款→排课→完成→课时正确→结算正确→付款
# ===================================================================

@pytest.mark.asyncio
async def test_full_happy_path(client: AsyncClient):
    """P0 闭环：收款10课时 → 排1节课 → 完成课程 → usedhours+1 →
    自动结算 amount=1×100=100 → 付款 → 结算状态变 paid"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id, "测试学员不存在"

    # ├── 清理 ───
    _cleanup_courses_and_settlements(teacher_id)
    _cleanup_payments_for_child(child_id)
    _reset_child_hours(child_id, total=0, used=0)

    # ├── STEP 1: 收款 → 充课时 ───
    pay_resp = await client.post("/api/v1/payments", json={
        "child_id": child_id,
        "payment_method": "cash",
        "hours_purchased": 10,
        "amount": 1000.00,
    }, headers=auth_headers(admin_token))
    assert pay_resp.status_code == 200, f"创建收款失败: {pay_resp.text}"

    hours_after_pay = _get_child_hours(child_id)
    assert hours_after_pay["totalhours"] == 10, f"收款后 totalhours 应为10，实际={hours_after_pay['totalhours']}"
    assert hours_after_pay["usedhours"] == 0, f"收款后 usedhours 应为0，实际={hours_after_pay['usedhours']}"

    # ├── STEP 2: 排课 ───
    _set_teacher_hourly_rate(teacher_id, 100.0)
    course = await _full_setup(client, admin_token, teacher_id, child_id)
    course_id = course["id"]
    assert course["status"] == "pending"

    # ├── STEP 3: 完成课程 → 扣课时 + 自动结算 ───
    complete_resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))
    assert complete_resp.status_code == 200, f"完成课程失败: {complete_resp.text}"
    assert complete_resp.json()["status"] == "completed"

    # ├── 验证: 课时扣减 ───
    hours_after_course = _get_child_hours(child_id)
    assert hours_after_course["usedhours"] == 1, f"课后 usedhours 应为1，实际={hours_after_course['usedhours']}"
    assert hours_after_course["totalhours"] == 10, f"课后 totalhours 应不变(10)，实际={hours_after_course['totalhours']}"
    remaining = hours_after_course["totalhours"] - hours_after_course["usedhours"]
    assert remaining == 9, f"剩余课时应为9，实际={remaining}"

    # ├── 验证: 自动结算生成 ───
    sb = get_supabase()
    settlement = sb.table("settlements").select("*").eq("note", f"auto:course:{course_id}").limit(1).execute()
    assert settlement.data, f"课程 {course_id} 的自动结算未生成"
    s = settlement.data[0]
    assert s["hours"] == 1.0, f"结算课时应为1，实际={s['hours']}"
    assert s["hourly_rate"] == 100.0, f"结算时薪应为100，实际={s['hourly_rate']}"
    assert s["amount"] == 100.0, f"结算金额应为100，实际={s['amount']}"
    assert s["status"] == "pending", f"结算状态应为 pending，实际={s['status']}"
    assert s["teacher_id"] == teacher_id

    # ├── STEP 4: 结算付款 ───
    settlement_id = s["id"]
    pay_settlement_resp = await client.put(
        f"/api/v1/settlements/{settlement_id}/pay",
        json={"payment_method": "bank_transfer"},
        headers=auth_headers(admin_token),
    )
    assert pay_settlement_resp.status_code == 200, f"结算付款失败: {pay_settlement_resp.text}"
    paid = pay_settlement_resp.json()
    assert paid["status"] == "paid", f"付款后状态应为 paid，实际={paid['status']}"
    assert paid["payment_method"] == "bank_transfer"

    # ├── 清理 ───
    _cleanup_courses_and_settlements(teacher_id)
    _cleanup_payments_for_child(child_id)
    _reset_child_hours(child_id, total=0, used=0)


# ===================================================================
# 测试 2：多学员同课程 — 每人都扣课时，结算只有一笔
# ===================================================================

@pytest.mark.asyncio
async def test_multi_child_course_deducts_each(client: AsyncClient):
    """一节课排2个学员 → 完成后每个学员 usedhours 都+1，但结算只有一笔（按教师）"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child1_id = _get_child_id_by_parent_phone("13900000003")
    child2_id = _get_child_id_by_parent_phone("13900000005")
    assert child1_id and child2_id, "两个测试学员都必须存在"

    _cleanup_courses_and_settlements(teacher_id)
    _cleanup_payments_for_child(child1_id)
    _cleanup_payments_for_child(child2_id)
    _reset_child_hours(child1_id, total=10, used=0)
    _reset_child_hours(child2_id, total=5, used=0)
    _set_teacher_hourly_rate(teacher_id, 150.0)

    # 排课 — 2个学员
    today = date.today().isoformat()
    body = {
        "date": today,
        "start_time": "16:00:00",
        "end_time": "17:00:00",
        "teacher_id": teacher_id,
        "child_ids": [child1_id, child2_id],
    }
    resp = await client.post("/api/v1/courses", json=body, headers=auth_headers(admin_token))
    assert resp.status_code == 201, f"创建课程失败: {resp.text}"
    course_id = resp.json()["id"]

    # 完成课程
    complete_resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))
    assert complete_resp.status_code == 200

    # 每个学员都扣了1课时
    h1 = _get_child_hours(child1_id)
    h2 = _get_child_hours(child2_id)
    assert h1["usedhours"] == 1, f"学员1 usedhours 应为1，实际={h1['usedhours']}"
    assert h2["usedhours"] == 1, f"学员2 usedhours 应为1，实际={h2['usedhours']}"

    # 结算只有1笔（按教师，不按学员）
    sb = get_supabase()
    settlements = sb.table("settlements").select("*").eq("note", f"auto:course:{course_id}").execute()
    assert len(settlements.data) == 1, f"应有1笔结算，实际={len(settlements.data)}"
    assert settlements.data[0]["amount"] == 150.0  # 1h × 150

    _cleanup_courses_and_settlements(teacher_id)
    _cleanup_payments_for_child(child1_id)
    _cleanup_payments_for_child(child2_id)
    _reset_child_hours(child1_id, total=0, used=0)
    _reset_child_hours(child2_id, total=0, used=0)


# ===================================================================
# 测试 3：自定义课时数 hours=2
# ===================================================================

@pytest.mark.asyncio
async def test_custom_hours_deduction(client: AsyncClient):
    """课程 hours=2 → 完成后 usedhours += 2，结算 amount = 2 × rate"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=20, used=0)
    _set_teacher_hourly_rate(teacher_id, 120.0)

    # 排课 hours=2
    course = await _full_setup(client, admin_token, teacher_id, child_id, hours=2.0)
    course_id = course["id"]

    # 完成课程
    complete_resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))
    assert complete_resp.status_code == 200

    # 验证：扣2课时
    h = _get_child_hours(child_id)
    assert h["usedhours"] == 2, f"usedhours 应为2，实际={h['usedhours']}"

    # 验证：结算金额 = 2 × 120 = 240
    sb = get_supabase()
    s = sb.table("settlements").select("*").eq("note", f"auto:course:{course_id}").limit(1).execute()
    assert s.data, "结算未生成"
    assert s.data[0]["hours"] == 2.0
    assert s.data[0]["amount"] == 240.0

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=0, used=0)


# ===================================================================
# 测试 4：余额不足 — usedhours 可以超过 totalhours（允许透支）
# ===================================================================

@pytest.mark.asyncio
async def test_hours_overdraft_allowed(client: AsyncClient):
    """学员只有2课时 → 上3课时课 → usedhours=3, totalhours=2, 余额=-1
    当前业务允许透支（不阻断课程完成）"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=2, used=0)
    _set_teacher_hourly_rate(teacher_id, 80.0)

    # 排课 hours=3
    course = await _full_setup(client, admin_token, teacher_id, child_id, hours=3.0)
    course_id = course["id"]

    # 完成课程 — 应该成功（不因余额不足而拒绝）
    complete_resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))
    assert complete_resp.status_code == 200, f"余额不足时应允许完成，实际返回: {complete_resp.text}"

    # 验证：透支
    h = _get_child_hours(child_id)
    assert h["usedhours"] == 3, f"usedhours 应为3，实际={h['usedhours']}"
    assert h["totalhours"] == 2, f"totalhours 应为2，实际={h['totalhours']}"
    remaining = h["totalhours"] - h["usedhours"]
    assert remaining == -1, f"余额应为-1(透支)，实际={remaining}"

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=0, used=0)


# ===================================================================
# 测试 5：结算幂等 — 同一课程不会生成两笔 settlement
# ===================================================================

@pytest.mark.asyncio
async def test_settlement_idempotent(client: AsyncClient):
    """课程 → completed 一次生成结算 → 再次 PUT status=completed 不应重复生成"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=10, used=0)
    _set_teacher_hourly_rate(teacher_id, 100.0)

    course = await _full_setup(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    # 第一次完成
    await client.put(f"/api/v1/courses/{course_id}", json={"status": "completed"},
                     headers=auth_headers(admin_token))

    # 第二次重复完成（幂等）
    await client.put(f"/api/v1/courses/{course_id}", json={"status": "completed"},
                     headers=auth_headers(admin_token))

    # 验证：只有1笔结算
    sb = get_supabase()
    settlements = sb.table("settlements").select("*").eq("note", f"auto:course:{course_id}").execute()
    assert len(settlements.data) == 1, f"幂等：应只有1笔结算，实际={len(settlements.data)}"

    # 验证：usedhours 只扣了1次
    h = _get_child_hours(child_id)
    assert h["usedhours"] == 1, f"幂等：usedhours 应仍为1，实际={h['usedhours']}"

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=0, used=0)


# ===================================================================
# 测试 6：教师时薪=0 → 不生成结算
# ===================================================================

@pytest.mark.asyncio
async def test_zero_rate_no_settlement(client: AsyncClient):
    """教师 hourly_rate=0 → 完成课程不生成结算（金额为0无意义）"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=10, used=0)
    _set_teacher_hourly_rate(teacher_id, 0.0)

    course = await _full_setup(client, admin_token, teacher_id, child_id)
    course_id = course["id"]

    complete_resp = await client.put(f"/api/v1/courses/{course_id}", json={
        "status": "completed",
    }, headers=auth_headers(admin_token))
    assert complete_resp.status_code == 200

    # 课时还是扣了
    h = _get_child_hours(child_id)
    assert h["usedhours"] == 1

    # 但不生成结算
    sb = get_supabase()
    s = sb.table("settlements").select("*").eq("note", f"auto:course:{course_id}").execute()
    assert len(s.data) == 0, f"时薪=0时不应生成结算，实际={len(s.data)}条"

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=0, used=0)


# ===================================================================
# 测试 7：calc-hours API 与手动结算金额一致
# ===================================================================

@pytest.mark.asyncio
async def test_calc_hours_matches_settlement(client: AsyncClient):
    """安排2节课(1h+2h) → 完成 → calc-hours 返回 3h → 
    手动结算 3h×rate 应等于两笔自动结算之和"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=30, used=0)
    _set_teacher_hourly_rate(teacher_id, 100.0)

    today = date.today().isoformat()

    # 第一节课 hours=1
    c1 = await _full_setup(client, admin_token, teacher_id, child_id, course_date=today, hours=1.0)
    await client.put(f"/api/v1/courses/{c1['id']}", json={"status": "completed"},
                     headers=auth_headers(admin_token))

    # 第二节课 hours=2
    c2 = await _full_setup(client, admin_token, teacher_id, child_id,
                           course_date=today, hours=2.0)
    await client.put(f"/api/v1/courses/{c2['id']}", json={"status": "completed"},
                     headers=auth_headers(admin_token))

    # calc-hours API
    calc_resp = await client.post("/api/v1/settlements/calc-hours", json={
        "teacher_id": teacher_id,
        "period_start": today,
        "period_end": today,
    }, headers=auth_headers(admin_token))
    assert calc_resp.status_code == 200, f"calc-hours 失败: {calc_resp.text}"
    calc = calc_resp.json()
    assert calc["total_hours"] == 3.0, f"总课时应为3，实际={calc['total_hours']}"
    assert calc["course_count"] == 2, f"课程数应为2，实际={calc['course_count']}"

    # 手动结算与自动结算金额一致
    manual_amount = 3.0 * 100.0  # calc_hours × rate
    sb = get_supabase()
    auto_settlements = sb.table("settlements").select("amount").eq("teacher_id", teacher_id).execute()
    auto_total = sum(s["amount"] for s in (auto_settlements.data or []))
    assert abs(auto_total - manual_amount) < 0.01, f"自动结算总额={auto_total}, 手动={manual_amount}"

    _cleanup_courses_and_settlements(teacher_id)
    _reset_child_hours(child_id, total=0, used=0)


# ===================================================================
# 测试 8：收款→排课→完成→再收款→余额正确
# ===================================================================

@pytest.mark.asyncio
async def test_payment_then_course_then_payment(client: AsyncClient):
    """验证多次充值和扣课时的累计正确性：
    充10h → 上课扣1h → 再充5h → totalhours=15, usedhours=1, 余额=14"""
    admin_token, _ = await login_admin(client)
    teacher_id = _get_teacher_id()
    child_id = _get_child_id_by_parent_phone("13900000003")
    assert child_id

    _cleanup_courses_and_settlements(teacher_id)
    _cleanup_payments_for_child(child_id)
    _reset_child_hours(child_id, total=0, used=0)
    _set_teacher_hourly_rate(teacher_id, 100.0)

    # 第一步：充值10课时
    await client.post("/api/v1/payments", json={
        "child_id": child_id,
        "payment_method": "cash",
        "hours_purchased": 10,
        "amount": 1000.00,
    }, headers=auth_headers(admin_token))

    h = _get_child_hours(child_id)
    assert h["totalhours"] == 10 and h["usedhours"] == 0

    # 第二步：上课扣1课时
    course = await _full_setup(client, admin_token, teacher_id, child_id)
    await client.put(f"/api/v1/courses/{course['id']}", json={"status": "completed"},
                     headers=auth_headers(admin_token))

    h = _get_child_hours(child_id)
    assert h["totalhours"] == 10 and h["usedhours"] == 1

    # 第三步：再充值5课时
    await client.post("/api/v1/payments", json={
        "child_id": child_id,
        "payment_method": "wechat",
        "hours_purchased": 5,
        "amount": 500.00,
    }, headers=auth_headers(admin_token))

    h = _get_child_hours(child_id)
    assert h["totalhours"] == 15, f"第二次充值后 totalhours=15，实际={h['totalhours']}"
    assert h["usedhours"] == 1, f"第二次充值后 usedhours 不变=1，实际={h['usedhours']}"
    remaining = h["totalhours"] - h["usedhours"]
    assert remaining == 14, f"余额应为14，实际={remaining}"

    _cleanup_courses_and_settlements(teacher_id)
    _cleanup_payments_for_child(child_id)
    _reset_child_hours(child_id, total=0, used=0)
