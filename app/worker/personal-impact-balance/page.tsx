// app/worker/personal-impact-balance/page.tsx
// B-WORKER-1: canonical Personal Impact Balance page on the canonical /worker
// surface — the first piece of D-D-mandated capability migration.
//
// This page is the real implementation: real requireWorkerUser() auth, real
// personal.worker_pib (via workerPIBService.getPIBLive, isSynthetic: false)
// and real personal.worker_participation (via the same
// computeActivationProfile() used by /api/worker/activation-profile).
//
// PRIOR HISTORY (accurate as of B-WORKER-1, preserved verbatim): "Scope
// discipline: additive only. /my-kora is not modified or redirected in this
// slice — /worker/workspace and the admin pipeline console both still
// bridge real sessions into /my-kora for capabilities (bookings list, this
// PIB view, KORA_ADMIN founder preview) that had no canonical /worker
// replacement yet. This page removes PIB from that list. Retiring the
// /my-kora bridge itself is a later, separate slice, gated on parity for
// the remaining capabilities." B-WORKER "One Product / No Demo Runtime"
// correction (2026-09-06): that later slice is this one — every /my-kora/**
// page now redirects unconditionally to its canonical /worker/**
// equivalent (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
//
// Privacy: identical invariants to /worker/workspace and /api/worker/pib —
// not_employer_visible, not_performance_score, workerId from session only.
//
// KORA-WP-129 Wave 4b (W2): presentation migrated onto the governed system.
// NOTHING about the computation changed — getPIBLive and
// computeActivationProfile are called exactly as before and every value
// rendered is theirs. ActivationProfileSection is reused UNTOUCHED because it
// is shared with /worker/workspace, a Founder-accepted W1 surface.

import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { workerPIBService } from '@/services/worker-pib/WorkerPIBService';
import {
  computeActivationProfile,
  fetchWorkerParticipationRows,
} from '@/app/api/worker/activation-profile/route';
import { ActivationProfileSection } from '../workspace/_components/ActivationProfileSection';
import { TOKENS, SPACE, typeStyle, TYPE_FAMILY } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Region, Notice, Facts, Metric, MetricStrip } from '@/components/ui/px';

const PILLAR_LABELS: Record<string, string> = {
  LIFE: 'Life', GROWTH: 'Growth', CONNECTION: 'Connection', IMPACT: 'Impact', LEGACY: 'Legacy',
};

export default async function WorkerPersonalImpactBalancePage() {
  const worker = await getCurrentWorkerUser();
  if (!worker) redirect('/login');

  const db = await getSupabaseServerClient();

  const [pib, participationResult] = await Promise.all([
    workerPIBService.getPIBLive(db),
    fetchWorkerParticipationRows(db),
  ]);

  const participationRows = (participationResult.data ?? []) as Parameters<typeof computeActivationProfile>[0];
  const activationProfile = computeActivationProfile(participationRows);

  return (
    <div style={{ minHeight: '100vh', background: TOKENS.surface, fontFamily: TYPE_FAMILY }}>
      <div
        data-testid="worker-pib-page"
        style={{ maxWidth: 1180, margin: '0 auto', padding: `${SPACE.lg}px ${SPACE.md}px ${SPACE['2xl']}px` }}
      >

        <PageHead
          eyebrow="My KORA · Bilancio personale"
          title="Personal Impact Balance"
          lead="Il bilancio privato delle tue esperienze di attivazione."
        />

        {/* Privacy guarantee. Kept directly under the lead rather than demoted:
            this is the statement that makes the whole surface safe to read. */}
        <Notice tone="ok">
          <strong>Dato privato.</strong> Il tuo datore di lavoro non può vedere questo bilancio individuale
          — solo aggregati aziendali sopra soglia. {pib.disclaimer}
        </Notice>

        <Workspace style={{ marginTop: SPACE.lg }}>

          {/* THE RECORD — the page's one purpose. */}
          <Col span="main">
            <Region label="Bilancio del periodo">
              <div data-testid="pib-summary-card">
                {pib.period_iu_total === 0 ? (
                  // DELIBERATELY NOT the KORA-WP-140 `Zero` primitive. Two
                  // governed tests — worker-experience-consolidation and
                  // p1-product-integrity, both titled "honest empty state" —
                  // pin this exact sentence, so the assertion encodes Product
                  // truth rather than superseded presentation. `Zero` composes
                  // its own generic wording and would replace an honest
                  // statement about this worker's period with a template.
                  // Reported as an unmapped state rather than changed silently.
                  <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkHint }}>
                    Nessuna Impact Unit registrata ancora per questo periodo.
                  </p>
                ) : (
                  <>
                    <MetricStrip>
                      <Metric label="Impact Units" value={pib.period_iu_total} />
                      <Metric label="Pillar attivi" value={pib.active_pillars} />
                      <Metric label="Eventi"        value={pib.total_events} />
                    </MetricStrip>

                    <div style={{ marginTop: SPACE.md }}>
                      <Facts
                        rows={pib.pillar_breakdown.map((p) => [
                          PILLAR_LABELS[p.pillar] ?? p.pillar,
                          <span key={p.pillar} style={{ fontVariantNumeric: 'tabular-nums' }}>{p.iu_total} IU</span>,
                        ] as [string, React.ReactNode])}
                      />
                    </div>

                    <p style={{
                      ...typeStyle('caption'), color: TOKENS.inkHint,
                      margin: `${SPACE.md}px 0 0`, borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: SPACE.sm,
                    }}>
                      {pib.activation_level_label} — {pib.activation_level_description}
                    </p>
                  </>
                )}
              </div>
            </Region>
          </Col>

          {/* The activation profile — shared with the Founder-accepted
              /worker/workspace surface and therefore reused UNCHANGED. */}
          <Col span="rail">
            <ActivationProfileSection profile={activationProfile} />
          </Col>
        </Workspace>
      </div>
    </div>
  );
}
