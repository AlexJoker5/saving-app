import { useState } from 'react';
import { createWorkspaceBackup } from '../utils/workspace-backup.utils';
import type { WorkspaceSnapshot } from '../types/workspace.type';

export function useWorkspaceBackup(snapshot: WorkspaceSnapshot) {
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);

  const download = () => {
    setError('');
    setRequested(false);

    try {
      const backup = createWorkspaceBackup(snapshot);
      const blob = new Blob([backup.contents], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      try {
        link.href = url;
        link.download = backup.filename;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        setRequested(true);
      } finally {
        link.remove();
        // Allow the browser to consume the URL before releasing the blob.
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch {
      setError(
        'Could not prepare your backup. Your workspace has not changed. Try downloading again.',
      );
    }
  };

  return { download, error, requested };
}
