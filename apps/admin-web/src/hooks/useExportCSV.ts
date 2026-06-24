/**
 * useExportCSV — 通用 CSV 导出 hook
 *
 * 调用 GET /api/v1/export/{module} 并触发浏览器下载。
 * 自动携带当前筛选参数（month/date_from/date_to 等）。
 */
import { useState } from 'react';
import { message } from 'antd';
import client from '@/api/client';

interface ExportParams {
  month?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  status?: string;
  teacher_id?: string;
  child_id?: string;
  payment_method?: string;
  type?: string;
}

export function useExportCSV(module: string) {
  const [exporting, setExporting] = useState(false);

  const exportCSV = async (params: ExportParams = {}) => {
    setExporting(true);
    try {
      const res = await client.get(`/export/${module}`, {
        params,
        responseType: 'blob',
      });
      // 从 Content-Disposition 提取文件名
      const cd = res.headers?.['content-disposition'] || '';
      const match = cd.match(/filename=(.+)/);
      const filename = match ? match[1] : `${module}_${Date.now()}.csv`;

      // 触发浏览器下载
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (err) {
      message.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return { exportCSV, exporting };
}
