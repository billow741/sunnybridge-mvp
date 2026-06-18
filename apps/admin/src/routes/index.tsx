/**
 * App routes — React Router v6 configuration.
 *
 * /login → LoginPage (public)
 * / → AuthGuard → AdminLayout (sidebar + outlet)
 * /dashboard → DashboardPage (首页概览)
 * /courses → CoursesPage (A-COURSE) ← ADMIN-04
 * /teachers → TeachersPage (A-TEACHER) ← ADMIN-02
 * /students → StudentsPage (A-STUDENT) ← ADMIN-03
 * /reading → ReadingPage (A-READING) ← ADMIN-05
 * /resources → PlaceholderPage (A-RESOURCE, disabled in sidebar)
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
