import { useEffect, useRef, useState } from 'react';
import { MAX_BACKUP_BYTES } from '../schema/workspace-backup.schema';
import { parseWorkspaceBackup } from '../utils/workspace-restore.utils';
import { WorkspaceConflictError } from '../repositories/workspace-repository';
import type { AppState, WorkspaceContext } from '../types/workspace.type';

interface RestoreReview {
  backup: ReturnType<typeof parseWorkspaceBackup>;
  filename: string;
  expectedRevision: number;
  previous: AppState;
}

export function useWorkspaceRestore(
  workspace: WorkspaceContext,
  onRestored: () => void,
) {
  const [review, setReview] = useState<RestoreReview | null>(null);
  const [busy, setBusy] = useState<'reading' | 'restoring' | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const operation = useRef(0);
  const restoring = useRef(false);

  useEffect(
    () => () => {
      operation.current += 1;
    },
    [],
  );

  const select = async (file: File) => {
    if (restoring.current) {
      return;
    }
    const request = ++operation.current;
    setReview(null);
    setError('');
    setConflict(false);
    setBusy('reading');
    try {
      if (file.size === 0 || file.size > MAX_BACKUP_BYTES) {
        throw new Error(
          'Choose a non-empty Saving backup file no larger than 20 MiB.',
        );
      }
      const contents = await file.text();
      if (request !== operation.current) {
        return;
      }
      const backup = parseWorkspaceBackup(contents);
      setReview({
        backup,
        filename: file.name,
        expectedRevision: workspace.revision,
        previous: workspace.state,
      });
    } catch (caught) {
      if (request === operation.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Could not read this backup file.',
        );
      }
    } finally {
      if (request === operation.current) {
        setBusy(null);
      }
    }
  };

  const cancel = () => {
    if (restoring.current) {
      return;
    }
    operation.current += 1;
    setReview(null);
    setBusy(null);
    setError('');
    setConflict(false);
  };

  const reviewCurrent = () => {
    if (!review || busy) {
      return;
    }
    setReview({
      ...review,
      expectedRevision: workspace.revision,
      previous: workspace.state,
    });
    setError('');
    setConflict(false);
  };

  const changed = Boolean(
    review &&
    (conflict ||
      review.expectedRevision !== workspace.revision ||
      review.previous !== workspace.state),
  );

  const restore = async (confirmedReview: RestoreReview) => {
    if (
      restoring.current ||
      busy ||
      !review ||
      confirmedReview !== review ||
      changed
    ) {
      return;
    }
    restoring.current = true;
    const request = ++operation.current;
    setBusy('restoring');
    setError('');
    try {
      await workspace.commit(
        (current) => {
          if (JSON.stringify(current) !== JSON.stringify(review.previous)) {
            throw new WorkspaceConflictError();
          }

          return review.backup.snapshot.state;
        },
        review.expectedRevision,
        () => {
          if (request === operation.current) {
            setConflict(true);
          }
        },
      );
      if (request === operation.current) {
        setReview(null);
        onRestored();
      }
    } catch (caught) {
      if (request === operation.current) {
        if (caught instanceof WorkspaceConflictError) {
          setConflict(true);
        }
        setError(
          caught instanceof Error
            ? caught.message
            : 'Restore could not be confirmed. Reload your workspace before trying again.',
        );
      }
    } finally {
      restoring.current = false;
      if (request === operation.current) {
        setBusy(null);
      }
    }
  };

  return {
    review,
    busy,
    error,
    changed,
    select,
    cancel,
    reviewCurrent,
    restore,
  };
}
