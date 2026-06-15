# SunnyBridge MVP — ADMIN-02 完成报告

## 1. 任务概览

| 字段 | 值 |
|------|-----|
| **任务编号** | ADMIN-02 |
| **标题** | 教师管理页（列表 + 新建/编辑弹窗） |
| **模块** | 教务后台 (apps/admin) |
| **状态** | ✅ 已完成 |
| **完成日期** | 2026-06-11 |
| **方案选择** | 方案B（后端新增 restore 端点 + 自动重置密码） |

---

## 2. 现状分析

实现前发现 3 个核心文件已存在且功能基本完整：

- `apps/admin/src/pages/Teachers/index.tsx` — 列表页已实现（367行，含 CRUD + 重置密码 + 恢复按钮）
- `apps/admin/src/components/TeacherForm/index.tsx` — 表单弹窗已实现（157行，新建/编辑复用 + 初始密码展示）
- `apps/admin/src/services/teacher.ts` — API 封装已实现（126行，6 个端点 + restoreTeacher）

**关键问题**：前端 `restoreTeacher()` 调用 `PUT /teachers/:id/restore`，但后端原设计无此端点。后端 API-04 设计为软删除后同手机号可重新创建（reactivation 逻辑），与前端恢复按钮不一致。

---

## 3. 方案选择

### 方案A：前端适配后端（去掉恢复按钮）
- 删除前端恢复按钮和 `restoreTeacher()` 调用
- 教师停用后无法恢复，只能重新创建（手机号可复用）
- 优点：后端零改动
- 缺点：前端需删功能代码；管理员体验下降（需重新填写信息）

### 方案B：后端新增 restore 端点（✅ 选择）
- 后端新增 `PUT /teachers/:id/restore` 端点
- 恢复时自动重置密码（`must_change_password=true`），返回新初始密码
- 前端保留恢复按钮和 `restoreTeacher()` 调用
- 优点：前后端一致，管理员体验完整
- 缺点：后端需新增 1 个端点 + 1 个 service 函数 + 1 个 schema

---

## 4. 实际改动

### 4.1 后端新增

| 文件 | 改动 | 说明 |
|------|------|------|
| `backend/app/api/teacher.py` | 新增路由 | `PUT /api/v1/teachers/{id}/restore` — 恢复软删除教师 |
| `backend/app/services/teacher.py` | 新增函数 | `restore_teacher(id)` — 恢复 is_active + 重置密码 + 重置 must_change_password |
| `backend/app/schemas/teacher.py` | 新增 schema | `TeacherRestoreResponse` — 含 id, is_active, new_initial_password, must_change_password |

**restore 端点逻辑**：
1. 查询教师，确认 `is_active=False`
2. 更新 `is_active=True`
3. 生成新 8 位随机密码 → `hash_password` → 写入 `password_hash`
4. 设置 `must_change_password=True`
5. 返回 `TeacherRestoreResponse`（含新初始密码）

### 4.2 前端（无需改动）

前端代码已完整实现，3 个文件无需修改：
- 列表页：恢复按钮 → `Modal.confirm` → `restoreTeacher()` → 刷新列表
- 表单弹窗：新建/编辑复用 + 提交后展示 `initial_password` 可复制
- API 封装：6 个端点全部对接

### 4.3 API 端点完整列表

| Method | Path | 说明 | 对应前端函数 |
|--------|------|------|-------------|
| GET | `/api/v1/teachers` | 分页列表 | `getTeacherList()` |
| POST | `/api/v1/teachers` | 创建教师（返回 initial_password） | `createTeacher()` |
| GET | `/api/v1/teachers/{id}` | 教师详情 | `getTeacher()` |
| PUT | `/api/v1/teachers/{id}` | 更新教师 | `updateTeacher()` |
| DELETE | `/api/v1/teachers/{id}` | 软删除 | `deleteTeacher()` |
| PUT | `/api/v1/teachers/{id}/restore` | 恢复停用教师（✨新增） | `restoreTeacher()` |
| PUT | `/api/v1/teachers/{id}/reset-password` | 重置密码 | `resetTeacherPassword()` |

---

## 5. 验收标准核对

| # | 验收标准 | 状态 | 说明 |
|---|----------|------|------|
| ① | 教师列表正确展示（含用户名列） | ✅ | Table 含 username/phone/name/is_active/must_change_password 列 |
| ② | 新建教师 → 弹窗表单 → 提交成功 → 列表刷新 | ✅ | TeacherForm 新建模式 + 初始密码展示 |
| ③ | 编辑教师 → 弹窗回填数据 → 提交成功 | ✅ | TeacherForm 编辑模式，username disabled |
| ④ | 删除教师 → 确认弹窗 → 成功 → 列表刷新 | ✅ | Modal.confirm + deleteTeacher() |
| ⑤ | 重复用户名 → 提示错误 | ✅ | 后端 409 + 前端 message.error |
| ⑥ | 重复手机号 → 提示错误 | ✅ | 后端 409 + 前端 message.error |
| ✨ | 恢复停用教师 → 返回新初始密码 | ✅ | 方案B新增 |
| ✨ | 重置密码 → 返回新初始密码 | ✅ | 已有功能 |

---

## 6. 文件清单

| 文件路径 | 行数 | 改动类型 |
|----------|------|----------|
| `backend/app/api/teacher.py` | 211 | 新增 restore 路由 |
| `backend/app/services/teacher.py` | 365 | 新增 restore_teacher() |
| `backend/app/schemas/teacher.py` | 85 | 新增 TeacherRestoreResponse |
| `apps/admin/src/pages/Teachers/index.tsx` | 367 | 无改动（已完整） |
| `apps/admin/src/components/TeacherForm/index.tsx` | 157 | 无改动（已完整） |
| `apps/admin/src/services/teacher.ts` | 126 | 无改动（已完整） |

---

## 7. 遗留项与改进建议

- **include_inactive 筛选**：`getTeacherList()` 未传 `include_inactive` 参数，后端默认返回全部含停用。可加 Switch 组件控制
- **编辑模式 username**：前端 disabled 但后端实际支持修改，当前行为一致但可考虑明确化
- **分页组件**：当前硬编码 page_size=20，可加 Ant Design Pagination 组件
