# SunnyBridge MVP — 教师端登录方式变更：验证码 → 密码

## 变更日期
2026-06-05

## 变更范围
将教师端登录方式从「手机号 + 短信验证码」统一改为「手机号 + 密码」，
并在四份核心文档中完成同步修订。

---

## 第四部分：变更影响说明

### 1. 对数据库的影响

#### 新增/变更的表结构
- **teachers 表**：新增 3 个字段
  - `password_hash VARCHAR(255) NOT NULL` — bcrypt 哈希存储教师密码
  - `must_change_password BOOLEAN NOT NULL DEFAULT true` — 标记是否首次登录强制改密
  - `password_updated_at TIMESTAMPTZ` — 记录密码最后修改时间

- **sms_codes 表**：无变更，继续用于家长端验证码

#### 数据影响
- 现有教师数据：需补充 `password_hash`（可选：为现有教师生成默认密码并通知管理员重置）
- 新建教师：创建时必须同时生成初始密码（建议 8 位随机字符）

#### 新增 SQL 变更（需要补充到 migration）
```sql
-- teachers 表扩展（需在 DB-02 的 migration 中同步）
ALTER TABLE teachers ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE teachers ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE teachers ADD COLUMN password_updated_at TIMESTAMPTZ;
```
> ⚠️ 注意：首次部署时，password_hash 必须 NOT NULL，但需要处理现有数据。
> 建议方案：先允许 NULL，INSERT 现有教师时生成默认密码，再改回 NOT NULL。

---

### 2. 对 API 的影响

#### 新增 API 端点（2 个）
| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/v1/auth/teacher/login` | 教师手机号密码登录，签发 JWT |
| POST | `/api/v1/auth/teacher/change-password` | 教师修改密码（需 teacher JWT）|

#### 修改的 API 端点
| Method | Path | 变更说明 |
|--------|------|----------|
| POST | `/api/v1/auth/sms/send` | 标注「仅家长端」，移除教师相关逻辑 |
| POST | `/api/v1/auth/sms/verify` | 标注「仅家长端」，移除了「教师手机号匹配 teachers 表」逻辑 |
| POST | `/api/v1/teachers` | 响应新增 `initial_password` 字段（8 位随机字符）|
| PUT | `/api/v1/teachers/{id}/reset-password` | 新增：重置教师密码，生成新初始密码 |

#### 不受影响端点
- `/api/v1/auth/admin/login` — 管理员登录未动
- `/api/v1/auth/refresh`, `/auth/logout` — 通用，未动
- 课程/反馈/阅读馆/资源库等所有业务 API — 不受影响

---

### 3. 对 Flutter 教师端的影响

#### 登录页（T-LOGIN）
- **原方案**：复用学习端验证码组件（手机号 → 获取验证码 → 输入验证）
- **新方案**：独立密码登录界面（手机号 + 密码输入）
- **技术影响**：
  - 不可复用学习端的验证码组件
  - 需新增密码输入框 UI
  - 需新增「首次登录强制修改密码」流程页
  - 需新增密码校验逻辑（≥8 位，字母+数字）

#### 新增页面
| 页面 | 说明 |
|------|------|
| T-LOGIN | 手机号+密码登录 |
| T-CHANGE-PASSWORD | 首次登录/手动修改密码（教师端独立） |

#### 状态机更新
```
登录成功 + must_change_password=true → 跳转修改密码页
登录成功 + must_change_password=false → 跳转今日课程
```

#### 测试影响
- TEST-03（教师端冒烟测试）：登录步骤从「验证码登录」改为「密码登录」
- 需新增：首次登录改密流程的冒烟测试

---

### 4. 对 Admin 教务后台的影响

#### 教师管理页（ADMIN-02）
- **新增功能**：创建教师时自动生成初始密码并在弹窗中显示
- **新增功能**：重置密码按钮（每行教师列表）
- **新增功能**：密码修改状态列（未修改/已修改）
- **验收标准补充**：
  - 创建教师后弹窗显示 `initial_password`，可复制
  - 重置密码后弹窗显示新 `initial_password`
  - 教师列表展示 must_change_password 状态

#### UI 交互变更
```
新增教师弹窗:
  手机号: [__________]
  姓名:   [__________]
  → 提交后弹窗显示: "初始密码: Ab3#xK9m（请记录或告知教师）"

