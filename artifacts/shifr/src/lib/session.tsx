import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AuthSession } from '@workspace/api-client-react/src/generated/api.schemas';
import { useLocation } from 'wouter';

interface SessionContextType {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem('shifr_session');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [, setLocation] = useLocation();

  const setSession = (newSession: AuthSession | null) => {
    setSessionState(newSession);
    if (newSession) {
      localStorage.setItem('shifr_session', JSON.stringify(newSession));
    } else {
      localStorage.removeItem('shifr_session');
    }
  };

  const logout = () => {
    setSession(null);
    setLocation('/');
  };

  return (
    <SessionContext.Provider value={{ session, setSession, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
