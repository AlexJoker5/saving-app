import { Link, useLocation } from 'react-router';
import { useAuthContext } from './hooks/useAuthContext';
import { useAuthAction } from './hooks/useAuthAction';
import { AuthPageFrame } from './components/AuthPageFrame';
import { routePaths } from '../../routes/routePaths';

export function AccountPage() {
  const auth = useAuthContext();
  const location = useLocation();
  const { busy, error, act } = useAuthAction();
  const verified = auth.factors.filter((factor) => factor.verified);
  const message =
    typeof location.state?.message === 'string' ? location.state.message : '';

  return (
    <AuthPageFrame
      title="Account & security"
      description="Manage the authenticators that protect your account."
    >
      <p className="muted">{auth.user?.email}</p>
      <p>Authenticator 2FA is enabled.</p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      <ul className="entry-list">
        {auth.factors.map((factor) => (
          <li key={factor.id}>
            <div>
              <strong>{factor.name}</strong>
              <p className="muted">
                {factor.verified ? 'Enabled' : 'Unfinished setup'}
              </p>
            </div>
            {factor.verified && verified.length === 1 ? (
              <span className="muted">Required</span>
            ) : (
              <Link
                className="button secondary"
                to={`/account/authenticators/${encodeURIComponent(factor.id)}/remove`}
              >
                Remove
              </Link>
            )}
          </li>
        ))}
      </ul>
      <div className="stack-actions">
        {!busy && (
          <Link className="button full-width" to={routePaths.addAuthenticator}>
            Add backup authenticator
          </Link>
        )}
        <button
          className="button secondary full-width"
          disabled={busy}
          onClick={() => void act(auth.signOut)}
        >
          Sign out on this device
        </button>
        <Link className="text-link" to={routePaths.settings}>
          Back to Settings
        </Link>
      </div>
    </AuthPageFrame>
  );
}
