/**
 * App root — Ant Design ConfigProvider + RouterProvider.
 */

import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

const App: React.FC = () => (
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#5AA0DC',
        borderRadius: 8,
      },
    }}
  >
    <RouterProvider router={router} />
  </ConfigProvider>
);

export default App;
