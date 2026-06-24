# 3-C 权限系统 — 最终实施 Checklist

> 修订：v2 — 整合 Roger 两点修正
> - ✅ FAIL-OPEN 仅限 Step 3-4 迁移窗口 + 仅限 admin + 必须日志记录
> - ✅ 内置角色扩为 6 个：super_admin / admin / operations / finance_readonly / teacher / parent
> - ✅ Step 4 完成后切回 FAIL-CLOSED

---

## Checklist 1: Migration 文件

| # | 文件名 | 类型 | 说明 |
|:--|:--|:--|:--|
| M1 | `001_create_roles.sql` | DDL | roles + permissions + role_permissions 3表 + RLS |
| M2 | `002_seed_roles.sql` | 种子 | 6 内置角色 |
| M3 | `003_seed_permissions.sql` | 种子 | 28 权限码 |
| M4 | `004_seed_role_permissions.sql` | 种子 | 6角色×权限映射 |
| M5 | `005_alter_users_role_name.sql` | DDL | users 表加 role_name 列 |

所有 migration 通过 VPS Python 执行 (`sb.rpc('exec_sql', ...)`)。
**不使用 Alembic** — 项目无 migration 框架，保持一致。

---

## Checklist 2: 6 内置角色

| id | name | label | is\_builtin | users.role 映射 | 细分说明 |
|:--|:--|:--|:--|:--|:--|
| 1 | `super_admin` | 超级管理员 | true | role=admin + role\_name=super\_admin | 全权限含 roles:write |
| 2 | `admin` | 管理员 | true | role=admin + role\_name=admin | 除 roles:write 外全部 |
| 3 | `operations` | 运营 | true | role=admin + role\_name=operations | 学员/课程/教师读写,无财务/权限 |
| 4 | `finance_readonly` | 财务(只读) | true | role=admin + role\_name=finance\_readonly | 财务/结算/收款只读,无写权限 |
| 5 | `teacher` | 教师 | true | role=teacher | 仅查看课程/资源 |
| 6 | `parent` | 家长 | true | role=parent | 仅查看自己孩子/付款/资源 |

> JWT `role` 仍为 `admin`/`teacher`/`parent` 其中之一。
> `role_name` 仅存 users 表，login 时额外查取返回给前端。

---

## Checklist 3: 28 权限码

| # | module | code | label | super_admin | admin | operations | finance_readonly | teacher | parent |
|:--|:--|:--|:--|:--|:--|:--|:--|:--|:--|
| 1 | dashboard | `dashboard:read` | 查看工作台 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | students | `students:read` | 查看学员 | ✅ | ✅ | ✅ | | | ✅ |
| 3 | students | `students:write` | 编辑学员 | ✅ | ✅ | ✅ | | | |
| 4 | students | `students:delete` | 删除学员 | ✅ | ✅ | | | | |
| 5 | courses | `courses:read` | 查看课程 | ✅ | ✅ | ✅ | | ✅ | |
| 6 | courses | `courses:write` | 编辑课程 | ✅ | ✅ | ✅ | | | |
| 7 | courses | `courses:delete` | 删除课程 | ✅ | ✅ | | | | |
| 8 | teachers | `teachers:read` | 查看教师 | ✅ | ✅ | ✅ | | | |
| 9 | teachers | `teachers:write` | 编辑教师 | ✅ | ✅ | ✅ | | | |
| 10 | teachers | `teachers:delete` | 删除教师 | ✅ | ✅ | | | | |
| 11 | finance | `finance:read` | 查看财务(对账) | ✅ | ✅ | | ✅ | | |
| 12 | payments | `payments:read` | 查看收款 | ✅ | ✅ | | ✅ | | |
| 13 | payments | `payments:write` | 编辑收款 | ✅ | ✅ | | | | |
| 14 | settlements | `settlements:read` | 查看结算 | ✅ | ✅ | | ✅ | | |
| 15 | settlements | `settlements:write` | 编辑结算 | ✅ | ✅ | | | | |
| 16 | settlements | `settlements:approve` | 审批结算 | ✅ | ✅ | | | | |
| 17 | refunds | `refunds:read` | 查看退款 | ✅ | ✅ | | ✅ | | |
| 18 | refunds | `refunds:write` | 编辑退款 | ✅ | ✅ | | | | |
| 19 | refunds | `refunds:approve` | 审批退款 | ✅ | ✅ | | | | |
| 20 | settings | `settings:read` | 查看设置 | ✅ | ✅ | | | | |
| 21 | settings | `settings:write` | 编辑设置 | ✅ | ✅ | | | | |
| 22 | roles | `roles:read` | 查看权限管理 | ✅ | ✅ | | | | |
| 23 | roles | `roles:write` | 编辑权限 | ✅ | | | | | |
| 24 | resources | `resources:read` | 查看资源 | ✅ | ✅ | ✅ | | ✅ | ✅ |
| 25 | resources | `resources:write` | 编辑资源 | ✅ | ✅ | ✅ | | | |
| 26 | hours | `hours:read` | 查看课时 | ✅ | ✅ | ✅ | | | |
| 27 | hours | `hours:write` | 编辑课时 | ✅ | ✅ | ✅ | | | |
| 28 | export | `export:read` | 导出数据 | ✅ | ✅ | ✅ | | | |

