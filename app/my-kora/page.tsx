'use client';
// W-01: My KORA Home — spazio personale del lavoratore.
// B98-B: restructured as worker activation space, not a methodology dashboard.
// Success criterion: a worker understands in ≤30s what this space is, what they've done,
//   what they can do next, what they can share, and what the employer cannot see.
//
// B81-B route classification: PREVIEW
// Current: data from MyKoraPreviewService (synthetic persona fixtures).
//          Session from WorkerSessionProvider (demo-state, no live JWT).
// Pilot+:  WorkerSessionProvider resolves LIVE session from Supabase worker JWT.
//          Data from MyKoraService (real Supabase per-worker UEF records + PIB).
//          No component changes required — only provider and service swap.
//
// Section order:
//   1. Header + Preview badge
//   2. Next Best Action (deterministic, no AI)
//   3. Il tuo percorso (journey: verified/pending/private counts + simplified recent activities)
//   4. Opportunity strip (top 3)
//   5. Quick actions grid (Dynamic CV card + Commons card)
//   6. Privacy snapshot
//   [below fold]
//   7. PIB privato (full breakdown, available but not dominating)
//   8. IU education + Attribution Matrix
//   9. KORA Link (FUTURE_VISION)
//   10. Company aggregate snapshot
//   11. Synthetic notice
//
// Privacy invariants: unchanged. PIB never shown to employer. All rules from B81-B still active.

