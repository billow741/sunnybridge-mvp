import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const teacherTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#5CAADF',
    colorInfo: '#5CAADF',
    colorSuccess: '#48BB78',
    colorWarning: '#ECC94B',
    colorError: '#FC8181',
    borderRadius: 8,
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
      primaryShadow: 'none',
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
    Menu: {
      itemBorderRadius: 6,
    },
    Table: {
      borderRadiusLG: 8,
    },
  },
};

export default teacherTheme;
