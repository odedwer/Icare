import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Role } from '../types/index.ts';
import type { ReactNode } from 'react';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">טוען…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== Role.Admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
