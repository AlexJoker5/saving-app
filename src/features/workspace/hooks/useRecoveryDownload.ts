import { useState } from 'react';

export function useRecoveryDownload() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const download = (read: () => string) => {
    setMessage('');
    setError('');
    try {
      const raw = read();
      const link = document.createElement('a');
      const url = URL.createObjectURL(
        new Blob([raw], { type: 'text/plain;charset=utf-8' }),
      );
      try {
        link.href = url;
        link.download = `saving-unreadable-original-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        setMessage(
          'Original-data download requested. Check your browser downloads. This is unreadable data, not a validated Saving backup.',
        );
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The original data could not be downloaded.',
      );
    }
  };

  return { download, message, error };
}
