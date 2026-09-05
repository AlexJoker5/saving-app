import { Link } from 'react-router';
import { routePaths } from './routePaths';

export function NotFoundPage() {
  return (
    <main className="app-placeholder">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to={routePaths.home}>Back to home</Link>
    </main>
  );
}