**权限汇总**：
- super\_admin: 28/28
- admin: 27/28（缺 roles:write）
- operations: 16/28
- finance\_readonly: 5/28
- teacher: 3/28
- parent: 3/28

---

## Checklist 4: 55 个 admin endpoint → permission 映射

> 只替换 `require_role("admin")` 的端点。
> `require_role("parent")` / `require_role("teacher")` / `require_role("parent","teacher","admin")` **不迁移**。

### 4a. 学员模块 (child.py) — 5 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 1 | GET | /api/v1/children | `students:read` |
| 2 | POST | /api/v1/children | `students:write` |
| 3 | GET | /api/v1/children/{id} | `students:read` |
| 4 | PUT | /api/v1/children/{id} | `students:write` |
| 5 | DELETE | /api/v1/children/{id} | `students:delete` |

### 4b. 课程模块 (course.py) — 4 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 6 | GET | /api/v1/courses/all | `courses:read` |
| 7 | POST | /api/v1/courses | `courses:write` |
| 8 | PUT | /api/v1/courses/{id} | `courses:write` |
| 9 | DELETE | /api/v1/courses/{id} | `courses:delete` |

> 注：course.py:104 是 check-conflicts → `courses:write`（创建前冲突检查算写操作）

### 4c. 教师模块 (teacher.py) — 7 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 10 | GET | /api/v1/teachers | `teachers:read` |
| 11 | POST | /api/v1/teachers | `teachers:write` |
| 12 | GET | /api/v1/teachers/{id} | `teachers:read` |
| 13 | PUT | /api/v1/teachers/{id} | `teachers:write` |
| 14 | DELETE | /api/v1/teachers/{id} | `teachers:delete` |
| 15 | PUT | /api/v1/teachers/{id}/restore | `teachers:write` |
| 16 | PUT | /api/v1/teachers/{id}/reset-password | `teachers:write` |

### 4d. 财务模块 (finance.py) — 1 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 17 | GET | /api/v1/finance/reconciliation | `finance:read` |

### 4e. 收款模块 (payment.py) — 4 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 18 | GET | /api/v1/payments | `payments:read` |
| 19 | POST | /api/v1/payments | `payments:write` |
| 20 | PUT | /api/v1/payments/{id} | `payments:write` |
| 21 | DELETE | /api/v1/payments/{id} | `payments:write` |

### 4f. 结算模块 (settlement.py) — 5 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 22 | POST | /api/v1/settlements/calc-hours | `settlements:read` |
| 23 | GET | /api/v1/settlements/summary | `settlements:read` |
| 24 | GET | /api/v1/settlements | `settlements:read` |
| 25 | POST | /api/v1/settlements | `settlements:write` |
| 26 | PUT | /api/v1/settlements/{id}/pay | `settlements:write` |

> 注：3-D 审批落地后，pay 端点改要求 `settlements:approve`

