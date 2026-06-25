/**
 * Library Adapter — 统一资源馆模型
 *
 * 将 readingmaterials + resources 两条数据线统一为 "资源馆" 概念。
 * 前端映射层，不依赖数据库改动。
 *
 * 架构：馆(Library) → 分区(Collection) → 分类(Category/Shelf) → 条目(Item)
 */

// ── 类型定义 ────────────────────────────────────────

export type LibraryType = 'reading' | 'teaching' | 'parent_support' | 'curation';

export type MaterialLevel = 'starter' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export type Audience = 'parent' | 'teacher' | 'both';

export type UsageScene = 'pre_class' | 'in_class' | 'post_class' | 'home_practice' | 'teacher_training';

/** 统一资源条目 — 前端数据模型 */
export interface ResourceItem {
  id: string;
  /** 原始数据来源 */
  source: 'reading' | 'resource';
  title: string;
  subtitle?: string;
  summary?: string;
  library: LibraryType;
  collection: string;
  category: string;
  level?: MaterialLevel;
  /** TODO: 后端增加 tags 字段后映射 */
  tags?: string[];
  audience: Audience;
  /** TODO: 后端增加 usage_scenes 字段后映射 */
  usageScenes?: UsageScene[];
  coverUrl?: string;
  fileUrl: string;
  signedFileUrl?: string;
  pageCount?: number;
  sortOrder: number;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  /** 展示分类 (从 metadata JSONB 读取) */
  displayCategoryL1?: string;
  displayCategoryL2?: string;
}

// ── 目录树定义 ──────────────────────────────────────

export interface TreeNode {
  key: string;
  title: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  /** 叶子节点对应的筛选参数 */
  filter?: {
    library?: LibraryType;
    collection?: string;
    category?: string;
    level?: MaterialLevel;
  };
}

// ── 常量映射 ────────────────────────────────────────

export const LIBRARY_LABELS: Record<LibraryType, string> = {
  reading: '📖 阅读馆',
  teaching: '🎓 教学资源馆',
  parent_support: '👪 家长支持馆',
  curation: '⭐ 专题推荐馆',
};

export const READING_COLLECTION_LABELS: Record<string, string> = {
  graded: '分级阅读',
  phonics: 'Phonics 区',
  wordcard: '词卡区',
};

export const TEACHING_COLLECTION_LABELS: Record<string, string> = {
  lesson_plan: '教案区',
  class_activity: '课堂活动区',
  practice: '家庭练习区',
};

export const PARENT_SUPPORT_COLLECTION_LABELS: Record<string, string> = {
  guide: '家长指南区',
};

export const READING_CATEGORY_LABELS: Record<string, string> = {
  picture_book: '绘本',
  short_text: '短文',
  story: '故事',
  read_aloud: '跟读',
  phonics: 'Phonics',
  word_card: '词卡',
};

export const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  phonics: 'Phonics',
  word_card: '词卡',
  recommended: '推荐',
};

export const LEVEL_LABELS: Record<string, string> = {
  starter: 'Starter 入门',
  A1: 'A1 基础',
  A2: 'A2 进阶',
  B1: 'B1 中级',
  B2: 'B2 高级',
  C1: 'C1 精通',
  C2: 'C2 精通+',
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  parent: '家长',
  teacher: '教师',
  both: '家长+教师',
};

export const USAGE_SCENE_LABELS: Record<UsageScene, string> = {
  pre_class: '课前',
  in_class: '课中',
  post_class: '课后',
  home_practice: '家庭练习',
  teacher_training: '教师培训',
};

export const LEVEL_OPTIONS = Object.entries(LEVEL_LABELS).map(([v, l]) => ({ value: v, label: l }));

export const LIBRARY_OPTIONS = Object.entries(LIBRARY_LABELS).map(([v, l]) => ({ value: v, label: l }));

