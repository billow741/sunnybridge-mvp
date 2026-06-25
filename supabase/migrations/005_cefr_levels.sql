-- 005_cefr_levels.sql
-- 将 children.level 和 reading_materials.level 从 L1-L6 改为 CEFR: starter,A1,A2,B1,B2,C1,C2
-- 同时迁移现有数据

-- 1. 先删掉旧 CHECK 约束
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_level_check;
ALTER TABLE reading_materials DROP CONSTRAINT IF EXISTS reading_materials_level_check;

-- 2. 迁移现有数据
UPDATE children SET level = 'starter' WHERE level = 'L1';
UPDATE children SET level = 'A1' WHERE level = 'L2';
UPDATE children SET level = 'A2' WHERE level = 'L3';
UPDATE children SET level = 'B1' WHERE level = 'L4';
UPDATE children SET level = 'B2' WHERE level = 'L5';
UPDATE children SET level = 'C1' WHERE level = 'L6';

UPDATE reading_materials SET level = 'starter' WHERE level = 'L1';
UPDATE reading_materials SET level = 'A1' WHERE level = 'L2';
UPDATE reading_materials SET level = 'A2' WHERE level = 'L3';
UPDATE reading_materials SET level = 'B1' WHERE level = 'L4';
UPDATE reading_materials SET level = 'B2' WHERE level = 'L5';
UPDATE reading_materials SET level = 'C1' WHERE level = 'L6';

-- 3. 更新默认值 + 添加新 CHECK 约束
ALTER TABLE children ALTER COLUMN level SET DEFAULT 'starter';
ALTER TABLE children ADD CONSTRAINT children_level_check CHECK (level IN ('starter','A1','A2','B1','B2','C1','C2'));

ALTER TABLE reading_materials ALTER COLUMN level SET DEFAULT 'starter';
ALTER TABLE reading_materials ADD CONSTRAINT reading_materials_level_check CHECK (level IN ('starter','A1','A2','B1','B2','C1','C2'));
