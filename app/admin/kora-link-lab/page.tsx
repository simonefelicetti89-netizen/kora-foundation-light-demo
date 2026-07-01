// app/admin/kora-link-lab/page.tsx
// KORA Link Lab (KL-20) — internal demo tool for NFC chip lab writing.
// Protected by app/admin/layout.tsx (requireKoraAdmin — no new auth system here).
// No DB. No Supabase. No activation. No worker assignment. Demo only, never persisted.

export const dynamic = 'force-dynamic';

import {
  getKoraLinkDemoLabRuntimeStatus,
  generateKoraLinkDemoLabLink,
} from '@/lib/kora-link/demo-lab';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const C = {
  ink:     'rgba(6,3,43,0.90)',
  inkSec:  'rgba(6,3,43,0.55)',
  inkHint: 'rgba(6,3,43,0.38)',
  inkBdr:  'rgba(6,3,43,0.08)',
  surface: '#F8F6F1',
  green:   '#2F7D55',
  red:     '#B3261E',
};

export default function KoraLinkLabPage() {
  const status = getKoraLinkDemoLabRuntimeStatus();
  const linkResult = generateKoraLinkDemoLabLink();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px', fontFamily: FONT }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.inkHint, margin: '0 0 8px' }}>
        KORA Link · Strumento interno
      </p>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: C.ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        KORA Link Lab
      </h1>
      <p style={{ fontSize: 13, color: C.inkSec, margin: '0 0 28px', lineHeight: 1.6 }}>
        Genera un URL demo <code>/link/&lt;token&gt;</code> da scrivere su un chip NFC per test fisici.
        Nessun dato viene salvato: ricarica la pagina per generare un nuovo token demo.
      </p>

      <RuntimeStatusPanel status={status} />
      <LinkPanel result={linkResult} />
      <SafetyNotice />
    </div>
  );
}

// ── Runtime status panel ──────────────────────────────────────────────────────

function RuntimeStatusPanel({
  status,
}: {
  status: ReturnType<typeof getKoraLinkDemoLabRuntimeStatus>;
}) {
  const rows: Array<{ label: string; value: string; ok: boolean }> = [
    {
      label: 'KORA_LINK_ENABLED',
      value: status.koraLinkEnabled ? 'true' : 'false',
      ok: status.koraLinkEnabled,
    },
    {
      label: 'KORA_LINK_PUBLIC_BASE_URL',
      value: status.publicBaseUrlConfigured ? 'configurato' : 'non configurato',
      ok: status.publicBaseUrlConfigured,
    },
    {
      label: 'KORA_LINK_DB_LOOKUP_ENABLED',
      value: status.dbLookupEnabled ? 'true (attenzione)' : 'false (default)',
      ok: !status.dbLookupEnabled,
    },
    {
      label: 'Rate limit provider',
      value: status.rateLimitProvider ?? 'non configurato',
      ok: status.rateLimitProvider !== null,
    },
  ];

  return (
    <section
      style={{
        border: `1px solid ${C.inkBdr}`,
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 20,
        background: '#fff',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkHint, margin: '0 0 12px' }}>
        Stato runtime
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8, columnGap: 12 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: 'contents' }}>
            <span style={{ fontSize: 12.5, color: C.inkSec, fontFamily: 'ui-monospace, monospace' }}>{row.label}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: row.ok ? C.green : C.red }}>{row.value}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: C.inkHint, margin: '14px 0 0', lineHeight: 1.5 }}>
        Nessun secret viene mostrato in questa pagina.
      </p>
    </section>
  );
}

// ── Generated link panel ──────────────────────────────────────────────────────

function LinkPanel({
  result,
}: {
  result: ReturnType<typeof generateKoraLinkDemoLabLink>;
}) {
  if (!result.ok) {
    return (
      <section
        style={{
          border: `1px solid ${C.inkBdr}`,
          borderRadius: 12,
          padding: '18px 20px',
          marginBottom: 20,
          background: '#fff',
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkHint, margin: '0 0 10px' }}>
          Token demo
        </p>
        <p style={{ fontSize: 13, color: C.red, margin: 0, lineHeight: 1.6 }}>
          Impossibile generare l&apos;URL demo: configura <code>KORA_LINK_PUBLIC_BASE_URL</code> nell&apos;ambiente
          per abilitare questo strumento.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        border: `1px solid ${C.inkBdr}`,
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 20,
        background: '#fff',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkHint, margin: '0 0 10px' }}>
        URL demo — copia per la programmazione NFC
      </p>
      <textarea
        readOnly
        value={result.url}
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12.5,
          color: C.ink,
          padding: '10px 12px',
          border: `1px solid ${C.inkBdr}`,
          borderRadius: 8,
          background: C.surface,
          userSelect: 'all',
          resize: 'none',
        }}
      />
      <p style={{ fontSize: 11, color: C.inkHint, margin: '8px 0 16px', lineHeight: 1.5 }}>
        Seleziona il testo e copia (Cmd/Ctrl+C) per scrivere l&apos;URL sul chip NFC.
      </p>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkHint, margin: '0 0 10px' }}>
        Token grezzo — solo demo, non persistito
      </p>
      <textarea
        readOnly
        value={result.token}
        rows={2}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12.5,
          color: C.inkSec,
          padding: '10px 12px',
          border: `1px solid ${C.inkBdr}`,
          borderRadius: 8,
          background: C.surface,
          userSelect: 'all',
          resize: 'none',
        }}
      />
    </section>
  );
}

// ── Safety notice ──────────────────────────────────────────────────────────────

function SafetyNotice() {
  const items = [
    'Nessun record creato su database',
    'Nessuna associazione a un worker',
    'Nessuna activation eseguita',
    'Solo per laboratorio NFC / demo interna',
  ];
  return (
    <section
      style={{
        border: `1px dashed ${C.inkBdr}`,
        borderRadius: 12,
        padding: '16px 20px',
        background: '#fffaf5',
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.inkHint, margin: '0 0 10px' }}>
        Stato sicurezza
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.inkSec, lineHeight: 1.8 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