export const AUDIENCE_OPTIONS = Object.entries(AUDIENCE_LABELS).map(([v, l]) => ({ value: v, label: l }));

export const USAGE_SCENE_OPTIONS = Object.entries(USAGE_SCENE_LABELS).map(([v, l]) => ({ value: v, label: l }));

// ── 映射逻辑 ────────────────────────────────────────

/** 阅读材料 category → 阅读馆分区 */
function readingCategoryToCollection(category: string): string {
  if (category === 'phonics' || category === 'word_card') return category === 'phonics' ? 'phonics' : 'wordcard';
  return 'graded';
}

/** 阅读材料 category → audience */
function readingCategoryToAudience(_category: string): Audience {
  return 'both';
}

/** resources 表 category → 馆类型 */
function resourceCategoryToLibrary(category: string): LibraryType {
  if (category === 'recommended') return 'curation';
  return 'teaching';
}

/** resources 表 category → 分区 */
function resourceCategoryToCollection(category: string): string {
  const map: Record<string, string> = {
    phonics: 'class_activity',
    word_card: 'practice',
    recommended: 'guide',
  };
  return map[category] || 'lesson_plan';
}

/** resources 表 category → audience */
function resourceCategoryToAudience(category: string): Audience {
  if (category === 'recommended') return 'parent';
  return 'teacher';
}

/** 从 readingmaterials 映射为 ResourceItem */
export function fromReadingMaterial(m: {
  id: string;
  title: string;
  level: string | null;
  category: string | null;
  cover_url?: string | null;
  pdf_url?: string | null;
  page_count?: number;
  sort_order?: number;
  is_active: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  signed_pdf_url?: string | null;
}): ResourceItem {
  const isDraft = m.category === '__draft__' || !m.category;
  const effectiveCat = isDraft ? 'picture_book' : m.category!;
  const meta = m.metadata || {};
  return {
    id: m.id,
    source: 'reading',
    title: m.title,
    subtitle: meta.subtitle || undefined,
    summary: meta.description || undefined,
    library: 'reading' as LibraryType,
    collection: isDraft ? '未分类' : readingCategoryToCollection(effectiveCat),
    category: isDraft ? '__draft__' : effectiveCat,
    level: m.level as MaterialLevel | undefined,
    tags: meta.tags || undefined,
    audience: readingCategoryToAudience(effectiveCat),
    coverUrl: m.cover_url || undefined,
    fileUrl: m.pdf_url || '',
    signedFileUrl: m.signed_pdf_url || undefined,
    pageCount: m.page_count || undefined,
    sortOrder: m.sort_order || 0,
    isActive: m.is_active,
    isFeatured: false,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    // 展示分类 (从 metadata 读取)
    displayCategoryL1: meta.display_category_l1 || undefined,
    displayCategoryL2: meta.display_category_l2 || undefined,
  };
}

/** 从 resources 映射为 ResourceItem */
export function fromResource(r: {
  id: string;
  title: string;
  category: string | null;
  pdf_url?: string | null;
  sort_order?: number;
  is_active: boolean;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  signed_pdf_url?: string | null;
}): ResourceItem {
  const isDraftR = r.category === '__draft__' || !r.category;
  const effectiveRCat = isDraftR ? 'phonics' : r.category!;
  const meta = r.metadata || {};
  return {
    id: r.id,
    source: 'resource',
    title: r.title,
    subtitle: meta.subtitle || undefined,
    summary: meta.description || undefined,
    library: resourceCategoryToLibrary(effectiveRCat),
    collection: isDraftR ? '未分类' : resourceCategoryToCollection(effectiveRCat),
    category: isDraftR ? '__draft__' : effectiveRCat,
    tags: meta.tags || undefined,
    audience: resourceCategoryToAudience(effectiveRCat),
    coverUrl: meta.cover_url || undefined,
    fileUrl: r.pdf_url || '',
    signedFileUrl: r.signed_pdf_url || undefined,
    sortOrder: r.sort_order || 0,
    isActive: r.is_active,
    isFeatured: effectiveRCat === 'recommended',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    displayCategoryL1: meta.display_category_l1 || undefined,
    displayCategoryL2: meta.display_category_l2 || undefined,
  };
}

