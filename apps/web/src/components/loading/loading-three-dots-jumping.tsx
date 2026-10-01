'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  LOADER_COLORS,
  LoadingThreeDotsJumpingProps,
  DEFAULT_LOADER_CONFIG,
  getContainerGeometry,
  getStaggerDelay,
} from './types';

export * from './types';

const DOTS = [0, 1, 2] as const;

/**
 * LoadingThreeDotsJumping
 *
 * Physics-calibrated jumping 3-dots loader using motion/react.
 * Features staggered mirror easing, transform hardware acceleration, zero-layout-shift bounding,
 * and prefers-reduced-motion compliance.
 */
export function LoadingThreeDotsJumping({
  color,
  size = DEFAULT_LOADER_CONFIG.size,
  gap = DEFAULT_LOADER_CONFIG.gap,
  jumpHeight = DEFAULT_LOADER_CONFIG.jumpHeight,
  duration = DEFAULT_LOADER_CONFIG.duration,
  className = '',
  label = DEFAULT_LOADER_CONFIG.label,
}: LoadingThreeDotsJumpingProps) {
  const shouldReduceMotion = useReducedMotion();

  const geometry = getContainerGeometry(size, jumpHeight, gap);

  return (
    <div
      role="status"
      aria-label={label}
      className={`flex items-center justify-center ${className}`.trim()}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* 
        Inner container reserves vertical clearance (size + jumpHeight) and sets
        paddingTop equal to jumpHeight. The dots rest at y=0 at the container bottom;
        when translated up by -jumpHeight they never breach the top boundary, preventing
        any layout shift or height jitter while animating.
      */}
      <div
        className="flex items-center justify-center"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: geometry.minHeight,
          paddingTop: geometry.paddingTop,
          gap: geometry.gap,
        }}
      >
        {DOTS.map((idx) => (
          <motion.span
            key={idx}
            className="rounded-full inline-block"
            style={{
              width: size,
              height: size,
              borderRadius: '9999px',
              backgroundColor: color || 'var(--loader-color, #6C63FF)',
              willChange: 'transform',
            }}
            initial={{ y: 0 }}
            animate={
              shouldReduceMotion
                ? { opacity: [0.3, 1, 0.3] }
                : { y: [0, -jumpHeight] }
            }
            transition={{
              duration,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
              delay: getStaggerDelay(idx, duration, DEFAULT_LOADER_CONFIG.staggerRatio),
            }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default LoadingThreeDotsJumping;
