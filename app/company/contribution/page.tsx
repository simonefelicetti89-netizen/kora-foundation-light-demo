// app/company/contribution/page.tsx
// B166: KORA Contribution — pagina company.
// Tenant production_ready: dato REALE da commons.contribution_event via getContributionLive().
// Tenant Foundation Light: shell sintetica (zero dato reale, disclaimer metodologico).
// KORA Contribution è companion indicator — NON componente KORA Index (CLAUDE.md §12.7).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getContributionLive } from '@/services/kora-contribution/KoraContributionService';
import { getMethodologyVersion } from '@/lib/methodology-config/v0.1';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export const metadata = { title: 'KORA Contribution™ · Company' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

export default async function KoraContributionPage() {
  const auth = await requireCompanyUser();
  if (isKoraAuthError(auth)) redirect('/company/login');

  const db      = await getSupabaseServerClient();
  const summary = await getContributionLive({ db, tenantId: auth.tenantId });

  return (
    <div
      data-testid="company-contribution-page"
      style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 6px' }}>
          Indicatore Companion · Non componente KORA Index
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          KORA Contribution™
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
          Misura il contributo collettivo e territoriale della tua organizzazione — oltre il perimetro aziendale.
        </p>
      </div>

      {/* Disclaimer metodologico — non sopprimibile */}
      <div
        data-testid="contribution-methodology-notice"
        style={{
          background:   'rgba(6,3,43,0.04)',
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 12,
          padding:      '12px 16px',
          marginBottom: 28,
          fontSize:     11,
          color:        'rgba(6,3,43,0.55)',
          lineHeight:   1.6,
        }}
      >
        <strong>Nota metodologica.</strong> KORA Contribution™ è un indicatore companion — non è una componente del KORA Index™ e non influenza il punteggio organizzativo.
        Misura l&apos;impatto collettivo e territoriale. Calibrazione: pre-empirica v0.1.
        Versione metodologia: {getMethodologyVersion()}.
      </div>

      {summary ? (
        /* ── Dato REALE (tenant Pilot+) ──────────────────────────────────── */
        <div data-testid="contribution-live-data">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(47,125,85,0.10)', color: '#2F7D55', letterSpacing: '0.04em' }}>
              DATI REALI
            </span>
            <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)' }}>
              {summary.reporting_period} · {summary.data_source}
            </span>
          </div>

          {/* Metriche principali */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Partecipazioni cross-azienda', value: summary.cross_company_participations, color: '#3B6EBA' },
              { label: 'Promotore di iniziative',      value: summary.promoter_events,              color: '#2F7D55' },
              { label: 'Azienda di provenienza',       value: summary.origin_employer_events,       color: '#7C3D8F' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, fontWeight: 800, color, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.45)', margin: 0, lineHeight: 1.4 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Peso impatto */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(6,3,43,0.09)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#06032B', margin: '0 0 14px' }}>Peso impatto Contribution</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#06032B', margin: '0 0 2px' }}>{summary.total_impact_weight.toFixed(2)}</p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>Totale</p>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#2F7D55', margin: '0 0 2px' }}>{summary.verified_weight.toFixed(2)}</p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>Verified</p>
              </div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#C07D2A', margin: '0 0 2px' }}>{summary.self_declared_weight.toFixed(2)}</p>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>Self-declared</p>
              </div>
            </div>
          </div>

          {/* Partecipanti esterni */}
          {summary.external_participant_events > 0 && (
            <div style={{ background: 'rgba(192,125,42,0.05)', border: '1px solid rgba(192,125,42,0.20)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#8A5A00', margin: '0 0 4px' }}>
                Partecipanti esterni (familiari / comunità)
              </p>
              <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
                {summary.external_participant_events} evento/i con partecipanti esterni dichiarati · peso {summary.weight_external_participants.toFixed(2)}
              </p>
            </div>
          )}

          {/* CSR Disclaimer */}
          <div style={{ background: 'rgba(6,3,43,0.03)', borderRadius: 10, padding: '12px 16px', fontSize: 10, color: 'rgba(6,3,43,0.40)', lineHeight: 1.6 }}>
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
            Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </div>
        </div>
      ) : (
        /* ── Shell sintetica (tenant Foundation Light) ───────────────────── */
        <div data-testid="contribution-shell">
          <div
            className="rounded-[16px] px-5 py-4"
            style={{ background: TOKENS.taupe, border: `1px solid ${TOKENS.inkBorderStrong}`, marginBottom: 20 }}
          >
            <p style={{ fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>Note metodologiche</p>
            <ul className="space-y-1.5 pl-3" style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
              <li className="list-disc">KORA Contribution™ è un indicatore companion — non è una componente del KORA Index™.</li>
              <li className="list-disc">Misura il contributo collettivo e territoriale oltre il perimetro aziendale.</li>
              <li className="list-disc">Richiede iniziative collettive verificate, partecipazioni cross-azienda e dati aggregati sufficienti.</li>
              <li className="list-disc">Disponibile per tenant Pilot+ (production_ready = true). Contatta KORA per l&apos;attivazione.</li>
            </ul>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Link href="/company/status" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.accent }}>
              Consulta Status Center →
            </Link>
            <Link href="/company/workspace" style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.inkSecondary }}>
              ← Workspace
            </Link>
          </div>

          <p style={{ fontSize: '10px', fontFamily: 'monospace', color: TOKENS.inkHint, marginTop: 16 }}>
            modulo non attivo per questo tenant · dati live disponibili per tenant Pilot+
          </p>
        </div>
      )}
    </div>
  );
}
