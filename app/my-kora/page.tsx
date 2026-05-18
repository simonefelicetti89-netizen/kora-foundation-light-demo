'use client';

import Link from 'next/link';
import { useRole, useScenario, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { cn } from '@/lib/utils';

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'bg-green-500',
  GROWTH:     'bg-blue-500',
  CONNECTION: 'bg-purple-500',
  IMPACT:     'bg-orange-500',
  LEGACY:     'bg-amber-500',
};

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-green-50 text-green-700 border-green-200',
  GROWTH:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-orange-50 text-orange-700 border-orange-200',
  LEGACY:     'bg-amber-50 text-amber-700 border-amber-200',
};

const VERIF_STYLES: Record<string, string> = {
  verified:      'text-green-600',
  partial:       'text-yellow-600',
  self_declared: 'text-slate-400',
};

const IU_STYLES: Record<string, string> = {
  high:   'text-green-600',
  medium: 'text-blue-600',
  low:    'text-slate-400',
};

const TREND_ICON: Record<string, string> = {
  up:     '↑',
  stable: '→',
  down:   '↓',
};

const TREND_COLOR: Record<string, string> = {
  up:     'text-green-500',
  stable: 'text-slate-400',
  down:   'text-red-400',
};

// W-01: My KORA Home
export default function MyKoraHome() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My KORA</h1>
          <p className="text-sm text-slate-500">Worker personal space</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">Access Restricted</p>
          <p className="mt-1 text-xs text-rose-600 max-w-sm mx-auto">
            My KORA is a worker-private space. Employer and admin roles cannot access individual worker data.
            Individual worker data is never visible outside the worker&rsquo;s own session.
          </p>
          <p className="mt-3 text-xs font-mono text-rose-400">Current role: {activeRole}</p>
          <p className="mt-1 text-xs text-rose-400">Switch to WORKER_MY_KORA role to preview this space.</p>
        </div>
      </div>
    );
  }

  const preview = myKoraPreviewService.getMyKoraHomePreview(
    activePersona?.id ?? 'persona-a',
    activeScenario,
  );
  const aggregate = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);

  if (!preview) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My KORA</h1>
        <p className="text-sm text-slate-500">
          {activePersona ? activePersona.display_name : preview.persona_label}
          {' '}— {activeScenario}
        </p>
      </div>

      {/* Worker-private banner — non-suppressible */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <p className="text-xs font-semibold text-indigo-800">This space belongs to the worker.</p>
        <p className="text-xs text-indigo-700 mt-0.5">
          Your employer cannot access individual My KORA data. Only aggregate, anonymized data
          contributes to the company KORA Index. Nothing here is visible to your employer.
        </p>
      </div>

      {/* PIB Light preview card */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Personal Impact Balance</h2>
            <p className="text-xs text-slate-400 mt-0.5">{preview.pib_light.period}</p>
          </div>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-500">
            worker-private
          </span>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-slate-800">{preview.pib_light.overall_index}</span>
          <span className="text-sm text-slate-400 pb-1">/ 100</span>
          <span className="text-xs text-slate-500 pb-1">
            {preview.pib_light.active_pillars} active pillars · {preview.pib_light.total_events} events
          </span>
        </div>

        <div className="space-y-2">
          {preview.pib_light.pillar_breakdown.map((p) => (
            <div key={p.pillar}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-slate-700">{p.label}</span>
                <span className="flex items-center gap-1 font-mono text-slate-500">
                  {p.score}
                  <span className={cn('text-xs', TREND_COLOR[p.trend])}>
                    {TREND_ICON[p.trend]}
                  </span>
                  <span className="text-slate-300 ml-1">{p.event_count} events</span>
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={cn('h-1.5 rounded-full', PILLAR_COLORS[p.pillar] ?? 'bg-slate-400')}
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 border-t border-slate-100 pt-2 leading-relaxed">
          {preview.pib_light.disclaimer}
        </p>
      </div>

      {/* Personal timeline */}
      <div>
        <p className="mb-3 text-xs text-slate-500 leading-relaxed">
          Your personal impact timeline shows category-level actions that contribute to your Personal Impact Balance across the five KORA pillars.
        </p>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Personal Timeline
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {preview.timeline.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <div className="text-xs font-mono text-slate-400 w-20 shrink-0">{item.date}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.category}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {item.source_type.replace(/_/g, ' ')}
                  </p>
                </div>
                <span className={cn('rounded border px-1.5 py-0.5 text-xs font-mono shrink-0',
                  PILLAR_LIGHT[item.pillar] ?? 'bg-slate-100 text-slate-600 border-slate-200',
                )}>
                  {item.pillar}
                </span>
                <span className={cn('text-xs font-medium capitalize shrink-0 w-20 text-right',
                  VERIF_STYLES[item.verification_status],
                )}>
                  {item.verification_status.replace(/_/g, ' ')}
                </span>
                <span className={cn('text-xs font-mono shrink-0 w-12 text-right', IU_STYLES[item.iu_contribution])}>
                  IU: {item.iu_contribution}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          Category-level display only. No health details, names, or identifiers.
        </p>
      </div>

      {/* Company KORA Snapshot — aggregate only */}
      {aggregate && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Company KORA Snapshot</h2>
            <span className="text-xs text-slate-400 font-mono">aggregate</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-400">Activation Rate</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {(aggregate.activation_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Verification Rate</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {(aggregate.verification_rate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Workers</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {aggregate.active_worker_count}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Company-level figures only. No individual data is shown here.
          </p>
        </div>
      )}

      {/* Opportunities preview */}
      <div>
        <p className="mb-3 text-xs text-slate-500 leading-relaxed">
          Opportunities are KORA-matched learning, development, wellbeing and contribution pathways aligned to the worker&apos;s personal impact profile.
          In Foundation Light, these are preview items only — availability and requests unlock post-pilot.
        </p>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Opportunities
        </h2>
        <div className="space-y-2">
          {preview.opportunities.map((opp) => (
            <div
              key={opp.id}
              className="rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{opp.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{opp.type} · {opp.provider}</p>
              </div>
              <span className={cn('rounded border px-1.5 py-0.5 text-xs font-mono shrink-0',
                PILLAR_LIGHT[opp.pillar] ?? 'bg-slate-100 text-slate-600 border-slate-200',
              )}>
                {opp.pillar}
              </span>
              <span className="text-xs text-slate-400 shrink-0">
                {opp.status === 'preview' ? 'Preview only' : 'Coming soon'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/my-kora/dynamic-cv"
          className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-700">Dynamic Impact CV</p>
          <p className="text-xs text-slate-400 mt-0.5">Your verified impact portfolio</p>
        </Link>
        <Link
          href="/my-kora/privacy"
          className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
        >
          <p className="text-sm font-semibold text-slate-700">Privacy & Sharing</p>
          <p className="text-xs text-slate-400 mt-0.5">Control what is shared and with whom</p>
        </Link>
      </div>

      {/* Synthetic demo notice */}
      <p className="text-xs text-center text-slate-300 font-mono">
        synthetic_demo_data: true · Foundation Light Preview
      </p>
    </div>
  );
}
