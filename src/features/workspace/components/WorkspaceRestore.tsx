import { useState } from 'react';
import { money } from '../../../lib/money';
import { useWorkspaceRestore } from '../hooks/useWorkspaceRestore';
import type { WorkspaceContext } from '../types/workspace.type';

export function WorkspaceRestore({
  workspace,
  onRestored,
  empty = false,
}: {
  workspace: WorkspaceContext;
  onRestored: () => void;
  empty?: boolean;
}) {
  const restore = useWorkspaceRestore(workspace, onRestored);
  const [consent, setConsent] = useState<typeof restore.review>(null);
  const { review, busy, changed } = restore;
  const incoming = review?.backup.snapshot.state;
  const rows =
    review && incoming
      ? [
          [
            'Plans',
            empty ? 0 : review.previous.plans.length,
            incoming.plans.length,
          ],
          [
            'Savings entries (all plans)',
            empty
              ? 0
              : review.previous.plans.reduce(
                  (total, plan) => total + plan.entries.length,
                  0,
                ),
            incoming.plans.reduce(
              (total, plan) => total + plan.entries.length,
              0,
            ),
          ],
          [
            'Expenses',
            empty ? 0 : review.previous.expenses.length,
            incoming.expenses.length,
          ],
          [
            'Goals',
            empty ? 0 : review.previous.goals.length,
            incoming.goals.length,
          ],
          [
            'Monthly budget (MMK)',
            empty ? '—' : money(review.previous.budget),
            money(incoming.budget),
          ],
        ]
      : [];

  return (
    <section className="panel setup-panel" aria-labelledby="restore-heading">
      <h2 id="restore-heading">Restore a backup</h2>
      <p>
        Choose a Saving JSON backup, up to 20 MiB. The file is read on this
        device for review. Confirming replaces the entire destination workspace;
        records are not merged.
      </p>
      <p className="backup-filename">
        Destination: <strong>{workspace.destination}</strong>
      </p>
      {empty && (
        <p className="notice">
          No cloud workspace exists yet. Restoring creates it from your backup.
        </p>
      )}
      {!empty && workspace.state.demo && (
        <p className="notice">Your current workspace contains sample data.</p>
      )}
      <p className="muted">
        Download a backup of your current savings first if you want to keep
        them. Unsaved edits are not included in the replacement. Cloud
        restoration requires an internet connection.
      </p>
      <label className="field">
        <span>Saving backup file</span>
        <input
          type="file"
          accept=".json,application/json"
          disabled={Boolean(busy)}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            setConsent(null);
            if (file) {
              void restore.select(file);
            }
          }}
        />
      </label>
      {busy === 'reading' && <p role="status">Reading backup…</p>}
      {restore.error && (
        <p role="alert" className="notice danger">
          {restore.error}
        </p>
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
              {incoming.plans.find((plan) => plan.id === incoming.mainId)?.name}
            </strong>
          </p>
          {incoming.demo && (
            <p className="notice">
              This backup contains an example workspace. Restoring it replaces
              your destination with sample data.
            </p>
          )}
          <div className="backup-comparison">
            <table>
              <caption>
                Saved workspace compared with the selected backup
              </caption>
              <thead>
                <tr>
                  <th scope="col">Contents</th>
                  <th scope="col">Current</th>
                  <th scope="col">Backup</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, previous, next]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{previous}</td>
                    <td>{next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            All plans, entries, schedules, month adjustments, expenses, goals,
            and the budget will be replaced. Account sign-in and authenticator
            settings stay the same.
          </p>
          {changed && (
            <p role="alert" className="notice">
              Your destination workspace changed. Review its latest contents
              before confirming again.
            </p>
          )}
          {changed && (
            <button
              type="button"
              className="button secondary"
              disabled={Boolean(busy)}
              onClick={() => {
                setConsent(null);
                restore.reviewCurrent();
              }}
            >
              Review latest workspace
            </button>
          )}
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={consent === review && !changed}
              disabled={Boolean(busy) || changed}
              onChange={(event) =>
                setConsent(event.target.checked ? review : null)
              }
            />
            <span>
              I understand this replaces all savings data in the destination
              workspace.
            </span>
          </label>
          <div className="form-end">
            <button
              type="button"
              className="button secondary"
              disabled={Boolean(busy)}
              onClick={() => {
                setConsent(null);
                restore.cancel();
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button"
              disabled={Boolean(busy) || changed || consent !== review}
              onClick={() => {
                if (consent === review) {
                  void restore.restore(review);
                }
              }}
            >
              {busy === 'restoring'
                ? 'Restoring…'
                : 'Replace workspace from backup'}
            </button>
          </div>
          {busy === 'restoring' && (
            <p role="status">Saving the replacement workspace…</p>
          )}
        </>
      )}
    </section>
  );
}
