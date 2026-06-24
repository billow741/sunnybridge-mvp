# 3-E 自动化通知设计文档

> 状态：设计稿，未实施 | 优先级：P2 高风险 | 预估：4-5天
> ⚠️ 需先确认通知通道（Telegram/微信/邮件/SMS）

## 1. 目标

关键业务事件自动通知相关人：
- 付款确认 → 通知家长
- 结算到账 → 通知教师
- 上课提醒 → 通知家长+学生
- 审批结果 → 通知提交人
- 缺课/请假 → 通知相关方

## 2. 待确认：通知通道

| 通道 | 优势 | 劣势 | 适用角色 |
|:--|:--|:--|:--|
| **Telegram Bot** | 免费、API简单、已集成Hermes | 需用户有TG账号 | 教师 |
| **微信公众号** | 家长普遍使用 | 需认证服务号、模板消息审核 | 家长 |
| **邮件** | 通用、免费 | 打开率低 | 教师备选 |
| **SMS** | 到达率高 | 成本高(0.5~1元/条) | 紧急通知 |

**建议方案**：
- 教师 → Telegram Bot（一期）
- 家长 → 微信公众号模板消息（二期，需服务号认证）
- 管理 → Hermes Agent内置通知

## 3. 数据模型

### 3.1 notifications 表

```sql
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(100),            -- 接收人 user id 或 external_id
    user_type   VARCHAR(20),             -- 'teacher' | 'parent' | 'admin'
    channel     VARCHAR(20) NOT NULL,    -- 'telegram' | 'wechat' | 'email' | 'sms'
    template    VARCHAR(50) NOT NULL,    -- 模板key, e.g. 'payment_confirm'
    params      JSONB DEFAULT '{}',      -- 模板参数
    status      VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed
    sent_at     TIMESTAMPTZ,
    error       TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_status ON notifications(status, channel);
CREATE INDEX idx_notifications_user ON notifications(user_id);
```

### 3.2 notification_templates 表

```sql
CREATE TABLE notification_templates (
    key         VARCHAR(50) PRIMARY KEY,
    label       VARCHAR(200) NOT NULL,
    channel     VARCHAR(20) DEFAULT 'telegram',
    subject     VARCHAR(200),            -- 邮件/微信用标题
    body        TEXT NOT NULL,            -- 模板内容, 支持 {param} 占位符
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

种子数据已在 3-A settings 表（category='notification'），模板表在此独立。

### 3.3 user_notification_settings 表

```sql
CREATE TABLE user_notification_settings (
    user_id     VARCHAR(100),
    channel     VARCHAR(20),
    template    VARCHAR(50),
    enabled     BOOLEAN DEFAULT true,
    PRIMARY KEY (user_id, channel, template)
);
```

## 4. 后端设计

### 4.1 通知服务层

```python
# backend/app/services/notification.py

class NotificationService:
    async def send(template_key: str, user_id: str, params: dict):
        """统一发送入口"""
        # 1. 查模板 → 渲染内容
        # 2. 查用户通知偏好（是否开启、通道）
        # 3. 分发到对应 channel handler
        # 4. 记录 notification 记录
    
    async def send_batch(template_key: str, users: list, params_fn: callable):
        """批量发送（如上课提醒）"""
```

### 4.2 Channel Handlers

| Handler | 实现 |
|:--|:--|
| TelegramBotHandler | 调用 Telegram Bot API `sendMessage` |
| WeChatHandler | 调用微信模板消息 API（需 access_token 管理） |
| EmailHandler | SMTP 或第三方（Resend/SendGrid） |
| SmsHandler | 第三方 SMS API（阿里云/腾讯云） |

### 4.3 事件触发点

| 事件 | 触发位置 | 模板 | 接收人 |
|:--|:--|:--|:--|
| 付款创建 | POST /payments | payment_confirm | 家长 |
| 结算审批通过 | PUT /approvals/{id}/approve | settlement_paid | 教师 |
| 审批结果 | PUT /approvals/{id}/* | approval_result | 提交人 |
| 上课提醒 | cron (每天8:00) | class_reminder | 家长+学生 |
| 退款完成 | refund status→completed | refund_completed | 家长 |

### 4.4 Cron 任务

```python
# 每日8点检查当日课程 → 发送上课提醒
# hermes cron: schedule="0 8 * * *"
```

## 5. 前端

### 5.1 通知列表面板

- 管理端顶栏铃铛图标→下拉通知列表
- 通知已读/未读状态
- 点击跳转到相关详情页

### 5.2 设置页通知模板编辑

- 3-A settings 页 `notification` Tab 已有入口
- 可编辑模板内容（textarea + 参数提示）
- 开关：按模板启用/禁用

### 5.3 个人通知偏好（远期）

教师/家长端 → 选择接收通道 + 开关各类型通知

## 6. 限制与风险

| 风险 | 缓解 |
|:--|:--|
| 通道未确定 | 一期只做 Telegram + 站内通知，预留扩展 |
| 微信需认证服务号 | 二期，先用 Telegram |
| 批量发送限流 | Telegram 30msg/s,WeChat 10万次/天 → 队列+限速 |
| 模板参数缺失 | 渲染前校验必填参数，缺参降级为原始模板 |
| 通知轰炸 | 每人每模板每日上限1条 + 去重 |

## 7. 分期实施

| 期 | 内容 | 工期 |
|:--|:--|:--|
| 一期 | DB表 + 模板CRUD + Telegram通知 + 付款/结算触发 | 3天 |
| 二期 | 微信模板消息 + 课程提醒cron | 2天 |
| 三期 | 通知列表面板 + 个人偏好页 | 2天 |

**一期前置条件：确认 Telegram Bot Token + 接收人 chat_id 存储方式**
