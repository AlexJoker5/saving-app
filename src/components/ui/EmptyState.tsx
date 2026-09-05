import type { ReactNode } from 'react';
import { AppIcon } from './AppIcon';

interface EmptyStateProps {
  icon?: string;
  title: string;
  children: ReactNode;
}

export function EmptyState({
  icon = 'sprout',
  title,
  children,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="icon-tile">
        <AppIcon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
