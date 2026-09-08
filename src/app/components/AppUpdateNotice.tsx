import { useLocation } from 'react-router';
import { useRef, useState } from 'react';
import { useAppUpdate } from '../hooks/useAppUpdate';

export function AppUpdateNotice() {
  const settings = useLocation().pathname === '/settings';
  const { supported, available, checking, applying, message, check, apply } =
    useAppUpdate();
  const [dismissed, setDismissed] = useState(false);
  const reopen = useRef<HTMLButtonElement>(null);

  if (!supported) {
    return null;
  }

  return (
    <div className="app-update-controls">
      {settings && (
        <button
          className="button secondary"
          disabled={checking || applying}
          onClick={check}
        >
          {checking ? 'Checking for updates…' : 'Check for updates'}
        </button>
      )}
      {settings && available && dismissed && (
        <button
          ref={reopen}
          className="button secondary"
          onClick={() => setDismissed(false)}
        >
          Update available
        </button>
      )}
      {settings && message && (!available || dismissed) && (
        <p role="status">{message}</p>
      )}
      {available && !dismissed && (
        <aside className="app-update-notice" aria-labelledby="app-update-title">
          <div role="status">
            <h2 id="app-update-title">New version available</h2>
            <p>
              Reload this tab when you’ve saved unfinished changes. Saved
              savings stay in your account. Other tabs will wait for you to
              update them.
            </p>
          </div>
          {message && <p role="status">{message}</p>}
          <div className="entry-actions">
            <button
              className="button secondary"
              disabled={applying}
              onClick={() => {
                setDismissed(true);
                requestAnimationFrame(() => reopen.current?.focus());
              }}
            >
              Later
            </button>
            <button className="button" disabled={applying} onClick={apply}>
              {applying ? 'Updating…' : 'Update now'}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
