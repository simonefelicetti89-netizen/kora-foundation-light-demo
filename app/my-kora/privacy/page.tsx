'use client';

import { useRole, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { cn } from '@/lib/utils';

// W-02: Privacy & Sharing
export default function PrivacySharing() {
  const { activeRole } = useRole();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Privacy & Sharing</h1>
          <p className="text-sm text-slate-500">Worker consent and data sharing preferences</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">Access Restricted</p>
          <p className="mt-1 text-xs text-rose-600 max-w-sm mx-auto">
            Privacy preferences are worker-private. Employer and admin roles cannot view or
            modify individual worker consent settings.
          </p>
          <p className="mt-3 text-xs font-mono text-rose-400">Current role: {activeRole}</p>
        </div>
      </div>
    );
  }

  const privacy = myKoraPreviewService.getPrivacySummary(activePersona?.id ?? 'persona-a');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Privacy & Sharing</h1>
        <p className="text-sm text-slate-500">{privacy.persona_label}</p>
      </div>

      {/* Core privacy guarantee — non-suppressible */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-sm font-semibold text-indigo-800">Your privacy is constitutional.</p>
        <p className="mt-1 text-xs text-indigo-700 leading-relaxed">{privacy.privacy_guarantee}</p>
      </div>

      {/* Two-column: what company sees vs. does not see */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-green-500 text-white text-center leading-4 text-[10px]">✓</span>
            Your employer CAN see
          </p>
          <ul className="space-y-1.5">
            {privacy.company_can_see.map((item, i) => (
              <li key={i} className="text-xs text-green-700 leading-relaxed flex gap-1.5">
                <span className="text-green-400 shrink-0 mt-0.5">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold text-rose-800 mb-2 flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-rose-500 text-white text-center leading-4 text-[10px]">✕</span>
            Your employer CANNOT see
          </p>
          <ul className="space-y-1.5">
            {privacy.company_cannot_see.map((item, i) => (
              <li key={i} className="text-xs text-rose-700 leading-relaxed flex gap-1.5">
                <span className="text-rose-400 shrink-0 mt-0.5">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Consent toggles */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Consent Preferences
        </h2>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
          <p className="text-xs font-semibold text-amber-700">Preview only</p>
          <p className="text-xs text-amber-700 mt-0.5">
            These controls are shown for illustration only. No real consent action occurs in Foundation Light.
            In production, changes would be cryptographically recorded and immediately applied.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {privacy.consent_toggles.map((toggle) => (
              <div key={toggle.id} className="px-4 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{toggle.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toggle.description}</p>
                  <p className="text-xs font-mono text-slate-300 mt-0.5">scope: {toggle.scope}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {/* Visual toggle — non-interactive in Foundation Light */}
                  <button
                    disabled
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-not-allowed',
                      toggle.current_state === 'on' ? 'bg-indigo-400' : 'bg-slate-200',
                    )}
                    aria-label={`${toggle.label} — preview only`}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform mx-0.5',
                        toggle.current_state === 'on' ? 'translate-x-4' : 'translate-x-0',
                      )}
                    />
                  </button>
                  <span className="text-xs text-slate-400 font-mono">preview only</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data deletion notice */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-600 mb-1">Data Deletion & Portability</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          In production, workers may request full data deletion or portable export at any time.
          Foundation Light does not process live data — no deletion workflow is active in this demo.
        </p>
        <p className="mt-1.5 text-xs font-mono text-slate-400">
          delete_request: preview_only · export_request: preview_only
        </p>
      </div>
    </div>
  );
}
