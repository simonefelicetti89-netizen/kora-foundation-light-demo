'use client';

import { useDemoState } from '@/lib/demo-state';
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService }              from '@/services/tenant/TenantService';
import { formatConfidenceScore }      from '@/lib/formatters';
import { TOKENS }                     from '@/lib/design/kora-design-tokens';
import type { KoraIndexComponent, MacroblockScore } from '@/lib/types';

// ── Reused cockpit components ─────────────────────────────────────────────────
import { PageMasthead }    from '@/components/ui/PageMasthead';
import { IndexRingCard }   from '@/components/company/cockpit/IndexRingCard';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';

// ── Local helpers ─────────────────────────────────────────────────────────────

const MB_DESC: Record<string, string> = {
  REACH:   'Share e intensità dell\'attivazione nella forza lavoro',
  QUALITY: 'Qualità, continuità e verificabilità delle attivazioni',
  EQUITY:  'Distribuzione equa tra segmenti della workforce',
  BTI:     'Efficienza del budget people in attivazione profonda',
};

const COMP_DESC: Record<string, string> = {
  AR:  'Activation Rate — share workforce con almeno un IU',
  MAR: 'Meaningful Activation Rate — share sopra soglia materialità',
  NI:  'Normalized Intensity — IU medi per worker attivo',
  WB:  'Worker Balance — equità distribuzione IU tra worker attivi',
  PC:  'Pillar Coverage — n. pillar con presenza significativa',
  PB:  'Pillar Balance — equità distribuzione IU tra pillar coperti',
  EQ:  'Equity — distribuzione equa tra segmenti workforce',
  VR:  'Verification Rate — share IU con evidenza verificata',
  CO:  'Continuity — share worker con engagement multi-periodo',
  CS:  'Confidence Score — affidabilità dati (esterno, peso 0)',
};

function fmtPct(v: number) { return `${Math.round(v * 100)}%`; }
function fmtWeight(w: number) { return `${Math.round(w * 100)}%`; }

// ── MacroblockDetailSection ───────────────────────────────────────────────────

interface MacroblockDetailSectionProps {
  mb: MacroblockScore;
  components: KoraIndexComponent[];
  prevScore?: number;
}

