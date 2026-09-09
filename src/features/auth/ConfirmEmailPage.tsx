import { Link } from 'react-router';
import { routePaths } from '../../routes/routePaths';
import { AuthPageFrame } from './components/AuthPageFrame';

export function ConfirmEmailPage() {
  return (
    <AuthPageFrame
      title="Confirm your email"
      description="Check your inbox for a confirmation link, then sign in to continue."
    >
      <p className="notice">
        If you already have an account, sign in or reset your password. Opening
        this page does not confirm your email.
      </p>
      <div className="stack-actions">
        <Link className="button full-width" to={routePaths.login}>
          Back to sign in
        </Link>
        <Link
          className="button secondary full-width"
          to={routePaths.forgotPassword}
        >
          Forgot password?
        </Link>
      </div>
    </AuthPageFrame>
  );
}
