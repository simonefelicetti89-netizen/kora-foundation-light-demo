'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { uefReviewService } from '@/services/uef-review/UEFReviewService';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';
import { DataLineagePreview } from '@/components/demo/DataLineagePreview';
import { cn } from '@/lib/utils';
import { ACTION_FAMILY_LABELS } from '@/lib/constants/kora';
import type {
  UEFReviewRecord,
  UEFReviewStatus,
  UEFAuditEvent,
  PillarCode,
} from '@/lib/types';

// ── Filter types ───────────────────────────────────────────────────────────────

type PrimaryFilter =
  | 'all'
  | 'review_required'
  | 'weak_evidence'
  | 'blocked'
  | 'limited'
  | 'missing_budget'
  | 'sensitive_excluded';

type PillarFilter = 'all' | PillarCode;

// ── Styling maps ───────────────────────────────────────────────────────────────

const REVIEW_STATUS_STYLE: Record<UEFReviewStatus, { badge: string; label: string }> = {
  pending:                      { badge: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',    label: 'In attesa' },
  approved_for_scoring:         { badge: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',    label: 'Approvato — Scoring' },
  approved_for_bti_governance:  { badge: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]', label: 'Approvato — BTI' },
  blocked_by_design:            { badge: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',       label: 'Bloccato by Design' },
  needs_more_data:              { badge: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]', label: 'Dati mancanti' },
  rejected:                     { badge: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',   label: 'Rifiutato' },
  override_to_eligible:         { badge: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.72)] border-[rgba(6,3,43,0.08)]',       label: 'Override → Eligible' },
  override_to_limited:          { badge: 'bg-[rgba(107,122,146,0.10)] text-[#344256] border-[rgba(107,122,146,0.22)]', label: 'Override → Limited' },
};

const ELIGIBILITY_STYLE: Record<string, { badge: string; label: string }> = {
  eligible: { badge: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',    label: 'Eligible' },
  limited:  { badge: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]', label: 'Limited' },
  blocked:  { badge: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',       label: 'Blocked' },
};

const PILLAR_BADGE: Record<PillarCode, string> = {
  LIFE:       'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  GROWTH:     'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
  IMPACT:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  LEGACY:     'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',
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

// ── Derivation helpers ─────────────────────────────────────────────────────────

function getBudgetEvidenceLabel(score: number): { label: string; cls: string } {
  if (score >= 0.75) return { label: 'L2–L4',      cls: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' };
  if (score >= 0.50) return { label: 'L1 Dich.',   cls: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]' };
  return                     { label: 'L0 Nessuna', cls: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]' };
}

function getReviewReason(rec: UEFReviewRecord): string {
  if (rec.review_status === 'blocked_by_design' || rec.eligibility === 'blocked') {
    return 'Compliance baseline — Blocked by Design';
  }
  if (rec.eligibility === 'limited') {
    return 'Economic relief — Limited';
  }
  if (rec.review_status === 'rejected') {
    return 'Sensitive/high-risk field excluded';
  }
  if (rec.review_status === 'needs_more_data') {
    return 'Evidenza L0/L1';
  }
  if (rec.missing_fields.some((f) =>
    f.toLowerCase().includes('budget') ||
    f.toLowerCase().includes('fonte') ||
    f.toLowerCase().includes('source') ||
    f.toLowerCase().includes('importo'),
  )) {
    return 'Budget source mancante';
  }
  if (rec.data_completeness_score < 0.50) {
    return 'Evidenza L0/L1';
  }
  if (!rec.primary_pillar) {
    return 'Pillar mapping confidence low';
  }
  if (rec.review_status === 'pending') {
    return 'Categoria ambigua';
  }
  return '—';
}

function getSuggestedDecision(rec: UEFReviewRecord): { label: string; cls: string } {
  if (rec.review_status === 'blocked_by_design' || rec.eligibility === 'blocked') {
    return { label: 'Keep Blocked',               cls: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]' };
  }
  if (rec.eligibility === 'limited') {
    return { label: 'Keep Limited',               cls: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]' };
  }
  if (rec.review_status === 'rejected') {
    return { label: 'Exclude from BTI',           cls: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]' };
  }
  if (rec.approved_for_impact_units) {
    return { label: 'Approve as Eligible',        cls: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' };
  }
  if (rec.review_status === 'needs_more_data') {
    return { label: 'Request evidence',           cls: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]' };
  }
  if (!rec.primary_pillar || rec.data_completeness_score < 0.40) {
    return { label: 'Escalate to Advisor',        cls: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]' };
  }
  if (rec.missing_fields.some((f) => f.toLowerCase().includes('budget'))) {
    return { label: 'Exclude from BTI',           cls: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]' };
  }
  return { label: 'Needs company clarification', cls: 'bg-blue-50 text-blue-600 border-blue-200' };
}

function getBTILabel(rec: UEFReviewRecord): { label: string; cls: string } {
  if (rec.eligibility === 'blocked') {
    return { label: 'excluded_from_bti',   cls: 'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]' };
  }
  if (rec.eligibility === 'limited') {
    return { label: 'tracked_only',        cls: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]' };
  }
  if (rec.approved_for_scoring && rec.data_completeness_score >= 0.75) {
    return { label: 'full_weight',         cls: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' };
  }
  if (rec.approved_for_bti_governance) {
    return { label: 'confidence_weighted', cls: 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]' };
  }
  return { label: 'review_required',     cls: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]' };
}

function isWeakEvidence(rec: UEFReviewRecord): boolean {
  return rec.data_completeness_score < 0.50 || rec.review_status === 'needs_more_data';
}

function isMissingBudget(rec: UEFReviewRecord): boolean {
  return rec.missing_fields.some((f) =>
    f.toLowerCase().includes('budget') ||
    f.toLowerCase().includes('fonte') ||
    f.toLowerCase().includes('source') ||
    f.toLowerCase().includes('importo'),
  ) || (rec.eligibility === 'eligible' && rec.data_completeness_score < 0.35 && rec.review_status === 'pending');
}

function isSensitiveExcluded(rec: UEFReviewRecord): boolean {
  return rec.review_status === 'rejected';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FlagBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <span className={cn(
      'rounded border px-2 py-0.5 text-[10px] font-medium',
      value ? 'border-[rgba(47,125,85,0.22)] bg-green-50 text-green-600' : 'border-[rgba(158,59,47,0.12)] bg-[rgba(158,59,47,0.06)] text-[rgba(158,59,47,0.75)]',
    )}>
      {value ? '✓' : '✗'} {label}
    </span>
  );
}

function DetailPanel({ record, onClose }: { record: UEFReviewRecord; onClose: () => void }) {
  const elig             = ELIGIBILITY_STYLE[record.eligibility] ?? ELIGIBILITY_STYLE.eligible;
  const status           = REVIEW_STATUS_STYLE[record.review_status];
  const reviewReason     = getReviewReason(record);
  const suggestedDecision = getSuggestedDecision(record);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{record.raw_name}</h2>
        <div className="flex items-center gap-2">
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', elig.badge)}>
            {elig.label}
          </span>
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold', status.badge)}>
            {status.label}
          </span>
          <button onClick={onClose} className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline">
            Chiudi
          </button>
        </div>
      </div>

      {/* Review context */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] px-2 py-1.5">
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Motivo revisione</p>
          <p className="mt-0.5 text-xs text-[rgba(6,3,43,0.78)] leading-snug">{reviewReason}</p>
        </div>
        <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] px-2 py-1.5">
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Decisione suggerita</p>
          <span className={cn('mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold', suggestedDecision.cls)}>
            {suggestedDecision.label}
          </span>
        </div>
        <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] px-2 py-1.5">
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Confidenza</p>
          <p className="mt-0.5 text-xs text-[rgba(6,3,43,0.78)] font-mono">{Math.round(record.data_completeness_score * 100)}%</p>
        </div>
        <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] px-2 py-1.5">
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Famiglia azione</p>
          <p className="mt-0.5 text-xs text-[rgba(6,3,43,0.78)]">{ACTION_FAMILY_LABELS[record.action_family] ?? record.action_family}</p>
        </div>
      </div>

      {/* Classification */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-2">
          Classificazione Pipeline
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { label: 'Natura evento',    value: record.event_nature.replace(/_/g, ' ') },
            { label: 'Completezza dati', value: `${Math.round(record.data_completeness_score * 100)}%` },
            { label: 'Pipeline ID',      value: record.pipeline_row_id },
          ].map(({ label, value }) => (
            <div key={label} className="rounded border border-[rgba(6,3,43,0.05)] bg-[#F8F6F1] px-2 py-1.5">
              <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{label}</p>
              <p className="mt-0.5 text-xs text-[rgba(6,3,43,0.78)] font-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Governance flags */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-2">
          KoraReadyRecord — Flag Governance
        </p>
        <div className="flex flex-wrap gap-2">
          <FlagBadge label="Scoring approvato"        value={record.approved_for_scoring} />
          <FlagBadge label="BTI governance approvato" value={record.approved_for_bti_governance} />
          <FlagBadge label="Impact Units approvati"   value={record.approved_for_impact_units} />
        </div>
        <p className="mt-1.5 text-[10px] text-[rgba(6,3,43,0.40)]">
          Blocked → tutti false · Limited → solo BTI · Eligible + review_required → tutti false · Eligible + approvato → scoring e IU abilitati.
        </p>
      </div>

      {/* Review decision */}
      {record.review_decision && (
        <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2.5 text-xs space-y-1">
          <p className="font-semibold text-[rgba(6,3,43,0.52)]">Decisione di revisione</p>
          <p className="text-[rgba(6,3,43,0.78)]">{DECISION_LABELS[record.review_decision] ?? record.review_decision}</p>
          {record.reviewer_notes && (
            <p className="text-[rgba(6,3,43,0.52)] leading-relaxed">{record.reviewer_notes}</p>
          )}
          {record.reviewed_by && (
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
              Revisore: {record.reviewed_by} · {record.reviewed_at ? new Date(record.reviewed_at).toLocaleString('it-IT') : '—'}
            </p>
          )}
        </div>
      )}

      {record.review_status === 'pending' && (
        <div className="rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-3 py-2 text-xs text-amber-700">
          <p className="font-semibold mb-0.5">In attesa di revisione Operator / Advisor</p>
          <p>Questo record richiede validazione metodologica prima di poter entrare nel KORA Activation Core.</p>
        </div>
      )}

      {/* Missing fields */}
      {record.missing_fields.length > 0 && (
        <div className="rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-3 py-2">
          <p className="text-xs font-semibold text-amber-700 mb-1">Campi mancanti</p>
          <ul className="space-y-0.5">
            {record.missing_fields.map((f) => (
              <li key={f} className="text-xs text-amber-600">· {f.replace(/_/g, ' ')}</li>
            ))}
          </ul>
        </div>
      )}

      {record.additional_questions.length > 0 && (
        <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)] mb-1">Domande per completamento dati</p>
          <ul className="space-y-1">
            {record.additional_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[rgba(6,3,43,0.52)]">
                <span className="shrink-0 font-bold text-[rgba(6,3,43,0.28)]">?</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advisor actions — preview */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-2">
          Azioni Advisor — Preview (backend richiesto)
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Approva classificazione',   cls: 'border-[rgba(47,125,85,0.22)] bg-green-50 text-green-600' },
            { label: 'Richiedi evidenza',          cls: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-600' },
            { label: 'Escala ad Advisor',          cls: 'border-blue-200 bg-blue-50 text-blue-600' },
            { label: 'Escludi da BTI',             cls: 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.40)]' },
            { label: 'Conferma per Decision Pack', cls: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] text-[#C76F3D]' },
          ].map((btn) => (
            <button
              key={btn.label}
              disabled
              className={cn('rounded border px-3 py-1.5 text-xs font-medium cursor-not-allowed opacity-50', btn.cls)}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-[rgba(6,3,43,0.40)]">
          Backend richiesto · Foundation Light usa stato deterministico demo.
        </p>
      </div>
    </div>
  );
}

function AuditEventRow({ event }: { event: UEFAuditEvent }) {
  const actorStyle =
    event.actor === 'pipeline'       ? 'text-violet-600 bg-violet-50 border-violet-200' :
    event.actor === 'human_reviewer' ? 'text-blue-600 bg-blue-50 border-blue-200' :
    'text-[rgba(6,3,43,0.52)] bg-[rgba(6,3,43,0.03)] border-[rgba(6,3,43,0.08)]';

  const dateStr = new Date(event.timestamp).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex items-start gap-3 py-2 border-b border-[rgba(6,3,43,0.04)] last:border-0">
      <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold', actorStyle)}>
        {ACTOR_LABELS[event.actor] ?? event.actor}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-[rgba(6,3,43,0.78)]">
            {AUDIT_EVENT_LABELS[event.event_type] ?? event.event_type}
          </span>
          <span className="text-[10px] text-[rgba(6,3,43,0.40)] truncate max-w-[180px]">{event.raw_name}</span>
          {event.decision && (
            <span className="text-[10px] font-mono text-[rgba(6,3,43,0.52)]">
              → {DECISION_LABELS[event.decision] ?? event.decision}
            </span>
          )}
        </div>
        {event.notes && (
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 leading-snug truncate">{event.notes}</p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-[rgba(6,3,43,0.28)] font-mono">{dateStr}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function UEFReview() {
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [primaryFilter, setPrimaryFilter] = useState<PrimaryFilter>('all');
  const [pillarFilter, setPillarFilter]   = useState<PillarFilter>('all');

  const records    = useMemo(() => uefReviewService.getReviewRecords(), []);
  const summary    = useMemo(() => uefReviewService.getReviewSummary(), []);
  const auditTrail = useMemo(() => uefReviewService.getAuditTrail().slice(0, 10), []);

  const selectedRecord = selectedId ? (records.find((r) => r.id === selectedId) ?? null) : null;

  // ── Queue stats ──────────────────────────────────────────────────────────────

  const queueStats = useMemo(() => ({
    reviewRequired:      records.filter((r) => r.review_status === 'pending' || r.review_status === 'needs_more_data').length,
    weakEvidence:        records.filter((r) => isWeakEvidence(r)).length,
    blocked:             records.filter((r) => r.review_status === 'blocked_by_design' || r.eligibility === 'blocked').length,
    limited:             records.filter((r) => r.eligibility === 'limited').length,
    missingBudget:       records.filter((r) => isMissingBudget(r)).length,
    sensitiveExcluded:   records.filter((r) => isSensitiveExcluded(r)).length,
    readyForAdvisor:     records.filter((r) => r.review_status === 'pending' && r.data_completeness_score >= 0.50 && r.primary_pillar !== null).length,
    readyForDecisionPack: records.filter((r) => r.approved_for_impact_units).length,
  }), [records]);

  // ── Filtered records ─────────────────────────────────────────────────────────

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesPrimary =
        primaryFilter === 'all'                ? true :
        primaryFilter === 'review_required'    ? (r.review_status === 'pending' || r.review_status === 'needs_more_data') :
        primaryFilter === 'weak_evidence'      ? isWeakEvidence(r) :
        primaryFilter === 'blocked'            ? (r.review_status === 'blocked_by_design' || r.eligibility === 'blocked') :
        primaryFilter === 'limited'            ? r.eligibility === 'limited' :
        primaryFilter === 'missing_budget'     ? isMissingBudget(r) :
        primaryFilter === 'sensitive_excluded' ? isSensitiveExcluded(r) :
        true;

      const matchesPillar = pillarFilter === 'all' ? true : r.primary_pillar === pillarFilter;

      return matchesPrimary && matchesPillar;
    });
  }, [records, primaryFilter, pillarFilter]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Operator boundary ─────────────────────────────────────────────────── */}
      <OperatorToolBoundary />

      {/* ── Part 1: Header + role framing ────────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-[#06032B]">KORA Operator Review Queue</h1>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-mono text-[rgba(6,3,43,0.40)]">
            synthetic_demo_data: true
          </span>
        </div>
        <p className="mt-1 text-sm text-[rgba(6,3,43,0.62)] max-w-2xl leading-relaxed">
          Coda metodologica per record Review Required, evidenze deboli, mapping ambigui e decisioni advisor prima del Decision Pack.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            {
              role: 'KORA Operator',
              desc: 'Prepara la coda, verifica classificazioni e coordina le richieste di evidenza.',
              cls:  'border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.78)]',
            },
            {
              role: 'Advisor',
              desc: 'Valida i casi ambigui, evidenze incomplete e override metodologici. Non vede identità lavoratore.',
              cls:  'border-blue-200 bg-blue-50 text-blue-700',
            },
            {
              role: 'Company',
              desc: 'Riceve solo output aggregato (KORA Index, Decision Pack). Non esegue revisione.',
              cls:  'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
            },
          ].map((item) => (
            <div key={item.role} className={cn('rounded border px-3 py-2 text-xs max-w-xs', item.cls)}>
              <p className="font-semibold">{item.role}</p>
              <p className="mt-0.5 opacity-80 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Part 7: Flow navigation ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href="/company/data/upload"
          className="flex items-center gap-1.5 rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-1.5 text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          ← KORA Operator Data Intake Studio
        </Link>
        <span className="text-[rgba(6,3,43,0.28)] font-mono">·</span>
        <span className="rounded border border-[rgba(6,3,43,0.30)] bg-[rgba(6,3,43,0.05)] px-3 py-1.5 font-semibold text-[rgba(6,3,43,0.78)]">
          Operator Review Queue
        </span>
        <span className="text-[rgba(6,3,43,0.28)] font-mono">·</span>
        <Link
          href="/company/scoring"
          className="flex items-center gap-1.5 rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-1.5 text-[rgba(6,3,43,0.52)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          Scoring Preview →
        </Link>
        <Link
          href="/company/reports"
          className="flex items-center gap-1.5 rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-1.5 text-[rgba(6,3,43,0.52)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          Decision Pack →
        </Link>
        <p className="w-full text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">
          Data Intake produce la coda; Review Queue prepara Scoring e Decision Pack.
        </p>
      </div>

      {/* ── Part 2: Queue Summary Board ──────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Riepilogo Coda — {records.length} record totali
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {([
            { label: 'Review Required',         count: queueStats.reviewRequired,       cls: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',   filter: 'review_required' },
            { label: 'Evidenza Debole L0/L1',   count: queueStats.weakEvidence,         cls: 'border-[rgba(217,154,43,0.22)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]', filter: 'weak_evidence' },
            { label: 'Blocked by Design',       count: queueStats.blocked,              cls: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',       filter: 'blocked' },
            { label: 'Limited / Econ. Relief',  count: queueStats.limited,              cls: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]', filter: 'limited' },
            { label: 'Budget Source Mancante',  count: queueStats.missingBudget,        cls: 'border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)]',   filter: 'missing_budget' },
            { label: 'Sensitive Esclusi',       count: queueStats.sensitiveExcluded,    cls: 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.52)]',       filter: 'sensitive_excluded' },
            { label: 'Pronti Advisor Review',   count: queueStats.readyForAdvisor,      cls: 'border-blue-200 bg-blue-50 text-blue-700',       filter: 'review_required' },
            { label: 'Pronti Decision Pack',    count: queueStats.readyForDecisionPack, cls: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',    filter: 'all' },
          ] as Array<{ label: string; count: number; cls: string; filter: PrimaryFilter }>).map((stat) => (
            <button
              key={stat.label}
              onClick={() => setPrimaryFilter(stat.filter)}
              className={cn(
                'rounded-lg border p-3 text-left transition-all hover:shadow-sm',
                stat.cls,
                primaryFilter === stat.filter && stat.filter !== 'all'
                  ? 'ring-2 ring-inset ring-slate-400'
                  : '',
              )}
            >
              <p className="text-2xl font-bold font-mono">{stat.count}</p>
              <p className="text-[10px] leading-tight mt-0.5">{stat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Parts 4 + 3: Filters + Queue table ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
            Coda Operativa — {filteredRecords.length}/{records.length} record
          </h2>
          {selectedId && (
            <button onClick={() => setSelectedId(null)} className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline">
              Chiudi dettaglio
            </button>
          )}
        </div>

        {/* Primary filter bar */}
        <div className="flex flex-wrap gap-2 mb-2">
          {([
            { key: 'all',                label: 'Tutti',             count: records.length },
            { key: 'review_required',    label: 'Review Required',  count: queueStats.reviewRequired },
            { key: 'weak_evidence',      label: 'Evidenza Debole',  count: queueStats.weakEvidence },
            { key: 'blocked',            label: 'Blocked',          count: queueStats.blocked },
            { key: 'limited',            label: 'Limited',          count: queueStats.limited },
            { key: 'missing_budget',     label: 'Budget Mancante',  count: queueStats.missingBudget },
            { key: 'sensitive_excluded', label: 'Sensitive Esclusi', count: queueStats.sensitiveExcluded },
          ] as Array<{ key: PrimaryFilter; label: string; count: number }>).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setPrimaryFilter(key)}
              className={cn(
                'rounded border px-2.5 py-1 text-xs font-medium transition-colors',
                primaryFilter === key
                  ? 'border-[rgba(6,3,43,0.30)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.78)]'
                  : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.52)] hover:bg-[rgba(6,3,43,0.03)]',
              )}
            >
              {label} <span className="font-mono text-[10px]">({count})</span>
            </button>
          ))}
        </div>

        {/* Secondary pillar filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {([
            { key: 'all',        label: 'Tutti i pillar', activeCls: 'border-[rgba(6,3,43,0.30)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.78)]' },
            { key: 'LIFE',       label: 'LIFE',           activeCls: PILLAR_BADGE['LIFE'] },
            { key: 'GROWTH',     label: 'GROWTH',         activeCls: PILLAR_BADGE['GROWTH'] },
            { key: 'CONNECTION', label: 'CONNECTION',     activeCls: PILLAR_BADGE['CONNECTION'] },
            { key: 'IMPACT',     label: 'IMPACT',         activeCls: PILLAR_BADGE['IMPACT'] },
            { key: 'LEGACY',     label: 'LEGACY',         activeCls: PILLAR_BADGE['LEGACY'] },
          ] as Array<{ key: PillarFilter; label: string; activeCls: string }>).map(({ key, label, activeCls }) => (
            <button
              key={key}
              onClick={() => setPillarFilter(key)}
              className={cn(
                'rounded border px-2 py-0.5 text-[10px] font-medium transition-colors',
                pillarFilter === key
                  ? activeCls
                  : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.40)] hover:bg-[rgba(6,3,43,0.03)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Queue table */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.05)]">
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Iniziativa</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Eligibility</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Pillar</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Evidenza</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">BTI</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Motivo revisione</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Decisione suggerita</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[rgba(6,3,43,0.52)]">Conf.</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[rgba(6,3,43,0.52)]">Stato</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-[rgba(6,3,43,0.52)]">Dettaglio</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  const elig            = ELIGIBILITY_STYLE[rec.eligibility] ?? ELIGIBILITY_STYLE.eligible;
                  const revStatus       = REVIEW_STATUS_STYLE[rec.review_status];
                  const evidenceLabel   = getBudgetEvidenceLabel(rec.data_completeness_score);
                  const btiLabel        = getBTILabel(rec);
                  const suggested       = getSuggestedDecision(rec);
                  const reviewReason    = getReviewReason(rec);
                  const isSelected      = rec.id === selectedId;
                  return (
                    <tr
                      key={rec.id}
                      className={cn(
                        'border-b border-[rgba(6,3,43,0.04)] last:border-0 cursor-pointer transition-colors',
                        isSelected ? 'bg-blue-50' : 'hover:bg-[rgba(6,3,43,0.03)]',
                      )}
                      onClick={() => setSelectedId(isSelected ? null : rec.id)}
                    >
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <p className="font-medium text-[rgba(6,3,43,0.90)] truncate">{rec.raw_name}</p>
                        <p className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">{rec.pipeline_row_id}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', elig.badge)}>
                          {elig.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {rec.primary_pillar ? (
                          <span className={cn(
                            'rounded border px-1 py-0.5 text-[10px] font-mono',
                            PILLAR_BADGE[rec.primary_pillar as PillarCode] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
                          )}>
                            {rec.primary_pillar}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[rgba(6,3,43,0.28)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', evidenceLabel.cls)}>
                          {evidenceLabel.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-mono whitespace-nowrap', btiLabel.cls)}>
                          {btiLabel.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[160px]">
                        <span className="truncate block text-[10px] text-[rgba(6,3,43,0.52)]">{reviewReason}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap', suggested.cls)}>
                          {suggested.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] font-mono text-[rgba(6,3,43,0.62)]">
                          {Math.round(rec.data_completeness_score * 100)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap', revStatus.badge)}>
                          {revStatus.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          className="text-[10px] text-blue-500 hover:text-blue-700 underline"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : rec.id); }}
                        >
                          {isSelected ? 'Chiudi' : 'Apri'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-xs text-[rgba(6,3,43,0.40)]">
                      Nessun record corrisponde ai filtri selezionati.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          Ogni riga rappresenta una categoria di iniziativa/evento — nessun dato individuale worker. Clicca per aprire il dettaglio metodologico. Dati sintetici demo.
        </p>
      </div>

      {/* ── Detail Panel ─────────────────────────────────────────────────────── */}
      {selectedRecord && (
        <DetailPanel record={selectedRecord} onClose={() => setSelectedId(null)} />
      )}

      {/* ── Part 2 (Sprint 23): Data Lineage Preview ─────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
        <DataLineagePreview showHeader showMethodologyNote />
      </div>

      {/* ── Part 5: Advisor Review Preview ───────────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Advisor Review — Preview</h2>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mt-1 leading-relaxed max-w-2xl">
            In produzione, l&apos;Advisor KORA revisionerà le classificazioni ambigue, le lacune di evidenza e le eccezioni metodologiche prima della finalizzazione del Board Pack.
            L&apos;Advisor non vede l&apos;identità del lavoratore — lavora su iniziativa/categoria.
            Le decisioni di revisione saranno persistite solo nella fase SaaS/backend.
          </p>
        </div>
        <ul className="grid gap-1 sm:grid-cols-2 text-[11px] text-[rgba(6,3,43,0.52)] list-disc list-inside pl-1">
          <li>Advisor revisionerà classificazioni ambigue e gap di evidenza.</li>
          <li>Advisor validerà metodologia a livello record prima del Decision Pack.</li>
          <li>Advisor non vede identità lavoratore — solo categoria/iniziativa.</li>
          <li>Le decisioni saranno persistite solo in fase SaaS/backend.</li>
        </ul>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-2">
            Azioni Advisor (Preview — backend richiesto)
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Approva classificazione',   cls: 'border-[rgba(47,125,85,0.22)] bg-green-50 text-green-600' },
              { label: 'Richiedi evidenza',          cls: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-600' },
              { label: 'Escala ad Advisor',          cls: 'border-blue-200 bg-blue-50 text-blue-600' },
              { label: 'Escludi da BTI',             cls: 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.40)]' },
              { label: 'Conferma per Decision Pack', cls: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] text-[#C76F3D]' },
            ].map((btn) => (
              <button
                key={btn.label}
                disabled
                className={cn('rounded border px-3 py-1.5 text-xs font-medium cursor-not-allowed opacity-50', btn.cls)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-[rgba(6,3,43,0.40)]">
            Backend richiesto — tutte le azioni sono disabilitate in Foundation Light.
          </p>
        </div>
      </div>

      {/* ── Part 6: Methodology boundary ─────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4 space-y-2 text-xs text-[rgba(6,3,43,0.52)]">
        <p className="font-semibold text-[rgba(6,3,43,0.62)] text-[11px] uppercase tracking-wide">
          Nota metodologica
        </p>
        <p>
          KORA Review Queue è una preview rule-based pre-empirical. Le decisioni reali richiederanno salvataggio,
          audit trail e validazione umana/advisor nella fase SaaS.
        </p>
        <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
          <li>Confidence Score rimane esterno al KORA Index (peso = 0) — indicatore di affidabilità, non componente.</li>
          <li>Compliance rimane Blocked by Design — 0 IU · 0 contributo al KORA Index · non penalizzata.</li>
          <li>Economic Relief rimane Limited — tracciato in BTI Engine come economic_relief_spend · 0 IU.</li>
          <li>Review Required non contribuisce fino a validazione Operator/Advisor completata.</li>
        </ul>
      </div>

      {/* ── Audit Trail ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Audit Trail — Ultimi {auditTrail.length} eventi
        </h2>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 divide-y divide-[rgba(6,3,43,0.05)]50">
          {auditTrail.map((event) => (
            <AuditEventRow key={event.id} event={event} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[rgba(6,3,43,0.40)]">
          In Foundation Light l&apos;audit trail è deterministico e demo. In fase SaaS ogni decisione sarà persistita in modo permanente.
        </p>
      </div>

      {/* ── Governance Rules ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)] mb-3">
          Regole di Governance — Canoniche e Non Negoziabili
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              header: 'Blocked by Design → 0 IU',
              body: 'La compliance obbligatoria non genera attivazione. 0 IU · 0 KORA Index · tracciato solo per governance.',
              style: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
            },
            {
              header: 'Limited (Economic Relief) → BTI only',
              body: 'I benefit cash-like non generano IU. Tracciati in BTI engine come economic_relief_spend. Non è spesa sbagliata — è spesa che può diventare più intelligente.',
              style: 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] text-[rgba(6,3,43,0.72)]',
            },
            {
              header: 'Review Required → 0 IU fino a risoluzione',
              body: 'Nessuna Impact Unit può essere generata da un record non ancora validato da Operator o Advisor.',
              style: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700',
            },
            {
              header: 'Eligible + approvato → può generare IU',
              body: 'Solo con approved_for_impact_units: true il record entra in IU Computation. La revisione Operator/Advisor conferma la classificazione pipeline.',
              style: 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
            },
          ].map((rule) => (
            <div key={rule.header} className={cn('rounded border px-3 py-2 text-xs', rule.style)}>
              <p className="font-semibold mb-0.5">{rule.header}</p>
              <p className="leading-relaxed opacity-90">{rule.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[rgba(6,3,43,0.40)]">
        <p>
          {summary.methodology_version} · {summary.calibration_status} · Dati demo sintetici · synthetic_demo_data: true
        </p>
        <div className="flex gap-3">
          <Link href="/company/data/upload" className="hover:text-[rgba(6,3,43,0.62)] underline">
            ← Data Intake Studio
          </Link>
          <Link href="/company/scoring" className="hover:text-[rgba(6,3,43,0.62)] underline">
            Scoring Preview →
          </Link>
          <Link href="/company/reports" className="hover:text-[rgba(6,3,43,0.62)] underline">
            Decision Pack →
          </Link>
        </div>
      </div>

    </div>
  );
}
