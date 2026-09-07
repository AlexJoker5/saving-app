import type { ReactNode } from 'react';
import { AuthContext } from './hooks/useAuthContext';
import { useAuth } from './hooks/useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
