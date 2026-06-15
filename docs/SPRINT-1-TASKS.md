# SunnyBridge MVP — Sprint 1 任务拆分

> **Sprint 1 目标**: 最小闭环 — 登录/绑定孩子 → 学习首页 → 课程中心 → 课后反馈 → 阅读馆
> **时长**: 2 周（10 工作日）
> **原则**: 每个任务粒度为 0.5-2 天，产出可独立验收

---

## 任务依赖总图

```
DB-01 ──→ DB-02 ──→ DB-03
                      │
                      ▼
              API-01 ──→ API-02 ──→ API-03
                │                    │
                ▼                    ▼
          API-04(教师)          API-05(课程)
                │                    │
                ▼                    ▼
          API-06(反馈)          API-07(阅读)
                                     │
              ┌──────────────────────┤
              ▼                      ▼
         FLUTTER-01              FLUTTER-02
         (共享库)               (学习端P0)
              │                      │
              ▼                      ▼
         FLUTTER-03              FLUTTER-04
         (教师端P0)            (学习端P1)
                                     │
                                     ▼
                                FLUTHER-05
                                (阅读馆)
                                     │
                                     ▼
                                ADMIN-01
                                (教务后台)
                                     │
                                     ▼
                                TEST-01
                                (集成测试)
```

---

## DB — 数据库

### DB-01 | 创建 Supabase 项目 + 基础配置

| 字段 | 值 |
|------|-----|
| **模块** | 数据库 |
| **标题** | 创建 Supabase 项目 + 基础配置 |
| **描述** | 初始化 Supabase 项目，开启 Auth/Storage，创建数据库迁移框架（SQL migrations），配置环境变量和连接 |
| **依赖** | 无 |
| **输入** | TECH-SPEC.md 附录 A 环境变量清单 |
| **输出** | Supabase 项目可用；`supabase/migrations/` 目录结构；`.env.example` 文件 |
| **验收标准** | ① Supabase 项目可连接 ② 通过 Management API 执行 `supabase/migrations/` SQL 文件无报错 ③ `.env` 可正常加载 |
| **优先级** | P0 |

### DB-02 | 建核心表：users / teachers / children / sms_codes

| 字段 | 值 |
|------|-----|
| **模块** | 数据库 |
| **标题** | 建核心表：users / teachers / children / sms_codes |
| **描述** | 按 TECH-SPEC 3.2 创建 4 张表的 migration，含索引、约束。users 表含 parent 和 admin 两种角色，新增 username 字段（部分唯一索引 WHERE role='admin'）。teachers 表新增 username 字段（NOT NULL UNIQUE），phone 改为普通索引（不再 UNIQUE）。children 表 UNIQUE(parent_id) 约束 |
| **依赖** | DB-01 |
| **输入** | TECH-SPEC.md 3.2 节 SQL 定义 |
| **输出** | SQL migration 文件；执行后 4 张表存在 |
| **验收标准** | ① 4 张表结构正确（字段类型/约束/索引） ② users 表 username 部分唯一索引仅对 role=admin 生效 ③ teachers 表 username 为 NOT NULL UNIQUE ④ teachers 表 phone 不再 UNIQUE 但有普通索引 ⑤ `INSERT` 测试数据成功 ⑥ UNIQUE 约束生效（重复插入报错） |
| **优先级** | P0 |

### DB-03 | 建业务表：courses / course_students / feedbacks + 触发器

| 字段 | 值 |
|------|-----|
| **模块** | 数据库 |
| **标题** | 建业务表：courses / course_students / feedbacks + 触发器 |
| **描述** | 按 TECH-SPEC 3.2 创建 3 张表 + feedbacks 的 AFTER INSERT 触发器（自动标记课程 completed）。course_students 多对多关联 |
| **依赖** | DB-02 |
| **输入** | TECH-SPEC.md 3.2 节 SQL 定义 + 触发器代码 |
| **输出** | SQL migration 文件；触发器 `mark_course_completed()` 已创建 |
| **验收标准** | ① 3 张表结构正确 ② `INSERT feedbacks` 后对应 course.status 自动变为 `completed` ③ course_students UNIQUE(course_id, child_id) 约束生效 |
| **优先级** | P0 |

### DB-04 | 建内容表：reading_materials / reading_progress / resources

| 字段 | 值 |
|------|-----|
| **模块** | 数据库 |
| **标题** | 建内容表：reading_materials / reading_progress / resources |
| **描述** | 按 TECH-SPEC 3.2 创建阅读馆和资源库的 3 张表。reading_progress 含 UNIQUE(child_id, material_id) |
| **依赖** | DB-02 |
| **输入** | TECH-SPEC.md 3.2 节 SQL 定义 |
| **输出** | SQL migration 文件 |
| **验收标准** | ① 3 张表结构正确 ② 索引 idx_rm_level / idx_rm_category / idx_res_category 存在 ③ reading_progress 唯一约束生效 |
| **优先级** | P1 |

### DB-05 | 配置 Supabase Storage 桶 + RLS 策略

