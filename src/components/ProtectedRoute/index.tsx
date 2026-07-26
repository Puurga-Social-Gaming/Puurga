import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Never blank the whole app on route changes.
 * - If we already have a session token/user, keep rendering children (Layout stays mounted).
 * - Only block on the true first auth check when nothing is known yet.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useUser();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const hasSessionHint = Boolean(user || token);

  if (loading && !hasSessionHint) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background text-muted">
        <Loader2 className="w-7 h-7 animate-spin text-accent" />
      </div>
    );
  }

  if (!loading && !user && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
