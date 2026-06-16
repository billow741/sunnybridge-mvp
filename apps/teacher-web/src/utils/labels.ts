export const categoryLabels: Record<string, string> = {
  picture_book: '绘本',
  short_text: '短文',
  story: '故事',
  read_aloud: '朗读',
};

export const resourceCategoryLabels: Record<string, string> = {
  phonics: '自然拼读',
  word_card: '单词卡',
  recommended: '推荐资源',
};

export const levelLabels: Record<string, string> = {
  L1: 'L1 启蒙',
  L2: 'L2 基础',
  L3: 'L3 进阶',
  L4: 'L4 中级',
  L5: 'L5 高级',
  L6: 'L6 精通',
};

export const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待上课', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
};