| 字段 | 值 |
|------|-----|
| **模块** | 数据库 |
| **标题** | 配置 Supabase Storage 桶 + RLS 策略 |
| **描述** | 创建 `pdfs` 和 `covers` 两个私有桶，配置管理员可写、已认证用户可读的 RLS 策略。按 TECH-SPEC 附录 B 执行 |
| **依赖** | DB-01 |
| **输入** | TECH-SPEC.md 附录 B SQL |
| **输出** | 两个 Storage 桶可用；RLS 策略生效 |
| **验收标准** | ① `pdfs` 桶 `public=false` ② admin 角色可上传文件 ③ 未认证请求访问文件返回 403 ④ 签名 URL 可正常访问 |
| **优先级** | P1 |

### DB-06 | 种子数据 + 管理员账号

| 字段 | 值 |
|------|-----|
| **模块** | 数据库 |
| **标题** | 种子数据 + 管理员账号 |
| **描述** | 编写 `seed.sql`：管理员账号（含 username）、2 个测试教师（含 username）、3 个测试学生+家长、5 条测试课程、2 条反馈、3 条阅读材料。用于开发和集成测试。教师默认 username 格式: teacher_后4位手机号；admin 默认 username: admin_手机号 |
| **依赖** | DB-03, DB-04 |
| **输入** | TECH-SPEC.md 附录 C |
| **输出** | `supabase/seed.sql` |
| **验收标准** | ① `seed.sql` 执行无报错 ② 所有测试数据可查询 ③ 管理员 username 唯一且可登录 ④ 教师 username 唯一且可登录 ⑤ 反馈关联的课程 status 为 completed |
| **优先级** | P1 |

---

## API — 后端 API

### API-01 | FastAPI 项目骨架 + 认证模块

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | FastAPI 项目骨架 + 认证模块 |
| **描述** | 搭建 FastAPI 项目结构（api/models/schemas/services/core），实现 JWT 工具（RS256 签发/验证）、依赖注入（get_current_user / require_role）、全局异常处理、CORS 配置 |
| **依赖** | DB-01 |
| **输入** | TECH-SPEC.md 2/4/5 节 |
| **输出** | FastAPI 应用可启动；`/docs` 可访问 OpenAPI；JWT 签发/验证可工作 |
| **验收标准** | ① `uvicorn app.main:app` 启动无报错 ② `/docs` 页面可访问 ③ 手动签发 JWT → 调用需认证的测试端点返回 200 ④ 无效 JWT 返回 401 |
| **优先级** | P0 |

### API-02 | 短信验证码：发送 + 校验 + 登录（仅家长端）

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 短信验证码：发送 + 校验 + 登录（仅家长端） |
| **描述** | 实现家长端短信验证码完整流程：① `POST /auth/sms/send` — 生成 6 位验证码，存 DB，调腾讯云 SMS 发送（开发模式返回固定码 888888）② `POST /auth/sms/verify` — 校验验证码，匹配手机号 → 查找或创建 user (role=parent) → 签发 JWT。教师端不使用此接口 |
| **依赖** | API-01, DB-02 |
| **输入** | TECH-SPEC.md 5.1 节 + 9.1 节 |
| **输出** | 2 个 API 端点可用；验证码限流生效 |
| **验收标准** | ① 开发模式：发送返回固定验证码 ② 验证码正确 → 返回 JWT（含 role=parent） ③ 验证码错误 → 返回 401 + 剩余次数 ④ 60s 内重复发送 → 返回 429 ⑤ 5 次错误 → 返回锁定提示 ⑥ 新手机号自动创建 user (role=parent) |
| **优先级** | P0 |
> ⚠️ 教师登录已拆分到 API-02b

### API-02b | 教师密码登录（新增）

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 教师用户名密码登录 |
| **描述** | 实现 `POST /auth/teacher/login`。校验用户名+密码（bcrypt），匹配 teachers 表后签发 JWT (role=teacher)。is_active=false 不可登录。5 次失败锁定 15 分钟。首次登录返回 must_change_password=true |
| **依赖** | API-01, DB-02 |
| **输入** | TECH-SPEC.md 5.1 节 |
| **输出** | 1 个 API 端点可用 |
| **验收标准** | ① 正确用户名+密码 → 返回 JWT（含 role=teacher, must_change_password）② 密码错误 → 401 + 剩余次数 ③ 5 次错误 → 锁定 15 分钟 ④ is_active=false → 403 ⑤ must_change_password=true 时登录成功但需先改密 ⑥ 不存在的用户名 → 401（模糊提示） |
| **优先级** | P0 |

