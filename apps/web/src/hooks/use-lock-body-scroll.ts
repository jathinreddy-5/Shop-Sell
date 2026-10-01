'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to lock body scrolling without layout shift.
 * Compensates for scrollbar width when hiding overflow.
 */
export function useLockBodyScroll(isLocked: boolean): void {
  const originalStylesRef = useRef<{
    overflow: string;
    paddingRight: string;
  }>({
    overflow: '',
    paddingRight: '',
  });

  useEffect(() => {
    if (!isLocked || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const computedBody = window.getComputedStyle(body);

    // Save previous inline styles
    originalStylesRef.current = {
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    // Calculate actual scrollbar width to prevent desktop layout jump
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const existingPaddingRight = parseFloat(computedBody.paddingRight) || 0;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${existingPaddingRight + scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = originalStylesRef.current.overflow;
      body.style.paddingRight = originalStylesRef.current.paddingRight;
    };
  }, [isLocked]);
}
