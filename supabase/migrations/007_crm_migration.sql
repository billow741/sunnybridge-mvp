-- ============================================================
-- SunnyBridge CRM → MVP 迁移脚本（真实备份数据 v3）
-- 修复: teacher name 大小写不敏感匹配
-- students:11 teachers:4 classes:143 payments:21 teacher_payments:8
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
DROP TABLE IF EXISTS tmp_id_map;
CREATE TEMP TABLE tmp_id_map (tbl text, old_id integer, new_id uuid);

-- Step 1: teachers (4 条)
DO $$ DECLARE
  v_t5 uuid;
  v_t4 uuid;
  v_t2 uuid;
  v_t1 uuid;
BEGIN
  INSERT INTO teachers (username,phone,name,password_hash,must_change_password,email,subjects,hourly_rate,notes,is_active,created_at,updated_at)
  VALUES ('teacher_5',NULL,'AMC',crypt('SB2026!'||gen_random_uuid()::text,gen_salt('bf')),true,
    NULL,'["English"]'::jsonb,150,NULL,true,'2026-05-10 12:00:43+08'::timestamptz,'2026-05-10 12:00:43+08'::timestamptz) RETURNING id INTO v_t5;
  INSERT INTO tmp_id_map VALUES('teachers',5,v_t5);
  INSERT INTO teachers (username,phone,name,password_hash,must_change_password,email,subjects,hourly_rate,notes,is_active,created_at,updated_at)
  VALUES ('teacher_4',NULL,'Aliana',crypt('SB2026!'||gen_random_uuid()::text,gen_salt('bf')),true,
    NULL,'["英语"]'::jsonb,100,NULL,true,'2026-04-13 11:56:49+08'::timestamptz,'2026-04-13 11:56:49+08'::timestamptz) RETURNING id INTO v_t4;
  INSERT INTO tmp_id_map VALUES('teachers',4,v_t4);
  INSERT INTO teachers (username,phone,name,password_hash,must_change_password,email,subjects,hourly_rate,notes,is_active,created_at,updated_at)
  VALUES ('teacher_2',NULL,'Jennifer',crypt('SB2026!'||gen_random_uuid()::text,gen_salt('bf')),true,
    NULL,'["English"]'::jsonb,150,NULL,true,'2026-04-08 03:40:55+08'::timestamptz,'2026-04-08 03:40:55+08'::timestamptz) RETURNING id INTO v_t2;
  INSERT INTO tmp_id_map VALUES('teachers',2,v_t2);
  INSERT INTO teachers (username,phone,name,password_hash,must_change_password,email,subjects,hourly_rate,notes,is_active,created_at,updated_at)
  VALUES ('teacher_1',NULL,'Elaine',crypt('SB2026!'||gen_random_uuid()::text,gen_salt('bf')),true,
    NULL,'[]'::jsonb,100,NULL,true,'2026-04-04 03:01:32+08'::timestamptz,'2026-04-04 03:01:32+08'::timestamptz) RETURNING id INTO v_t1;
  INSERT INTO tmp_id_map VALUES('teachers',1,v_t1);
RAISE NOTICE 'teachers=%',(SELECT COUNT(*) FROM tmp_id_map WHERE tbl='teachers'); END $$;

-- Step 2: students (11 条)
DO $$ DECLARE
  v_p16 uuid; v_c16 uuid;
  v_p15 uuid; v_c15 uuid;
  v_p14 uuid; v_c14 uuid;
  v_p13 uuid; v_c13 uuid;
  v_p12 uuid; v_c12 uuid;
  v_p9 uuid; v_c9 uuid;
  v_p6 uuid; v_c6 uuid;
  v_p5 uuid; v_c5 uuid;
  v_p3 uuid; v_c3 uuid;
  v_p2 uuid; v_c2 uuid;
  v_p1 uuid; v_c1 uuid;