### API-03 | 管理员登录 + Token 刷新/登出

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 管理员登录 + Token 刷新/登出 |
| **描述** | ① `POST /auth/admin/login` — 用户名+密码校验（bcrypt），5 次失败锁定 15 分钟 ② `POST /auth/parent/login` — 家长手机号+密码登录（password_hash IS NOT NULL 时可用）③ `POST /auth/refresh` — 用 refresh_token 换新 access_token ④ `POST /auth/logout` — access_token 加入 Redis 黑名单 |
| **依赖** | API-01 |
| **输入** | TECH-SPEC.md 5.1 节 + 9.1 节 |
| **输出** | 4 个 API 端点可用 |
| **验收标准** | ① 正确用户名+密码 → JWT (role=admin) ② 错误密码 → 401 + 剩余次数 ③ 5 次错误 → 账号锁定 15 分钟 ④ 家长手机号+密码登录成功（已设密码时）⑤ 家长未设密码时密码登录 → 401 ⑥ refresh_token 可换取新 access_token ⑦ 登出后原 token 调用接口返回 401 |
| **优先级** | P0 |

### API-04 | 教师管理 CRUD

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 教师管理 CRUD |
| **描述** | 实现 `GET/POST /teachers` + `GET/PUT/DELETE /teachers/{id}` + `PUT /teachers/{id}/reset-password`。创建教师需 username+手机号+姓名，后端自动生成 8 位初始密码（bcrypt 存储），响应返回 initial_password。列表支持分页。删除为软删除（is_active=false） |
| **依赖** | API-01, DB-02 |
| **输入** | TECH-SPEC.md 5.4 节 |
| **输出** | 6 个 API 端点可用 |
| **验收标准** | ① admin 创建教师 → 响应包含 initial_password（8 位随机字符）+ username ② 重复 username 返回 409 ③ 重复手机号返回 409 ④ 分页返回正确 ⑤ parent/teacher 角色调用返回 403 ⑥ 重置密码 → 生成新初始密码 → must_change_password=true ⑦ 新密码可正常登录 ⑧ 教师旧密码登录返回 401 |
| **优先级** | P0 |

### API-05 | 学生管理 CRUD（含家长自动创建）

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 学生管理 CRUD（含家长自动创建） |
| **描述** | 实现 `GET/POST /children` + `GET/PUT/DELETE /children/{id}` + `GET /children/me`。创建学生时关联家长手机号，若家长 user 不存在则自动创建 (role=parent)。`/children/me` 供家长查看自己的孩子 |
| **依赖** | API-01, DB-02 |
| **输入** | TECH-SPEC.md 5.5 节 |
| **输出** | 5 个 API 端点可用 |
| **验收标准** | ① 创建学生时传入新家长手机号 → 自动创建 user (role=parent) ② 创建学生时传入已有家长手机号 → 关联现有 user ③ `/children/me` 返回当前家长的孩子信息 ④ 一个家长只能有一个孩子（UNIQUE 约束） ⑤ 非 admin 创建/编辑返回 403 |
| **优先级** | P0 |

### API-06 | 课程管理 CRUD（含安排教师/学生）

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 课程管理 CRUD（含安排教师/学生） |
| **描述** | 实现 `POST/PUT/DELETE /courses` + `GET /courses/{id}` (admin)；`GET /courses/today` (parent+teacher)；`GET /courses/history` (parent)；`GET /courses/all` (teacher+admin，支持月份筛选)。创建/编辑课程时可指定 teacher_id + child_ids + meeting_link |
| **依赖** | API-01, DB-03 |
| **输入** | TECH-SPEC.md 5.2 节 |
| **输出** | 7 个 API 端点可用 |
| **验收标准** | ① admin 创建课程 + 关联学生成功 ② parent 的 `/courses/today` 只返回自己孩子的课程 ③ teacher 的 `/courses/today` 只返回自己的课程 ④ `/courses/history` 按日期倒序分页 ⑤ `/courses/all` 支持月份筛选 ⑥ 课程详情包含反馈信息（如有） ⑦ 腾讯会议链接正确返回 |
| **优先级** | P0 |

### API-07 | 反馈：创建/修改/查看

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 反馈：创建/修改/查看 |
| **描述** | 实现 `POST /courses/{id}/feedback` (teacher)、`PUT /courses/{id}/feedback` (teacher)、`GET /courses/{id}/feedback` (parent+teacher+admin)。创建反馈后由 DB 触发器自动标记课程 completed。content 为必填，homework/notes 选填 |
| **依赖** | API-06, DB-03 |
| **输入** | TECH-SPEC.md 5.3 节 |
| **输出** | 3 个 API 端点可用 |
| **验收标准** | ① teacher 提交反馈成功 → 课程 status 变为 completed ② 同一课程重复提交返回 409（UNIQUE 约束） ③ parent 可查看反馈，不能创建/修改 ④ 反馈内容包含 content/homework/notes 三个字段 ⑤ content 为空返回 422 |
| **优先级** | P0 |

