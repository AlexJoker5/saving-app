import { Navigate, Outlet, useOutletContext } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';
import type { WorkspaceContext } from '../../workspace/types/workspace.type';
import { authDestination, workspaceAuthenticated } from '../utils/auth-routing';
import { AuthStatus } from './AuthStatus';

export function AuthGate() {
  const auth = useAuthContext();
  const workspace = useOutletContext<WorkspaceContext>();
  const destination = authDestination(auth);
  if (!destination) {
    return <AuthStatus />;
  }
  if (!workspaceAuthenticated(auth)) {
    return <Navigate to={destination} replace />;
  }

  return <Outlet context={workspace} />;
}
