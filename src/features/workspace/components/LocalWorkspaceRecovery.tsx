import { useState } from 'react';
import { useLocalWorkspaceRecovery } from '../hooks/useLocalWorkspaceRecovery';
import { useRecoveryDownload } from '../hooks/useRecoveryDownload';
import { money } from '../../../lib/money';
import type { WorkspaceSnapshot } from '../types/workspace.type';

export function LocalWorkspaceRecovery({
  available,
  onRecovered,
}: {
  available: boolean;
  onRecovered: (snapshot: WorkspaceSnapshot) => Promise<void>;
}) {
  const recovery = useLocalWorkspaceRecovery(onRecovered);
  const download = useRecoveryDownload();
  const [consent, setConsent] = useState<typeof recovery.review>(null);
  const { original, review, busy, changed, recovered } = recovery;
  const incoming = review?.backup.snapshot.state;

  if (!available && original === null) {
    return null;
  }

  return (
    <section className="panel setup-panel" aria-labelledby="recovery-heading">
      <h2 id="recovery-heading">
        {recovered ? 'Local savings recovered' : 'Recover local savings'}
      </h2>
      {recovered ? (
        <p role="status">
          Your backup has replaced the unreadable local workspace. An exact copy
          of the original data is preserved in this browser. You can download it
          here or later from Settings.
        </p>
      ) : (
        <>
          <p>
            Destination: <strong>Local workspace in this browser</strong>
          </p>
          <p>
            The saved data cannot be read as a workspace. Recover it using a
            Saving JSON backup. Before replacement, the original text will be
            preserved in a separate browser copy.
          </p>
          <p className="muted">
            Recovery stops if the original changes or cannot be preserved. Keep
            downloaded originals private; they may contain financial records.
          </p>
        </>
      )}
      {recovery.error && (
        <p role="alert" className="notice danger">
          {recovery.error}
        </p>
      )}
      {original === null && available && (
        <button
          type="button"
          className="button"
          onClick={() => {
            setConsent(null);
            recovery.start();
          }}
        >
          Recover from backup
        </button>
      )}
      {original !== null && (
        <>
          <button
            type="button"
            className="button secondary"
            onClick={() => download.download(() => original)}
          >
            Download original data
          </button>
          {download.error && (
            <p role="alert" className="notice danger">
              {download.error}
            </p>
          )}
          {download.message && (
            <p role="status" className="notice">
              {download.message}
            </p>
          )}
        </>
      )}
      {original !== null && !recovered && (
        <>
          <label className="field">
            <span>Saving backup file (up to 20 MiB)</span>
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy || changed || !available}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                setConsent(null);
                if (file) {
                  void recovery.select(file);
                }
              }}
            />
          </label>
          {(changed || !available) && (
            <p role="alert" className="notice">
              The local data changed. Use Try again to reload it, or restart
              recovery to review the current unreadable data.
            </p>
          )}
          {changed && available && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setConsent(null);
                recovery.start();
              }}
            >
              Restart recovery review
            </button>
          )}
          {review && incoming && (
            <>
              <h3>Review replacement</h3>
              <p className="backup-filename">File: {review.filename}</p>
              <p>
                Exported:{' '}
                {new Intl.DateTimeFormat('en', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Yangon',
                }).format(new Date(review.backup.exportedAt))}{' '}
                (Myanmar time)
              </p>
              <p className="backup-filename">
                Backup Main plan:{' '}
                <strong>
                  {
                    incoming.plans.find((plan) => plan.id === incoming.mainId)
                      ?.name
                  }
                </strong>
              </p>
              <p>
                {incoming.plans.length} plans · {incoming.expenses.length}{' '}
                expenses · {incoming.goals.length} goals · Monthly budget:{' '}
                {money(incoming.budget)} MMK
              </p>
              <p>
                All backup plans, entries, schedules, month adjustments,
                expenses, goals, and budget will replace the unreadable
                workspace. Current totals are unavailable. Nothing is merged.
              </p>
              {incoming.demo && (
                <p className="notice">
                  This backup contains sample data. Recovery will replace your
                  workspace with an example.
                </p>
              )}
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  disabled={busy || changed || !available}
                  checked={consent === review && !changed && available}
                  onChange={(event) =>
                    setConsent(event.target.checked ? review : null)
                  }
                />
                <span>
                  I understand that recovery preserves the unreadable original
                  and replaces my local workspace with this backup.
                </span>
              </label>
              <button
                type="button"
                className="button"
                disabled={busy || changed || !available || consent !== review}
                onClick={() => {
                  if (consent === review && available) {
                    void recovery.recover(review);
                  }
                }}
              >
                Preserve original and recover
              </button>
            </>
          )}
          {busy && <p role="status">Preparing recovery…</p>}
        </>
      )}
      {original !== null && (
        <div className="form-end">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setConsent(null);
              recovery.cancel();
            }}
          >
            {recovered ? 'Dismiss' : 'Cancel recovery'}
          </button>
        </div>
      )}
    </section>
  );
}
