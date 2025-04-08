import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectPath = '/login' 
}) => {
  const { currentUser, loading } = useAuth();
  
  // While auth state is loading, show nothing
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#070B14] to-[#0A1428]">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-primary-500 rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login page
  if (!currentUser) {
    return <Navigate to={redirectPath} replace />;
  }

  // If children exists, render them, otherwise render the Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute; 