import { AuthPageFrame } from './components/AuthPageFrame';
import { CredentialsForm } from './components/CredentialsForm';

export function SignupPage() {
  return (
    <AuthPageFrame
      title="Create an account"
      description="Start with your email and a password. After confirming your email, set up Google Authenticator to protect your account."
    >
      <CredentialsForm mode="sign-up" />
    </AuthPageFrame>
  );
}
