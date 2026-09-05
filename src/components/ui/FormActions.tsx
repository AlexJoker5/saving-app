import { AppIcon } from './AppIcon';

interface FormActionsProps {
  busy: boolean;
  disabled?: boolean;
  error: string;
  label?: string;
  cancel: () => void;
}

export function FormActions({
  busy,
  disabled = false,
  error,
  label = 'Save',
  cancel,
}: FormActionsProps) {
  return (
    <>
      {error && (
        <p role="alert" className="notice danger">
          {error}
        </p>
      )}
      <div className="form-end">
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={cancel}
        >
          Cancel
        </button>
        <button className="button" disabled={busy || disabled}>
          {busy ? 'Saving…' : label}
          <AppIcon name="arrow-right" size={17} />
        </button>
      </div>
    </>
  );
}
