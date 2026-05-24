'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { koraContributionService } from '@/services/kora-contribution/KoraContributionService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { cn } from '@/lib/utils';
import type { CollectiveInitiative } from '@/services/kora-contribution/KoraContributionService';

const PILLAR_COLORS: Record<string, string> = {
  LIFE: 'bg-green-100 text-green-700 border-green-200',
  GROWTH: 'bg-blue-100 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-100 text-purple-700 border-purple-200',
  IMPACT: 'bg-orange-100 text-orange-700 border-orange-200',
  LEGACY: 'bg-amber-100 text-amber-700 border-amber-200',
};

const LEVEL_STYLES: Record<string, { badge: string; bar: string }> = {
  minimal:   { badge: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' },
  emerging:  { badge: 'bg-blue-100 text-blue-700',   bar: 'bg-blue-500' },
  active:    { badge: 'bg-green-100 text-green-700',  bar: 'bg-green-500' },
  advanced:  { badge: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-600' },
};

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  planning:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  archived:  'bg-slate-50 text-slate-400 border-slate-200',
};

const VERIFICATION_STYLES: Record<string, string> = {
  verified:     'text-green-600',
  partial:      'text-yellow-600',
  not_started:  'text-slate-400',
  pending:      'text-blue-500',
};

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function InitiativeCard({ initiative }: { initiative: CollectiveInitiative }) {
  const pillarStyle = PILLAR_COLORS[initiative.pillar] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const statusStyle = STATUS_STYLES[initiative.status] ?? STATUS_STYLES.planning;
  const verifStyle = VERIFICATION_STYLES[initiative.verification_status] ?? 'text-slate-400';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight">{initiative.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{initiative.territory}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium capitalize', pillarStyle)}>
            {initiative.pillar}
          </span>
          <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium capitalize', statusStyle)}>
            {initiative.status}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{initiative.description}</p>

      <div className="grid grid-cols-3 gap-2 pt-0.5">
        <div>
          <p className="text-xs text-slate-400">Partecipanti</p>
          <p className="text-sm font-semibold text-slate-700">
            {initiative.aggregate_participation_count}{' '}
            <span className="text-xs font-normal text-slate-400">/ {initiative.aggregate_target_participants}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Verifica</p>
          <p className={cn('text-xs font-medium capitalize', verifStyle)}>
            {initiative.verification_status.replace(/_/g, ' ')}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Aziende</p>
          <p className="text-xs font-medium text-slate-700">{initiative.companies_involved.length}</p>
        </div>
      </div>

      {initiative.partner_name && (
        <p className="text-xs text-slate-400">
          Partner: <span className="text-slate-600">{initiative.partner_name}</span>
        </p>
      )}
    </div>
  );
}

// C-03: KORA Contribution & Collective Initiatives
export default function KoraContribution() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const companyId   = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(companyId);
  const companyName = tenant?.company_name ?? companyId;

  const summary = koraContributionService.getContributionSummary(companyId, activeScenario);
  const allInitiatives = koraContributionService.getCollectiveInitiatives(companyId, activeScenario);

  const levelStyle = LEVEL_STYLES[summary?.contribution_level ?? 'minimal'] ?? LEVEL_STYLES.minimal;
  const scorePct = summary ? Math.min(summary.contribution_score, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">KORA Contribution</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {companyName} — {summary?.reporting_period ?? activeScenario}
        </p>
      </div>

      {/* Companion indicator notice — constitutional, non-suppressible */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-800">KORA Contribution — Companion Indicator</p>
        <p className="mt-1 text-xs text-indigo-700 leading-relaxed">
          {summary?.companion_label ??
            'KORA Contribution misura il contributo collettivo verificato oltre il perimetro aziendale. Complementa il KORA Index — non lo sostituisce.'}
        </p>
        <p className="mt-1.5 text-xs text-indigo-600 leading-relaxed">
          KORA Contribution è un indicatore companion — viene misurato e visualizzato separatamente
          dal KORA Index e non contribuisce al suo calcolo.
        </p>
      </div>

      {/* Score card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Punteggio Contributo</h2>
          {summary && (
            <span className={cn('rounded px-2 py-0.5 text-xs font-semibold capitalize', levelStyle.badge)}>
              {summary.contribution_level}
            </span>
          )}
        </div>
        {summary ? (
          <>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-slate-800">{summary.contribution_score}</span>
              <span className="text-sm text-slate-400 pb-1">/ 100</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div className={cn('h-2 rounded-full', levelStyle.bar)} style={{ width: `${scorePct}%` }} />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{summary.contribution_explanation}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Nessun dato di contributo disponibile per questo scenario.</p>
        )}
      </div>

      {/* Stats row */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Iniziative Collettive" value={summary.collective_initiatives_count} />
          <StatTile label="Partecipazioni Verificate" value={summary.verified_initiative_participations} sub="aggregato" />
          <StatTile label="Cross-Azienda" value={summary.cross_company_initiatives_count} />
          <StatTile label="Partner Ecosistema" value={summary.ecosystem_partners_active} />
        </div>
      )}

      {/* Initiative list */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Iniziative Collettive
        </h2>
        {allInitiatives.length > 0 ? (
          <div className="space-y-3">
            {allInitiatives.map((init) => (
              <InitiativeCard key={init.id} initiative={init} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
            Nessuna iniziativa collettiva registrata per questo scenario.
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-slate-500">
          <strong>Privacy:</strong> Il datore di lavoro non vede la partecipazione individuale. Vengono mostrati solo conteggi aggregati sopra la soglia di privacy. Nessun lavoratore è identificato individualmente.
        </p>
      </div>

      {/* Limitations */}
      {summary?.limitations_text && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Limitazioni</p>
          <p className="text-xs text-amber-700 leading-relaxed">{summary.limitations_text}</p>
        </div>
      )}
    </div>
  );
}