BEGIN
  INSERT INTO users(phone,nickname,role) VALUES('9999999016','阳阳Cathy家长','parent') RETURNING id INTO v_p16;
  INSERT INTO tmp_id_map VALUES('parents',16,v_p16);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('阳阳Cathy','Cathy','L3',v_p16,NULL,NULL,'G3',NULL,'active',1,1,'2026-06-01 05:48:38+08'::timestamptz,'2026-06-06T06:41:58.630Z+00'::timestamptz) RETURNING id INTO v_c16;
  INSERT INTO tmp_id_map VALUES('students',16,v_c16);
  INSERT INTO users(phone,nickname,role) VALUES('9999999015','糖果Chloe家长','parent') RETURNING id INTO v_p15;
  INSERT INTO tmp_id_map VALUES('parents',15,v_p15);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('糖果Chloe','Chloe','L4',v_p15,NULL,NULL,'G4',NULL,'active',11,6,'2026-05-21 02:50:41+08'::timestamptz,'2026-06-12T15:20:08.217Z+00'::timestamptz) RETURNING id INTO v_c15;
  INSERT INTO tmp_id_map VALUES('students',15,v_c15);
  INSERT INTO users(phone,nickname,role) VALUES('9999999014','月月Mia家长','parent') RETURNING id INTO v_p14;
  INSERT INTO tmp_id_map VALUES('parents',14,v_p14);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('月月Mia','Mia','L1',v_p14,NULL,NULL,'kinder2',NULL,'active',21,10,'2026-05-10 14:21:46+08'::timestamptz,'2026-06-11T13:29:46.986Z+00'::timestamptz) RETURNING id INTO v_c14;
  INSERT INTO tmp_id_map VALUES('students',14,v_c14);
  INSERT INTO users(phone,nickname,role) VALUES('9999999013','陆艺云 Aria家长','parent') RETURNING id INTO v_p13;
  INSERT INTO tmp_id_map VALUES('parents',13,v_p13);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('陆艺云 Aria','Aria','L1',v_p13,NULL,NULL,'Grade2','周1，3，5','active',36,23,'2026-04-21 10:33:59+08'::timestamptz,'2026-06-12T12:16:36.651Z+00'::timestamptz) RETURNING id INTO v_c13;
  INSERT INTO tmp_id_map VALUES('students',13,v_c13);
  INSERT INTO users(phone,nickname,role) VALUES('9999999012','test家长','parent') RETURNING id INTO v_p12;
  INSERT INTO tmp_id_map VALUES('parents',12,v_p12);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('test','test','L1',v_p12,NULL,NULL,NULL,NULL,'active',65,0,'2026-04-19 14:01:40+08'::timestamptz,'2026-06-06T08:44:19.793Z+00'::timestamptz) RETURNING id INTO v_c12;
  INSERT INTO tmp_id_map VALUES('students',12,v_c12);
  INSERT INTO users(phone,nickname,role) VALUES('9999999009','高诚垲Sky家长','parent') RETURNING id INTO v_p9;
  INSERT INTO tmp_id_map VALUES('parents',9,v_p9);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('高诚垲Sky','Sky','L2',v_p9,NULL,NULL,'G2',NULL,'graduated',1,1,'2026-04-13 11:58:59+08'::timestamptz,'2026-04-13T13:18:28.947Z+00'::timestamptz) RETURNING id INTO v_c9;
  INSERT INTO tmp_id_map VALUES('students',9,v_c9);
  INSERT INTO users(phone,nickname,role) VALUES('9999999006','侯均喆william家长','parent') RETURNING id INTO v_p6;
  INSERT INTO tmp_id_map VALUES('parents',6,v_p6);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('侯均喆william','william','L1',v_p6,NULL,NULL,'grade3','周5，7','active',21,15,'2026-04-08 13:36:05+08'::timestamptz,'2026-06-12T13:11:40.624Z+00'::timestamptz) RETURNING id INTO v_c6;
  INSERT INTO tmp_id_map VALUES('students',6,v_c6);
  INSERT INTO users(phone,nickname,role) VALUES('9999999005','睿睿henry家长','parent') RETURNING id INTO v_p5;
  INSERT INTO tmp_id_map VALUES('parents',5,v_p5);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('睿睿henry','henry','L1',v_p5,NULL,NULL,'Kinder1','周1，4','active',30,21,'2026-04-08 13:21:40+08'::timestamptz,'2026-06-11T11:09:37.924Z+00'::timestamptz) RETURNING id INTO v_c5;
  INSERT INTO tmp_id_map VALUES('students',5,v_c5);
  INSERT INTO users(phone,nickname,role) VALUES('9999999003','赵欣怡cindy家长','parent') RETURNING id INTO v_p3;
  INSERT INTO tmp_id_map VALUES('parents',3,v_p3);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('赵欣怡cindy','cindy','L3',v_p3,NULL,NULL,'三年级','周1，4','active',31,24,'2026-04-04 02:26:50+08'::timestamptz,'2026-06-12T15:32:53.639Z+00'::timestamptz) RETURNING id INTO v_c3;
  INSERT INTO tmp_id_map VALUES('students',3,v_c3);
  INSERT INTO users(phone,nickname,role) VALUES('9999999002','皮皮lean家长','parent') RETURNING id INTO v_p2;
  INSERT INTO tmp_id_map VALUES('parents',2,v_p2);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('皮皮lean','lean','L1',v_p2,NULL,NULL,'二年级','不是13课时，应该是12课时
周2，4','active',22,14,'2026-04-04 02:26:03+08'::timestamptz,'2026-05-28T12:26:09.112Z+00'::timestamptz) RETURNING id INTO v_c2;
  INSERT INTO tmp_id_map VALUES('students',2,v_c2);
  INSERT INTO users(phone,nickname,role) VALUES('9999999001','茉莉jasmine家长','parent') RETURNING id INTO v_p1;
  INSERT INTO tmp_id_map VALUES('parents',1,v_p1);
  INSERT INTO children(name,english_name,level,parent_id,phone,email,grade,notes,status,total_hours,used_hours,created_at,updated_at)
  VALUES('茉莉jasmine','jasmine','L3',v_p1,NULL,NULL,'三年级','周3，7','active',31,23,'2026-04-04 02:25:43+08'::timestamptz,'2026-06-07T13:25:48.777Z+00'::timestamptz) RETURNING id INTO v_c1;
  INSERT INTO tmp_id_map VALUES('students',1,v_c1);
RAISE NOTICE 'parents=% students=%',(SELECT COUNT(*) FROM tmp_id_map WHERE tbl='parents'),(SELECT COUNT(*) FROM tmp_id_map WHERE tbl='students'); END $$;

-- Step 3: classes → courses (143 条)
-- 先临时关闭 RLS 以确保 INSERT 不被策略阻挡
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks DISABLE ROW LEVEL SECURITY;

DO $$ DECLARE v_co uuid; v_tu uuid; v_cu uuid; v_cnt int:=0; v_skip int:=0; v_fb int:=0; BEGIN
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-21','19:00','20:00',v_tu,'英语',1,NULL,'pending',NULL,'2026-06-13 13:40:13+08'::timestamptz,'2026-06-13 13:40:13+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',232,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-21','19:00','20:00',v_tu,'英语',1,NULL,'pending',NULL,'2026-06-13 13:40:02+08'::timestamptz,'2026-06-13 13:40:02+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',231,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-21','18:00','19:00',v_tu,'英语',1,NULL,'pending',NULL,'2026-06-13 13:39:50+08'::timestamptz,'2026-06-13 13:39:50+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',230,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-21','13:30','14:30',v_tu,'英语',1,NULL,'pending',NULL,'2026-06-13 13:39:39+08'::timestamptz,'2026-06-14T10:36:02.030Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',229,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-19','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/06/19 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/zQOh5Ivo98pj

#TencentMeeting：440-058-193','2026-06-13 13:39:02+08'::timestamptz,'2026-06-19T13:10:24.279Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',227,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Page 20','x: My mom fight me
/: My mom got mad at me.
x: I ate a milk and ate an eggs this morning.
/: I drank a glass of milk and ate some fried eggs this morning
x: I can see milkshare glass.
/:  I can see a glass of milkshake.
','William performed well in class and showed great effort throughout the lesson. He demonstrated strong listening and reading skills and can now answer simple questions with growing confidence. His eagerness to participate and do his best is commendable. To continue improving, he should focus on strengthening his speaking and comprehension skills so he can express his ideas more clearly and confidently. Keep up the good work, William!',v_tu,'2026-06-13 13:39:02+08'::timestamptz,'2026-06-19T13:10:24.279Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-18','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/06/18 19:00-20:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/UsEAIkPNxIrx

#TencentMeeting：386-075-581','2026-06-13 13:38:10+08'::timestamptz,'2026-06-18T13:02:31.530Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',224,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'phonics
page 29','Interesting
Insect
ink
Iguana
Igloo
','Hello, Mia. Thank you for your active participation in class today. You did a great job engaging in the lesson and completing the activities. I noticed that you are becoming more confident in using English and can express your ideas using simple sentences. You also follow instructions well and quickly understand new concepts, which shows that you are a fast learner. Keep practicing and maintaining your positive attitude toward learning. Keep up the great work!',v_tu,'2026-06-13 13:38:10+08'::timestamptz,'2026-06-18T13:02:31.530Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-18','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/06/18 18:00-18:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/IZfRt0t92Mom

#TencentMeeting：980-029-586','2026-06-13 13:37:34+08'::timestamptz,'2026-06-18T11:03:26.556Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',223,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Phonics
Page 64','Nest
Ox
Quilt
Question
Octopus
Nut','Henry has shown steady progress in English. He can now identify pictures more accurately, answer class activities with better understanding, and express himself more confidently. His speaking skills have improved, and he continues to participate actively and show a strong willingness to learn.',v_tu,'2026-06-13 13:37:34+08'::timestamptz,'2026-06-18T11:03:26.556Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-16','18:30','19:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/16 18:30-19:30 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/wkS9GUYKeWNX

#TencentMeeting：578-041-669','2026-06-13 13:36:33+08'::timestamptz,'2026-06-16T11:37:30.695Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',220,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Reading Comprehension, Dinosaurs, The Arts 

Vocabulary: backpack, camera, clothes, haircut, bought, french fries, sing songs, make movies, write stories, design clothes, paint pictures, make models, feather, tail, claw, wing

Mispronounced words:
millions, centimeters, french fries
','Kindly practice the mispronounced words at home. ','Great work, Chloe! You’re fast at learning and speaking English—keep practicing for fun! 🎉💐',v_tu,'2026-06-13 13:36:33+08'::timestamptz,'2026-06-16T11:37:30.695Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-15','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/15 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/fFLFy565gKMm

#TencentMeeting：476-067-024','2026-06-13 13:36:09+08'::timestamptz,'2026-06-15T12:31:48.975Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',218,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Short Vowels: en (hen, pen), ed (red, bed).   -Everbodyup2e Unit 8 Lesson 1: My body: (Eyes, Ears, Mouth, Nose)','- Review all short vowels (Reading and spelling)',NULL,v_tu,'2026-06-13 13:36:09+08'::timestamptz,'2026-06-15T12:31:48.975Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-15','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/15 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/SCvQKPcDkQWp

#TencentMeeting：390-017-233','2026-06-13 13:35:53+08'::timestamptz,'2026-06-16T00:54:28.140Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',217,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Reading comprehension

Vocabulary words: giraffe, neck, zoo, zucchini, zip, zigzag, zero, zoom

Listening skill activity. Connecting the object to the person based on the given audio.','Kindly use the vocabulary words given into sentences.','Wow, Cindy! You’re learning super fast! Let’s try some new words next time! Keep listening carefully and trying longer sentences in English.🌈',v_tu,'2026-06-13 13:35:53+08'::timestamptz,'2026-06-16T00:54:28.140Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-15','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/06/15 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/7I2mYkoGZax4

#TencentMeeting：337-062-722','2026-06-13 13:35:40+08'::timestamptz,'2026-06-15T11:10:09.002Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',216,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford_Phonics
Page 62','Words:
money
olive
mouse
Quiet
Orange
Racing
Pink','Good evening, Henry participated very well in today’s class and remained actively engaged throughout the lesson. He was able to name several pictures correctly, demonstrating a good understanding of the vocabulary discussed. He also answered the class activities comprehensively and showed great effort in completing each task. Most importantly, Henry has shown noticeable improvement in his speaking skills, which reflects his dedication and willingness to learn English. Keep up the excellent work, Henry!',v_tu,'2026-06-13 13:35:40+08'::timestamptz,'2026-06-15T11:10:09.002Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-14','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/06/14 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/HX9DnkFLDhkb

#TencentMeeting：605-034-697','2026-06-11 14:14:38+08'::timestamptz,'2026-06-14T11:05:24.072Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',215,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford_Phonics 1
Page 26','scissors
marker
girl
gorilla
gift
goat

x: Black Marker
/: It''s a black marker.
','Good evening, Mia. Thank you for coming to class tonight. You were able to participate well in class and stayed engaged throughout the lesson. It is great to see that you are becoming more confident in expressing your thoughts and ideas during our discussions. Your improvement and willingness to communicate in English are commendable. You are doing well in class, and your hard work is paying off. Keep up the great work!',v_tu,'2026-06-11 14:14:38+08'::timestamptz,'2026-06-14T11:05:24.072Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-14','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/06/14 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/DF9fa8UeGhwD

#TencentMeeting：200-083-996','2026-06-06 07:32:18+08'::timestamptz,'2026-06-14T12:11:24.542Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',208,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter M
new words: monkey, moon, mouse, milk.
Additional words: Juice, lamp, look, hat, kid, egg, bag, apple, food, good.
Sentences: I have a dog. I have a toy lion. I have a toy mouse. I have a toy monkey. Look! They are on the moon

oxford page 42-43
goat(goats)  duck(ducks) cow(cows) horse(horses)
How mang goats?(8 goats.)
How many dogs?(2 dogs.)
How many cows?(3 cow.)
How many horses?( 4 horses.)

','please reviw all the words and sentences.','Lean, you did a great job. Please try to say what you want to say and don''t be shy.',v_tu,'2026-06-06 07:32:18+08'::timestamptz,'2026-06-14T12:11:24.542Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-14','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/14 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/MV5vnRW7meVv

#TencentMeeting：834-039-166','2026-06-06 07:32:05+08'::timestamptz,'2026-06-14T12:13:22.065Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',207,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Vowels are speech sounds pronounced with an open vocal tract, allowing air to flow freely without friction or blockage by the tongue, teeth, or lips. In the English alphabet, the designated vowel letters are A, E, I, O, U

Vocabulary words (practice to pronounce): bin, fin, web, zip, jungle, ocean, farm, colorful, penguin, seal, mermaid, roar','Practice your short vowel sounds.','Terrific performance from Jasmine! Her performance these past few classes has been adequate. To improve her English speaking skills, I would recommend practicing her vowel sounds at home. I am so happy that Jasmine’s listening skills have improved. She now needs far fewer visual clues (such as gestures) to understand class instructions. Good work! Keep it up!',v_tu,'2026-06-06 07:32:05+08'::timestamptz,'2026-06-14T12:13:22.065Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-14','14:00','15:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/06/14 14:30-15:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/XcP9d7IW5YGs

#TencentMeeting：894-006-662','2026-06-06 07:31:38+08'::timestamptz,'2026-06-14T07:41:42.371Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',205,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 3
Page 19','Sentences:
x: Anastasia
/: The girl''s name was Anastasia.

x: I ate a bread.
/: I ate bread this morning.

x:  I''m go to my tennis class.
/: I go to my tennis class at 8:00 O''clock.','Good afternoon, William. You did a wonderful job in class today. I noticed that you were able to compose more sentences than usual, which shows great progress in your English skills. I encourage you to express your ideas more confidently and try to avoid saying "I don''t know" right away. Remember, making an effort to share your thoughts is an important part of learning. There is always room for improvement, and I believe that with continued practice, you will become even more confident in communicating your ideas. Keep up the good work!',v_tu,'2026-06-06 07:31:38+08'::timestamptz,'2026-06-14T07:41:42.371Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-12','19:30','20:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/12 19:30-20:30 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/xVKFWMnLSA0k

#TencentMeeting：460-018-726','2026-06-06 07:31:14+08'::timestamptz,'2026-06-12T15:32:52.951Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',204,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'We focused heavily on reading and pronunciation of new words. Example: English Sight Words 

Parts of the face:
eyes, ears, nose, mouth

Vocabulary: 
ocean, jungle, lion, chick, cat, penguin, farm, cow, fresh milk, snake, shoulder, saxophone, tiger, train, truck, tutu','Use the expression "I can" in your sentences. ','Such a pleasure being Cindy''s teacher in her English Learning journey. While Cindy has demonstrated understanding through other domains, she still struggles to speak comfortably in class. She is currently reading and comprehending texts at a starter grade level. Kindly read more books and practice formulating simple sentences in English at home. Please speak up more and try to use full sentences instead of single word answers. Keep practicing, you are doing great! 🌸
',v_tu,'2026-06-06 07:31:14+08'::timestamptz,'2026-06-12T15:32:52.951Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-12','18:30','19:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/12 18:30-19:30 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/p1Dp6L1ZnmNz

#TencentMeeting：603-030-039','2026-06-06 07:30:59+08'::timestamptz,'2026-06-12T15:20:07.587Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',203,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'"Irregular past tense verbs" are action words that do not follow the standard English rule of adding "-d" or "-ed" to form the past tense (e.g., walk becomes walked). Instead, they have unique past-tense spellings or do not change at all.

Eat-ate
Go-went
Buy-bought
Drink-drank


Reading an article:
About the band

Vocabulary words: concert, necklaces, earrings, sunglasses, weekend, South Africa, practiced, noodles, curry, sushi, noodles, grape juice, tea, lemonade, jungle, ocean, roar','Use the new vocabulary words in sentences. Try to listen to English songs and read more English books to enhance your vocabulary skill.','Fantastic job, Chloe! You are indeed on your way to excellence. Please don''t hesitate to ask questions whenever you are confused with the pronunciation and the meaning of the words in the book. I can see that you understand the concept but sometimes forget the past tense of the irregular verbs. Please review the examples I gave you earlier in class to reinforce this. Continuous practice will help improve your natural flow! 🤗',v_tu,'2026-06-06 07:30:59+08'::timestamptz,'2026-06-12T15:20:07.587Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-12','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/06/12 20:00-20:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/qX7NTl0Iallp

#TencentMeeting：554-085-264','2026-06-06 07:30:34+08'::timestamptz,'2026-06-12T13:11:40.298Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',202,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 3
Page 15','glass
wrote- write
saw- see
yoghurt
noodles
tea
grew-up
taught- teach
gave- give
imagine

x: It isn''t taste.
/: It doesn''t tastes good.

x: Yesterday morning.
/: I drank milk yesterday morning.
','Hello, William. You participated well in the activities and showed a positive attitude toward learning English throughout the class. Your effort, enthusiasm, and willingness to learn are truly appreciated. With continued practice and confidence, I am sure you will further improve your communication and comprehension skills. Keep up the good work! 🌟',v_tu,'2026-06-06 07:30:34+08'::timestamptz,'2026-06-12T13:11:40.298Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-12','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/12 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/mqhyGRkULgZg

#TencentMeeting：617-032-284','2026-06-06 07:30:19+08'::timestamptz,'2026-06-12T12:16:36.503Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',201,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Short Vowels: e (Egg, wEb, vEt, tEn), et (jet, net, wet, pet).       -Everbodyup2e Unit 7 Lesson 3: Story (Lets dance) ','-Practice reading short vowel words that are like in todays lesson.  -Review previous lesson (Unit 7 lesson 1 and 2)',NULL,v_tu,'2026-06-06 07:30:19+08'::timestamptz,'2026-06-12T12:16:36.503Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-11','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/06/11 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/3VfrBrEOYxNc

#TencentMeeting：626-004-006','2026-06-06 07:29:51+08'::timestamptz,'2026-06-11T13:19:34.704Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',200,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford_phonics
Page 25','Words:
Rainbow
Cloud
Energetic
Envelope
Alligator


Sentences:
x: Rainbow
/: It''s a rainbow.

x:Ice cream good.
/: The Ice cream tastes good.

x: sticker
/:It''s a sticker.

x: It''s a ant.
/: It''s an ant.

x: It''s a axe.
/: It''s an axe.

x: It''s a egg.
./: It''s an egg.
','Hello, Mia. It was a pleasure having you in class today. You showed commendable performance and actively participated throughout the lesson. You can now formulate simple sentences and follow directions easily, which reflects your progress in English. You are also a fast learner who quickly understands and applies new concepts. Keep up the great work! 🌟',v_tu,'2026-06-06 07:29:51+08'::timestamptz,'2026-06-11T13:19:34.704Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-11','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/06/11 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/s2miNeUWC42k

#TencentMeeting：415-025-605','2026-06-06 07:29:34+08'::timestamptz,'2026-06-11T11:09:37.357Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',199,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford_phonics 1
page 59','Words:
Bowl
rose
small

Sentences
It''s a blue pen.
It''s a pink jacket.
That is a small panda.
I like my rose.

','Hello Henry, Your active participation and willingness to learn made the class enjoyable and productive. It is great to see the progress you are making in following instructions and working more independently. Continue practicing your English skills, and I am confident that you will keep improving. Keep up the good work!',v_tu,'2026-06-06 07:29:34+08'::timestamptz,'2026-06-11T11:09:37.357Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-10','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/10 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/NNBE9QXPP4RG

#TencentMeeting：889-060-695','2026-06-06 07:29:13+08'::timestamptz,'2026-06-10T12:23:24.324Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',198,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Short vowels: at (bat, rat, hat, mat)  -Sight words (day, she we, use, then, take).  -Everybodyup2e Unit 7 Lesson 2: Abilities (Swim, Dance, Wink, Sing) ','-Review the meaning and how to use today''s sight words',NULL,v_tu,'2026-06-06 07:29:13+08'::timestamptz,'2026-06-10T12:23:24.324Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-09','19:00','20:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/06/09 19:00-20:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/2HMJ6LRgM93Z

#TencentMeeting：112-018-613','2026-06-08 10:37:13+08'::timestamptz,'2026-06-09T12:08:48.569Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',212,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford_Phonics 1
Page 58','Words:
peach
pineapple
quiz
queen

Sentences:

It''s a brown rabbit.
It''s a red rose.
It''s a blue bowl.
I have two elbows.
','Hello, Henry. It has been a very interactive class today. You showed commendable performance throughout the lesson. You listened attentively during our discussions and were able to follow directions well. I also noticed that you can now complete activities with less supervision, which shows improvement in your understanding and independence during class tasks.

You participated well in the activities and showed a positive attitude toward learning English. Your effort and willingness to learn are truly appreciated. With continuous practice and confidence, I believe you will improve even more in your communication and comprehension skills. Keep up the good work!',v_tu,'2026-06-08 10:37:13+08'::timestamptz,'2026-06-09T12:08:48.569Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-08','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/06/08 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/et6NmtzjITgT

#TencentMeeting：980-090-226','2026-06-07 10:04:13+08'::timestamptz,'2026-06-08T13:17:57.855Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',211,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford_Phonics 1
Page 22','Words:
Bear
Energetic
Cool
Fork
Angry
Funny
Dizzy

Sentences:
It''s a cool car.
It''s a big egg.
It''s an energetic fork.
It''s a funny banana.','Hello, Mia. It has been a very interactive and enjoyable class today. You showed commendable performance throughout the lesson and actively participated in our activities and discussions. I noticed that you are becoming more confident in using English during class. You can now formulate simple sentences more clearly and are able to follow directions easily, which shows great improvement in your listening and comprehension skills. You also did a good job in answering questions and expressing your thoughts during the lesson. Your willingness to learn and participate made the class smooth and engaging. With continuous practice, I believe you will become even more confident in your reading, speaking, and sentence construction skills. Keep up the great work, and I look forward to seeing more of your progress in our next class!',v_tu,'2026-06-07 10:04:13+08'::timestamptz,'2026-06-08T13:17:57.855Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-08','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/08 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/uAue4GcWJj25

#TencentMeeting：930-030-919','2026-06-06 07:28:27+08'::timestamptz,'2026-06-08T12:19:35.760Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',196,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Short vowels: ad (dad, pad), ag (bag, rag), ap (cap, map, nap, tap).  -Everbodyup2e Unit 7: Things to do (Abilities): Walk, Run, Skip, Jump','-Review sightwords.  -Practice reading words with short vowels. Example of short vowels: ad, ap, ag',NULL,v_tu,'2026-06-06 07:28:27+08'::timestamptz,'2026-06-08T12:19:35.760Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-08','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/08 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/3BzzdSy7Pndx

#TencentMeeting：822-063-707','2026-06-06 07:28:07+08'::timestamptz,'2026-06-08T12:09:49.452Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',195,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Animals - dog-dogs, cat-cats, rabbit-rabbits, bird-birds.

Plural forms of nouns indicate more than one person, place, or thing. While most regular nouns are made plural by simply adding -s or -es, 

English has several specific spelling rules and irregular exceptions.

1. Regular Noun Rules General Rule: Add -s.cat → cats, book → books

Phonics. Letters "Mm" and "Nn"

Vocabulary words: 
monkey, mouse, magic, mitten, mask, nightingale, net, nut, nose, neighbor, nest, number, nine, nurse, needle, neck, necklace','Practice using the given vocabulary words in sentences.','Wow! Fantastic class participation, Cindy! I hope that you can try more to use everyday English expressions in class. You  tend to stick to short yes/no answers, but I hope that you can try to add more details when you are speaking. In future, I would like to see you using your new vocabulary while speaking.',v_tu,'2026-06-06 07:28:07+08'::timestamptz,'2026-06-08T12:09:49.452Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=16);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-06','13:30','14:30',v_tu,'英语',1,NULL,'completed',NULL,'2026-06-01 05:49:37+08'::timestamptz,'2026-06-06T06:41:58.260Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',191,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'School Supplies; Linking Verbs; Shapes; Art Class 
Vocabulary words: paint, paper, glue, yarn, chalk, tape, circle, square, triangle, rectangle, book, notebook, desk, chair, pen, pencil, eraser, ruler, pencil case, backpack