### 4g. 退款模块 (refund.py) — 1 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 27 | POST | /api/v1/payments/refund | `refunds:write` |

### 4h. 设置模块 (settings.py) — 3 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 28 | GET | /api/v1/settings | `settings:read` |
| 29 | PUT | /api/v1/settings/{key} | `settings:write` |
| 30 | DELETE | /api/v1/settings/{key} | `settings:write` |

### 4i. 课时模块 (hours\_log.py) — 1 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 31 | GET | /api/v1/children/{id}/hours-log | `hours:read` |

### 4j. 工作台 (dashboard.py) — 2 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 32 | GET | /api/v1/dashboard/summary | `dashboard:read` |
| 33 | GET | /api/v1/dashboard/alerts | `dashboard:read` |

### 4k. 搜索 (search.py) — 2 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 34 | GET | /api/v1/search | `search:read` |
| 35 | GET | /api/v1/search/more | `search:read` |

### 4l. 导出 (export.py) — 1 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 36 | GET | /api/v1/export/{module} | `export:read` |

### 4m. 资源 (resource.py) — 4 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 37 | POST | /api/v1/resources | `resources:write` |
| 38 | PUT | /api/v1/resources/{id} | `resources:write` |
| 39 | DELETE | /api/v1/resources/{id} | `resources:write` |
| 40 | POST | /api/v1/resources/{id}/upload | `resources:write` |

> 注：resource.py 还有 POST /api/v1/upload/pdf → `resources:write`

### 4n. 筛选模板 (saved\_filters.py) — 4 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 41 | GET | /api/v1/saved-filters | `settings:read` |
| 42 | POST | /api/v1/saved-filters | `settings:write` |
| 43 | PUT | /api/v1/saved-filters/{id} | `settings:write` |
| 44 | DELETE | /api/v1/saved-filters/{id} | `settings:write` |

### 4o. 阅读 (reading.py) — 5 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 45 | POST | /api/v1/reading/materials | `resources:write` |
| 46 | PUT | /api/v1/reading/materials/{id} | `resources:write` |
| 47 | DELETE | /api/v1/reading/materials/{id} | `resources:write` |
| 48 | POST | /api/v1/reading/materials/{id}/upload | `resources:write` |
| 49 | POST | /api/v1/reading/materials/{id}/cover | `resources:write` |

### 4p. 阅读课程 (reading\_courses.py) — 4 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 50 | GET | /api/v1/reading/materials/{id}/courses | `courses:read` |
| 51 | POST | /api/v1/reading/materials/{id}/courses | `courses:write` |
| 52 | DELETE | /api/v1/reading/materials/{id}/courses/{cid} | `courses:delete` |
| 53 | GET | /api/v1/courses/{id}/materials | `courses:read` |

### 4q. Auth 测试端点 (auth.py) — 2 个

| # | method | path | → permission |
|:--|:--|:--|:--|
| 54 | GET | /api/v1/auth/admin-only | `dashboard:read` |
| 55 | GET | /api/v1/auth/teacher-or-admin | **不迁移**（含 teacher 角色） |

> ❌ #55 不迁移 — `require_role("teacher", "admin")` 是混合角色端点。

**合计迁移：54 个 admin-only 端点**（排除了1个混合角色）

---

## Checklist 5: FAIL-OPEN / FAIL-CLOSED 切换

### 迁移期 FAIL-OPEN（仅 Step 3 → Step 4 完成之间）

```python
# deps.py — require_permission 迁移期版本
import logging
logger = logging.getLogger("permission_fallback")

def require_permission(code: str):
    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        perms = await _load_permissions_for_role(user.role_name or user.role)
        if code in perms:
            return user
        # ═══ FAIL-OPEN: 仅迁移窗口生效，仅 admin ═══
        if user.role == "admin":
            logger.warning(
                "PERMISSION_FALLBACK | user=%s role=%s missing_perm=%s "
                "allowed_by=fail-open-migration-window",
                user.id, user.role, code,
            )
            return user
        # ═══ FAIL-CLOSED: 非 admin 直接拒 ═══
        raise HTTPException(status_code=403, ...)
    return _guard
```

