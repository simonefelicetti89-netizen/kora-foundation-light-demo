'use client';

import { useScenario } from '@/lib/demo-state';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { PILLAR_CODES } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

const PILLAR_BAR_COLORS: Record<string, string> = {
  LIFE:       'bg-green-400',
  GROWTH:     'bg-blue-400',
  CONNECTION: 'bg-purple-400',
  IMPACT:     'bg-orange-400',
  LEGACY:     'bg-amber-400',
};

const DEPT_LABELS: Record<string, string> = {
  'dept-operations': 'Operations',
  'dept-sales': 'Sales',
  'dept-hr-people': 'HR & People',
  'dept-product-engineering': 'Product & Engineering',
  'dept-admin-finance': 'Admin & Finance',
};

function pct(val: number): string {
  return `${(val * 100).toFixed(0)}%`;
}

function MetricCard({ label, value, sub, description }: { label: string; value: string; sub: string; description?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{sub}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1.5 leading-snug border-t border-slate-100 pt-1.5">
          {description}
        </p>
      )}
    </div>
  );
}

// C-08: Activation & Participation
export default function Activation() {
  const { activeScenario } = useScenario();
  const aggregate = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Attivazione & Partecipazione</h1>
        <p className="text-sm text-slate-500">
          Vista solo aggregata. I gruppi con meno di {SAFE_AGGREGATION_THRESHOLD} lavoratori sono soppressi.
        </p>
      </div>

      {aggregate ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Activation Rate"       value={pct(aggregate.activation_rate)}             sub="AR"  description="Quota della forza lavoro idonea con almeno un'Impact Unit approvata nel periodo." />
            <MetricCard label="Meaningful Activation" value={pct(aggregate.meaningful_activation_rate)}  sub="MAR" description="Quota di lavoratori la cui partecipazione supera la soglia di materialità — non solo nominale." />
            <MetricCard label="Continuity Rate"       value={pct(aggregate.continuity_rate)}             sub="CO"  description="Quota di lavoratori con engagement sostenuto in più periodi di rendicontazione." />
            <MetricCard label="Verification Rate"     value={pct(aggregate.verification_rate)}           sub="VR"  description="Quota di attività registrata supportata da evidenze verificate o parzialmente verificate." />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Popolazione Lavoratori</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Lavoratori Totali</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.total_workers}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Lavoratori Attivi</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.active_worker_count}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Attivi Significativi</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.meaningful_active_worker_count}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Distribuzione Pillar</h2>
            <div className="space-y-2">
              {PILLAR_CODES.map((pillar) => {
                const share = aggregate.pillar_distribution[pillar as PillarCode] ?? 0;
                return (
                  <div key={pillar} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-mono text-slate-600">{pillar}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${PILLAR_BAR_COLORS[pillar] ?? 'bg-slate-400'}`}
                        style={{ width: `${share * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right">{pct(share)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Tasso di Attivazione per Dipartimento</h2>
            <p className="text-xs text-slate-400 mb-3">
              Visualizzati solo i dipartimenti con ≥{SAFE_AGGREGATION_THRESHOLD} lavoratori.
            </p>
            <div className="space-y-2">
              {Object.entries(aggregate.department_activation).map(([deptId, rate]) => (
                <div key={deptId} className="flex items-center gap-3">
                  <span className="w-44 text-xs text-slate-600 truncate">
                    {DEPT_LABELS[deptId] ?? deptId}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-teal-400"
                      style={{ width: `${rate * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct(rate)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {aggregate.methodology_version_id} · {aggregate.calibration_status} · Dati demo sintetici
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
          Nessun dato aggregato disponibile per questo scenario.
        </div>
      )}
    </div>
  );
}