Is, am, and are are forms of the verb "to be" and serve as the most common linking verbs in English. Unlike action verbs, they do not express an action; instead, they act as an "equal sign" connecting the subject of your sentence to a word that describes or identifies it.

Am 
Use with: The singular pronoun I.
Example: I am a teacher. I am very tired.

Is
Use with: Singular nouns (one person, place, or thing) and the pronouns he, she, and it.

Example: The cat is sleeping. She is my best friend.

Are
Use with: Plural nouns (more than one) and the pronouns we, they, and you.
Example: The dogs are loud. You are doing great.','Use is, am and are in your sentences.','Bravo! Cathy has excellent speaking skills, and is able to learn the pronunciation of new words very quickly due to great concentration. Study the mispronounced words in the class . Mispronounced words: chalk, ruler, backpack, notebook.
She needs to practice using more full sentences, for example "Yes, I do." and "Yes, I can." instead of just saying "Yes". 
In future, I would like to see Cathy try her best to speak English as much as possible in the class. Thank you and see you next time! <3

-MissAMC',v_tu,'2026-06-01 05:49:37+08'::timestamptz,'2026-06-06T06:41:58.260Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-05','18:30','19:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/05 18:30-19:30 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/NQMmdmi4VyiI

#TencentMeeting：868-046-264','2026-05-29 11:08:40+08'::timestamptz,'2026-06-05T11:43:39.971Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',185,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Book: Everybody Up 4

Activities: practice the piano, use the computer, talk on the phone, help my parents, visit my friend, work on a project

Ancient Rome: stone, clay, glass, metal

New words: jewelry, ancient, women, necklaces

The -ed form of a verb (or regular verb) is used to create the simple past tense (completed actions) and the past participle (used with have/had or in passive sentences).

Most Verbs: Just add -ed.
Walk → Walked , Jump → Jumped

Verbs ending in ''e'': Just add -d.
Love → Loved , Dance → Danced

Verbs ending in a consonant + ''y'': Drop the ''y'' and add -ied','Review your mispronounced words and practice them at home during free time.',' Chloe is able to understand class instructions, as well as a wide range of questions. For this level, their listening skills are fantastic. She can read well but needs more practice, I suggest practicing with more short stories or comics. It''s also nice that she can recognize and use sentences in both the present simple and simple past tense. Excellent job, Chloe! See you again, next time!

-Miss AMC',v_tu,'2026-05-29 11:08:40+08'::timestamptz,'2026-06-05T11:43:39.971Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-05','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/05 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/MBdzKSb3YJZh

#TencentMeeting：254-024-764','2026-05-29 11:07:49+08'::timestamptz,'2026-06-05T12:27:30.778Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',182,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-an (man, can pan). -Sight words (with, at, puts, on, for). -Everybodyup2e Unit 6 Lesson 3: Story(Here you are)','- Review the meaning and how to use the new sight words in todays lesson.',NULL,v_tu,'2026-05-29 11:07:49+08'::timestamptz,'2026-06-05T12:27:30.778Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-04','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/06/04 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/N0lTtCNErBu1

#TencentMeeting：266-012-441','2026-05-29 11:07:29+08'::timestamptz,'2026-06-04T13:09:55.649Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',181,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford phonics
Page 21','Please practice the words:
Envelope
Chicken
Egg
','Good evening, Mia. Thank you for coming to class today. You were able to stay focused during our class discussion. You were also motivated to learn English and showed improvement in your reading and speaking skills. I appreciate your effort and determination. Keep it up!',v_tu,'2026-05-29 11:07:29+08'::timestamptz,'2026-06-04T13:09:55.649Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-04','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/06/04 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/sVoP2pP0MOAN

#TencentMeeting：720-038-430','2026-05-29 11:06:54+08'::timestamptz,'2026-06-04T11:10:21.163Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',180,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
Page 57','Please practice the following:
quilt
question
quiz
rose
rice','Good evening, Henry. Thank you for coming to class today. You were able to stay focused during our class discussion. However, I noticed that you seemed a bit unmotivated at times, but you still kept pushing yourself to learn English. I appreciate your effort and determination. Keep it up!',v_tu,'2026-05-29 11:06:54+08'::timestamptz,'2026-06-04T11:10:21.163Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-03','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/03 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/aAF820Xr1de3

#TencentMeeting：471-030-632','2026-05-29 11:06:35+08'::timestamptz,'2026-06-03T12:19:50.741Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',179,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'- a (yak, cat, ax, ant). -am (yam, ram, jam, dam). Everybody up2e Unit 5 Lesson 4 (Review of alphabets).  -Unit 6 Lesson 1: Food (Milk, Water, Bread, Candy). -Unit 6 Lesson 2: Food (Rice, Beans, Chicken, Fish)','-Practice rhyming words (''a'' and ''am'')',NULL,v_tu,'2026-05-29 11:06:35+08'::timestamptz,'2026-06-03T12:19:50.741Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-03','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/03 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/A7NgWKKAyDoL

#TencentMeeting：767-093-239','2026-05-29 11:06:19+08'::timestamptz,'2026-06-03T12:13:33.770Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',178,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Adjectives: An adjective is a part of speech that modifies or describes a noun or pronoun. It adds detail by specifying qualities, characteristics, or states of being.

Example: The yellow ball. (yellow is the adjective in this sentence.)

Grammar: The use of don''t and doesn''t in the sentence. don''t=do not ; doesn''t= does not

Vocabulary words: giant, castle, delicious, short, long, curly, straight, beggar, homeless, dirty, rich, beautiful, poor, clown, funny colourful','Try to practice making sentences at home using the adjectives that we used in class.
Example: The clown is funny and his hair is colourful.','Wow!  Jasmine is able to pick up a great deal of detailed information during class and listening exercises. Sometimes she can read individual words, but finds it more difficult to read whole sentences. In future, Jasmine can improve by reading about her favourite topics in English. She can be able to identify the adjective in the sentence. Job well done!',v_tu,'2026-05-29 11:06:19+08'::timestamptz,'2026-06-03T12:13:33.770Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-02','19:30','20:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/02 19:30-20:30 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/WujPzlZwIvFb

#TencentMeeting：187-083-381','2026-06-01 10:39:38+08'::timestamptz,'2026-06-02T14:27:58.306Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',193,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'📌Verbs or Action Words

Vocabulary: skip, sing, dance, wink, run, walk, waddle, 

📌Phonics: Letters Qq, Rr, Ss

Vocabulary Words: queen, quilt, rabbit, ribbon, rainbow, skate, sunflower, snake, sun

📌Food

Vocabulary Words: milk, water,  bread, candy, rice, beans, chicken, fish

📌Using "Yes, I do." and "No, I don''t." in sentences.','Study all the vocabulary words for pronunciation. ','Good class participation, Cindy! You would benefit from reviewing the digital lesson animations at home to reinforce basic grammar structures. To boost pronunciation, I encourage you to watch the video animations and sing along with the course songs at home. Thank you, and see you again next time! 💗💖',v_tu,'2026-06-01 10:39:38+08'::timestamptz,'2026-06-02T14:27:58.306Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-02','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/06/02 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/8EEByy5yf7XK

#TencentMeeting：361-080-597','2026-05-30 13:49:13+08'::timestamptz,'2026-06-02T11:30:25.263Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',189,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
Page 55','Please practice the following sentences:
I like peach.
I don''t like pineapple.
This is a peach.
This is a pen.
This is a panda
This is a pineapple.','Hello Henry, thank you for attending today’s class. You were able to participate actively in class and showed great effort during our activities. You are now able to follow instructions and create simple sentences, which shows good progress in your English skills. It would be even better if you try to speak a bit louder so the teacher can hear you more clearly during class discussions. Overall, you are doing a great job, and your willingness to learn is truly commendable. Keep up the good work!',v_tu,'2026-05-30 13:49:13+08'::timestamptz,'2026-06-02T11:30:25.263Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-02','18:30','19:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/06/02 18:30-19:30 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/j4IZRCBox9T0

#TencentMeeting：887-022-158','2026-05-29 11:06:01+08'::timestamptz,'2026-06-02T14:16:45.041Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',177,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lessons: Appearances, Accessories, Camouflage, Sports



Vocabulary Words- short hair, shoulder length hair, long hair, straight hair, curly hair, wavy hair, watch, necklace, earrings, sunglasses, gloves, belt, stick, leaf, grass, sand, baseball, basketball, golf, table tennis, tennis, volleyball 

Mispronounced Words: caterpillar, shape, wavy hair, hiding, grey hair, blonde hair ','Please study all the mispronounced words. Kindly read more English books at home and listen to English songs.','Chloe performs excellently on the Cambridge YLE practice sections, showing a strong grasp of required grammar patterns. Kindly have her practice her pronunciation skills while reading books and articles. She participates enthusiastically in our classroom songs and language games to build confidence. Kudos!',v_tu,'2026-05-29 11:06:01+08'::timestamptz,'2026-06-02T14:16:45.041Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-06-01','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/06/01 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/deOVBnH3RDPQ

#TencentMeeting：270-064-368','2026-05-29 11:05:43+08'::timestamptz,'2026-06-01T12:40:18.226Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',176,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Yy (Yo-yo, Yak, Yacht, Yogurt).  -Zz (Zebra, Zoo, Zipper, Zero).  -Everybodyup2e Unit 5 Lesson 3: Story (Please Help me)','Review All the Lessons from A-Z','Hopefully, there are no distractions at the next meeting. Just keep being attentive ',v_tu,'2026-05-29 11:05:43+08'::timestamptz,'2026-06-01T12:40:18.226Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-31','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/31 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/AfP1FZfksUeq

#TencentMeeting：854-049-215','2026-05-24 05:03:13+08'::timestamptz,'2026-05-31T12:20:13.091Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',171,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Page 76- 77 & 78-79',NULL,'The lessons were all on reviews and Jasmine did very great, she understands all of it! Very good!',v_tu,'2026-05-24 05:03:13+08'::timestamptz,'2026-05-31T12:20:13.091Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-31','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/05/31 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/b8t6ODSBcCEe

#TencentMeeting：626-098-882','2026-05-24 05:03:04+08'::timestamptz,'2026-05-31T11:29:43.162Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',170,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford_Phonics 1
Page 18','It''s an orange fish.
It''s a fan.
It''s a farm.
It''s a fork.','Good evening, Mia. Thank you for attending today’s class even though you were not feeling well. Your effort and dedication to still participate in the lesson are truly appreciated. I hope you feel better soon and get enough rest. Keep safe and take care always!',v_tu,'2026-05-24 05:03:04+08'::timestamptz,'2026-05-31T11:29:43.162Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-31','13:30','14:30',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/05/31 13:30-14:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/8Klm18o2ltEi

#TencentMeeting：788-004-135','2026-05-24 05:02:51+08'::timestamptz,'2026-05-31T06:46:19.534Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',169,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 3
Page 12-13','Please practice the words:
Gymnastics
Balance
Complicated
Organ
Cerebellum
Even

x:I like summer because I can eat ice cream.
/: I like summer because I can eat  an ice cream.

Gymnast is a person that does gymnastics.
routine- daily tasks','Good afternoon, William. It was nice to see you in class today. You performed well during our class activities and showed excellent vocabulary skills during our game, as you were able to spell all the words correctly. Great job! It would be even better if you continue practicing your speaking skills and try to express your ideas more creatively by answering beyond the usual responses. Overall, you are doing well in class, and your effort and participation are truly commendable. Keep up the good work!',v_tu,'2026-05-24 05:02:51+08'::timestamptz,'2026-05-31T06:46:19.534Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-29','20:00','21:00',v_tu,'英语',1,NULL,'completed','Eline invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/29 20:00-21:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/mViyCTmzdyrM

#TencentMeeting：943-088-933','2026-05-29 10:58:55+08'::timestamptz,'2026-05-29T13:10:13.192Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',174,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter L 
New words: Lion, lamp, lemon, look. 
Additional words: igloo, juice, eyes, koala, kid, jump, jacket. At - examples: Look at that lemon. Look at this cat. 
Look at this lion. It is big. 
Look at those lemons. Are they big? No, they aren''t. 
The lion plays with the lemons. Hey, lion! Look at the lamp! 

Oxford: Page 34-35 story
I''m 6. how old are you? I''m 7.
How old are you? I''m 7.
How old are you? I''m 6. 
How old are you? Woof, woof, woof, woof! 1,2,3,4! 

Page 36-37
new words: Kite, lion, man
additional words: king, house, goat.',NULL,NULL,v_tu,'2026-05-29 10:58:55+08'::timestamptz,'2026-05-29T13:10:13.192Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-29','18:30','19:30',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/29 18:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/YRLURscU79CT

#TencentMeeting：533-074-832','2026-05-24 05:02:28+08'::timestamptz,'2026-05-29T11:54:51.907Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',168,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Vocabulary: lizard, eel, seal, dolphin, squid, whale, shark, beetle, crab, octopus, 

Comparative and superlative adjectives compare nouns. Comparatives compare exactly two things, while superlatives compare three or more to show the highest/lowest degree of a quality.','Pronounce: canoeing, river, jacket, giant, Komodo dragon, grilling','I am pleased to see that Chloe Candy is using everyday English to express their needs to me. Please be aware of your common mispronounced words and practice them at home. Chloe Candy is able to understand class instructions, as well as a wide range of questions. For this level, her listening skills is fantastic.',v_tu,'2026-05-24 05:02:28+08'::timestamptz,'2026-05-29T11:54:51.907Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-29','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/05/29 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/9uaC1F8SwFgJ

