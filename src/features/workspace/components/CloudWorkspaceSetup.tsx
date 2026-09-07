import { useState } from 'react';
import { SetupForm } from '../../settings/components/SetupForm';
import { useLocalImport } from '../hooks/useLocalImport';
import type { AppState } from '../types/workspace.type';

export function CloudWorkspaceSetup({
  email,
  save,
}: {
  email: string;
  save: (state: AppState) => Promise<void>;
}) {
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const local = useLocalImport();
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not prepare your cloud workspace.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel setup-panel">
      <p className="eyebrow">Cloud savings</p>
      <h1>Start your account workspace</h1>
      <p>
        No cloud workspace exists for <strong>{email}</strong> yet. Start fresh
        or copy the personal savings saved in this browser.
      </p>
      <p className="notice">
        Import uploads a copy to this account. Your browser copy stays available
        when signed out and will evolve separately. Existing cloud savings are
        never overwritten by this import.
      </p>
      {fresh ? (
        <SetupForm cancel={() => setFresh(false)} save={save} />
      ) : (
        <>
          {error && (
            <p role="alert" className="notice danger">
              {error}
            </p>
          )}
          <div className="form-end">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setFresh(true)}
            >
              Start fresh
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void act(local.review)}
            >
              {busy ? 'Please wait…' : 'Review local savings'}
            </button>
          </div>
          {local.snapshot && (
            <>
              <h2>Review your import</h2>
              <p>
                {local.snapshot.state.plans.length} plans ·{' '}
                {local.snapshot.state.expenses.length} expenses ·{' '}
                {local.snapshot.state.goals.length} goals
              </p>
              <p>
                All plan entries, contribution schedules, goals, and the monthly
                budget will be copied to <strong>{email}</strong>.
              </p>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void act(async () => save(await local.readReviewed()))
                }
              >
                {busy ? 'Importing…' : 'Confirm and import to this account'}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}
