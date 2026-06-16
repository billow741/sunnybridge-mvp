import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from './styles/theme';
import router from './router';
import './styles/global.css';

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
