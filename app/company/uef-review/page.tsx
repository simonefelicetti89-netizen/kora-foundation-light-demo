'use client';

import { useState, useMemo } from 'react';
import { uefReviewService } from '@/services/uef-review/UEFReviewService';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';
import { cn } from '@/lib/utils';
import { ACTION_FAMILY_LABELS } from '@/lib/constants/kora';
import type {
  UEFReviewRecord,
  UEFReviewStatus,
  UEFAuditEvent,
  PillarCode,
} from '@/lib/types';

// ── Styling maps ───────────────────────────────────────────────────────────────

const REVIEW_STATUS_STYLE: Record<UEFReviewStatus, { badge: string; label: string }> = {
  pending:                      { badge: 'bg-amber-50 text-amber-700 border-amber-200',    label: 'In attesa' },
  approved_for_scoring:         { badge: 'bg-green-50 text-green-700 border-green-200',    label: 'Approvato — Scoring' },
  approved_for_bti_governance:  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Approvato — BTI' },
  blocked_by_design:            { badge: 'bg-rose-50 text-rose-700 border-rose-200',       label: 'Bloccato by Design' },
  needs_more_data:              { badge: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Dati mancanti' },
  rejected:                     { badge: 'bg-slate-100 text-slate-500 border-slate-200',   label: 'Rifiutato' },
  override_to_eligible:         { badge: 'bg-teal-50 text-teal-700 border-teal-200',       label: 'Override → Eligible' },
  override_to_limited:          { badge: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Override → Limited' },
};

const ELIGIBILITY_STYLE: Record<string, { badge: string; label: string }> = {
  eligible: { badge: 'bg-green-50 text-green-700 border-green-200',    label: 'Eligible' },
  limited:  { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Limited' },
  blocked:  { badge: 'bg-rose-50 text-rose-700 border-rose-200',       label: 'Blocked' },
};

const PILLAR_BADGE: Record<PillarCode, string> = {
  LIFE:       'bg-green-50 text-green-700 border-green-200',
  GROWTH:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-orange-50 text-orange-700 border-orange-200',
  LEGACY:     'bg-amber-50 text-amber-700 border-amber-200',
};

const AUDIT_EVENT_LABELS: Record<string, string> = {
  review_assigned:        'Assegnato a revisione',
  review_decision_made:   'Decisione di revisione',
  record_approved:        'Record approvato',
  record_rejected:        'Record rifiutato',
  record_blocked:         'Record bloccato',
  eligibility_overridden: 'Eligibilità modificata',
  kora_ready_set:         'KORA-Ready impostato',
  more_data_requested:    'Dati aggiuntivi richiesti',
};

const ACTOR_LABELS: Record<string, string> = {
  pipeline:       'Pipeline',
  human_reviewer: 'Revisore',
  system:         'Sistema',
};

const DECISION_LABELS: Record<string, string> = {
  approve_scoring:        'Approvato per Scoring',
  approve_bti_governance: 'Approvato per BTI',
  mark_blocked:           'Confermato Bloccato',
  request_more_data:      'Richiesti Dati',
  reject:                 'Rifiutato',
  override_to_eligible:   'Override Eligible',
  override_to_limited:    'Override Limited',
};

type QueueFilter = 'all' | 'pending' | 'approved_for_scoring' | 'approved_for_bti_governance' | 'blocked_by_design';

// ── Sub-components ─────────────────────────────────────────────────────────────

function FlagBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <span className={cn(
      'rounded border px-2 py-0.5 text-[10px] font-medium',
      value ? 'border-green-200 bg-green-50 text-green-600' : 'border-rose-100 bg-rose-50 text-rose-500',
    )}>
      {value ? '✓' : '✗'} {label}
    </span>
  );
}

function DetailPanel({ record, onClose }: { record: UEFReviewRecord; onClose: () => void }) {
  const elig   = ELIGIBILITY_STYLE[record.eligibility] ?? ELIGIBILITY_STYLE.eligible;
  const status = REVIEW_STATUS_STYLE[record.review_status];

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-800">{record.raw_name}</h2>
        <div className="flex items-center gap-2">
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', elig.badge)}>
            {elig.label}
          </span>
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', status.badge)}>
            {status.label}
          </span>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 underline">
            Chiudi
          </button>
        </div>
      </div>

      {/* Classification */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Classificazione Pipeline
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: 'Famiglia azione',  value: ACTION_FAMILY_LABELS[record.action_family] ?? record.action_family },
            { label: 'Natura evento',    value: record.event_nature.replace(/_/g, ' ') },
            { label: 'Completezza dati', value: `${Math.round(record.data_completeness_score * 100)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded border border-slate-100 bg-white px-2 py-1.5">
              <p className="text-[10px] text-slate-400">{label}</p>
              <p className="mt-0.5 text-xs text-slate-700">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Governance flags */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          KoraReadyRecord — Flag Governance
        </p>
        <div className="flex flex-wrap gap-2">
          <FlagBadge label="Scoring approvato"        value={record.approved_for_scoring} />
          <FlagBadge label="BTI governance approvato" value={record.approved_for_bti_governance} />
          <FlagBadge label="Impact Units approvati"   value={record.approved_for_impact_units} />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Blocked → tutti false · Limited → solo BTI · Eligible + review_required → tutti false · Eligible + approvato → scoring e IU abilitati.
        </p>
      </div>

      {/* Review decision */}
      {record.review_decision && (
        <div className="rounded border border-slate-200 bg-white px-3 py-2.5 text-xs space-y-1">
          <p className="font-semibold text-slate-500">Decisione di revisione</p>
          <p className="text-slate-700">{DECISION_LABELS[record.review_decision] ?? record.review_decision}</p>
          {record.reviewer_notes && (
            <p className="text-slate-500 leading-relaxed">{record.reviewer_notes}</p>
          )}
          {record.reviewed_by && (
            <p className="text-[10px] text-slate-400">
              Revisore: {record.reviewed_by} · {record.reviewed_at ? new Date(record.reviewed_at).toLocaleString('it-IT') : '—'}
            </p>
          )}
        </div>
      )}

      {record.review_status === 'pending' && (
        <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <p className="font-semibold mb-0.5">In attesa di revisione umana</p>
          <p>Questo record richiede validazione prima di poter entrare nel KORA Activation Core.</p>
        </div>
      )}

      {/* Missing fields */}
      {record.missing_fields.length > 0 && (
        <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">Campi mancanti</p>
          <ul className="space-y-0.5">
            {record.missing_fields.map((f) => (
              <li key={f} className="text-xs text-amber-600">· {f.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}

      {record.additional_questions.length > 0 && (
        <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-500 mb-1">Domande per completamento dati</p>
          <ul className="space-y-1">
            {record.additional_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                <span className="shrink-0 font-bold text-slate-300">?</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Demo action buttons */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Controlli revisione (demo)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!record.approved_for_scoring}
            className={cn(
              'rounded border px-3 py-1.5 text-xs font-medium',
              record.approved_for_scoring
                ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer'
                : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed',
            )}
          >
            Approva per Scoring ✓
          </button>
          <button disabled className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 cursor-not-allowed opacity-60">
            Approva per BTI
          </button>
          <button disabled className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-600 cursor-not-allowed opacity-60">
            Richiedi dati
          </button>
          <button disabled className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed">
            Rifiuta
          </button>
          <button disabled className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed">
            Override eligibilità
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Foundation Light usa stato deterministico demo — i controlli di revisione interattivi si attivano in fase pilot.
        </p>
      </div>
    </div>
  );
}

function AuditEventRow({ event }: { event: UEFAuditEvent }) {
  const actorStyle =
    event.actor === 'pipeline'       ? 'text-violet-600 bg-violet-50 border-violet-200' :
    event.actor === 'human_reviewer' ? 'text-blue-600 bg-blue-50 border-blue-200' :
    'text-slate-500 bg-slate-50 border-slate-200';

  const dateStr = new Date(event.timestamp).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold', actorStyle)}>
        {ACTOR_LABELS[event.actor] ?? event.actor}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-slate-700">
            {AUDIT_EVENT_LABELS[event.event_type] ?? event.event_type}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[180px]">{event.raw_name}</span>
          {event.decision && (
            <span className="text-[10px] font-mono text-slate-500">
              → {DECISION_LABELS[event.decision] ?? event.decision}
            </span>
          )}
        </div>
        {event.notes && (
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">{event.notes}</p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-slate-300 font-mono">{dateStr}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

// C-05: UEF Review & Validazione Umana
export default function UEFReview() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter]         = useState<QueueFilter>('all');

  const records    = useMemo(() => uefReviewService.getReviewRecords(), []);
  const summary    = useMemo(() => uefReviewService.getReviewSummary(), []);
  const auditTrail = useMemo(() => uefReviewService.getAuditTrail().slice(0, 10), []);

  const selectedRecord = selectedId ? (records.find((r) => r.id === selectedId) ?? null) : null;

  const filteredRecords = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((r) => r.review_status === filter);
  }, [records, filter]);

  const filterCounts: Record<QueueFilter, number> = {
    all:                         records.length,
    pending:                     summary.pending_count,
    approved_for_scoring:        summary.approved_for_scoring_count,
    approved_for_bti_governance: summary.approved_for_bti_governance_count,
    blocked_by_design:           summary.blocked_count,
  };

  const filterLabels: Record<QueueFilter, string> = {
    all:                         'Tutti',
    pending:                     'In attesa',
    approved_for_scoring:        'Approvati — Scoring',
    approved_for_bti_governance: 'Approvati — BTI',
    blocked_by_design:           'Bloccati',
  };

  return (
    <div className="space-y-6">

      {/* ── Operator boundary banner ─────────────────────────────────────── */}
      <OperatorToolBoundary />

      {/* ── A: Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900">UEF Review & Validazione Umana</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
            Stage 4 di 14
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-400">
            synthetic_demo_data: true
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500 italic">
          &ldquo;L&apos;AI propone. La metodologia governa. La revisione umana valida.&rdquo;
        </p>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
          Ogni record classificato dall&apos;AI Ingestion entra in questa fase prima di poter generare Impact Units.
          La revisione umana garantisce che solo azioni verificate e approvate entrino nel KORA Activation Core.
        </p>
      </div>

      {/* ── B: Pipeline Position Banner ── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-800 mb-2">
          Sei in Stage 4 — tra Eligibility Gate (Stage 3) e IU Computation (Stage 10)
        </p>
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          {[
            { label: 'Dati Raw',         col: 'border-slate-200 bg-white text-slate-500' },
            { label: 'Normalizzazione',  col: 'border-violet-200 bg-violet-50 text-violet-600' },
            { label: 'Eligibility Gate', col: 'border-blue-200 bg-blue-50 text-blue-700' },
            { label: 'UEF Review ←',     col: 'border-amber-300 bg-amber-100 text-amber-800 font-bold' },
            { label: 'IU Computation',   col: 'border-green-200 bg-green-50 text-green-600' },
            { label: 'KORA Index v3',    col: 'border-slate-200 bg-white text-slate-500' },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-1">
              <span className={cn('rounded border px-2 py-1', step.col)}>{step.label}</span>
              {i < arr.length - 1 && <span className="text-slate-300">→</span>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-amber-700">
          Solo i record con <span className="font-semibold">approved_for_impact_units: true</span> usciti
          da questo stage entrano nel calcolo IU. Record pending, blocked e rejected non generano Impact Units.
        </p>
      </div>

      {/* ── C: Summary Stats ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Riepilogo Revisione — {summary.total_records} record
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-[10px] text-slate-400">Totale</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.total_records}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <p className="text-[10px] text-green-600">Approvati Scoring</p>
            <p className="text-2xl font-bold text-green-700 mt-0.5">{summary.approved_for_scoring_count}</p>
            <p className="text-[9px] text-green-500 mt-0.5">IU-ready</p>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-center">
            <p className="text-[10px] text-indigo-600">Approvati BTI</p>
            <p className="text-2xl font-bold text-indigo-700 mt-0.5">{summary.approved_for_bti_governance_count}</p>
            <p className="text-[9px] text-indigo-500 mt-0.5">BTI only</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center">
            <p className="text-[10px] text-rose-600">Bloccati</p>
            <p className="text-2xl font-bold text-rose-700 mt-0.5">{summary.blocked_count}</p>
            <p className="text-[9px] text-rose-500 mt-0.5">0 IU</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
            <p className="text-[10px] text-amber-600">In attesa</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{summary.pending_count}</p>
            <p className="text-[9px] text-amber-500 mt-0.5">review richiesta</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-[10px] text-slate-400">Review completata</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">
              {Math.round(summary.review_completion_rate * 100)}%
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">
              {summary.total_records - summary.pending_count}/{summary.total_records}
            </p>
          </div>
        </div>
      </div>

      {/* ── D: KORA-Ready Output ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Output di questo Stage — Cosa esce verso IU Computation
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-green-200 bg-green-50 p-3">
            <p className="text-[10px] text-green-600 font-semibold">IU-Ready</p>
            <p className="text-xl font-bold text-green-700 mt-0.5">{summary.kora_ready_for_iu_count}</p>
            <p className="text-[10px] text-green-500 mt-1 leading-snug">
              Eligible + approved_for_impact_units → entrano in IU Computation
            </p>
          </div>
          <div className="rounded border border-indigo-200 bg-indigo-50 p-3">
            <p className="text-[10px] text-indigo-600 font-semibold">BTI Governance Only</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">{summary.kora_ready_for_bti_count}</p>
            <p className="text-[10px] text-indigo-500 mt-1 leading-snug">
              Limited → tracciati in BTI engine come economic_relief_spend · 0 IU
            </p>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3">
            <p className="text-[10px] text-amber-600 font-semibold">In attesa</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{summary.pending_count}</p>
            <p className="text-[10px] text-amber-500 mt-1 leading-snug">
              Nessuna IU fino a revisione completata · bloccati nel gate
            </p>
          </div>
          <div className="rounded border border-rose-200 bg-rose-50 p-3">
            <p className="text-[10px] text-rose-600 font-semibold">Esclusi dalla pipeline</p>
            <p className="text-xl font-bold text-rose-700 mt-0.5">{summary.blocked_count + summary.rejected_count}</p>
            <p className="text-[10px] text-rose-500 mt-1 leading-snug">
              Blocked by Design + rifiutati · 0 IU · tracciati per governance
            </p>
          </div>
        </div>
      </div>

      {/* ── E: Review Queue ── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Coda di Revisione
          </h2>
          {selectedId && (
            <button onClick={() => setSelectedId(null)} className="text-xs text-slate-400 hover:text-slate-600 underline">
              Chiudi dettaglio
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(Object.keys(filterLabels) as QueueFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded border px-2.5 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'border-slate-400 bg-slate-100 text-slate-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
              )}
            >
              {filterLabels[f]}{' '}
              <span className="font-mono text-[10px]">({filterCounts[f]})</span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Record</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Famiglia</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Pillar</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Eligibility</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Stato Review</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Decisione</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">IU</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-slate-500">Azione</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const elig       = ELIGIBILITY_STYLE[rec.eligibility] ?? ELIGIBILITY_STYLE.eligible;
                  const revStatus  = REVIEW_STATUS_STYLE[rec.review_status];
                  const isSelected = rec.id === selectedId;
                  return (
                    <tr
                      key={rec.id}
                      className={cn(
                        'border-b border-slate-50 last:border-0 cursor-pointer transition-colors',
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50',
                      )}
                      onClick={() => setSelectedId(isSelected ? null : rec.id)}
                    >
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <p className="font-medium text-slate-800 truncate">{rec.raw_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{rec.pipeline_row_id}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {ACTION_FAMILY_LABELS[rec.action_family] ?? rec.action_family}
                      </td>
                      <td className="px-3 py-2.5">
                        {rec.primary_pillar ? (
                          <span className={cn(
                            'rounded border px-1 py-0.5 text-[10px] font-mono',
                            PILLAR_BADGE[rec.primary_pillar as PillarCode] ?? 'bg-slate-50 text-slate-500 border-slate-200',
                          )}>
                            {rec.primary_pillar}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', elig.badge)}>
                          {elig.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap', revStatus.badge)}>
                          {revStatus.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-[10px]">
                        {rec.review_decision
                          ? (DECISION_LABELS[rec.review_decision] ?? rec.review_decision)
                          : <span className="italic">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          'text-[10px] font-semibold',
                          rec.approved_for_impact_units ? 'text-green-600' : 'text-slate-300',
                        )}>
                          {rec.approved_for_impact_units ? '✓' : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : rec.id); }}
                        >
                          {isSelected ? 'Chiudi' : 'Dettaglio'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Clicca una riga per aprire il dettaglio e i controlli di revisione. Dati sintetici demo.
        </p>
      </div>

      {/* ── F: Detail Panel ── */}
      {selectedRecord && (
        <DetailPanel record={selectedRecord} onClose={() => setSelectedId(null)} />
      )}

      {/* ── G: Audit Trail ── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Audit Trail — Ultimi {auditTrail.length} eventi
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 divide-y divide-slate-50">
          {auditTrail.map((event) => (
            <AuditEventRow key={event.id} event={event} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Ogni decisione di revisione è tracciata in modo permanente — il trail è la memoria metodologica del processo.
        </p>
      </div>

      {/* ── H: Governance Rules ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Regole di Governance — Canoniche e Non Negoziabili
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              header: 'Blocked by Design → 0 IU',
              body: 'La compliance obbligatoria non genera attivazione. 0 IU · 0 KORA Index · tracciato solo per governance.',
              style: 'border-rose-200 bg-rose-50 text-rose-700',
            },
            {
              header: 'Limited (Economic Relief) → BTI only',
              body: "I benefit cash-like non generano IU. Tracciati in BTI engine come economic_relief_spend. Non è spesa sbagliata — è spesa che può diventare più intelligente.",
              style: 'border-indigo-200 bg-indigo-50 text-indigo-700',
            },
            {
              header: 'Pending → 0 IU fino a risoluzione',
              body: 'Nessuna Impact Unit può essere generata da un record non ancora validato dal revisore umano.',
              style: 'border-amber-200 bg-amber-50 text-amber-700',
            },
            {
              header: 'Eligible + approvato → può generare IU',
              body: 'Solo con approved_for_impact_units: true il record entra in IU Computation. La revisione umana conferma la classificazione AI.',
              style: 'border-green-200 bg-green-50 text-green-700',
            },
          ].map((rule) => (
            <div key={rule.header} className={cn('rounded border px-3 py-2 text-xs', rule.style)}>
              <p className="font-semibold mb-0.5">{rule.header}</p>
              <p className="leading-relaxed opacity-90">{rule.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── I: Footer ── */}
      <p className="text-xs text-slate-400">
        {summary.methodology_version} · {summary.calibration_status} · Dati demo sintetici · synthetic_demo_data: true
      </p>

    </div>
  );
}