### API-08 | 阅读馆：材料 CRUD + 阅读进度

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 阅读馆：材料 CRUD + 阅读进度 |
| **描述** | 实现 ① 材料管理: `GET/POST /reading/materials` + `GET/PUT/DELETE /reading/materials/{id}` + `POST /reading/materials/{id}/upload`（admin）② 材料浏览: `GET /reading/materials` + `GET /reading/materials/{id}`（parent+teacher，含签名 PDF URL）③ 阅读进度: `GET /reading/progress` + `PUT /reading/progress/{material_id}`（parent）。级别/分类筛选。上传时自动提取 page_count |
| **依赖** | API-01, DB-04, DB-05 |
| **输入** | TECH-SPEC.md 5.6 节 + 7 节 |
| **输出** | 8 个 API 端点可用 |
| **验收标准** | ① admin 上传 PDF → 返回 url + page_count ② 材料列表支持 level 和 category 筛选 ③ 签名 URL 1h 有效期 ④ 更新阅读进度 → current_page == page_count 时 completed=true ⑤ `/reading/progress` 返回当前孩子的所有阅读进度 |
| **优先级** | P1 |

### API-09 | 资源库 CRUD + 通用上传

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 资源库 CRUD + 通用上传 |
| **描述** | 实现 `GET/POST /resources` + `GET/PUT/DELETE /resources/{id}` + `POST /resources/{id}/upload`（admin）+ `GET /resources` + `GET /resources/{id}`（parent+teacher，含签名 URL）。支持 category 筛选 |
| **依赖** | API-01, DB-04, DB-05 |
| **输入** | TECH-SPEC.md 5.7 节 |
| **输出** | 7 个 API 端点可用 |
| **验收标准** | ① admin 上传资源 PDF 成功 ② 列表支持 category 筛选 ③ 签名 URL 正常生成 ④ parent/teacher 可浏览，不可创建/编辑 |
| **优先级** | P1 |

### API-10 | 埋点事件上报端点

| 字段 | 值 |
|------|-----|
| **模块** | 后端 API |
| **标题** | 埋点事件上报端点 |
| **描述** | 实现 `POST /events`，接收客户端上报的埋点事件，写入 events 表（或先写日志文件）。允许离线补报（客户端时间戳） |
| **依赖** | API-01 |
| **输入** | TECH-SPEC.md 8 节 |
| **输出** | 1 个 API 端点可用 |
| **验收标准** | ① 上报事件返回 202 ② 未认证请求返回 401 ③ 事件含 event/properties/timestamp 字段 |
| **优先级** | P2 |

---

## FLUTTER — 学习端 App

### FLUTTER-01 | Flutter 项目骨架 + 共享库

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | Flutter 项目骨架 + 共享库 |
| **描述** | 创建学习端 Flutter 项目 (`apps/student/`) + 共享包 (`packages/core/`)。core 包含：API client (Dio)、JWT 存储 (flutter_secure_storage)、路由框架 (GoRouter)、基础主题 (颜色/字体/间距)、通用组件（CourseCard/MaterialCard/EmptyState/LoadingIndicator/ErrorRetry）。教师端后续复用此 core 包 |
| **依赖** | API-01 |
| **输入** | TECH-SPEC.md 1 节项目结构 + IA.md 全局组件清单 |
| **输出** | 两个 Flutter 项目可编译运行；core 包含 API client + 路由 + 主题 + 4 个通用组件 |
| **验收标准** | ① `flutter build apk --debug` 成功 ② core 包可被 student/teacher 项目引用 ③ API client 可发送请求到后端 ④ 通用组件在 preview 中正常显示 |
| **优先级** | P0 |

### FLUTTER-02 | 登录页（手机号 + 验证码）

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | 登录页（手机号 + 验证码/密码） |
| **描述** | 实现 S-LOGIN 页面：手机号输入 → 发送验证码按钮（60s 倒计时）→ 验证码输入 → 登录。调用 `POST /auth/sms/send` 和 `POST /auth/sms/verify`。另提供密码登录入口：手机号 + 密码登录，调用 `POST /auth/parent/login`（未设密码时提示"请使用验证码登录"）。登录成功存 JWT → 跳转课程首页。验证码输入错误显示剩余次数。账号锁定显示提示 |
| **依赖** | FLUTTER-01, API-02 |
| **输入** | IA.md S-LOGIN 页面定义 |
| **输出** | 登录页可正常使用 |
| **验收标准** | ① 输入手机号 → 点击发送 → 60s 倒计时 ② 输入验证码 → 登录成功 → 跳转课程首页 ③ JWT 存储到 flutter_secure_storage ④ 验证码错误 → 显示错误提示 ⑤ 重复发送 → 显示"请稍后再试" ⑥ App 重启时，有效 JWT 直接进入首页 ⑦ 密码登录：已设密码的家长输入手机号+密码 → 登录成功 ⑧ 密码登录：未设密码 → 提示"请使用验证码登录" |
| **优先级** | P0 |

### FLUTTER-03 | 课程 Tab：今日/历史课程列表

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | 课程 Tab：今日/历史课程列表 |
| **描述** | 实现 S-COURSE + S-COURSE-TODAY + S-COURSE-HISTORY 页面。顶部 Tab 切换今日/历史。课程卡片显示：日期、时间、教师名、课程状态（pending/completed）。调用 `GET /courses/today` 和 `GET /courses/history`。空状态展示 |
| **依赖** | FLUTTER-01, API-06 |
| **输入** | IA.md S-COURSE 页面定义 |
| **输出** | 课程首页可浏览今日/历史课程 |
| **验收标准** | ① 今日课程列表正确显示 ② 切换到历史课程正确显示 ③ 课程卡片信息完整（日期/时间/教师/状态） ④ 无课程时显示空状态 ⑤ 下拉刷新正常 |
| **优先级** | P0 |

