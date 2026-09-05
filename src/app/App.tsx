import { BrowserRouter } from 'react-router';
import { AppRoutes } from '../routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
