-- SunnyBridge MVP — Migration 002
-- Add username fields: users.username (admin partial unique) + teachers.username (NOT NULL UNIQUE)
-- Adjust teachers.phone: remove UNIQUE constraint, keep normal index
-- Corresponds to: SPRINT-1 DB-02 (username revision) + DB-06 (seed data)
--
-- CHANGELOG:
-- 2026-06-09: 认证与用户模型重构 — 引入 username 登录方式
-- → users 新增 username（仅 admin 必填，部分唯一索引 WHERE role='admin'）
-- → users 新增 password_hash（家长可选密码登录）
-- → teachers 新增 username（NOT NULL UNIQUE，登录主键）
-- → teachers.phone 去掉 UNIQUE，改为普通索引（仅作联系字段）

-- ============================================================
-- 1. users 表变更
-- ============================================================

-- 1a. 新增 username 字段（可为 NULL — 仅 admin 必填）
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- 1b. 部分唯一索引：仅 role='admin' 时 username 唯一
-- 使用 IF NOT EXISTS 风格：先删除再创建（Supabase/PG 不支持 IF NOT EXISTS for indexes）
DROP INDEX IF EXISTS idx_users_username_admin;
CREATE UNIQUE INDEX idx_users_username_admin ON users(username) WHERE role = 'admin';

-- 1c. password_hash 已在 001 中存在（仅 admin 使用）
-- 本次新增：家长也可设密码（password_hash 不再仅限 admin）
-- 不需要 ALTER，001 中 password_hash 已是 TEXT 可 NULL

-- ============================================================
-- 2. teachers 表变更
-- ============================================================

-- 2a. 新增 username 字段（先允许 NULL，填充数据后再设 NOT NULL）
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- 2b. 为现有教师填充 username：teacher_后4位手机号
-- 符合 DB-06 规范：teacher 默认 username 格式
UPDATE teachers SET username = 'teacher_' || RIGHT(phone, 4)
WHERE username IS NULL;

-- 2c. 设置 NOT NULL 约束
ALTER TABLE teachers ALTER COLUMN username SET NOT NULL;

-- 2d. 添加 UNIQUE 约束
ALTER TABLE teachers ADD CONSTRAINT teachers_username_unique UNIQUE (username);

-- 2e. 去掉 phone 的 UNIQUE 约束
-- PG 方式：先找到 phone 上的 UNIQUE 约束名，再删除
-- 001 中 CREATE TABLE 用的是内联 UNIQUE (phone)，约束名通常为 teachers_phone_key
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  SELECT con.conname INTO _constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'teachers'
    AND con.contype = 'u'
    AND EXISTS (
      SELECT 1 FROM pg_attribute a
      JOIN pg_attribute a2 ON a2.attrelid = con.conrelid
      WHERE a.attrelid = con.conrelid
        AND a.attnum = ANY(con.conkey)
        AND a.attname = 'phone'
    );
  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE teachers DROP CONSTRAINT %I', _constraint_name);
  END IF;
END;
$$;

-- 2f. 确保普通索引存在（001 中已创建 idx_teachers_phone，确认保留）
CREATE INDEX IF NOT EXISTS idx_teachers_phone ON teachers(phone);
