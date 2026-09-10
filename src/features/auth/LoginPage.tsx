import { AuthPageFrame } from './components/AuthPageFrame';
import { CredentialsForm } from './components/CredentialsForm';

export function LoginPage() {
  return (
    <AuthPageFrame
      title="Sign in"
      description="Welcome back. Sign in with your email and password. Verify with Google Authenticator if you have enabled 2FA."
    >
      <CredentialsForm mode="sign-in" />
    </AuthPageFrame>
  );
}
