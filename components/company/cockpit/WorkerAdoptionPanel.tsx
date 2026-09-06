'use client';
// B83-B: Worker Space adoption panel — company-facing, aggregate-safe.
// Shows Worker Space status, adoption metrics, pillar distribution, privacy notice.
// No individual worker data at any path. employer_can_view_individual_pib = false enforced.
//
// CC-018 / B-TRUTH: pillar distribution is fetched from /api/company/pillar-adoption
// (live, session-authenticated — tenant resolved server-side, never from a
// client-supplied companyId) instead of being read synchronously from the
// synthetic-backed WorkerPillarAdoptionService.
//
// B-WORKER WorkerProvisioning Canonicalization (2026-09-06): capability/
// summary are no longer computed internally from a client-supplied
// companyId via workerProvisioningService (retired entirely) — this
// component is currently unmounted on any live route (deliberately, per
// B105/B133 — see lib/architecture/registry.ts svc.worker-pillar-adoption),
// but is kept compiling and ready for re-integration, matching that
// registry note's own expectation. Whoever re-mounts it should fetch
// personal.worker_identity server-side (via
// lib/live/worker-provisioning-status-view.ts, same pattern as
// PilotLifecycleClient.tsx / WorkforceQuickAccessPanel.tsx) and pass the
// resulting counts down as the workerProvisioning prop — this component
// itself performs no fetch and has no synthetic dependency.

import { useEffect, useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { workerSpaceCapabilityService } from '@/services/worker-space/WorkerSpaceCapabilityService';
import type { CanonicalWorkerProvisioningStatus } from '@/lib/live/worker-provisioning-status-view';
import type { PillarAdoptionResult } from '@/services/worker-pillar-adoption/WorkerPillarAdoptionService';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';
const MONO = 'ui-monospace, monospace';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       '#2F7D55',
  GROWTH:     '#2B5CE6',
  CONNECTION: '#C76F3D',
  IMPACT:     '#6156F5',
  LEGACY:     '#8A5A00',
};

const PILLAR_LABELS: Record<string, string> = {
  LIFE:       'LIFE',
  GROWTH:     'GROWTH',
  CONNECTION: 'CONNECTION',
  IMPACT:     'IMPACT',
  LEGACY:     'LEGACY',
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ENABLED: {
    background: 'rgba(47,125,85,0.10)',
    color:      '#2F7D55',
    border:     '1px solid rgba(47,125,85,0.25)',
  },
  NOT_ENABLED: {
    background: TOKENS.taupe,
    color:      TOKENS.inkSecondary,
    border:     TOKENS.cardBorder,
  },
  PILOT_READY: {
    background: 'rgba(97,86,245,0.08)',
    color:      '#4B40C8',
    border:     '1px solid rgba(97,86,245,0.25)',
  },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.NOT_ENABLED;
  const label =
    status === 'ENABLED'    ? 'ENABLED · PREVIEW' :
    status === 'PILOT_READY' ? 'PILOT READY'       :
    'NON ATTIVO';

  return (
    <span style={{
      fontFamily:    MONO,
      fontSize:      '9.5px',
      fontWeight:    700,
      letterSpacing: '0.07em',
      borderRadius:  999,
      padding:       '3px 10px',
      ...style,
    }}>
      {label}
    </span>
  );
}

interface MetricTileProps {
  label: string;
  value: string | number;
  sub?: string;
}

