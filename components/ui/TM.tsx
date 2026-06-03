'use client';

import type { ReactNode } from 'react';

interface TMProps {
  children: ReactNode;
  className?: string;
}

// Reusable trademark superscript for proprietary KORA concepts.
// Usage: <TM>KORA Index</TM>  →  renders "KORA Index™"
export function TM({ children, className }: TMProps) {
  return (
    <span className={className}>
      {children}
      <sup className="tm-mark">™</sup>
    </span>
  );
}
