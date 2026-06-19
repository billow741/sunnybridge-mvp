/**
 * App root — Ant Design ConfigProvider + RouterProvider.
 * 主题配置已提取到 styles/theme.ts
 */

import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import adminTheme from './styles/theme';
import './styles/global.css';

const App: React.FC = () => (
  <ConfigProvider locale={zhCN} theme={adminTheme}>
    <RouterProvider router={router} />
  </ConfigProvider>
);

export default App;
