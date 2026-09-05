import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, error, children, hint }: FieldProps) {
  return (
    <label className={'field' + (error ? ' invalid' : '')}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
      {error && (
        <small role="alert" className="error-text">
          {error}
        </small>
      )}
    </label>
  );
}
