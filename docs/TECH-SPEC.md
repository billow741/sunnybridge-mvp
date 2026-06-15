# SunnyBridge MVP 技术方案

> 本文档基于 PRD + IA，为开发代理提供可直接执行的技术规格。
> 标注 `✅ 本期` = MVP 必须实现 | `🔮 后续` = V1.1+ 扩展

---

## 1. 技术栈

| 层 | 选型 | 版本 | 本期/后续 | 选型理由 |
|----|------|------|-----------|----------|
| **学习端 App** | Flutter | 3.22+ | ✅ 本期 | 一套代码覆盖 iOS+Android，PDF查看器生态好 |
| **教师端 App** | Flutter | 3.22+ | ✅ 本期 | 与学习端共享核心库，降低维护成本 |
| **教务后台 Web** | React + Ant Design Pro | React 18 / AntD 5 | ✅ 本期 | 管理后台标配，表单/表格开箱即用 |
| **后端 API** | FastAPI (Python) | 0.110+ | ✅ 本期 | 异步高性能，自动 OpenAPI 文档，Python 生态丰富 |
| **数据库** | Supabase (PostgreSQL) | PG 15+ | ✅ 本期 | 托管 PG + 内置 Auth + RLS 行级安全，免去自建 |
| **对象存储** | Supabase Storage | — | ✅ 本期 | 与 Supabase 统一管理，自带 CDN 和签名 URL |
| **缓存/会话** | Redis | 7+ | ✅ 本期 | 验证码限流 + JWT 黑名单 + 热数据缓存 |
| **短信** | 腾讯云 SMS | — | ✅ 本期 | 仅家长端验证码使用；教师端不使用短信 |
| **PDF 渲染** | flutter_pdfview / pdfrx | — | ✅ 本期 | 原生渲染，支持翻页+缩放+页码回调 |
| **推送通知** | — | — | 🔮 后续 | MVP 不做推送 |
| **CI/CD** | GitHub Actions | — | ✅ 本期 | Flutter build + FastAPI deploy |
| **App 分发** | TestFlight + Firebase App Distribution | — | ✅ 本期 | 内测阶段够用 |
| **监控** | Sentry | — | ✅ 本期 | Flutter + Python 统一错误追踪 |
| **日志** | structlog (Python) | — | ✅ 本期 | 结构化日志，方便排查 |

### 项目结构

```
sunnybridge-mvp/
├── apps/
│   ├── student/          # 学习端 Flutter App
│   ├── teacher/          # 教师端 Flutter App
│   └── admin/            # 教务后台 React App
├── packages/
│   └── core/             # Flutter 共享库（模型、API client、组件）
├── backend/
│   ├── app/
│   │   ├── api/          # 路由层
│   │   ├── models/       # SQLAlchemy 模型
│   │   ├── schemas/      # Pydantic 请求/响应模型
│   │   ├── services/     # 业务逻辑层
│   │   └── core/         # 配置、安全、依赖注入
│   ├── alembic/          # 数据库迁移
│   └── tests/
├── docs/
│   ├── PRD.md
│   ├── IA.md
│   └── TECH-SPEC.md     # 本文档
└── supabase/
    ├── migrations/       # Supabase SQL 迁移
    └── seed.sql          # 种子数据
```

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      客户端层                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐          │
│  │ 学习端   │  │ 教师端   │  │ 教务后台     │          │
│  │ Flutter  │  │ Flutter  │  │ React+AntD   │          │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘          │
│       │              │               │                  │
└───────┼──────────────┼───────────────┼──────────────────┘
        │              │               │
        ▼              ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    FastAPI 后端                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Auth     │  │ Course   │  │ Content  │  ...          │
│  │ Router   │  │ Router   │  │ Router   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │               │                  │
│  ┌────▼──────────────▼───────────────▼─────┐            │
│  │           Service 层 (业务逻辑)         │            │
│  └────┬──────────────┬──────────────┬──────┘            │
│       │              │              │                    │
└───────┼──────────────┼──────────────┼───────────────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌────────────┐ ┌──────────────┐
│  Supabase   │ │   Redis    │ │  腾讯云 SMS  │
│  PostgreSQL │ │  (缓存)    │ │  (验证码)    │
│  + Storage  │ │            │ │              │
└─────────────┘ └────────────┘ └──────────────┘
```

### 关键架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 认证方式 | 自签 JWT (RS256) | 不依赖 Supabase Auth，自控密钥轮换；后续可迁移到 Supabase Auth |
| API 风格 | RESTful | MVP 够用，比 GraphQL 简单；OpenAPI 自动文档 |
| PDF 存储 | Supabase Storage + 签名 URL | 私有桶 + 短时效签名 URL，控制访问 |
| 多端共享 | Flutter shared package | 学习端和教师端共用 API client、模型、基础组件 |
| 管理后台部署 | Vercel / Cloudflare Pages | 纯静态 SPA，无需服务端 |
| API 部署 | Docker + 云服务器 | FastAPI + Uvicorn，单机足够 MVP 流量 |

---

## 3. 核心数据模型

### 3.1 ER 关系图

```
User (家长) 1──1 Child
Child    N──N Course (通过 course_students)
Course   N──1 Teacher
Course   1──0..1 Feedback
Child    1──N ReadingProgress
                N──1 ReadingMaterial
