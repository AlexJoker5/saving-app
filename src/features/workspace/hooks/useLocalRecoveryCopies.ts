import { useState } from 'react';
import { LocalWorkspaceRepository } from '../repositories/local-workspace-repository';
import { useRecoveryDownload } from './useRecoveryDownload';

const repository = new LocalWorkspaceRepository();

export function useLocalRecoveryCopies() {
  const [copies, setCopies] = useState<ReturnType<
    typeof repository.listRecoveryCopies
  > | null>(null);
  const [error, setError] = useState('');
  const download = useRecoveryDownload();
  const refresh = () => {
    setError('');
    try {
      setCopies(repository.listRecoveryCopies());
    } catch {
      setError(
        'Preserved originals could not be listed. Check browser storage access and retry.',
      );
    }
  };

  return {
    copies,
    error,
    refresh,
    message: download.message,
    downloadError: download.error,
    download: (key: string) =>
      download.download(() => repository.readRecoveryCopy(key)),
  };
}