// ── 目录树生成 ──────────────────────────────────────

/** 生成完整目录树 (供 Admin 馆藏目录页使用) */
export function buildCatalogTree(): TreeNode[] {
  return [
    {
      key: 'reading',
      title: '📖 阅读馆',
      filter: { library: 'reading' },
      children: [
        {
          key: 'reading.graded',
          title: '分级阅读',
          filter: { library: 'reading', collection: 'graded' },
          children: [
            { key: 'reading.graded.picture_book', title: '绘本', filter: { library: 'reading', collection: 'graded', category: 'picture_book' } },
            { key: 'reading.graded.story', title: '故事', filter: { library: 'reading', collection: 'graded', category: 'story' } },
            { key: 'reading.graded.short_text', title: '短文', filter: { library: 'reading', collection: 'graded', category: 'short_text' } },
            { key: 'reading.graded.read_aloud', title: '跟读', filter: { library: 'reading', collection: 'graded', category: 'read_aloud' } },
          ],
        },
        {
          key: 'reading.phonics',
          title: 'Phonics 区',
          filter: { library: 'reading', collection: 'phonics' },
        },
        {
          key: 'reading.wordcard',
          title: '词卡区',
          filter: { library: 'reading', collection: 'wordcard' },
        },
        // Level 分区
        ...(['starter','A1','A2','B1','B2','C1','C2'] as MaterialLevel[]).map(lv => ({
          key: `reading.level.${lv}`,
          title: LEVEL_LABELS[lv]!,
          filter: { library: 'reading', level: lv } as { library: LibraryType; level: MaterialLevel },
        })),
      ],
    },
    {
      key: 'teaching',
      title: '🎓 教学资源馆',
      filter: { library: 'teaching' },
      children: [
        { key: 'teaching.lesson_plan', title: '教案', filter: { library: 'teaching', collection: 'lesson_plan' } },
        { key: 'teaching.class_activity', title: '课堂活动', filter: { library: 'teaching', collection: 'class_activity' } },
        { key: 'teaching.practice', title: '家庭练习', filter: { library: 'teaching', collection: 'practice' } },
      ],
    },
    {
      key: 'parent_support',
      title: '👪 家长支持馆',
      filter: { library: 'parent_support' },
      children: [
        { key: 'parent_support.guide', title: '家长指南', filter: { library: 'parent_support', collection: 'guide' } },
      ],
    },
    {
      key: 'curation',
      title: '⭐ 专题推荐馆',
      filter: { library: 'curation' },
    },
  ];
}

// ── 筛选逻辑 ────────────────────────────────────────

/** 根据目录树筛选条件过滤资源列表 */
export function filterResources(items: ResourceItem[], filter: {
  library?: LibraryType;
  collection?: string;
  category?: string;
  level?: MaterialLevel;
  keyword?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  audience?: Audience;
}): ResourceItem[] {
  return items.filter(item => {
    if (filter.library && item.library !== filter.library) return false;
    if (filter.collection && item.collection !== filter.collection) return false;
    if (filter.category && item.category !== filter.category) return false;
    if (filter.level && item.level !== filter.level) return false;
    if (filter.isActive !== undefined && item.isActive !== filter.isActive) return false;
    if (filter.isFeatured !== undefined && item.isFeatured !== filter.isFeatured) return false;
    if (filter.audience && item.audience !== filter.audience && item.audience !== 'both') return false;
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      const match = item.title.toLowerCase().includes(kw)
        || (item.subtitle || '').toLowerCase().includes(kw)
        || (item.summary || '').toLowerCase().includes(kw);
      if (!match) return false;
    }
    return true;
  });
}
