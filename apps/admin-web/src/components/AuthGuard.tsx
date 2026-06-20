import { Navigate } from 'react-router-dom';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('sb_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
