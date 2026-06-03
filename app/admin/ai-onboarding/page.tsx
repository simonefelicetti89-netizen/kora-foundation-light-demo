import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const STATUS_PILL: Record<string, string> = {
  approved:          'bg-green-50 text-green-700 border-green-200',
  partially_reviewed:'bg-yellow-50 text-yellow-700 border-yellow-200',
  under_review:      'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  rejected:          'bg-red-50 text-red-700 border-red-200',
  pending:           'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
};

const READINESS_PILL: Record<string, string> = {
  ready:   'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
};

function SectionLabel({ code, title }: { code: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">{code}</span>
      <h2 className="text-sm font-bold text-[#06032B]">{title}</h2>
    </div>
  );
}

function AIBoundaryNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)] px-3 py-2 text-xs text-[rgba(6,3,43,0.72)]">
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
          <h1 className="text-xl font-bold text-[#06032B]">AI Onboarding Engine</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            KORA Admin / Interno
          </span>
          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs font-medium text-[rgba(6,3,43,0.40)]">
            Solo dati sintetici
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Vista interna della pipeline di ingestione e onboarding dati per{' '}
          <span className="font-medium text-[rgba(6,3,43,0.78)]">{onboarding.company_name}</span>.
          Mostra come i dati sorgente entrano in KORA, vengono mappati alla tassonomia BCM, filtrati per la privacy,
          revisionati da esseri umani e resi pronti per il calcolo.
        </p>
        <AIBoundaryNotice>
          L&apos;AI assiste il mapping e la revisione. Non calcola punteggi sui lavoratori.
          AI v0.1 è rule-based/taxonomy-based. Nessun LLM esterno viene usato su dati HR o lavoratori.
          Solo i record UEF revisionati e approvati possono entrare nel calcolo.
        </AIBoundaryNotice>
      </div>

      {/* A: Company Onboarding Status */}
      <section>
        <SectionLabel code="A" title="Stato Onboarding Aziendale" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{onboarding.company_name}</p>
              <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">{onboarding.current_phase}</p>
            </div>
            <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${READINESS_PILL[onboarding.scoring_readiness]}`}>
              {onboarding.scoring_readiness.toUpperCase()} per scoring
            </span>
          </div>
          <p className="text-xs text-[rgba(6,3,43,0.52)] border-t border-[rgba(6,3,43,0.05)] pt-3">{onboarding.onboarding_status}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Batch fonti',       String(onboarding.source_batch_count)],
              ['Batch approvati',   String(onboarding.approved_batches)],
              ['In attesa revisione', String(onboarding.pending_review_batches)],
            ].map(([l, v]) => (
              <div key={l} className="rounded bg-[rgba(6,3,43,0.03)] px-3 py-2 text-center">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{l}</p>
                <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B: Source Intake */}
      <section>
        <SectionLabel code="B" title="Acquisizione Fonti" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_90px] gap-3 px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.08)] text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
            <span>Fonte</span>
            <span className="text-right">Righe</span>
            <span className="text-right">Mappati</span>
            <span className="text-right">Rifiutati</span>
            <span className="text-right">Stato</span>
          </div>
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {sources.map((s) => (
              <div key={s.id} className="px-4">
                {/* Primary row: volume counts + status */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_90px] gap-3 py-2.5 items-center text-xs">
                  <span className="text-[rgba(6,3,43,0.78)] font-medium leading-snug">{s.source_label}</span>
                  <span className="text-right font-mono text-[rgba(6,3,43,0.52)]">{s.rows_received}</span>
                  <span className="text-right font-mono text-[rgba(6,3,43,0.52)]">{s.mapped_records}</span>
                  <span className={`text-right font-mono font-semibold ${s.rejected_records > 0 ? 'text-orange-600' : 'text-[rgba(6,3,43,0.40)]'}`}>
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
                  <span className="text-[rgba(6,3,43,0.40)]">
                    Completezza{' '}
                    <span className="font-mono text-[rgba(6,3,43,0.62)]">{Math.round(s.completeness_pct * 100)}%</span>
                  </span>
                  <span className="text-[rgba(6,3,43,0.40)]">
                    Confidenza{' '}
                    <span className={`font-mono font-semibold ${
                      s.mapping_confidence >= 0.8 ? 'text-green-600' :
                      s.mapping_confidence >= 0.6 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {Math.round(s.mapping_confidence * 100)}%
                    </span>
                  </span>
                  <span className="text-[rgba(6,3,43,0.40)]">
                    Evidenza allegata{' '}
                    <span className="font-mono text-[rgba(6,3,43,0.62)]">{Math.round(s.evidence_attached_pct * 100)}%</span>
                  </span>
                  <span className="text-[rgba(6,3,43,0.40)]">
                    In attesa di revisione{' '}
                    <span className={`font-mono font-semibold ${s.pending_review > 0 ? 'text-yellow-700' : 'text-[rgba(6,3,43,0.62)]'}`}>
                      {s.pending_review}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-[rgba(6,3,43,0.40)]">Scenario S1 — Meridiana Group S.r.l. · Solo dati demo sintetici</p>
      </section>

      {/* C: Mapping Intelligence */}
      <section>
        <SectionLabel code="C" title="Intelligence di Mapping" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Righe totali',      String(mapping.total_rows_processed)],
              ['Mappate',           String(mapping.rows_mapped)],
              ['In attesa',         String(mapping.rows_pending)],
              ['Confidenza media',  `${Math.round(mapping.avg_mapping_confidence * 100)}%`],
            ].map(([l, v]) => (
              <div key={l} className="rounded bg-[rgba(6,3,43,0.03)] px-3 py-2 text-center">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{l}</p>
                <p className="text-base font-bold text-[rgba(6,3,43,0.90)] mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['Regole tassonomia BCM applicate',  String(mapping.taxonomy_rules_applied)],
              ['Assegnazioni pillar BCM',           String(mapping.bcm_pillar_assignments)],
              ['Non mappati — revisione manuale',   String(mapping.unmapped_requiring_manual)],
              ['Fonti che richiedono revisione',    String(mapping.sources_requiring_review)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-[rgba(6,3,43,0.52)]">{l}</span>
                <span className="font-mono text-[rgba(6,3,43,0.78)]">{v}</span>
              </div>
            ))}
          </div>
          <AIBoundaryNotice>
            Base tassonomica: {mapping.taxonomy_basis}.
            BCM (Base Contribution Matrix) è il classificatore rule-based che mappa gli eventi sorgente ai pillar KORA.
            Nessun modello di machine learning e nessun LLM esterno è coinvolto in questo passaggio.
          </AIBoundaryNotice>
        </div>
      </section>

      {/* D: Privacy Filter */}
      <section>
        <SectionLabel code="D" title="Filtro Privacy" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Campi rilevati',   String(privacy.sensitive_fields_detected)],
              ['Campi esclusi',    String(privacy.sensitive_fields_excluded)],
              ['Categorie',        String(privacy.excluded_categories.length)],
            ].map(([l, v]) => (
              <div key={l} className="rounded bg-[rgba(6,3,43,0.03)] px-3 py-2 text-center">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{l}</p>
                <p className="text-lg font-bold text-[rgba(6,3,43,0.90)] mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-1.5">Categorie campi esclusi</p>
            <div className="flex flex-wrap gap-1.5">
              {privacy.excluded_categories.map((cat) => (
                <span key={cat} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-xs text-[rgba(6,3,43,0.62)]">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['Nessun LLM esterno su dati HR',              privacy.no_external_llm_on_hr_data ? 'Confermato' : 'No'],
              ['Nessun accesso datore di lavoro a dati individuali', privacy.no_employer_access_individual ? 'Confermato' : 'No'],
              ['Pseudonimizzazione applicata',               privacy.pseudonymization_applied ? 'Confermato' : 'No'],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-[rgba(6,3,43,0.52)]">{l}</span>
                <span className="font-semibold text-green-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* E: UEF Draft Queue */}
      <section>
        <SectionLabel code="E" title="Coda Bozze UEF" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Totale bozze',          value: String(uefQueue.draft_total_estimated), color: 'text-[rgba(6,3,43,0.90)]' },
              { label: 'Approvati',             value: String(uefQueue.approved),              color: 'text-green-700' },
              { label: 'Segnalati per revisione', value: String(uefQueue.flagged_for_review), color: 'text-yellow-700' },
              { label: 'Idonei al calcolo',     value: String(uefQueue.eligible_for_scoring), color: 'text-[rgba(6,3,43,0.72)]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded bg-[rgba(6,3,43,0.03)] px-3 py-2 text-center">
                <p className="text-[10px] text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded border border-yellow-100 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            I record UEF a livello di evento non vengono generati nella fase demo di Foundation Light.
            Solo conteggi aggregati della coda. Record UEF individuali disponibili post-Gate 2.
          </div>
        </div>
      </section>

      {/* F: Human Review */}
      <section>
        <SectionLabel code="F" title="Revisione Umana" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
          <div className="space-y-1.5 text-xs">
            {[
              ['Batch che richiedono revisione',  String(humanReview.batches_requiring_review)],
              ['Elementi in attesa totali',        String(humanReview.total_pending_items)],
              ['Mapping segnalati',                String(humanReview.flagged_mappings)],
              ['Mapping rifiutati',                String(humanReview.rejected_mappings)],
              ['Elementi in coda advisor',         String(humanReview.advisor_queue_items)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b border-[rgba(6,3,43,0.05)] pb-1.5 last:border-0 last:pb-0">
                <span className="text-[rgba(6,3,43,0.62)]">{l}</span>
                <span className="font-mono font-semibold text-[rgba(6,3,43,0.90)]">{v}</span>
              </div>
            ))}
          </div>
          <AIBoundaryNotice>
            Il gate di approvazione è attivo. Solo i record UEF revisionati e approvati possono entrare nel calcolo.
            Nessun record bypassa la revisione umana.
          </AIBoundaryNotice>
        </div>
      </section>

      {/* G: Scoring Readiness */}
      <section>
        <SectionLabel code="G" title="Idoneità al Calcolo" />
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[rgba(6,3,43,0.52)]">Idoneità complessiva</p>
            <span className={`rounded border px-2 py-0.5 text-xs font-bold ${READINESS_PILL[scoringReady.readiness_status]}`}>
              {scoringReady.readiness_status.toUpperCase()}
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Completezza dati',   value: scoringReady.data_completeness },
              { label: 'Qualità evidenze',   value: scoringReady.evidence_quality },
              { label: 'Confidenza mapping', value: scoringReady.mapping_confidence },
              { label: 'Completamento revisione', value: scoringReady.review_completion },
            ].map(({ label, value }) => {
              const pct = Math.round(value * 100);
              return (
                <div key={label} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-[rgba(6,3,43,0.52)]">{label}</span>
                    <span className={`font-mono font-semibold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(6,3,43,0.05)]">
                    <div
                      className={`h-1.5 rounded-full ${pct >= 75 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-1">Prossima azione richiesta</p>
            <p className="text-xs text-[rgba(6,3,43,0.78)]">{scoringReady.next_required_action}</p>
          </div>
        </div>
      </section>

    </div>
  );
}
