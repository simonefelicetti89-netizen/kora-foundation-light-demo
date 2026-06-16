'use client';
// components/commons/InitiativesMapClient.tsx
// B165/Vercel-fix — Wrapper Client Component per InitiativesMap con dynamic import ssr:false.
//
// Motivo: Next.js 16 + Turbopack NON permette dynamic({ ssr: false }) in Server Components.
// Soluzione: il dynamic import risiede in questo Client Component; la page server importa
// solo questo wrapper (che è safe per Turbopack perché è un Client Component).

import dynamic from 'next/dynamic';
import type { CommonsPostWorkerView } from '@/lib/commons/types';

const InitiativesMapLazy = dynamic(
  () => import('@/components/commons/InitiativesMap').then((m) => m.InitiativesMap),
  {
    ssr:     false,
    loading: () => (
      <div
        style={{
          height:         360,
          borderRadius:   12,
          background:     'rgba(6,3,43,0.03)',
          border:         '1px solid rgba(6,3,43,0.08)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       12,
          color:          'rgba(6,3,43,0.35)',
        }}
      >
        Caricamento mappa…
      </div>
    ),
  },
);

interface Props {
  initiatives: CommonsPostWorkerView[];
  height?:     number;
}

export function InitiativesMapClient({ initiatives, height }: Props) {
  return <InitiativesMapLazy initiatives={initiatives} height={height} />;
}
