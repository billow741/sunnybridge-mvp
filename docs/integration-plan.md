# SunnyBridge 兼容式整合方案
## 字段映射表 + P0 实施计划

---

## 一、字段映射表（CRM → MVP）

### 1. students → children

| CRM 字段 | CRM 类型 | MVP 字段 | MVP 类型 | 转换规则 |
|----------|---------|----------|---------|---------|
| id (INT) | INTEGER | id | UUID | gen_random_uuid() + mapping_old_to_new |
| name | TEXT | name | VARCHAR(50) | 直接 |
| phone | TEXT | phone | VARCHAR(20) | **新增列**，直接搬 |
| email | TEXT | email | VARCHAR(255) | **新增列**，直接搬 |
| age | INTEGER | — | — | **废弃**，用 birth_date 推导 |
| grade | TEXT | grade | VARCHAR(20) | **新增列**，直接搬 |
| parent_name | TEXT | → parent_id | UUID | 自动创建默认 parent user |
| notes | TEXT | notes | TEXT | **新增列**，直接搬 |
| hours | INTEGER | — | — | **废弃**，与 total_hours 重复 |
| total_hours | INTEGER | total_hours | NUMERIC(10,2) | **新增列**，直接搬 |
| used_hours | INTEGER | used_hours | NUMERIC(10,2) | **新增列**，直接搬 |
| access_token | TEXT | — | — | **废弃**，JWT 替代 |
| status | TEXT | status | VARCHAR(20) | **新增列**，值域对齐 |
| created_at | TEXT | created_at | TIMESTAMPTZ | ISO8601 字符串 → TIMESTAMPTZ |
| updated_at | TEXT | updated_at | TIMESTAMPTZ | 同上 |
| — | — | english_name | VARCHAR(50) | CRM 无，留空 |
| — | — | birth_date | DATE | CRM 无 age 反推不准确，留空 |
| — | — | level | VARCHAR(10) | CRM 无，默认 'L1' |
| — | — | parent_id | UUID | **MVP 必须**，自动创建关联 |

**关键转换：parent_name → parent_id**
```sql
-- 为每个 CRM student 自动创建默认 parent 用户
INSERT INTO users (id, phone, nickname, role)
VALUES (gen_random_uuid(), COALESCE(:phone, '000-0000000'), :parent_name, 'parent')
RETURNING id AS parent_uuid;
```


### 2. teachers → teachers

| CRM 字段 | CRM 类型 | MVP 字段 | MVP 类型 | 转换规则 |
|----------|---------|----------|---------|---------|
| id (INT) | INTEGER | id | UUID | gen_random_uuid() + mapping |
| name | TEXT | name | VARCHAR(50) | 直接 |
| phone | TEXT | phone | VARCHAR(20) | 直接（MVP NOT NULL，CRM 可空→缺省'000'）|
| email | TEXT | email | VARCHAR(255) | **新增列**，直接搬 |
| subjects | TEXT (JSON) | subjects | TEXT | **新增列**，直接搬 |
| hourly_rate | REAL | hourly_rate | NUMERIC(10,2) | **新增列**，直接搬 |
| status | TEXT | is_active | BOOLEAN | 'active'→true, 'inactive'→false |
| notes | TEXT | notes | TEXT | **新增列**，直接搬 |
| hours | INTEGER | — | — | **废弃**，可从 courses 聚合计算 |
| password | TEXT | — | — | **不搬**，安全风险 |
| share_token | TEXT | — | — | **废弃**，JWT 替代 |
| created_at | TEXT | created_at | TIMESTAMPTZ | 类型转换 |
| updated_at | TEXT | updated_at | TIMESTAMPTZ | 类型转换 |
| — | — | username | VARCHAR(50) | 自动生成：'teacher_' + RIGHT(phone,4) |
| — | — | password_hash | VARCHAR(255) | bcrypt('Temp' + random, gen_salt) |
| — | — | must_change_password | BOOLEAN | 固定 true |
| — | — | avatar_url | TEXT | 留空 |
| — | — | password_updated_at | TIMESTAMPTZ | 留空 |

**关键转换：密码处理**
```sql
-- 统一生成临时密码，不搬 CRM 明文 password
password_hash = crypt('SunnyBridge!' || gen_random_uuid()::text, gen_salt('bf'))
must_change_password = true  -- 首次登录强制改密
```


### 3. classes → courses + course_students + feedbacks

