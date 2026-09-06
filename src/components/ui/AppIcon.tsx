import { ArrowRight, Info, Link, Sprout, X } from 'lucide-react';

const icons = {
  'arrow-right': ArrowRight,
  info: Info,
  link: Link,
  sprout: Sprout,
  x: X,
};

export type AppIconName = keyof typeof icons;

export function AppIcon({
  name,
  size = 20,
}: {
  name: AppIconName;
  size?: number;
}) {
  const Icon = icons[name];

  return <Icon size={size} aria-hidden="true" focusable="false" />;
}