```

### 3.2 数据表定义

#### users（家长用户）

```sql
CREATE TABLE users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 phone VARCHAR(20) NOT NULL UNIQUE, -- 手机号，含国际区号
 username VARCHAR(50), -- admin 登录用户名（仅 role=admin 时必填）
 nickname VARCHAR(50), -- 🔮 后续：家长昵称
 role VARCHAR(20) NOT NULL DEFAULT 'parent', -- parent | admin
 password_hash TEXT, -- admin 必填、parent 可选（bcrypt）；parent 设密码后可密码登录
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_username_admin ON users(username) WHERE role = 'admin';

-- 教务后台管理员也在 users 表，role='admin'
-- ✅ 本期: parent + admin 两种角色
-- 🔮 后续: 可加 super_admin
```

#### teachers（教师）

```sql
CREATE TABLE teachers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 username VARCHAR(50) NOT NULL UNIQUE, -- 教师登录用户名
 phone VARCHAR(20) NOT NULL, -- 教师联系手机号
 name VARCHAR(50) NOT NULL,
 password_hash VARCHAR(255) NOT NULL, -- bcrypt 哈希
 must_change_password BOOLEAN NOT NULL DEFAULT true, -- 首次登录强制改密
 password_updated_at TIMESTAMPTZ, -- 密码最后修改时间
 avatar_url TEXT, -- 🔮 后续：头像
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teachers_phone ON teachers(phone);

-- ==========================================================
-- 注意：password_hash NOT NULL 且无 DEFAULT。
-- 初始密码由后端在 `POST /teachers` 时生成（8 位随机字符），
-- 并通过 `bcrypt` 哈希后写入，再向管理员展示明文 initial_password。
-- 绝不允许空字符串 '' 作为 password_hash（这是无效数据）。
-- username NOT NULL UNIQUE，创建时必须指定。
-- phone 保留 NOT NULL 但不再作登录主键，仅作联系字段。
-- ==========================================================

