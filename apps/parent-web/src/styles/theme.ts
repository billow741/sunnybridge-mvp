import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const parentTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#F4A230',
    colorInfo: '#F4A230',
    colorSuccess: '#68D391',
    colorWarning: '#F6AD55',
    colorError: '#FC8181',
    borderRadius: 12,
    fontFamily: 'PingFang SC, Noto Sans SC, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontSize: 15,
    colorText: '#2D3748',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#FFFBF0',
    colorBorderSecondary: '#F0E6D6',
    controlHeight: 44,
  },
  components: {
    Button: {
      primaryColor: '#FFFFFF',
      primaryShadow: '0 2px 8px rgba(244,162,48,0.3)',
      borderRadius: 12,
      controlHeight: 44,
    },
    Card: {
      borderRadius: 14,
      boxShadowTertiary: '0 1px 4px rgba(45,55,72,0.06)',
    },
    Input: {
      borderRadius: 12,
      controlHeight: 44,
    },
    Tabs: {
      inkBarColor: '#F4A230',
      itemSelectedColor: '#F4A230',
    },
  },
};

export default parentTheme;