import { useState } from 'react';
import Link from 'next/link';
import { useRole, useScenario, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { workerOpportunityService } from '@/services/worker-opportunity/WorkerOpportunityService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerAttributionService } from '@/services/worker-attribution/WorkerAttributionService';
import { commonsService } from '@/services/commons/CommonsService';
import { workerAchievementService } from '@/services/worker-achievements/WorkerAchievementService';
import { STATUS_LABELS as ACHIEVEMENT_STATUS_LABELS } from '@/lib/worker-achievements/types';
import { computeNextAction } from '@/lib/my-kora/nextActionLogic';
import { AttributionMatrix } from '@/components/my-kora/AttributionMatrix';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { PreviewToLiveNotice } from '@/components/my-kora/PreviewToLiveNotice';
import { cn } from '@/lib/utils';

// ─── Styling maps ─────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  LIFE: 'bg-[#C76F3D]', GROWTH: 'bg-[#2F7D55]', CONNECTION: 'bg-[#D99767]',
  IMPACT: 'bg-[#2F7D55]', LEGACY: 'bg-[#8A7562]',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-[#C76F3D]/10 text-[#C76F3D] border-[rgba(199,111,61,0.25)]',
  GROWTH:     'bg-[#2F7D55]/10 text-[#2F7D55] border-[rgba(47,125,85,0.25)]',
  CONNECTION: 'bg-[#D99767]/10 text-[#D99767] border-[rgba(217,151,103,0.25)]',
  IMPACT:     'bg-[rgba(74,127,224,0.10)] text-[#4A7FE0] border-[rgba(74,127,224,0.25)]',
  LEGACY:     'bg-[#8A7562]/10 text-[#8A7562] border-[rgba(138,117,98,0.25)]',
};

const PILLAR_TEXT: Record<string, string> = {
  LIFE:       'text-[#C76F3D]',
  GROWTH:     'text-[#2F7D55]',
  CONNECTION: 'text-[#D99767]',
  IMPACT:     'text-[#4A7FE0]',
  LEGACY:     'text-[#8A7562]',
};

const TREND_ICON: Record<string, string> = { up: '↑', stable: '→', down: '↓' };
const TREND_COLOR: Record<string, string> = { up: 'text-[#2F7D55]', stable: 'text-[rgba(6,3,43,0.42)]', down: 'text-[#9E3B2F]' };

const VERIF_LABEL: Record<string, string> = {
  verified: 'Verificato', partial: 'In verifica', self_declared: 'Autodichiarato',
};
const VERIF_COLOR: Record<string, string> = {
  verified: 'text-[#2F7D55]', partial: 'text-[#D99A2B]', self_declared: 'text-[rgba(6,3,43,0.42)]',
};

// ─── KORA Link stepper steps (FUTURE_VISION) ──────────────────────────────────

const KORA_LINK_STEPS = [
  { label: 'Azione reale',            desc: 'Partecipi a un evento, corso o iniziativa verificabile.' },
  { label: 'QR / KORA Link',         desc: 'Scansioni il QR o usi KORA Link — solo simulazione demo.' },
  { label: 'Evidenza generata',       desc: "Viene generata un'evidenza candidata con metadati di categoria." },
  { label: 'UEF candidate',          desc: 'Il record diventa un UEF candidate — pipeline di validazione avviata.' },
  { label: 'Review',                  desc: 'Advisor o partner conferma la categoria e il pillar assegnato.' },
  { label: 'Impact Units',           desc: 'Se approvato, genera Impact Units calcolati nel tuo spazio privato.' },
  { label: 'Aggiornamento privato',  desc: 'Il tuo percorso si aggiorna — visibile solo a te.' },
  { label: 'Aggregazione aziendale', desc: "Contribuisce all'aggregato aziendale solo sopra soglia privacy — in forma anonima." },
];

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied({ role }: { role: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '1.875rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: '#06032B' }}>
          My KORA
        </h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">Spazio personale del lavoratore</p>
      </div>
      <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center" data-testid="access-denied">
        <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
        <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
          My KORA è uno spazio privato del lavoratore. I ruoli datore di lavoro e admin non possono accedere
          ai dati individuali. Il datore di lavoro vede l&apos;organizzazione, non il singolo.
        </p>
        <p className="mt-3 text-xs font-mono text-[rgba(158,59,47,0.55)]">Ruolo attivo: {role}</p>
        <p className="mt-1 text-xs text-[rgba(158,59,47,0.55)]">Passa al ruolo WORKER per visualizzare questo spazio.</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// W-01: My KORA Home
export default function MyKoraHome() {
  const [koraLinkStep, setKoraLinkStep] = useState(0);
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return <AccessDenied role={activeRole} />;
  }

  const personaId = activePersona?.id ?? 'persona-elena-m';
  const preview   = myKoraPreviewService.getMyKoraHomePreview(personaId, activeScenario);
  const workerCompanyId = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const aggregate = scoringSimulatorService.getCompanyAggregate(workerCompanyId, activeScenario);

  if (!preview) return null;

  // ── Derived data ────────────────────────────────────────────────────────────

  const cvPreview = myKoraPreviewService.getDynamicCvPreview(personaId);
  const totalCVItems    = cvPreview.items.length;
  const shareableCount  = cvPreview.items.filter((i) => i.shareable).length;
  const privateCVCount  = totalCVItems - shareableCount;

  const verifiedActivities  = preview.timeline.filter((i) => i.verification_status === 'verified');
  const pendingActivities   = preview.timeline.filter((i) => i.verification_status === 'partial');
  const privateActivities   = preview.timeline.filter((i) => i.verification_status === 'self_declared');

  const verifiedCount  = verifiedActivities.length;
  const pendingCount   = pendingActivities.length;
  const privateCount   = privateActivities.length;

  // Top 3 recent activities for journey section (simplified view — no IU values)
  const recentActivities = preview.timeline.slice(0, 3);

  // Next best action — deterministic, no AI
  const nextAction = computeNextAction(
    preview.pib_light.pillar_breakdown,
    shareableCount,
    verifiedCount,
    preview.pib_light.overall_index,
  );

  // Top 3 opportunities
  const opportunities = workerOpportunityService.compute(personaId, activeRole as Parameters<typeof workerOpportunityService.compute>[1], activeScenario).slice(0, 3);

  // Strongest pillar for compact PIB display
  const strongestPillar = preview.pib_light.pillar_breakdown.reduce(
    (a, b) => (b.score > a.score ? b : a),
    preview.pib_light.pillar_breakdown[0],
  );

  // Achievement data — worker-private recognition layer
  const achievementStats  = workerAchievementService.getAchievementStats();
  const recentAchievements = workerAchievementService.getRecentAchievements(3);

  // Featured commons initiatives
  const featuredCommons = commonsService.getFeaturedInitiatives().slice(0, 2);
  const commonsPillars  = [...new Set(featuredCommons.map((i) => i.pillar))];

  return (
    <div className="space-y-6" data-testid="my-kora-home">

      {/* ── 1. HEADER ────────────────────────────────────────────────────────── */}
      <div data-testid="my-kora-header">
        <BoundaryBadge mode="PREVIEW" variant="light" suffix="· dati sintetici" style={{ marginBottom: 10 }} />
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: 1.06, color: '#06032B' }}>My KORA</h1>
        <p style={{ fontSize: '13.5px', color: 'rgba(6,3,43,0.52)', marginTop: 4, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Il tuo spazio personale · {preview.persona_label}
        </p>
      </div>

      {/* ── 2. NEXT BEST ACTION ──────────────────────────────────────────────── */}
      <div
        data-testid="next-best-action"
        className="rounded-xl border border-[rgba(199,111,61,0.25)] bg-[rgba(199,111,61,0.06)] p-5"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(199,111,61,0.70)] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Prossima azione consigliata
        </p>
        <p className="text-base font-bold text-[#06032B] leading-snug mb-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          {nextAction.title}
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.58)] leading-relaxed mb-4" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          {nextAction.description}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={nextAction.cta_href}
            className="rounded-lg bg-[#06032B] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', textDecoration: 'none' }}
            data-testid="next-action-cta"
          >
            {nextAction.cta_label} →
          </Link>
          <span className="text-[10px] text-[rgba(6,3,43,0.35)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Suggerimento personalizzato · nessuna IA · nessuna classifica
          </span>
        </div>
      </div>

      {/* ── 3. IL TUO PERCORSO ───────────────────────────────────────────────── */}
      <div data-testid="activation-journey" className="space-y-4">
        <h2 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#06032B' }}>
          Il tuo percorso di attivazione
        </h2>

        {/* Activity counts */}
        <div className="grid grid-cols-3 gap-3" data-testid="activity-counts">
          <div className="rounded-lg border border-[rgba(47,125,85,0.20)] bg-[rgba(47,125,85,0.06)] p-3 text-center" data-testid="verified-count">
            <p className="text-2xl font-bold text-[#2F7D55]">{verifiedCount}</p>
            <p className="text-xs text-[rgba(6,3,43,0.60)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Verificate
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(217,154,43,0.20)] bg-[rgba(217,154,43,0.06)] p-3 text-center" data-testid="pending-count">
            <p className="text-2xl font-bold text-[#D99A2B]">{pendingCount}</p>
            <p className="text-xs text-[rgba(6,3,43,0.60)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              In verifica
            </p>
          </div>
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] p-3 text-center" data-testid="private-count">
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.60)]">{privateCount}</p>
            <p className="text-xs text-[rgba(6,3,43,0.60)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Personali
            </p>
          </div>
        </div>

        {/* Recent activities — simplified, no IU values above fold */}
        {recentActivities.length > 0 && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden" data-testid="recent-activities">
            <div className="px-4 py-2.5 border-b border-[rgba(6,3,43,0.05)]">
              <p className="text-xs font-semibold text-[rgba(6,3,43,0.50)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                Attività recenti
              </p>
            </div>
            <div className="divide-y divide-[rgba(6,3,43,0.05)]">
              {recentActivities.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono shrink-0',
                    PILLAR_LIGHT[item.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                  )}>
                    {item.pillar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[rgba(6,3,43,0.88)] truncate" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                      {item.category}
                    </p>
                    <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                      {item.date}
                    </p>
                  </div>
                  <span className={cn('text-xs font-medium shrink-0', VERIF_COLOR[item.verification_status])}>
                    {VERIF_LABEL[item.verification_status]}
                  </span>
                </div>
              ))}
            </div>
            {preview.timeline.length > 3 && (
              <div className="px-4 py-2 border-t border-[rgba(6,3,43,0.05)]">
                <p className="text-xs text-[rgba(6,3,43,0.38)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                  + {preview.timeline.length - 3} altre attività — visibili nella timeline completa qui sotto.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 3b. I TUOI RICONOSCIMENTI ────────────────────────────────────────── */}
      <div data-testid="achievements-section" className="space-y-4">

        {/* Section header */}
        <div className="flex items-center justify-between gap-2">
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#06032B' }}>
            I tuoi riconoscimenti
          </h2>
          <span className="text-[10px] text-[rgba(6,3,43,0.40)] italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Privati · solo per te
          </span>
        </div>

        {/* Participation journey — educational visual */}
        <div
          data-testid="participation-journey"
          className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[rgba(6,3,43,0.40)] mb-3" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Come funziona il riconoscimento
          </p>
          <div className="flex items-start gap-0 overflow-x-auto">
            {[
              { step: 'Partecipazione', desc: 'Partecipi a un\'iniziativa verificabile nel tuo percorso.', color: 'rgba(6,3,43,0.55)', dot: 'rgba(6,3,43,0.30)' },
              { step: 'Verifica',       desc: 'Una fonte esterna (LMS, partner, advisor) conferma la tua partecipazione.', color: '#D99A2B', dot: '#D99A2B' },
              { step: 'Riconoscimento', desc: 'L\'attività viene riconosciuta nel tuo percorso personale.', color: '#C76F3D', dot: '#C76F3D' },
              { step: 'Dynamic CV',     desc: 'Gli elementi verificati entrano nel tuo CV personale — condivisibili su tua iniziativa.', color: '#2F7D55', dot: '#2F7D55' },
            ].map((item, idx, arr) => (
              <div key={item.step} className="flex items-start" style={{ flex: '1 1 0', minWidth: 90 }}>
                <div className="flex flex-col items-center flex-1">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.dot, flexShrink: 0, marginBottom: 6 }} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: item.color, textAlign: 'center', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', lineHeight: 1.2, marginBottom: 4 }}>
                    {item.step}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.45)', textAlign: 'center', lineHeight: 1.4, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                    {item.desc}
                  </p>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{ paddingTop: 3, paddingLeft: 4, paddingRight: 4, color: 'rgba(6,3,43,0.22)', fontSize: 12, flexShrink: 0 }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recognition summary — Task 7 */}
        <div data-testid="recognition-summary" className="grid grid-cols-4 gap-2">
          {[
            { label: 'Totali',      value: achievementStats.total,      color: 'rgba(6,3,43,0.80)' },
            { label: 'Verificati',  value: achievementStats.verified,    color: '#2F7D55'           },
            { label: 'Condivisibili', value: achievementStats.shareable,  color: '#C76F3D'          },
            { label: 'In verifica', value: achievementStats.pending,     color: '#D99A2B'           },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white p-3 text-center">
              <p style={{ fontSize: 20, fontWeight: 800, color, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{value}</p>
              <p style={{ fontSize: 9, color: 'rgba(6,3,43,0.45)', marginTop: 2, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Privacy copy — non-suppressible — Task 9 */}
        <div
          data-testid="achievement-privacy-note"
          className="rounded-lg border border-[rgba(47,125,85,0.20)] bg-[rgba(47,125,85,0.05)] px-4 py-3 flex items-start gap-2"
        >
          <span className="text-[#2F7D55] text-sm shrink-0 mt-0.5">—</span>
          <p className="text-xs text-[rgba(6,3,43,0.68)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            <span className="font-semibold">Il riconoscimento appartiene a te.</span>{' '}
            Non è visibile individualmente al datore di lavoro. Solo tu decidi se e cosa condividere
            dal tuo Dynamic CV.
          </p>
        </div>

        {/* Recent achievement cards — Task 4 */}
        {recentAchievements.length > 0 && (
          <div className="space-y-2" data-testid="achievement-cards">
            {recentAchievements.map((ach) => {
              const statusColor =
                ach.status === 'recognized'           ? '#C76F3D' :
                ach.status === 'verified'             ? '#2F7D55' :
                ach.status === 'pending_verification' ? '#D99A2B' :
                'rgba(6,3,43,0.42)';
              const statusBg =
                ach.status === 'recognized'           ? 'rgba(199,111,61,0.08)' :
                ach.status === 'verified'             ? 'rgba(47,125,85,0.08)' :
                ach.status === 'pending_verification' ? 'rgba(217,154,43,0.08)' :
                'rgba(6,3,43,0.04)';
              return (
                <div
                  key={ach.id}
                  data-testid={`achievement-card-${ach.id}`}
                  className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)] leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                        {ach.title}
                      </p>
                      <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                        {ach.organization} · {ach.completionDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono',
                          PILLAR_LIGHT[ach.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.60)] border-[rgba(6,3,43,0.08)]',
                        )}
                      >
                        {ach.pillar}
                      </span>
                      <span
                        style={{
                          borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700,
                          background: statusBg, color: statusColor,
                          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                        }}
                      >
                        {ACHIEVEMENT_STATUS_LABELS[ach.status]}
                      </span>
                    </div>
                  </div>
                  {ach.cvEligible && (
                    <p className="text-[10px] text-[#2F7D55] mt-2 font-medium" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                      ✓ Pronto per il Dynamic CV
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. OPPORTUNITY STRIP ─────────────────────────────────────────────── */}
      {opportunities.length > 0 && (
        <div data-testid="opportunity-strip" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#06032B' }}>
              Prossime opportunità
            </h2>
            <span className="rounded border border-[rgba(74,127,224,0.22)] bg-[rgba(74,127,224,0.08)] px-2 py-0.5 text-[9px] font-bold text-[rgba(74,127,224,0.80)] uppercase tracking-[0.08em]">
              PREVIEW
            </span>
          </div>
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4"
                data-testid={`opportunity-card-${opp.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono shrink-0 mt-0.5',
                    PILLAR_LIGHT[opp.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.60)] border-[rgba(6,3,43,0.08)]',
                  )}>
                    {opp.pillar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)] leading-snug" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                      {opp.title}
                    </p>
                    <p className="text-xs text-[rgba(6,3,43,0.52)] mt-1 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                      {opp.match_reason}
                    </p>
                    {opp.partner_type_hint && (
                      <p className="text-[10px] text-[rgba(6,3,43,0.38)] mt-1 italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                        {opp.partner_type_hint}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/my-kora/opportunities"
            className="block text-xs font-semibold text-[rgba(6,3,43,0.55)] hover:text-[rgba(6,3,43,0.80)] transition-colors text-right"
            style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', textDecoration: 'none' }}
          >
            Tutte le opportunità →
          </Link>
        </div>
      )}

      {/* ── 5. QUICK ACTIONS: Dynamic CV + Commons ───────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Dynamic CV card */}
        <div
          className="rounded-xl border border-[rgba(6,3,43,0.10)] bg-[#F8F6F1] p-5 flex flex-col gap-3"
          data-testid="dynamic-cv-card"
        >
          <div>
            <h3 className="text-sm font-bold text-[rgba(6,3,43,0.90)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Dynamic CV
            </h3>
            <p className="text-xs text-[rgba(6,3,43,0.48)] mt-1 italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Il CV dinamico è tuo. Decidi tu cosa esportare.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-[rgba(6,3,43,0.88)]" data-testid="cv-total-count">{totalCVItems}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.45)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>Totale</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[#2F7D55]" data-testid="cv-shareable-count">{shareableCount}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.45)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>Condivisibili</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-[rgba(6,3,43,0.50)]" data-testid="cv-private-count">{privateCVCount}</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.45)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>Solo per te</p>
            </div>
          </div>
          <Link
            href="/my-kora/dynamic-cv"
            className="mt-auto inline-flex items-center gap-1 rounded-lg border border-[rgba(6,3,43,0.14)] bg-white px-3.5 py-2 text-xs font-semibold text-[rgba(6,3,43,0.80)] hover:bg-[rgba(6,3,43,0.04)] transition-colors"
            style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', textDecoration: 'none' }}
            data-testid="dynamic-cv-cta"
          >
            Vedi Dynamic CV →
          </Link>
        </div>

        {/* Commons card */}
        <div
          className="rounded-xl border border-[rgba(74,127,224,0.18)] bg-[rgba(74,127,224,0.04)] p-5 flex flex-col gap-3"
          data-testid="commons-card"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-[rgba(6,3,43,0.90)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                KORA Commons
              </h3>
              <span className="rounded border border-[rgba(74,127,224,0.22)] bg-[rgba(74,127,224,0.10)] px-1.5 py-0.5 text-[9px] font-bold text-[rgba(74,127,224,0.80)] uppercase tracking-[0.08em]">
                PREVIEW
              </span>
            </div>
            <p className="text-xs text-[rgba(6,3,43,0.48)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Commons mostra opportunità di attivazione nel network KORA.
            </p>
          </div>
          {commonsPillars.length > 0 && (
            <div className="flex flex-wrap gap-1" data-testid="commons-pillars">
              {commonsPillars.map((p) => (
                <span key={p} className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono',
                  PILLAR_LIGHT[p] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.60)] border-[rgba(6,3,43,0.08)]',
                )}>
                  {p}
                </span>
              ))}
              <span className="text-[10px] text-[rgba(6,3,43,0.40)] self-center ml-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                {featuredCommons.length} iniziative in evidenza
              </span>
            </div>
          )}
          <p className="text-[10.5px] text-[rgba(6,3,43,0.40)] italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            KORA Commons non è un social network. I tuoi dati rimangono privati.
          </p>
          <Link
            href="/commons"
            className="mt-auto inline-flex items-center gap-1 rounded-lg bg-[#06032B] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', textDecoration: 'none' }}
            data-testid="commons-cta"
          >
            Esplora Commons →
          </Link>
        </div>
      </div>

      {/* ── 6. PRIVACY SNAPSHOT ──────────────────────────────────────────────── */}
      <div
        className="rounded-xl border border-[rgba(6,3,43,0.10)] bg-[#F8F6F1] p-5 space-y-4"
        data-testid="privacy-snapshot"
      >
        <div>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#06032B' }}>
            Chi vede cosa?
          </h2>
          <p className="text-xs text-[rgba(6,3,43,0.58)] mt-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Questo spazio appartiene a te. Il tuo datore di lavoro non può vedere il tuo PIB individuale,
            la tua timeline personale o il tuo Dynamic CV.
            I dati in questa anteprima sono sintetici — dimostrativi, non identità reale.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Employer view */}
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white p-4" data-testid="employer-sees">
            <p className="text-xs font-bold text-[rgba(6,3,43,0.55)] mb-2 uppercase tracking-[0.10em]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Datore di lavoro
            </p>
            <ul className="space-y-1.5">
              {[
                'Aggregati aziendali anonimi',
                'KORA Index organizzativo',
                'Trend a livello d\'azienda',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-[rgba(6,3,43,0.65)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                  <span className="text-[#2F7D55] shrink-0 mt-0.5 font-bold">✓</span>
                  {item}
                </li>
              ))}
              {[
                'Il tuo PIB individuale',
                'Il tuo Dynamic CV',
                'La tua timeline personale',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-[rgba(6,3,43,0.65)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                  <span className="text-[#9E3B2F] shrink-0 mt-0.5 font-bold" data-testid="employer-cannot-see">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Worker view */}
          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.06)] p-4" data-testid="worker-sees">
            <p className="text-xs font-bold text-[#C76F3D] mb-2 uppercase tracking-[0.10em]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Tu
            </p>
            <ul className="space-y-1.5">
              {[
                'Il tuo percorso di attivazione',
                'Il tuo PIB privato',
                'Il tuo Dynamic Impact CV',
                'Decidi tu cosa condividere',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-[rgba(6,3,43,0.70)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                  <span className="text-[#C76F3D] shrink-0 mt-0.5">—</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10.5px] font-semibold text-[#C76F3D] italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Il dato è tuo.
            </p>
          </div>
        </div>

        <Link
          href="/my-kora/privacy"
          className="block text-xs font-semibold text-[rgba(6,3,43,0.50)] hover:text-[rgba(6,3,43,0.80)] transition-colors"
          style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', textDecoration: 'none' }}
          data-testid="privacy-cta"
        >
          Privacy & Condivisione — Consent & Sharing Vault →
        </Link>
      </div>

      {/* ─────────────────────── BELOW FOLD: DETAIL SECTIONS ─────────────────── */}

      {/* ── PIB privato — full breakdown ──────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3" data-testid="pib-section">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Il tuo PIB privato
          </h2>
          <div className="flex items-center gap-2">
            <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-2 py-0.5 text-xs font-mono text-[#C76F3D]">
              privato-lavoratore
            </span>
            <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.42)]">
              IU sintetici pre-computati
            </span>
          </div>
        </div>

        <p className="text-xs text-[rgba(6,3,43,0.60)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Il Personal Impact Balance (PIB) è la stima della tua attivazione nel tempo — quante iniziative hai
          partecipato, con quale intensità verificata, distribuite tra i pillar KORA. Non è un voto.
          Non è una classifica. Non è visibile al tuo datore di lavoro.
        </p>

        {/* Compact headline metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center rounded border border-[rgba(6,3,43,0.06)] bg-white p-2.5">
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)]">{preview.pib_light.overall_index}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">PIB / 100</p>
          </div>
          <div className="text-center rounded border border-[rgba(6,3,43,0.06)] bg-white p-2.5">
            <p className={cn('text-2xl font-bold', PILLAR_TEXT[strongestPillar?.pillar ?? ''] ?? 'text-[rgba(6,3,43,0.90)]')}>
              {strongestPillar?.pillar ?? '—'}
            </p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">Pillar forte</p>
          </div>
          <div className="text-center rounded border border-[rgba(6,3,43,0.06)] bg-white p-2.5">
            <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)]">{preview.pib_light.active_pillars}</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">Pillar attivi</p>
          </div>
        </div>

        {/* PIB derivation disclosure — non-suppressible */}
        <div className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.06)] px-3 py-2">
          <p className="text-[10px] font-semibold text-[#8A5A00]">Dato sintetico · derivato da IU computati</p>
          <p className="text-[10px] text-[#8A5A00] mt-0.5 leading-relaxed">
            {preview.pib_light.pib_derivation_note}
          </p>
        </div>

        <p className="text-xs text-[rgba(6,3,43,0.40)]">
          {preview.pib_light.active_pillars} pillar attivi · {preview.pib_light.total_events} eventi · {preview.pib_light.period}
        </p>

        {/* Pillar breakdown */}
        <div className="divide-y divide-[rgba(6,3,43,0.05)]">
          {preview.pib_light.pillar_breakdown.map((p) => (
            <div key={p.pillar} className="py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-mono font-semibold', PILLAR_TEXT[p.pillar] ?? 'text-[rgba(6,3,43,0.62)]')}>
                    {p.pillar}
                  </span>
                  <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.40)]">
                    Privato
                  </span>
                  {p.iu_total > 0 && (
                    <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.38)]">
                      {p.iu_total.toFixed(2)} IU
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs font-mono text-[rgba(6,3,43,0.52)] shrink-0">
                  {p.score}
                  <span className={cn('text-xs', TREND_COLOR[p.trend])}>{TREND_ICON[p.trend]}</span>
                  <span className="text-[rgba(6,3,43,0.28)] ml-1">{p.event_count} eventi</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[rgba(6,3,43,0.05)] mb-1">
                <div
                  className={cn('h-1.5 rounded-full', PILLAR_COLORS[p.pillar] ?? 'bg-[rgba(6,3,43,0.35)]')}
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)] pt-2 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Questi valori non vengono mostrati all&apos;azienda. L&apos;azienda vede solo aggregati sopra soglia
          privacy (≥10 lavoratori). Il PIB è un indicatore personale — non un voto, non una classifica,
          non un parametro di performance.
        </p>
      </div>

      {/* ── IU plain-language explanation ─────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-4 py-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Cosa sono gli Impact Unit (IU)?
        </p>
        <p className="text-[11px] text-[rgba(6,3,43,0.58)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Gli Impact Unit non servono per valutarti o confrontarti con altri lavoratori. Ogni partecipazione
          verificata produce IU che contribuiscono all&apos;attivazione complessiva dell&apos;organizzazione —
          mai come classifica individuale. Gli IU mostrati in questa anteprima sono calcolati su dati sintetici.
          In Pilot+, deriveranno dalle tue attività realmente verificate.
        </p>
      </div>

      {/* ── "Quando un Impact Unit diventa tuo?" — educational panel ──────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-4" data-testid="iu-educational-panel">
        <div>
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Quando un Impact Unit diventa tuo?
          </h2>
          <p className="text-[11px] text-[rgba(6,3,43,0.40)] mt-0.5" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            In Foundation Light vedi IU sintetici. In Pilot+, i tuoi IU reali seguono questo percorso.
          </p>
        </div>
        <div className="space-y-2">
          {([
            { step: '1', label: "L'attività deve essere idonea.", desc: 'Non tutte le attività generano Impact Units. Solo quelle che producono attivazione reale — verificabile, volontaria, non obbligatoria per legge o contratto.' },
            { step: '2', label: 'Deve essere verificata.', desc: "Una verifica esterna — da LMS, welfare provider, partner KORA o advisor — è necessaria. L'autodichiarazione non è sufficiente da sola." },
            { step: '3', label: 'Non può essere solo conformità o sostegno economico.', desc: "La sicurezza obbligatoria, i voucher e i fringe benefit non generano IU. La baseline non è impatto. KORA misura ciò che va oltre il minimo dovuto." },
            { step: '4', label: 'Nel programma Pilot+ verrà associata al tuo profilo.', desc: 'Solo in Pilot+, con identità worker-owned e consenso, gli IU vengono collegati al tuo percorso personale. In Foundation Light sono sintetici.' },
          ] as { step: string; label: string; desc: string }[]).map(({ step, label, desc }) => (
            <div key={step} className="flex items-start gap-3 rounded-md border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] p-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#C76F3D] flex items-center justify-center text-[10px] font-bold text-white mt-0.5">{step}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.82)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{label}</p>
                <p className="text-[11px] text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2.5">
          <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Non tutte le attività diventano parte del tuo percorso personale.
            KORA considera solo attività idonee e verificabili.
          </p>
        </div>
        <AttributionMatrix />
      </div>

      {/* ── Personal impact timeline — full detail ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Timeline personale
          </h2>
          <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">privata · IU sintetici</span>
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mb-3 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          La timeline personale appartiene al lavoratore. Può contribuire agli aggregati aziendali solo in
          forma anonima e sopra soglia privacy. I valori IU mostrati sono derivati dalla formula
          KORA Methodology v0.1 su dati sintetici.
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {preview.timeline.map((item) => {
              const attribution = workerAttributionService.classify({
                verification_status: item.verification_status,
                source_type: item.source_type,
              });
              return (
                <div key={item.id} className="px-4 py-3 hover:bg-[rgba(6,3,43,0.03)]">
                  <div className="flex items-start gap-3">
                    <div className="text-xs font-mono text-[rgba(6,3,43,0.40)] w-24 shrink-0 mt-0.5">{item.date}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[rgba(6,3,43,0.90)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{item.category}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono',
                          PILLAR_LIGHT[item.pillar] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
                        )}>{item.pillar}</span>
                        <span className={cn('text-[10px] font-medium', VERIF_COLOR[item.verification_status])}>
                          {VERIF_LABEL[item.verification_status]}
                        </span>
                        <span className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.48)]">
                          {item.iu_value.toFixed(2)} IU
                        </span>
                        <span
                          className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]"
                          data-testid={`attribution-badge-${item.id}`}
                        >
                          Classe {attribution.code}
                        </span>
                        <span className="text-[10px] text-[rgba(6,3,43,0.38)]">{attribution.label}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.40)]">Privato</span>
                        {attribution.workerPibEligible ? (
                          <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] px-1.5 py-0.5 text-[10px] text-[#2F7D55]" data-testid={`pib-eligible-${item.id}`}>
                            Può contribuire al tuo PIB
                          </span>
                        ) : (
                          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.38)]" data-testid={`pib-not-eligible-${item.id}`}>
                            Non contribuisce al tuo PIB
                          </span>
                        )}
                        {attribution.dynamicCvEligible ? (
                          <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.06)] px-1.5 py-0.5 text-[10px] text-[#2F7D55]" data-testid={`cv-eligible-attr-${item.id}`}>
                            Può comparire nel Dynamic CV
                          </span>
                        ) : (
                          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.38)]" data-testid={`cv-not-eligible-attr-${item.id}`}>
                            Non idoneo al Dynamic CV
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[rgba(6,3,43,0.38)] mt-0.5 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{item.cv_eligible_reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-[rgba(6,3,43,0.40)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Solo visualizzazione a livello di categoria. Nessun dettaglio sanitario, nome o identificatore personale.
        </p>
      </div>

      {/* ── Company KORA Snapshot — aggregate only ────────────────────────────── */}
      {aggregate && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>Company KORA Snapshot</h2>
            <span className="text-xs text-[rgba(6,3,43,0.40)] font-mono">aggregato · non individuale</span>
          </div>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mb-3 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Questi risultati descrivono la tua organizzazione nel suo insieme. Non mostrano i tuoi dati
            individuali — i tuoi contributi entrano solo come aggregato anonimo sopra soglia privacy.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Activation Rate</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">{(aggregate.activation_rate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Verification Rate</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">{(aggregate.verification_rate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-[rgba(6,3,43,0.40)]">Lavoratori Attivi</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">{aggregate.active_worker_count}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-[rgba(6,3,43,0.40)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Solo dati aggregati aziendali — nessun dato individuale è mostrato o condiviso.
          </p>
        </div>
      )}

      {/* ── KORA Link / QR — FUTURE_VISION ───────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
                KORA Link / QR
              </h2>
              <BoundaryBadge mode="FUTURE_VISION" variant="light" />
            </div>
            <p className="text-xs font-medium text-[rgba(6,3,43,0.60)] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Non disponibile in Foundation Light.
            </p>
            <p className="text-xs text-[rgba(6,3,43,0.40)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              La simulazione qui sotto mostra come un&apos;azione reale diventerebbe evidenza e aggiornamento del
              tuo percorso personale — in Pilot+, quando KORA Link sarà operativo.
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          {KORA_LINK_STEPS.map((step, i) => {
            const stepNum  = i + 1;
            const isComplete = koraLinkStep >= stepNum;
            return (
              <div key={step.label} className={cn('flex items-start gap-3 rounded-md border p-2.5 transition-colors', isComplete ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.10)]' : 'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]')}>
                <span className={cn('shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5', isComplete ? 'bg-[#2F7D55] text-[#06032B]' : 'bg-[rgba(6,3,43,0.12)] text-[rgba(6,3,43,0.52)]')}>
                  {isComplete ? '✓' : stepNum}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold', isComplete ? 'text-[#06032B]' : 'text-[rgba(6,3,43,0.62)]')} style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{step.label}</p>
                  <p className={cn('text-[10px] leading-snug', isComplete ? 'text-[#06032B]/70' : 'text-[rgba(6,3,43,0.40)]')} style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 pt-1">
          {koraLinkStep < KORA_LINK_STEPS.length ? (
            <button onClick={() => setKoraLinkStep((s) => s + 1)} className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-3 py-1.5 text-xs font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.06)] transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              {koraLinkStep === 0 ? 'Simula azione — demo' : `Prossimo step (${koraLinkStep + 1}/${KORA_LINK_STEPS.length})`}
            </button>
          ) : (
            <button onClick={() => setKoraLinkStep(0)} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.52)] hover:bg-[rgba(6,3,43,0.05)] transition-colors" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
              Ricomincia simulazione
            </button>
          )}
          <span className="text-[10px] text-[rgba(6,3,43,0.40)] italic" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            Simulazione locale. Nessun QR/NFC reale, nessuna identità reale, nessuna scrittura su backend.
          </span>
        </div>
      </div>

      {/* ── PreviewToLiveNotice ────────────────────────────────────────────────── */}
      <PreviewToLiveNotice
        what="My KORA è il tuo spazio personale KORA — privato, non accessibile al datore di lavoro."
        preview="Il percorso e i dati mostrati sono costruiti su un profilo sintetico dimostrativo."
        live="Proverranno dalle tue attività realmente verificate tramite la pipeline KORA aziendale."
        privacy="Il tuo datore di lavoro non accede a questo spazio in nessuna modalità."
      />

      {/* ── Synthetic demo notice ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)] leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
        Questa anteprima usa dati sintetici. My KORA è una preview del layer personale.
        Non rappresenta account reali, identità reali, wallet, booking, pagamenti o certificazioni attive.
        Il percorso reale richiederà identità worker-owned e consenso (Pilot+).
        <span className="block mt-0.5 font-mono text-[rgba(6,3,43,0.28)]">
          synthetic_demo_data: true · Foundation Light Preview · KORA Methodology v0.1 · pre_empirical_calibration
        </span>
      </div>
    </div>
  );
}
