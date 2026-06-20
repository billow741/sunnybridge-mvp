import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/dashboard';
import Students from './pages/students';
import StudentDetail from './pages/students/Detail';
import Payments from './pages/payments';
import Classes from './pages/classes';
import Schedule from './pages/schedule';
import Teachers from './pages/teachers';
import TeacherPayments from './pages/teacher-payments';
import Courses from './pages/courses';
import Settings from './pages/settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthGuard><AdminLayout /></AuthGuard>}>
          <Route index element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="classes" element={<Classes />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="teacher-payments" element={<TeacherPayments />} />
          <Route path="courses" element={<Courses />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
