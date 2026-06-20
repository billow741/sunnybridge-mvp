import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, mustChangePassword } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}
