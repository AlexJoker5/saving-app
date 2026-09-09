import { useAuthContext } from './hooks/useAuthContext';
import { useAuthAction } from './hooks/useAuthAction';
import { PasswordForm } from './components/PasswordForm';
import { AuthPageFrame } from './components/AuthPageFrame';

export function ResetPasswordPage() {
  const auth = useAuthContext();
  const { busy, setBusy, error, act } = useAuthAction();

  return (
    <AuthPageFrame
      title="Choose a new password"
      description="Your recovery link is verified. Save a new password to continue to your account."
    >
      <PasswordForm onBusyChange={setBusy} save={auth.updatePassword} />
      {error && (
        <p className="notice danger" role="alert">
          {error}
        </p>
      )}
      <button
        className="button secondary full-width"
        disabled={busy}
        onClick={() => void act(auth.signOut)}
      >
        Cancel recovery and sign out
      </button>
    </AuthPageFrame>
  );
}
