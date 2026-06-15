# 修订后的文档片段

---

## A. PRD 修订片段

### 修订 1.1：7.2 教师端页面结构

**原文：**
```
教师端 App
├── 登录页（手机号 + 验证码）
```

**替换为：**
```
教师端 App
├── 登录页（手机号 + 密码）
│   └── 教务后台预创建账号时生成初始密码
│   └── 首次登录后强制修改密码
```

---

### 修订 1.2：8.1 登录/注册流程下的补充说明

**在原有流程图后新增段落：**

```
> **教师端登录流程**：教师由教务后台预创建账号（手机号 + 初始密码）。
> 教师在教师端 App 使用手机号 + 密码登录，首次登录后必须修改密码。
> 教师不使用短信验证码登录。
```

---

### 修订 1.3：9.8 教师端模块

**原文（节选）：**
```
R1
• 规则描述: 教师手机号登录，教务后台预创建账号
```

**替换为：**
```
R1
• 规则描述: 教师手机号密码登录，教务后台预创建账号并生成初始密码

R1.1
• 规则描述: 教师首次登录必须使用初始密码，登录成功后强制进入修改密码页面

R1.2
• 规则描述: 密码修改完成后方可进入主页面

R1.3
• 规则描述: 教师忘记密码需联系教务管理员重置
```

---

## B. IA.md 修订片段

### 修订 2.1：模块树 → 教师端

**原文：**
```
📱 教师端 App
├── 登录模块
│   └── 手机号+验证码登录
├── 今日课程
│   └── 课程详情 + 填写反馈
└── 全部课程
    ├── 月份筛选
    └── 课程详情 + 填写反馈
```

**替换为：**
```
📱 教师端 App
├── 登录模块
│   └── 手机号+密码登录
│       └── 首次登录强制修改密码
├── 今日课程
│   └── 课程详情 + 填写反馈
└── 全部课程
    ├── 月份筛选
    └── 课程详情 + 填写反馈
```

---

### 修订 2.2：T-LOGIN 页面定义

**原文：**
```
| T-LOGIN | 登录 | 一级 | App启动 | 手机号+验证码登录 | P0 |
```

**替换为：**
```
| T-LOGIN | 登录 | 一级 | App启动 | 手机号+密码登录 | P0 |
```

---

### 修订 2.3：教师流程 Step 1

**原文：**
```
1. 打开App → 手机号+验证码登录
```

**替换为：**
```
1. 打开App → 手机号+密码登录（教务后台预创建账号，首次登录强制修改密码）
```

---

## C. TECH-SPEC.md 修订片段

### 修订 3.1：技术栈 → 短信备注

**原文：**
```
| **短信** | 腾讯云 SMS | — | ✅ 本期 | 国内到达率高，SDK 成熟 |
```

**替换为：**
```
| **短信** | 腾讯云 SMS | — | ✅ 本期 | 仅家长端验证码使用；教师端不使用短信 |
```

---

### 修订 3.2：teachers 数据模型

**原文：**
```sql
CREATE TABLE teachers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(20) NOT NULL UNIQUE,   -- 教师手机号
    name        VARCHAR(50) NOT NULL,
    avatar_url  TEXT,                            -- 🔮 后续：头像
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ✅ 本期: 教务后台输入手机号创建，教师首次登录自动绑定
-- 🔮 后续: 教师自主注册、头像上传
```

**替换为：**
```sql
CREATE TABLE teachers (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone                VARCHAR(20) NOT NULL UNIQUE,   -- 教师手机号
    name                 VARCHAR(50) NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,         -- bcrypt 哈希
    must_change_password BOOLEAN NOT NULL DEFAULT true,  -- 首次登录强制改密
    password_updated_at  TIMESTAMPTZ,                      -- 密码最后修改时间
    avatar_url           TEXT,                            -- 🔮 后续：头像
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ✅ 本期: 教务后台输入手机号+姓名创建，自动生成初始密码
-- 教师登录: 手机号 + 密码
-- 首次登录: 强制修改密码 (must_change_password=true)
-- 忘记密码: 联系教务管理员重置
-- 🔮 后续: 教师自主注册、头像上传、自助找回密码
```

