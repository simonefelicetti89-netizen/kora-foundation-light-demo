// app/admin/preview/worker/dynamic-cv/page.tsx
// B121: KORA_ADMIN presentation preview of the Dynamic Impact CV concept.
//
// This page shows a SYNTHETIC EXAMPLE of what a worker sees in /worker/dynamic-cv.
// It does NOT access real worker data. Real CV data is private to each worker.
//
// Access: KORA_ADMIN only (requireKoraAdmin enforced).
// Purpose: allow KORA_ADMIN to present the Dynamic CV concept without
//   accessing a real worker's private data.
//
// Privacy rules:
//   - No real worker data exposed here — all fixtures are synthetic
//   - No access to personal.worker_participation rows of real workers
//   - Banner makes synthetic nature explicit and non-suppressible

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Admin Preview — Dynamic Impact CV · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

// ── Synthetic fixture — not real worker data ───────────────────────────────────

const SYNTHETIC_FIXTURE = {
  displayName:   'Lavoratore Esempio',
  tenantName:    'Azienda Demo',
  headline:      'Profilo attivo con partecipazioni verificate, con focus principale su GROWTH.',
  summary:       { total: 7, attended: 3, activePillars: 3 },
  pillars: [
    { code: 'LIFE',       count: 1, color: '#2F7D55' },
    { code: 'GROWTH',     count: 4, color: '#3B6EBA' },
    { code: 'CONNECTION', count: 2, color: '#7C3D8F' },
    { code: 'IMPACT',     count: 0, color: '#C07D2A' },
    { code: 'LEGACY',     count: 0, color: '#5A4A3F' },
  ],
  experiences: [
    { title: 'Workshop Leadership Digitale',  pillar: 'GROWTH',     status: 'Partecipazione registrata', date: '2026-05-12' },
    { title: 'Corso Nutrizione e Benessere',  pillar: 'LIFE',       status: 'Partecipazione registrata', date: '2026-04-20' },
    { title: 'Mentoring Peer to Peer',        pillar: 'CONNECTION', status: 'Iscrizione',                date: '2026-06-01' },
    { title: 'Upskilling Python Avanzato',    pillar: 'GROWTH',     status: 'Iscrizione',                date: '2026-05-28' },
    { title: 'Formazione Agile Scrum',        pillar: 'GROWTH',     status: 'Interesse espresso',        date: '2026-06-05' },
  ],
  narrative: {
    strengths:     ['Pillar GROWTH: area di maggiore coinvolgimento con 4 attività registrate.'],
    emergingAreas: ['Pillar CONNECTION: in esplorazione con 2 attività.', 'Pillar LIFE: in esplorazione con 1 attività.'],
    missing:       ['IMPACT', 'LEGACY'],
  },
};

const PILLAR_COLOR: Record<string, string> = {
  LIFE: '#2F7D55', GROWTH: '#3B6EBA', CONNECTION: '#7C3D8F', IMPACT: '#C07D2A', LEGACY: '#5A4A3F',
};

const STATUS_COLOR: Record<string, string> = {
  'Partecipazione registrata': '#2F7D55',
  'Iscrizione':                '#3B6EBA',
  'Interesse espresso':        '#C07D2A',
};

export default async function AdminPreviewWorkerDynamicCVPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  const f = SYNTHETIC_FIXTURE;

  return (
    <div
      data-testid="admin-preview-worker-dynamic-cv"
      style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', fontFamily: FONT }}
    >
      {/* Synthetic banner — non-suppressible */}
      <div
        data-testid="admin-preview-dynamic-cv-banner"
        style={{
          background:   'rgba(199,111,61,0.09)',
          border:       '1.5px solid rgba(199,111,61,0.35)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 28,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>⚠️</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#8B4513', margin: '0 0 4px' }}>
            KORA Admin Preview — esempio sintetico, non CV reale di un worker.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(139,69,19,0.80)', margin: 0, lineHeight: 1.6 }}>
            I dati mostrati sono fittizi. Il CV reale di un lavoratore è privato e accessibile
            solo al worker autenticato tramite <strong>/worker/dynamic-cv</strong>.
            KORA_ADMIN non ha accesso ai CV individuali dei lavoratori in produzione.
          </p>
        </div>
      </div>

      {/* Header nav */}
      <div style={{ marginBottom: 20 }}>
        <a href="/admin" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
          ← Admin Dashboard
        </a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.025em', margin: '0 0 4px' }}>
          Dynamic Impact CV — Anteprima Admin
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
          Esempio visivo del CV privato del lavoratore. Dati sintetici.
        </p>
      </div>

      {/* Hero synthetic */}
      <div style={{ background: '#06032B', borderRadius: 16, padding: '24px 28px', marginBottom: 16 }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 6px' }}>
          Dynamic Impact CV · esempio sintetico
        </p>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
          {f.displayName}
        </h2>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', margin: '0 0 12px' }}>
          Lavoratore · {f.tenantName}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
          &ldquo;{f.headline}&rdquo;
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Attività tracciate',    value: f.summary.total        },
          { label: 'Pillar attivi',          value: f.summary.activePillars },
          { label: 'Partecipazioni verify.', value: f.summary.attended      },
        ].map(({ label, value }) => (
          <div key={label} style={{ border: '1px solid rgba(6,3,43,0.08)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#06032B', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{value}</p>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(6,3,43,0.40)', margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Pillar profile */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
          Profilo pillar (sintetico)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {f.pillars.map(p => (
            <div key={p.code} style={{ border: `1px solid ${p.color}30`, borderRadius: 10, padding: '10px 12px', background: `${p.color}08`, opacity: p.count > 0 ? 1 : 0.4 }}>
              <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: p.color, margin: '0 0 4px' }}>{p.code}</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 900, color: p.color, margin: 0 }}>{p.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Experiences */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
          Esperienze (sintetiche)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {f.experiences.map((exp, i) => {
            const pc = PILLAR_COLOR[exp.pillar] ?? '#555';
            const sc = STATUS_COLOR[exp.status] ?? '#555';
            return (
              <div key={i} style={{ border: '1px solid rgba(6,3,43,0.07)', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: pc, textTransform: 'uppercase', letterSpacing: '0.08em', minWidth: 60 }}>{exp.pillar}</span>
                <span style={{ fontSize: 12, color: '#06032B', flex: 1 }}>{exp.title}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: sc, letterSpacing: '0.06em' }}>{exp.status}</span>
                <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.35)', minWidth: 70, textAlign: 'right' }}>{exp.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy footer */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 14 }}>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Admin Preview · Dynamic Impact CV · B121 Foundation Light ·
          Il CV reale è visibile solo al lavoratore autenticato. KORA misura le organizzazioni, non valuta i singoli.
        </p>
      </div>
    </div>
  );
}
