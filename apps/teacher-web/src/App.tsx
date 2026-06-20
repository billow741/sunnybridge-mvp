import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import TeacherLayout from './layouts/TeacherLayout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/dashboard';
import CourseHistory from './pages/courses/CourseHistory';
import TodayCourses from './pages/courses/TodayCourses';
import CourseDetail from './pages/courses/CourseDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<AuthGuard><TeacherLayout /></AuthGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="today" element={<TodayCourses />} />
          <Route path="courses" element={<CourseHistory />} />
          <Route path="courses/:id" element={<CourseDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
