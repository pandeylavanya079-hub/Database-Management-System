import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RouteGuardProps {
  allowedRoles?: string[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    // Redirect to login if unauthorized
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to dashboard if lacks permissions
    return <Navigate to="/" replace />;
  }

  // Render children
  return <Outlet />;
};

export default RouteGuard;
