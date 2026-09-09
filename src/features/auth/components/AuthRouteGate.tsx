import { Navigate, Outlet } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';
import { authDestination, workspaceAuthenticated } from '../utils/auth-routing';
import { AuthStatus } from './AuthStatus';

export function AuthRouteGate({
  screen,
}: {
  screen: 'public' | 'verify' | 'enroll' | 'reset' | 'account';
}) {
  const auth = useAuthContext();
  const destination = authDestination(auth);
  if (!destination) {
    return <AuthStatus />;
  }
  const allowed =
    screen === 'public'
      ? auth.phase === 'signed-out'
      : screen === 'verify'
        ? auth.phase === 'mfa-required'
        : screen === 'enroll'
          ? auth.phase === 'signed-in' &&
            !auth.factors.some((factor) => factor.verified)
          : screen === 'reset'
            ? auth.phase === 'signed-in' &&
              auth.recovery &&
              auth.factors.some((factor) => factor.verified)
            : workspaceAuthenticated(auth);

  return allowed ? (
    <Outlet key={auth.user?.id ?? 'signed-out'} />
  ) : (
    <Navigate to={destination} replace />
  );
}
