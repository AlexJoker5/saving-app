import { useState } from 'react';
import { SetupForm } from '../../settings/components/SetupForm';
import type { AppState } from '../types/workspace.type';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { useAuthAction } from '../../auth/hooks/useAuthAction';

export function CloudWorkspaceSetup({
  email,
  save,
}: {
  email: string;
  save: (state: AppState) => Promise<void>;
}) {
  const auth = useAuthContext();
  const [saving, setSaving] = useState(false);
  const { busy, error, act } = useAuthAction();

  return (
    <section className="panel setup-panel">
      <p className="eyebrow">Make room for tomorrow</p>
      <h1>Set up your savings</h1>
      <p className="muted">
        Choose your starting balance and monthly saving. Your data will be saved
        to {email}. Complete setup to open your savings app.
      </p>
      <fieldset disabled={busy || saving}>
        <SetupForm
          save={async (next) => {
            setSaving(true);
            try {
              await save(next);
            } finally {
              setSaving(false);
            }
          }}
        />
      </fieldset>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <button
        className="button secondary full-width"
        disabled={busy || saving}
        onClick={() => void act(auth.signOut)}
      >
        Sign out on this device
      </button>
    </section>
  );
}
