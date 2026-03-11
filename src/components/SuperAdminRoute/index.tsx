import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { toast } from 'react-hot-toast';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

const SuperAdminRoute: React.FC<SuperAdminRouteProps> = ({ children }) => {
  const { user, loading } = useUser();
  const toastShown = useRef(false);

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (!loading && user && !isSuperAdmin && !toastShown.current) {
      toastShown.current = true;
      toast.error('Access Denied: Super Admin Only');
    }
  }, [loading, user, isSuperAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default SuperAdminRoute;