| CRM 字段 | CRM 类型 | MVP 目标 | MVP 字段 | 转换规则 |
|----------|---------|---------|---------|---------|
| id (INT) | INTEGER | courses.id | UUID | gen_random_uuid() + mapping |
| date | TEXT | courses.date | DATE | 直接转换 |
| start_time | TEXT | courses.start_time | TIME | 直接转换 |
| end_time | TEXT | courses.end_time | TIME | 直接转换 |
| teacher_id | INTEGER | courses.teacher_id | UUID | 通过 mapping 映射 |
| subject | TEXT | courses.subject | VARCHAR(100) | **新增列**，直接 |
| hours | REAL | courses.hours | REAL | **新增列**，直接 |
| package_id | INTEGER | courses.package_id | UUID | 通过 mapping 映射（可空）|
| status | TEXT | courses.status | VARCHAR(20) | 值域扩充：+absent |
| — | — | courses.meeting_link | TEXT | CRM 无，留空 |
| student_id | INTEGER | course_students.child_id | UUID | 通过 mapping 映射 |
| content | TEXT | feedbacks.content | TEXT | 仅非空时插入 feedbacks |
| homework | TEXT | feedbacks.homework | TEXT | 仅非空时插入 |
| notes | TEXT | feedbacks.notes | TEXT | 仅非空时插入 |
| — | — | feedbacks.created_by | UUID | = courses.teacher_id |

**拆表规则：一条 CRM class → 最多 3 条 MVP 记录**
```
1 course  +  1 course_student  +  (0 或 1 feedback)
```
- 如果 content/homework/notes 全为空 → 不创建 feedbacks 记录
- feedbacks.content NOT NULL → 无内容时填 '(无记录)'


### 4. payments → payments

| CRM 字段 | CRM 类型 | MVP 字段 | MVP 类型 | 转换规则 |
|----------|---------|----------|---------|---------|
| id (INT) | INTEGER | id | UUID | gen_random_uuid() |
| student_id | INTEGER | child_id | UUID | 通过 mapping 映射 |
| amount | REAL | amount | NUMERIC(10,2) | 类型提升 |
| payment_method | TEXT | payment_method | VARCHAR(20) | 值域新增 gcash |
| package_id | INTEGER | package_id | UUID | 可空兼容，通过 mapping 映射 |
| description | TEXT | description | TEXT | 直接 |
| date | TEXT | payment_date | DATE | 字段改名 |
| receipt_number | TEXT | receipt_number | VARCHAR(100) | 直接 |
| notes | TEXT | notes | TEXT | 直接 |
| hours | INTEGER | hours | INTEGER | 直接 |
| created_at | TEXT | created_at | TIMESTAMPTZ | 类型转换 |


### 5. teacher_payments → teacher_payments

| CRM 字段 | CRM 类型 | MVP 字段 | MVP 类型 | 转换规则 |
|----------|---------|----------|---------|---------|
| id (INT) | INTEGER | id | UUID | gen_random_uuid() |
| teacher_id | INTEGER | teacher_id | UUID | 通过 mapping 映射 |
| period_start | TEXT | period_start | DATE | 类型转换 |
| period_end | TEXT | period_end | DATE | 类型转换 |
| total_classes | INTEGER | total_classes | INTEGER | 直接 |
| total_hours | REAL | total_hours | NUMERIC(10,2) | 类型提升 |
| hourly_rate | REAL | hourly_rate | NUMERIC(10,2) | 类型提升 |
| total_amount | REAL | total_amount | NUMERIC(10,2) | 类型提升 |
| status | TEXT | status | VARCHAR(20) | 直接 |
| paid_at | TEXT | paid_at | TIMESTAMPTZ | 类型转换 |
| notes | TEXT | notes | TEXT | 直接 |
| payment_method | TEXT | payment_method | VARCHAR(20) | 值域适配 |
| created_at | TEXT | created_at | TIMESTAMPTZ | 类型转换 |
| updated_at | TEXT | updated_at | TIMESTAMPTZ | 类型转换 |


### 6. settings → settings

| CRM 字段 | MVP 字段 | 转换规则 |
|----------|---------|---------|
| key | key | 直接 |
| value | value | 直接 |
| updated_at (TEXT) | updated_at (TIMESTAMPTZ) | 类型转换 |


### 7. packages → packages（P0 不参与课时计算，仅历史兼容）

