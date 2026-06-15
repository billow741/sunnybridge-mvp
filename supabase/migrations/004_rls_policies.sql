-- SunnyBridge MVP — Enable RLS on all public tables
-- RLS is REQUIRED for security: without it, anyone with the anon key can read/write all data
--
-- Architecture: Backend uses service_role key (BYPASSES RLS) for all data access.
-- Anon key is only used for the Supabase client library connection, and should
-- have NO direct read/write access to any table except sms_codes INSERT
-- (which is handled by backend via service_role anyway).
--
-- All policies default to USING(false) / WITH_CHECK(false) for anon key.
-- This ensures zero data exposure even if anon key is leaked.

-- Enable RLS on every table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- ========================================
-- users: No direct access for anon key
-- Backend (service_role) handles all user CRUD
-- ========================================
CREATE POLICY "No direct user reads" ON users
 FOR SELECT USING (false);
CREATE POLICY "No direct user inserts" ON users
 FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct user updates" ON users
 FOR UPDATE USING (false);

-- ========================================
-- teachers: No direct access for anon key
-- ========================================
CREATE POLICY "No direct teacher reads" ON teachers
 FOR SELECT USING (false);
CREATE POLICY "No direct teacher writes" ON teachers
 FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct teacher updates" ON teachers
 FOR UPDATE USING (false);

-- ========================================
-- children: No direct access for anon key
-- ========================================
CREATE POLICY "No direct child reads" ON children
 FOR SELECT USING (false);
CREATE POLICY "No direct child writes" ON children
 FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct child updates" ON children
 FOR UPDATE USING (false);

-- ========================================
-- sms_codes: NO public access — only backend (service_role) should touch this
-- ========================================
CREATE POLICY "No public sms reads" ON sms_codes
 FOR SELECT USING (false);
CREATE POLICY "No public sms writes" ON sms_codes
 FOR INSERT WITH CHECK (false);

-- ========================================
-- courses: No direct access for anon key
-- ========================================
CREATE POLICY "No direct course reads" ON courses
 FOR SELECT USING (false);
CREATE POLICY "No direct course writes" ON courses
 FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct course updates" ON courses
 FOR UPDATE USING (false);

-- ========================================
-- course_students: No direct access for anon key
-- ========================================
CREATE POLICY "No direct course student reads" ON course_students
 FOR SELECT USING (false);
CREATE POLICY "No direct course student writes" ON course_students
 FOR INSERT WITH CHECK (false);

-- ========================================
-- feedbacks: No direct access for anon key
-- ========================================
CREATE POLICY "No direct feedback reads" ON feedbacks
 FOR SELECT USING (false);
CREATE POLICY "No direct feedback writes" ON feedbacks
 FOR INSERT WITH CHECK (false);

-- ========================================
-- reading_materials: No direct access for anon key
-- ========================================
CREATE POLICY "No direct material reads" ON reading_materials
 FOR SELECT USING (false);
CREATE POLICY "No direct material writes" ON reading_materials
 FOR INSERT WITH CHECK (false);

-- ========================================
-- reading_progress: No direct access for anon key
-- ========================================
CREATE POLICY "No direct progress reads" ON reading_progress
 FOR SELECT USING (false);
CREATE POLICY "No direct progress writes" ON reading_progress
 FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct progress updates" ON reading_progress
 FOR UPDATE USING (false);

-- ========================================
-- resources: No direct access for anon key
-- ========================================
CREATE POLICY "No direct resource reads" ON resources
 FOR SELECT USING (false);
CREATE POLICY "No direct resource writes" ON resources
 FOR INSERT WITH CHECK (false);
