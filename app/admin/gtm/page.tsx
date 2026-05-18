import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const STAGE_STYLES: Record<string, string> = {
  pilot_active:    'bg-green-100 text-green-800 border-green-200',
  pilot_proposed:  'bg-blue-100 text-blue-800 border-blue-200',
  demo_shown:      'bg-indigo-100 text-indigo-800 border-indigo-200',
  contacted:       'bg-yellow-100 text-yellow-800 border-yellow-200',
  prospect:        'bg-slate-100 text-slate-600 border-slate-200',
};

export default function GtmPipeline() {
  const pipeline  = adminPreviewService.getFounderValidationPreview();
  const gates     = adminPreviewService.getGateStatusPreview();
  const totalArr  = pipeline.reduce((s, e) => s + e.potential_arr_eur, 0);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Go-to-Market Pipeline</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Founder / Internal
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Synthetic pipeline data for internal validation. No real company contacts.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xs text-slate-400">Pipeline companies</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{pipeline.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xs text-slate-400">Active pilots</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {pipeline.filter((e) => e.stage === 'pilot_active').length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
          <p className="text-xs text-slate-400">Potential ARR</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            €{(totalArr / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Pipeline entries */}
      <div className="space-y-2">
        {pipeline.map((e) => (
          <div key={e.company_name} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{e.company_name}</p>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STAGE_STYLES[e.stage] ?? STAGE_STYLES.prospect}`}>
                    {e.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{e.signal}</p>
                <p className="text-xs text-slate-400 mt-0.5">Next: {e.next_action}</p>
              </div>
              <p className="shrink-0 text-sm font-mono text-slate-500">€{e.potential_arr_eur.toLocaleString('it-IT')}/yr</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gate status */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Methodology & Gate Status
        </h2>
        <div className="space-y-2">
          {gates.gates.map((g) => (
            <div key={g.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <span className={`shrink-0 mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                g.status === 'CLOSED'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}>
                {g.status}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">{g.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Blocks: {g.blocks}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400 font-mono">
          {gates.methodology_version_id} · calibration: {gates.calibration_status}
        </p>
      </div>
    </div>
  );
}
