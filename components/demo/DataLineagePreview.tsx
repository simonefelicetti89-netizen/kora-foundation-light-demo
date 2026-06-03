'use client';

import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type StepStatus =
  | 'completed'
  | 'active'
  | 'pending'
  | 'review_required'
  | 'blocked'
  | 'excluded'
  | 'tracked_only';

interface StepResult {
  status: StepStatus;
  output: string;
}

interface LineageExample {
  id: string;
  label: string;
  type: 'eligible' | 'limited' | 'blocked' | 'review_required';
  pillar: string | null;
  steps: StepResult[];
}

export interface DataLineagePreviewProps {
  compact?: boolean;
  showHeader?: boolean;
  showMethodologyNote?: boolean;
  className?: string;
}

// ── Pipeline step definitions ─────────────────────────────────────────────────

const STEPS = [
  { num: 1,  label: 'Data Intake',      sublabel: 'File ricevuto / record caricato', rule: 'KORA Operator · nessun self-service cliente' },
  { num: 2,  label: 'Eligibility Gate', sublabel: 'Classificazione eligibility',     rule: 'Eligible / Limited / Blocked / Review Required' },
  { num: 3,  label: 'Pillar Mapping',   sublabel: 'Assegnazione pillar',             rule: 'LIFE / GROWTH / CONNECTION / IMPACT / LEGACY' },
  { num: 4,  label: 'Evidence Review',  sublabel: 'Evidenza & Review',              rule: 'Budget L0–L4 · review advisor se necessario' },
  { num: 5,  label: 'Computazione',     sublabel: 'BTI + Activation + IU Engine',    rule: 'BTI · Activation Reach · IU · KORA macroblocks' },
  { num: 6,  label: 'Aggregazione',     sublabel: 'Privacy & soglie N≥10',           rule: 'Output aggregati · nessun dato individuale employer' },
  { num: 7,  label: 'Decision Pack',    sublabel: 'Output direzionale',             rule: 'Board Pack · CS esterno · no certified claim' },
] as const;

