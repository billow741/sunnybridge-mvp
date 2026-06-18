import { createBrowserRouter, Navigate } from 'react-router-dom';
import ParentLayout from '../layouts/ParentLayout';
import { ProtectedRoute } from '../components/shared';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import TodayCourses from '../pages/courses/TodayCourses';
import CourseHistory from '../pages/courses/CourseHistory';
import CourseDetail from '../pages/courses/CourseDetail';
import LibraryHome from '../pages/library/LibraryHome';
import ReadingDetail from '../pages/reading/ReadingDetail';
import ResourceList from '../pages/resources/ResourceList';
import ResourceDetail from '../pages/resources/ResourceDetail';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedRoute><ParentLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'profile', element: <Profile /> },
      { path: 'courses/today', element: <TodayCourses /> },
      { path: 'courses/history', element: <CourseHistory /> },
      { path: 'courses/:id', element: <CourseDetail /> },
      { path: 'library', element: <LibraryHome /> },
      { path: 'reading/:id', element: <ReadingDetail /> },
      { path: 'resources', element: <ResourceList /> },
      { path: 'resources/:id', element: <ResourceDetail /> },
    ],
  },
]);

export default router;
