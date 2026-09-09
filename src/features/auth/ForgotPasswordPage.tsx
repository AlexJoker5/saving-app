import { AuthPageFrame } from './components/AuthPageFrame';
import { CredentialsForm } from './components/CredentialsForm';

export function ForgotPasswordPage() {
  return (
    <AuthPageFrame
      title="Forgot password?"
      description="Enter your account email and we’ll send a password reset link."
    >
      <CredentialsForm mode="reset" />
    </AuthPageFrame>
  );
}
