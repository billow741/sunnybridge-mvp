-- SunnyBridge MVP - DB-02 验收测试 SQL
-- 用法：在执行 001_core_tables.sql 之后运行，验证 4 张表是否按规范创建
--
-- 更新记录:
--   2026-06-06: 同步 DB-02 审查修复（password_hash 无 DEFAULT、seed 含密码等）

-- ============================================
-- 测试 1：验收标准 - 4 张表结构正确
-- ============================================

-- 验证表存在
SELECT 'users' AS table_name, COUNT(*) > 0 AS exists
FROM information_schema.tables WHERE table_name = 'users'
UNION ALL
SELECT 'teachers', COUNT(*) > 0
FROM information_schema.tables WHERE table_name = 'teachers'
UNION ALL
SELECT 'children', COUNT(*) > 0
FROM information_schema.tables WHERE table_name = 'children'
UNION ALL
SELECT 'sms_codes', COUNT(*) > 0
FROM information_schema.tables WHERE table_name = 'sms_codes';

-- ============================================
-- 测试 2：teachers 表密码字段验证
-- ============================================

-- 验证 password_hash 字段存在且 NOT NULL，且无 DEFAULT
SELECT column_name, is_nullable, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'teachers'
 AND column_name IN ('password_hash', 'must_change_password', 'password_updated_at');

-- 预期输出：
-- column_name          | is_nullable | column_default | data_type
-- password_hash        | NO          | NULL           | character varying
-- must_change_password | NO          | true           | boolean
-- password_updated_at  | YES         | NULL           | timestamp with time zone

-- ============================================
-- 测试 3：UNIQUE 约束验证
-- ============================================

-- 测试 teachers.phone UNIQUE
-- (插入重复手机号应报错)
INSERT INTO teachers (phone, name, password_hash, must_change_password)
VALUES ('13800138000', '王老师', '$2b$12$fakehashfortest', false);

INSERT INTO teachers (phone, name, password_hash, must_change_password)
VALUES ('13800138000', '李老师', '$2b$12$anotherfakehash', false);
-- ^ 预期报错：duplicate key value violates unique constraint

-- ============================================
-- 测试 4：children.parent_id UNIQUE 约束
-- ============================================

-- 先创建家长
INSERT INTO users (phone, role) VALUES ('13900139000', 'parent');

-- 再创建孩子
INSERT INTO children (name, parent_id)
SELECT '小明', id FROM users WHERE phone = '13900139000';

-- 尝试再插一个孩子（同一家长），应报错
INSERT INTO children (name, parent_id)
SELECT '小红', id FROM users WHERE phone = '13900139000';
-- ^ 预期报错：duplicate key value violates unique constraint "idx_children_parent"

-- ============================================
-- 测试 5：sms_codes 仅家长端使用（文档层面验证）
-- ============================================

-- 验证 sms_codes 无外键关联到 teachers
SELECT
 tc.constraint_name,
 kcu.column_name,
 ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
 ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
 ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'sms_codes'
 AND tc.constraint_type = 'FOREIGN KEY';

-- 预期输出：无行（sms_codes 无外键）

-- ============================================
-- 测试 6：基本 CRUD
-- ============================================

-- 1. 家长注册（验证码登录后创建）
INSERT INTO users (phone, role) VALUES ('13700137000', 'parent');

-- 2. 管理员（预设，含密码）
INSERT INTO users (phone, role, password_hash) VALUES ('admin', 'admin', '$2b$12$fakeadminhash');

-- 3. 教师创建（后台管理，必须含 password_hash）
INSERT INTO teachers (phone, name, password_hash, must_change_password, is_active)
VALUES ('13800138001', '张老师', '$2b$12$fakehash', true, true);

-- 4. 验证码记录
INSERT INTO sms_codes (phone, code, used, expires_at)
VALUES ('13700137000', '123456', false, now() + interval '5 minutes');

-- 5. 查询验证
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'children', COUNT(*) FROM children
UNION ALL
SELECT 'sms_codes', COUNT(*) FROM sms_codes;

-- ============================================
-- 测试 7：password_hash NOT NULL 无 DEFAULT 生效
-- ============================================

-- 尝试不含 password_hash 插入教师，应报错
INSERT INTO teachers (phone, name, must_change_password)
VALUES ('13800138002', '刘老师', true);
-- ^ 预期报错：null value in column "password_hash" violates not-null constraint

-- 尝试显式 NULL，也应报错
INSERT INTO teachers (phone, name, password_hash, must_change_password)
VALUES ('13800138003', '赵老师', NULL, true);
-- ^ 预期报错：null value in column "password_hash" violates not-null constraint

-- ============================================
-- 测试 8：sms_codes 扩展字段验证
-- ============================================

-- 验证 attempt_count 和 locked_until 字段存在
SELECT column_name, is_nullable, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'sms_codes'
 AND column_name IN ('attempt_count', 'locked_until');

-- 预期输出：
-- column_name   | is_nullable | column_default | data_type
-- attempt_count | NO          | 0              | integer
-- locked_until  | YES         | NULL           | timestamp with time zone