function MacroblockDetailSection({ mb, components, prevScore }: MacroblockDetailSectionProps) {
  const mbComponents = components.filter(
    (c) => c.macroblock === mb.code && !c.external,
  );
  const delta = prevScore != null ? mb.score - prevScore : null;

  return (
    <div
      className="p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      {/* Macroblock header */}
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <p
            className="font-kora-serif text-kora-ink"
            style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
          >
            {mb.label}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(20,18,46,0.42)', marginTop: 2 }}>
            {MB_DESC[mb.code]}
          </p>
        </div>
        <div className="flex items-baseline gap-2 flex-shrink-0">
          <span style={{ fontSize: '11px', color: 'rgba(20,18,46,0.50)' }}>
            peso {fmtWeight(mb.weight)}
          </span>
          <span
            style={{
              fontFamily:    'var(--font-inter)',
              fontWeight:    700,
              fontSize:      '22px',
              color:         TOKENS.ink,
              letterSpacing: '-0.02em',
            }}
          >
            {mb.score}
          </span>
          {delta != null && (
            <span
              style={{
                fontSize:   '11px',
                fontWeight: 600,
                color:      delta >= 0 ? TOKENS.safeguard.pass.text : TOKENS.safeguard.cap.text,
              }}
            >
              {delta >= 0 ? '+' : ''}{delta}
            </span>
          )}
        </div>
      </div>

      {/* Macroblock bar */}
      <div
        className="rounded-full h-1.5 overflow-hidden mb-5"
        style={{ background: TOKENS.inkTrack }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${mb.score}%`, background: TOKENS.ink }}
        />
      </div>

      {/* Component rows */}
      {mbComponents.length > 0 && (
        <div className="space-y-3">
          <p
            className="font-mono uppercase"
            style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(20,18,46,0.38)' }}
          >
            Componenti
          </p>
          {mbComponents.map((c) => (
            <div key={c.code}>
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 600,
                      fontSize:   '12px',
                      color:      TOKENS.ink,
                    }}
                  >
                    {c.code}
                  </span>
                  <span
                    className="truncate"
                    style={{ fontSize: '11px', color: 'rgba(20,18,46,0.42)' }}
                  >
                    {COMP_DESC[c.code] ?? c.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 flex-shrink-0">
                  <span style={{ fontSize: '10px', color: 'rgba(20,18,46,0.40)' }}>
                    w {fmtWeight(c.weight)}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-inter)',
                      fontWeight: 700,
                      fontSize:   '13px',
                      color:      TOKENS.ink,
                      minWidth:   '34px',
                      textAlign:  'right',
                    }}
                  >
                    {fmtPct(c.value)}
                  </span>
                </div>
              </div>
              <div
                className="rounded-full h-1 overflow-hidden"
                style={{ background: TOKENS.inkTrack }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: fmtPct(c.value), background: 'rgba(20,18,46,0.30)' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ConfidenceBlock ───────────────────────────────────────────────────────────

interface ConfidenceBlockProps {
  score: number;
}

function ConfidenceBlock({ score }: ConfidenceBlockProps) {
  return (
    <div
      className="p-6"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <p
          className="font-kora-serif text-kora-ink"
          style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
        >
          Confidence Score
        </p>
        <div className="flex items-baseline gap-1.5">
          <span
            style={{
              fontFamily: 'var(--font-inter)',
              fontWeight: 700,
              fontSize:   '22px',
              color:      TOKENS.accent,
              letterSpacing: '-0.02em',
            }}
          >
            {formatConfidenceScore(score)}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: '8px', color: 'rgba(20,18,46,0.38)', letterSpacing: '0.05em' }}
          >
            esterno&nbsp;·&nbsp;peso&nbsp;0
          </span>
        </div>
      </div>
      <p style={{ fontSize: '12.5px', color: 'rgba(20,18,46,0.58)', lineHeight: 1.65, maxWidth: 580 }}>
        Il Confidence Score non è un componente del KORA Index v3 — è un indicatore di affidabilità
        esterno che accompagna il valore ma non lo influenza. Riflette la completezza dei dati,
        la qualità delle evidenze e la profondità del mapping.
      </p>
      <div
        className="flex gap-4 mt-4 pt-4"
        style={{ borderTop: TOKENS.cardBorder }}
      >
        {[
          ['Completezza dati',    'Copertura e densità dei record fonte'],
          ['Qualità evidenze',    'Verifica e attendibilità delle fonti'],
          ['Profondità mapping',  'Precisione classificazione BCM taxonomy'],
        ].map(([label, desc]) => (
          <div key={label} className="flex-1">
            <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.ink }}>{label}</p>
            <p style={{ fontSize: '10.5px', color: 'rgba(20,18,46,0.45)', marginTop: 2 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ScenarioStrip ─────────────────────────────────────────────────────────────

interface ScenarioStripProps {
  activeScenario: string;
  s1Output: { kora_index_value: number; safeguard_status: string; confidence_score: number } | null;
  s2Output: { kora_index_value: number; safeguard_status: string; confidence_score: number } | null;
}

const SAFEGUARD_STYLE: Record<string, { bg: string; text: string }> = {
  CLEAR:   { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
  WARNING: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  FLAGGED: { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
};

function ScenarioStrip({ activeScenario, s1Output, s2Output }: ScenarioStripProps) {
  const scenarios = [
    { id: 'S1', out: s1Output },
    { id: 'S2', out: s2Output },
  ] as const;

  return (
    <div
      className="p-5"
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadius,
      }}
    >
      <p
        className="font-mono uppercase mb-4"
        style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(20,18,46,0.40)' }}
      >
        Confronto scenari · solo demo
      </p>
      <div className="grid grid-cols-2 gap-3">
        {scenarios.map(({ id, out }) => {
          if (!out) return null;
          const isActive   = id === activeScenario;
          const safStyle   = SAFEGUARD_STYLE[out.safeguard_status] ?? SAFEGUARD_STYLE['WARNING'];
          return (
            <div
              key={id}
              className="rounded-[10px] p-4"
              style={{
                background: isActive ? TOKENS.ink : TOKENS.inkBorder,
                border:     isActive ? 'none' : TOKENS.cardBorder,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="font-mono font-semibold"
                  style={{ fontSize: '10px', color: isActive ? 'rgba(244,241,233,0.55)' : 'rgba(20,18,46,0.45)' }}
                >
                  {id}
                </span>
                {isActive && (
                  <span
                    className="font-mono"
                    style={{ fontSize: '8px', letterSpacing: '0.12em', color: TOKENS.safeguard.pass.dot }}
                  >
                    ATTIVO
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  style={{
                    fontFamily:    'var(--font-inter)',
                    fontWeight:    700,
                    fontSize:      '28px',
                    color:         isActive ? '#FFFFFF' : TOKENS.ink,
                    letterSpacing: '-0.025em',
                    lineHeight:    1,
                  }}
                >
                  {out.kora_index_value}
                </span>
                <span style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.35)' : 'rgba(20,18,46,0.35)' }}>
                  /100
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="rounded font-mono"
                  style={{
                    fontSize:    '7.5px',
                    padding:     '2px 6px',
                    background:  isActive ? 'rgba(255,255,255,0.10)' : safStyle.bg,
                    color:       isActive ? 'rgba(255,255,255,0.65)' : safStyle.text,
                  }}
                >
                  {out.safeguard_status}
                </span>
                <span style={{ fontSize: '10px', color: isActive ? 'rgba(255,255,255,0.35)' : 'rgba(20,18,46,0.35)' }}>
                  CS {formatConfidenceScore(out.confidence_score)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p
        className="mt-3"
        style={{ fontSize: '10.5px', color: 'rgba(20,18,46,0.42)', lineHeight: 1.5 }}
      >
        Confidence Score esterno al KORA Index v3 — indicatore di affidabilità dati, non componente pesato.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

// C-02: KORA Index Detail — v3
export default function KoraIndexDetail() {
  const { activeScenario, activeRole } = useDemoState();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const COMPANY_ID  = currentUser.company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(COMPANY_ID);

  const { data: scoring }                      = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  const { s1: scoringS1, s2: scoringS2, isDemo } = useDemoScenarioComparison(COMPANY_ID);

  const hasKoraData = scoring?.status === 'ok';

  // No-data state
  if (!hasKoraData) {
    return (
      <div className="max-w-3xl space-y-5">
        <PageMasthead
          eyebrow="KORA Index v3"
          title={tenant?.company_name ?? COMPANY_ID}
          subline="Scomposizione analitica dell'indice"
        />
        <div
          className="rounded-2xl px-7 py-6 space-y-3"
          style={{ background: 'rgba(186,117,23,0.07)', border: '1px solid rgba(186,117,23,0.20)' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#5C3509' }}>
            KORA Index non ancora disponibile
          </p>
          <p className="text-xs leading-relaxed" style={{ color: '#7A4A1A' }}>
            Il KORA Index sarà disponibile al termine della pipeline dati.
            Questa azienda non ha ancora completato il caricamento dati.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2" style={{ borderTop: '1px solid rgba(186,117,23,0.15)' }}>
            {[
              ['Onboarding',      tenant?.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
              ['Readiness dati',  tenant?.data_readiness_status ?? '—'],
              ['Decision Pack',   tenant?.decision_pack_status ?? '—'],
              ['Prossima azione', tenant ? tenantService.getNextAction(tenant) : 'Contatta KORA Admin'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p style={{ color: '#854F0B' }}>{label}</p>
                <p className="font-semibold mt-0.5" style={{ color: '#5C3509' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const output      = scoring!.koraIndex!;
  const components  = output.components ?? [];
  const macroblocks: MacroblockScore[] = output.macroblocks ?? [];

  const s1Output = scoringS1?.koraIndex ?? null;
  const s2Output = scoringS2?.koraIndex ?? null;
  const s1Mbs: MacroblockScore[] = s1Output?.macroblocks ?? [];

  return (
    <div className="max-w-3xl space-y-5">

      {/* 1. Masthead */}
      <PageMasthead
        eyebrow={`KORA Index v3 · ${output.reporting_period}`}
        title={tenant?.company_name ?? COMPANY_ID}
        subline="Scomposizione analitica dell'indice"
      />

      {/* 2. Hero ring */}
      <IndexRingCard
        value={output.kora_index_value}
        safeguardStatus={output.safeguard_status}
        confidenceScore={output.confidence_score}
      />

      {/* 3. S1/S2 comparison — demo only */}
      {isDemo && (s1Output ?? s2Output) && (
        <ScenarioStrip
          activeScenario={activeScenario}
          s1Output={s1Output}
          s2Output={s2Output}
        />
      )}

      {/* 4. Macroblocchi dettaglio */}
      {macroblocks.map((mb) => {
        const prevScore = activeScenario === 'S2'
          ? s1Mbs.find((m) => m.code === mb.code)?.score
          : undefined;
        return (
          <MacroblockDetailSection
            key={mb.code}
            mb={mb}
            components={components}
            prevScore={prevScore}
          />
        );
      })}

      {/* 5. Confidence block */}
      <ConfidenceBlock score={output.confidence_score} />

      {/* 6. Provenance footer */}
      <ProvenanceFooter
        methodologyVersionId={output.methodology_version_id}
        calibrationStatus={output.calibration_status}
        reportingPeriod={output.reporting_period}
      />

    </div>
  );
}
