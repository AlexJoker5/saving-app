import { AuthProvider } from '../features/auth/AuthProvider';
import { BrowserRouter } from 'react-router';
import { AppUpdateNotice } from './components/AppUpdateNotice';
import { AppRoutes } from '../routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <AppUpdateNotice />
    </BrowserRouter>
  );
}
