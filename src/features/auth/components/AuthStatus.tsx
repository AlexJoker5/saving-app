import { useAuthContext } from '../hooks/useAuthContext';
import { useAuthAction } from '../hooks/useAuthAction';
import { AuthPageFrame } from './AuthPageFrame';
import { supabaseConfigurationError } from '../../../lib/supabase';

export function AuthStatus() {
  const auth = useAuthContext();
  const { busy, error, act } = useAuthAction();

  return (
    <AuthPageFrame
      title={
        auth.phase === 'loading'
          ? 'Checking your account'
          : 'Account unavailable'
      }
    >
      {auth.phase === 'loading' ? (
        <p role="status">Please wait…</p>
      ) : auth.phase === 'disabled' ? (
        <p className="notice">
          {supabaseConfigurationError ||
            'Account sign-in is not configured for this deployment.'}
        </p>
      ) : (
        <>
          <p role="alert" className="notice danger">
            {error || auth.error}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void act(auth.refresh)}
          >
            Retry account check
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void act(auth.signOut)}
          >
            Sign out on this device
          </button>
        </>
      )}
    </AuthPageFrame>
  );
}
