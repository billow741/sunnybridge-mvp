import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import ParentLayout from './layouts/ParentLayout';
import Login from './pages/Login';
import ChildOverview from './pages/child/Overview';
import CourseList from './pages/courses/CourseList';
import CourseDetail from './pages/courses/CourseDetail';
import ReadingList from './pages/reading/ReadingList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AuthGuard><ParentLayout /></AuthGuard>}>
          <Route index element={<ChildOverview />} />
          <Route path="courses" element={<CourseList />} />
          <Route path="courses/:id" element={<CourseDetail />} />
          <Route path="reading" element={<ReadingList />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