#TencentMeeting：208-020-964','2026-05-24 05:02:16+08'::timestamptz,'2026-05-29T13:24:25.054Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',167,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 3
Page 11','watched
canteen
chorus

x: They are climb.
/: They are climbing.
','Good evening, William. Thank you for attending today’s class. Despite having a slight issue with the audio, you were still able to participate well and stay engaged throughout the lesson. You did a good job answering questions and participating in class activities. It would be even better if you continue to build more confidence in expressing your thoughts and ideas during discussions. Overall, you are doing well in class, and your effort and willingness to learn are commendable. Keep up the good work!',v_tu,'2026-05-24 05:02:16+08'::timestamptz,'2026-05-29T13:24:25.054Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-28','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/05/28 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/0lSZQbHIIjpH

#TencentMeeting：900-073-485','2026-05-24 05:01:35+08'::timestamptz,'2026-05-28T13:20:32.065Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',164,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,' Oxford Phonics 1
Page 12-15','Please practice the words:
Egg
Envelope
Elbow
Elephant','Mia showed excellent participation in today’s class and stayed focused and attentive throughout the lesson. She was able to grasp the lesson quickly and demonstrated good understanding during class activities. Mia also showed eagerness to learn and willingly participated in the discussions and exercises. Her positive attitude, determination, and openness to improvement are truly admirable. With continuous practice and encouragement, Mia will continue to grow more confident and further enhance her English skills.',v_tu,'2026-05-24 05:01:35+08'::timestamptz,'2026-05-28T13:20:32.065Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-28','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/28 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/uClsFmeIORa1

#TencentMeeting：396-087-336','2026-05-24 05:01:20+08'::timestamptz,'2026-05-28T12:26:08.585Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',163,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter L
new words: Lion, lamp, lemon, look.
addiional words: igloo, juice, eyes, koala, kid, jump, jacket.

At - examples: Look at that lemon. Look at this cat.
Look at this lion. It is big. 
Look at those lemons.
Are they big? No, they aren''t.
The lion plays with the lemons.
Hey, lion! Look at the lamp!

Oxford page 40-41
words: Cat/cats, dog/dogs, bird/birds, rabbit/rabbits

',NULL,NULL,v_tu,'2026-05-24 05:01:20+08'::timestamptz,'2026-05-28T12:26:08.585Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-28','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/05/28 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/WftTOwDxHb1G

#TencentMeeting：340-029-938','2026-05-24 05:01:04+08'::timestamptz,'2026-05-28T11:07:28.413Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',162,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
Page 50-53','Please practice the words:
Panda
Peach
Pen
Pineapple','Hello Henry, thank you for attending today’s class even though you were not feeling well. Despite this, you were still able to participate actively and showed great effort during our class activities. Henry is a fast learner and is able to understand lessons quickly while still remaining open to learning and improvement. His positive attitude, determination, and willingness to continue learning English are truly commendable. With continuous practice and confidence, he will surely continue to improve his English skills even more.',v_tu,'2026-05-24 05:01:04+08'::timestamptz,'2026-05-28T11:07:28.413Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-27','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/27 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/qbuy8YpAl6Ga

#TencentMeeting：921-063-843','2026-05-24 05:00:50+08'::timestamptz,'2026-05-27T12:29:48.097Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',161,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Ww (Water, Watch, Wolf, Web).  -Xx( foX, boX, siX, waX).  -Everybodyup2e Unit 5 Lesson2: Animals part 2. Singular and Plural (Goat & Goats, Duck & Ducks, Cow & Cows, Horse & Horses)','-Familiarize the plural and singular form of the animals. ',NULL,v_tu,'2026-05-24 05:00:50+08'::timestamptz,'2026-05-27T12:29:48.097Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-27','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/27 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/dpMGWEn0liS3

#TencentMeeting：818-011-014','2026-05-24 05:00:38+08'::timestamptz,'2026-05-27T12:13:38.243Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',160,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Phonics: bag, bug, tag, top, mat, mud, pop, pit, dad, dig, nap, nod

Lesson 1 - Numbers from 1-12. Pronounce (eight, eleven, twelve)

