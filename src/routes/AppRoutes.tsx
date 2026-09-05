import { Route, Routes } from 'react-router';
import { WorkspacePage } from '../features/workspace/WorkspacePage';
import { NotFoundPage } from './NotFoundPage';
import { routePaths } from './routePaths';

export function AppRoutes() {
  return (
    <Routes>
      <Route path={routePaths.home} element={<WorkspacePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