### FLUTTER-04 | 课程详情：反馈 + 腾讯会议入口

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | 课程详情：反馈 + 腾讯会议入口 |
| **描述** | 实现 S-COURSE-DETAIL 页面。显示课程信息 + 腾讯会议"进入课堂"按钮（调 URL scheme 跳转 wemeet://）+ 反馈内容区（课堂内容/作业/备注，未提交时显示"教师尚未填写反馈"）。调用 `GET /courses/{id}` |
| **依赖** | FLUTTER-03, API-06, API-07 |
| **输入** | IA.md S-COURSE-DETAIL 页面定义 |
| **输出** | 课程详情页可查看反馈+跳转腾讯会议 |
| **验收标准** | ① 课程信息正确展示 ② 有反馈时显示课堂内容/作业/备注 ③ 无反馈时显示"教师尚未填写反馈" ④ 点击"进入课堂"跳转腾讯会议 App ⑤ 未安装腾讯会议时打开浏览器链接 |
| **优先级** | P0 |

### FLUTTER-05 | 我的 Tab：孩子信息 + 退出登录

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | 我的 Tab：孩子信息 + 退出登录 |
| **描述** | 实现 S-PROFILE 页面。显示家长手机号（脱敏）+ 孩子姓名/英文名/级别。退出登录按钮 → 清除本地 JWT → 跳转登录页。调用 `GET /children/me` |
| **依赖** | FLUTTER-01, API-05 |
| **输入** | IA.md S-PROFILE 页面定义 |
| **输出** | 我的页面可查看孩子信息+退出登录 |
| **验收标准** | ① 手机号脱敏显示 138\*\*\*\*1234 ② 孩子信息正确展示 ③ 退出登录 → 清除 JWT → 跳转登录页 ④ 退出后再进需重新登录 |
| **优先级** | P1 |

### FLUTTER-06 | 阅读馆 Tab：级别/分类筛选 + 材料列表

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | 阅读馆 Tab：级别/分类筛选 + 材料列表 |
| **描述** | 实现 S-LIBRARY 页面。顶部级别筛选条 (L1-L6) + 分类筛选条 (绘本/短文/故事/跟读)。材料卡片显示封面+标题+级别+分类+已读/未读标记。调用 `GET /reading/materials` + `GET /reading/progress` |
| **依赖** | FLUTTER-01, API-08 |
| **输入** | IA.md S-LIBRARY 页面定义 |
| **输出** | 阅读馆首页可筛选浏览材料 |
| **验收标准** | ① 级别筛选生效 ② 分类筛选生效 ③ 材料卡片信息完整（封面/标题/级别/分类/已读状态） ④ 已读完材料显示"已读"标记 ⑤ 无材料时显示空状态 |
| **优先级** | P1 |

### FLUTTER-07 | PDF 阅读器（翻页/缩放/续读/标记完成）

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | PDF 阅读器（翻页/缩放/续读/标记完成） |
| **描述** | 实现 S-LIBRARY-READER 页面。使用 pdfrx 渲染 PDF。功能：① 翻页（手势+按钮）② 缩放（双指/双击）③ 续读（打开时跳转到上次页码）④ 每翻一页调用 `PUT /reading/progress/{material_id}` 更新进度 ⑤ 翻到最后一页 → 自动标记 completed=true → 返回列表时刷新已读状态 |
| **依赖** | FLUTTER-06, API-08 |
| **输入** | IA.md S-LIBRARY-READER 页面定义 |
| **输出** | PDF 阅读器可正常使用 |
| **验收标准** | ① PDF 渲染清晰，翻页流畅 ② 缩放正常 ③ 打开时跳转到上次阅读页码 ④ 阅读进度实时保存 ⑤ 翻到最后一页 → 返回列表 → 该材料显示"已读" ⑥ 重新打开 → 从第 1 页开始（已读完的材料） |
| **优先级** | P1 |

### FLUTTER-08 | 资源库 Tab + PDF 预览

| 字段 | 值 |
|------|-----|
| **模块** | 学习端 |
| **标题** | 资源库 Tab + PDF 预览 |
| **描述** | 实现 S-RESOURCE + S-RESOURCE-PREVIEW 页面。分类筛选 + 资源列表 + 点击打开 PDF 预览。复用阅读器的 pdfrx 组件，但不记录阅读进度 |
| **依赖** | FLUTTER-01, FLUTTER-07, API-09 |
| **输入** | IA.md S-RESOURCE 页面定义 |
| **输出** | 资源库可浏览+预览 PDF |
| **验收标准** | ① 分类筛选生效 ② 资源列表正确展示 ③ 点击资源 → PDF 预览正常 ④ 不记录阅读进度 |
| **优先级** | P2 |

---

## FLUTTER — 教师端 App

### FLUTTER-09 | 教师端项目 + 登录页

