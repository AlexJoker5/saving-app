import { useState } from 'react';

export function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (action: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not finish. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return { busy, setBusy, error, act };
}
