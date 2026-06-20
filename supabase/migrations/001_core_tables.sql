-- SunnyBridge MVP — Migration 001
-- Core tables: users / teachers / children / sms_codes
-- Corresponds to: SPRINT-1 DB-02
--
-- CHANGELOG:
--   2026-06-05: 教师登录从"短信验证码"改为"手机号+密码"
--   → teachers 表新增 password_hash / must_change_password / password_updated_at
-- 2026-06-06: DB-02 审查修复
-- → teachers.password_hash 移除 DEFAULT ''（NOT NULL 无 default，强制显式提供）
-- → sms_codes 新增 attempt_count / locked_until（支撑 5 次失败锁定）
-- → users 新增 password_hash（仅 admin 使用）
-- → children.level 确认为 NOT NULL DEFAULT 'L1'
-- 2026-06-09: 认证重构 — 引入 username 登录
-- → users 新增 username（admin 部分唯一索引 WHERE role='admin'）
-- → users.password_hash 扩展用途：家长也可设密码（密码登录）
-- → teachers 新增 username（NOT NULL UNIQUE，登录主键）
-- → teachers.phone 去掉 UNIQUE，改为普通索引（仅作联系字段）

-- ============================================================
-- 1. users (家长 + 管理员)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 phone VARCHAR(20) NOT NULL UNIQUE,
 username VARCHAR(50), -- admin 登录用户名（仅 role=admin 时必填）
 nickname VARCHAR(50),
 role VARCHAR(20) NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'admin')),
 password_hash TEXT, -- admin 必填、parent 可选（bcrypt）；parent 设密码后可密码登录
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_admin ON users(username) WHERE role = 'admin';

-- ============================================================
-- 2. teachers (教师)
-- 变更说明：登录方式从"手机号+密码"改为"username+密码"
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 username VARCHAR(50) NOT NULL UNIQUE, -- 教师登录用户名
 phone VARCHAR(20), -- 教师联系手机号（可空，CRM历史数据部分缺失）
 name VARCHAR(50) NOT NULL,
 password_hash VARCHAR(255) NOT NULL, -- bcrypt 哈希，无 DEFAULT — 必须显式提供
 must_change_password BOOLEAN NOT NULL DEFAULT true, -- 首次登录强制改密
 password_updated_at TIMESTAMPTZ, -- 密码最后修改时间
 avatar_url TEXT,
 is_active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 说明：password_hash NOT NULL 且无 DEFAULT。
-- 初始密码由后端在 POST /teachers 时生成（8 位随机字符），
-- 并通过 bcrypt 哈希后写入，再向管理员展示明文 initial_password。
-- 绝不允许空字符串作为 password_hash。
-- username NOT NULL UNIQUE，创建时必须指定。
-- phone 保留 NOT NULL 但不再作登录主键，仅作联系字段。

CREATE INDEX IF NOT EXISTS idx_teachers_phone ON teachers(phone);
CREATE INDEX IF NOT EXISTS idx_teachers_active ON teachers(is_active);

-- ============================================================
-- 3. children (孩子/学生)
-- ============================================================
CREATE TABLE IF NOT EXISTS children (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 name VARCHAR(50) NOT NULL,
 english_name VARCHAR(50),
 birth_date DATE,
 level VARCHAR(10) NOT NULL DEFAULT 'L1' CHECK (level IN ('L1','L2','L3','L4','L5','L6')),
 parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 本期: 一个家长对应一个孩子
CREATE UNIQUE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_level ON children(level);

-- ============================================================
-- 4. sms_codes (验证码 — 仅家长端使用)
-- 教师端不使用此表（已改为密码登录）
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_codes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 phone VARCHAR(20) NOT NULL,
 code VARCHAR(6) NOT NULL,
 used BOOLEAN NOT NULL DEFAULT false,
 attempt_count INTEGER NOT NULL DEFAULT 0, -- 验证码错误次数，>=5 时锁定
 locked_until TIMESTAMPTZ, -- 锁定截止时间，配合 attempt_count 使用
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_codes(phone, created_at DESC);
-- 验证码 5 分钟有效，同一手机号 60s 内限发 1 条
-- 5 次验证错误后锁定 30 分钟（由后端 + attempt_count/locked_until 实现）

-- ============================================================
-- 5. updated_at 自动更新触发器（通用）
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为每张表挂触发器
DO $$
DECLARE
 t TEXT;
BEGIN
 FOR t IN SELECT unnest(ARRAY['users', 'teachers', 'children']) LOOP
  EXECUTE format(
   'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
   CREATE TRIGGER trg_%s_updated_at
   BEFORE UPDATE ON %I
   FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
   t, t, t, t
  );
 END LOOP;
END;
$$;
