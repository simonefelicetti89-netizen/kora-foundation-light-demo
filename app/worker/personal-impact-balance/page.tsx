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

import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SessionBar } from '@/components/auth/SessionBar';
import { workerPIBService } from '@/services/worker-pib/WorkerPIBService';
import {
  computeActivationProfile,
  fetchWorkerParticipationRows,
} from '@/app/api/worker/activation-profile/route';
import { ActivationProfileSection } from '../workspace/_components/ActivationProfileSection';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

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
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: FONT }}>
      <SessionBar email={worker.email} role={worker.koraRole} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 64px' }}>
        <h1 style={{
          fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.02em',
          color: '#06032B', marginBottom: 4,
        }}>
          Personal Impact Balance
        </h1>
        <p style={{ fontSize: 12.5, color: 'rgba(6,3,43,0.5)', marginBottom: 24 }}>
          Il bilancio privato delle tue esperienze di attivazione.
        </p>

        {/* PIB summary — real data, isSynthetic always false on this canonical path */}
        <div style={{
          background: '#fff', border: '1px solid rgba(6,3,43,0.08)',
          borderRadius: 10, padding: '18px 20px', marginBottom: 16,
        }} data-testid="pib-summary-card">
          {pib.period_iu_total === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', margin: 0 }}>
              Nessuna Impact Unit registrata ancora per questo periodo.
            </p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                <Stat label="Impact Units" value={pib.period_iu_total} />
                <Stat label="Pillar attivi" value={pib.active_pillars} />
                <Stat label="Eventi" value={pib.total_events} />
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {pib.pillar_breakdown.map(p => (
                  <div key={p.pillar} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: '#06032B', fontWeight: 600 }}>{PILLAR_LABELS[p.pillar] ?? p.pillar}</span>
                    <span style={{ color: 'rgba(6,3,43,0.5)', fontVariantNumeric: 'tabular-nums' }}>{p.iu_total} IU</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.4)', marginTop: 14, marginBottom: 0, borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 10 }}>
                {pib.activation_level_label} — {pib.activation_level_description}
              </p>
            </>
          )}
        </div>

        <p style={{
          fontSize: 11, color: '#1a4731', background: 'rgba(47,125,85,0.06)',
          border: '1px solid rgba(47,125,85,0.18)', borderRadius: 8, padding: '12px 16px',
          marginBottom: 20,
        }}>
          <strong>Dato privato.</strong> Il tuo datore di lavoro non può vedere questo bilancio individuale
          — solo aggregati aziendali sopra soglia. {pib.disclaimer}
        </p>

        <ActivationProfileSection profile={activationProfile} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.07)',
      borderRadius: 7, padding: '10px 12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#06032B', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: 'rgba(6,3,43,0.45)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}
