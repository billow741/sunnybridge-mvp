/**
 * App routes — React Router v6 configuration.
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

// Library pages
import LibraryOverview from '../pages/Library/Overview';
import LibraryCatalog from '../pages/Library/Catalog';
import LibraryCataloging from '../pages/Library/Cataloging';
import LibrarySearch from '../pages/Library/Search';
import LibraryCuration from '../pages/Library/Curation';
import LibraryUsage from '../pages/Library/Usage';

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
      // ── 资源馆 ──
      {
        path: 'library/overview',
        element: <LibraryOverview />,
      },
      {
        path: 'library/catalog',
        element: <LibraryCatalog />,
      },
      {
        path: 'library/cataloging',
        element: <LibraryCataloging />,
      },
      {
        path: 'library/search',
        element: <LibrarySearch />,
      },
      {
        path: 'library/curation',
        element: <LibraryCuration />,
      },
      {
        path: 'library/usage',
        element: <LibraryUsage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