| 字段 | 值 |
|------|-----|
| **模块** | 教师端 |
| **标题** | 教师端项目 + 登录页 |
| **描述** | 创建教师端 Flutter 项目 (`apps/teacher/`)，引用 `packages/core/`。实现 T-LOGIN 登录页：用户名输入 + 密码输入（不可复用学习端验证码组件）。调用 `POST /auth/teacher/login`。首次登录返回 must_change_password=true → 跳转修改密码页。密码修改完成（调用 `POST /auth/teacher/change-password`）后进入主页面。未注册用户名显示"请联系教务注册" |
| **依赖** | FLUTTER-01, API-02b |
| **输入** | IA.md T-LOGIN 页面定义 |
| **输出** | 教师端 App 可登录 |
| **验收标准** | ① 正确用户名+密码 → 登录成功 → 跳转今日课程 ② 首次登录 → 强制跳转修改密码页 ③ 修改密码后 → 进入主页面 ④ 未注册用户名 → 显示"请联系教务注册" ⑤ 密码错误 → 显示剩余次数 ⑥ JWT role=teacher ⑦ 5 次错误 → 显示锁定提示 |
| **优先级** | P0 |

### FLUTTER-10 | 教师端：今日课程 + 全部课程

| 字段 | 值 |
|------|-----|
| **模块** | 教师端 |
| **标题** | 教师端：今日课程 + 全部课程 |
| **描述** | 实现 T-TODAY + T-ALL 页面。2 个 Tab：今日课程 / 全部课程（月份筛选）。课程卡片显示：时间、学生名、课程状态（pending/completed + 是否已填反馈）。调用 `GET /courses/today` + `GET /courses/all` |
| **依赖** | FLUTTER-09, API-06 |
| **输入** | IA.md T-TODAY / T-ALL 页面定义 |
| **输出** | 教师端课程列表可浏览 |
| **验收标准** | ① 今日课程只显示当天课程 ② 全部课程支持月份筛选 ③ 未填反馈课程显示"待反馈"标记 ④ 已填反馈课程显示"已完成"标记 ⑤ 课程卡片含学生名+时间 |
| **优先级** | P0 |

### FLUTTER-11 | 教师端：课程详情 + 填写反馈

| 字段 | 值 |
|------|-----|
| **模块** | 教师端 |
| **标题** | 教师端：课程详情 + 填写反馈 |
| **描述** | 实现 T-TODAY-DETAIL / T-ALL-DETAIL 页面。课程信息展示 + 腾讯会议入口 + 反馈表单（课堂内容必填 + 作业选填 + 备注选填）。提交反馈后课程卡片刷新为"已完成"。已提交反馈的课程显示反馈内容，可编辑 |
| **依赖** | FLUTTER-10, API-07 |
| **输入** | IA.md T-TODAY-DETAIL / T-ALL-DETAIL 页面定义 |
| **输出** | 教师可填写/编辑反馈 |
| **验收标准** | ① 未填反馈 → 显示空表单 ② 提交反馈成功 → 返回列表 → 课程标记"已完成" ③ 课堂内容为空时提交按钮禁用 ④ 已填反馈 → 显示反馈内容 + 编辑按钮 ⑤ 编辑反馈成功 → 内容更新 ⑥ 提交后按钮变为 loading 状态防重复 |
| **优先级** | P0 |

---

## ADMIN — 教务后台 Web

### ADMIN-01 | React 项目骨架 + 管理员登录

| 字段 | 值 |
|------|-----|
| **模块** | 教务后台 |
| **标题** | React 项目骨架 + 管理员登录 |
| **描述** | 初始化 React + Ant Design Pro 项目 (`apps/admin/`)。实现 A-LOGIN 管理员登录页（用户名+密码）。JWT 存 localStorage。登录后跳转课程管理页。侧边栏布局（6 个菜单项） |
| **依赖** | API-03 |
| **输入** | IA.md A-LOGIN 页面定义 |
| **输出** | React 项目可运行；管理员可登录 |
| **验收标准** | ① `npm run dev` 启动无报错 ② 正确用户名+密码 → 登录成功 → 跳转课程管理 ③ 错误密码 → 显示错误提示 ④ 侧边栏 6 个菜单项正确显示 ⑤ 未登录访问管理页 → 重定向到登录页 |
| **优先级** | P0 |

### ADMIN-02 | 教师管理页（列表 + 新建/编辑弹窗） ✅ 已完成

