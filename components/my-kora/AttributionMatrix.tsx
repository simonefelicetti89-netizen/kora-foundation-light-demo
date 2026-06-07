'use client';
// components/my-kora/AttributionMatrix.tsx
// B85-B Task 9 — Visual attribution class matrix for worker explainability.
// Worker-readable language. Not methodology-heavy.
// A → Yes/Yes · B → Conditional/Conditional · C–F → No/No

import type { AttributionCode } from '@/services/worker-attribution/WorkerAttributionService';

interface MatrixRow {
  code: AttributionCode;
  label: string;
  description: string;
  pib: 'yes' | 'conditional' | 'no';
  cv: 'yes' | 'conditional' | 'no';
}

const MATRIX_ROWS: MatrixRow[] = [
  { code: 'A', label: 'Verified Individual',  description: 'Verificato da fonte esterna',       pib: 'yes',         cv: 'yes'         },
  { code: 'B', label: 'Partially Verified',   description: 'Verifica parziale in corso',         pib: 'conditional', cv: 'conditional' },
  { code: 'C', label: 'Self-Declared',        description: 'Autodichiarato — non verificato',    pib: 'no',          cv: 'no'          },
  { code: 'D', label: 'Structural Policy',    description: 'Policy organizzativa — aggregato',   pib: 'no',          cv: 'no'          },
  { code: 'E', label: 'Economic Relief',      description: 'Sostegno economico — nessun IU',     pib: 'no',          cv: 'no'          },
  { code: 'F', label: 'Blocked Compliance',   description: 'Compliance obbligatoria — esclusa',  pib: 'no',          cv: 'no'          },
];

function EligCell({ value }: { value: 'yes' | 'conditional' | 'no' }) {
  if (value === 'yes') {
    return (
      <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#2F7D55]">
        Sì
      </span>
    );
  }
  if (value === 'conditional') {
    return (
      <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">
        Condizionale
      </span>
    );
  }
  return (
    <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.04)] px-2 py-0.5 text-[10px] font-semibold text-[rgba(6,3,43,0.40)]">
      No
    </span>
  );
}

export function AttributionMatrix() {
  return (
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden" data-testid="attribution-matrix">
      <div className="px-4 py-3 border-b border-[rgba(6,3,43,0.05)]">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">Classi di Attribuzione KORA</p>
        <p className="text-[11px] text-[rgba(6,3,43,0.40)] mt-0.5">
          A quale classe appartiene un&apos;attività e cosa implica per il tuo percorso personale.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[rgba(6,3,43,0.02)] border-b border-[rgba(6,3,43,0.05)]">
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide whitespace-nowrap">
                Classe
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide">
                Descrizione
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide whitespace-nowrap">
                PIB
              </th>
              <th className="px-3 py-2 text-center text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide whitespace-nowrap">
                Dynamic CV
              </th>
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map((row) => (
              <tr key={row.code} className="border-b border-[rgba(6,3,43,0.04)] last:border-0">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded border border-[rgba(6,3,43,0.12)] bg-[rgba(6,3,43,0.05)] px-1.5 py-0.5 text-[10px] font-bold font-mono text-[rgba(6,3,43,0.62)]">
                      {row.code}
                    </span>
                    <span className="text-xs font-medium text-[rgba(6,3,43,0.78)]">{row.label}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-[rgba(6,3,43,0.52)]">
                  {row.description}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <EligCell value={row.pib} />
                </td>
                <td className="px-3 py-2.5 text-center">
                  <EligCell value={row.cv} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-[rgba(6,3,43,0.05)]">
        <p className="text-[10px] text-[rgba(6,3,43,0.38)] italic">
          Condizionale = dipende dalla verifica completa in Pilot+. Dati sintetici — Foundation Light v0.1.
        </p>
      </div>
    </div>
  );
}
