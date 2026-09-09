import { useState } from 'react';
import { useAuthContext } from './hooks/useAuthContext';
import { useAuthAction } from './hooks/useAuthAction';
import { AuthenticatorForm } from './components/AuthenticatorForm';
import { AuthPageFrame } from './components/AuthPageFrame';

export function TwoFactorPage() {
  const auth = useAuthContext();
  const [selectedId, setSelectedId] = useState('');
  const { busy, setBusy, error, act } = useAuthAction();
  const factors = auth.factors.filter((factor) => factor.verified);
  const selected =
    factors.find((factor) => factor.id === selectedId) ?? factors[0];

  return (
    <AuthPageFrame
      title="Two-factor verification"
      description="Enter the six-digit code from Google Authenticator to continue."
    >
      <p className="muted">{auth.user?.email}</p>
      {auth.recovery && (
        <p className="notice">
          Verify your authenticator before choosing a new password.
        </p>
      )}
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
          key={selected.id}
          onBusyChange={setBusy}
          verify={(code) => auth.verify(selected.id, code)}
        />
      ) : (
        <p role="alert">
          This account requires a factor this app does not support. Use your
          existing recovery or administrator support process.
        </p>
      )}
      <p className="muted">
        If you lost your authenticator, use another enrolled authenticator. A
        password reset does not remove 2FA.
      </p>
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
        Sign out and use another account
      </button>
    </AuthPageFrame>
  );
}
