import { createBrowserRouter, Navigate } from 'react-router-dom';
import ParentLayout from '../layouts/ParentLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/Login';
import Home from '../pages/Home';
import ChildPage from '../pages/ChildPage';
import TodayCourses from '../pages/courses/TodayCourses';
import CourseDetail from '../pages/courses/CourseDetail';
import ReadingList from '../pages/reading/ReadingList';
import ReadingDetail from '../pages/reading/ReadingDetail';
import ResourceList from '../pages/resources/ResourceList';
import ResourceDetail from '../pages/resources/ResourceDetail';
import LibraryHome from '../pages/library/LibraryHome';
import MyReading from '../pages/library/MyReading';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedRoute><ParentLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'child', element: <ChildPage /> },
      { path: 'courses/today', element: <TodayCourses /> },
      { path: 'courses/:id', element: <CourseDetail /> },
      // 资源馆（新）
      { path: 'library', element: <LibraryHome /> },
      { path: 'my-reading', element: <MyReading /> },
      // 阅读与资源详情（保持兼容）
      { path: 'reading', element: <ReadingList /> },
      { path: 'reading/:id', element: <ReadingDetail /> },
      { path: 'resources', element: <ResourceList /> },
      { path: 'resources/:id', element: <ResourceDetail /> },
    ],
  },
]);

export default router;
