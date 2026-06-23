import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AuthGuard from './components/AuthGuard';
import AdminLayout from './layouts/AdminLayout';

// --- 页面导入 ---
import Login from './pages/Login';
import Dashboard from './pages/dashboard';
import Students from './pages/students';
import StudentDetail from './pages/students/Detail';
import Courses from './pages/courses';
import Teachers from './pages/teachers';
import ContentPage from './pages/content'
import SettingsPage from './pages/settings'
import SettlementsPage from './pages/settlements'
import PaymentsPage from './pages/payments'
import ReconciliationPage from './pages/finance/Reconciliation'

// ─────────── 品牌主题配置 ───────────
const theme = {
  token: {
    colorPrimary: '#5CAADF',
    colorWarning: '#F4A230',
    colorInfo: '#5CAADF',
    colorSuccess: '#52c41a',
    colorError: '#ff4d4f',
    borderRadius: 10,
    colorBgLayout: '#f0f2f5',
    colorBgContainer: '#ffffff',
    colorText: '#1e293b',
    fontSize: 14,
  },
  components: {
    Layout: { headerHeight: 56, siderWidth: 232 },
    Menu: { darkItemBg: '#1a1a2e', darkItemColor: 'rgba(255,255,255,0.7)', darkItemSelectedBg: '#5CAADF', darkItemHoverBg: 'rgba(255,255,255,0.08)' },
  },
};

export default function App() {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><AdminLayout /></AuthGuard>}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="courses" element={<Courses />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="finance/settlements" element={<SettlementsPage />} />
            <Route path="finance/payments" element={<PaymentsPage />} />
            <Route path="finance/reconciliation" element={<ReconciliationPage />} />
            <Route path="content" element={<ContentPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