Lesson 2 - Toys: doll ball, car, kite, dolls, balls, cars kites.
Plural Nouns (Use -s: To show there is more than one of something.  No -s: To show there is only one of something (singular).Example: "One apple" (singular, no -s) vs. "Two apples" (plural, add -s).

More vocabulary words: game, marble, puzzle, cards','Pronounce the words: game, marble, puzzle, cards, eight, eleven, twelve','Jasmine often participates in class discussions.  I would like to see Jasmine speaking English in class more often to communicate her needs, for example to ask for help or to answer a question or formulating a sentence. Never hesitate to ask me.  In future, I would like to see her continue to talk in class - but in English! ',v_tu,'2026-05-24 05:00:38+08'::timestamptz,'2026-05-27T12:13:38.243Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-25','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/25 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/a9KwHMuYCLvb

#TencentMeeting：307-066-320','2026-05-24 05:00:01+08'::timestamptz,'2026-05-25T12:42:23.889Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',158,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Uu (Umbrella, Uncle, Up, Umpire).  -Letter Vv (Van, Vet, Vest, Violin).  -Sight words (Hi, He, Do, You, Dont).  -Everbody up3r Unit 5 Lesson1: Animals. Singular (Cat, Dog, Bird, Rabbit). Plural (Cats, Dogs, Birds, Rabbits)','-Familiarize the meaning of  the sight words taught in todays lesson. And try using them in a sentence
-Practice using the plural and singular of the words in unit 5 lesson 1
','No problem again today, just keep working on the pronunciations of the new words.',v_tu,'2026-05-24 05:00:01+08'::timestamptz,'2026-05-25T12:42:23.889Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-25','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/25 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/nkZHGOaCI2BY

#TencentMeeting：517-090-306','2026-05-24 04:59:46+08'::timestamptz,'2026-05-25T12:11:10.173Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',157,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Book: Everybody up Starter Lesson 4 - Numbers
Counting from 1-20','Practice pronouncing numbers eleven, eight, nine, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty','I’m so happy that Cindy has been contributing more in class recently - her speaking level is still slightly behind her listening and reading skills, but the gap is closing. Please have her practice more on her pronunciation at home. Start with basic words only. I love the way she is engaging with me through her creative annotation skills. She enjoys performing and having fun in class.',v_tu,'2026-05-24 04:59:46+08'::timestamptz,'2026-05-25T12:11:10.173Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-25','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/05/25 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/Mbo1ZAgBUrN9

#TencentMeeting：755-019-976','2026-05-24 04:59:34+08'::timestamptz,'2026-05-25T11:13:58.007Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',156,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1','Please practice the words:
Octopus
Ostrich
Ox
Olive','Henry listened attentively throughout today’s class and was able to maintain good concentration during the lesson. He tried his best in enunciating words clearly and showed consistent effort in participating in class activities. Henry is gradually improving in his speaking skills and demonstrates a positive attitude toward learning English. He may still need a bit of guidance and supervision when constructing simple sentences, but his willingness to learn and improve is truly commendable. With continuous practice and encouragement, Henry will continue to make steady progress in his English skills. Keep up the good work!',v_tu,'2026-05-24 04:59:34+08'::timestamptz,'2026-05-25T11:13:58.007Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-24','15:00','16:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/05/24 15:00-16:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/Wj5614CAaNFT

#TencentMeeting：649-023-482','2026-05-24 02:43:43+08'::timestamptz,'2026-05-24T08:20:21.963Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',155,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1','please practice the following words:
Desk
Doll
Duck','Mia participated very well in today’s class and stayed actively engaged throughout the lesson. She was able to enunciate words correctly, showing noticeable improvement in her pronunciation and speaking skills. Mia also demonstrated great progress in her English abilities through her participation and responses during class activities. Her willingness to learn and improve is truly commendable. With continuous practice and confidence, she will continue to develop her English skills even further.',v_tu,'2026-05-24 02:43:43+08'::timestamptz,'2026-05-24T08:20:21.963Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-24','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/24 19:00-19:30 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/suLeNjWSrccC

#TencentMeeting：301-007-188','2026-05-15 08:59:56+08'::timestamptz,'2026-05-24T12:04:10.106Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',146,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford page 72-73
new words: woman, fox, yo-yo, zebra
additional words: tree, owl, ox, lion, rock

Page 74-75 - review
words: skip, mouth, jump, shake my leg, sing, ears, stomp my feet, swim, wink, swing my arms, run, sing, nose, dance, clap my hands, walk.
sentences: Can you jump? No I can''t.
Let''s play! Ok, let''s swim!
What can you do? I can clap my hands!
Oops! I''m sorry. That''s okay.',NULL,NULL,v_tu,'2026-05-15 08:59:56+08'::timestamptz,'2026-05-24T12:04:10.106Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-22','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/22 19:00-19:30 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/yqtNbDXejU8C

#TencentMeeting：897-051-924','2026-05-15 09:01:18+08'::timestamptz,'2026-05-22T11:56:55.179Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',150,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lesson K
New words: Koala, kite, kick, kitchen
Past words: Juice, igloo, head, fish, jump, egg, duck, game, kid.
Aren''t = are not
Are these five ducks? Yes, they are.
Are these two koalas? No, they aren''t
These are kids. These are kites. These are koalas.
Are these kids in the kitchen? No, they aren''t.
Are these kites in the kitchen? No, they aren''t.
Are these koalas in the kitchen? Yes, they are.',NULL,'not paying attention most of the time',v_tu,'2026-05-15 09:01:18+08'::timestamptz,'2026-05-22T11:56:55.179Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-22','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/22 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/yrIqix9ctmp0

#TencentMeeting：788-022-068','2026-05-15 09:00:54+08'::timestamptz,'2026-05-22T12:19:03.930Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',149,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Ss (Soap, Sun, Sock, Seal).  -Tt (Turtle, Tent, Teacher, Tiger).  -Everybodyup2e (Review) Unit 4 Lesson 4: Phonics (Kk, Ll, Mm).  -Check up on Unit 2 Lessons','-Review the new words in today''s lesson','Very fast learner. Each day, our lessons go smoothly because of her progress. Keep it up!',v_tu,'2026-05-15 09:00:54+08'::timestamptz,'2026-05-22T12:19:03.930Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-22','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/05/22 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/CjfqJUHrYy1m

#TencentMeeting：273-091-422','2026-05-15 08:58:31+08'::timestamptz,'2026-05-22T13:09:36.703Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',142,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 3
Page 6-10','Please practice the following:
Breakfast
Practicing
Exciting
','William participated very well in today’s class and remained actively engaged throughout the lesson. He was able to answer the given questions correctly, showing good understanding of the topics discussed. He is also beginning to express his thoughts and ideas more confidently during class activities, which is a great improvement in his communication skills. William’s willingness to participate and learn is commendable. With continuous practice and encouragement, he will continue to develop his confidence and English skills even further.',v_tu,'2026-05-15 08:58:31+08'::timestamptz,'2026-05-22T13:09:36.703Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-21','18:00','19:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/21 18:00-19:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/MMpgo427ePRE

#TencentMeeting：228-007-608','2026-05-21 02:54:22+08'::timestamptz,'2026-05-21T11:51:16.425Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',154,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Everybody Up 4
Lesson 1 - Camping (climb, hike, canoe, fish, grill hamburgers, watch birds)

Lesson 2 - Sports (ski, snowboard, in-line skate, ice skate, skateboard, surf)

Lesson 3 - Safety (wear a helmet, put on sunscreen, wear a life jacket, fasten your seatbelt)

Mispronounced words: spaghetti, sunscreen, jacket, river, fasten, seatbelt

Value: Be brave

The "-ing" form of a verb is primarily used to create continuous verb tenses (actions happening right now) or as a gerund (a verb functioning as a noun).

Continuous Tenses: Used with a "be" verb (am, is, are, was, were) to show ongoing action (e.g., I am reading or They were running).','Study Unit 2 Land and Sea
','Bravo! Chloe has excellent speaking skills, and is able to learn the pronunciation of new words very quickly due to great concentration. Study the mispronounced words I mentioned in the class content. Mispronounced words: spaghetti, sunscreen, jacket, river, fasten, seatbelt.
(Name) needs to practice using more full sentences, for example "Yes, I do." and "Yes, I can." instead of just saying "Yes". 
In future, I would like to see Chloe try her best to speak English as much as possible in the class. Thank you and see you next time! <3

-MissAMC',v_tu,'2026-05-21 02:54:22+08'::timestamptz,'2026-05-21T11:51:16.425Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-21','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: jennifer barrocamo''s Scheduled Meeting
Time: 2026/05/21 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/4n16eDWcqFqQ

#TencentMeeting：503-024-589','2026-05-16 13:56:19+08'::timestamptz,'2026-05-21T13:23:46.546Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',152,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
pages 4-10','Please practice the following words:
Axe
Bed
Cup','Mia participated very well in today’s class and stayed actively engaged throughout the lesson. She was able to name some pictures correctly, showing good understanding and vocabulary recognition. Mia also demonstrated a strong willingness to listen, participate, and learn the English language. Her positive attitude and eagerness to improve are commendable. With continuous practice and encouragement, she will continue to gain more confidence and develop her English skills further.',v_tu,'2026-05-16 13:56:19+08'::timestamptz,'2026-05-21T13:23:46.546Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-21','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/21 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/NxMGDrsEFxXq

#TencentMeeting：315-029-749','2026-05-15 08:59:45+08'::timestamptz,'2026-05-21T12:06:35.220Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',145,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lesson K
New words: Koala, kite, kick, kitchen
Past words: Juice, igloo, head, fish, jump, egg, duck, game, kid.
Aren''t = are not
Are these five ducks? Yes, they are.
Are these two koalas? No, they aren''t
These are kids. These are kites. These are koalas.
Are these kids in the kitchen? No, they aren''t.
Are these kites in the kitchen? No, they aren''t.
Are these koalas in the kitchen? Yes, they are.

Oxford- my body Page 68-69
Clap my hands, stomp my feet, swing my arms, shake my legs.
sentences: What can you do? I can clap my hands. I can stomp my feet. I can swing my arms.I can shake my legs.



',NULL,NULL,v_tu,'2026-05-15 08:59:45+08'::timestamptz,'2026-05-21T12:06:35.220Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-21','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/05/21 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/qKRK9Nv000xV

#TencentMeeting：798-081-505','2026-05-15 08:57:56+08'::timestamptz,'2026-05-21T11:07:10.056Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',141,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1 
Page 47','Please practice the following words:
Net
Nest
Nut','Henry participated very well in today’s class and stayed focused throughout the lesson. He was able to maintain good concentration during class activities and answered the exercises excellently, showing a strong understanding of the lesson. Henry also demonstrated great willingness and enthusiasm in learning English, which contributed to his active participation in class. His positive attitude and consistent effort are truly commendable. With continuous practice, he will surely continue to improve his English skills even more.',v_tu,'2026-05-15 08:57:56+08'::timestamptz,'2026-05-21T11:07:10.056Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-20','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/20 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/vAOUBWetFFuY

#TencentMeeting：244-041-390','2026-05-15 09:00:38+08'::timestamptz,'2026-05-20T12:39:37.728Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',148,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Rr (Rabbit, Rice, Rose, Robot).  -Sight words (am, small, big).  -Everybodyup2e Unit 3 Lesson 3: How old are you?','-Practice on how to introduce yourself (Ex. What is your name?  My name is ___.  How old are you? I am ___ years old.).   -Make 1 sentence using each sight word in today''s lesson.','Aria has been improving a lot, especially with her pronunciation. And she is very attentive as well in todays class.',v_tu,'2026-05-15 09:00:38+08'::timestamptz,'2026-05-20T12:39:37.728Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-20','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/20 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/w69iUDwEqDpq

#TencentMeeting：302-056-745','2026-05-15 08:59:25+08'::timestamptz,'2026-05-20T13:55:41.979Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',144,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Verbs (action words)- walk, run, skip, jump, swim, dance, wink, sing.

Phonics- Letters Tt,Uu,Vv,Ww,Xx,Yy,Zz
Vocabulary words:
teacher, up, violin, woman, fox, yo-yo, zebra
tea, teapot, telephone, umbrella, underwear, unicorn, under, vase, volcano, vegetables, wink, whale, window, box, X-ray, xylophone, yeti, yacht, yellow, yoga, zoo, zipper, zoom, zero, zest

Value: Politeness, Be friendly','Book: Everybody Up Starter 
Units 7-8 Check Up4 pages 74-75','Bravo! Jasmine has excellent speaking skills, and is able to learn the pronunciation of new words very quickly due to great concentration. Study the new vocabulary words in class. In future, I would like to see her using their new vocabulary while speaking. See you again next time!',v_tu,'2026-05-15 08:59:25+08'::timestamptz,'2026-05-20T13:55:41.979Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-18','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/18 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/UzuMPzCUxR3F

#腾讯会议：142-003-089','2026-05-16 03:03:56+08'::timestamptz,'2026-05-18T12:11:35.588Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',151,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Book: Everybody Up - Starter
Lessons 1-4

Art Class - School Supplies ( pen, pencil, glue, crayon, paper, glue, scissors, paint, marker)

What''s your name? My name is Cindy.

Phonics: A, B, C , D , E , F, G

More words: balloon, ball, doll, yo-yo, train, boat, jet, car.

','Please review your vocabulary words at home. Read aloud the words and use them in sentences.','Wow! I can see your enthusiasm, Cindy! All you need is to focus more on speaking English in class, instead of your first language. Don''t be shy and follow teacher especially in pronouncing the words in class.  I would like to see you Cindy speaking English in class more often to communicate your needs, for example to ask for help or to answer a question. In future, I would like to see you Cindy participate more in class discussions. It’s always wonderful to hear what you think. <3',v_tu,'2026-05-16 03:03:56+08'::timestamptz,'2026-05-18T12:11:35.588Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-18','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/18 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/cnLVxHLTYe0T

#腾讯会议：679-048-577','2026-05-15 09:00:19+08'::timestamptz,'2026-05-18T12:37:31.588Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',147,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Pp (Panda, Pineapple, Pear, Pen).  -Letter Qq (Queen, Quest, Question, Quilt).  -EverybodyUp2e Unit 4 Lesson2: Numbers (Six, Seven, Eight, Nine, Ten)','-Familiarize the new words taught in today''s lesson','I have no troubles with Aria. She''s doing very well now. Just keep up the hard work!',v_tu,'2026-05-15 09:00:19+08'::timestamptz,'2026-05-18T12:37:31.588Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-18','18:00','19:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry
Time: 2026/05/18 18:00-19:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/VpqcoeVFgAyb

#腾讯会议：910-059-191','2026-05-15 08:56:34+08'::timestamptz,'2026-05-18T11:07:04.229Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',140,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
pg. 40-43','Please practice the words:
Gorilla
Insect
Iguana','Henry participated very well in today’s class and remained actively engaged throughout the lesson. He was able to name more pictures correctly during our class discussion, showing improvement in his vocabulary and comprehension skills. He also demonstrated great effort in completing the class activities and responding to questions. Henry’s positive attitude and willingness to participate are commendable. With continuous practice and confidence, he will continue to make good progress in learning English.',v_tu,'2026-05-15 08:56:34+08'::timestamptz,'2026-05-18T11:07:04.229Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-17','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/17 19:00-19:30 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/fl7Hqg45Gnfx

#腾讯会议：161-028-207','2026-05-10 07:52:01+08'::timestamptz,'2026-05-17T12:02:31.538Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',135,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford - Page 64-65
Words: Teacher, up, violin
additional words: Star, arrow, plane, van, train, turtle, violin case, ruler, apple, pen, tape.

Page 66-67
words: Eyes, ears, nose, mouth
additional words: Hair, eyebrows ',NULL,NULL,v_tu,'2026-05-10 07:52:01+08'::timestamptz,'2026-05-17T12:02:31.538Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-17','13:30','14:30',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William
Time: 2026/05/17 13:30-14:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/SIRzkuNQdI9N

#腾讯会议：522-083-690','2026-05-10 07:50:05+08'::timestamptz,'2026-05-17T06:39:01.179Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',127,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 3','Please practice the words:
circus
hates
beard','Hello william it was nice having you in class today. You showed great effort in class today. You were able to complete the sentences correctly. With great confidence , you''ll be able to express your ideas more. Keep up the good work!',v_tu,'2026-05-10 07:50:05+08'::timestamptz,'2026-05-17T06:39:01.179Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-16','19:00','20:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Mia
Time: 2026/05/16 19:00-20:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/J2FwcKHoHZWD

#腾讯会议：411-037-009','2026-05-10 14:22:55+08'::timestamptz,'2026-05-16T12:07:57.714Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',137,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Trial Class
Phonics 1','Practice the words:
Axe
Alligator 
Cup','Hello Mia, it was nice meeting you in class today. You are such an adorable student who showed great effort throughout our lesson. I could see your willingness to learn through your participation and class performance. Although your audio connection was a bit unstable at times, we were still able to continue the lesson well. It was a fun and interactive class, and I hope to see you again in our next session. Thank you!',v_tu,'2026-05-10 14:22:55+08'::timestamptz,'2026-05-16T12:07:57.714Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-15','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/15 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/p3OTXWDAgC4m

#腾讯会议：416-020-048','2026-05-10 07:51:36+08'::timestamptz,'2026-05-15T15:07:56.932Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',133,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Vowels - a e i o u (vowel sounds)

Using is and are in a sentence.

Farm Animals - words like : dog, donkey, cow, hen, chicken, horse, sheep, goat, cat','Read more story books at home.','Cindy showed great energy in class tonight! She did an excellent job with basic greetings and identifying farm animals and vowels. She participated very well in class. She just need to practice more in her sentence making and her vocabulary. In grammar class, She was able to use "is" and "are" in the sentences properly. I love her eagerness to learn. 


Keep up the hard work, Cindy!

- Miss AMC',v_tu,'2026-05-10 07:51:36+08'::timestamptz,'2026-05-15T15:07:56.932Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-15','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/15 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/QyV5UEoQBK6l

#腾讯会议：225-049-424','2026-05-10 07:51:08+08'::timestamptz,'2026-05-15T12:43:33.663Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',131,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Oo (Octopus, Ostrich, Olive, Ox).  -Sight words (No, Yes, Your).   -Everbodyup2e unit 4 Lesson 1: Counting (One, Two, Three, Four, Five).  -Review on phonics (Aa-Oo)','-Review on how to say the alphabets from Aa to Oo(Especially Ll, Mm, Nn, and Oo) and review the sound of each alphabet.   -Write the sight words and try using them in a sentence.','So far Aria''s performance during class has been improving. Keep up the good work',v_tu,'2026-05-10 07:51:08+08'::timestamptz,'2026-05-15T12:43:33.663Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-15','20:40','21:40',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: Started by MissAMC
Time: 2026/05/15 20:39-21:39 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting:
https://voovmeeting.com/dm/qUWMU2coTGVj

#腾讯会议：226-009-666','2026-05-10 07:49:47+08'::timestamptz,'2026-05-15T15:15:05.052Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',126,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Article reading
Title: The World''s Greatest Game: Inside the FIFA World Cup','Keep on improving your English fluency and pronunciation skills by practicing at home. Try reading more English books and watch English movies. Focus on your pronunciation and grammar.','It was a joy having William in class tonight! He demonstrated a fantastic grasp of today''s vocabulary, especially the words expensive and dozens. His sentence structures were close to accurate. To reach the next level, I encourage William to focus on the antonyms like "cheap-expensive" Excellent work, William! See you next time!',v_tu,'2026-05-10 07:49:47+08'::timestamptz,'2026-05-15T15:15:05.052Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-14','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/14 19:10-20:10 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/kTfssdsTa5G9

#腾讯会议：363-051-580','2026-05-10 07:51:50+08'::timestamptz,'2026-05-14T12:19:50.429Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',134,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter J
Main words: juice, jacket, jump
extra words: Igloo, hat, kid, big, in, hair, hand, head, happy, fish, duck, banana, fox, bed.
Those & These
(These are two hats.) (Those are two jackets.)
(These are two ducks.) (Those are two dogs.)
(These are two boys.) (The boys jump,jump,jump!)
(Oops, the jackets!)

Oxford Page 38-39
words: Yellow, brown, five, 10, three, red, eight, orange, boats, green, crayons, brown, jet, purple,  ball, yellow, doll, red, yo-yo, orange.
',NULL,NULL,v_tu,'2026-05-10 07:51:50+08'::timestamptz,'2026-05-14T12:19:50.429Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-14','17:00','18:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Class
Time: 2026/05/14 17:00-18:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/VUzx7Ecwov47

#腾讯会议：537-029-442','2026-05-10 07:49:34+08'::timestamptz,'2026-05-14T10:07:55.347Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',125,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'We continued our lesson on Letter Ll','Practice the words:
chalk
marker
desk

Sentences:
/: The elephant is next to the chair.
/: The apple is over there.','Hello! Henry participated very well in today’s class and showed active engagement throughout the lesson. He was able to recall concepts from the previous class accurately, which demonstrates good understanding and retention of the lessons discussed. Henry also showed progress in his English skills by constructing a few short sentences independently. His willingness to participate and try his best in every activity is commendable. With continued practice and confidence, he will continue to improve his communication skills even more. Keep it up!',v_tu,'2026-05-10 07:49:34+08'::timestamptz,'2026-05-14T10:07:55.347Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-13','18:00','18:30',v_tu,'英语',0.5,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Make-Up Class
Time: 2026/05/13 18:00-18:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/jbf1wr32sP49

#腾讯会议：658-080-563','2026-05-11 10:19:05+08'::timestamptz,'2026-05-14T05:27:28.577Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',139,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1','Please practice the following words:
Leaf
Juice
Jam
Jet','30mins for 5/10',v_tu,'2026-05-11 10:19:05+08'::timestamptz,'2026-05-14T05:27:28.577Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-13','19:00','20:00',v_tu,'英语',1,NULL,'completed','MissAMC invites you to a meeting on VooV Meeting
Meeting Topic: MissAMC''s Scheduled Meeting
Time: 2026/05/13 19:00-20:00 (GMT+08:00) China Standard Time - Beijing

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/rrCe2jP7aTn4

#腾讯会议：180-032-188','2026-05-10 12:02:00+08'::timestamptz,'2026-05-13T13:24:21.548Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',136,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Review on COLORS, FOOD, THINGS AT HOME AND AT SCHOOL.','Read more English Story Books.','Jasmine is able to get the general idea from listening exercises, but sometimes struggles to understand new words from context and struggles with understanding more unusual accents. I can see that she always tries her very best. Please read more English story books at home. Thank you for your spectacular class participation.',v_tu,'2026-05-10 12:02:00+08'::timestamptz,'2026-05-13T13:24:21.548Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-13','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/13 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/NI1PHHzLltg7

#腾讯会议：519-063-190','2026-05-10 07:50:54+08'::timestamptz,'2026-05-13T12:29:32.543Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',130,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Mm ( Mouse, Milk, Monkey, Money).  -Letter Nn ( Nut, Nose, Net, Nest).   EverybodyUp2e Unit 3 lesson 3: Basic greetings ( Hi, how are you? I''m ok.  Here you are , Thank you)','-Practice how to use basic greetings in conversations','She improved her pronunciation. She is also very much attentive today that we had a breeze in class. Keep up the good work',v_tu,'2026-05-10 07:50:54+08'::timestamptz,'2026-05-13T12:29:32.543Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-11','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/11 19:40-20:40 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/5qHLWmaGiNbJ

#腾讯会议：672-031-047','2026-05-10 07:50:39+08'::timestamptz,'2026-05-11T12:40:02.136Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',129,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Ll (Lion, Lamp, Leaf, Lemon)   -Sight words (The, That, Like, And)   -EverybodyUp2e Unit 3 Lesson 2 Colors (Orange, Purple, Pink, Brown)','-Practice the pronunciation of the new words taught in todays lesson    -Just familiarize the meaning of the sigh words again','Just keep practicing the pronunciations again',v_tu,'2026-05-10 07:50:39+08'::timestamptz,'2026-05-11T12:40:02.136Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-11','17:00','18:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Class
Time: 2026/05/11 17:00-18:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/6oqV2K9QXaYi

#腾讯会议：507-092-614','2026-05-10 07:49:22+08'::timestamptz,'2026-05-11T10:08:44.796Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',124,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
Letter L','Please practice the following words:
Lamp
Leaf
Lemon

Sentence:
x; giraffe
/: My favorite animal is giraffe.
','Henry showed great enthusiasm in class today by actively participating in the activities and discussions. He consistently made a strong effort to learn and practice English, which reflects his positive attitude toward learning. Henry is very teachable and demonstrates a genuine willingness to improve his English skills. He listens attentively to instructions and applies corrections well during class activities. As he continues to progress, it would be beneficial for him to practice speaking with more clarity and confidence, especially when enunciating words. Improving the clarity of his voice will help him communicate his thoughts more effectively. Overall, Henry’s dedication and eagerness to learn are commendable, and with continuous practice, he will continue to improve. Have a great night ahead Henry!',v_tu,'2026-05-10 07:49:22+08'::timestamptz,'2026-05-11T10:08:44.796Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-10','18:00','18:30',v_tu,'英语',0.5,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Class
Time: 2026/05/10 16:00-17:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/eJYF0uWWjBAx

#腾讯会议：867-082-177','2026-05-07 12:35:35+08'::timestamptz,'2026-05-14T05:25:32.684Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',119,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford Phonics 1
letter K and L','Please practice the words:
Kangaroo
Key
King
Kite','Good evening Henry, I am so sorry for leaving you in class. Teacher had a power interruption. Anyways, you participated well in class that made our class more engaging. You were able to identify the names of the pictures that begins with /k/ sound. I have seen progress in your English skills most especially your speaking skills. Keep up the good work!',v_tu,'2026-05-07 12:35:35+08'::timestamptz,'2026-05-14T05:25:32.684Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-10','19:00','20:00',v_tu,'英语',1,NULL,'completed','Billow invites you to a meeting on VooV Meeting
Meeting Topic: Billow''s Scheduled Meeting
Time: 2026/05/10 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/67KusPoI8j2k

#腾讯会议：639-061-926','2026-05-03 04:15:39+08'::timestamptz,'2026-05-11T02:24:45.218Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',115,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford everybody:
(page58-63)
(walk,run,skip,jump),(I can walk/run/skip/jump.)
(swim,dance,wink,sing),(Can you swim/wink/dance/sing? Yes,I can. No, I can''t.)
(Can you dance? Yes, I can. OK,Let''s dance.)','please review all the words.',NULL,v_tu,'2026-05-03 04:15:39+08'::timestamptz,'2026-05-11T02:24:45.218Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-10','13:30','14:30',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William''s Class
Time: 2026/05/10 13:30-14:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/ganh8ZH3xm8a

#腾讯会议：475-025-476','2026-05-03 04:12:15+08'::timestamptz,'2026-05-10T08:36:14.878Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',106,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 4: This Year''s Trip','Please review the following:
Circus is a place where acrobats perform
different plays.

*frightening- scary
*important - needed, essential
*waiter- - a person that serves food in a restaurant.
Sentences:
x: go to class.
/: I went to my class today.

x: four years 
/: I''ve been to Japan when I was four years old.

xx: They fly the sky.
/: They went to different places.


','Good day! William showed great participation in today’s class and consistently made an effort to engage in the lesson. He demonstrated a positive attitude toward learning English and showed eagerness to improve his skills. He is very teachable and responds well to guidance, which helps him progress steadily. With his strong willingness to learn and active involvement, he is on the right path to further developing his English abilities.',v_tu,'2026-05-03 04:12:15+08'::timestamptz,'2026-05-10T08:36:14.878Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-08','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/08 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/aldBrQg1hi5V

#腾讯会议：441-028-536','2026-05-04 13:18:14+08'::timestamptz,'2026-05-08T12:11:45.482Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',117,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lesson Jj
main words: Juice, jacket, jump
additional words: igloo, kid, big, in, hair, head, happy, hat, fish, duck, banana, frog, fox, bed.
These & Those:
(These are two hats.) (Those are two jackets.)
(These are two ducks.) (Those are two dogs.)
(These are two boys.) (Those are two jackets.)
(The boys jump,jump,jump!) (Oops. The jacket.)

Oxford: Pages 30-31
one,two,hree,four,five
Page 32-33
six,seven,eight,nine,ten
additional words: Fish, marker, pen, pencil, rubber, crayon, yo-yo, boat, car.
',NULL,NULL,v_tu,'2026-05-04 13:18:14+08'::timestamptz,'2026-05-08T12:11:45.482Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-08','19:30','20:30',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/05/08 19:34-20:34 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/lunD5tSTUFaX

#腾讯会议：248-006-534','2026-05-03 04:13:21+08'::timestamptz,'2026-05-08T13:04:00.357Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',109,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Jj (Juice, Jacket, Jam, Jet)   -Letter Kk (Key, Kite, King, Kangaroo)   -EverybodyUp2e Unit 2 Lesson 4 (Phonics Ee, Ff, Gg)  -Review of the following(Unit 1: Lesson 1: Paper, Glue, Scissors, Paint)  (Unit 1: Lesson 2: Pencil, Pen, Crayon, Marker) (Unit 2: Lesson 1: Balloon, Ball, Doll, Yo-yo) (Unit 2: Lesson 2: Train, Boat, Jet, Car)  -Unit 3 Lesson 1 (Colors, Red, Blue, Yellow Green)','-Practice pronouncing the letter K words in todays lesson   -Review  Unit 1 and 2 lessons again','Practice the pronunciation of the words again',v_tu,'2026-05-03 04:13:21+08'::timestamptz,'2026-05-08T13:04:00.357Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-07','19:00','20:00',v_tu,'英语',1,NULL,'completed','Billow invites you to a meeting on VooV Meeting
Meeting Topic: Billow''s Scheduled Meeting
Time: 2026/05/07 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/nsdBJ6yW0xuL

#腾讯会议：626-007-051','2026-05-03 04:14:01+08'::timestamptz,'2026-05-07T12:11:29.222Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',111,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lesson on Letter i:
Main words: igloo, in, kid, big
Extra words: hand, hair, hat, girl, game, head, fan, apple, dog, fox, frog, bat.
Sentences:
(A kid is in a big igloo.)
(Are these cars? Yes they are.)
(Are these igloos? No, they are not.)
( these are...two cats, three dogs, three elephants, two balls, six kids, four bananas.) 
(These are two kids. These are two igloos.)
(Are these kids in the igloo? Yes, they are. Are the two igloos big? No, they are not)

Oxford, Page 34-35:
Story: I''m 6. how old are you? I''m 7. How old are you? I''m 7. How old are you? I''m 6.  How old are you? Bark bark bark bark. 1,2,3,4! 
Page 36-37:
 K,L,M, kite, lion, man.

',NULL,NULL,v_tu,'2026-05-03 04:14:01+08'::timestamptz,'2026-05-07T12:11:29.222Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-06','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Started by elaine
Time: 2026/05/06 19:02-20:02 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/x7yydncZQogu

#腾讯会议：208-023-664','2026-05-03 04:18:08+08'::timestamptz,'2026-05-06T12:00:19.826Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',116,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford:
page 52-53 - story
(Do you like water? Yes I do.)
(What is it? It''s a sandwich.
(here you are. Thank you! You''re welcome)

page 54-55 Letters Q, R ,S
words: Queen, Ring, Sun 
additional words: Bunny, Owl, Tree, Cloud.

Page 56-57 Review:
words: Bread, cow, candy, milk, bean/s , dog, rice, bird, apple, bunny, horse, goat, cow, dog, cat, rice, fish, water, chicken
',NULL,NULL,v_tu,'2026-05-03 04:18:08+08'::timestamptz,'2026-05-06T12:00:19.826Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-06','19:30','20:30',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/05/06 19:44-20:44 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/sXqpTH7tcad0

#腾讯会议：783-089-692','2026-05-03 04:13:01+08'::timestamptz,'2026-05-06T12:32:24.196Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',108,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'- Letter Ii (Igloo, Insect, Iguana, Ink)

- Sight words (Want, This, My)

Everybody Up2e Unit 2 Lesson 3 (Hello, Good-bye)','-Practice reading the new words in the lesson today

-Understand the meaning of the sight words and when to use them','She''s a very fast learner now. I see a lot of improvements.',v_tu,'2026-05-03 04:13:01+08'::timestamptz,'2026-05-06T12:32:24.196Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-04','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/04 19:15-19:45 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/eE16n5UVlGkD

#腾讯会议：797-024-414','2026-05-03 04:14:25+08'::timestamptz,'2026-05-04T12:08:44.141Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',112,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'letter J
(words: juice, jacket, jump)
learned- These & Those
(These are two hats. Those are two jackets. These are two ducks. Those are two dogs.)(These are two boys. The boys jump, jump, jump! Oops, the jackets!)

oxford page30-31
(one, two, three, four, five)
know the words: Fish, Fishes, count



',NULL,NULL,v_tu,'2026-05-03 04:14:25+08'::timestamptz,'2026-05-04T12:08:44.141Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-04','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Aliana''s Scheduled Meeting
Time: 2026/05/04 19:40-20:10 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/aejbETbFvL3e

#腾讯会议：531-037-738','2026-05-03 04:12:43+08'::timestamptz,'2026-05-04T12:57:24.609Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',107,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Gg (Gorilla, Goat, Gift, Girl)
-Letter Hh ( Horse, Hat, House, Hotdog)
-Everybody Up2e Unit 2 Lesson 2 Toys 
  - Train, Boat, Jet, Car','Familiarize the new words taught in today''s lesson','We had a smooth and enjoyable lesson today thanks to Aria’s attentiveness and positive engagement. She followed along well and contributed nicely, which really helped the lesson flow smoothly.',v_tu,'2026-05-03 04:12:43+08'::timestamptz,'2026-05-04T12:57:24.609Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-04','17:00','18:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Class
Time: 2026/05/04 17:00-18:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/lqBq5s1cvcgv

#腾讯会议：920-036-197','2026-05-03 04:11:00+08'::timestamptz,'2026-05-04T10:19:19.913Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',103,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter J','Jaguar
Jellyfish
Jug
Please practice the different words.','Hi, Henry was very active and attentive in class. He can pronounce some of the words correctly but other words need supervision. I believe with continuous learning he''ll be able to improve his skills in English. Keep on learning Henry:)',v_tu,'2026-05-03 04:11:00+08'::timestamptz,'2026-05-04T10:19:19.913Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-03','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: Elaine''s Scheduled Meeting
Time: 2026/05/03 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/eLj3Y17LyFoH

#腾讯会议：941-043-954','2026-04-24 11:56:46+08'::timestamptz,'2026-05-03T12:10:08.588Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',99,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'everyboday up 2e(page 44-51)
(hi,hello, please help me,sure,thank you)
(nose, orange, pencil)
(milk, water,bread,candy,I like...)
(rice,beans,chicken,fish,do u like...,yes,I do./No,Idon''t)','please review all the conversation and words putted above.',NULL,v_tu,'2026-04-24 11:56:46+08'::timestamptz,'2026-05-03T12:10:08.588Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-03','13:30','14:30',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: jennifer barrocamo''s Scheduled Meeting
Time: 2026/05/03 13:30-14:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/ralygezC2KPA

#腾讯会议：722-023-757','2026-04-24 11:37:01+08'::timestamptz,'2026-05-03T06:36:48.276Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',98,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 4
pages 4-5','Please look for the meaning of:
1. Acrobatics
2. brilliant','Good  afternoon, it was nice to see you in class. You listened to class attentively. You can answer the exercises correctly. And were able to express your thoughts comprehensively. Keep up the good work! See you.',v_tu,'2026-04-24 11:37:01+08'::timestamptz,'2026-05-03T06:36:48.276Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-01','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/05/01 19:39-20:39 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/2jv34NvIwfBn

#腾讯会议：811-097-989','2026-04-24 11:36:35+08'::timestamptz,'2026-05-01T12:40:29.707Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',97,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'-Letter Ff (Fish, Fan, Farm, Fork)
-Sight words (I, Have, See)

Everybody up 2e Unit 2 Lesson 1 (Toys) Page 12-13
-Balloon
-Ball
-Doll
-Yoyo','-Practice reading sight words
-Review all the new words
-Practice writing letter Ff
-Identify the different kinds of toys in the lesson','She seemed a bit distracted and less focused today. I hope she’ll be able to participate more actively in our next meeting. Also keep up with practicing pronunciation.',v_tu,'2026-04-24 11:36:35+08'::timestamptz,'2026-05-01T12:40:29.707Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-05-01','20:00','21:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William''s Class
Time: 2026/05/01 20:00-21:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/q1ZXPMmwZ0jO

#腾讯会议：509-035-919','2026-04-24 11:36:04+08'::timestamptz,'2026-05-01T13:16:21.430Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',95,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power Up 4','He should practice the words such as:
Acrobats
Designers
Tractor
Circus','We started our class a bit late tonight, but it was great meeting him for the first time. He made a good effort in reading the dialogues and was able to answer some of the questions. With a bit more confidence in expressing his thoughts, he’ll continue to improve. Keep up the good work!',v_tu,'2026-04-24 11:36:04+08'::timestamptz,'2026-05-01T13:16:21.430Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-30','19:00','20:00',v_tu,'英语',1,NULL,'completed','Eliane invites you to a meeting on VooV Meeting
Meeting Topic: Started by Elaine
Time: 2026/04/30 19:18-20:18 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/ELConVGA6IbB

#腾讯会议：674-030-149','2026-04-30 11:23:15+08'::timestamptz,'2026-04-30T12:26:52.316Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',102,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'everybody up 2e page 26-33
Hi,how are you? I''m OK. / I''m fine. Thank you.
Here you are. Thank you.
hat
insect
jam
bed 
table
Let''s count.
One,two,three,four,five.
How many?
','account the number and review all the new words.',NULL,v_tu,'2026-04-30 11:23:15+08'::timestamptz,'2026-04-30T12:26:52.316Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-30','19:00','20:00',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/04/30 19:08-20:08 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/wAYlJ61bulqI

#腾讯会议：350-008-989','2026-04-29 05:41:44+08'::timestamptz,'2026-04-30T12:01:45.861Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',101,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter Jj, Those and These
Oxford Lesson 30-31','- Know when to use those and these ','Very energetic and attentive during class. She''s nice to teach because she engages well with the lesson.',v_tu,'2026-04-29 05:41:44+08'::timestamptz,'2026-04-30T12:01:45.861Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-30','17:00','18:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s class
Time: 2026/04/30 16:30-17:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/yV5B2Pe15Jns

#腾讯会议：689-066-071','2026-04-24 11:35:47+08'::timestamptz,'2026-04-30T09:37:00.350Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',94,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Phonics J','Please practice the words:
Juice
Jacket
Jam
Jet','Hello Henry, Thank you for attending your English class today. I have seen some improvement in your English skills especially when making simple sentences. I am looking forward to have more interactive class with you. Keep safe:)',v_tu,'2026-04-24 11:35:47+08'::timestamptz,'2026-04-30T09:37:00.350Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-29','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/04/29 19:46-20:46 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/QljHQexki9jm

