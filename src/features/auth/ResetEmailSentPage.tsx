import { Link } from 'react-router';
import { routePaths } from '../../routes/routePaths';
import { AuthPageFrame } from './components/AuthPageFrame';

export function ResetEmailSentPage() {
  return (
    <AuthPageFrame
      title="Check your email"
      description="If that address has an account, a password reset link will arrive shortly."
    >
      <p className="muted">
        Open the link to choose a new password. If you have an authenticator,
        its code is still required.
      </p>
      <div className="stack-actions">
        <Link className="button full-width" to={routePaths.login}>
          Back to sign in
        </Link>
        <Link
          className="button secondary full-width"
          to={routePaths.forgotPassword}
        >
          Request another link
        </Link>
      </div>
    </AuthPageFrame>
  );
}
