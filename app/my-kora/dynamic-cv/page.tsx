'use client';

import { useRole, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { cn } from '@/lib/utils';

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-green-50 text-green-700 border-green-200',
  GROWTH:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-orange-50 text-orange-700 border-orange-200',
  LEGACY:     'bg-amber-50 text-amber-700 border-amber-200',
};

const VERIF_BADGE: Record<string, string> = {
  verified:      'bg-green-50 text-green-700 border-green-200',
  partial:       'bg-yellow-50 text-yellow-700 border-yellow-200',
  self_declared: 'bg-slate-50 text-slate-500 border-slate-200',
};

const VERIF_LABEL: Record<string, string> = {
  verified:      'Verified',
  partial:       'Partial',
  self_declared: 'Self-declared',
};

// W-03: Dynamic Impact CV
export default function DynamicCV() {
  const { activeRole } = useRole();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dynamic Impact CV</h1>
          <p className="text-sm text-slate-500">Worker personal impact portfolio</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">Access Restricted</p>
          <p className="mt-1 text-xs text-rose-600 max-w-sm mx-auto">
            Dynamic Impact CV is worker-private. Employer and admin roles cannot access
            individual worker CV data. The worker decides what to export or share.
          </p>
          <p className="mt-3 text-xs font-mono text-rose-400">Current role: {activeRole}</p>
        </div>
      </div>
    );
  }

  const cvPreview = myKoraPreviewService.getDynamicCvPreview(activePersona?.id ?? 'persona-a');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Dynamic Impact CV</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Preview
          </span>
        </div>
        <p className="text-sm text-slate-500">{cvPreview.persona_label}</p>
      </div>

      {/* Worker-ownership notice — non-suppressible */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
        <p className="text-xs font-semibold text-indigo-800">Worker-owned and worker-controlled.</p>
        <p className="text-xs text-indigo-700 mt-0.5">
          Only you decide what to export or share. Your employer cannot see this CV.
          Verified items can be shared with external parties at your discretion.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xs text-slate-400">Total Items</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{cvPreview.total_items}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xs text-slate-400">Verified</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{cvPreview.verified_count}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xs text-slate-400">Shareable</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {cvPreview.items.filter((i) => i.shareable).length}
          </p>
        </div>
      </div>

      {/* CV items */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Impact Items
        </h2>
        <div className="space-y-2">
          {cvPreview.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {item.date} · {item.source_category}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium',
                    PILLAR_LIGHT[item.pillar] ?? 'bg-slate-50 text-slate-600 border-slate-200',
                  )}>
                    {item.pillar_label}
                  </span>
                  <span className={cn('rounded border px-1.5 py-0.5 text-xs',
                    VERIF_BADGE[item.verification_status] ?? VERIF_BADGE.self_declared,
                  )}>
                    {VERIF_LABEL[item.verification_status] ?? item.verification_status}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400 italic">{item.export_label}</p>
                <span className={cn(
                  'text-xs font-medium',
                  item.shareable ? 'text-indigo-600' : 'text-slate-300',
                )}>
                  {item.shareable ? 'Shareable' : 'Not yet shareable'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700 mb-1">Disclaimer</p>
        <p className="text-xs text-amber-700 leading-relaxed">{cvPreview.disclaimer}</p>
      </div>

      {/* Export — disabled, preview only */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Export Dynamic Impact CV</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate a portable, signed impact portfolio for external sharing.
          </p>
        </div>
        <button
          disabled
          className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-400 cursor-not-allowed"
        >
          Export — Preview only
        </button>
      </div>
    </div>
  );
}
