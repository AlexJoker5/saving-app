import { Icon } from '@iconify/react';
import { icons } from '@iconify-json/lucide';

export function AppIcon({ name, size = 20 }: { name: string; size?: number }) {
  const item = icons.icons[name as keyof typeof icons.icons];

  return (
    <Icon
      icon={{ ...item, width: 24, height: 24 }}
      width={size}
      height={size}
      aria-hidden="true"
    />
  );
}
