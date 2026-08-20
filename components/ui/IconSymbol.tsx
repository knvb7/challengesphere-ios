import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = keyof typeof Ionicons.glyphMap;

type IconSymbolProps = {
  name: string;
  weight?: string;
} & Omit<ComponentProps<typeof Ionicons>, 'name'>;

const ICON_MAP: Record<string, IconName> = {
  'chevron.right': 'chevron-forward',
};

export function IconSymbol({ name, weight: _weight, ...props }: IconSymbolProps) {
  const mappedName = ICON_MAP[name] ?? 'help-circle-outline';
  return <Ionicons name={mappedName} {...props} />;
}
