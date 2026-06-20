-- ============================================================
-- SunnyBridge 兼容式整合 — unified-schema-additions.sql
-- 基于 MVP 10 张表主干，仅 ADD COLUMN + 新建 4 张表
--
-- 核心原则：
--   1. 课时余额唯一真相：children.total_hours / children.used_hours
--      remaining = total_hours - used_hours（计算值，不存列）
--   2. packages P0 不落地，仅预留表结构供历史兼容/未来扩展
--   3. courses.hours 记录每次消耗课时，与 children.used_hours 对账
--   4. payments.package_id 可空兼容字段，当前流程不依赖
--   5. 教师迁移不搬明文密码，统一生成临时密码哈希
--   6. 执行顺序：先 CREATE 新表，再 ALTER 旧表加外部键引用
-- ============================================================

-- ============================================================
-- Part A: CREATE TABLE — 先建新表（因 Part B 的 FK 引用这些表）
-- ============================================================

-- ── A1. packages（课时包 — P0 不落地，仅预留表结构）──
-- 必须先建，因为 courses.package_id 和 payments.package_id 引用它
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name VARCHAR(100),
    total INTEGER NOT NULL CHECK (total > 0),
    used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
    remaining INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expire_date DATE,
    notes TEXT,
    hours INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_packages_child ON packages(child_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_expire ON packages(expire_date);


-- ── A2. payments（付款记录）──
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(20)
        CHECK (payment_method IN ('cash','wechat','alipay','bank','gcash','other','gift')),
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,  -- 可空兼容，当前不依赖
    description TEXT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_number VARCHAR(100),
    notes TEXT,
    hours INTEGER DEFAULT 0,  -- 本次付款对应课时数（信息性字段）
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_child ON payments(child_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);


-- ── A3. teacher_payments（教师薪资结算）──
CREATE TABLE IF NOT EXISTS teacher_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,   -- 结算周期起（YYYY-MM-DD）
    period_end DATE NOT NULL,     -- 结算周期止
    total_classes INTEGER NOT NULL DEFAULT 0,
    total_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
    hourly_rate NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    payment_method VARCHAR(20)
        CHECK (payment_method IN ('gcash', 'bank', 'cash', 'other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_period CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_tp_teacher ON teacher_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tp_period ON teacher_payments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_tp_status ON teacher_payments(status);


-- ── A4. settings（系统配置 KV 表）──
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 初始化默认配置
INSERT INTO settings (key, value) VALUES
    ('school_name', '阳光桥在线英语'),
    ('currency', 'CNY'),
    ('timezone', 'Asia/Shanghai')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- Part B: ALTER TABLE — 扩展现有 3 张表（现在可以引用新表了）
-- ============================================================

-- ── B1. children 扩展 +7 字段 ──
ALTER TABLE children ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE children ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE children ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
ALTER TABLE children ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE children ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'graduated'));
ALTER TABLE children ADD COLUMN IF NOT EXISTS total_hours NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (total_hours >= 0);
ALTER TABLE children ADD COLUMN IF NOT EXISTS used_hours NUMERIC(10,2) NOT NULL DEFAULT 0
  CHECK (used_hours >= 0);

-- 课时余额约束：used_hours 不能超过 total_hours（幂等）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_children_hours') THEN
    ALTER TABLE children ADD CONSTRAINT chk_children_hours CHECK (used_hours <= total_hours);
  END IF;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_children_grade ON children(grade);


-- ── B2. teachers 扩展 +4 字段 ──
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subjects TEXT;  -- JSON 数组，如 ["English","Phonics"]
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2)
  CHECK (hourly_rate IS NULL OR hourly_rate >= 0);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS notes TEXT;


-- ── B3. courses 扩展 +3 字段 ──
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject VARCHAR(100);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hours REAL NOT NULL DEFAULT 1
  CHECK (hours > 0);  -- 每次上课消耗课时数，与 children.used_hours 对账
ALTER TABLE courses ADD COLUMN IF NOT EXISTS package_id UUID
  REFERENCES packages(id) ON DELETE SET NULL;  -- packages 表已在 Part A 创建

-- courses.status 扩充 CHECK 支持 'absent'（CRM 有此状态）
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE courses ADD CONSTRAINT courses_status_check
  CHECK (status IN ('pending', 'completed', 'cancelled', 'absent'));


-- ============================================================
-- Part C: mapping_old_to_new（CRM INTEGER id → MVP UUID）
-- ============================================================
CREATE TABLE IF NOT EXISTS mapping_old_to_new (
    table_name VARCHAR(50) NOT NULL,  -- 源表名：students / teachers / classes / packages
    old_id INTEGER NOT NULL,          -- CRM SQLite INTEGER PK
    new_id UUID NOT NULL,             -- MVP PostgreSQL UUID PK
    PRIMARY KEY (table_name, old_id)
);

CREATE INDEX IF NOT EXISTS idx_mapping_table ON mapping_old_to_new(table_name);


-- ============================================================
-- Part D: RLS + Triggers — 新表安全 & 自动化
-- ============================================================

-- ── D1. RLS 启用（幂等：重复执行无副作用）──
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- ── D2. RLS 策略（幂等：先 DROP 再 CREATE）──
DROP POLICY IF EXISTS "No direct payment reads" ON payments;
DROP POLICY IF EXISTS "No direct payment writes" ON payments;
DROP POLICY IF EXISTS "No direct payment updates" ON payments;
CREATE POLICY "No direct payment reads" ON payments FOR SELECT USING (false);
CREATE POLICY "No direct payment writes" ON payments FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct payment updates" ON payments FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No direct tp reads" ON teacher_payments;
DROP POLICY IF EXISTS "No direct tp writes" ON teacher_payments;
DROP POLICY IF EXISTS "No direct tp updates" ON teacher_payments;
CREATE POLICY "No direct tp reads" ON teacher_payments FOR SELECT USING (false);
CREATE POLICY "No direct tp writes" ON teacher_payments FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct tp updates" ON teacher_payments FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No direct settings reads" ON settings;
DROP POLICY IF EXISTS "No direct settings writes" ON settings;
DROP POLICY IF EXISTS "No direct settings updates" ON settings;
CREATE POLICY "No direct settings reads" ON settings FOR SELECT USING (false);
CREATE POLICY "No direct settings writes" ON settings FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct settings updates" ON settings FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No direct package reads" ON packages;
DROP POLICY IF EXISTS "No direct package writes" ON packages;
DROP POLICY IF EXISTS "No direct package updates" ON packages;
CREATE POLICY "No direct package reads" ON packages FOR SELECT USING (false);
CREATE POLICY "No direct package writes" ON packages FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct package updates" ON packages FOR UPDATE USING (false);


-- ── D3. updated_at 触发器 ──
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['payments', 'teacher_payments', 'packages']) LOOP
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


-- ── D4. 课程完成自动扣课时触发器 ──
-- 当 courses.status 变为 'completed' 时，自动累加 children.used_hours
-- 安全机制：仅 status 从非 completed 变为 completed 时触发（防重复累加）
CREATE OR REPLACE FUNCTION deduct_child_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- 仅当 status 从非 completed 变为 completed 时触发
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        UPDATE children
        SET used_hours = used_hours + COALESCE(NEW.hours, 1),
            updated_at = now()
        WHERE id IN (
            SELECT cs.child_id
            FROM course_students cs
            WHERE cs.course_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deduct_hours ON courses;
CREATE TRIGGER trg_deduct_hours
    AFTER UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION deduct_child_hours();
