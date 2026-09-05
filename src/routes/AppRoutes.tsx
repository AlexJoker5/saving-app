import { Navigate, Route, Routes } from 'react-router';
import { WorkspacePage } from '../features/workspace/WorkspacePage';
import { SavingsPage } from '../features/savings/SavingsPage';
import { SetupPage } from '../features/settings/SetupPage';
import { NotFoundPage } from './NotFoundPage';
import { routePaths } from './routePaths';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<WorkspacePage />}>
        <Route
          path={routePaths.home}
          element={<Navigate to={routePaths.savings} replace />}
        />
        <Route path={routePaths.savings} element={<SavingsPage />} />
        <Route path={routePaths.setup} element={<SetupPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
