/**
 * AuthGuard — route guard for admin-only pages.
 *
 * Checks:
 * 1. isLoggedIn() → has access_token in localStorage
 * 2. isAdmin() → role is "admin"
 *
 * Fails → redirect to /login
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn, isAdmin } from '../auth/storage';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin()) {
    // Non-admin role — force logout and redirect
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