-- ============================================
-- 3. children 表（学生）
--    children.parent_id UNIQUE 约束：一个家长只能有一个孩子
--    children.level NOT NULL DEFAULT 'L1'：学生必须有级别
-- ============================================
CREATE TABLE children (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(50) NOT NULL,
    english_name VARCHAR(50),                    -- 英文名
    birth_date   DATE,                             -- 🔮 后续：用于年龄分级
    level        VARCHAR(10) NOT NULL DEFAULT 'L1', -- 当前级别 L1-L6
    parent_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ✅ 本期: 一个家长对应一个孩子
-- 🔮 后续: 一家长多孩子（加 sibling_of 或 family 表）
CREATE UNIQUE INDEX idx_children_parent ON children(parent_id);
```

#### courses（课程）

```sql
CREATE TABLE courses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date          DATE NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    teacher_id    UUID NOT NULL REFERENCES teachers(id),
    meeting_link  TEXT,                            -- 腾讯会议链接
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | completed | cancelled
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_date ON courses(date);
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_status ON courses(status);
```

#### course_students（课程-学生 多对多）

```sql
CREATE TABLE course_students (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    UNIQUE(course_id, child_id)
);

CREATE INDEX idx_cs_course ON course_students(course_id);
CREATE INDEX idx_cs_child ON course_students(child_id);
```

#### feedbacks（课堂反馈）

```sql
CREATE TABLE feedbacks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,                     -- 课堂内容（必填）
    homework    TEXT,                               -- 作业（选填）
    notes       TEXT,                               -- 备注（选填）
    created_by  UUID NOT NULL REFERENCES teachers(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(course_id)  -- 一个课程只有一条反馈
);

-- ✅ 本期: 教师提交反馈时，触发器自动将 course.status 更新为 'completed'
-- 🔮 后续: 支持图片附件、语音反馈
```

```sql
-- ✅ 本期: 反馈提交自动标记课程完成
CREATE OR REPLACE FUNCTION mark_course_completed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE courses SET status = 'completed', updated_at = now()
    WHERE id = NEW.course_id AND status = 'pending';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feedback_insert
    AFTER INSERT ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION mark_course_completed();
```

#### reading_materials（阅读馆材料）

```sql
CREATE TABLE reading_materials (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(200) NOT NULL,
    level       VARCHAR(10) NOT NULL,             -- L1 / L2 / L3 / L4 / L5 / L6
    category    VARCHAR(50) NOT NULL,             -- 绘本 / 短文 / 故事 / 跟读
    cover_url   TEXT,                              -- 封面图 URL
    pdf_url     TEXT NOT NULL,                     -- PDF 文件 URL (Supabase Storage)
    page_count  INTEGER NOT NULL DEFAULT 0,        -- PDF 总页数
    sort_order  INTEGER NOT NULL DEFAULT 0,        -- 同级别内排序
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rm_level ON reading_materials(level);
CREATE INDEX idx_rm_category ON reading_materials(category);
```

#### reading_progress（阅读进度）

```sql
CREATE TABLE reading_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES reading_materials(id) ON DELETE CASCADE,
    current_page    INTEGER NOT NULL DEFAULT 1,
    completed       BOOLEAN NOT NULL DEFAULT false,
    last_read_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(child_id, material_id)
);

-- ✅ 本期: current_page == page_count 时自动标记 completed=true
-- 🔮 后续: 加阅读时长统计
CREATE INDEX idx_rp_child ON reading_progress(child_id);
```

#### resources（资源库）

```sql
CREATE TABLE resources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(200) NOT NULL,
    category    VARCHAR(50) NOT NULL,             -- 自然拼读 / 单词卡 / 推荐
    pdf_url     TEXT NOT NULL,                     -- PDF 文件 URL (Supabase Storage)
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_res_category ON resources(category);
```

#### sms_codes（验证码）

```sql
CREATE TABLE sms_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(20) NOT NULL,
    code            VARCHAR(6) NOT NULL,
    used            BOOLEAN NOT NULL DEFAULT false,
    attempt_count   INTEGER NOT NULL DEFAULT 0,      -- 验证码错误次数，>=5 时锁定
    locked_until    TIMESTAMPTZ,                     -- 锁定截止时间
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_phone ON sms_codes(phone, created_at DESC);
-- ✅ 本期: 验证码 5 分钟有效，同一手机号 60s 内限发 1 条
-- ✅ 本期: 验证码验证错误 5 次后锁定 30 分钟（由 attempt_count + locked_until + 后端逻辑实现）
-- 🔮 后续: 迁移到 Redis 存储验证码，减少 PG 写入
```

---

## 4. 角色权限模型

### 4.1 角色定义

| 角色 | 标识 | 账号来源 | 登录方式 |
|------|------|----------|----------|
| 家长 | `parent` | 手机号注册 | 手机号 + 短信验证码；设密码后可手机号 + 密码 |
| 教师 | `teacher` | 教务后台创建（用户名 + 初始密码） | 用户名 + 密码（首次强制修改） |
| 管理员 | `admin` | 系统预设 | 用户名 + 密码 |

### 4.2 权限矩阵

| 资源/操作 | parent | teacher | admin |
|-----------|--------|---------|-------|
| 查看自己孩子的课程 | ✅ | — | ✅(全部) |
| 查看自己孩子的反馈 | ✅ | — | ✅(全部) |
| 查看自己的课程 | — | ✅ | ✅(全部) |
| 填写课程反馈 | — | ✅ | — |
| 进入腾讯会议 | ✅ | ✅ | — |
| 浏览阅读馆 | ✅ | ✅ | — |
| 阅读进度更新 | ✅ | — | — |
| 浏览资源库 | ✅ | ✅ | — |
| 课程 CRUD | — | — | ✅ |
| 教师 CRUD | — | — | ✅ |
| 学生 CRUD | — | — | ✅ |
| 阅读材料 CRUD | — | — | ✅ |
| 资源 CRUD | — | — | ✅ |

### 4.3 实现方式

```python
# FastAPI 依赖注入
class CurrentUser(BaseModel):
    id: UUID
    role: Literal["parent", "teacher", "admin"]
    teacher_id: UUID | None = None  # role=teacher 时有值

async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """解码 JWT → 返回当前用户"""
    ...

def require_role(*roles: str):
    """角色守卫装饰器"""
    async def _guard(user: CurrentUser = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return _guard

# 用法
@router.get("/courses/today")
async def today_courses(user = Depends(require_role("teacher"))):
    ...
```

### 4.4 数据访问隔离

```python
# ✅ 本期: Service 层硬过滤（简单可靠）
class CourseService:
    async def list_for_parent(self, parent_id: UUID):
        child = await self.get_child_by_parent(parent_id)
        return await self.repo.list_by_child(child.id)

    async def list_for_teacher(self, teacher_id: UUID):
        return await self.repo.list_by_teacher(teacher_id)

# 🔮 后续: Supabase RLS 策略（数据库层隔离）
```

---

## 5. 核心 API 列表

### 5.1 认证相关

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| POST | `/api/v1/auth/sms/send` | public | 发送短信验证码（仅家长端，60s 限流） |
| POST | `/api/v1/auth/sms/verify` | public | 验证码校验 → 签发 JWT（仅家长端） |
| POST | `/api/v1/auth/parent/login` | public | 家长手机号 + 密码登录 → 签发 JWT |
| POST | `/api/v1/auth/teacher/login` | public | 教师用户名 + 密码登录 → 签发 JWT |
| POST | `/api/v1/auth/teacher/change-password` | teacher | 教师修改密码 |
| POST | `/api/v1/auth/admin/login` | public | 管理员用户名 + 密码登录 → 签发 JWT |
| POST | `/api/v1/auth/refresh` | any | 刷新 access_token |
| POST | `/api/v1/auth/logout` | any | 登出（JWT 加入 Redis 黑名单） |

**JWT 结构:**
```json
{
  "sub": "user_id 或 teacher_id",
  "role": "parent | teacher | admin",
  "exp": 1719000000,
  "iat": 1719000000
}
// access_token 有效期: 2h
// refresh_token 有效期: 30d
```

### 5.2 课程相关

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| GET | `/api/v1/courses/today` | parent, teacher | 今日课程列表 |
| GET | `/api/v1/courses/history` | parent | 历史课程（分页，按日期倒序） |
| GET | `/api/v1/courses/all` | teacher, admin | 全部课程（月份筛选+分页） |
| GET | `/api/v1/courses/{id}` | parent, teacher, admin | 课程详情（含反馈） |
| POST | `/api/v1/courses` | admin | 创建课程 |
| PUT | `/api/v1/courses/{id}` | admin | 编辑课程 |
| DELETE | `/api/v1/courses/{id}` | admin | 删除课程 |

### 5.3 反馈相关

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| POST | `/api/v1/courses/{id}/feedback` | teacher | 创建/提交反馈（触发课程标记 completed） |
| PUT | `/api/v1/courses/{id}/feedback` | teacher | 修改反馈 |
| GET | `/api/v1/courses/{id}/feedback` | parent, teacher, admin | 查看反馈 |

### 5.4 教师管理

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| GET | `/api/v1/teachers` | admin | 教师列表（分页，支持 include_inactive） |
| POST | `/api/v1/teachers` | admin | 创建教师（返回 initial_password） |
| GET | `/api/v1/teachers/{id}` | admin | 教师详情 |
| PUT | `/api/v1/teachers/{id}` | admin | 编辑教师 |
| DELETE | `/api/v1/teachers/{id}` | admin | 软删除/停用教师（is_active=false） |
| PUT | `/api/v1/teachers/{id}/restore` | admin | 恢复停用教师（is_active=true + 自动重置密码） ✨新增 |
| PUT | `/api/v1/teachers/{id}/reset-password` | admin | 重置密码（返回新 initial_password） |

### 5.5 学生管理

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| GET | `/api/v1/children` | admin | 学生列表 |
| POST | `/api/v1/children` | admin | 创建学生（关联家长手机号，自动创建家长账号如不存在） |
| PUT | `/api/v1/children/{id}` | admin | 编辑学生 |
| DELETE | `/api/v1/children/{id}` | admin | 删除学生 |
| GET | `/api/v1/children/me` | parent | 查看自己的孩子信息 |

### 5.6 阅读馆

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| GET | `/api/v1/reading/materials` | parent, teacher | 阅读材料列表（支持 level/category 筛选） |
| GET | `/api/v1/reading/materials/{id}` | parent, teacher | 阅读材料详情（含签名 PDF URL） |
| POST | `/api/v1/reading/materials` | admin | 创建阅读材料 |
| PUT | `/api/v1/reading/materials/{id}` | admin | 编辑阅读材料 |
| DELETE | `/api/v1/reading/materials/{id}` | admin | 删除阅读材料 |
| POST | `/api/v1/reading/materials/{id}/upload` | admin | 上传 PDF |
| GET | `/api/v1/reading/progress` | parent | 我的阅读进度列表 |
| PUT | `/api/v1/reading/progress/{material_id}` | parent | 更新阅读进度（current_page） |

### 5.7 资源库

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| GET | `/api/v1/resources` | parent, teacher | 资源列表（支持 category 筛选） |
| GET | `/api/v1/resources/{id}` | parent, teacher | 资源详情（含签名 PDF URL） |
| POST | `/api/v1/resources` | admin | 创建资源 |
| PUT | `/api/v1/resources/{id}` | admin | 编辑资源 |
| DELETE | `/api/v1/resources/{id}` | admin | 删除资源 |
| POST | `/api/v1/resources/{id}/upload` | admin | 上传 PDF |

### 5.8 文件上传

| Method | Path | 角色 | 说明 |
|--------|------|------|------|
| POST | `/api/v1/upload/pdf` | admin | 通用 PDF 上传 → 返回 storage path |

### 5.9 通用响应格式

```json
// 列表响应
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 20
}

// 错误响应
{
  "detail": {
    "code": "SMS_RATE_LIMITED",
    "message": "请60秒后再试"
  }
}
```

---

## 6. 内容管理方案

### 6.1 阅读内容管理

| 字段 | 说明 | 本期/后续 |
|------|------|-----------|
| title | 标题 | ✅ 本期 |
| level | L1-L6 六级 | ✅ 本期 |
| category | 绘本/短文/故事/跟读 | ✅ 本期 |
| cover_url | 封面图 | ✅ 本期（上传至 Supabase Storage） |
| pdf_url | PDF 文件 | ✅ 本期 |
| page_count | 总页数 | ✅ 本期（上传时自动提取） |
| sort_order | 排序权重 | ✅ 本期 |
| is_active | 上下架 | ✅ 本期 |

**分级体系 (L1-L6):**

| 级别 | 定位 | 典型内容 |
|------|------|----------|
| L1 | 启蒙 | 字母书、基础词汇绘本 |
| L2 | 入门 | 简单句型绘本、短文 |
| L3 | 初级 | 桥梁书、短故事 |
| L4 | 中级 | 章节书开头 |
| L5 | 中高级 | 较长章节书 |
| L6 | 高级 | 原版章节书 |

**分类枚举:**
- 阅读馆: `picture_book`（绘本）/ `short_text`（短文）/ `story`（故事）/ `read_aloud`（跟读）
- 资源库: `phonics`（自然拼读）/ `word_card`（单词卡）/ `recommended`（推荐）

> ✅ 本期: 分类硬编码为枚举，存在应用层
> 🔮 后续: 引入 tags 表做自由标签系统

### 6.2 标签与分级策略

```
✅ 本期:
  - level: VARCHAR(10) 字段，值域 L1-L6，应用层枚举校验
  - category: VARCHAR(50) 字段，值域硬编码
  - 无自定义标签

🔮 后续:
  - 新建 tags 表 + material_tags 关联表
  - 支持管理员自定义标签
  - 支持多标签筛选
  - 支持标签推荐算法
```

### 6.3 内容上下架

```
✅ 本期: is_active 字段控制
  - 下架: UPDATE reading_materials SET is_active = false
  - App 端查询自动过滤: WHERE is_active = true
  - 已有阅读进度不受影响（学生仍可继续阅读已开始的内容）
```

---

## 7. 文件上传与媒体处理方案

### 7.1 上传流程

```
教务后台                        FastAPI                      Supabase Storage
   │                               │                              │
   │  1. POST /upload/pdf          │                              │
   │  (multipart/form-data)        │                              │
   │──────────────────────────────>│                              │
   │                               │  2. 校验文件                 │
   │                               │     - 类型: application/pdf  │
   │                               │     - 大小: ≤ 50MB           │
   │                               │     - 页数: 提取 page_count  │
   │                               │                              │
   │                               │  3. 生成存储路径              │
   │                               │     reading/{level}/{uuid}.pdf│
   │                               │                              │
   │                               │  4. supabase.storage.upload()│
   │                               │─────────────────────────────>│
   │                               │                              │
   │                               │  5. 返回 public URL          │
   │                               │<─────────────────────────────│
   │                               │                              │
   │  6. 返回 { url, page_count }  │                              │
   │<──────────────────────────────│                              │
```

### 7.2 存储路径规则

```
Supabase Storage Bucket: "pdfs"  (private)

路径规则:
  阅读材料:  reading/{level}/{material_id}.pdf     例: reading/L3/a1b2c3.pdf
  资源文件:  resources/{category}/{resource_id}.pdf 例: resources/phonics/d4e5f6.pdf
  封面图片:  covers/{material_id}.{ext}             例: covers/a1b2c3.jpg
```

### 7.3 PDF 访问控制

```
✅ 本期: 签名 URL 方案
  1. App 请求 GET /api/v1/reading/materials/{id}
  2. 后端生成 Supabase Storage 签名 URL (有效期 1h)
  3. App 用签名 URL 加载 PDF
  4. flutter_pdfview / pdfrx 直接渲染

🔮 后续:
  - 首次加载后缓存到本地
  - 离线阅读支持
  - PDF 水印（用户手机号）
```

### 7.4 文件校验规则

| 检查项 | 规则 | 本期/后续 |
|--------|------|-----------|
| 文件类型 | 仅 `application/pdf` | ✅ 本期 |
| 文件大小 | ≤ 50MB | ✅ 本期 |
| 页数提取 | 用 PyPDF2 读取 page_count | ✅ 本期 |
| 文件名 | 服务端生成 UUID，不使用原始文件名 | ✅ 本期 |
| 病毒扫描 | — | 🔮 后续（ClamAV） |
| 图片压缩 | 封面图 ≤ 500KB | 🔮 后续 |

### 7.5 PDF 页数提取

```python
import fitz  # PyMuPDF

def extract_page_count(file_bytes: bytes) -> int:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    count = doc.page_count
    doc.close()
    return count
```

---

## 8. 埋点事件设计

### 8.1 埋点方案

```
✅ 本期: 客户端本地记录 + 关键行为上报 API
  - 不引入第三方 SDK（MVP 不值得集成）
  - 核心行为通过业务 API 天然记录（登录、查看课程、提交反馈等）
  - 额外埋点通过 POST /api/v1/events 上报

🔮 后续: 接入友盟/Mixpanel/Sensors Data
```

### 8.2 事件清单

| 事件名 | 触发时机 | 参数 | 本期/后续 |
|--------|----------|------|-----------|
| `login_success` | 登录成功 | role, method(sms/admin) | ✅ 本期 |
| `login_fail` | 登录失败 | role, reason | ✅ 本期 |
| `course_view` | 查看课程详情 | course_id | ✅ 本期 |
| `meeting_join` | 点击进入腾讯会议 | course_id | ✅ 本期 |
| `feedback_submit` | 提交反馈 | course_id | ✅ 本期 |
| `feedback_view` | 家长查看反馈 | course_id | ✅ 本期 |
| `reading_open` | 打开阅读材料 | material_id, level | ✅ 本期 |
| `reading_complete` | 翻到最后一页 | material_id, duration_sec | ✅ 本期 |
| `resource_view` | 查看资源 | resource_id, category | ✅ 本期 |
| `profile_view` | 查看个人信息 | — | 🔮 后续 |
| `app_session` | 会话时长 | duration_sec, pages_viewed | 🔮 后续 |

### 8.3 上报 API

```python
POST /api/v1/events
Content-Type: application/json
Authorization: Bearer <token>

{
  "event": "reading_complete",
  "properties": {
    "material_id": "uuid",
    "duration_sec": 300
  },
  "timestamp": "2026-05-31T10:00:00Z"  # 客户端时间，允许离线补报
}
```

---

## 9. 安全与隐私要求

### 9.1 认证安全

| 项 | 规则 | 本期/后续 |
|----|------|-----------|
| JWT 算法 | RS256（非对称，公钥可分发） | ✅ 本期 |
| Access Token 有效期 | 2 小时 | ✅ 本期 |
| Refresh Token 有效期 | 30 天 | ✅ 本期 |
| Token 黑名单 | Redis 存储已登出 token | ✅ 本期 |
| 短信验证码长度 | 6 位数字 | ✅ 本期 |
| 验证码有效期 | 5 分钟 | ✅ 本期 |
| 验证码重试 | 同一手机号 5 次失败后锁定 30 分钟 | ✅ 本期 |
| 短信发送限流 | 同一手机号 60 秒 1 条 | ✅ 本期 |
| 密码存储 | admin/teacher 密码 bcrypt hash；parent 可选密码 | ✅ 本期 |
| 暴力破解防护 | admin/teacher 登录 5 次失败锁定 15 分钟 | ✅ 本期 |

### 9.2 数据安全

| 项 | 规则 | 本期/后续 |
|----|------|-----------|
| 传输加密 | 全站 HTTPS (TLS 1.2+) | ✅ 本期 |
| PDF 访问 | 私有桶 + 签名 URL (1h 有效) | ✅ 本期 |
| 手机号存储 | 明文（需用于短信发送和登录匹配） | ✅ 本期 |
| 手机号展示 | 脱敏显示 138****1234 | ✅ 本期 |
| SQL 注入 | SQLAlchemy ORM 参数化查询 | ✅ 本期 |
| XSS | React 自动转义 + API 返回纯文本 | ✅ 本期 |
| CORS | 严格白名单（仅管理后台域名） | ✅ 本期 |
| API 限流 | 全局 100 req/min per IP | ✅ 本期 |
| 日志脱敏 | 手机号/验证码不写入日志 | ✅ 本期 |
| 数据库备份 | Supabase 自动日备份 | ✅ 本期 |

### 9.3 隐私合规

| 项 | 规则 | 本期/后续 |
|----|------|-----------|
| 隐私政策 | App 首次启动必须同意 | ✅ 本期 |
| 数据最小化 | 仅收集必要信息（手机号、孩子姓名） | ✅ 本期 |
| 儿童隐私 | 不收集 14 岁以下儿童个人信息（家长代为注册） | ✅ 本期 |
| 数据导出 | — | 🔮 后续 |
| 账号注销 | — | 🔮 后续 |

---

## 10. 技术风险与规避建议

| # | 风险 | 影响 | 概率 | 规避措施 | 本期/后续 |
|---|------|------|------|----------|-----------|
| 1 | **腾讯云 SMS 降级/延迟** | 用户无法登录 | 中 | ✅ 本期: 备用方案 — 开发环境用固定验证码 888888；生产环境设置 30s 超时提示+重试按钮 | ✅ 本期 |
| 2 | **PDF 渲染性能差** | 大 PDF 加载慢/崩溃 | 中 | ✅ 本期: 限制单文件 ≤ 50MB；Flutter 使用 pdfrx（比 flutter_pdfview 性能更好）；分页加载 | ✅ 本期 |
| 3 | **Supabase Storage 签名 URL 过期** | 阅读中断 | 低 | ✅ 本期: 有效期 1h，App 在 50min 时预刷新 URL | ✅ 本期 |
| 4 | **Supabase 免费额不够** | 存储或带宽超限 | 中 | ✅ 本期: 监控用量；Pro 计划 $25/月兜底；PDF 压缩后上传 | ✅ 本期 |
| 5 | **Flutter 双端兼容问题** | iOS/Android 表现不一 | 中 | ✅ 本期: 优先 Android（用户主要平台）；iOS 用 TestFlight 验证；pdfrx 两端都测 | ✅ 本期 |
| 6 | **教师首次登录绑定失败** | 教师无法使用 | 低 | ✅ 本期: 教务后台创建教师时立即生成 teacher 记录；登录时按手机号匹配；未匹配给出明确提示 | ✅ 本期 |
| 7 | **腾讯会议链接格式变化** | 无法跳转 | 低 | ✅ 本期: 不硬编码链接格式，直接用 URL scheme 跳转；兼容 wemeet:// 和 https://meeting.tencent.com/ | ✅ 本期 |
| 8 | **并发写入冲突** | 反馈重复提交 | 低 | ✅ 本期: feedbacks 表 UNIQUE(course_id) 约束；前端提交后禁用按钮 | ✅ 本期 |
| 9 | **数据迁移风险** | Supabase 迁移失败 | 低 | ✅ 本期: Alembic 管理 SQL 迁移；每次迁移前备份；supabase/migrations/ 版本控制 | ✅ 本期 |
| 10 | **Redis 单点故障** | 验证码/黑名单不可用 | 低 | ✅ 本期: Redis 不可用时验证码降级到 DB 查询；黑名单降级到短期 token | ✅ 本期 |

### 10.1 技术债务清单（MVP 允许，后续必须还）

| 债务 | 本期妥协 | 后续方案 |
|------|----------|----------|
| 无推送通知 | 用户需主动打开 App | 接入极光/FCM |
| 无离线缓存 | 无网络时 App 不可用 | 本地 SQLite + 同步队列 |
| 无自动测试 | ~~手动测试为主~~ pytest 集成测试已完成(TEST-01: 69 tests) | Flutter integration_test + 扩展 pytest 覆盖 |
| 硬编码分类 | level/category 写死在代码 | 后台可配置标签系统 |
| 无日志平台 | structlog 写文件 | ELK / Loki |
| 单机部署 | 无水平扩展 | K8s / Serverless |
| 无 CI 自动部署 | 手动部署 | GitHub Actions 全自动 |

---

## 11. 集成测试方案

> TEST-01 已实现，以下为实际测试架构记录。

### 11.1 技术选型

| 项 | 选型 | 说明 |
|----|------|------|
| 测试框架 | pytest + pytest-asyncio | 异步测试支持 |
| HTTP 客户端 | httpx.AsyncClient + ASGITransport | in-process，不启动真实服务器 |
| 数据库 | 复用开发 Supabase 实例 | 测试用户用 `test_it_` 前缀区分 |
| 缓存 | Redis sb-redis | autouse fixture 每测试后清理黑名单 key |

### 11.2 测试文件结构

```
backend/tests/
├── conftest.py          # 全局 fixture + helper (337行)
├── test_auth.py         # 认证鉴权 (301行, 22测试)
├── test_children.py     # 学生CRUD+权限 (220行, 14测试)
├── test_courses.py      # 课程+反馈 (404行, 18测试)
├── test_reading.py      # 阅读材料+进度 (347行, 15测试)
├── test_api_teachers.py       # 旧文件(与TEST-01重叠)
├── test_auth_admin_parent.py  # 旧文件(与TEST-01重叠)
├── test_auth_teacher.py       # 旧文件(与TEST-01重叠)
└── test_auth_sms.py           # 旧文件(与TEST-01重叠)
```

### 11.3 Fixture 设计

| Fixture | 作用域 | 说明 |
|---------|--------|------|
| `async_client` | function | httpx.AsyncClient，in-process ASGITransport |
| `setup_test_users` | session | 同步 Supabase client 创建 3 类测试用户 |
| `teardown_test_users` | session | 清理测试用户数据 |
| `redis_cleanup` | function (autouse) | 每个测试后清理 Redis JWT 黑名单 key |

**Helper 函数**：`admin_headers()`, `teacher_headers()`, `parent_headers()` — 返回对应角色的 `Authorization: Bearer xxx` header。

### 11.4 运行方式

```bash
# TEST-01 的 4 个文件（推荐，<60s）
cd backend && python3 -m pytest tests/test_auth.py tests/test_children.py tests/test_courses.py tests/test_reading.py -v

# 全量 8 文件会超时 (>300s)，暂不推荐
# 原因：旧文件 fixture 可能冲突，需后续整合
```

**前置条件**：
- Redis 容器运行中（`docker ps | grep sb-redis`）
- `.env` 中 Supabase 配置正确
- `pip install pytest pytest-asyncio httpx`（已在 venv 中）

### 11.5 测试覆盖概览

| 模块 | 测试数 | 核心覆盖 |
|------|--------|----------|
| 认证鉴权 | 22 | 家长短信/密码登录、教师密码登录、管理员密码登录、Token 刷新/登出、权限隔离 |
| 学生管理 | 14 | CRUD、自动创建家长、关联已有家长、权限隔离 |
| 课程+反馈 | 18 | 课程 CRUD、提交反馈→completed、重复反馈 409、权限隔离 |
| 阅读馆 | 15 | 材料 CRUD、进度 PUT、级别/分类筛选、权限隔离 |
| **合计** | **69** | — |

---

## 附录 A: 环境变量清单

```bash
# .env.example

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://...

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRE_MINUTES=120
JWT_REFRESH_EXPIRE_DAYS=30

# Redis
REDIS_URL=redis://localhost:6379/0

# 腾讯云 SMS
TENCENT_SMS_SECRET_ID=AKID...
TENCENT_SMS_SECRET_KEY=xxxx
TENCENT_SMS_SDK_APP_ID=1400...
TENCENT_SMS_SIGN_NAME=SunnyBridge
TENCENT_SMS_TEMPLATE_ID=123456

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
APP_ENV=development  # development | staging | production
CORS_ORIGINS=https://admin.sunnybridge.com
```

## 附录 B: Supabase Storage 桶配置

```sql
-- 创建私有桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false);

-- 管理员可上传
CREATE POLICY "Admin can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND auth.role() = 'admin');

-- 已认证用户可读取（通过签名 URL）
CREATE POLICY "Authenticated can read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND auth.role() IN ('parent', 'teacher', 'admin'));
```

## 附录 C: 种子数据

```sql
-- 管理员账号 (密码: admin123 → bcrypt hash)
INSERT INTO users (phone, role) VALUES ('admin', 'admin');
-- 密码存单独的 admin_passwords 表或环境变量

-- 级别枚举值
-- L1, L2, L3, L4, L5, L6

-- 阅读馆分类枚举
-- picture_book, short_text, story, read_aloud

-- 资源库分类枚举
-- phonics, word_card, recommended
```
