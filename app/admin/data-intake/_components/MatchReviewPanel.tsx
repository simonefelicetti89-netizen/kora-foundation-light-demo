'use client';

// app/admin/data-intake/_components/MatchReviewPanel.tsx
// B33: Match Review UI — operator reviews multi-file initiative matches before accept.
//
// Shows: status, confidence, safe initiative name, file roles, fields to merge,
//        conflict fields, reason codes, recommended decision.
// Operator actions: Accept / Needs Review / Reject per match.
// Bulk actions: Accept all high-confidence, Mark all possible as needs_review.
//
// Privacy: no raw values, no PII. All names are server-sanitized safeName strings.
// Does NOT bypass UEF Review or scoring approval.

import { useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MatchReviewDecision = 'accept' | 'reject' | 'needs_review';

interface MatchReviewLinkedRow {
  fileIndex: number;
  fileRole: string;
  rowIndex: number;
}

export interface MatchReviewMatch {
  matchId: string;
  status: 'matched' | 'possible_match' | 'needs_review' | 'unmatched';
  confidence: number;
  primary: {
    fileIndex: number;
    fileRole: string;
    rowIndex: number;
    safeName: string;
  };
  linkedRows: MatchReviewLinkedRow[];
  mergedFields: string[];
  conflictFields: string[];
  reasonCodes: string[];
  recommendedDecision: 'accept' | 'needs_review';
}

export interface MatchReviewSection {
  totalMatches: number;
  matched: number;
  possibleMatch: number;
  needsReview: number;
  unmatched: number;
  conflicts: number;
  matches: MatchReviewMatch[];
  truncated?: boolean;
  caveat: string;
}

interface Props {
  matchReview: MatchReviewSection;
  decisions: Record<string, MatchReviewDecision>;
  onDecisionsChange: (decisions: Record<string, MatchReviewDecision>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  matched:        'bg-green-100 text-green-800 border-green-200',
  possible_match: 'bg-amber-100 text-amber-800 border-amber-200',
  needs_review:   'bg-purple-100 text-purple-800 border-purple-200',
  unmatched:      'bg-slate-100 text-slate-500 border-slate-200',
};

const STATUS_LABEL: Record<string, string> = {
  matched:        '✓ Matched',
  possible_match: '≈ Possible',
  needs_review:   '? Needs review',
  unmatched:      '✗ Unmatched',
};

const DECISION_STYLES: Record<MatchReviewDecision, string> = {
  accept:       'bg-green-600 text-white border-green-600',
  needs_review: 'bg-amber-500 text-white border-amber-500',
  reject:       'bg-red-500 text-white border-red-500',
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-500">{pct}%</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function MatchReviewPanel({ matchReview, decisions, onDecisionsChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const setDecision = useCallback((matchId: string, decision: MatchReviewDecision) => {
    onDecisionsChange({ ...decisions, [matchId]: decision });
  }, [decisions, onDecisionsChange]);

  function toggleExpanded(matchId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  // Current effective decision for a match (explicit or recommended default)
  function effectiveDecision(m: MatchReviewMatch): MatchReviewDecision {
    if (decisions[m.matchId]) return decisions[m.matchId];
    // Default: accept for matched, needs_review for everything else
    return m.status === 'matched' ? 'accept' : 'needs_review';
  }

  // Bulk: accept all with recommendedDecision === 'accept'
  function acceptAllRecommended() {
    const next = { ...decisions };
    for (const m of matchReview.matches) {
      if (m.status !== 'unmatched' && m.recommendedDecision === 'accept') {
        next[m.matchId] = 'accept';
      }
    }
    onDecisionsChange(next);
  }

  // Bulk: mark all possible_match as needs_review
  function markAllPossibleNeedsReview() {
    const next = { ...decisions };
    for (const m of matchReview.matches) {
      if (m.status === 'possible_match') next[m.matchId] = 'needs_review';
    }
    onDecisionsChange(next);
  }

  // Counts based on current effective decisions
  const acceptCount   = matchReview.matches.filter(m => m.status !== 'unmatched' && effectiveDecision(m) === 'accept').length;
  const rejectCount   = matchReview.matches.filter(m => effectiveDecision(m) === 'reject').length;
  const nrCount       = matchReview.matches.filter(m => m.status !== 'unmatched' && effectiveDecision(m) === 'needs_review').length;

  return (
    <div className="rounded-lg border border-[#C76F3D]/25 bg-white space-y-0 overflow-hidden">

      {/* Header */}
      <div className="bg-[#f5f4ff] px-4 py-3 border-b border-[#c7c4f8]/50">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] font-bold text-[#C76F3D] uppercase tracking-wide">
              Match Review — Decisioni iniziativa
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Rivedi i match multi-file prima dell&apos;accept. Le decisioni non bypassano UEF Review.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-green-700 font-medium">
              ✓ Matched: {matchReview.matched}
            </span>
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700 font-medium">
              ≈ Possible: {matchReview.possibleMatch}
            </span>
            <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700 font-medium">
              ? Review: {matchReview.needsReview}
            </span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600 font-medium">
              ✗ Unmatched: {matchReview.unmatched}
            </span>
            {matchReview.conflicts > 0 && (
              <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-red-700 font-medium">
                ⚠ Conflitti: {matchReview.conflicts}
              </span>
            )}
          </div>
        </div>

        {/* Current decision summary */}
        <div className="flex flex-wrap gap-1.5 mt-2 text-[10px]">
          <span className="rounded border border-green-200 bg-green-100 px-2 py-0.5 text-green-800 font-semibold">
            Da accettare: {acceptCount}
          </span>
          <span className="rounded border border-amber-200 bg-amber-100 px-2 py-0.5 text-amber-800 font-semibold">
            Needs review: {nrCount}
          </span>
          <span className="rounded border border-red-200 bg-red-100 px-2 py-0.5 text-red-800 font-semibold">
            Rifiutati: {rejectCount}
          </span>
          <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-500 font-semibold">
            Non abbinati: {matchReview.unmatched}
          </span>
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap gap-2 mt-2.5">
          <button
            onClick={acceptAllRecommended}
            className="rounded border border-green-300 bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-800 hover:bg-green-100 transition-colors"
          >
            ✓ Accept all high-confidence
          </button>
          {matchReview.possibleMatch > 0 && (
            <button
              onClick={markAllPossibleNeedsReview}
              className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              ? Mark all possible → needs review
            </button>
          )}
        </div>
      </div>

      {/* Match list */}
      <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {matchReview.matches.map(m => {
          const dec = effectiveDecision(m);
          const isUnmatched = m.status === 'unmatched';
          const isOpen = expanded.has(m.matchId);
          const hasDetails = m.mergedFields.length > 0 || m.conflictFields.length > 0 || m.reasonCodes.length > 0;

          return (
            <div key={m.matchId} className={`px-4 py-3 transition-colors ${dec === 'accept' && !isUnmatched ? 'bg-green-50/40' : dec === 'reject' ? 'bg-red-50/40' : ''}`}>
              <div className="flex items-start gap-3 flex-wrap">

                {/* Status + confidence */}
                <div className="flex flex-col gap-1 min-w-[90px]">
                  <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${STATUS_STYLES[m.status] ?? STATUS_STYLES.unmatched}`}>
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                  <ConfidenceBar value={m.confidence} />
                </div>

                {/* Initiative info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{m.primary.safeName}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                      file_{m.primary.fileIndex} · {m.primary.fileRole}
                    </span>
                    {m.linkedRows.map((lr, i) => (
                      <span key={i} className="rounded bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-mono text-[#C76F3D]">
                        ← file_{lr.fileIndex} · {lr.fileRole}
                      </span>
                    ))}
                  </div>
                  {m.mergedFields.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Merge: {m.mergedFields.slice(0, 5).join(', ')}{m.mergedFields.length > 5 ? ` +${m.mergedFields.length - 5}` : ''}
                    </p>
                  )}
                  {m.conflictFields.length > 0 && (
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      ⚠ Conflitti su: {m.conflictFields.join(', ')} — primary mantenuto
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  {!isUnmatched ? (
                    <div className="flex gap-1">
                      {(['accept', 'needs_review', 'reject'] as MatchReviewDecision[]).map(d => (
                        <button
                          key={d}
                          onClick={() => setDecision(m.matchId, d)}
                          className={`rounded border px-2 py-1 text-[9px] font-bold transition-colors ${
                            dec === d
                              ? DECISION_STYLES[d]
                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {d === 'accept' ? '✓' : d === 'needs_review' ? '?' : '✗'}
                          {' '}{d === 'accept' ? 'Accept' : d === 'needs_review' ? 'Review' : 'Reject'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-[9px] font-medium text-slate-400">
                      Nessun match
                    </span>
                  )}
                  {hasDetails && (
                    <button
                      onClick={() => toggleExpanded(m.matchId)}
                      className="text-[9px] text-[#C76F3D] hover:underline text-left"
                    >
                      {isOpen ? '▲ Meno dettagli' : '▼ Più dettagli'}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail: reason codes */}
              {isOpen && hasDetails && (
                <div className="mt-2 ml-[102px] space-y-1">
                  {m.reasonCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Segnali:</span>
                      {m.reasonCodes.map((r, i) => (
                        <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-600">{r}</span>
                      ))}
                    </div>
                  )}
                  {m.mergedFields.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Campi merged:</span>
                      {m.mergedFields.map((f, i) => (
                        <span key={i} className="rounded bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[9px] font-mono text-blue-700">{f}</span>
                      ))}
                    </div>
                  )}
                  {m.conflictFields.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] font-semibold text-amber-500 uppercase tracking-wide mr-1">Conflitti:</span>
                      {m.conflictFields.map((f, i) => (
                        <span key={i} className="rounded bg-amber-50 border border-amber-100 px-1.5 py-0.5 text-[9px] font-mono text-amber-700">{f}</span>
                      ))}
                      <span className="text-[9px] text-amber-600 ml-1">→ valore primary conservato</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Truncation warning */}
      {matchReview.truncated && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
          <p className="text-[10px] text-amber-700">
            ⚠ Visualizzati i primi 100 match. I match rimanenti vengono gestiti con le regole di default (matched → merge, possible/review → primary).
          </p>
        </div>
      )}

      {/* Caveat */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-500">
          ⓘ {matchReview.caveat}
        </p>
      </div>
    </div>
  );
}
