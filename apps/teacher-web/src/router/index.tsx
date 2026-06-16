import { createBrowserRouter, Navigate } from 'react-router-dom';
import TeacherLayout from '../layouts/TeacherLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import TodayCourses from '../pages/courses/TodayCourses';
import CourseHistory from '../pages/courses/CourseHistory';
import CourseDetail from '../pages/courses/CourseDetail';
import ReadingList from '../pages/reading/ReadingList';
import ReadingDetail from '../pages/reading/ReadingDetail';
import ResourceList from '../pages/resources/ResourceList';
import ResourceDetail from '../pages/resources/ResourceDetail';
import TeacherResourceHome from '../pages/TeacherResourceHome';
import Profile from '../pages/Profile';
import ChangePassword from '../pages/ChangePassword';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'courses/today', element: <TodayCourses /> },
      { path: 'courses/history', element: <CourseHistory /> },
      { path: 'courses/:id', element: <CourseDetail /> },
      // 教学资源库（新）
      { path: 'teaching-resources', element: <TeacherResourceHome /> },
      // 阅读与资源详情（保持兼容）
      { path: 'reading', element: <ReadingList /> },
      { path: 'reading/:id', element: <ReadingDetail /> },
      { path: 'resources', element: <ResourceList /> },
      { path: 'resources/:id', element: <ResourceDetail /> },
      { path: 'profile', element: <Profile /> },
      { path: 'change-password', element: <ChangePassword /> },
    ],
  },
]);

export default router;