| 字段 | 值 |
|------|-----|
| **模块** | 教务后台 |
| **标题** | 教师管理页（列表 + 新建/编辑弹窗） |
| **描述** | 实现 A-TEACHERS + A-TEACHER-FORM 页面。Ant Design Table 展示教师列表（用户名/手机号/姓名/状态）。新建/编辑为 Modal 弹窗，表单字段：用户名（必填、唯一）、手机号（必填）、姓名（必填）。删除为软删除 |
| **依赖** | ADMIN-01, API-04 |
| **输入** | IA.md A-TEACHERS 页面定义 |
| **输出** | 教师管理页可用 |
| **验收标准** | ① 教师列表正确展示（含用户名列） ② 新建教师 → 弹窗表单（用户名+手机号+姓名）→ 提交成功 → 列表刷新 ③ 编辑教师 → 弹窗回填数据 → 提交成功 ④ 删除教师 → 确认弹窗 → 成功 → 列表刷新 ⑤ 重复用户名 → 提示错误 ⑥ 重复手机号 → 提示错误 ✨⑦ 恢复停用教师 → 返回新初始密码 ✨⑧ 重置密码 → 返回新初始密码 |
| **优先级** | P0 |
| **完成报告** | `docs/CHANGELOG_admin02.md` |
| **方案选择** | 方案B：后端新增 `PUT /teachers/:id/restore` 端点 + 自动重置密码 |

### ADMIN-03 | 学生管理页（列表 + 新建/编辑弹窗 + 家长自动创建）

| 字段 | 值 |
|------|-----|
| **模块** | 教务后台 |
| **标题** | 学生管理页（列表 + 新建/编辑弹窗 + 家长自动创建） |
| **描述** | 实现 A-STUDENTS + A-STUDENT-FORM 页面。表格显示学生列表（姓名/英文名/级别/家长手机号）。新建表单：学生姓名（必填）、英文名（选填）、级别（下拉 L1-L6）、家长手机号（必填，输入已有手机号自动关联，新手机号自动创建家长账号） |
| **依赖** | ADMIN-01, API-05 |
| **输入** | IA.md A-STUDENTS 页面定义 |
| **输出** | 学生管理页可用 |
| **验收标准** | ① 学生列表正确展示 ② 新建学生 → 输入新家长手机号 → 创建学生+家长 → 成功 ③ 新建学生 → 输入已有家长手机号 → 关联现有家长 → 成功 ④ 编辑学生信息成功 ⑤ 级别下拉选项 L1-L6 |
| **优先级** | P0 |

### ADMIN-04 | 课程管理页（列表 + 新建/编辑弹窗 + 安排教师/学生）

| 字段 | 值 |
|------|-----|
| **模块** | 教务后台 |
| **标题** | 课程管理页（列表 + 新建/编辑弹窗 + 安排教师/学生） |
| **描述** | 实现 A-COURSES + A-COURSE-FORM 页面。表格显示课程列表（日期/时间/教师/学生数/状态）。新建表单：日期、开始时间、结束时间、教师（下拉选择）、学生（多选下拉）、腾讯会议链接（选填） |
| **依赖** | ADMIN-02, ADMIN-03, API-06 |
| **输入** | IA.md A-COURSES 页面定义 |
| **输出** | 课程管理页可用 |
| **验收标准** | ① 课程列表正确展示 ② 新建课程 → 选择教师/学生 → 填写腾讯会议链接 → 成功 ③ 教师下拉列表来自教师管理数据 ④ 学生多选来自学生管理数据 ⑤ 编辑课程可修改所有字段 ⑥ 删除课程成功 |
| **优先级** | P0 |

### ADMIN-05 | 阅读馆管理页（列表 + 上传/编辑弹窗）

| 字段 | 值 |
|------|-----|
| **模块** | 教务后台 |
| **标题** | 阅读馆管理页（列表 + 上传/编辑弹窗） |
| **描述** | 实现 A-READING + A-READING-FORM 页面。表格展示阅读材料列表（标题/级别/分类/页数/状态）。上传弹窗：标题、级别(L1-L6)、分类(绘本/短文/故事/跟读)、PDF 上传（拖拽区域+进度条）、封面图上传。上传成功自动提取页数 |
| **依赖** | ADMIN-01, API-08, DB-05 |
| **输入** | IA.md A-READING 页面定义 |
| **输出** | 阅读馆管理页可用 |
| **验收标准** | ① 材料列表正确展示 ② 上传 PDF → 选择级别/分类 → 成功 → 页数自动填充 ③ 上传进度条显示 ④ 编辑材料可修改级别/分类/标题 ⑤ 上下架切换 |
| **优先级** | P1 |

### ADMIN-06 | 资源库管理页（列表 + 上传/编辑弹窗）

| 字段 | 值 |
|------|-----|
| **模块** | 教务后台 |
| **标题** | 资源库管理页（列表 + 上传/编辑弹窗） |
| **描述** | 实现 A-RESOURCES + A-RESOURCE-FORM 页面。与阅读馆管理页结构类似，表单字段：标题、分类(自然拼读/单词卡/推荐)、PDF 上传。无级别字段 |
| **依赖** | ADMIN-01, API-09, DB-05 |
| **输入** | IA.md A-RESOURCES 页面定义 |
| **输出** | 资源库管理页可用 |
| **验收标准** | ① 资源列表正确展示 ② 上传 PDF → 选择分类 → 成功 ③ 编辑资源可修改分类/标题 ④ 上下架切换 |
| **优先级** | P1 |

---

## TEST — 测试

### TEST-01 | 后端集成测试：认证 + 课程 + 反馈 ✅ 已完成

