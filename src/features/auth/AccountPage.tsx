import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthContext } from './hooks/useAuthContext';
import { CredentialsForm } from './components/CredentialsForm';
import { AuthenticatorForm } from './components/AuthenticatorForm';
import { PasswordForm } from './components/PasswordForm';
import type { AuthEnrollment, AuthFactor } from './types/auth.type';
import { routePaths } from '../../routes/routePaths';

function AccountContent() {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'reset'>('sign-in');
  const [enrollment, setEnrollment] = useState<AuthEnrollment | null>(null);
  const [removing, setRemoving] = useState<AuthFactor | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const factors = auth.factors.filter((factor) => factor.verified);
  const selected =
    factors.find((factor) => factor.id === selectedId) ?? factors[0];
  const act = async (action: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not finish. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={`panel setup-panel account-panel ${auth.phase === 'signed-out' ? 'signin-panel' : ''}`}
    >
      <p className="eyebrow">Your account</p>
      <h1>
        {auth.phase === 'mfa-required'
          ? 'Verify your sign-in'
          : auth.phase === 'signed-out'
            ? mode === 'sign-in'
              ? 'Your savings, together.'
              : mode === 'sign-up'
                ? 'Create an account'
                : 'Reset password'
            : 'Account & security'}
      </h1>
      <p className="muted">
        {auth.phase === 'signed-out'
          ? 'Sign in to your account to continue. Google Authenticator verification follows sign-in.'
          : 'Your financial data is available only after signing in and verifying your authenticator.'}
      </p>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {auth.phase === 'disabled' ? (
        <p className="notice">
          Account sign-in is not configured for this deployment.
        </p>
      ) : auth.phase === 'loading' ? (
        <p role="status">Checking your account…</p>
      ) : auth.phase === 'error' ? (
        <>
          <p role="alert" className="notice danger">
            {auth.error}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void act(auth.refresh)}
          >
            Retry account check
          </button>
        </>
      ) : auth.phase === 'signed-out' ? (
        <CredentialsForm key={mode} mode={mode} changeMode={setMode} />
      ) : (
        <>
          <p className="muted">{auth.user?.email}</p>
          {auth.phase === 'mfa-required' ? (
            <>
              <p>
                Enter the six-digit code from Google Authenticator to finish
                signing in.
              </p>
              {factors.length > 1 && (
                <label className="field">
                  <span>Authenticator</span>
                  <select
                    disabled={busy}
                    value={selected?.id ?? ''}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {factors.map((factor) => (
                      <option key={factor.id} value={factor.id}>
                        {factor.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {selected ? (
                <AuthenticatorForm
                  onBusyChange={setBusy}
                  key={selected.id}
                  verify={async (code) => {
                    await auth.verify(selected.id, code);
                    if (!auth.recovery) {
                      navigate(routePaths.home, { replace: true });
                    }
                    setMessage('Two-factor verification complete.');
                  }}
                />
              ) : (
                <p role="alert">
                  This account requires a factor that this app does not support.
                  Use your existing recovery or administrator support process.
                </p>
              )}
              <p className="muted">
                If you lost your authenticator, use another enrolled
                authenticator. A password reset does not remove 2FA.
              </p>
            </>
          ) : auth.recovery ? (
            <>
              <h2>Choose a new password</h2>
              <PasswordForm
                onBusyChange={setBusy}
                save={async (password) => {
                  await auth.updatePassword(password);
                  setMessage('Password updated.');
                }}
              />
            </>
          ) : (
            <>
              <p role="status">
                {factors.length
                  ? 'Authenticator 2FA is enabled.'
                  : 'Set up Google Authenticator to access your savings.'}
              </p>
              {enrollment ? (
                <>
                  <h2>Set up Google Authenticator</h2>
                  <p>
                    Scan this QR code in Google Authenticator, then enter its
                    current code.
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
                    Keep the setup key private. This app does not generate
                    recovery codes. You can add a second authenticator afterward
                    as a backup.
                  </p>
                  <AuthenticatorForm
                    onBusyChange={setBusy}
                    verify={async (code) => {
                      await auth.verify(enrollment.id, code);
                      setEnrollment(null);
                      if (!factors.length) {
                        navigate(routePaths.home, { replace: true });
                      }
                      setMessage(
                        'Authenticator enabled. Future sign-ins require its code.',
                      );
                    }}
                  />
                  <button
                    className="button secondary"
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
              ) : removing ? (
                <>
                  <h2>Remove {removing.name}?</h2>
                  <p>
                    {factors.length === 1 && removing.verified
                      ? 'Your account requires an authenticator. Add a backup before removing this device. '
                      : ''}
                    Confirm with a current code before removing a verified
                    authenticator.
                  </p>
                  {removing.verified ? (
                    <AuthenticatorForm
                      onBusyChange={setBusy}
                      label="Verify and remove"
                      cancel={() => setRemoving(null)}
                      verify={async (code) => {
                        await auth.verify(removing.id, code);
                        await auth.removeFactor(removing.id);
                        setRemoving(null);
                        setMessage('Authenticator removed.');
                      }}
                    />
                  ) : (
                    <div className="form-end">
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setRemoving(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="button danger"
                        disabled={busy}
                        onClick={() =>
                          void act(async () => {
                            await auth.removeFactor(removing.id);
                            setRemoving(null);
                          })
                        }
                      >
                        Remove unfinished setup
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <ul className="entry-list">
                    {auth.factors.map((factor) => (
                      <li key={factor.id}>
                        <div>
                          <strong>{factor.name}</strong>
                          <p className="muted">
                            {factor.verified
                              ? 'Enabled'
                              : 'Unfinished setup — remove before starting again'}
                          </p>
                        </div>
                        <button
                          className="button secondary"
                          disabled={
                            busy || (factor.verified && factors.length === 1)
                          }
                          onClick={() => {
                            setRemoving(factor);
                            setMessage('');
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        setEnrollment(await auth.enroll());
                      })
                    }
                  >
                    {busy
                      ? 'Please wait…'
                      : factors.length
                        ? 'Add backup authenticator'
                        : 'Set up Google Authenticator'}
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}
      {auth.phase !== 'disabled' &&
        auth.phase !== 'signed-out' &&
        auth.phase !== 'loading' && (
          <div className="form-end">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await auth.signOut();
                  setEnrollment(null);
                  setRemoving(null);
                  setMode('sign-in');
                })
              }
            >
              Sign out on this device
            </button>
          </div>
        )}
      {auth.phase === 'signed-in' && !auth.recovery && factors.length > 0 && (
        <Link className="button full-width" to={routePaths.home}>
          Continue to Home
        </Link>
      )}
    </section>
  );
}

export function AccountPage() {
  const auth = useAuthContext();

  return <AccountContent key={auth.user?.id ?? 'signed-out'} />;
}
