'use client';

import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (!user?.isAdmin) {
    router.push('/');
    return null;
  }

  return <>{children}</>;
}