重置密码弹窗（教师行内操作）:
  确认重置教师密码？
  → 确认后弹窗显示: "新初始密码: xY7@pL2q"
```

---

### 5. 对 Sprint 排期和依赖的影响

#### 任务数量变化
| 模块 | 变更前 | 变更后 | 备注 |
|------|--------|--------|------|
| 后端 API | P0: 5, 合计 8 | P0: 6, 合计 9 | 新增 API-02b (P0) |
| **总任务** | **19 + 12 + 2 = 33** | **20 + 12 + 2 = 34** | 新增 1 个任务 |

#### 依赖关系调整
| 任务 | 原依赖 | 新依赖 | 说明 |
|------|--------|--------|------|
| API-02 | API-01, DB-02 | API-01, DB-02 | 不变（仅移除教师逻辑） |
| **API-02b** | — | **API-01, DB-02** | **新增 P0 任务** |
| FLUTTER-09 | FLUTTER-01, API-02 | FLUTTER-01, **API-02b** | 依赖改为教师密码 API |

#### 执行顺序调整
```
Week 1 原方案:
  Day 1-2:  DB-01 → DB-02 → DB-03 → API-01 → API-02

Week 1 新方案:
  Day 1-2:  DB-01 → DB-02 → DB-03 → API-01 → API-02 → API-02b
  # API-02b 需在 FLUTTER-09 之前完成，可与 API-02 并行开发
```

#### 风险项
- ** teachers 表 password_hash 字段在 DB-02 中就绪前，API-02b 无法完整实现**
- **DB-02 验收必须包含 password_hash 字段检查**

---

### 6. 哪些任务现在不能直接开工，必须先补文档/API

#### 🔴 阻塞项（必须先完成前置）
| 任务 | 前置条件 | 说明 |
|------|----------|------|
| FLUTTER-09 | API-02b 完成 | 教师端登录页依赖教师密码登录 API |
| FLUTTER-10, 11 | API-02b + FLUTTER-09 | 教师端 Tab 页面需先登录成功 |
| TEST-03 | API-02b + FLUTTER-09 | 教师端冒烟测试需密码登录流程 |
| ADMIN-02 | API-04 完成 | 教师管理页依赖带密码功能的教师 CRUD |

#### 🟡 可并行但需对齐文档
| 任务 | 说明 |
|------|------|
| API-02 | 移除教师逻辑后可直接开发（仅家长端验证码） |
| API-02b | 新增任务，需等 DBeER 模型确认 password_hash 字段 |
| API-04 | 教师管理 CRUD 需补充密码重置端点，偏移不大 |
| DB-02 | 需确认 teachers 表新增 3 个字段在 migration 中 |

#### 🟢 不受影响可继续开工
| 任务 | 说明 |
|------|------|
| DB-01, DB-03 | 无影响 |
| API-01, API-03, API-05~07 | 无影响 |
| FLUTTER-01~08 | 学习端不受影响 |
| ADMIN-01, 03~06 | 除教师管理外不受影响 |
| TEST-01, 02 | 无直接影响（TEST-01 只覆盖家长/课程/反馈） |

---

## 修订确认清单

### 已修改的文档位置

| 文档 | 修改点数 | 确认状态 |
|------|----------|----------|
| PRD.md | 2 处（7.2 教师端登录 + 9.8 R1 规则） | ✅ 已应用 |
| IA.md | 2 处（模块树 + T-LOGIN 页面定义） | ✅ 已应用 |
| TECH-SPEC.md | 4 处（短信备注 + teachers 表 + 角色定义 + API 列表） | ✅ 已应用 |
| SPRINT-1-TASKS.md | 4 处（API-02 重写 + API-02b 新增 + API-04 补充 + 任务汇总） | ✅ 已应用 |

### 新增文件
- `docs/patches/part-3-revisions.md` — 包含完整修订片段参考
- `docs/CHANGELOG_teacher_password_login.md` — 本变更说明文件

---

*文档修订完成。所有四份文档已同步更新。*
