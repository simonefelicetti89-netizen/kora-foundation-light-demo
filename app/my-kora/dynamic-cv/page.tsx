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
  self_declared: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
};

const VERIF_LABEL: Record<string, string> = {
  verified:      'Verificato',
  partial:       'Parziale',
  self_declared: 'Autodichiarato',
};

// W-03: Dynamic Impact CV
export default function DynamicCV() {
  const { activeRole } = useRole();
  const { activePersona } = usePersona();

  if (!myKoraPreviewService.canAccess(activeRole)) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#06032B]">Dynamic Impact CV</h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Portfolio di impatto personale del lavoratore</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-700">Accesso Limitato</p>
          <p className="mt-1 text-xs text-rose-600 max-w-sm mx-auto">
            Il Dynamic Impact CV è privato del lavoratore. I ruoli datore di lavoro e admin non possono accedere
            ai dati CV individuali. Il lavoratore decide cosa esportare o condividere.
          </p>
          <p className="mt-3 text-xs font-mono text-rose-400">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  const cvPreview = myKoraPreviewService.getDynamicCvPreview(activePersona?.id ?? 'persona-a');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#06032B]">Dynamic Impact CV</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Anteprima
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">{cvPreview.persona_label}</p>
      </div>

      {/* Worker-ownership notice — non-suppressible */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-3">
        <p className="text-xs font-semibold text-indigo-800">Di proprietà del lavoratore, controllato dal lavoratore.</p>
        <p className="text-xs text-indigo-700 mt-0.5">
          Solo tu decidi cosa esportare o condividere. Il tuo datore di lavoro non può vedere questo CV.
          Gli elementi verificati possono essere condivisi con parti esterne a tua discrezione.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Elementi Totali</p>
          <p className="text-2xl font-bold text-[rgba(6,3,43,0.90)] mt-1">{cvPreview.total_items}</p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Verificati</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{cvPreview.verified_count}</p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Condivisibili</p>
          <p className="text-2xl font-bold text-[#C76F3D] mt-1">
            {cvPreview.items.filter((i) => i.shareable).length}
          </p>
        </div>
      </div>

      {/* CV items */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Elementi di Impatto
        </h2>
        <div className="space-y-2">
          {cvPreview.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{item.title}</p>
                  <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5 font-mono">
                    {item.date} · {item.source_category}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium',
                    PILLAR_LIGHT[item.pillar] ?? 'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
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
                <p className="text-xs text-[rgba(6,3,43,0.40)] italic">{item.export_label}</p>
                {/* Visibility control per item — demo-only */}
                <span className={cn(
                  'rounded border px-2 py-0.5 text-xs font-medium cursor-not-allowed',
                  item.shareable
                    ? 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]'
                    : 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
                )}>
                  {item.shareable ? '🔓 Condivisibile' : '🔒 Privato'}
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

      {/* Export & sharing actions — Future Vision */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 mb-1">
        <p className="text-xs font-semibold text-orange-700">
          Future Vision / Non attivo in Foundation Light
        </p>
        <p className="text-xs text-orange-600 mt-0.5">
          Le funzioni di esportazione e condivisione sono previste post-pilota. Nessuna esportazione reale avviene in questa demo.
        </p>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Esporta profilo — Future Vision</p>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
              Genera un portfolio di impatto portabile e firmato per la condivisione esterna.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
          >
            Esporta — Non attivo
          </button>
        </div>
        <div className="border-t border-[rgba(6,3,43,0.05)] pt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Condividi su LinkedIn — Future Vision</p>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mt-0.5">
              Aggiungi il tuo KORA Impact Badge al profilo LinkedIn con evidenze verificate.
            </p>
          </div>
          <button
            disabled
            className="shrink-0 rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.40)] cursor-not-allowed"
          >
            LinkedIn — Non attivo
          </button>
        </div>
      </div>
    </div>
  );
}
