import type { ReactNode } from 'react';

export function AuthPageFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel setup-panel account-panel">
      <p className="eyebrow">Your account</p>
      <h1>{title}</h1>
      {description && <p className="muted">{description}</p>}
      {children}
    </section>
  );
}
