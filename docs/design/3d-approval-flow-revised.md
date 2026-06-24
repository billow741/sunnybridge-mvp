# 3-D 审批流 — 修正后实施方案

> 修正点（基于 Roger 反馈）：
> - ❌ ~~UNIQUE(target_type, target_id)~~ → ✅ 应用层控制"同一时间只能一条 pending"，拒绝后可重新提交，旧记录保留历史
> - ❌ ~~requested_by / reviewed_by VARCHAR~~ → ✅ UUID + REFERENCES users(id)
> - MVP 只覆盖 settlements，refunds 暂不做
> - 需先确认审批触发规则再实施

---

## 1. 审批触发规则（建议）

### settlement 的 approval_status 状态流转

```
                    ┌──────────────┐
  新建结算(默认) ──→ │ not_required │  金额 ≤ 阈值 或 审批未启用
                    └──────┬───────┘
                           │ 金额 > 阈值 且 审批已启用
                           ▼
                    ┌──────────┐
  提交审批 ────────→ │ pending  │
                    └────┬─────┘
                         │
                 ┌───────┴───────┐
                 ▼               ▼
          ┌──────────┐    ┌──────────┐
          │ approved │    │ rejected │
          └────┬─────┘    └────┬─────┘
               │               │
               ▼               ▼
          标记已付款       允许重新提交
                         (新 approval 记录)
```

### 触发规则

| 条件 | approval_status | 说明 |
|:--|:--|:--|
| 新建 settlement 且 `审批开关关闭` | `not_required` | 全局开关 |
| 新建 settlement 且 `审批开关开启` 且 `amount ≤ 阈值` | `not_required` | 低额免审 |
| 新建 settlement 且 `审批开关开启` 且 `amount > 阈值` | `pending` | 自动提交审批 |
| 运营手动点击"提交审批" | `pending` | 对 not_required 的补提 |
| 审批人批准 | `approved` | 可执行付款 |
| 审批人驳回 | `rejected` | 附理由，运营可修改后重新提交 |

### 阈值配置（存 settings 表）

| key | 默认值 | 说明 |
|:--|:--|:--|
| `approval_enabled` | `true` | 审批总开关 |
| `settlement_approval_threshold` | `0` | 结算审批金额阈值(CNY)，0=全部需审批 |

---

## 2. DDL

### 2.1 approvals 表

```sql
CREATE TABLE IF NOT EXISTS approvals (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type   VARCHAR(30) NOT NULL,        -- 'settlement' | 'refund'
    target_id     UUID NOT NULL,               -- settlements.id 或 payments.id(refund)
    status        VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
    requested_by  UUID NOT NULL REFERENCES users(id),
    reviewed_by   UUID REFERENCES users(id),   -- NULL if pending
    comment       TEXT,                         -- 审批备注 / 驳回理由
    created_at    TIMESTAMPTZ DEFAULT now(),
    reviewed_at   TIMESTAMPTZ
);

CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_target ON approvals(target_type, target_id);
CREATE INDEX idx_approvals_requested_by ON approvals(requested_by);
```

> **无 UNIQUE(target_type, target_id)** — 应用层保证同一时间仅一条 pending：
> - 提交时查 `target_type + target_id + status=pending`，已存在则拒绝
> - 驳回后允许重新提交（新记录，旧 rejected 记录保留历史）

### 2.2 settlements 表加列

```sql
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS
    approval_status VARCHAR(20) DEFAULT 'not_required';
-- not_required | pending | approved | rejected
```

> 不改 payments 表。MVP 只做 settlements。refund 在 3-D Phase 2。

---

## 3. API 设计

### 3.1 审批 API

| 方法 | 路径 | 权限 | 说明 |
|:--|:--|:--|:--|
| POST | `/api/v1/approvals` | `settlements:write` | 提交审批 |
| GET | `/api/v1/approvals` | `settlements:approve` | 待审批列表（含已审批） |
| PUT | `/api/v1/approvals/{id}/approve` | `settlements:approve` | 通过 |
| PUT | `/api/v1/approvals/{id}/reject` | `settlements:approve` | 驳回 |

### 3.2 提交审批

```
POST /api/v1/approvals
Body: { target_type: "settlement", target_id: "uuid..." }

逻辑:
1. 校验 target 存在 + approval_status ∈ { not_required, rejected }
2. 查是否已有 status=pending 的同 target 审批单 → 有则 409
3. INSERT approvals (status=pending, requested_by=current_user.id)
4. UPDATE settlements SET approval_status='pending' WHERE id=target_id
5. 返回 approval 记录
```

### 3.3 审批操作

