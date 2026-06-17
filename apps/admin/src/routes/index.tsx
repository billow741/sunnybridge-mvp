/**
 * App routes — React Router v6 configuration.
 * 
 * 资源馆菜单结构 (4项):
 * ├── 总览
 * ├── 资源列表
 * ├── 分类管理
 * └── 推荐配置
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

// Library pages — 4项
import LibraryOverview from '../pages/Library/Overview';
import ResourceListPage from '../pages/Library/ResourceList';
import CategoryManagePage from '../pages/Library/CategoryManage';
import CurationPage from '../pages/Library/CurationManage';

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
      // ── 资源馆 (4项) ──
      {
        path: 'library/overview',
        element: <LibraryOverview />,
      },
      {
        path: 'library/list',
        element: <ResourceListPage />,
      },
      {
        path: 'library/categories',
        element: <CategoryManagePage />,
      },
      {
        path: 'library/curation',
        element: <CurationPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
