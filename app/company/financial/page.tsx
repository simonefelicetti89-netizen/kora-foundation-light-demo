'use client';
// C-06: Financial Governance — live-only: richiede sessione company autenticata.
// Mostra BTI™ Score live dal KORA Index. Financial Intelligence dettagliata non ancora disponibile in live.

import Link from 'next/link';
import { useCompanySession } from '../_providers/CompanySessionProvider';
import { useScoringResult } from '@/lib/scoring-result';
import { BTI_DOCTRINE } from '@/lib/constants/kora';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { PageMasthead } from '@/components/ui/PageMasthead';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { BoundaryBanner } from '@/components/ui/BoundaryBanner';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint } from '@/components/company/cockpit/ExplainabilityHint';
import { TM } from '@/components/ui/TM';
import { NoDataState } from '@/components/ui/NoDataState';

export default function FinancialGovernanceLive() {
  const { tenantId: liveId, sessionLoading } = useCompanySession();
  const COMPANY_ID = liveId ?? '';

  const { data: scoring, loading } = useScoringResult({
    tenantId:         COMPANY_ID,
    scenarioId:       'S1',
    forceEnvironment: 'live',
  });

  if (sessionLoading || loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento…</p>
      </div>
    );
  }

  const hasKoraData = scoring?.status === 'ok';

  if (!hasKoraData) {
    return (
      <NoDataState
        title="Financial Intelligence non ancora disponibile"
        description="Completa intake, UEF review e scoring per visualizzare Budget-to-Human-Impact™ live. Il BTI™ Score è disponibile nel KORA Index appena il primo scoring run è completato."
        action={
          <Link
            href="/company/kora-index"
            style={{
              display:        'inline-block',
              borderRadius:   6,
              border:         `1px solid ${TOKENS.accent}55`,
              background:     `${TOKENS.accent}0a`,
              padding:        '8px 14px',
              fontSize:       '12px',
              fontWeight:     600,
              color:          TOKENS.accent,
              textDecoration: 'none',
            }}
          >
            Vai al KORA Index →
          </Link>
        }
      />
    );
  }

  const koraIndex       = scoring!.koraIndex!;
  const macroblocks     = koraIndex.macroblocks ?? [];
  const btiMacroblock   = macroblocks.find((m: { code: string }) => m.code === 'BTI');
  const liveBtiScore    = btiMacroblock?.score ?? null;
  const reportingPeriod = koraIndex.reporting_period ?? 'Periodo attivo';

  return (
    <div className="space-y-6">

      {/* ── Boundary ─────────────────────────────────────────────────────────── */}
      <BoundaryBadge mode="LIVE" variant="light" style={{ marginBottom: 6 }} />
      <PageMasthead
        eyebrow={`Governance Finanziaria · LIVE · ${reportingPeriod}`}
        title={<><TM>Budget-to-Human-Impact</TM> Engine</>}
        subline="Rapporto tra budget people, attivazione profonda e opportunità di riallocazione. Non certificativo, non causale."
        meta="La tua organizzazione · dati live"
      />
      <BoundaryBanner isLive={true} />

      {/* ── BTI Score live ───────────────────────────────────────────────────── */}
      {liveBtiScore !== null ? (
        <div
          className="rounded-xl border border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.06)] px-5 py-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#2F7D55] uppercase tracking-wide">
              BTI™ Score live · La tua organizzazione
            </p>
            <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              LIVE
            </span>
          </div>
          <p className="text-3xl font-bold text-[#06032B]">
            {Math.round(liveBtiScore)}
            <span className="text-sm text-[rgba(6,3,43,0.40)] ml-1">/100</span>
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.52)]">
            Budget-to-Human-Impact™ — macroblocco KORA Index (peso 20%).
            Misura quanto il budget welfare si converte in attivazione profonda.
          </p>
        </div>
      ) : (
        <div
          style={{
            background:   TOKENS.surface,
            border:       TOKENS.cardBorder,
            borderRadius: TOKENS.cardRadius,
            padding:      '1.5rem',
            textAlign:    'center',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink }}>
            BTI™ Score non disponibile
          </p>
          <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, marginTop: 6, maxWidth: 400, margin: '8px auto 0' }}>
            Il macroblocco BTI non è ancora valorizzato per questa organizzazione.
            Completa il primo scoring run per visualizzarlo.
          </p>
        </div>
      )}

      {/* ── Financial Intelligence notice ────────────────────────────────────── */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.5rem',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 8 }}>
          Financial Intelligence live non ancora disponibile
        </p>
        <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.7, maxWidth: '72ch', marginBottom: 16 }}>
          Il dettaglio Budget-to-Human-Impact™ — inclusi Activation Debt, distribuzione budget per pillar,
          Economic Relief Share e Reallocation Opportunity — sarà disponibile nella prossima release.
          Il BTI™ Score è già incluso nel KORA Index live.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            href="/company/kora-index"
            style={{
              borderRadius:   6,
              border:         `1px solid ${TOKENS.accent}55`,
              background:     `${TOKENS.accent}0a`,
              padding:        '8px 14px',
              fontSize:       '12px',
              fontWeight:     600,
              color:          TOKENS.accent,
              textDecoration: 'none',
            }}
          >
            Vai al KORA Index →
          </Link>
          <Link
            href="/demo/company/financial"
            style={{
              borderRadius:   6,
              border:         `1px solid rgba(6,3,43,0.14)`,
              background:     'rgba(6,3,43,0.03)',
              padding:        '8px 14px',
              fontSize:       '12px',
              fontWeight:     500,
              color:          TOKENS.inkSecondary,
              textDecoration: 'none',
            }}
          >
            Esplora struttura BTI™ in demo →
          </Link>
        </div>
      </div>

      {/* ── Natura dei dati — perimetro ─────────────────────────────────────── */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.25rem',
        }}
      >
        <p style={{ fontSize: '12px', fontWeight: 600, color: TOKENS.ink, marginBottom: 10 }}>
          Perimetro informativo e limitazioni
        </p>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Nessun PIB individuale — tutti i valori sono aggregati sopra soglia privacy (≥10 lavoratori).',
            'Correlazione ≠ causalità — le variazioni KPI osservate non sono attribuibili a KORA.',
            'KORA non garantisce ROI, riduzione assenteismo, retention o engagement.',
            'EQ = Equity (equità distributiva dell\'attivazione) — non Evidence Quality.',
          ].map((note) => (
            <li key={note} style={{ display: 'flex', gap: 8, fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
              <span style={{ flexShrink: 0, marginTop: 2, color: TOKENS.inkHint }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* ── BTI Doctrine ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '1.25rem',
        }}
      >
        <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, marginBottom: 12 }}>
          Principi BTI™ — non ROI, non causale
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: 12 }}>
          {[
            BTI_DOCTRINE.budget_neq_activation,
            BTI_DOCTRINE.spend_neq_impact,
            BTI_DOCTRINE.relief_neq_activation,
            BTI_DOCTRINE.limited_reframe,
          ].map((key) => (
            <div
              key={key}
              style={{
                background:   'rgba(199,111,61,0.04)',
                border:       '1px solid rgba(199,111,61,0.12)',
                borderRadius: 8,
                padding:      '10px 12px',
                fontSize:     '11px',
                color:        TOKENS.ink,
                lineHeight:   1.55,
                fontStyle:    'italic',
              }}
            >
              {key}
            </div>
          ))}
        </div>
        <div
          style={{
            padding:      '10px 12px',
            background:   TOKENS.inkBorder,
            borderRadius: 8,
            fontSize:     '11px',
            color:        TOKENS.inkSecondary,
            lineHeight:   1.6,
          }}
        >
          <span style={{ fontWeight: 600, color: TOKENS.ink }}>Nota metodologica: </span>
          Il punteggio BTI (macroblocco al 20%) è calcolato dal motore BTI,
          non dai valori dei componenti analitici AR, MAR, NI, VR, CO, WB, PC, PB, EQ.
        </div>
      </div>

      {/* ── ExplainabilityHint ──────────────────────────────────────────────── */}
      <ExplainabilityHint />

      {/* ── ProvenanceFooter ────────────────────────────────────────────────── */}
      <ProvenanceFooter
        methodologyVersionId="KORA Index v1.0"
        calibrationStatus="pre_empirical_calibration"
        reportingPeriod={reportingPeriod}
      />

    </div>
  );
}
