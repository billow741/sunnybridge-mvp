import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import theme from './styles/theme';
import router from './router';
import './styles/global.css';

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={enUS}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}