#腾讯会议：918-017-600','2026-04-24 11:57:33+08'::timestamptz,'2026-04-29T12:52:27.785Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',100,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter Dd and Ee, Oxford Lesson 4 (Alphabets)','-Practice writing Dd and Ee
-Practice reading words that start with Ee','Aria has a little trouble with pronouncing words, but she learns fast. Just keep practicing with pronunciation. ',v_tu,'2026-04-24 11:57:33+08'::timestamptz,'2026-04-29T12:52:27.785Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-27','17:00','18:00',v_tu,'英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Class
Time: 2026/04/27 17:00-18:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/CmGmVLBVaC0p

#腾讯会议：385-092-423','2026-04-24 11:35:07+08'::timestamptz,'2026-04-27T10:10:57.300Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',91,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Phonics
letter G & H','Practice the words
Gorilla
Goat
Gift

','Henry showed great enthusiasm in class today by actively participating in the activities and discussions. He consistently made a strong effort to learn and practice English, which reflects his positive attitude toward learning. Henry is very teachable and listens well to instructions, allowing him to improve steadily. His willingness to develop his English skills is evident, and with continuous practice, he will surely become even more confident and proficient. Keep going!',v_tu,'2026-04-24 11:35:07+08'::timestamptz,'2026-04-27T10:10:57.300Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-27','19:40','20:40',v_tu,'英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/04/27 19:43-20:43 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/voONRoc47mCH

