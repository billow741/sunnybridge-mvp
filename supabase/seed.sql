-- SunnyBridge MVP — Seed Data
-- 测试数据：用于开发和集成测试
-- 对应: SPRINT-1 DB-06
--
-- CHANGELOG:
-- 2026-06-09: 认证重构 — admin 用 username 登录、teacher 用 username 登录
-- → 管理员 INSERT 增加 username 字段
-- → 教师 INSERT 增加 username 字段
-- → phone 不再作为 admin/teacher 登录标识

-- ============================================================
-- 1. 管理员账号 (username: admin, 密码: admin123, bcrypt cost=12)
-- ============================================================
INSERT INTO users (phone, username, role, nickname, password_hash) VALUES
 ('00000000000', 'admin', 'admin', '管理员', '$2b$12$GojUmqSnoOLAVLINqZIra.G15DbFS2Gfy.lipvd1tudPGiatva2VW')
ON CONFLICT (phone) DO NOTHING;

-- ============================================================
-- 2. 测试教师 × 2
-- 密码均为 test1234 (bcrypt cost=12)，首次登录强制修改
-- ============================================================
INSERT INTO teachers (username, phone, name, password_hash, must_change_password, is_active) VALUES
 ('teacher_1001', '13800001001', '王老师', '$2b$12$3VNs6JbSFAaL.3H6qu0NYOaEfY4HoERLUx0.in0C4npnNQ7L.gbyW', true, true),
 ('teacher_1002', '13800001002', '李老师', '$2b$12$3VNs6JbSFAaL.3H6qu0NYOaEfY4HoERLUx0.in0C4npnNQ7L.gbyW', true, true)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 3. 测试家长 × 3（家长无 username，用手机号验证码/密码登录）
-- ============================================================
INSERT INTO users (phone, role, nickname) VALUES
 ('13900002001', 'parent', '张妈妈'),
 ('13900002002', 'parent', '陈爸爸'),
 ('13900002003', 'parent', '刘妈妈')
ON CONFLICT (phone) DO NOTHING;

-- ============================================================
-- 4. 测试学生 × 3（关联家长）
-- ============================================================
INSERT INTO children (name, english_name, level, parent_id) VALUES
 ('张小明', 'Tom', 'A1', (SELECT id FROM users WHERE phone = '13900002001')),
 ('陈小花', 'Lily', 'A2', (SELECT id FROM users WHERE phone = '13900002002')),
 ('刘小天', 'Jack', 'starter', (SELECT id FROM users WHERE phone = '13900002003'))
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. 测试课程 × 5
-- ============================================================
INSERT INTO courses (date, start_time, end_time, teacher_id, meeting_link, status) VALUES
 ('2026-06-02', '10:00', '10:30',
 (SELECT id FROM teachers WHERE username = 'teacher_1001'),
 'https://meeting.tencent.com/dm/r/ABC123', 'pending'),
 ('2026-06-02', '14:00', '14:30',
 (SELECT id FROM teachers WHERE username = 'teacher_1002'),
 'https://meeting.tencent.com/dm/r/DEF456', 'pending'),
 ('2026-06-03', '10:00', '10:30',
 (SELECT id FROM teachers WHERE username = 'teacher_1001'),
 'https://meeting.tencent.com/dm/r/GHI789', 'pending'),
 ('2026-06-03', '15:00', '15:30',
 (SELECT id FROM teachers WHERE username = 'teacher_1002'),
 NULL, 'cancelled'),
 ('2026-06-04', '09:00', '09:30',
 (SELECT id FROM teachers WHERE username = 'teacher_1001'),
 'https://meeting.tencent.com/dm/r/JKL012', 'pending')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. 课程-学生关联
-- ============================================================
-- 课程1: 张小明 + 陈小花 (王老师)
INSERT INTO course_students (course_id, child_id) VALUES
 ((SELECT id FROM courses WHERE date = '2026-06-02' AND start_time = '10:00'),
 (SELECT id FROM children WHERE english_name = 'Tom')),
 ((SELECT id FROM courses WHERE date = '2026-06-02' AND start_time = '10:00'),
 (SELECT id FROM children WHERE english_name = 'Lily'))
ON CONFLICT (course_id, child_id) DO NOTHING;

-- 课程2: 刘小天 (李老师)
INSERT INTO course_students (course_id, child_id) VALUES
 ((SELECT id FROM courses WHERE date = '2026-06-02' AND start_time = '14:00'),
 (SELECT id FROM children WHERE english_name = 'Jack'))
ON CONFLICT (course_id, child_id) DO NOTHING;

-- 课程3: 张小明 (王老师)
INSERT INTO course_students (course_id, child_id) VALUES
 ((SELECT id FROM courses WHERE date = '2026-06-03' AND start_time = '10:00'),
 (SELECT id FROM children WHERE english_name = 'Tom'))
ON CONFLICT (course_id, child_id) DO NOTHING;

-- 课程5: 张小明 + 陈小花 + 刘小天 (王老师)
INSERT INTO course_students (course_id, child_id) VALUES
 ((SELECT id FROM courses WHERE date = '2026-06-04' AND start_time = '09:00'),
 (SELECT id FROM children WHERE english_name = 'Tom')),
 ((SELECT id FROM courses WHERE date = '2026-06-04' AND start_time = '09:00'),
 (SELECT id FROM children WHERE english_name = 'Lily')),
 ((SELECT id FROM courses WHERE date = '2026-06-04' AND start_time = '09:00'),
 (SELECT id FROM children WHERE english_name = 'Jack'))
ON CONFLICT (course_id, child_id) DO NOTHING;

-- ============================================================
-- 7. 测试反馈 × 2
-- 注意: INSERT 后触发器会自动将对应课程 status→completed
-- ============================================================
INSERT INTO feedbacks (course_id, content, homework, notes, created_by) VALUES
 ((SELECT id FROM courses WHERE date = '2026-06-02' AND start_time = '10:00'),
 '本节课学习了字母A-F的发音和书写，同学们表现积极',
 '完成练习册第3-4页，练习字母D-F的书写',
 '张小明注意力集中，陈小花需要多鼓励',
 (SELECT id FROM teachers WHERE username = 'teacher_1001')),
 ((SELECT id FROM courses WHERE date = '2026-06-02' AND start_time = '14:00'),
 '本节课学习了基础问候语：Hello, Good morning, How are you',
 '每天练习问候语10分钟，录音发群',
 '刘小天口语表达有进步',
 (SELECT id FROM teachers WHERE username = 'teacher_1002'))
ON CONFLICT (course_id) DO NOTHING;

-- ============================================================
-- 8. 测试阅读材料 × 3
-- ============================================================
INSERT INTO reading_materials (title, level, category, pdf_url, page_count, sort_order, is_active) VALUES
 ('My First ABC Book', 'starter', 'picture_book', 'reading/starter/abc-book.pdf', 24, 1, true),
 ('Funny Stories Vol.1', 'A1', 'story', 'reading/A1/funny-stories.pdf', 16, 1, true),
 ('Short Texts for Beginners', 'A2', 'short_text', 'reading/A2/short-texts.pdf', 20, 1, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. 测试资源 × 2
-- ============================================================
INSERT INTO resources (title, category, pdf_url, sort_order, is_active) VALUES
 ('Phonics Basics', 'phonics', 'resources/phonics/basics.pdf', 1, true),
 ('Sight Word Cards Set 1', 'word_card', 'resources/word-card/set1.pdf', 1, true)
ON CONFLICT DO NOTHING;
