// app/worker/dynamic-cv/print/page.tsx
// B126: Printable view of the Dynamic Impact CV.
//
// Access: WORKER only (requireWorkerUser enforced).
// Purpose: clean print layout — browser Cmd+P to save as PDF.
// No Chromium binary needed. Matches Decision Pack strategy (pdf-strategy.ts).
//
// Privacy rules (identical to /worker/dynamic-cv):
//   - workerId always from session, never from URL
//   - No ranking, no score, no private_note, no comparison
//   - Company cannot reach this route (requireWorkerUser enforces WORKER role)
//   - window.print() button for PDF export via browser

export const runtime = 'nodejs';

import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PrintButton } from './_print-button';

export const metadata = { title: 'Stampa Dynamic Impact CV · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PILLAR_META: Record<string, { color: string }> = {
  LIFE:       { color: '#2F7D55' },
  GROWTH:     { color: '#3B6EBA' },
  CONNECTION: { color: '#7C3D8F' },
  IMPACT:     { color: '#C07D2A' },
  LEGACY:     { color: '#5A4A3F' },
};

const STATUS_LABELS: Record<string, string> = {
  interested: 'Interesse espresso',
  registered: 'Iscrizione',
  attended:   'Partecipazione registrata',
};

export default async function DynamicCVPrintPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/login');

  const { workerId, tenantId } = auth;
  const db = await getSupabaseServerClient();

  const [{ data: profRow }, { data: tenantRow }, { data: participationRows }] = await Promise.all([
    db.schema('personal').from('worker_profile_private')
      .select('display_name')
      .eq('worker_id', workerId)
      .maybeSingle(),
    db.schema('analytics').from('tenant')
      .select('company_name')
      .eq('id', tenantId)
      .maybeSingle(),
    db.schema('personal').from('worker_participation')
      .select(`
        initiative_id, status, updated_at,
        worker_initiative:initiative_id ( title, pillar, delivery_mode )
      `)
      .eq('worker_id', workerId)
      .order('updated_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof         = (profRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant       = (tenantRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participations = (participationRows ?? []) as any[];

  const displayName = (prof.display_name as string | null) ?? 'Lavoratore';
  const tenantName  = (tenant.company_name as string) ?? '';

  const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
  type PillarCode = typeof ALL_PILLARS[number];
  const pillarCounts: Record<PillarCode, number> = { LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0 };

  const experiences: Array<{ title: string; pillar: PillarCode; statusLabel: string; date: string }> = [];

  for (const row of participations) {
    const status = row.status as string;
    if (status === 'cancelled') continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init   = (row.worker_initiative ?? {}) as any;
    const pillar = init.pillar as PillarCode | undefined;
    if (pillar && pillar in pillarCounts) {
      pillarCounts[pillar]++;
      experiences.push({
        title:       (init.title as string) ?? '—',
        pillar,
        statusLabel: STATUS_LABELS[status] ?? status,
        date:        (row.updated_at as string)?.slice(0, 10) ?? '',
      });
    }
  }

  const totalActivities = experiences.length;
  const activePillarsCount = ALL_PILLARS.filter(p => pillarCounts[p] > 0).length;
  const printDate = new Date().toLocaleDateString('it-IT');

  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Dynamic Impact CV · {displayName}</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #fff; color: #06032B; }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            .page { padding: 24px 32px; }
          }
          @media screen {
            .page { max-width: 760px; margin: 0 auto; padding: 40px 24px; }
          }
        `}</style>
      </head>
      <body>
        <div
          className="page"
          data-testid="dynamic-cv-print-view"
        >
          {/* Print controls — hidden in print */}
          <div
            className="no-print"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
          >
            <a
              href="/worker/dynamic-cv"
              style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', textDecoration: 'none' }}
            >
              &#8592; Torna al CV
            </a>
            <PrintButton />
          </div>

          {/* Hero */}
          <div style={{ borderBottom: '2px solid #06032B', paddingBottom: 20, marginBottom: 24 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', margin: '0 0 6px' }}>
              Dynamic Impact CV &middot; KORA Foundation Light
            </p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#06032B', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
              {displayName}
            </h1>
            {tenantName && (
              <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px' }}>
                {tenantName}
              </p>
            )}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Stat label="Attività tracciate" value={totalActivities} />
              <Stat label="Pillar attivi"       value={activePillarsCount} />
              <Stat label="Data stampa"         value={printDate} />
            </div>
          </div>

          {/* Pillar profile */}
          <div style={{ marginBottom: 24 }}>
            <SectionLabel>Profilo Pillar</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {ALL_PILLARS.map(p => {
                const meta  = PILLAR_META[p];
                const count = pillarCounts[p];
                return (
                  <div
                    key={p}
                    style={{
                      border:       `1px solid ${meta?.color ?? '#ddd'}`,
                      borderRadius: 8,
                      padding:      '10px 10px',
                      opacity:      count > 0 ? 1 : 0.35,
                      textAlign:    'center',
                    }}
                  >
                    <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: meta?.color ?? '#06032B', margin: '0 0 4px' }}>
                      {p}
                    </p>
                    <p style={{ fontSize: '1.25rem', fontWeight: 900, color: meta?.color ?? '#06032B', margin: 0 }}>
                      {count}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Experiences */}
          {experiences.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionLabel>Esperienze</SectionLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(6,3,43,0.12)' }}>
                    {['Pillar', 'Titolo', 'Stato', 'Data'].map(h => (
                      <th key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.35)', textAlign: 'left', padding: '0 8px 6px 0' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {experiences.map((exp, i) => {
                    const meta = PILLAR_META[exp.pillar];
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(6,3,43,0.05)' }}>
                        <td style={{ fontSize: 10, fontWeight: 700, color: meta?.color ?? '#06032B', padding: '7px 8px 7px 0', whiteSpace: 'nowrap' }}>{exp.pillar}</td>
                        <td style={{ fontSize: 12, color: '#06032B', padding: '7px 8px 7px 0' }}>{exp.title}</td>
                        <td style={{ fontSize: 10, color: 'rgba(6,3,43,0.55)', padding: '7px 8px 7px 0', whiteSpace: 'nowrap' }}>{exp.statusLabel}</td>
                        <td style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', padding: '7px 0', whiteSpace: 'nowrap' }}>{exp.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Privacy footer — non-suppressible */}
          <div style={{ borderTop: '1px solid rgba(6,3,43,0.10)', paddingTop: 14, marginTop: 8 }}>
            <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px', lineHeight: 1.6 }}>
              Questo CV non &egrave; una valutazione della performance individuale. Non contiene
              ranking, score o confronto con colleghi. Il datore di lavoro non vede questo CV.
            </p>
            <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.25)', margin: 0 }}>
              KORA Foundation Light &middot; Metodologia v0.1 pre-empirical calibration &middot; {printDate}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 900, color: '#06032B', margin: '0 0 2px', letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(6,3,43,0.40)', margin: 0 }}>{label}</p>
    </div>
  );
}
