import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const STATUS_PILL: Record<string, string> = {
  approved:          'bg-green-50 text-green-700 border-green-200',
  partially_reviewed:'bg-yellow-50 text-yellow-700 border-yellow-200',
  under_review:      'bg-blue-50 text-blue-700 border-blue-200',
  rejected:          'bg-red-50 text-red-700 border-red-200',
  pending:           'bg-slate-50 text-slate-500 border-slate-200',
};

const READINESS_PILL: Record<string, string> = {
  ready:   'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
};

function SectionLabel({ code, title }: { code: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{code}</span>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
    </div>
  );
}

function AIBoundaryNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
      {children}
    </div>
  );
}

export default function AIOnboardingPage() {
  const onboarding     = adminPreviewService.getAIOnboardingPreview();
  const sources        = adminPreviewService.getSourceIntakePreview('S1');
  const mapping        = adminPreviewService.getMappingIntelligencePreview();
  const privacy        = adminPreviewService.getPrivacyFilterPreview();
  const uefQueue       = adminPreviewService.getUefDraftQueuePreview();
  const humanReview    = adminPreviewService.getHumanReviewPreview();
  const scoringReady   = adminPreviewService.getScoringReadinessPreview();

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">AI Onboarding Engine</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Founder / Internal
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-400">
            Synthetic demo only
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Internal view of the data ingestion and onboarding pipeline for{' '}
          <span className="font-medium text-slate-700">{onboarding.company_name}</span>.
          Shows how source data enters KORA, is mapped to the BCM taxonomy, filtered for privacy,
          reviewed by humans, and made ready for the scoring run.
        </p>
        <AIBoundaryNotice>
          AI assists mapping and review. It does not score workers.
          AI v0.1 is rule-based/taxonomy-based. No external LLM is used on HR or worker data.
          Only reviewed and approved UEF records can enter scoring.
        </AIBoundaryNotice>
      </div>

      {/* A: Company Onboarding Status */}
      <section>
        <SectionLabel code="A" title="Company Onboarding Status" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">{onboarding.company_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{onboarding.current_phase}</p>
            </div>
            <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${READINESS_PILL[onboarding.scoring_readiness]}`}>
              {onboarding.scoring_readiness.toUpperCase()} for scoring
            </span>
          </div>
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">{onboarding.onboarding_status}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Source batches',   String(onboarding.source_batch_count)],
              ['Approved batches', String(onboarding.approved_batches)],
              ['Pending review',   String(onboarding.pending_review_batches)],
            ].map(([l, v]) => (
              <div key={l} className="rounded bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">{l}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B: Source Intake */}
      <section>
        <SectionLabel code="B" title="Source Intake" />
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_90px] gap-3 px-4 py-2 bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Source</span>
            <span className="text-right">Rows</span>
            <span className="text-right">Mapped</span>
            <span className="text-right">Rejected</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {sources.map((s) => (
              <div key={s.id} className="px-4">
                {/* Primary row: volume counts + status */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_90px] gap-3 py-2.5 items-center text-xs">
                  <span className="text-slate-700 font-medium leading-snug">{s.source_label}</span>
                  <span className="text-right font-mono text-slate-500">{s.rows_received}</span>
                  <span className="text-right font-mono text-slate-500">{s.mapped_records}</span>
                  <span className={`text-right font-mono font-semibold ${s.rejected_records > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                    {s.rejected_records}
                  </span>
                  <div className="flex justify-end">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_PILL[s.status] ?? STATUS_PILL.pending}`}>
                      {s.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {/* Detail row: quality metrics */}
                <div className="flex flex-wrap gap-x-5 gap-y-1 pb-2.5 text-[11px]">
                  <span className="text-slate-400">
                    Completeness{' '}
                    <span className="font-mono text-slate-600">{Math.round(s.completeness_pct * 100)}%</span>
                  </span>
                  <span className="text-slate-400">
                    Confidence{' '}
                    <span className={`font-mono font-semibold ${
                      s.mapping_confidence >= 0.8 ? 'text-green-600' :
                      s.mapping_confidence >= 0.6 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {Math.round(s.mapping_confidence * 100)}%
                    </span>
                  </span>
                  <span className="text-slate-400">
                    Evidence attached{' '}
                    <span className="font-mono text-slate-600">{Math.round(s.evidence_attached_pct * 100)}%</span>
                  </span>
                  <span className="text-slate-400">
                    Pending review{' '}
                    <span className={`font-mono font-semibold ${s.pending_review > 0 ? 'text-yellow-700' : 'text-slate-600'}`}>
                      {s.pending_review}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">Scenario S1 — Meridiana Group S.r.l. · Synthetic demo data only</p>
      </section>

      {/* C: Mapping Intelligence */}
      <section>
        <SectionLabel code="C" title="Mapping Intelligence" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Total rows',    String(mapping.total_rows_processed)],
              ['Mapped',        String(mapping.rows_mapped)],
              ['Pending',       String(mapping.rows_pending)],
              ['Avg confidence', `${Math.round(mapping.avg_mapping_confidence * 100)}%`],
            ].map(([l, v]) => (
              <div key={l} className="rounded bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">{l}</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['BCM taxonomy rules applied', String(mapping.taxonomy_rules_applied)],
              ['BCM pillar assignments',      String(mapping.bcm_pillar_assignments)],
              ['Unmapped — manual required',  String(mapping.unmapped_requiring_manual)],
              ['Sources requiring review',    String(mapping.sources_requiring_review)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-slate-500">{l}</span>
                <span className="font-mono text-slate-700">{v}</span>
              </div>
            ))}
          </div>
          <AIBoundaryNotice>
            Taxonomy basis: {mapping.taxonomy_basis}.
            BCM (Base Contribution Matrix) is the rule-based classifier that maps source events to KORA pillars.
            No machine learning model and no external LLM is involved in this step.
          </AIBoundaryNotice>
        </div>
      </section>

      {/* D: Privacy Filter */}
      <section>
        <SectionLabel code="D" title="Privacy Filter" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Fields detected',  String(privacy.sensitive_fields_detected)],
              ['Fields excluded',  String(privacy.sensitive_fields_excluded)],
              ['Categories',       String(privacy.excluded_categories.length)],
            ].map(([l, v]) => (
              <div key={l} className="rounded bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">{l}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Excluded field categories</p>
            <div className="flex flex-wrap gap-1.5">
              {privacy.excluded_categories.map((cat) => (
                <span key={cat} className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['No external LLM on HR data',          privacy.no_external_llm_on_hr_data ? 'Confirmed' : 'No'],
              ['No employer access to individual data', privacy.no_employer_access_individual ? 'Confirmed' : 'No'],
              ['Pseudonymization applied',              privacy.pseudonymization_applied ? 'Confirmed' : 'No'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-slate-500">{l}</span>
                <span className="font-semibold text-green-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* E: UEF Draft Queue */}
      <section>
        <SectionLabel code="E" title="UEF Draft Queue" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Draft total',         value: String(uefQueue.draft_total_estimated), color: 'text-slate-800' },
              { label: 'Approved',            value: String(uefQueue.approved),              color: 'text-green-700' },
              { label: 'Flagged for review',  value: String(uefQueue.flagged_for_review),    color: 'text-yellow-700' },
              { label: 'Eligible for scoring',value: String(uefQueue.eligible_for_scoring),  color: 'text-indigo-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded bg-slate-50 px-3 py-2 text-center">
                <p className="text-[10px] text-slate-400">{label}</p>
                <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded border border-yellow-100 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            UEF event-level records are not generated in the Foundation Light demo phase.
            Aggregate queue counts only. Individual UEF records available post-Gate 2.
          </div>
        </div>
      </section>

      {/* F: Human Review */}
      <section>
        <SectionLabel code="F" title="Human Review" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="space-y-1.5 text-xs">
            {[
              ['Batches requiring review',  String(humanReview.batches_requiring_review)],
              ['Total pending items',       String(humanReview.total_pending_items)],
              ['Flagged mappings',          String(humanReview.flagged_mappings)],
              ['Rejected mappings',         String(humanReview.rejected_mappings)],
              ['Advisor queue items',       String(humanReview.advisor_queue_items)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                <span className="text-slate-600">{l}</span>
                <span className="font-mono font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <AIBoundaryNotice>
            Approval gate is active. Only reviewed and approved UEF records can enter the scoring run.
            No record bypasses human review.
          </AIBoundaryNotice>
        </div>
      </section>

      {/* G: Scoring Readiness */}
      <section>
        <SectionLabel code="G" title="Scoring Readiness" />
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Overall readiness</p>
            <span className={`rounded border px-2 py-0.5 text-xs font-bold ${READINESS_PILL[scoringReady.readiness_status]}`}>
              {scoringReady.readiness_status.toUpperCase()}
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Data completeness',  value: scoringReady.data_completeness },
              { label: 'Evidence quality',   value: scoringReady.evidence_quality },
              { label: 'Mapping confidence', value: scoringReady.mapping_confidence },
              { label: 'Review completion',  value: scoringReady.review_completion },
            ].map(({ label, value }) => {
              const pct = Math.round(value * 100);
              return (
                <div key={label} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">{label}</span>
                    <span className={`font-mono font-semibold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 75 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Next required action</p>
            <p className="text-xs text-slate-700">{scoringReady.next_required_action}</p>
          </div>
        </div>
      </section>

    </div>
  );
}
