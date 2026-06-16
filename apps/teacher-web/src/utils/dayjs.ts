// Simple day-like utility without importing dayjs
export function formatTime(time: string): string {
  return time?.substring(0, 5) || '';
}

export function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(date: string): string {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN');
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}
