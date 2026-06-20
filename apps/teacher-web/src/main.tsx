import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles/global.css';

const theme = { token: { colorPrimary: '#5CAADF', colorWarning: '#F4A230', borderRadius: 8 } };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={zhCN}><App /></ConfigProvider>
  </React.StrictMode>,
);
