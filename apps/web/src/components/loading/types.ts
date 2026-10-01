export const LOADER_COLORS = {
  primary: '#6C63FF',
  light: '#6C63FF',
  dark: '#FFFFFF',
  accent: '#FFD60A',
} as const;

export interface LoadingThreeDotsJumpingProps {
  /**
   * Dot color. Falls back to CSS variable --loader-color (default #6C63FF).
   * Contextual tokens: LOADER_COLORS.primary, dark ('#FFFFFF'), accent ('#FFD60A').
   */
  color?: string;
  /**
   * Dot diameter in pixels. Default: 16px.
   */
  size?: number;
  /**
   * Horizontal gap between dots in pixels. Default: 8px.
   */
  gap?: number;
  /**
   * Upward jump travel in pixels. Default: 30px (translateY(-30px)).
   */
  jumpHeight?: number;
  /**
   * Single-cycle duration in seconds. Default: 0.8s.
   */
  duration?: number;
  /**
   * Optional wrapper classes for custom dimensions or padding.
   */
  className?: string;
  /**
   * Accessible description for assistive technology (role="status"). Default: 'Loading'.
   */
  label?: string;
}

export const DEFAULT_LOADER_CONFIG = {
  size: 16,
  gap: 8,
  jumpHeight: 30,
  duration: 0.8,
  label: 'Loading',
  staggerRatio: 0.2,
} as const;

export function getContainerGeometry(size: number, jumpHeight: number, gap: number) {
  return {
    minHeight: size + jumpHeight,
    paddingTop: jumpHeight,
    gap: `${gap}px`,
  };
}

export function getStaggerDelay(index: number, duration: number, ratio: number = 0.2): number {
  return Math.round(index * duration * ratio * 1000) / 1000;
}
