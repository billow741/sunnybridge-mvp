-- 007: users 表添加 is_active 字段（软禁用）
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 确保现有 admin 账号全部为 active
UPDATE users SET is_active = true WHERE role = 'admin' AND is_active IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_admin ON users(is_active) WHERE role = 'admin';
