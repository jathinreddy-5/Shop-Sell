export type LiquidNavVariant = 'bottom' | 'top' | 'side';

export interface NotchPathParams {
  variant: LiquidNavVariant;
  width: number;
  height: number;
  center: number;
  notchRadius?: number;
  notchDepth?: number;
  stretch?: number;
}

export const DEFAULT_NOTCH_CONFIG = {
  radius: 38,
  depth: 26,
  durationMs: 550,
  activeYellow: '#FFE500',
};

/**
 * Computes an elastic / spring easing value for normalized time t in [0, 1].
 * Implements cubic-bezier(0.34, 1.56, 0.64, 1) with overshoot and settle.
 */
export function springEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  // Solving cubic-bezier(0.34, 1.56, 0.64, 1)
  const p1x = 0.34;
  const p1y = 1.56;
  const p2x = 0.64;
  const p2y = 1.0;

  let start = 0;
  let end = 1;
  for (let i = 0; i < 10; i++) {
    const mid = (start + end) / 2;
    const x =
      3 * (1 - mid) * (1 - mid) * mid * p1x +
      3 * (1 - mid) * mid * mid * p2x +
      mid * mid * mid;
    if (x < t) start = mid;
    else end = mid;
  }
  const u = (start + end) / 2;
  return (
    3 * (1 - u) * (1 - u) * u * p1y +
    3 * (1 - u) * u * u * p2y +
    u * u * u
  );
}

/**
 * Generates an organic, GPU-friendly single SVG path `d` attribute with a smooth
 * liquid U-shaped notch cutout for bottom, top, or side variants.
 */
export function generateNotchPath({
  variant,
  width,
  height,
  center,
  notchRadius = DEFAULT_NOTCH_CONFIG.radius,
  notchDepth = DEFAULT_NOTCH_CONFIG.depth,
  stretch = 1.0,
}: NotchPathParams): string {
  const W = Math.max(1, width);
  const H = Math.max(1, height);
  const R = Math.max(16, notchRadius * Math.max(0.8, stretch));
  const D = Math.max(10, notchDepth);
  const C = center;

  if (C === undefined || C === null || C < 0) {
    return `M 0 0 L ${W.toFixed(2)} 0 L ${W.toFixed(2)} ${H.toFixed(2)} L 0 ${H.toFixed(2)} Z`;
  }

  if (variant === 'bottom') {
    // Notch on top edge (y = 0), dipping down into the bar to +D
    const x0 = C - R;
    const x1 = C + R;

    const cp1x = C - R + R * 0.38;
    const cp1y = 0;
    const cp2x = C - R * 0.45;
    const cp2y = D;

    const cp3x = C + R * 0.45;
    const cp3y = D;
    const cp4x = C + R - R * 0.38;
    const cp4y = 0;

    return `M 0 0 L ${x0.toFixed(2)} 0 C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${C.toFixed(2)} ${D.toFixed(2)} C ${cp3x.toFixed(2)} ${cp3y.toFixed(2)}, ${cp4x.toFixed(2)} ${cp4y.toFixed(2)}, ${x1.toFixed(2)} 0 L ${W.toFixed(2)} 0 L ${W.toFixed(2)} ${H.toFixed(2)} L 0 ${H.toFixed(2)} Z`;
  }

  if (variant === 'top') {
    // Notch on bottom edge (y = H), arching upward into the bar to H - D
    const x0 = C - R;
    const x1 = C + R;

    const cp1x = C + R - R * 0.38;
    const cp1y = H;
    const cp2x = C + R * 0.45;
    const cp2y = H - D;

    const cp3x = C - R * 0.45;
    const cp3y = H - D;
    const cp4x = C - R + R * 0.38;
    const cp4y = H;

    return `M 0 0 L ${W.toFixed(2)} 0 L ${W.toFixed(2)} ${H.toFixed(2)} L ${x1.toFixed(2)} ${H.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${C.toFixed(2)} ${(H - D).toFixed(2)} C ${cp3x.toFixed(2)} ${cp3y.toFixed(2)}, ${cp4x.toFixed(2)} ${cp4y.toFixed(2)}, ${x0.toFixed(2)} ${H.toFixed(2)} L 0 ${H.toFixed(2)} Z`;
  }

  // variant === 'side'
  // Notch on right edge (x = W), arching leftward/inward into the rail to W - D
  const y0 = C - R;
  const y1 = C + R;

  const cp1x = W;
  const cp1y = C - R + R * 0.38;
  const cp2x = W - D;
  const cp2y = C - R * 0.45;

  const cp3x = W - D;
  const cp3y = C + R * 0.45;
  const cp4x = W;
  const cp4y = C + R - R * 0.38;

  return `M 0 0 L ${W.toFixed(2)} 0 L ${W.toFixed(2)} ${y0.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${(W - D).toFixed(2)} ${C.toFixed(2)} C ${cp3x.toFixed(2)} ${cp3y.toFixed(2)}, ${cp4x.toFixed(2)} ${cp4y.toFixed(2)}, ${W.toFixed(2)} ${y1.toFixed(2)} L ${W.toFixed(2)} ${H.toFixed(2)} L 0 ${H.toFixed(2)} Z`;
}

/**
 * Deterministic liquid SVG path generator.
 * Produces an identical SVG command structure (M, L, C, C, L, ...) regardless
 * of the active center coordinate, ensuring Motion can smoothly interpolate
 * between navigation states without snapping.
 */
export function createLiquidPath(
  variant: LiquidNavVariant,
  width: number,
  height: number,
  center: number
): string {
  return generateNotchPath({
    variant,
    width,
    height,
    center: Math.max(0, center),
    notchRadius: DEFAULT_NOTCH_CONFIG.radius,
    notchDepth: DEFAULT_NOTCH_CONFIG.depth,
    stretch: 1.0,
  });
}

