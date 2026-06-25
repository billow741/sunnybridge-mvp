# 3-E 自动化通知 — 修正后实施方案

> 修正点（基于 Roger 通道决策）：
> - ❌ ~~Telegram Bot 主通道~~ → ✅ 教师 Messenger、家长微信
> - ✅ **家长在中国 → 微信为主通道**（二期，需服务号/订阅号）
> - ✅ **老师在菲律宾 → Messenger 为主通道**（一期优先）
> - ✅ **SMS 仅做紧急兜底**（不自建，走第三方 API）
> - ✅ 保留 channel 抽象层，新增通道零改动核心逻辑

---

## 1. 通道决策总览

| 角色 | 地区 | 主通道 | 兜底通道 | 一期/二期 |
|:--|:--|:--|:--|:--|
| **教师** | 菲律宾 | **Messenger** | SMS | 一期 ✅ |
| **家长** | 中国 | **微信** | SMS | 二期 🔜 |
| **管理员** | — | 站内通知 | — | 一期 ✅ |

### 为何放弃 Telegram 主通道

| 考量 | Telegram | Messenger | 微信 |
|:--|:--|:--|:--|
| 菲律宾教师渗透率 | ~30% | **~85%** | ~0% |
| 中国家长渗透率 | ~5% | ~0% | **~95%** |
| 认证门槛 | Bot Token 即可 | Page + App | 服务号年审¥300 |
| 消息到达率 | 需装 TG | 已装 FB/M | 已装微信 |

> Telegram 不作为主方案，但**不删除 handler**——未来可做管理端内部通知（Hermes 已集成 TG）。

---

## 2. 通道前置条件 & 认证要求

### 2.1 Messenger（一期 — 教师侧）

