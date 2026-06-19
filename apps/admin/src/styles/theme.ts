/**
 * SunnyBridge Admin 统一主题配置
 * 与 Teacher Web 共享品牌色板体系
 * Admin 角色: 蓝主色 + 橙强调色
 */

import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const adminTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#5CAADF',
    colorInfo: '#5CAADF',
    colorSuccess: '#48BB78',
    colorWarning: '#ECC94B',
    colorError: '#FC8181',
    borderRadius: 8,
    fontFamily: '"PingFang SC", "Noto Sans SC", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    colorBgLayout: '#F7FAFC',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#E2E8F0',
    colorText: '#1A2B4A',
    colorTextSecondary: '#64748B',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
      primaryShadow: 'none',
    },
    Card: {
      borderRadiusLG: 12,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Menu: {
      itemBorderRadius: 8,
    },
    Table: {
      borderRadiusLG: 12,
    },
  },
};

export default adminTheme;
