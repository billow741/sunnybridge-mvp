import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import TeacherLayout from './layouts/TeacherLayout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/dashboard';
import CourseHistory from './pages/courses/CourseHistory';
import TodayCourses from './pages/courses/TodayCourses';
import CourseDetail from './pages/courses/CourseDetail';
import MyStudents from './pages/students';
import StudentDetail from './pages/students/StudentDetail';
import Materials from './pages/materials';
import Profile from './pages/profile';
import CalendarView from './pages/calendar';

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
          <Route path="students" element={<MyStudents />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="materials" element={<Materials />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
