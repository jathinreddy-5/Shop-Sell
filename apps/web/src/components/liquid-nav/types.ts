import React from 'react';
import { UserRole } from '@shop-sell/shared';
import type { LiquidNavVariant } from './notch-path';

export type { LiquidNavVariant };

export interface LiquidNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  requiresAuth?: boolean;
  roles?: UserRole[];
  avatarUrl?: string | null;
  onClick?: () => void;
}

export interface LiquidNavProps {
  items: LiquidNavItem[];
  variant: LiquidNavVariant;
  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}
