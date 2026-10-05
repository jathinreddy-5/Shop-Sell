import React from 'react';

interface BrandIconProps {
  className?: string;
}

/**
 * Shop:Sell Brand Bag & Growth Arrow Icon
 * Option 2 brand mark: Silhouette of shopping bag with marketplace growth arrow
 */
export function BrandIcon({ className = 'h-5 w-5' }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Bag Handle */}
      <path
        d="M25 24V17C25 13.134 28.134 10 32 10C35.866 10 39 13.134 39 17V24"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Bag Body */}
      <path
        d="M18 24C18 22.895 18.895 22 20 22H44C45.105 22 46 22.895 46 24V45C46 47.761 43.761 50 41 50H23C20.239 50 18 47.761 18 45V24Z"
        fill="white"
      />
      {/* Growth Arrow in Deep Emerald Brand Accent */}
      <path
        d="M25 40L39 26M39 26H31M39 26V34"
        stroke="#047857"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