```
PUT /api/v1/approvals/{id}/approve
Body: { comment?: "同意" }

逻辑:
1. 校验 approval.status == 'pending'
2. 校验 reviewed_by != requested_by（不能自批）
3. UPDATE approvals SET status='approved', reviewed_by=current_user.id, reviewed_at=now()
4. UPDATE settlements SET approval_status='approved' WHERE id=approval.target_id
5. 返回 approval 记录
```

```
PUT /api/v1/approvals/{id}/reject
Body: { comment: "理由..." }

逻辑:
1. 校验 approval.status == 'pending'
2. 校验 reviewed_by != requested_by
3. UPDATE approvals SET status='rejected', reviewed_by=current_user.id, reviewed_at=now(), comment=...
4. UPDATE settlements SET approval_status='rejected' WHERE id=approval.target_id
5. 返回 approval 记录
```

### 3.4 settlements 表联动

| 变更 | 说明 |
|:--|:--|
| `create_settlement` 结束时检查 `approval_enabled` + `settlement_approval_threshold` | 自动设 `approval_status` |
| `pay_settlement` 前检查 `approval_status` | 非approved/rejected(not_required) 拒绝付款 |
| 列表 API 返回 `approval_status` 字段 | SettlementOut 新增字段 |

### 3.5 Schemas

```python
# --- Approval Schemas ---

class ApprovalSubmitRequest(BaseModel):
    target_type: Literal["settlement"] = "settlement"
    target_id: UUID

class ApprovalReviewRequest(BaseModel):
    comment: str | None = Field(None, max_length=500)

class ApprovalOut(BaseModel):
    id: UUID
    target_type: str
    target_id: UUID
    status: str  # pending | approved | rejected
    requested_by: UUID
    requested_by_name: str = ""
    reviewed_by: UUID | None = None
    reviewed_by_name: str | None = None
    comment: str | None = None
    created_at: datetime | None = None
    reviewed_at: datetime | None = None
    # 附带 target 摘要
    target_summary: dict | None = None  # { teacher_name, amount, period }

class ApprovalListResponse(BaseModel):
    items: list[ApprovalOut]
    total: int
```

---

## 4. 前端改造点

### 4.1 结算页面

- `SettlementOut` 新增 `approval_status` 字段 → 列表加列显示标签
- 颜色: `not_required` 灰 / `pending` 橙 / `approved` 绿 / `rejected` 红
- 「提交审批」按钮: `approval_status ∈ { not_required, rejected }` + `<RequirePermission code="settlements:write">`
- 付款按钮: 仅 `approval_status ∈ { approved, not_required }` 可操作
- 新增「待审批」Tab: `<RequirePermission code="settlements:approve">`，列出 pending 的 settlements

### 4.2 审批操作 Tab（设置页 or 独立页）

- 审批列表: target_summary 展示教师名/金额/时间段
- 「通过」/「驳回」按钮 + 弹窗填备注
- `<RequirePermission code="settlements:approve">` 控制可见性

---

## 5. 权限矩阵（3-C 已预留）

| 权限码 | super_admin | admin | operations | finance_readonly |
|:--|:--|:--|:--|:--|
| settlements:write | ✅ | ✅ | ❌ | ❌ |
| settlements:approve | ✅ | ✅ | ❌ | ❌ |

> operations 能创建结算(settlements:write)，但**不能审批**
> super_admin/admin 能审批(settlements:approve)
> 自批校验: requested_by ≠ reviewed_by

---

## 6. 风险点与回滚

| 风险 | 缓解 |
|:--|:--|
| 阈值设错导致全部卡审批 | 阈值默认 0(全部审批),可通过 settings 页实时调 |
| 已有 settlement 没有 approval_status | DEFAULT 'not_required' 不影响存量 |
| 并发提交审批(RACE) | 应用层查 pending → 409,无 DB UNIQUE;极端情况可容忍双 pending(审批时只处理最新) |
| 审批人=提交人 | 后端校验 rejected_by ≠ requested_by |

**回滚**: DROP approvals 表 + ALTER settlements DROP approval_status + 还原前端

---

## 7. 实施步骤

| Step | 内容 | 预估 |
|:--|:--|:--|
| S1 | approvals DDL + settlements 加列 | 0.5d |
| S2 | settings 种子 (approval_enabled + threshold) | 0.5d |
| S3 | approval service + API (submit/list/approve/reject) | 1d |
| S4 | settlements 联动 (创建时自动设状态, 付款前检查) | 0.5d |
| S5 | 前端: approval_status 列 + 提交按钮 + 审批Tab | 1.5d |
| S6 | 冒烟测试 | 0.5d |
| **合计** | | **4.5d** |
