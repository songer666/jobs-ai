import {type ReactNode, useEffect} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useSessionCache } from '../lib/session-provider';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading: isPending } = useSessionCache();

  useEffect(() => {
    if (isPending) return;

    if (requireAuth) {
      if (!session?.user) {
        navigate('/login', { replace: true });
        return;
      }

      const userRole = session.user.role;
      if (userRole !== 'admin') {
        navigate('/login', { replace: true });
        return;
      }

      if (location.pathname === '/login') {
        navigate('/dashboard', { replace: true });
      }
    } else {
      if (session?.user) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [session, isPending, requireAuth, navigate, location.pathname]);

  if (isPending) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  const isAuthenticated = !!session?.user;
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === 'admin';

  if (requireAuth && (!isAuthenticated || !isAdmin)) {
    return null;
  }

  return <>{children}</>;
};
