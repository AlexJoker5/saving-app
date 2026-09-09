import { AuthPageFrame } from './components/AuthPageFrame';
import { CredentialsForm } from './components/CredentialsForm';

export function LoginPage() {
  return (
    <AuthPageFrame
      title="Sign in"
      description="Welcome back. Sign in with your email and password, then verify with Google Authenticator."
    >
      <CredentialsForm mode="sign-in" />
    </AuthPageFrame>
  );
}
