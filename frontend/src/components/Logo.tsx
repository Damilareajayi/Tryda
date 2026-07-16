'use client';
import { useId } from 'react';

// Tryda mark — gem/shield diamond with integrated "T" monogram.
// Local coordinate box: x:[8,92] y:[10,96], centered in a 200x200 viewBox.
export function Logo({ size = 32 }: { size?: number }) {
  const gradId = `logoGem-${useId()}`;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id={gradId} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ECDC4" />
          <stop offset="55%" stopColor="#2AAFBD" />
          <stop offset="100%" stopColor="#0F4F6A" />
        </linearGradient>
      </defs>
      <g transform="translate(32.50,28.45)scale(1.35)">
        <path d="M28,10 L72,10 L92,42 L50,96 L8,42 Z" fill={`url(#${gradId})`} />
        <rect x="36" y="29" width="32" height="6" rx="3" fill="#FFFFFF" />
        <rect x="49" y="29" width="6" height="38" rx="3" fill="#FFFFFF" />
        <path d="M52,64 C38,64 36,83 52,82 C63,81 60,66 52,64 Z" fill="#FFFFFF" />
      </g>
    </svg>
  );
}