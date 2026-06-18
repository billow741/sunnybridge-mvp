/**
 * App routes — React Router v6 configuration.
 *
 * MVP 菜单结构 (6项 + login):
 * ├── /login            登录页
 * ├── /dashboard        首页概览
 * ├── /courses          课程管理(1v1)
 * ├── /teachers         教师管理
 * ├── /students         学生管理
 * ├── /reading          阅读材料管理
 * └── /resources         资源管理
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import AdminLayout from '../components/AdminLayout';
import AuthGuard from '../components/AuthGuard';
import { DashboardPage } from '../pages/DashboardPage';
import TeachersPage from '../pages/Teachers';
import StudentsPage from '../pages/Students';
import CoursesPage from '../pages/Courses';
import ReadingPage from '../pages/Reading';
import ResourcesPage from '../pages/Resources';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'courses',
        element: <CoursesPage />,
      },
      {
        path: 'teachers',
        element: <TeachersPage />,
      },
      {
        path: 'students',
        element: <StudentsPage />,
      },
      {
        path: 'reading',
        element: <ReadingPage />,
      },
      {
        path: 'resources',
        element: <ResourcesPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