| CRM 字段 | MVP 字段 | 转换规则 |
|----------|---------|---------|
| id (INT) | id (UUID) | gen_random_uuid() + mapping |
| student_id (INT) | child_id (UUID) | 通过 mapping 映射 |
| name | name | 直接 |
| total | total | 直接 |
| used | used | 直接 |
| remaining | remaining | 直接 |
| price | price | REAL → NUMERIC(10,2) |
| purchase_date | purchase_date | TEXT → DATE |
| expire_date | expire_date | TEXT → DATE |
| notes | notes | 直接 |
| hours | hours | 直接 |
| status | status | 直接 |
| created_at | created_at | TEXT → TIMESTAMPTZ |

---

## 二、P0 实施计划

### Week 1：Schema 落库 + Dev 验证

| 日 | 任务 | 产出物 | 验证标准 |
|---|------|--------|---------|
| D1 | 在 Dev Supabase 执行 006_integration_additions.sql | DDL 无报错 | \dt 显示 14+4=所有表 |
| D2 | 验证 ALTER COLUMN 扩展字段 | children+7, teachers+4, courses+3 | \d children 确认新列 |
| D3 | 验证新增表 payments/teacher_payments/settings/packages | 4 表就绪 | \d payments 确认结构 |
| D4 | 验证 RLS + triggers | policy 生效 | 测试 anon key 被拒 |
| D5 | 验证触发器 deduct_child_hours | 课时自动扣减 | UPDATE courses → children.used_hours 变化 |

### Week 2：数据导出 + 迁移测试

| 日 | 任务 | 产出物 | 验证标准 |
|---|------|--------|---------|
| D1 | CRM wrangler d1 export → JSON | 7 张表 JSON 文件 | 文件完整可读 |
| D2 | 编写 Python 转换脚本（JSON→SQL） | convert_crm_to_mvp.py | 脚本可运行 |
| D3 | 生成 SQL 插入脚本 | 007_crm_migration_filled.sql | 语法检查通过 |
| D4 | Dev 环境执行迁移 | 数据导入完成 | 记录数对齐 |
| D5 | 运行 Step 8 校验 SQL | 校验报告 | 0 行不一致 |

### Week 3：API 适配 + 业务校验

| 日 | 任务 | 产出物 | 验证标准 |
|---|------|--------|---------|
| D1 | 后端 API 新增 payments CRUD | /api/payments | POST/GET/PUT/DELETE 可用 |
| D2 | 后端 API 新增 teacher_payments CRUD | /api/teacher-payments | 同上 |
| D3 | 后端 API 新增 settings CRUD | /api/settings | 同上 |
| D4 | Admin 前端收款页面 | 收款列表+添加收款 | UI 可用 |
| D5 | Admin 前端教师薪资页面 | 薪资列表+新建结算 | UI 可用 |

### Week 4：Production 切换 + 收尾

| 日 | 任务 | 产出物 | 验证标准 |
|---|------|--------|---------|
| D1 | Production 执行 006 DDL | Schema 更新 | 同 Dev 验证 |
| D2 | Production 执行 007 迁移 | 数据迁移 | 校验 SQL 全 PASS |
| D3 | API 灰度切换 | 部分流量走新逻辑 | 核心流程畅通 |
| D4 | 全量切换 + 监控 | 线上稳定 | 无报错超过 2 小时 |
| D5 | 文档更新 + mapping_old_to_new 归档 | 迁移完成报告 | 签字确认 |

---

## 三、核心决策记录

| # | 决策 | 原因 |
|---|------|------|
| 1 | 课时余额 = children.total_hours - children.used_hours | 唯一真相来源，不存 remaining 列 |
| 2 | packages P0 不落地参与课时计算 | 简化业务逻辑，仅在 children 层面管理课时 |
| 3 | packages 保留表结构 | 历史数据兼容+未来扩展预留 |
| 4 | courses.package_id 可空 | 当前流程不依赖，仅做关联记录 |
| 5 | 教师不搬明文密码 | 安全要求，统一生成临时密码+强制改密 |
| 6 | classes 拆分 courses+feedbacks | MVP 架构已定，保持 1:1 映射 |
| 7 | courses.status 新增 absent | CRM 有此状态，MVP 原有 3 值不够 |
| 8 | 课时自动扣减用触发器 | courses→completed 时自动更新 children.used_hours |

---

## 四、文件清单

| # | 文件 | 内容 |
|---|------|------|
| 1 | `006_integration_additions.sql` | Schema 扩展 DDL（ALTER + CREATE + RLS + Triggers） |
| 2 | `007_crm_migration.sql` | 数据迁移脚本模板 + 校验 SQL |
| 3 | 本文档 | 字段映射表 + P0 计划 + 决策记录 |
