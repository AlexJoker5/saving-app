import { AuthPageFrame } from './components/AuthPageFrame';
import { CredentialsForm } from './components/CredentialsForm';

export function SignupPage() {
  return (
    <AuthPageFrame
      title="Create an account"
      description="Start with your email and a password. After confirming your email, you can choose whether to enable Google Authenticator."
    >
      <CredentialsForm mode="sign-up" />
    </AuthPageFrame>
  );
}