---

### 修订 3.3：角色定义表

**原文：**
```
| 角色 | 标识 | 账号来源 | 登录方式 |
|------|------|----------|----------|
| 家长 | `parent` | 手机号注册 | 手机号 + 短信验证码 |
| 教师 | `teacher` | 教务后台创建（输入手机号） | 手机号 + 短信验证码 |
| 管理员 | `admin` | 系统预设 | 账号 + 密码 |
```

**替换为：**
```
| 角色 | 标识 | 账号来源 | 登录方式 |
|------|------|----------|----------|
| 家长 | `parent` | 手机号注册 | 手机号 + 短信验证码 |
| 教师 | `teacher` | 教务后台创建（手机号 + 初始密码） | 手机号 + 密码（首次强制修改） |
| 管理员 | `admin` | 系统预设 | 账号 + 密码 |
```

---

### 修订 3.4：认证 API 列表

**原文：**
```
| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| POST | `/api/v1/auth/sms/send` | public | 发送短信验证码（60s 限流） |
| POST | `/api/v1/auth/sms/verify` | public | 验证码校验 → 签发 JWT |
| POST | `/api/v1/auth/admin/login` | public | 管理员账号密码登录 → 签发 JWT |
| POST | `/api/v1/auth/refresh` | any | 刷新 access_token |
| POST | `/api/v1/auth/logout` | any | 登出（JWT 加入 Redis 黑名单） |
```

**替换为：**
```
| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| POST | `/api/v1/auth/sms/send` | public | 发送短信验证码（仅家长端，60s 限流） |
| POST | `/api/v1/auth/sms/verify` | public | 验证码校验 → 签发 JWT（仅家长端） |
| POST | `/api/v1/auth/teacher/login` | public | 教师手机号密码登录 → 签发 JWT |
| POST | `/api/v1/auth/teacher/change-password` | teacher | 教师修改密码 |
| POST | `/api/v1/auth/admin/login` | public | 管理员账号密码登录 → 签发 JWT |
| POST | `/api/v1/auth/refresh` | any | 刷新 access_token |
| POST | `/api/v1/auth/logout` | any | 登出（JWT 加入 Redis 黑名单） |
```

---

### 修订 3.5：教师密码登录 API 格式

**在 5.1 节新增：**

```
#### 教师登录

POST /api/v1/auth/teacher/login
Content-Type: application/json

Request:
{
  "phone": "13800138000",
  "password": "string"         -- 初始密码或已修改后的密码
}

Response (200 OK):
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "role": "teacher",
  "must_change_password": true   -- true 时客户端强制跳转修改密码
}

Response (401 Unauthorized):
{
  "detail": {
    "code": "INVALID_CREDENTIALS",
    "message": "手机号或密码错误"
  }
}

- 5 次密码错误 → 账号锁定 15 分钟
- is_active=false 的教师不可登录
- must_change_password=true 时，登录成功但需先修改密码
```

**教师修改密码 API：**
```
POST /api/v1/auth/teacher/change-password
Authorization: Bearer <teacher_jwt>

Request:
{
  "old_password": "string",
  "new_password": "string"       -- 至少 8 位，含字母+数字
}

Response (200 OK):
{
  "message": "密码修改成功"
}
```

---

### 修订 3.6：教师管理 CRUD

**原文（5.4 教师管理）：**
```
POST /api/v1/teachers | admin | 创建教师（输入手机号） |
```

**替换为：**
```
POST /api/v1/teachers | admin | 创建教师（手机号+姓名，自动生成初始密码） |
PUT /api/v1/teachers/{id}/reset-password | admin | 重置教师密码（生成新初始密码） |
```

**请求/响应格式补充：**
```
POST /api/v1/teachers

Request:
{
  "phone": "13800138000",
  "name": "王老师"
}

Response (201 Created):
{
  "id": "uuid",
  "phone": "13800138000",
  "name": "王老师",
  "initial_password": "aB3#xK9m"    -- 管理员需记录或告知教师
}

PUT /api/v1/teachers/{id}/reset-password

Response (200 OK):
{
  "new_initial_password": "xY7@pL2q"
}
```

