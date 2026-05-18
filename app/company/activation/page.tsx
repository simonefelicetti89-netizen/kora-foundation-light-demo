'use client';

import { useScenario } from '@/lib/demo-state';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { PILLAR_CODES } from '@/lib/constants/kora';
import type { PillarCode } from '@/lib/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

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

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{sub}</p>
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
        <h1 className="text-xl font-bold text-slate-900">Activation & Participation</h1>
        <p className="text-sm text-slate-500">
          Aggregate-only view. Groups below {SAFE_AGGREGATION_THRESHOLD} workers are suppressed.
        </p>
      </div>

      {aggregate ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Activation Rate" value={pct(aggregate.activation_rate)} sub="AR" />
            <MetricCard label="Meaningful Activation" value={pct(aggregate.meaningful_activation_rate)} sub="MAR" />
            <MetricCard label="Continuity Rate" value={pct(aggregate.continuity_rate)} sub="CO" />
            <MetricCard label="Verification Rate" value={pct(aggregate.verification_rate)} sub="VR" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Worker Population</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400">Total Workers</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.total_workers}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Active Workers</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.active_worker_count}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Meaningfully Active</p>
                <p className="font-mono font-semibold text-slate-800">{aggregate.meaningful_active_worker_count}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Pillar Distribution</h2>
            <div className="space-y-2">
              {PILLAR_CODES.map((pillar) => {
                const share = aggregate.pillar_distribution[pillar as PillarCode] ?? 0;
                return (
                  <div key={pillar} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-mono text-slate-600">{pillar}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-400"
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
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Department Activation Rate</h2>
            <p className="text-xs text-slate-400 mb-3">
              Only departments with ≥{SAFE_AGGREGATION_THRESHOLD} workers are shown.
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
            {aggregate.methodology_version_id} · {aggregate.calibration_status} · Synthetic demo data
          </p>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
          No aggregate data available for this scenario.
        </div>
      )}
    </div>
  );
}
