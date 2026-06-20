-- SunnyBridge MVP — Migration 002
-- Business tables: courses / course_students / feedbacks + trigger
-- Corresponds to: SPRINT-1 DB-03

-- ============================================================
-- 1. courses (课程)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    teacher_id UUID REFERENCES teachers(id), -- 可空：旧CRM课程可能无教师关联
    meeting_link TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_courses_date ON courses(date);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- ============================================================
-- 2. course_students (课程-学生 多对多)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    UNIQUE(course_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_cs_course ON course_students(course_id);
CREATE INDEX IF NOT EXISTS idx_cs_child ON course_students(child_id);

-- ============================================================
-- 3. feedbacks (课堂反馈)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    homework TEXT,
    notes TEXT,
    created_by UUID REFERENCES teachers(id), -- 可空：旧CRM课程可能无教师关联
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. 反馈提交 → 自动标记课程 completed 触发器
-- ============================================================
CREATE OR REPLACE FUNCTION mark_course_completed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE courses SET status = 'completed', updated_at = now()
    WHERE id = NEW.course_id AND status = 'pending';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feedback_insert ON feedbacks;
CREATE TRIGGER trg_feedback_insert
    AFTER INSERT ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION mark_course_completed();

-- ============================================================
-- 5. courses / feedbacks 的 updated_at 触发器
-- ============================================================
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['courses', 'feedbacks']) LOOP
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
