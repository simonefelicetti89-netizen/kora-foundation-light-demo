'use client';

// components/auth/PrivilegedAccessBanner.tsx
// B168 Phase 3 stub — Phase 5 aggiunge stile Hanken Grotesk completo.
// Sticky top, non dismissibile. Mostra sempre il contesto di accesso privilegiato.

import type { BannerVariant } from '@/lib/auth/access-matrix';

const BANNER_TEXT: Record<BannerVariant, string> = {
  amber:     'DEMO ENVIRONMENT — Dati sintetici — Accesso KORA service team',
  navy:      'Accesso KORA service team — Azione registrata in audit log',
  blueprint: 'FUTURE ENVIRONMENT — Vista forecast',
};

const BANNER_CLASSES: Record<BannerVariant, string> = {
  amber:     'bg-amber-50 border-amber-300 text-amber-900',
  navy:      'bg-blue-950 border-blue-700 text-blue-100',
  blueprint: 'bg-indigo-50 border-indigo-300 text-indigo-900',
};

interface Props {
  variant: BannerVariant;
}

export function PrivilegedAccessBanner({ variant }: Props) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`sticky top-0 z-50 w-full border-b px-4 py-2 text-center text-sm font-medium ${BANNER_CLASSES[variant]}`}
    >
      {BANNER_TEXT[variant]}
    </div>
  );
}
