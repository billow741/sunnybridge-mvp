import type { ThemeConfig } from 'antd';

const teacherTheme: ThemeConfig = {
  token: {
    colorPrimary: '#54C5F8',
    colorInfo: '#54C5F8',
    colorSuccess: '#48BB78',
    colorWarning: '#ECC94B',
    colorError: '#FC8181',
    borderRadius: 8,
    fontFamily: '"PingFang SC", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    colorBgLayout: '#F7FAFC',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E2E8F0',
    colorText: '#1A2B4A',
    colorTextSecondary: '#64748B',
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 40,
    },
    Card: {
      borderRadiusLG: 8,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 6,
      controlHeight: 40,
    },
  },
};

export default teacherTheme;