// ── Status styling ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StepStatus, { chip: string; dot: string; short: string; label: string }> = {
  completed:      { chip: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',    dot: 'bg-green-500',  short: '✓', label: 'completato'  },
  active:         { chip: 'border-blue-200 bg-blue-50 text-blue-700',      dot: 'bg-blue-400',   short: '●', label: 'in corso'    },
  pending:        { chip: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',    dot: 'bg-amber-300',  short: '⋯', label: 'in attesa'   },
  review_required:{ chip: 'border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]', dot: 'bg-[#D99A2B]', short: '?', label: 'review'      },
  blocked:        { chip: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',      dot: 'bg-[rgba(158,59,47,0.06)]0',   short: '✗', label: 'bloccato'    },
  excluded:       { chip: 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.40)]',   dot: 'bg-[rgba(6,3,43,0.12)]',  short: '○', label: 'escluso'     },
  tracked_only:   { chip: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.06)] text-[#C76F3D]', dot: 'bg-[rgba(6,3,43,0.30)]', short: '⊘', label: 'tracciato'   },
};

const TYPE_STYLE = {
  eligible:        { badge: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',    card: 'border-green-100',  label: 'Eligible' },
  limited:         { badge: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.06)] text-[#C76F3D]', card: 'border-[rgba(6,3,43,0.06)]', label: 'Limited' },
  blocked:         { badge: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',       card: 'border-[rgba(158,59,47,0.12)]',   label: 'Blocked' },
  review_required: { badge: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',    card: 'border-amber-100',  label: 'Review Required' },
};

const PILLAR_STYLE: Record<string, string> = {
  LIFE:       'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  GROWTH:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  LEGACY:     'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',
};

// ── Canonical examples (initiative/category names only, no worker identities) ──

const EXAMPLES: LineageExample[] = [
  {
    id: 'ex_eligible',
    label: 'Programma upskilling AI',
    type: 'eligible',
    pillar: 'GROWTH',
    steps: [
      { status: 'completed',       output: 'company_upload · KORA Operator' },
      { status: 'completed',       output: 'Eligible · volontario · non-compliance' },
      { status: 'completed',       output: 'GROWTH · confidence 0.88' },
      { status: 'completed',       output: 'L3 provider export · full_weight' },
      { status: 'completed',       output: 'IU generati · BTI full_weight' },
      { status: 'completed',       output: 'Aggregato N≥10 · no individui employer' },
      { status: 'completed',       output: 'Contribuisce al KORA Index' },
    ],
  },
  {
    id: 'ex_limited',
    label: 'Buoni pasto mensili',
    type: 'limited',
    pillar: 'LIFE',
    steps: [
      { status: 'completed',    output: 'company_upload · KORA Operator' },
      { status: 'completed',    output: 'Limited · economic relief · 0 IU' },
      { status: 'completed',    output: 'LIFE (contesto) · economic relief' },
      { status: 'completed',    output: 'L2 internal doc · confidence 0.72' },
      { status: 'tracked_only', output: 'tracked_only · economic_relief_spend · 0 IU' },
      { status: 'tracked_only', output: 'Tracciato in BTI · no attivazione' },
      { status: 'pending',      output: 'Opportunità: riconversione → deep activation' },
    ],
  },
  {
    id: 'ex_blocked',
    label: 'Formazione sicurezza D.Lgs 81/08',
    type: 'blocked',
    pillar: null,
    steps: [
      { status: 'completed', output: 'company_upload · KORA Operator' },
      { status: 'blocked',   output: 'Blocked by Design · compliance legale · 0 IU' },
      { status: 'excluded',  output: 'Non applicabile — record bloccato' },
      { status: 'completed', output: 'L2 doc · tracciato per governance' },
      { status: 'excluded',  output: '0 IU · 0 KORA Index · escluso per design' },
      { status: 'excluded',  output: 'Governance only · no output attivazione' },
      { status: 'excluded',  output: 'Baseline legale — non penalizzata, non premiata' },
    ],
  },
  {
    id: 'ex_review',
    label: 'Rimborso asilo nido 2025',
    type: 'review_required',
    pillar: null,
    steps: [
      { status: 'completed',       output: 'company_upload · KORA Operator' },
      { status: 'review_required', output: 'Review Required · stato obbligatorio non dichiarato' },
      { status: 'pending',         output: 'Mapping tentativo: LIFE · revisione in corso' },
      { status: 'active',          output: 'L0/L1 · evidenza debole · advisor in coda' },
      { status: 'pending',         output: '0 IU fino a validazione Operator/Advisor' },
      { status: 'pending',         output: 'In attesa · non incluso nell\'output' },
      { status: 'pending',         output: 'Non finale · sospeso fino a review' },
    ],
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: StepStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      title={s.label}
      className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold', s.dot)}
      style={{ color: 'white' }}
    >
      {s.short}
    </span>
  );
}

function StatusChip({ status }: { status: StepStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap', s.chip)}>
      {s.label}
    </span>
  );
}

// Full example card — shows 7 steps with output labels
function ExampleCard({ example }: { example: LineageExample }) {
  const typeStyle = TYPE_STYLE[example.type];
  return (
    <div className={cn('rounded-lg border bg-[#F8F6F1] p-3 space-y-3', typeStyle.card)}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)] leading-snug">{example.label}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold', typeStyle.badge)}>
            {typeStyle.label}
          </span>
          {example.pillar && (
            <span className={cn('rounded border px-1 py-0.5 text-[9px] font-mono', PILLAR_STYLE[example.pillar] ?? 'bg-[rgba(6,3,43,0.03)] border-[rgba(6,3,43,0.08)] text-[rgba(6,3,43,0.52)]')}>
              {example.pillar}
            </span>
          )}
        </div>
      </div>

      {/* 7-step trace */}
      <div className="space-y-1.5">
        {STEPS.map((step, i) => {
          const result = example.steps[i];
          const s = STATUS_STYLE[result.status];
          return (
            <div key={step.num} className="flex items-start gap-2">
              <div className="flex items-center gap-1.5 shrink-0 w-[90px]">
                <span className="text-[9px] font-mono text-[rgba(6,3,43,0.28)] w-4 text-right shrink-0">
                  {String(step.num).padStart(2, '0')}
                </span>
                <span className={cn('rounded border px-1 py-px text-[8px] font-semibold whitespace-nowrap', s.chip)}>
                  {s.short}
                </span>
                <span className="text-[9px] font-medium text-[rgba(6,3,43,0.52)] truncate hidden sm:block">
                  {step.label}
                </span>
              </div>
              <p className="text-[9px] text-[rgba(6,3,43,0.40)] leading-snug flex-1 min-w-0 truncate">
                {result.output}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact matrix row for scoring page
function CompactMatrixRow({ example }: { example: LineageExample }) {
  const typeStyle = TYPE_STYLE[example.type];
  return (
    <tr className="border-b border-[rgba(6,3,43,0.04)] last:border-0">
      <td className="px-2 py-2 whitespace-nowrap max-w-[160px]">
        <div className="flex items-center gap-1.5">
          <span className={cn('rounded border px-1 py-px text-[8px] font-bold shrink-0', typeStyle.badge)}>
            {typeStyle.label.slice(0, 4).toUpperCase()}
          </span>
          <span className="text-[10px] font-medium text-[rgba(6,3,43,0.78)] truncate">{example.label}</span>
        </div>
      </td>
      {example.steps.map((step, i) => (
        <td key={i} className="px-2 py-2 text-center">
          <StatusDot status={step.status} />
        </td>
      ))}
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DataLineagePreview({
  compact = false,
  showHeader = true,
  showMethodologyNote = true,
  className,
}: DataLineagePreviewProps) {

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {showHeader && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">
              Lineage Snapshot
            </h3>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">
              Ogni macroblocco dell&apos;Index deve poter essere ricondotto a fonti, regole e decisioni di review.
            </p>
          </div>
        )}

        {/* Pipeline step labels */}
        <div className="overflow-x-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-[rgba(6,3,43,0.05)]">
                <th className="px-2 py-1.5 text-left font-semibold text-[rgba(6,3,43,0.40)] w-[180px]">
                  Categoria iniziativa
                </th>
                {STEPS.map((s) => (
                  <th key={s.num} className="px-2 py-1.5 text-center font-semibold text-[rgba(6,3,43,0.40)] whitespace-nowrap">
                    <span className="font-mono">{String(s.num).padStart(2, '0')}</span>
                    <span className="hidden sm:block text-[8px] font-normal text-[rgba(6,3,43,0.28)] mt-0.5">{s.label.split(' ')[0]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((ex) => (
                <CompactMatrixRow key={ex.id} example={ex} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[9px]">
          {(Object.entries(STATUS_STYLE) as [StepStatus, typeof STATUS_STYLE[StepStatus]][])
            .filter(([, s]) => ['completed', 'tracked_only', 'blocked', 'excluded', 'review_required', 'pending'].includes(s.label === 'completato' ? 'completed' : s.label))
            .slice(0, 6)
            .map(([key, s]) => (
              <span key={key} className="flex items-center gap-1">
                <span className={cn('inline-block h-3 w-3 rounded-full', s.dot)} />
                <span className="text-[rgba(6,3,43,0.40)]">{s.label}</span>
              </span>
            ))
          }
        </div>

        {showMethodologyNote && (
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)] pt-2 leading-relaxed">
            Data Lineage Preview è rule-based pre-empirical. Non è audit trail certificato.
            Persistenza, versioning e firme advisor richiedono la fase SaaS/backend.
          </p>
        )}
      </div>
    );
  }

  // ── Full variant ───────────────────────────────────────────────────────────

  return (
    <div className={cn('space-y-5', className)}>
      {showHeader && (
        <div>
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Data Lineage Preview</h2>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mt-1 leading-relaxed max-w-2xl">
            Dal dato ricevuto all&apos;output direzionale: KORA mostra il percorso metodologico prima del Decision Pack.
          </p>
        </div>
      )}

      {/* Pipeline strip — responsive grid, no horizontal scroll */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STEPS.map((step) => (
          <div key={step.num} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2 text-center">
            <p className="text-[10px] font-mono font-bold text-[rgba(6,3,43,0.40)]">
              {String(step.num).padStart(2, '0')}
            </p>
            <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.78)] mt-0.5 leading-tight">
              {step.label}
            </p>
            <p className="text-[8px] text-[rgba(6,3,43,0.40)] mt-0.5 leading-tight">
              {step.sublabel}
            </p>
            <p className="text-[8px] text-[rgba(6,3,43,0.28)] mt-1 leading-tight border-t border-[rgba(6,3,43,0.04)] pt-1">
              {step.rule}
            </p>
          </div>
        ))}
      </div>

      {/* Example cards */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-2">
          Esempi metodologici — iniziative/categorie, nessuna identità lavoratore
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <ExampleCard key={ex.id} example={ex} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(STATUS_STYLE) as [StepStatus, typeof STATUS_STYLE[StepStatus]][]).map(([key, s]) => (
          <span key={key} className="flex items-center gap-1.5 text-[10px]">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', s.dot)} />
            <span className="text-[rgba(6,3,43,0.52)]">{s.label}</span>
          </span>
        ))}
      </div>

      {showMethodologyNote && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3 space-y-1.5 text-[11px] text-[rgba(6,3,43,0.52)]">
          <p className="font-semibold text-[rgba(6,3,43,0.62)] text-[10px] uppercase tracking-wide">Nota metodologica</p>
          <p>
            Data Lineage Preview è una rappresentazione rule-based pre-empirical. Non è audit trail certificato:
            persistenza, versioning e firme advisor richiedono la fase SaaS/backend.
          </p>
          <ul className="list-disc list-inside space-y-0.5 pl-1">
            <li>Confidence Score rimane esterno al KORA Index (peso = 0).</li>
            <li>Blocked compliance rimane escluso per design — non penalizzato.</li>
            <li>Review Required non contribuisce fino a validazione Operator/Advisor.</li>
            <li>Company vede solo output aggregato — nessun dato record-level operativo.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