| 字段 | 值 |
|------|-----|
| **模块** | 测试 |
| **标题** | 后端集成测试：认证 + 课程 + 反馈 |
| **描述** | 使用 pytest + httpx 编写后端集成测试。覆盖核心流程：① 家长注册登录（短信验证码+密码两种方式）② 教师用户名密码登录 ③ 管理员用户名密码登录 ④ 创建教师（含 username）⑤ 创建学生 ⑥ 创建课程+关联 ⑦ 提交反馈 → 课程标记 completed ⑧ 权限隔离（parent 只看自己孩子课程）。使用测试数据库，每次运行前清空 |
| **依赖** | API-02, API-03, API-04, API-05, API-06, API-07 |
| **输入** | TECH-SPEC.md 4-5 节 |
| **输出** | `backend/tests/` 目录；`pytest` 可运行 |
| **验收标准** | ① `pytest` 全部通过 ② 覆盖上述 8 个核心流程 ③ 权限隔离测试（parent 看不到其他孩子课程）④ 测试数据库独立，不影响开发数据 ⑤ 家长密码登录：未设密码返回 401 ⑥ 教师用户名登录正确/错误均覆盖 |
| **优先级** | P0 |
| **完成报告** | `docs/CHANGELOG_test01.md` |
| **测试结果** | 69 tests, 69 passed, 0 failed |
| **测试文件** | conftest.py(337行) + test_auth.py(301行/22测试) + test_children.py(220行/14测试) + test_courses.py(404行/18测试) + test_reading.py(347行/15测试) = 1609行 |

### TEST-02 | Flutter 学习端冒烟测试

| 字段 | 值 |
|------|-----|
| **模块** | 测试 |
| **标题** | Flutter 学习端冒烟测试 |
| **描述** | 使用 Flutter integration_test 编写冒烟测试：① 登录流程 ② 今日/历史课程展示 ③ 课程详情查看 ④ 退出登录。3-5 个核心流程覆盖即可，不求全面 |
| **依赖** | FLUTTER-02, FLUTTER-03, FLUTTER-04, FLUTTER-05 |
| **输入** | IA.md 用户流程 3.1 节 |
| **输出** | `apps/student/integration_test/` 目录 |
| **验收标准** | ① `flutter test integration_test` 通过 ② 覆盖登录→课程→详情→退出 4 个流程 |
| **优先级** | P1 |
| **完成报告** | `docs/CHANGELOG_test02.md` |
| **测试结果** | 4 tests, 4 passed, 0 failed (~2s) |
| **测试文件** | helpers(385行) + course_flow_test(111行) + profile_flow_test(38行) = 534行；mirror(107行)；共641行 |

### TEST-03 | Flutter 教师端冒烟测试

| 字段 | 值 |
|------|-----|
| **模块** | 测试 |
| **标题** | Flutter 教师端冒烟测试 |
| **描述** | 编写教师端冒烟测试：① 教师登录 ② 查看今日课程 ③ 填写反馈 ④ 验证课程标记已完成 |
| **依赖** | FLUTTER-09, FLUTTER-10, FLUTTER-11 |
| **输入** | IA.md 用户流程 3.3 节 |
| **输出** | `apps/teacher/integration_test/` 目录 |
| **验收标准** | ① `flutter test integration_test` 通过 ② 覆盖登录→课程→反馈→已完成 4 个流程 |
| **优先级** | P1 |
| **完成报告** | `docs/CHANGELOG_test03.md` |
| **测试结果** | 5 tests, 5 passed, 0 failed (~3s) |
| **测试文件** | helpers(408行) + course_flow_test(93行) + feedback_flow_test(43行) = 544行；mirror(128行)；共672行 |

---

## 任务汇总

| 模块 | P0 | P1 | P2 | 合计 |
|------|----|----|-----|------|
| 数据库 | 3 | 3 | 0 | 6 |
| 后端 API | 6 | 2 | 1 | 9 |
| 学习端 | 3 | 3 | 1 | 7 |
| 教师端 | 3 | 0 | 0 | 3 |
| 教务后台 | 4 | 2 | 0 | 6 |
| 测试 | 1 | 2 | 0 | 3 |
| **合计** | **20** | **12** | **2** | **34** |

### 建议执行顺序（关键路径）

```
Week 1:
  Day 1-2:  DB-01 → DB-02 → DB-03 → API-01 → API-02 → API-02b
  Day 3-4:  API-03 → API-04 → API-05 → API-06
  Day 5:    API-07 → FLUTTER-01 → FLUTTER-02

Week 2:
  Day 1-2:  FLUTTER-03 → FLUTHER-04 → FLUTTER-09 → FLUTTER-10
  Day 3:    FLUTTER-11 → ADMIN-01 → ADMIN-02 → ADMIN-03
  Day 4:    ADMIN-04 → TEST-01
  Day 5:    DB-04 → API-08 → FLUTTER-06 → FLUTTER-07 (阅读馆闭环)

  并行: FLUTTER-05 / ADMIN-05 / ADMIN-06 / API-09 / FLUTTER-08 可穿插
```
