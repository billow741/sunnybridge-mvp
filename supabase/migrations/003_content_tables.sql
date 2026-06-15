-- SunnyBridge MVP — Migration 003
-- Content tables: reading_materials / reading_progress / resources
-- Corresponds to: SPRINT-1 DB-04

-- ============================================================
-- 1. reading_materials (阅读馆材料)
-- ============================================================
CREATE TABLE IF NOT EXISTS reading_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    level VARCHAR(10) NOT NULL CHECK (level IN ('L1','L2','L3','L4','L5','L6')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('picture_book','short_text','story','read_aloud')),
    cover_url TEXT,
    pdf_url TEXT NOT NULL,
    page_count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rm_level ON reading_materials(level);
CREATE INDEX IF NOT EXISTS idx_rm_category ON reading_materials(category);

-- ============================================================
-- 2. reading_progress (阅读进度)
-- ============================================================
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES reading_materials(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(child_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_rp_child ON reading_progress(child_id);

-- ============================================================
-- 3. resources (资源库)
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('phonics','word_card','recommended')),
    pdf_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_res_category ON resources(category);

-- ============================================================
-- 4. updated_at triggers
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['reading_materials', 'reading_progress', 'resources']) LOOP
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
