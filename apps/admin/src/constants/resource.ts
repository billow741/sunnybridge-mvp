/**
 * 资源馆分类常量 — 8点修订版
 *
 * 约束:
 * - 一级展示分类: 固定, 不允许后台增删
 * - 二级展示分类: 常量配置, 保存时必须落 metadata JSONB
 * - 原始 category: Select 受限选项, MVP 不允许自由输入
 * - module 是前端视图字段, 不入库: reading→readingmaterials, resource→resources
 * - resources 封面统一存 metadata.cover_url
 */

// ── 一级展示分类 (固定) ─────────────────────────────

export const DISPLAY_L1: Record<string, string[]> = {
  reading: ['绘本阅读', '分级阅读', '自然拼读', '词汇识记'],
  resource: ['学习工具', '拓展资源', '推荐书单'],
};

// ── 二级展示分类 (常量配置, 选后落 metadata) ──────────

export const DISPLAY_L2: Record<string, string[]> = {
  '绘本阅读': ['启蒙绘本', '进阶绘本', '主题绘本'],
  '分级阅读': ['L1入门', 'L2基础', 'L3进阶', 'L4熟练'],
  '自然拼读': ['字母认知', '拼读规则', '拼读练习'],
  '词汇识记': ['Sight Words', '主题词汇', '词卡游戏'],
  '学习工具': ['练习册', '闪卡', '工作纸'],
  '拓展资源': ['儿歌动画', '手工素材', '节日专题'],
  '推荐书单': ['年龄推荐', '主题推荐', '获奖推荐'],
};

// ── 原始 category (受限 Select, 不允许自由输入) ──────

export const VALID_CATEGORIES: Record<string, string[]> = {
  reading: ['picturebook', 'shorttext', 'story', 'readaloud', 'phonics', 'wordcard', 'recommended'],
  resource: ['phonics', 'word_card', 'recommended'],
};

/** category 中文标签 */
export const CATEGORY_LABELS: Record<string, string> = {
  __draft__: '草稿(未分类)',
  picturebook: '绘本',
  shorttext: '短文',
  story: '故事',
  readaloud: '跟读',
  phonics: '自然拼读',
  wordcard: '词卡',
  word_card: '词卡',
  recommended: '推荐',
};

// ── 一级展示分类 → 默认原始 category 映射 ────────────

export const CATEGORY_DEFAULT_MAP: Record<string, string> = {
  '绘本阅读': 'picturebook',
  '分级阅读': 'shorttext',
  '自然拼读': 'phonics',
  '词汇识记': 'wordcard',
  '学习工具': 'phonics',
  '拓展资源': 'word_card',
  '推荐书单': 'recommended',
};

// ── 标签池 (常量配置, 选后落 metadata) ───────────────

export const TAG_POOL: string[] = [
  '3-6岁', '6-9岁', '9-12岁',
  '启蒙', '进阶', '复习',
  '亲子共读', '自主阅读',
  '免费', '付费',
  '新上架', '热门',
];

// ── 级别选项 (仅阅读材料) ──────────────────────────

export const LEVEL_OPTIONS = [
  { value: 'L1', label: 'L1 启蒙' },
  { value: 'L2', label: 'L2 基础' },
  { value: 'L3', label: 'L3 进阶' },
  { value: 'L4', label: 'L4 熟练' },
  { value: 'L5', label: 'L5 精读' },
  { value: 'L6', label: 'L6 拓展' },
];

// ── 统一封面读取函数 ───────────────────────────────

/**
 * 统一读取封面 URL
 * - reading: 用 record.cover_url (原生列)
 * - resource: 用 record.metadata?.cover_url (JSONB)
 */
export function getCoverUrl(record: Record<string, any>, module: 'reading' | 'resource'): string | null {
  if (module === 'reading') {
    return record.cover_url ?? null;
  }
  const meta = record.metadata;
  if (meta && typeof meta === 'object') {
    return meta.cover_url ?? null;
  }
  return null;
}

// ── 模块类型 ───────────────────────────────────────

export type ModuleType = 'reading' | 'resource';

export const MODULE_LABELS: Record<ModuleType, string> = {
  reading: '阅读材料',
  resource: '通用资源',
};

// ── metadata JSONB 结构 ────────────────────────────

export interface ResourceMetadata {
  subtitle?: string;
  description?: string;
  display_category_l1?: string;
  display_category_l2?: string;
  tags?: string[];
  /** 仅 resources 表使用 (reading 有原生 cover_url 列) */
  cover_url?: string;
  file_size?: number;
}
