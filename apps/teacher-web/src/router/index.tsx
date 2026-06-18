import { createBrowserRouter, Navigate } from 'react-router-dom';
import TeacherLayout from '../layouts/TeacherLayout';
import { ProtectedRoute } from '../components/shared';
import LoginPage from '../pages/Login';
import ChangePasswordPage from '../pages/ChangePassword';
import TodayCoursesPage from '../pages/courses/TodayCourses';
import CourseHistoryPage from '../pages/courses/CourseHistory';
import CourseDetailPage from '../pages/courses/CourseDetail';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/courses/today" replace /> },
      { path: 'courses/today', element: <TodayCoursesPage /> },
      { path: 'courses/history', element: <CourseHistoryPage /> },
      { path: 'courses/:id', element: <CourseDetailPage /> },
    ],
  },
]);

export default router;
