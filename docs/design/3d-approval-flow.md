# 3-D 审批流设计文档

> 状态：设计稿，未实施 | 优先级：P2 高风险 | 预估：3-4天

## 1. 目标

结算付款和退款需要**审批**后才执行，避免财务操作无管控。

核心流程：
1. 运营提交结算/退款 → 状态 `pending_approval`
2. 管理员审批通过 → 状态变为 `approved`，可执行付款/退款
3. 管理员驳回 → 状态变为 `rejected`，附理由

## 2. 数据模型

### 2.1 approvals 表

```sql
CREATE TABLE approvals (
    id            SERIAL PRIMARY KEY,
    target_type   VARCHAR(30) NOT NULL,   -- 'settlement' | 'refund'
    target_id     INT NOT NULL,           -- settlements.id 或 refunds.id
    action        VARCHAR(20) NOT NULL,   -- 'approve' | 'reject'
    status        VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    requested_by  VARCHAR(100),           -- 提交人 user id
    reviewed_by   VARCHAR(100),           -- 审批人 user id (null if pending)
    comment       TEXT,                   -- 审批备注/驳回理由
    created_at    TIMESTAMPTZ DEFAULT now(),
    reviewed_at   TIMESTAMPTZ,
    
    UNIQUE(target_type, target_id)  -- 一条记录只有一个审批单
);

CREATE INDEX idx_approvals_status ON approvals(status);
```

### 2.2 状态机

```
                      ┌──────────┐
   创建结算/退款 ──→ │ pending   │
                      └────┬─────┘
                           │
                     ┌─────┴─────┐
                     ▼           ▼
              ┌──────────┐ ┌──────────┐
              │ approved │ │ rejected │
              └────┬─────┘ └──────────┘
                   │
                   ▼
            执行付款/退款
         (settlement: paid / refund: completed)
```

### 2.3 settlements/refunds 表联动

settlements 表增加：
```sql
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'not_required';
-- not_required | pending | approved | rejected
```

refunds 表增加同字段。

## 3. 后端 API

| 方法 | 路径 | 权限 | 说明 |
|:--|:--|:--|:--|
| POST | /api/v1/approvals | settlements:write / refunds:write | 提交审批 |
| GET | /api/v1/approvals | settlements:approve / refunds:approve | 待审批列表 |
| PUT | /api/v1/approvals/{id}/approve | settlements:approve / refunds:approve | 通过 |
| PUT | /api/v1/approvals/{id}/reject | settlements:approve / refunds:approve | 驳回 |

### 3.1 提交审批逻辑

```python
async def submit_approval(target_type: str, target_id: int, user):
    # 1. 检查 target 记录存在且状态允许提交
    # 2. 创建 approval 记录 status=pending
    # 3. 更新 target 的 approval_status = 'pending'
    # 4. (3-E) 触发通知给审批人
```

### 3.2 审批逻辑

```python
async def review_approval(approval_id: int, action: str, reviewer, comment=None):
    # 1. 检查 approval.status == 'pending'
    # 2. 更新 approval: action, reviewed_by, reviewed_at, comment
    # 3. 更新 target 的 approval_status = 'approved' / 'rejected'
    # 4. (3-E) 触发通知给提交人
    # 5. 如果 approved → 自动触发付款/退款执行（或标记可执行）
```

## 4. 前端

### 4.1 结算审批 UI

- 结算列表：`approval_status` 列标签（待审批/已通过/已驳回）
- 管理员看到「待审批」tab，可批量通过/驳回
- 提交审批按钮 → 弹窗确认
- 审批操作 → 弹窗可填备注

### 4.2 退款审批 UI

同上，退款列表加入 approval_status 列。

### 4.3 设置页

审批开关：结算金额超 ¥X 时需审批，退款需审批（默认全部需要）

## 5. 与权限系统(3-C)的关系

- 审批权限码：`settlements:approve`, `refunds:approve`
- 提交权限码：`settlements:write`, `refunds:write`
- 审批人 ≠ 提交人（防止自己批自己）

## 6. 工作量

- 后端：1张表 + 状态机 API + settlements/refunds联动 = **2天**
- 前端：审批Tab + 列表标签 + 操作弹窗 = **1.5天**
- 测试 = **0.5天**
- **合计：~4天**
