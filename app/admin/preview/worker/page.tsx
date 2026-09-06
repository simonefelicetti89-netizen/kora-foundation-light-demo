// app/admin/preview/worker/page.tsx
// B-WORKER-3: KORA_ADMIN worker-space preview hub.
//
// Replaces the admin pipeline console's "My KORA Preview (Worker Space)"
// bridge into /my-kora (a transitional, CONSOLIDATE-status surface — D-D,
// 2026-09-06) with a link into this existing, real-auth admin preview
// pattern (requireKoraAdmin, synthetic/illustrative content, non-suppressible
// banners — see the 3 preview pages this links to). No new preview engine,
// no synthetic scoring, no worker-private data exposure.
//
// Access: KORA_ADMIN only (requireKoraAdmin enforced).

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Admin Preview — Worker Space · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PREVIEW_PAGES = [
  { href: '/admin/preview/worker/dynamic-cv',   label: 'Dynamic Impact CV',     description: 'Anteprima del portfolio di impatto worker.' },
  { href: '/admin/preview/worker/opportunities', label: 'Opportunità',          description: 'Anteprima del catalogo partner informativo.' },
  { href: '/admin/preview/worker/privacy',       label: 'Privacy & Condivisione', description: 'Anteprima dei confini privacy del worker.' },
];

export default async function AdminPreviewWorkerHubPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  return (
    <div
      data-testid="admin-preview-worker-hub"
      style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      <div
        data-testid="admin-preview-worker-hub-banner"
        style={{
          background: 'rgba(199,111,61,0.09)', border: '1.5px solid rgba(199,111,61,0.35)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: '#7A4019', margin: '0 0 4px' }}>
          Anteprima presentazione — nessun dato worker reale
        </p>
        <p style={{ fontSize: 12, color: '#7A4019', margin: 0, lineHeight: 1.6 }}>
          Queste pagine mostrano contenuti illustrativi di cosa vede un worker sul suo spazio reale,
          senza accedere a dati individuali reali. Per lo spazio operativo autenticato di un worker,
          nessun ruolo KORA_ADMIN può accedervi — è privato per design.
        </p>
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.02em', margin: '0 0 6px' }}>
        Worker Space — Anteprima
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.52)', margin: '0 0 24px' }}>
        Presentazione dell&apos;esperienza worker per demo e validazione pilota.
      </p>

      <div style={{ display: 'grid', gap: 10 }}>
        {PREVIEW_PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            data-testid={`admin-preview-worker-hub-link-${p.href.split('/').pop()}`}
            style={{
              display: 'block', textDecoration: 'none',
              border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10, padding: '14px 16px',
              background: '#fff',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 2px' }}>{p.label}</p>
            <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: 0 }}>{p.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