#腾讯会议：481-042-361','2026-04-24 11:34:43+08'::timestamptz,'2026-04-27T12:53:14.144Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',90,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Letter C and sight words, Oxford Lesson 3','- Practice writing Aa, Bb and Cc
- Introduce yourself (Ex. What''s your name?)','Aria is attentive as always. Just practice with pronunciation and she''s all good',v_tu,'2026-04-24 11:34:43+08'::timestamptz,'2026-04-27T12:53:14.144Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-27','19:00','20:00',v_tu,'英语',1,NULL,'completed','Elaine invites you to a meeting on VooV Meeting
Meeting Topic: elaine''s Scheduled Meeting
Time: 2026/04/27 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/yr5nxpIAxJvK

#腾讯会议：189-076-152','2026-04-24 11:34:18+08'::timestamptz,'2026-04-27T12:00:33.306Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',89,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'letter i: ink,insect,
page 28 and 29',NULL,'very bored, no appetite to listen',v_tu,'2026-04-24 11:34:18+08'::timestamptz,'2026-04-27T12:00:33.306Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-26','19:00','20:00',v_tu,'英语',1,NULL,'completed','Billow invites you to a meeting on VooV Meeting
Meeting Topic: Billow''s Scheduled Meeting
Time: 2026/04/26 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/lELAJMBhwas3

#腾讯会议：512-099-397','2026-04-19 02:36:39+08'::timestamptz,'2026-04-26T12:04:11.999Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',78,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'everybody up 2e starter page 40-43
lesson 1 pets: cat-cats,  dog-dogs, bird-birds, rabbit-rabbits
lessone 2 farm animals: goat-goats, duck-ducks, cow-cows, horse-hores ','please review the animals name ans the shapes name',NULL,v_tu,'2026-04-19 02:36:39+08'::timestamptz,'2026-04-26T12:04:11.999Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-26','13:30','14:30',v_tu,'English英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: William''s class
Time: 2026/04/26 13:30-14:30 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/PdDCqKj6hez2

#腾讯会议：387-084-172','2026-04-19 02:36:28+08'::timestamptz,'2026-04-26T06:46:57.137Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',77,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Comparative adjectives
What are clothes made of?','Make 5 simple sentences using comparative adjectives','William performed well in class today and showed great effort in actively engaging with the lesson. He demonstrated a good command of both speaking and reading skills, which supported his strong performance. His eagerness to participate and give his best is clearly evident. It is also impressive that he can now construct comparative sentences and answer the activities accurately, reflecting a solid understanding of the lesson. As he continues to progress, strengthening his comprehension skills will help him gain a deeper understanding of texts and express his ideas more clearly. With consistent practice and dedication, he will continue to improve in all areas of his English skills.',v_tu,'2026-04-19 02:36:28+08'::timestamptz,'2026-04-26T06:46:57.137Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-24','19:40','20:40',v_tu,'English英语',1,NULL,'completed','Aliana invites you to a meeting on VooV Meeting
Meeting Topic: Started by Aliana
Time: 2026/04/24 19:39-20:39 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/tIVcFjtMw2dy

#腾讯会议：571-016-037','2026-04-21 10:36:35+08'::timestamptz,'2026-04-24T12:53:44.502Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',83,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lesson Bb, Oxford Lesson 2 (School Supplies)','-Practice the Letter Bb
-Practice reading (It, Is)
-Identify School supplies (pencil, pen, crayon, marker)','Aria is very attentive, and she listens well. I have no difficulty teaching her so far. Keep it up',v_tu,'2026-04-21 10:36:35+08'::timestamptz,'2026-04-24T12:53:44.502Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-24','19:00','20:00',v_tu,'英语',1,NULL,'completed','invites you to a meeting on VooV Meeting
Meeting Topic: Started by 
Time: 2026/04/24 19:00-20:00 (GMT+08:00) Singapore Standard Time

Click the link to join the meeting:
https://voovmeeting.com/dm/z0DQKPYJCnsz

#腾讯会议：217-057-847','2026-04-19 02:35:44+08'::timestamptz,'2026-04-24T11:55:29.847Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',75,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford page 26-27
letter H','please review the lessons',NULL,v_tu,'2026-04-19 02:35:44+08'::timestamptz,'2026-04-24T11:55:29.847Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-23','17:00','18:00',v_tu,'English英语',1,NULL,'completed','jennifer barrocamo invites you to a meeting on VooV Meeting
Meeting Topic: Henry''s Class
Time: 2026/04/23 17:00-18:00 (GMT+08:00) Philippine Standard Time

Click the link to join the meeting or to add it to your meeting list:
https://voovmeeting.com/dm/r9ZwvMwhRn3I

#腾讯会议：872-078-444','2026-04-19 02:35:22+08'::timestamptz,'2026-04-23T10:24:39.599Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',73,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Phonics','Practice the words:
Duck
Envelope
Farm

Egg- 1 egg
Eggs- Many eggs
','Henry did well in class and showed genuine effort in pronouncing English words correctly. His good listening and reading skills have helped him follow the lesson effectively. It is inspiring to see his enthusiasm in participating and his willingness to do his best in every task. It is also worth noting that he can now answer simple questions with increasing confidence, showing clear progress. As he continues to improve, developing his speaking skills will help him share his ideas more clearly and confidently. With continuous practice and dedication, Henry will keep progressing in his English learning journey. Keep up the good work Henry:)',v_tu,'2026-04-19 02:35:22+08'::timestamptz,'2026-04-23T10:24:39.599Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-22','19:40','20:40',v_tu,'English英语',1,NULL,'completed',NULL,'2026-04-21 10:35:45+08'::timestamptz,'2026-04-22T13:04:22.234Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',82,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford lesson 1, letter A, sight words (is , it, a, an)','Practice the Letter A and its sound, and introduce yourself in English','Aria is a good listener and also a fast learner. So far, I don''t see any problems, and she''s easy to teach.',v_tu,'2026-04-21 10:35:45+08'::timestamptz,'2026-04-22T13:04:22.234Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-22','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-19 02:35:05+08'::timestamptz,'2026-04-22T12:36:49.095Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',72,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford page36-39
',NULL,NULL,v_tu,'2026-04-19 02:35:05+08'::timestamptz,'2026-04-22T12:36:49.095Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-21','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-19 02:34:55+08'::timestamptz,'2026-04-22T04:42:04.385Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',71,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford page 22-25
letter H
',NULL,NULL,v_tu,'2026-04-19 02:34:55+08'::timestamptz,'2026-04-22T04:42:04.385Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-20','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-19 02:34:34+08'::timestamptz,'2026-04-20T12:48:24.317Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',70,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'page25
letterG',NULL,NULL,v_tu,'2026-04-19 02:34:34+08'::timestamptz,'2026-04-20T12:48:24.317Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-20','17:00','18:00',v_tu,'English',1,NULL,'completed',NULL,'2026-04-19 02:34:07+08'::timestamptz,'2026-04-20T10:05:11.780Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',69,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'We studied Things for School','please practice the words
Eraser
Ruler
Chair
','Henry did well in class and showed strong effort in pronouncing English words accurately. He demonstrated good listening and reading skills, which supported his overall performance. He is eager to participate and gives his best in every activity. As he continues to progress, focusing on improving his speaking skills will help him communicate his ideas more confidently and clearly. With consistent practice and dedication, he will continue to improve in all areas of his English skills. Keep it up Henry!',v_tu,'2026-04-19 02:34:07+08'::timestamptz,'2026-04-20T10:05:11.780Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-19','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-17 04:14:00+08'::timestamptz,'2026-04-19T13:51:28.939Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',68,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford page 35',NULL,NULL,v_tu,'2026-04-17 04:14:00+08'::timestamptz,'2026-04-19T13:51:28.939Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-19','13:30','14:30',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:35:32+08'::timestamptz,'2026-04-19T06:39:28.398Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',54,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Continuation of In Style Lesson, Comparative Adjectives','Please make a sentences using these adjective:
Greater than
Smaller Than
Harder Than
','William did well in class today and made a great effort to actively engage in the lesson. He showed a good command of both speaking and reading skills, which contributed to his strong performance. His willingness to participate and try his best is evident. As he continues to grow, further developing his comprehension skills will help him understand texts more deeply and express his ideas even more clearly. With continuous practice and dedication, there is always room for further improvement in his English skills.
',v_tu,'2026-04-12 04:35:32+08'::timestamptz,'2026-04-19T06:39:28.398Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-17','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:33:55+08'::timestamptz,'2026-04-17T13:20:36.385Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',51,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'letter F
oxford page21',NULL,NULL,v_tu,'2026-04-12 04:33:55+08'::timestamptz,'2026-04-17T13:20:36.385Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-16','17:00','18:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:34:33+08'::timestamptz,'2026-04-16T10:19:53.604Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',52,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Phonics','Henry did well in class today and made a great effort to actively engage in the lesson. He showed a good command of both speaking and reading skills, which contributed to his strong performance. His willingness to participate and try his best is evident. With continuous practice and dedication, there is always room for further improvement in his English skills.','Please Practice these expression:

How are you today:
Answer: I''m good/ I''m fine.

Do you have questions?
:/No, I don''t.
;/Yes, I do.',v_tu,'2026-04-12 04:34:33+08'::timestamptz,'2026-04-16T10:19:53.604Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-16','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:33:39+08'::timestamptz,'2026-04-16T15:28:25.135Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',50,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Oxford page21
Letter g',NULL,NULL,v_tu,'2026-04-12 04:33:39+08'::timestamptz,'2026-04-16T15:28:25.135Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-15','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-13 11:57:53+08'::timestamptz,'2026-04-15T12:22:14.232Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',62,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Everybody Up 2e Starter StudentBook (Pages 22-29)','Practice the alphabet and its sounds','Jasmine is a fast learner. She can identify the colors really well. She can actively read sentences too. Her understanding needs improvement, but I''m sure she can improve quickly. Good job trying to use English, Jasmine! Keep practicing speaking every day.',v_tu,'2026-04-13 11:57:53+08'::timestamptz,'2026-04-15T12:22:14.232Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-14','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:33:11+08'::timestamptz,'2026-04-14T12:36:20.380Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',49,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'letter F
oxford 15',NULL,NULL,v_tu,'2026-04-12 04:33:11+08'::timestamptz,'2026-04-14T12:36:20.380Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-14','17:00','18:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-09 11:21:25+08'::timestamptz,'2026-04-14T10:10:41.039Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',34,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Lett''s Go Phonics 1, Page 22-31','Please practice the following words:

Letter E:
Egg
Elf
Elephant

Letter F
Fox
Fish
Frog

Letter G
Glass
Goat
Garden
','Henry performed well in class and showed great effort in pronouncing English words correctly. He demonstrated a good command of both listening and reading skills, which contributed to his overall performance. His willingness to try his best is commendable. With continuous practice and dedication, there is always room for further improvement in his English skills. Keep up the good work Henry!',v_tu,'2026-04-09 11:21:25+08'::timestamptz,'2026-04-14T10:10:41.039Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=9);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-13','20:00','21:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-13 12:21:08+08'::timestamptz,'2026-04-13T13:18:28.342Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',63,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Let''s Go Phonics 1','Please practice the following word drill.
A:
Axe
Arrow
Arm

Letter B:
Bat
Bag
Box