| 项目 | 要求 |
|:--|:--|
| **FB Page** | 必须有一个已发布的 Facebook Page（品牌页） |
| **FB App** | 在 [Meta for Developers](https://developers.facebook.com/) 创建 App → 添加 Messenger 产品 |
| **Page Access Token** | App → Messenger → Generate Token（需 `pages_messaging` 权限） |
| **Webhook URL** | `https://<backend>/api/v1/webhooks/messenger` — Meta 验证用 |
| **Verify Token** | 自定义字符串，Webhook 订阅时填入，回传验证 |
| **App Review** | 如需主动给用户发消息（而非仅回复），需提交 `pages_messaging` 权限审核（~3天） |
| **接收人标识** | **PSID**（Page-Scoped ID）— 用户首次与 Page 互动后可获得。存储于 `teachers` 表 |

#### PSID 获取方式

```
用户给 Page 发消息 → Webhook 收到 sender.id = PSID
→ 后端自动绑定 teacher.id ↔ PSID
```

也可用 [Messenger Profile API](https://developers.facebook.com/docs/messenger-platform/identity/user-profile) 查已有对话用户。

### 2.2 微信（二期 — 家长侧）

| 项目 | 要求 |
|:--|:--|
| **公众号类型** | 认证**服务号**（可发模板消息）或**订阅号**（每日1条）→ 推荐**服务号** |
| **认证** | 微信认证年审 ¥300/年，需企业资质 |
| **AppID + AppSecret** | 公众号后台 → 开发 → 基本配置 |
| **模板消息** | 需在后台申请模板（审核~1天），每模板有固定 template_id |
| **白名单 IP** | 后端出口 IP 需加入公众号 IP 白名单 |
| **接收人标识** | **openid** — 用户关注公众号后通过 OAuth 授权获取。存储于 `users` 表（parent 角色） |

#### OpenID 获取方式

```
用户关注公众号 → 菜单/自动回复引导点击授权链接
→ OAuth2 授权 → callback 拿到 openid + 用户信息
→ 后端绑定 user.id (parent) ↔ openid
```

### 2.3 SMS（紧急兜底）

| 项目 | 要求 |
|:--|:--|
| **服务商** | 推荐腾讯云 SMS（国内）或 Twilio（跨境），也可用 Semaphore（菲律宾本地） |
| **认证** | API Key + Secret（腾讯云）/ Account SID + Auth Token（Twilio） |
| **签名** | 腾讯云需审核短信签名（~1天）|
| **接收人标识** | **手机号** — `users.phone` 或 `teachers.phone` 已有字段 |

---

## 3. 接收人标识存储

### 3.1 数据库改动

```sql
-- teachers 表：新增 Messenger PSID
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS messenger_psid VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(20) DEFAULT 'messenger';

-- users 表：新增微信 openid
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(20) DEFAULT 'wechat';

-- 索引
CREATE INDEX IF NOT EXISTS idx_teachers_messenger_psid ON teachers(messenger_psid) WHERE messenger_psid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid) WHERE wechat_openid IS NOT NULL;
```

### 3.2 标识映射关系

| 角色 | 表 | 标识字段 | 通道 | 获取时机 |
|:--|:--|:--|:--|:--|
| 教师 | `teachers` | `messenger_psid` | Messenger | 教师首次给 Page 发消息 / 后台手动录入 |
| 家长 | `users` | `wechat_openid` | 微信 | 家长关注公众号并授权 |
| 任意 | `users` / `teachers` | `phone` | SMS | 注册时已有 |

### 3.3 当前 fallback 策略

```
教师优先 Messenger → PSID 为空则退回 SMS → phone 为空则仅站内通知
家长优先微信 → openid 为空则退回 SMS → phone 为空则仅站内通知
```

---

## 4. 数据模型

### 4.1 notifications 表

```sql
CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL,                 -- users.id 或 teachers.id
    recipient_type  VARCHAR(20) NOT NULL,           -- 'teacher' | 'parent' | 'admin'
    channel         VARCHAR(20) NOT NULL,           -- 'messenger' | 'wechat' | 'sms' | 'in_app'
    template_key    VARCHAR(50) NOT NULL,           -- 模板 key
    params          JSONB DEFAULT '{}',             -- 模板参数
    status          VARCHAR(20) DEFAULT 'pending',  -- pending → sent → failed
    external_id     VARCHAR(100),                    -- 通道返回的消息 ID（用于追踪）
    sent_at         TIMESTAMPTZ,
    error           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_status ON notifications(status, channel);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
```

### 4.2 notification_templates 表

```sql
CREATE TABLE IF NOT EXISTS notification_templates (
    key         VARCHAR(50) PRIMARY KEY,
    label       VARCHAR(200) NOT NULL,
    channel     VARCHAR(20) NOT NULL,              -- 'messenger' | 'wechat' | 'sms'
    subject     VARCHAR(200),                       -- 微信模板消息标题 / SMS 签名+标题
    body        TEXT NOT NULL,                       -- 模板内容，支持 {param} 占位符
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

#### 种子模板（一期）

| key | channel | label | body 示例 |
|:--|:--|:--|:--|
| `settlement_approved` | messenger | 结算已审批通过 | 🎉 {teacher_name}，您有一笔结算已审批通过：₱{amount}（{period}），请查收。 |
| `settlement_rejected` | messenger | 结算审批驳回 | ⚠️ {teacher_name}，您有一笔结算被驳回：₱{amount}（{period}），原因：{reason} |
| `class_reminder_teacher` | messenger | 今日课程提醒 | 📚 {teacher_name}，您今天有 {count} 节课，第一节：{first_class_time} |
| `approval_pending` | in_app | 待审批通知 | 新的结算审批申请来自 {requester_name}，金额 ₱{amount} |
| `payment_received` | wechat | 收款确认 | {child_name} 的课时费 ¥{amount} 已收到，课时余额：{remaining} 小时 |
| `class_reminder_parent` | wechat | 上课提醒 | 📚 {child_name} 明天有课，时间：{class_time}，老师：{teacher_name} |

### 4.3 user_notification_settings 表

```sql
CREATE TABLE IF NOT EXISTS user_notification_settings (
    recipient_id    UUID NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    template_key    VARCHAR(50) NOT NULL,
    enabled         BOOLEAN DEFAULT true,
    PRIMARY KEY (recipient_id, channel, template_key)
);
```

---

## 5. 后端架构

### 5.1 Channel 抽象层

```python
# backend/app/services/notification/channels/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class SendResult:
    success: bool
    external_id: str | None = None   # 通道消息 ID
    error: str | None = None

class ChannelHandler(ABC):
    """通道抽象基类 — 新增通道只需实现 send()"""

    @abstractmethod
    async def send(self, recipient_id: str, template_body: str, params: dict) -> SendResult:
        ...

    @abstractmethod
    def resolve_recipient(self, user_row: dict) -> str | None:
        """从用户行数据提取通道标识（PSID/openid/phone），无则返回 None"""
        ...
```

### 5.2 Channel 实现清单

| Handler | 文件 | `resolve_recipient` | `send` 实现 |
|:--|:--|:--|:--|
| `MessengerHandler` | `channels/messenger.py` | `user_row.get("messenger_psid")` | POST `https://graph.facebook.com/v19.0/me/messages` |
| `WeChatHandler` | `channels/wechat.py` | `user_row.get("wechat_openid")` | POST `https://api.weixin.qq.com/cgi-bin/message/template/send` |
| `SmsHandler` | `channels/sms.py` | `user_row.get("phone")` | 腾讯云 SMS SDK / Twilio API |
| `InAppHandler` | `channels/in_app.py` | `user_row.get("id")` | 写入 `notifications` 表（status=sent） |
| `TelegramHandler` | `channels/telegram.py` | `user_row.get("telegram_chat_id")` | Bot API `sendMessage`（保留，备用） |

### 5.3 通知服务核心

```python
# backend/app/services/notification/service.py

class NotificationService:
    # 通道优先级：role → [primary, fallback]
    CHANNEL_PRIORITY = {
        "teacher": ["messenger", "sms", "in_app"],
        "parent":  ["wechat", "sms", "in_app"],
        "admin":   ["in_app"],
    }

    async def send(self, template_key: str, recipient_id: str, recipient_type: str, params: dict):
        """统一发送入口 — 按通道优先级依次尝试"""
        # 1. 查模板 → 渲染 body
        # 2. 检查 user_notification_settings 是否启用
        # 3. 按通道优先级尝试发送
        #    - resolve_recipient() 为 None → 跳过此通道
        #    - send() 失败 → 尝试下一通道
        # 4. 写入 notifications 记录

    async def send_batch(self, template_key: str, recipients: list, params_fn):
        """批量发送 — 分通道打包 + 限速"""
```

### 5.4 Messenger Handler 实现（一期核心）

```python
# backend/app/services/notification/channels/messenger.py

import httpx
from .base import ChannelHandler, SendResult

class MessengerHandler(ChannelHandler):
    """Facebook Messenger 通知通道"""

    BASE_URL = "https://graph.facebook.com/v19.0/me/messages"

    def __init__(self, page_access_token: str):
        self._token = page_access_token

    def resolve_recipient(self, user_row: dict) -> str | None:
        return user_row.get("messenger_psid")

    async def send(self, recipient_psid: str, template_body: str, params: dict) -> SendResult:
        body = self._render(template_body, params)
        payload = {
            "recipient": {"id": recipient_psid},
            "message": {"text": body},
        }
        async with httpx.AsyncClient() as client:
            r = await client.post(
                self.BASE_URL,
                params={"access_token": self._token},
                json=payload,
                timeout=10,
            )
        if r.status_code == 200:
            data = r.json()
            return SendResult(success=True, external_id=data.get("message_id"))
        return SendResult(success=False, error=r.text[:200])
```

### 5.5 微信 Handler 实现（二期）

```python
# backend/app/services/notification/channels/wechat.py

class WeChatHandler(ChannelHandler):
    """微信模板消息通道"""

    TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token"
    SEND_URL  = "https://api.weixin.qq.com/cgi-bin/message/template/send"

    def __init__(self, app_id: str, app_secret: str):
        self._app_id = app_id
        self._app_secret = app_secret
        self._access_token: str | None = None
        self._token_expires: float = 0

    async def _get_access_token(self) -> str:
        """获取+缓存 access_token（有效期2h，提前5min刷新）"""
        if self._access_token and time.time() < self._token_expires:
            return self._access_token
        async with httpx.AsyncClient() as client:
            r = await client.get(self.TOKEN_URL, params={
                "grant_type": "client_credential",
                "appid": self._app_id,
                "secret": self._app_secret,
            })
        data = r.json()
        self._access_token = data["access_token"]
        self._token_expires = time.time() + data.get("expires_in", 7200) - 300
        return self._access_token

    async def send(self, openid: str, template_body: str, params: dict) -> SendResult:
        """发送模板消息 — 需配合 template_id + data 字段"""
        token = await self._get_access_token()
        # payload 结构见微信模板消息 API 文档
        # template_id 从 notification_templates 表关联
        ...
```

---

## 6. 事件触发点 & 最小可行事件

### 6.1 一期 MVP 触发事件（教师 Messenger）

| # | 事件 | 触发位置 | 模板 key | 接收人 | 优先级 |
|:--|:--|:--|:--|:--|:--|
| E1 | **结算审批通过** | `PUT /approvals/{id}/approve` | `settlement_approved` | 教师（settlement.teacher_id） | P0 |
| E2 | **结算审批驳回** | `PUT /approvals/{id}/reject` | `settlement_rejected` | 教师 | P0 |
| E3 | **付款确认（教师收款）** | `PUT /settlements/{id}/pay` | `settlement_paid` | 教师 | P1 |
| E4 | **今日课程提醒** | Cron `0 7 * * *` PHT | `class_reminder_teacher` | 教师 | P1 |

> **一期仅实现 E1-E2**（审批流闭环），E3-E4 可快速追加。

### 6.2 二期触发事件（家长微信）

| # | 事件 | 触发位置 | 模板 key | 接收人 | 优先级 |
|:--|:--|:--|:--|:--|:--|
| E5 | **课时费收款确认** | `POST /payments` | `payment_received` | 家长（child.parent_id） | P0 |
| E6 | **上课提醒** | Cron `0 20 * * *` CST | `class_reminder_parent` | 家长 | P1 |
| E7 | **课时不足预警** | Cron `0 9 * * 1` | `hours_low_warning` | 家长 | P2 |

### 6.3 管理端站内通知

| # | 事件 | 触发位置 | 模板 key | 接收人 |
|:--|:--|:--|:--|:--|
| E8 | **新审批提交** | `POST /approvals` | `approval_pending` | 所有 `settlements:approve` 角色用户 |
| E9 | **付款完成** | `PUT /settlements/{id}/pay` | `settlement_paid_admin` | 管理员 |

---

## 7. Webhook 端点

### 7.1 Messenger Webhook（一期必需）

```
GET  /api/v1/webhooks/messenger  — Meta 验证（hub.mode=subscribe, hub.verify_token）
POST /api/v1/webhooks/messenger  — 接收消息事件
```

**用途**：
1. Meta 订阅验证
2. 接收用户发给 Page 的消息 → 提取 PSID → 自动绑定教师
3. 接收消息送达回执 → 更新 notification 记录状态

### 7.2 微信 Webhook（二期）

```
GET  /api/v1/webhooks/wechat   — 微信服务器验证（signature 校验）
POST /api/v1/webhooks/wechat   — 接收事件推送（关注/取关/菜单点击）
```

**用途**：
1. 接收用户关注/取关事件
2. 接收 OAuth 授权回调
3. 接收模板消息送达状态回调

---

## 8. 配置存储

### 8.1 settings 表（category='notification'）

| key | 值 | 说明 |
|:--|:--|:--|
| `messenger_page_token` | `<encrypted>` | Page Access Token |
| `messenger_verify_token` | `<自定义字符串>` | Webhook 验证 Token |
| `messenger_enabled` | `true` / `false` | Messenger 通道开关 |
| `wechat_app_id` | `<AppID>` | 微信公众号 AppID |
| `wechat_app_secret` | `<encrypted>` | 微信公众号 AppSecret |
| `wechat_enabled` | `false` | 微信通道开关（二期开启） |
| `sms_provider` | `tencent` / `twilio` / `semaphore` | SMS 服务商 |
| `sms_api_key` | `<encrypted>` | SMS API Key |
| `sms_enabled` | `false` | SMS 通道开关 |
| `notification_daily_limit` | `5` | 每人每模板每日上限 |

---

## 9. 前端

### 9.1 一期（教师 Messenger）

- 设置页 → notification Tab → 配置 Messenger Token + 开关
- 教师详情页 → 显示 Messenger 绑定状态（PSID 有/无）
- 结算审批操作后 → 调用 `NotificationService.send` → 无额外 UI

### 9.2 二期（家长微信）

- 设置页 → 微信公众号配置面板
- 家长详情/列表 → 显示微信绑定状态（openid 有/无）
- 微信 OAuth 授权 → 家长端页面引导关注+授权

### 9.3 通知记录管理

- 管理端顶栏铃铛图标 → 下拉通知列表（站内通知）
- 通知中心页 → 全通道通知记录 + 状态筛选 + 重发按钮

---

## 10. 限流与风险

| 风险 | 缓解策略 |
|:--|:--|
| Messenger 24h 窗口限制 | 用户 24h 内与 Page 互动才能主动push → Webhook 自动绑定 PSID 确保"窗口内" |
| 微信模板消息审核 | 每个模板需单独申请，审批~1天，提前准备 |
| SMS 成本 | 仅兜底，单条 ~¥0.05（腾讯云）/ ~$0.02（Twilio 菲律宾） |
| 通知轰炸 | 每人每模板每日上限 1 条 + 相同参数去重 |
| access_token 过期 | 微信 token 提前 5min 刷新 + 缓存；Messenger token 无过期（Page Token） |
| Meta App Review | `pages_messaging` 权限需审核 → 开发阶段用测试用户；上线前提交审核 |

---

## 11. 分期实施计划

### 一期（3-4天）：教师 Messenger 通知

| 步骤 | 内容 | 依赖 |
|:--|:--|:--|
| **E-1a** | DDL：`notifications` + `notification_templates` + `user_notification_settings` + `teachers.messenger_psid` | — |
| **E-1b** | 种子：模板数据 + settings 默认值 | E-1a |
| **E-1c** | Channel 抽象层 + `MessengerHandler` + `SmsHandler`(stub) + `InAppHandler` | E-1a |
| **E-1d** | `NotificationService` 核心逻辑：模板渲染 → 通道优先级 → fallback → 写记录 | E-1c |
| **E-1e** | Messenger Webhook `/webhooks/messenger`（验证+消息接收+PSID 自动绑定） | FB Page + App |
| **E-1f** | 审批通过/驳回 → 触发 E1/E2 通知 | E-1d + 3-D 审批流 |
| **E-1g** | 前端：设置页 notification Tab + 教师详情 Messenger 状态 | E-1e |
| **E-1h** | 部署 + 冒烟测试 | 全部 |

**一期前置条件** ✅/❌：
- [ ] Facebook Page 已创建
- [ ] FB App 已创建 + Messenger 产品已添加
- [ ] Page Access Token 已获取
- [ ] 后端域名上线（VPS 已有）+ HTTPS 证书（Webhook 必需）
- [ ] `teachers` 表已有 `phone` 字段（SMS 兜底已有数据）

### 二期（3-4天）：家长微信通知

| 步骤 | 内容 | 依赖 |
|:--|:--|:--|
| **E-2a** | DDL：`users.wechat_openid` + `notification_channel` | — |
| **E-2b** | `WeChatHandler` + access_token 管理 + 模板消息发送 | 认证服务号 |
| **E-2c** | 微信 Webhook `/webhooks/wechat`（关注/OAuth 回调） | 服务号 + 域名白名单 |
| **E-2d** | 付款确认 → 触发 E5 通知家长 | E-2b + 支付流程 |
| **E-2e** | 课程提醒 Cron（教师+家长） | E-2b + 课表数据 |
| **E-2f** | 前端：家长详情页微信绑定 + OAuth 引导页 | E-2c |

**二期前置条件** ✅/❌：
- [ ] 微信认证**服务号**（非订阅号）已申请
- [ ] 服务号已微信认证（企业资质 + ¥300/年）
- [ ] AppID + AppSecret 已获取
- [ ] 后端出口 IP 已加入公众号白名单
- [ ] 至少 1 个模板消息已审核通过

### 三期（2天）：通知中心 + 偏好

| 步骤 | 内容 |
|:--|:--|
| **E-3a** | 管理端顶栏通知铃铛 + 下拉列表 |
| **E-3b** | 通知记录页（全通道 + 状态筛选 + 重发） |
| **E-3c** | 教师端/家长端通知偏好设置 |

---

## 12. 技术决策记录

| 决策 | 选项 | 选择 | 理由 |
|:--|:--|:--|:--|
| 教师通道 | Telegram / Messenger | **Messenger** | 菲律宾教师 FB 渗透率 85%+ |
| 家长通道 | Telegram / 微信 | **微信** | 中国家长微信渗透率 95%+ |
| SMS 定位 | 主通道 / 兜底 | **仅兜底** | 成本高、信息有限 |
| 通道架构 | 硬编码 / 抽象层 | **抽象层** | 多通道+fallback 需可扩展 |
| PSID 获取 | 手动录入 / Webhook 自动 | **Webhook 自动 + 手动补录** | 自动最优，手动兜底 |
| 微信 openid | 手动 / OAuth 自动 | **OAuth 自动** | 关注即授权，无需手动 |
| 模板存储 | 代码硬编码 / DB 模板表 | **DB 模板表** | 运营可改模板，无需发版 |
