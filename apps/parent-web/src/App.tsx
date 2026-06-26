import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AuthGuard from '@/components/AuthGuard';
import ParentLayout from '@/layouts/ParentLayout';
import Login from '@/pages/Login';
import Overview from '@/pages/child/Overview';
import CourseList from '@/pages/courses/CourseList';
import CourseDetail from '@/pages/courses/CourseDetail';
import ReadingList from '@/pages/reading/ReadingList';
import ReadingProgress from '@/pages/reading/ReadingProgress';
import ResourceList from '@/pages/resources/ResourceList';
import PaymentHistory from '@/pages/payments/PaymentHistory';
import Profile from '@/pages/profile/Profile';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#F4A230',
          borderRadius: 8,
          colorBgContainer: '#FFFFFF',
          colorBorder: '#E2E8F0',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* 登录页 — 无侧边栏 */}
          <Route path="/login" element={<Login />} />

          {/* 受保护路由 — AuthGuard + 侧边栏布局 */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <ParentLayout />
              </AuthGuard>
            }
          >
            <Route index element={<Overview />} />
            <Route path="courses" element={<CourseList />} />
            <Route path="courses/:id" element={<CourseDetail />} />
            <Route path="reading" element={<ReadingList />} />
            <Route path="reading/progress" element={<ReadingProgress />} />
            <Route path="resources" element={<ResourceList />} />
            <Route path="payments" element={<PaymentHistory />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