function MetricTile({ label, value, sub }: MetricTileProps) {
  return (
    <div style={{
      background:   TOKENS.surface,
      border:       TOKENS.cardBorder,
      borderRadius: TOKENS.cardRadiusSm,
      padding:      '14px 16px',
    }}>
      <p style={{ fontFamily: FONT, fontSize: '10px', color: TOKENS.inkHint, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: FONT, fontWeight: 800, fontSize: '1.75rem', color: TOKENS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ fontFamily: FONT, fontSize: '10px', color: TOKENS.inkHint, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

interface Props {
  workerProvisioning: CanonicalWorkerProvisioningStatus;
}

export function WorkerAdoptionPanel({ workerProvisioning: summary }: Props) {
  const capability = workerSpaceCapabilityService.getCapabilityFromCounts(
    summary.my_kora_enabled_count,
    summary.total_workers,
  );

  const [pillarData, setPillarData] = useState<PillarAdoptionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/company/pillar-adoption', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: (PillarAdoptionResult & { ok: boolean }) | null) => {
        if (cancelled) return;
        setPillarData(body?.ok ? body : {
          data: [],
          suppressed: true,
          suppressionReason: 'Dati per pilastro non disponibili al momento.',
          activeWorkerCount: 0,
          totalWorkers: 0,
          privacyThresholdMet: false,
          reportingPeriod: '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setPillarData({
          data: [],
          suppressed: true,
          suppressionReason: 'Dati per pilastro non disponibili al momento.',
          activeWorkerCount: 0,
          totalWorkers: 0,
          privacyThresholdMet: false,
          reportingPeriod: '',
        });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      background:   TOKENS.surface,
      border:       TOKENS.cardBorder,
      borderRadius: TOKENS.cardRadius,
      overflow:     'hidden',
    }}>

      {/* ── Header ── */}
      <div style={{
        background:   TOKENS.taupe,
        padding:      '16px 20px',
        borderBottom: TOKENS.cardBorder,
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        flexWrap:     'wrap',
        gap:          8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: '13px', color: TOKENS.ink }}>Worker Space</p>
          <StatusBadge status={capability.status} />
        </div>
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· Foundation Light" />
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── Adoption metrics — 4 tiles ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
          <MetricTile
            label="Lavoratori nel roster"
            value={summary.total_workers}
            sub="baseline workforce"
          />
          <MetricTile
            label="My KORA abilitati"
            value={summary.my_kora_enabled_count}
            sub={`${summary.total_workers > 0 ? Math.round((summary.my_kora_enabled_count / summary.total_workers) * 100) : 0}% del roster`}
          />
          <MetricTile
            label="Account attivi"
            value={summary.active_worker_accounts}
            sub="sessioni demo attive"
          />
          <div style={{
            background:   capability.enabled ? 'rgba(47,125,85,0.06)' : TOKENS.surface,
            border:       capability.enabled ? '1px solid rgba(47,125,85,0.20)' : TOKENS.cardBorder,
            borderRadius: TOKENS.cardRadiusSm,
            padding:      '14px 16px',
          }}>
            <p style={{ fontFamily: FONT, fontSize: '10px', color: TOKENS.inkHint, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Stato Worker Space</p>
            <StatusBadge status={capability.status} />
            <p style={{ fontFamily: FONT, fontSize: '10px', color: TOKENS.inkHint, marginTop: 6 }}>modalità {capability.mode}</p>
          </div>
        </div>

        {/* ── Pillar adoption distribution ── */}
        {pillarData === null ? (
          <div style={{ background: TOKENS.taupe, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 600, color: TOKENS.inkSecondary }}>Caricamento distribuzione per pilastro…</p>
          </div>
        ) : !pillarData.suppressed ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 600, color: TOKENS.inkHint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
              Distribuzione per pilastro · aggregato aziendale
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pillarData.data.map((row) => {
                if (row.suppressed) return null;
                const pct = Math.round(row.share * 100);
                const color = PILLAR_COLORS[row.pillar] ?? TOKENS.accent;
                return (
                  <div key={row.pillar} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <p style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 700, color: TOKENS.inkHint, width: 82, flexShrink: 0, letterSpacing: '0.06em' }}>
                      {PILLAR_LABELS[row.pillar]}
                    </p>
                    <div style={{ flex: 1, height: 6, background: TOKENS.taupe, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.6s ease' }} />
                    </div>
                    <p style={{ fontFamily: MONO, fontSize: '10px', color: TOKENS.inkSecondary, width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {pct}%
                    </p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: FONT, fontSize: '10px', color: TOKENS.inkMeta, marginTop: 8 }}>
              Distribuzione degli Impact Unit aziendali per pilastro · N≥10 · aggregato privacy-safe
            </p>
          </div>
        ) : (
          <div style={{ background: TOKENS.taupe, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '12px 14px', marginBottom: 20 }}>
            <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 600, color: TOKENS.inkSecondary }}>Dati per pilastro non disponibili</p>
            <p style={{ fontFamily: FONT, fontSize: '10.5px', color: TOKENS.inkHint, marginTop: 4, lineHeight: 1.55 }}>
              {pillarData.suppressionReason}
            </p>
          </div>
        )}

        {/* ── Privacy Boundary Notice ── */}
        <div style={{
          background:   'rgba(43,92,230,0.05)',
          border:       '1px solid rgba(43,92,230,0.18)',
          borderRadius: TOKENS.cardRadiusSm,
          padding:      '12px 14px',
          marginBottom: 20,
        }}>
          <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: '#1B2A4A', marginBottom: 4 }}>
            Confine privacy
          </p>
          <p style={{ fontFamily: FONT, fontSize: '11px', color: 'rgba(30,74,138,0.85)', lineHeight: 1.6 }}>
            L&apos;azienda vede solo dati aggregati. PIB e Dynamic CV individuali restano privati al lavoratore.
            Il datore di lavoro non può accedere a punteggi individuali, attività personali o dati di salute.
          </p>
          <p style={{ fontFamily: MONO, fontSize: '9.5px', color: 'rgba(30,74,138,0.55)', marginTop: 6 }}>
            employer_can_view_individual_pib = false · soglia aggregazione N≥10 · KORA Privacy Layer v0.1
          </p>
        </div>

        {/* ── Educational block: What is My KORA? ── */}
        <div style={{
          background:   TOKENS.surface,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadiusSm,
          padding:      '14px 16px',
        }}>
          <p style={{ fontFamily: FONT, fontSize: '11px', fontWeight: 700, color: TOKENS.ink, marginBottom: 8 }}>
            Che cos&apos;è My KORA?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { step: '1', text: 'La tua azienda raccoglie evidenze di attivazione umana tramite KORA — welfare, formazione, volontariato, iniziative collettive.' },
              { step: '2', text: 'My KORA è lo spazio privato dei lavoratori: ogni persona vede il proprio profilo di attivazione, il Dynamic Impact CV™ e la propria storia KORA.' },
              { step: '3', text: 'Il PIB (Personal Impact Balance) è calcolato per ogni lavoratore ma è privato: l\'azienda non lo vede mai. Vedi solo aggregati company-level.' },
              { step: '4', text: 'L\'attivazione aggregata dei lavoratori alimenta il KORA Index™ — l\'indice di impatto umano dell\'organizzazione nel suo insieme.' },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily:  MONO,
                  fontSize:    '9px',
                  fontWeight:  700,
                  color:       TOKENS.accent,
                  background:  TOKENS.accentSoft,
                  borderRadius: 999,
                  width:       20,
                  height:      20,
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                  flexShrink:  0,
                  marginTop:   1,
                }}>
                  {step}
                </span>
                <p style={{ fontFamily: FONT, fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: FONT, fontSize: '9.5px', color: TOKENS.inkMeta, marginTop: 10, borderTop: TOKENS.cardBorder, paddingTop: 8 }}>
            Foundation Light utilizza il Worker Layer in modalità preview — dati sintetici, nessun account lavoratore reale.
          </p>
        </div>

      </div>
    </div>
  );
}
