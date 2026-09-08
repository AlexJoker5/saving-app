import { useLocalRecoveryCopies } from '../hooks/useLocalRecoveryCopies';

export function LocalRecoveryCopies() {
  const recovery = useLocalRecoveryCopies();

  return (
    <section
      className="panel setup-panel"
      aria-labelledby="recovery-copies-heading"
    >
      <h2 id="recovery-copies-heading">Preserved local originals</h2>
      <p>
        Recovery keeps the unreadable original in this browser before replacing
        it. Download these copies if you need them for later repair. They may
        contain financial records and are not validated Saving backups.
      </p>
      <button
        type="button"
        className="button secondary"
        onClick={recovery.refresh}
      >
        {recovery.copies === null
          ? 'Show preserved originals'
          : 'Refresh preserved originals'}
      </button>
      {recovery.error && (
        <p role="alert" className="notice danger">
          {recovery.error}
        </p>
      )}
      {recovery.copies?.length === 0 && (
        <p role="status">No preserved originals were found in this browser.</p>
      )}
      {recovery.copies && recovery.copies.length > 0 && (
        <ul className="promotion-differences">
          {recovery.copies.map((copy) => (
            <li key={copy.key}>
              <button
                type="button"
                className="button secondary"
                onClick={() => recovery.download(copy.key)}
              >
                Download original —{' '}
                {Number.isNaN(Date.parse(copy.createdAt))
                  ? 'Unknown date'
                  : new Intl.DateTimeFormat('en', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Yangon',
                    }).format(new Date(copy.createdAt))}
              </button>
            </li>
          ))}
        </ul>
      )}
      {recovery.downloadError && (
        <p role="alert" className="notice danger">
          {recovery.downloadError}
        </p>
      )}
      {recovery.message && (
        <p role="status" className="notice">
          {recovery.message}
        </p>
      )}
      <p className="muted">
        Dates use Myanmar time. These copies are stored locally; clearing site
        data removes them.
      </p>
    </section>
  );
}
