import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authClient } from './auth-client';

interface Session {
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role?: string;
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  clearAndRefetch: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

let sessionCache: Session | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(sessionCache);
  const [isLoading, setIsLoading] = useState(!sessionCache);

  const fetchSession = async (force = false) => {
    const now = Date.now();
    
    // 如果缓存有效且不是强制刷新，直接使用缓存
    if (!force && sessionCache && now - lastFetchTime < CACHE_DURATION) {
      setSession(sessionCache);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await authClient.getSession();
      sessionCache = data as Session | null;
      lastFetchTime = now;
      setSession(sessionCache);
    } catch (error) {
      console.error('Failed to fetch session:', error);
      sessionCache = null;
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    await fetchSession(true);
  };

  const clearAndRefetch = async () => {
    sessionCache = null;
    lastFetchTime = 0;
    setSession(null);
    await fetchSession(true);
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider value={{ session, isLoading, refetch, clearAndRefetch }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionCache = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionCache must be used within SessionProvider');
  }
  return context;
};
