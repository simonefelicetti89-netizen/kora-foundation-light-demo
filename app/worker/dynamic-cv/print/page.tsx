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
import { PILLAR_SURFACE } from '@/lib/design/kora-design-tokens';
import styles from './print.module.css';

export const metadata = { title: 'Stampa Dynamic Impact CV · KORA' };


const PILLAR_META: Record<string, { color: string }> = {
  LIFE:       { color: PILLAR_SURFACE.LIFE.color },
  GROWTH:     { color: PILLAR_SURFACE.GROWTH.color },
  CONNECTION: { color: PILLAR_SURFACE.CONNECTION.color },
  IMPACT:     { color: PILLAR_SURFACE.IMPACT.color },
  LEGACY:     { color: PILLAR_SURFACE.LEGACY.color },
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
    // PostgREST rejects the ENTIRE embedded resource if one named column is absent,
    // so this select must name only real personal.worker_initiative columns. It names
    // exactly the two this page reads; `delivery_mode` is a network.partner_profile
    // column and was never consumed here.
    db.schema('personal').from('worker_participation')
      .select(`
        initiative_id, status, updated_at,
        worker_initiative:initiative_id ( title, pillar )
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
  const maxPillar = Math.max(...ALL_PILLARS.map(p => pillarCounts[p]), 1);

  return (
    <div className={styles.page} data-testid="dynamic-cv-print-view">
      {/* Print controls — hidden in print */}
      <div className={styles.noPrint}>
        <a href="/worker/dynamic-cv" className={styles.back}>&#8592; Torna al CV</a>
        <PrintButton />
      </div>

      <header className={styles.masthead}>
        <p className={styles.eyebrow}>Dynamic Impact CV</p>
        <h1 className={styles.name}>{displayName}</h1>
        {tenantName && <p className={styles.org}>{tenantName}</p>}
      </header>

      <section className={styles.block}>
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Attività tracciate</dt>
            <dd>{totalActivities}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Pillar attivi</dt>
            <dd>{activePillarsCount} / {ALL_PILLARS.length}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.block}>
        <h2 className={styles.section}>Profilo pillar</h2>
        <ul className={styles.pillars}>
          {ALL_PILLARS.map(p => {
            const count = pillarCounts[p];
            const meta  = PILLAR_META[p];
            return (
              <li key={p} className={styles.pillarRow}>
                <span className={styles.pillarName}>{p}</span>
                <span className={styles.pillarTrack}>
                  {count > 0 && (
                    <span
                      className={styles.pillarBar}
                      style={{ width: `${Math.round((count / maxPillar) * 100)}%`, background: meta?.color }}
                    />
                  )}
                </span>
                <span className={styles.pillarCount}>
                  {count === 0 ? 'non esplorato' : count}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {experiences.length > 0 && (
        <section className={styles.block}>
          <h2 className={styles.section}>Esperienze</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Pillar</th>
                <th scope="col">Titolo</th>
                <th scope="col">Stato</th>
                <th scope="col">Data</th>
              </tr>
            </thead>
            <tbody>
              {experiences.map((exp, i) => (
                <tr key={i}>
                  <td className={styles.cellPillar} style={{ color: PILLAR_META[exp.pillar]?.color }}>{exp.pillar}</td>
                  <td className={styles.cellTitle}>{exp.title}</td>
                  <td className={styles.cellMeta}>{exp.statusLabel}</td>
                  <td className={styles.cellMeta}>{exp.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className={styles.footer}>
        <p className={styles.footerPrimary}>
          Questo CV non &egrave; una valutazione della performance individuale. Non contiene
          ranking, score o confronto con colleghi. Il datore di lavoro non vede questo CV.
        </p>
      </footer>
    </div>
  );
}
