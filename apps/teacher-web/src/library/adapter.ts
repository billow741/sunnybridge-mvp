/**
 * 老师端 资源馆适配层
 *
 * 老师可见全部 isActive 资源
 */

export type LibraryType = 'reading' | 'teaching' | 'parent_support' | 'curation';
export type MaterialLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

export interface ResourceItem {
  id: string;
  source: 'reading' | 'resource';
  title: string;
  library: LibraryType;
  collection: string;
  category: string;
  level?: MaterialLevel;
  audience: string;
  coverUrl?: string;
  fileUrl: string;
  signedFileUrl?: string;
  pageCount?: number;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt: string;
}

export const LIBRARY_LABELS: Record<LibraryType, string> = {
  reading: '阅读馆',
  teaching: '教学资源',
  parent_support: '家长支持',
  curation: '专题推荐',
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
  L1: 'L1 启蒙', L2: 'L2 基础', L3: 'L3 进阶',
  L4: 'L4 中级', L5: 'L5 高级', L6: 'L6 精通',
};

export const LEVEL_COLORS: Record<string, string> = {
  L1: '#1890ff', L2: '#13c2c2', L3: '#52c41a', L4: '#fa8c16', L5: '#f5222d', L6: '#722ed1',
};

export function fromReadingMaterial(m: any): ResourceItem {
  const cat = m.category || 'picture_book';
  return {
    id: m.id, source: 'reading', title: m.title, library: 'reading',
    collection: ['phonics','word_card'].includes(cat) ? (cat==='phonics'?'phonics':'wordcard') : 'graded',
    category: cat, level: m.level as MaterialLevel|undefined, audience: 'both',
    coverUrl: m.cover_url||undefined, fileUrl: m.pdf_url||'', signedFileUrl: m.signed_pdf_url||undefined,
    pageCount: m.page_count||undefined, isActive: m.is_active, isFeatured: false, createdAt: m.created_at,
  };
}

export function fromResource(r: any): ResourceItem {
  const cat = r.category || 'phonics';
  return {
    id: r.id, source: 'resource', title: r.title,
    library: cat==='recommended' ? 'curation' : 'teaching',
    collection: cat==='recommended' ? 'guide' : 'class_activity',
    category: cat, audience: cat==='recommended' ? 'parent' : 'teacher',
    fileUrl: r.pdf_url||'', signedFileUrl: r.signed_pdf_url||undefined,
    isActive: r.is_active, isFeatured: cat==='recommended', createdAt: r.created_at,
  };
}

/** 老师端可见：全部 isActive 资源 */
export function teacherVisibleFilter(items: ResourceItem[]): ResourceItem[] {
  return items.filter(i => i.isActive);
}
