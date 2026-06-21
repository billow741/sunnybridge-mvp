-- SunnyBridge MVP — Migration 006
-- payments 表：收款记录
-- children 表新增 totalhours / usedhours 字段（如不存在）

-- 1. children 补充课时字段（若不存在则加）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'totalhours') THEN
    ALTER TABLE children ADD COLUMN totalhours NUMERIC NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'usedhours') THEN
    ALTER TABLE children ADD COLUMN usedhours NUMERIC NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. payments 表
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    method VARCHAR(30) NOT NULL DEFAULT '微信' CHECK (method IN ('微信','支付宝','银行转账','GCash','现金','其他')),
    hours NUMERIC NOT NULL,           -- 购买/充值课时数
    amount NUMERIC NOT NULL DEFAULT 0, -- 金额
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_child ON payments(child_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date DESC);
