import type { ThemeConfig } from 'antd';

const parentTheme: ThemeConfig = {
  token: {
    colorPrimary: '#54C5F8',
    colorInfo: '#54C5F8',
    colorSuccess: '#68D391',
    colorWarning: '#F6AD55',
    colorError: '#FC8181',
    borderRadius: 8,
    fontFamily: '"PingFang SC", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    colorBgLayout: '#FFFBF0',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#F0E6D6',
    colorText: '#2D3748',
    colorTextSecondary: '#718096',
  },
  components: {
    Button: { borderRadius: 6, controlHeight: 40 },
    Card: { borderRadiusLG: 8 },
    Input: { borderRadius: 6, controlHeight: 40 },
    Select: { borderRadius: 6, controlHeight: 40 },
  },
};

export default parentTheme;
