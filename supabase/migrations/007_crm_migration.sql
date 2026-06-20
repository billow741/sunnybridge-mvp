-- ============================================================
-- SunnyBridge CRM → MVP 数据迁移脚本
-- 数据源：SQLite (Cloudflare D1)  →  目标：PostgreSQL (Supabase)
--
-- 前置条件：
--   1. 已执行 006_integration_additions.sql（Schema 扩展）
--   2. CRM 数据已导出为 JSON（通过 D1 API 或 wrangler d1 export）
--   3. 使用 psql 或 Supabase SQL Editor 执行
--
-- 重要约定：
--   - 课时余额唯一真相：children.total_hours / children.used_hours
--   - remaining = total_hours - used_hours（不存列，API/视图计算）
--   - packages P0 不参与课时计算，仅做历史数据导入
--   - 教师不搬明文密码，统一生成临时密码
-- ============================================================

-- ============================================================
-- Step 0: 准备 — 安装 bcrypt 扩展（Supabase 已内置 pgcrypto）
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- Step 1: 迁移 teachers
-- CRM teachers (INTEGER PK, TEXT dates, 明文 password)
-- → MVP teachers (UUID PK, TIMESTAMPTZ, bcrypt password_hash)
-- ============================================================

-- 1a. 逐条插入（需先导出 CRM teachers 为如下格式）
-- 替换 :values 为实际数据，每行一个教师
INSERT INTO teachers (id, username, phone, name, password_hash, must_change_password,
                      email, subjects, hourly_rate, notes, is_active, created_at, updated_at)
VALUES
  -- 示例行，实际执行时替换为 CRM 导出数据
  -- (gen_random_uuid(), 'teacher_1234', '13800001234', '张老师',
  --  crypt('TempPass!' || gen_random_uuid()::text, gen_salt('bf')), true,
  --  'zhang@example.com', '["English"]', 150.00, NULL, true, now(), now())
;

-- 1b. 记录映射
-- INSERT INTO mapping_old_to_new (table_name, old_id, new_id)
-- VALUES ('teachers', :crm_teacher_id, :mvp_teacher_uuid);


-- ============================================================
-- Step 2: 迁移 students → children
-- CRM students 无 parent_id，需自动创建默认 parent 用户
-- ============================================================

-- 2a. 为每个 CRM student 创建默认 parent 用户
-- INSERT INTO users (id, phone, nickname, role)
-- VALUES
--   (gen_random_uuid(), :student_phone, :parent_name, 'parent')
-- ;

-- 2b. 插入 children 记录
-- INSERT INTO children (id, name, english_name, birth_date, level, parent_id,
--                        phone, email, grade, notes, status, total_hours, used_hours,
--                        created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), :name, NULL, NULL, 'L1', :parent_uuid,
--    :phone, :email, :grade, :notes, :status, :total_hours, :used_hours,
--    :created_at_ts, :updated_at_ts)
-- ;

-- 2c. 记录映射
-- INSERT INTO mapping_old_to_new (table_name, old_id, new_id)
-- VALUES ('students', :crm_student_id, :mvp_child_uuid);


-- ============================================================
-- Step 3: 迁移 classes → courses + course_students + feedbacks
-- CRM classes 拆分为三张表
-- ============================================================

-- 3a. 插入 courses（排课记录）
-- INSERT INTO courses (id, date, start_time, end_time, teacher_id, subject, hours,
--                      package_id, status, meeting_link, created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), :date, :start_time, :end_time, :teacher_uuid,
--    :subject, :hours, :package_uuid_nullable, :status, NULL,
--    :created_at_ts, :updated_at_ts)
-- ;

-- 3b. 插入 course_students（课程-学生关联）
-- INSERT INTO course_students (id, course_id, child_id)
-- VALUES (gen_random_uuid(), :course_uuid, :child_uuid)
-- ;

-- 3c. 插入 feedbacks（课堂反馈 — 仅 content/homework/notes 非空时）
-- INSERT INTO feedbacks (id, course_id, content, homework, notes, created_by,
--                        created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), :course_uuid, COALESCE(:content, '(无记录)'),
--    :homework, :notes, :teacher_uuid,
--    :created_at_ts, :updated_at_ts)
-- ;

-- 3d. 记录映射
-- INSERT INTO mapping_old_to_new (table_name, old_id, new_id)
-- VALUES ('classes', :crm_class_id, :mvp_course_uuid);


-- ============================================================
-- Step 4: 迁移 payments（付款记录）
-- ============================================================

