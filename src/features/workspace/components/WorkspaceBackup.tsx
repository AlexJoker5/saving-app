import { useWorkspaceContext } from '../hooks/useWorkspaceContext';
import { useWorkspaceBackup } from '../hooks/useWorkspaceBackup';

export function WorkspaceBackup() {
  const { state, revision } = useWorkspaceContext();
  const { download, error, requested } = useWorkspaceBackup({
    state,
    revision,
  });

  return (
    <section className="panel setup-panel" aria-labelledby="backup-heading">
      <p className="eyebrow">Keep a copy</p>
      <h2 id="backup-heading">Workspace backup</h2>
      <p>
        Download your plans, savings entries, contribution schedules, expenses,
        goals, and monthly budget together in a JSON file.
      </p>
      <p className="muted">
        Uses the saved workspace currently loaded in this tab. Save any open
        edits first. Recent changes from another tab or device must finish
        loading before they can be included.
      </p>
      <p>
        The file contains your financial records in plain text. Keep it
        somewhere private. Restoring a backup file in Saving is not available
        yet.
      </p>
      {state.demo && (
        <p className="notice">
          You are viewing an example workspace. This download contains sample
          data.
        </p>
      )}
      <button type="button" className="button secondary" onClick={download}>
        Download JSON backup
      </button>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      {requested && (
        <p role="status" className="notice">
          Backup download requested. Check your browser downloads to confirm the
          file was saved.
        </p>
      )}
    </section>
  );
}