---

### 修订 3.7：认证安全

**原文（节选）：**
```
| 短信验证码长度 | 6 位数字 | ✅ 本期 |
| 验证码有效期 | 5 分钟 | ✅ 本期 |
| 验证码重试 | 同一手机号 5 次失败后锁定 30 分钟 | ✅ 本期 |
| 短信发送限流 | 同一手机号 60 秒 1 条 | ✅ 本期 |
| 密码存储 | admin 密码 bcrypt hash | ✅ 本期 |
| 暴力破解防护 | admin 登录 5 次失败锁定 15 分钟 | ✅ 本期 |
```

**替换为：**
```
| 短信验证码长度 | 6 位数字 | ✅ 本期 | 仅家长端 |
| 验证码有效期 | 5 分钟 | ✅ 本期 | 仅家长端 |
| 验证码重试 | 同一手机号 5 次失败后锁定 30 分钟 | ✅ 本期 | 仅家长端 |
| 短信发送限流 | 同一手机号 60 秒 1 条 | ✅ 本期 | 仅家长端 |
| 密码存储 | bcrypt hash | ✅ 本期 | 教师 + admin |
| 密码复杂度 | ≥ 8 位，含字母+数字 | ✅ 本期 | 教师 + admin |
| 暴力破解防护 | 5 次失败锁定 15 分钟 | ✅ 本期 | 教师 + admin |
| 强制改密 | 首次登录强制修改初始密码 | ✅ 本期 | 仅教师 |
```

---

## D. SPRINT-1-TASKS.md 修订片段

### 修订 4.1：API-02 重写

**原文：**
```
### API-02 | 短信验证码：发送 + 校验 + 登录

| **描述** | 实现短信验证码完整流程：① `POST /auth/sms/send` ... |
| **验收标准** | ① 开发模式：发送返回固定验证码 ... ⑦ 教师手机号匹配 teachers 表 → JWT role=teacher |
```

**替换为：**
```
### API-02 | 短信验证码：发送 + 校验 + 登录（仅家长端）

| **描述** | 实现家长端短信验证码完整流程：① `POST /auth/sms/send` — 生成 6 位验证码，存 DB，调腾讯云 SMS 发送（开发模式返回固定码 888888）② `POST /auth/sms/verify` — 校验验证码，匹配手机号 → 查找或创建 user (role=parent) → 签发 JWT。教师端不使用此接口 |
| **验收标准** | ① 开发模式：发送返回固定验证码 ② 验证码正确 → 返回 JWT（含 role=parent） ③ 验证码错误 → 返回 401 + 剩余次数 ④ 60s 内重复发送 → 返回 429 ⑤ 5 次错误 → 返回锁定提示 ⑥ 新手机号自动创建 user (role=parent) |

> ⚠️ 教师登录已拆分到 API-02b
```

---

### 修订 4.2：新增 API-02b

**在 API-02 之后、API-03 之前插入：**

```
### API-02b | 教师密码登录（新增）

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 教师手机号密码登录 |
| **描述** | 实现 `POST /auth/teacher/login`。校验手机号+密码（bcrypt），匹配 teachers 表后签发 JWT (role=teacher)。is_active=false 不可登录。5 次失败锁定 15 分钟。首次登录返回 must_change_password=true |
| **依赖** | API-01, DB-02 |
| **输入** | TECH-SPEC.md 5.1 节 |
| **输出** | 1 个 API 端点可用 |
| **验收标准** | ① 正确手机号+密码 → 返回 JWT（含 role=teacher, must_change_password）② 密码错误 → 401 + 剩余次数 ③ 5 次错误 → 锁定 15 分钟 ④ is_active=false → 403 ⑤ must_change_password=true 时登录成功但需先改密 ⑥ 不存在的手机号 → 401（模糊提示） |
| **优先级** | P0 |
```

---

### 修订 4.3：API-04 教师管理 CRUD 补充

**原文：**
```
| **描述** | 实现 `GET/POST /teachers` + `GET/PUT/DELETE /teachers/{id}`。创建教师只需手机号+姓名。列表支持分页。删除为软删除（is_active=false） |
```

