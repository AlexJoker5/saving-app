import { createContext, useContext } from 'react';
import type { AuthContextValue } from '../types/auth.type';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('Authentication context is missing.');
  }

  return value;
}