**三要素**：
1. ✅ 仅 admin 角色 fallback
2. ✅ 每次 fallback 写 WARNING 日志（含 user\_id + 缺失权限码）
3. ✅ Step 4 完成后删除 fallback 分支 → FAIL-CLOSED

### Step 4 完成后 — FAIL-CLOSED

```python
def require_permission(code: str):
    async def _guard(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        perms = await _load_permissions_for_role(user.role_name or user.role)
        if code in perms:
            return user
        # ═══ FAIL-CLOSED: 所有角色一律拒绝 ═══
        logger.warning(
            "PERMISSION_DENIED | user=%s role=%s required_perm=%s has_perms=%s",
            user.id, user.role, code, perms,
        )
        raise HTTPException(status_code=403, ...)
    return _guard
```

---

## Checklist 6: 回滚条件

| 触发条件 | 动作 | 命令 |
|:--|:--|:--|
| Step 1-2 种子写入后权限映射错误 | DROP 3 张表 + 删除 users.role\_name | `DROP TABLE role_permissions, permissions, roles; ALTER TABLE users DROP COLUMN role_name;` |
| Step 3 require\_permission 逻辑有 bug | 从 deps.py 删除 require\_permission 函数，所有端点仍走 require\_role | git revert deps.py |
| Step 4 某个 endpoint 替换后 502/403 | 只 revert 该文件 | `git checkout HEAD -- backend/app/api/xxx.py` |
| Step 4 全部替换后 FAIL-CLOSED 锁了合法用户 | 暂时加回 admin fallback 分支 | 修改 deps.py require\_permission |
| 前端 permissions 为空锁死 | admin 角色 hasPermission 返回 true | 修改 authStore.ts |
| **一键全量回滚** | 删 3 表 + git revert Step 3-4 所有改动 | `DROP TABLE role_permissions, permissions, roles; git revert HEAD~N` |

**回滚零风险保证**：3 张新表与现有 0 耦合，删表即回到 require\_role 时代。

---

## Checklist 7: 测试清单

### 7a. Step 1-2 后 — 种子数据验证

| # | 测试 | 方法 | 预期 |
|:--|:--|:--|:--|
| T1 | roles 表有 6 行 | VPS Python select | count=6 |
| T2 | permissions 表有 28 行 | VPS Python select | count=28 |
| T3 | role\_permissions 行数 | VPS Python select | super\_admin=28, admin=27, operations=16, finance=5, teacher=3, parent=3 |
| T4 | users.role\_name 列存在 | `\d users` psql | 列可见 |
| T5 | 现有 admin 用户 role\_name 填充 | select where role='admin' | role\_name 非空 |

### 7b. Step 3 后 — require\_permission 双轨验证

| # | 测试 | 方法 | 预期 |
|:--|:--|:--|:--|
| T6 | admin login 返回 permissions | POST /auth/admin/login | response 含 permissions 列表 |
| T7 | GET /roles/me/permissions (admin) | curl + admin JWT | 返回 27 个权限码 |
| T8 | GET /roles/me/permissions (teacher) | curl + teacher JWT | 返回 3 个权限码 |
| T9 | 未替换端点仍走 require\_role | GET /children (admin) | 200 OK |
| T10 | fallback 日志输出 | 触发 fallback + 查 VPS journal | WARNING "PERMISSION\_FALLBACK" 出现 |
| T11 | 缓存命中/失效 | 连续请求2次 + 等6min再请求 | 第2次无DB查询, 第3次有 |

### 7c. Step 4 逐批替换验证（分3批）

**批次 1 — 只读端点（34个）**

| # | 测试 | 预期 |
|:--|:--|:--|
| T12 | admin GET /children | 200 |
| T13 | admin GET /teachers | 200 |
| T14 | admin GET /payments | 200 |
| T15 | admin GET /settlements | 200 |
| T16 | admin GET /settings | 200 |
| T17 | admin GET /dashboard/summary | 200 |
| T18 | admin GET /finance/reconciliation | 200 |
| T19 | admin GET /search | 200 |
| T20 | teacher GET /auth/admin-only | 403 (teacher 无 dashboard:read? — 不对，teacher 不应碰这个端点) |
| T21 | 无 JWT GET /children | 401 |