-- INSERT INTO payments (id, child_id, amount, payment_method, package_id,
--                       description, payment_date, receipt_number, notes, hours,
--                       created_at)
-- VALUES
--   (gen_random_uuid(), :child_uuid, :amount, :payment_method, :package_uuid_nullable,
--    :description, :date, :receipt_number, :notes, :hours,
--    :created_at_ts)
-- ;


-- ============================================================
-- Step 5: 迁移 teacher_payments（教师薪资结算）
-- ============================================================

-- INSERT INTO teacher_payments (id, teacher_id, period_start, period_end,
--                               total_classes, total_hours, hourly_rate,
--                               total_amount, status, paid_at, payment_method,
--                               notes, created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), :teacher_uuid, :period_start, :period_end,
--    :total_classes, :total_hours, :hourly_rate,
--    :total_amount, :status, :paid_at_ts, :payment_method,
--    :notes, :created_at_ts, :updated_at_ts)
-- ;


-- ============================================================
-- Step 6: 迁移 settings（系统配置）
-- ============================================================

INSERT INTO settings (key, value) VALUES
    ('school_name', '阳光桥在线英语'),
    ('currency', 'CNY'),
    ('timezone', 'Asia/Shanghai')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();


-- ============================================================
-- Step 7: 迁移 packages（历史数据兼容，P0 不参与课时计算）
-- ============================================================

-- INSERT INTO packages (id, child_id, name, total, used, remaining,
--                       price, purchase_date, expire_date, notes, hours,
--                       status, created_at, updated_at)
-- VALUES
--   (gen_random_uuid(), :child_uuid, :name, :total, :used, :remaining,
--    :price, :purchase_date, :expire_date, :notes, :hours,
--    :status, :created_at_ts, :updated_at_ts)
-- ;


-- ============================================================
-- Step 8: 数据校验 SQL
-- ============================================================

-- 8a. 记录数对齐
SELECT 'teachers' AS tbl,
       (SELECT COUNT(*) FROM teachers) AS mvp_count;
       -- 期望 = CRM teachers 数量

SELECT 'children' AS tbl,
       (SELECT COUNT(*) FROM children) AS mvp_count;
       -- 期望 = CRM students 数量

SELECT 'courses' AS tbl,
       (SELECT COUNT(*) FROM courses) AS mvp_count;
       -- 期望 = CRM classes 数量

SELECT 'payments' AS tbl,
       (SELECT COUNT(*) FROM payments) AS mvp_count;
       -- 期望 = CRM payments 数量

SELECT 'teacher_payments' AS tbl,
       (SELECT COUNT(*) FROM teacher_payments) AS mvp_count;
       -- 期望 = CRM teacher_payments 数量

-- 8b. 课时对账：children.used_hours 应 = SUM(courses.hours) where status='completed'
SELECT c.id, c.name,
       c.used_hours AS recorded_used,
       COALESCE(SUM(co.hours), 0) AS calculated_used
FROM children c
LEFT JOIN course_students cs ON cs.child_id = c.id
LEFT JOIN courses co ON co.id = cs.course_id AND co.status = 'completed'
GROUP BY c.id, c.name, c.used_hours
HAVING c.used_hours != COALESCE(SUM(co.hours), 0);
-- 期望：0 行（全部一致）

-- 8c. 课时余额校验：used_hours <= total_hours
SELECT id, name, total_hours, used_hours
FROM children
WHERE used_hours > total_hours;
-- 期望：0 行

-- 8d. 外键完整性
SELECT 'orphan_payments' AS chk,
       COUNT(*) AS bad_count
FROM payments p
LEFT JOIN children c ON c.id = p.child_id
WHERE c.id IS NULL;
-- 期望：0

SELECT 'orphan_teacher_payments' AS chk,
       COUNT(*) AS bad_count
FROM teacher_payments tp
LEFT JOIN teachers t ON t.id = tp.teacher_id
WHERE t.id IS NULL;
-- 期望：0

-- 8e. 映射完整性
SELECT m.table_name,
       COUNT(*) AS mapping_count
FROM mapping_old_to_new m
GROUP BY m.table_name
ORDER BY m.table_name;
-- 期望：每表行数 = CRM 源表行数

-- ============================================================
-- Step 9: 迁移完成后清理（生产环境执行前请备份！）
-- ============================================================

-- 确认无误后可保留 mapping_old_to_new 用于审计
-- 或如需清理：
-- DROP TABLE IF EXISTS mapping_old_to_new;
