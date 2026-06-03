'use client';
// W-03: Dynamic Impact CV — portfolio di impatto personale del lavoratore.
// Scopo: mostrare al lavoratore le sue attività verificate in formato CV portabile.
// Il lavoratore decide cosa esportare o condividere — il datore non accede mai.

import { useRole, usePersona } from '@/lib/demo-state';
import { myKoraPreviewService } from '@/services/my-kora-preview/MyKoraPreviewService';
import { cn } from '@/lib/utils';

const PILLAR_LIGHT: Record<string, string> = {
  LIFE:       'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  GROWTH:     'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  CONNECTION: 'bg-[rgba(217,151,103,0.10)] text-[#D99767] border-[rgba(217,151,103,0.25)]',
  IMPACT:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  LEGACY:     'bg-[rgba(138,117,98,0.10)] text-[#8A7562] border-[rgba(138,117,98,0.25)]',
};

const VERIF_BADGE: Record<string, string> = {
  verified:      'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  partial:       'bg-[rgba(217,154,43,0.10)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
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
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>Dynamic Impact CV</h1>
          <p className="text-sm text-[rgba(6,3,43,0.52)]">Portfolio di impatto personale del lavoratore</p>
        </div>
        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-6 text-center">
          <p className="text-sm font-semibold text-[#9E3B2F]">Accesso Limitato</p>
          <p className="mt-1 text-xs text-[rgba(158,59,47,0.90)] max-w-sm mx-auto">
            Il Dynamic Impact CV è privato del lavoratore. I ruoli datore di lavoro e admin non possono accedere
            ai dati CV individuali. Il lavoratore decide cosa esportare o condividere.
          </p>
          <p className="mt-3 text-xs font-mono text-[rgba(158,59,47,0.55)]">Ruolo attivo: {activeRole}</p>
        </div>
      </div>
    );
  }

  const cvPreview = myKoraPreviewService.getDynamicCvPreview(activePersona?.id ?? 'persona-a');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 style={{ fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif", fontWeight: 800, fontSize: "1.875rem", letterSpacing: "-0.03em", lineHeight: 1.06, color: "#06032B" }}>Dynamic Impact CV</h1>
          <span style={{ borderRadius: 999, border: "1px solid rgba(6,3,43,0.14)", background: "rgba(6,3,43,0.04)", padding: "2px 8px", fontSize: "10px", fontWeight: 600, color: "rgba(6,3,43,0.52)", fontFamily: "Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif" }}>
            Anteprima
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">{cvPreview.persona_label}</p>
      </div>

      {/* Worker-ownership notice — non-suppressible */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] p-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.88)]">Di proprietà del lavoratore, controllato dal lavoratore.</p>
        <p className="text-xs text-[rgba(6,3,43,0.72)] mt-0.5">
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
      <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-3">
        <p className="text-xs font-semibold text-amber-700 mb-1">Disclaimer</p>
        <p className="text-xs text-amber-700 leading-relaxed">{cvPreview.disclaimer}</p>
      </div>

      {/* Export & sharing actions — Future Vision */}
      <div className="rounded-lg border border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)] px-4 py-3 mb-1">
        <p className="text-xs font-semibold text-[#8A5A00]">
          Future Vision / Non attivo in Foundation Light
        </p>
        <p className="text-xs text-[#D99A2B] mt-0.5">
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