**批次 2 — 写操作端点（16个）**

| # | 测试 | 预期 |
|:--|:--|:--|
| T22 | admin POST /children | 201 |
| T23 | admin PUT /children/{id} | 200 |
| T24 | admin POST /payments | 201 |
| T25 | admin POST /settlements | 201 |
| T26 | admin PUT /settings/{key} | 200 |
| T27 | fake\_no\_perm 角色写操作 | 403 + "需要权限: xxx" |

**批次 3 — 删除/高危端点（4个）**

| # | 测试 | 预期 |
|:--|:--|:--|
| T28 | admin DELETE /children/{id} | 200/204 |
| T29 | admin DELETE /courses/{id} | 200/204 |
| T30 | admin DELETE /teachers/{id} | 200/204 |
| T31 | admin DELETE /settings/{key} | 200/204 |

### 7d. Step 4 完成后 — FAIL-CLOSED 切换验证

| # | 测试 | 方法 | 预期 |
|:--|:--|:--|:--|
| T32 | admin 无 permission 的端点 | 用 role\_name=operations JWT 调 /finance/reconciliation | 403 |
| T33 | 无 fallback 日志 | 调任意需权限端点 | 日志只有 PERMISSION\_DENIED 无 FALLBACK |
| T34 | finance\_readonly 读 /payments | finance\_readonly JWT | 200 |
| T35 | finance\_readonly 写 /payments | finance\_readonly JWT | 403 |

### 7e. 前端验证

| # | 测试 | 预期 |
|:--|:--|:--|
| T36 | admin 登录 → localStorage 含 permissions 数组 | 刷新后菜单正常 |
| T37 | operations 用户 → 侧边栏隐藏"财务""设置"菜单 | 仅显示学员/课程/教师/资源/导出 |
| T38 | finance\_readonly → 侧边栏仅显示"工作台""财务""收款""结算""退款"菜单 | 其他隐藏 |
| T39 | `<RequirePermission code="settlements:approve">` 无权限时 | 按钮不显示或显示 disabled |
| T40 | 清 localStorage → 重新登录 → permissions 重新获取 | 菜单正常 |

### 7f. 回滚验证

| # | 测试 | 方法 | 预期 |
|:--|:--|:--|:--|
| T41 | 执行一键回滚 | DROP 3表 + git revert | 所有端点恢复 require\_role |
| T42 | admin 登录 + 调 API | POST /auth/admin/login + GET /children | 200 OK |
| T43 | teacher 登录 | 调 require\_role("teacher") 端点 | 200 OK |

---

## Checklist 8: 新增 API 端点

| 方法 | 路径 | 权限 | 说明 |
|:--|:--|:--|:--|
| GET | /api/v1/roles | roles:read | 角色列表(6 行) |
| GET | /api/v1/roles/{id} | roles:read | 单角色详情含权限 |
| PUT | /api/v1/roles/{id}/permissions | roles:write | 设置角色权限(code 列表) |
| GET | /api/v1/permissions | roles:read | 全部 28 权限码 |
| GET | /api/v1/roles/me/permissions | 任何已认证用户 | 当前用户权限码列表 |

---

## Checklist 9: 前端改造点

| # | 改造项 | 文件 | 说明 |
|:--|:--|:--|:--|
| F1 | authStore 扩展 permissions + hasPermission | `store/authStore.ts` | user 对象加 permissions 字段 |
| F2 | Login 响应存 permissions | `pages/Login.tsx` | setAuth 传入 permissions |
| F3 | AdminLayout 菜单过滤 | `layouts/AdminLayout.tsx` | menuItems 加 permission 字段 + filter |
| F4 | RequirePermission 组件 | `components/RequirePermission.tsx` | 新建 |
| F5 | 设置页权限管理 Tab | `pages/settings/index.tsx` | 加 RolesTab (仅 roles:write 可见) |
| F6 | API client 加 /roles /permissions | `services/roles.ts` | 新建 |
