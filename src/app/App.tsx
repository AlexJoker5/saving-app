import { AuthProvider } from '../features/auth/AuthProvider';
import { BrowserRouter } from 'react-router';
import { AppUpdateNotice } from './components/AppUpdateNotice';
import { AppRoutes } from '../routes/AppRoutes';
import { ConnectionBoundary } from '../features/connection/components/ConnectionBoundary';

export function App() {
  return (
    <BrowserRouter>
      <ConnectionBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ConnectionBoundary>
      <AppUpdateNotice />
    </BrowserRouter>
  );
}
