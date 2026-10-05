export type SheetSnapState = 'closed' | 'peek' | 'half' | 'full';

export interface SheetDimensions {
  containerHeight: number;
  peekHeight: number;
  halfRatio: number;
  fullRatio: number;
}

export const DEFAULT_SHEET_DIMENSIONS: SheetDimensions = {
  containerHeight: 640,
  peekHeight: 76,
  halfRatio: 0.5,
  fullRatio: 0.88,
};

export const sheetSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 32,
  mass: 0.8,
};

/**
 * Calculates the translateY offset for a given snap state.
 * Returns how many pixels the sheet should translate downwards from its maximum expanded height.
 */
export function getSnapTranslateY(
  state: SheetSnapState,
  dims: SheetDimensions = DEFAULT_SHEET_DIMENSIONS
): number {
  const fullHeight = dims.containerHeight * dims.fullRatio;
  const halfHeight = dims.containerHeight * dims.halfRatio;

  switch (state) {
    case 'full':
      return 0;
    case 'half':
      return Math.max(0, fullHeight - halfHeight);
    case 'peek':
      return Math.max(0, fullHeight - dims.peekHeight);
    case 'closed':
      return fullHeight + 40;
    default:
      return Math.max(0, fullHeight - dims.peekHeight);
  }
}

/**
 * Determines the next snap point given drag velocity, delta movement, and current snap.
 */
export function resolveSnapPoint(params: {
  currentTranslateY: number;
  velocityY: number;
  currentSnap: SheetSnapState;
  dims?: SheetDimensions;
  allowClose?: boolean;
}): SheetSnapState {
  const {
    currentTranslateY,
    velocityY,
    currentSnap,
    dims = DEFAULT_SHEET_DIMENSIONS,
    allowClose = false,
  } = params;

  // High velocity flick gesture threshold (px/s)
  const FLICK_VELOCITY = 320;

  if (velocityY < -FLICK_VELOCITY) {
    // Flicked UP
    if (currentSnap === 'closed') return 'peek';
    if (currentSnap === 'peek') return 'half';
    return 'full';
  }

  if (velocityY > FLICK_VELOCITY) {
    // Flicked DOWN
    if (currentSnap === 'full') return 'half';
    if (currentSnap === 'half') return 'peek';
    if (currentSnap === 'peek') return allowClose ? 'closed' : 'peek';
    return 'closed';
  }

  // Positional closest snap point
  const targetFull = getSnapTranslateY('full', dims);
  const targetHalf = getSnapTranslateY('half', dims);
  const targetPeek = getSnapTranslateY('peek', dims);
  const targetClosed = getSnapTranslateY('closed', dims);

  const candidates: Array<{ snap: SheetSnapState; dist: number }> = [
    { snap: 'full', dist: Math.abs(currentTranslateY - targetFull) },
    { snap: 'half', dist: Math.abs(currentTranslateY - targetHalf) },
    { snap: 'peek', dist: Math.abs(currentTranslateY - targetPeek) },
  ];

  if (allowClose) {
    candidates.push({ snap: 'closed', dist: Math.abs(currentTranslateY - targetClosed) });
  }

  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0].snap;
}
