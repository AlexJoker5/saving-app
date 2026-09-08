import { useEffect, useRef, useState } from 'react';
import {
  LocalWorkspaceRepository,
  LocalRecoveryConflictError,
} from '../repositories/local-workspace-repository';
import { MAX_BACKUP_BYTES } from '../schema/workspace-backup.schema';
import { parseWorkspaceBackup } from '../utils/workspace-restore.utils';
import type { WorkspaceSnapshot } from '../types/workspace.type';

const repository = new LocalWorkspaceRepository();
interface RecoveryReview {
  raw: string;
  filename: string;
  backup: ReturnType<typeof parseWorkspaceBackup>;
}

export function useLocalWorkspaceRecovery(
  onRecovered: (snapshot: WorkspaceSnapshot) => Promise<void>,
) {
  const [original, setOriginal] = useState<string | null>(null);
  const [review, setReview] = useState<RecoveryReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const [error, setError] = useState('');
  const [recovered, setRecovered] = useState(false);
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === repository.key || event.key === null) {
        setChanged(true);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      operation.current += 1;
      controller.current?.abort();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const start = () => {
    if (saving.current) {
      return;
    }
    operation.current += 1;
    setReview(null);
    setOriginal(null);
    setRecovered(false);
    setBusy(false);
    setError('');
    try {
      setOriginal(repository.readUnreadable());
      setChanged(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Local storage could not be read.',
      );
    }
  };

  const select = async (file: File) => {
    if (saving.current || original === null) {
      return;
    }
    const request = ++operation.current;
    setReview(null);
    setBusy(true);
    setError('');
    try {
      if (file.size === 0 || file.size > MAX_BACKUP_BYTES) {
        throw new Error(
          'Choose a non-empty Saving JSON backup no larger than 20 MiB.',
        );
      }
      const contents = await file.text();
      if (request !== operation.current) {
        return;
      }
      const backup = parseWorkspaceBackup(contents);
      setReview({ raw: original, filename: file.name, backup });
    } catch (caught) {
      if (request === operation.current) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'The backup file could not be read.',
        );
      }
    } finally {
      if (request === operation.current) {
        setBusy(false);
      }
    }
  };

  const recover = async (confirmed: RecoveryReview) => {
    if (!review || confirmed !== review || busy || changed || saving.current) {
      return;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    const request = ++operation.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await repository.recover(
        review.backup.snapshot.state,
        review.raw,
        abort.signal,
      );
      if (request !== operation.current) {
        return;
      }
      setRecovered(true);
      setReview(null);
      try {
        await onRecovered(result.snapshot);
      } catch {
        if (request === operation.current) {
          setError(
            'Recovery was saved, but the view could not refresh. Reload Saving to open it.',
          );
        }
      }
    } catch (caught) {
      if (request === operation.current) {
        if (caught instanceof LocalRecoveryConflictError) {
          setChanged(true);
        }
        setError(
          caught instanceof Error
            ? caught.message
            : 'Recovery could not be completed. The original data has been kept.',
        );
      }
    } finally {
      saving.current = false;
      if (request === operation.current) {
        setBusy(false);
      }
    }
  };

  const cancel = () => {
    if (saving.current) {
      return;
    }
    operation.current += 1;
    setReview(null);
    setOriginal(null);
    setError('');
    setRecovered(false);
    setBusy(false);
  };

  return {
    original,
    review,
    busy,
    changed,
    error,
    recovered,
    start,
    select,
    recover,
    cancel,
  };
}
