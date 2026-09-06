import { BrowserRouter } from 'react-router';
import { AppUpdateNotice } from './components/AppUpdateNotice';
import { AppRoutes } from '../routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <AppUpdateNotice />
    </BrowserRouter>
  );
}