Letter C:
Cap
Cup
Cake','Good evening! It was nice meeting you Sky. Sky is a lively and enthusiastic student who brings positive energy to every class. He can confidently identify letters and actively reads the given English words without hesitation. His eagerness to learn the English language is evident in his participation and willingness to engage in activities. Keep up the great work, Sky!',v_tu,'2026-04-13 12:21:08+08'::timestamptz,'2026-04-13T13:18:28.342Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-13','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:32:59+08'::timestamptz,'2026-04-13T12:14:56.878Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',48,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford page 19
letterE',NULL,NULL,v_tu,'2026-04-12 04:32:59+08'::timestamptz,'2026-04-13T12:14:56.878Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-12','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-12 04:32:43+08'::timestamptz,'2026-04-12T12:27:24.178Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',47,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'oxford page21
服装图片解释',NULL,NULL,v_tu,'2026-04-12 04:32:43+08'::timestamptz,'2026-04-12T12:27:24.178Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-12','13:30','14:30',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-10 13:34:15+08'::timestamptz,'2026-04-12T06:46:17.684Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',38,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'Power up 5: In Style','Directions:
Look around your home. List 5 different types of clothes you see and tell in class when it is used.','William has shown great participation in class and continues to put in commendable effort in every activity. He is becoming more confident in his abilities, especially in pronouncing words correctly with less supervision. His willingness to try and improve is truly noticeable. Keep up the good work, William—your dedication is leading you to great progress!',v_tu,'2026-04-10 13:34:15+08'::timestamptz,'2026-04-12T06:46:17.684Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-10','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-08 13:37:30+08'::timestamptz,'2026-04-10T12:16:29.238Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',32,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'We learned Feelings and Senses','Make sentences using different senses:
See
Hear
Smell
Taste
Touch
','William demonstrates excellent pronunciation of words, allowing him to speak clearly and confidently. He is able to express his ideas effectively and shares his thoughts with clarity. Additionally, he constructs correct and meaningful sentences, showing a strong understanding of language. Keep up the great work!',v_tu,'2026-04-08 13:37:30+08'::timestamptz,'2026-04-10T12:16:29.238Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-10','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-08 13:24:59+08'::timestamptz,'2026-04-10T13:35:22.458Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',31,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'字母D
牛津17page',NULL,NULL,v_tu,'2026-04-08 13:24:59+08'::timestamptz,'2026-04-10T13:35:22.458Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-09','17:00','18:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-08 13:24:02+08'::timestamptz,'2026-04-10T01:27:29.819Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',30,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'test update','Learn and practice the words that begin with letter E:
Easy
Earth
Eagle
Eleven
Ear
Eye
Enjoy
Eat','Good evening, It was a wonderful class with you Henry. I was impressed with your energy during our class. You did a great job especially in identifying the letters and reading the words at the same time. I believe with constant practice, you can be able to improve your skills in English. Keep up the good work! See you next class:)',v_tu,'2026-04-08 13:24:02+08'::timestamptz,'2026-04-10T01:27:29.819Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-09','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-05 09:20:40+08'::timestamptz,'2026-04-09T14:02:22.722Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',21,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'字母E
牛津12-13page',NULL,NULL,v_tu,'2026-04-05 09:20:40+08'::timestamptz,'2026-04-09T14:02:22.722Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-08','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-08 06:02:33+08'::timestamptz,'2026-04-08T12:50:59.331Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',29,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'剑桥page19
',NULL,'专注力太差',v_tu,'2026-04-08 06:02:33+08'::timestamptz,'2026-04-08T12:50:59.331Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-08','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-05 09:21:01+08'::timestamptz,'2026-04-08T12:51:42.088Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',22,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'剑桥page19
阅读理解：图形',NULL,NULL,v_tu,'2026-04-05 09:21:01+08'::timestamptz,'2026-04-08T12:51:42.088Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-07','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-05 09:20:31+08'::timestamptz,'2026-04-07T14:10:26.115Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',20,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'字母D，lesson5',NULL,NULL,v_tu,'2026-04-05 09:20:31+08'::timestamptz,'2026-04-07T14:10:26.115Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-06','20:00','21:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-06 03:29:28+08'::timestamptz,'2026-04-06T12:35:49.443Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',25,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'剑桥5-6课',NULL,NULL,v_tu,'2026-04-06 03:29:28+08'::timestamptz,'2026-04-06T12:35:49.443Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-06','19:00','20:00',v_tu,'英语',1,NULL,'completed',NULL,'2026-04-05 09:20:17+08'::timestamptz,'2026-04-06T12:35:40.858Z+00'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',19,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'剑桥5-6课',NULL,NULL,v_tu,'2026-04-05 09:20:17+08'::timestamptz,'2026-04-06T12:35:40.858Z+00'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-05','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-06 03:28:49+08'::timestamptz,'2026-04-06 03:28:49+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',24,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'123',v_tu,'2026-04-06 03:28:49+08'::timestamptz,'2026-04-06 03:28:49+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-03','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:36:15+08'::timestamptz,'2026-04-04 02:36:15+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',16,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'10-3',v_tu,'2026-04-04 02:36:15+08'::timestamptz,'2026-04-04 02:36:15+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-02','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:34:25+08'::timestamptz,'2026-04-04 02:34:25+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',13,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'12-3',v_tu,'2026-04-04 02:34:25+08'::timestamptz,'2026-04-04 02:34:25+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-01','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:35:51+08'::timestamptz,'2026-04-04 02:35:51+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',15,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'10-2',v_tu,'2026-04-04 02:35:51+08'::timestamptz,'2026-04-04 02:35:51+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-04-01','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:32:49+08'::timestamptz,'2026-04-04 02:32:49+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',10,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-31','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:33:50+08'::timestamptz,'2026-04-04 02:33:50+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',12,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'12-2',v_tu,'2026-04-04 02:33:50+08'::timestamptz,'2026-04-04 02:33:50+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-30','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:34:59+08'::timestamptz,'2026-04-04 02:34:59+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',14,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'10-1',v_tu,'2026-04-04 02:34:59+08'::timestamptz,'2026-04-04 02:34:59+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-29','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:32:23+08'::timestamptz,'2026-04-04 02:32:23+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',9,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-26','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:33:20+08'::timestamptz,'2026-04-04 02:33:20+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',11,v_co);
    INSERT INTO feedbacks(course_id,content,homework,notes,created_by,created_at,updated_at)
    VALUES(v_co,'(历史课程记录)',NULL,'12-1',v_tu,'2026-04-04 02:33:20+08'::timestamptz,'2026-04-04 02:33:20+08'::timestamptz);
    v_fb:=v_fb+1;
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-25','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:29:32+08'::timestamptz,'2026-04-04 02:29:32+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',4,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-22','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:32:06+08'::timestamptz,'2026-04-04 02:32:06+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',8,v_co);
    v_cnt:=v_cnt+1;
  END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=1); v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1);
  IF v_cu IS NULL THEN v_skip:=v_skip+1;
  ELSE
    INSERT INTO courses(date,start_time,end_time,teacher_id,subject,hours,package_id,status,meeting_link,created_at,updated_at)
    VALUES('2026-03-18','10:00','11:00',v_tu,NULL,1,NULL,'completed',NULL,'2026-04-04 02:31:45+08'::timestamptz,'2026-04-04 02:31:45+08'::timestamptz) RETURNING id INTO v_co;
    INSERT INTO course_students(course_id,child_id) VALUES(v_co,v_cu);
    INSERT INTO tmp_id_map VALUES('classes',7,v_co);
    v_cnt:=v_cnt+1;
  END IF;
RAISE NOTICE 'courses=% skipped=% feedbacks=%',v_cnt,v_skip,v_fb; END $$;

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Step 4: payments (21 条)
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
DO $$ DECLARE v_cu uuid; v_cnt int:=0; v_skip int:=0; BEGIN
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,500,'alipay',NULL,NULL,'2026-06-15',NULL,NULL,10,'2026-06-15 07:49:32+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,360,'wechat',NULL,'12课时','2026-06-10',NULL,NULL,12,'2026-06-10 06:51:58+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,500,'wechat',NULL,'10节amc的课','2026-06-01',NULL,NULL,10,'2026-06-01 10:04:50+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,400,'wechat',NULL,NULL,'2026-06-01',NULL,NULL,10,'2026-06-01 10:02:38+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=16); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,50,'wechat',NULL,'试课1节','2026-06-01',NULL,NULL,1,'2026-06-01 05:53:31+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,120,'wechat',NULL,NULL,'2026-06-01',NULL,NULL,3,'2026-06-01 03:47:41+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=1); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,200,'wechat',NULL,NULL,'2026-06-01',NULL,NULL,5,'2026-06-01 03:43:16+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,500,'wechat',NULL,'10课时','2026-05-22',NULL,NULL,10,'2026-05-22 11:15:32+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=15); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,550,'wechat',NULL,NULL,'2026-05-21',NULL,NULL,11,'2026-05-21 11:47:01+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,300,'wechat',NULL,'10课时','2026-05-17',NULL,NULL,10,'2026-05-17 07:11:29+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,360,'wechat',NULL,'12课时','2026-05-17',NULL,NULL,12,'2026-05-17 07:11:05+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=14); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,1000,'alipay',NULL,NULL,'2026-05-16',NULL,NULL,20,'2026-05-16 13:34:31+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,500,'alipay',NULL,NULL,'2026-05-11',NULL,NULL,10,'2026-05-11 09:27:40+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,360,'wechat',NULL,'12课时','2026-04-21',NULL,NULL,12,'2026-04-21 11:50:04+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=13); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,360,'wechat',NULL,'12课时','2026-04-21',NULL,NULL,12,'2026-04-21 10:35:01+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=9); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,50,'wechat',NULL,NULL,'2026-04-13',NULL,NULL,1,'2026-04-13 12:20:35+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,600,'wechat',NULL,NULL,'2026-04-10',NULL,NULL,10,'2026-04-12 09:26:11+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=5); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,500,'alipay',NULL,'10节口语jennifer','2026-04-09',NULL,NULL,NULL,'2026-04-09 11:24:40+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=6); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,50,'wechat',NULL,'试课1节','2026-04-08',NULL,NULL,1,'2026-04-13 12:35:26+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=2); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,500,'wechat',NULL,'续费12节口语课（elaine）','2026-03-31',NULL,NULL,NULL,'2026-04-04 02:38:37+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_cu:=(SELECT new_id FROM tmp_id_map WHERE tbl='students' AND old_id=3); IF v_cu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO payments(child_id,amount,payment_method,package_id,description,payment_date,receipt_number,notes,hours,created_at)
    VALUES(v_cu,300,'wechat',NULL,'续费10节口语课（elaine）','2026-03-29',NULL,NULL,NULL,'2026-04-04 02:39:26+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
RAISE NOTICE 'payments=% skipped=%',v_cnt,v_skip; END $$;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Step 5: teacher_payments (8 条)
ALTER TABLE teacher_payments DISABLE ROW LEVEL SECURITY;
DO $$ DECLARE v_tu uuid; v_cnt int:=0; v_skip int:=0; BEGIN
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-06-03','2026-06-16',9,9,150,1350,'paid','2026-06-18 23:43:56+08'::timestamptz,'gcash',NULL,'2026-06-17 23:38:24+08'::timestamptz,'2026-06-17 23:43:56+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-06-01','2026-06-15',11,11,150,1650,'paid','2026-06-16 00:30:02+08'::timestamptz,'gcash',NULL,'2026-06-16 00:26:13+08'::timestamptz,'2026-06-16 00:30:02+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-05-09','2026-06-03',10,10,100,1000,'paid','2026-06-03 11:31:35+08'::timestamptz,'cash',NULL,'2026-06-04 11:30:59+08'::timestamptz,'2026-06-04 11:31:35+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=5); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-05-01','2026-06-02',11,11,150,1650,'paid','2026-06-03 01:36:10+08'::timestamptz,'gcash',NULL,'2026-06-03 01:33:12+08'::timestamptz,'2026-06-03 01:36:10+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-05-17','2026-05-31',12,12,150,1800,'paid','2026-06-01 02:41:26+08'::timestamptz,'gcash',NULL,'2026-06-01 02:04:34+08'::timestamptz,'2026-06-01 02:41:26+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-04-27','2026-05-16',11,10,150,1500,'paid','2026-05-17 02:54:34+08'::timestamptz,'gcash',NULL,'2026-05-17 02:54:19+08'::timestamptz,'2026-05-17 02:54:34+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=4); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-04-01','2026-05-08',10,10,100,1000,'paid','2026-05-09 03:34:34+08'::timestamptz,'cash',NULL,'2026-05-09 03:34:14+08'::timestamptz,'2026-05-09 03:34:34+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
  v_tu:=(SELECT new_id FROM tmp_id_map WHERE tbl='teachers' AND old_id=2); IF v_tu IS NULL THEN v_skip:=v_skip+1; ELSE
    INSERT INTO teacher_payments(teacher_id,period_start,period_end,total_classes,total_hours,hourly_rate,total_amount,status,paid_at,payment_method,notes,created_at,updated_at)
    VALUES(v_tu,'2026-04-01','2026-04-26',10,10,150,1500,'paid','2026-04-26 09:42:18+08'::timestamptz,'gcash',NULL,'2026-04-26 09:00:53+08'::timestamptz,'2026-04-26 09:42:18+08'::timestamptz);
    v_cnt:=v_cnt+1; END IF;
RAISE NOTICE 'teacher_payments=% skipped=%',v_cnt,v_skip; END $$;
ALTER TABLE teacher_payments ENABLE ROW LEVEL SECURITY;

-- Step 6: settings (3 条)
INSERT INTO settings(key,value) VALUES('school_name','阳光桥在线英语') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
INSERT INTO settings(key,value) VALUES('currency','CNY') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();
INSERT INTO settings(key,value) VALUES('timezone','Asia/Shanghai') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now();

INSERT INTO mapping_old_to_new(table_name,old_id,new_id) SELECT tbl,old_id,new_id FROM tmp_id_map ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 8: 校验
-- ============================================================
SELECT 'teachers' AS tbl,COUNT(*) AS mvp,4 AS crm FROM teachers;
SELECT 'users' AS tbl,COUNT(*) AS mvp,0 AS crm FROM users;
SELECT 'children' AS tbl,COUNT(*) AS mvp,11 AS crm FROM children;
SELECT 'courses' AS tbl,COUNT(*) AS mvp,143 AS crm FROM courses;
SELECT 'payments' AS tbl,COUNT(*) AS mvp,21 AS crm FROM payments;
SELECT 'teacher_payments' AS tbl,COUNT(*) AS mvp,8 AS crm FROM teacher_payments;
SELECT 'feedbacks' AS tbl,COUNT(*) AS mvp,134 AS expected FROM feedbacks;

SELECT c.name,c.total_hours,c.used_hours,c.total_hours-c.used_hours AS remaining,
  COALESCE(SUM(co.hours),0) AS completed_sum,
  CASE WHEN c.used_hours>=COALESCE(SUM(co.hours),0) THEN '✓' ELSE '✗' END AS chk
FROM children c LEFT JOIN course_students cs ON cs.child_id=c.id
  LEFT JOIN courses co ON co.id=cs.course_id AND co.status='completed'
GROUP BY c.id,c.name,c.total_hours,c.used_hours ORDER BY c.name;

SELECT id,name,total_hours,used_hours FROM children WHERE used_hours>total_hours;

SELECT 'orphan_pay' AS chk,COUNT(*) AS bad FROM payments p LEFT JOIN children c ON c.id=p.child_id WHERE c.id IS NULL;
SELECT 'orphan_tp' AS chk,COUNT(*) AS bad FROM teacher_payments tp LEFT JOIN teachers t ON t.id=tp.teacher_id WHERE t.id IS NULL;
SELECT table_name,COUNT(*) AS cnt FROM mapping_old_to_new GROUP BY table_name ORDER BY table_name;
SELECT COUNT(*) AS total,COUNT(*) FILTER(WHERE teacher_id IS NULL) AS no_teacher FROM courses;
SELECT 'MIGRATION COMPLETE' AS status;