**替换为：**
```
| **描述** | 实现 `GET/POST /teachers` + `GET/PUT/DELETE /teachers/{id}` + `PUT /teachers/{id}/reset-password`。创建教师只需手机号+姓名，后端自动生成 8 位初始密码（bcrypt hash 存储），响应返回 initial_password。列表支持分页。删除为软删除（is_active=false）。重置密码时生成新初始密码，设置 must_change_password=true |
| **验收标准** | ① admin 创建教师 → 响应包含 initial_password ② 重复手机号返回 409 ③ 分页返回正确 ④ parent/teacher 调用返回 403 ⑤ 重置密码 → 生成新密码 → must_change_password=true ⑥ 新密码可正常登录 ⑦ 教师旧密码登录返回 401 |
```

---

### 修订 4.4：FLUTTER-09 重写

**原文：**
```
| **描述** | 创建教师端 Flutter 项目 (`apps/teacher/`)，引用 `packages/core/`。实现 T-LOGIN 登录页（复用学习端登录组件，但 role=teacher）。教师首次登录（手机号匹配 teachers 表）→ 签发 teacher JWT。未匹配时显示"请联系教务注册" |
| **依赖** | FLUTTER-01, API-02 |
| **验收标准** | ① 已注册教师手机号 → 登录成功 → 跳转今日课程 ② 未注册手机号 → 显示"请联系教务注册" ③ JWT role=teacher ④ 复用 core 包的登录组件 |
```

**替换为：**
```
| **描述** | 创建教师端 Flutter 项目 (`apps/teacher/`)，引用 `packages/core/`。实现 T-LOGIN 登录页：手机号输入 + 密码输入（不可复用学习端验证码组件）。调用 `POST /auth/teacher/login`。首次登录返回 must_change_password=true → 跳转修改密码页。密码修改完成（调用 `POST /auth/teacher/change-password`）后进入主页面。未注册手机号显示"请联系教务注册" |
| **依赖** | FLUTTER-01, API-02b |
| **验收标准** | ① 正确手机号+密码 → 登录成功 → 跳转今日课程 ② 首次登录 → 强制跳转修改密码页 ③ 修改密码后 → 进入主页面 ④ 未注册手机号 → 显示"请联系教务注册" ⑤ 密码错误 → 显示剩余次数 ⑥ JWT role=teacher ⑦ 5 次错误 → 显示锁定提示 |
```

---

### 修订 4.5：新增/修改 ADMIN-02 教师管理验收标准

**在 ADMIN-02 的验收标准中补充：**

```
新增验收标准：
⑥ 创建教师 → 弹窗显示初始密码，可复制
⑦ 重置密码 → 弹窗显示新初始密码，教师下次登录需强制修改
⑧ 首页展示教师初始密码发放状态（未修改/已修改）
```

---

### 修订 4.6：任务汇总更新

**原文任务汇总：**
```
| 模块 | P0 | P1 | P2 | 合计 |
|------|----|----|-----|------|
| 后端 API | 5 | 2 | 1 | 8 |
```

**替换为：**
```
| 模块 | P0 | P1 | P2 | 合计 |
|------|----|----|-----|------|
| 后端 API | 6 | 2 | 1 | 9 |
```
> 新增 API-02b (P0)，API 总计从 8 变为 9

---

## 文档修订汇总表

| 文档 | 修订点数 | 新增内容 | 删除内容 | 替换内容 |
|------|----------|----------|----------|----------|
| PRD | 3 处 | 教师密码规则 (R1.1-1.3) | — | 登录方式、流程说明 |
| IA.md | 3 处 | 首次强制改密注释 | — | 登录方式描述 |
| TECH-SPEC.md | 6 处 | teachers 表字段、教师登录 API、密码修改 API、重置密码 API | — | 角色定义、认证 API、安全策略 |
| SPRINT-1-TASKS.md | 5 处 | API-02b 新任务 | 教师验证码逻辑 | API-02、API-04、FLUTTER-09、任务汇总 |
