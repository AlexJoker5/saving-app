import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthContext } from './hooks/useAuthContext';
import { useAuthAction } from './hooks/useAuthAction';
import type { AuthEnrollment } from './types/auth.type';
import { AuthenticatorForm } from './components/AuthenticatorForm';
import { AuthPageFrame } from './components/AuthPageFrame';
import { routePaths } from '../../routes/routePaths';

export function AuthenticatorSetupPage({
  backup = false,
}: {
  backup?: boolean;
}) {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<AuthEnrollment | null>(null);
  const { busy, setBusy, error, act } = useAuthAction();
  const unfinished = auth.factors.filter((factor) => !factor.verified);

  return (
    <AuthPageFrame
      title={
        backup ? 'Add a backup authenticator' : 'Set up Google Authenticator'
      }
      description="Protect your account with a six-digit code from your authenticator app."
    >
      <p className="muted">{auth.user?.email}</p>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {enrollment ? (
        <>
          <p>
            Scan this QR code in Google Authenticator, then enter its current
            code.
          </p>
          <img
            className="auth-qr"
            src={
              enrollment.qrCode.startsWith('data:')
                ? enrollment.qrCode
                : 'data:image/svg+xml;charset=utf-8,' +
                  encodeURIComponent(enrollment.qrCode)
            }
            alt="QR code for adding Saving to your authenticator"
          />
          <details>
            <summary>Enter a setup key instead</summary>
            <code className="auth-secret">{enrollment.secret}</code>
          </details>
          <p className="muted">
            Keep the setup key private. This app does not generate recovery
            codes. You can add a second authenticator afterward as a backup.
          </p>
          <AuthenticatorForm
            onBusyChange={setBusy}
            verify={async (code) => {
              await auth.verify(enrollment.id, code);
              setEnrollment(null);
              if (backup) {
                navigate(routePaths.account, {
                  replace: true,
                  state: { message: 'Backup authenticator enabled.' },
                });
              }
            }}
          />
          <button
            className="button secondary full-width"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await auth.removeFactor(enrollment.id);
                setEnrollment(null);
              })
            }
          >
            Cancel setup
          </button>
        </>
      ) : (
        <>
          {unfinished.length > 0 && (
            <>
              <p className="notice">
                An earlier setup was not verified. Remove it below, then start
                again to get a new QR code.
              </p>
              <ul className="entry-list">
                {unfinished.map((factor) => (
                  <li key={factor.id}>
                    <div>
                      <strong>{factor.name}</strong>
                      <p className="muted">Unfinished setup</p>
                    </div>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(() => auth.removeFactor(factor.id))
                      }
                    >
                      Remove unfinished setup
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            className="button full-width"
            disabled={busy || unfinished.length > 0}
            onClick={() =>
              void act(async () => {
                setEnrollment(await auth.enroll());
              })
            }
          >
            {busy ? 'Please wait…' : 'Show setup QR code'}
          </button>
        </>
      )}
      {backup ? (
        !busy && (
          <Link className="button secondary full-width" to={routePaths.account}>
            Back to account settings
          </Link>
        )
      ) : (
        <button
          className="button secondary full-width"
          disabled={busy}
          onClick={() => void act(auth.signOut)}
        >
          Sign out on this device
        </button>
      )}
    </AuthPageFrame>
  );
}
