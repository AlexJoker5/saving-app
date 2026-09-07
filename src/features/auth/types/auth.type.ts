export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthFactor {
  id: string;
  name: string;
  verified: boolean;
}

export interface AuthState {
  phase:
    | 'loading'
    | 'signed-out'
    | 'signed-in'
    | 'mfa-required'
    | 'error'
    | 'disabled';
  user: AuthUser | null;
  factors: AuthFactor[];
  recovery: boolean;
  error: string;
}

export interface AuthEnrollment {
  id: string;
  qrCode: string;
  secret: string;
}

export interface AuthContextValue extends AuthState {
  emailEnabled: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  enroll: () => Promise<AuthEnrollment>;
  verify: (factorId: string, code: string) => Promise<void>;
  removeFactor: (factorId: string) => Promise<void>;
}
