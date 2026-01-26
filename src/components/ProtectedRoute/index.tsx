import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useUser();

  // Wait for loading to complete before checking authentication
  // This prevents logout when user presses back button on mobile
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Check if user exists or if there's a token in localStorage
  // This allows navigation even if user context hasn't fully loaded yet
  const token = localStorage.getItem('token');
  if (!user && !token) {
    // Redirect to login if there's no user and no token
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 