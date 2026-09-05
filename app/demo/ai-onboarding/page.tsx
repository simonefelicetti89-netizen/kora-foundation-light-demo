// A-15: KORA Classification Engine™ — stato onboarding e filtro privacy.
// Scopo: mostrare lo stato di onboarding aziendale e la policy di filtro
//        privacy applicata ai dati sorgente.
//
// CC-00 — AI-Onboarding Duplicate Retirement (2026-09-06): le sezioni
// B (Acquisizione Fonti), C (Intelligence di Mapping), E (Coda Bozze UEF),
// F (Revisione Umana), G (Idoneità al Calcolo) sono state rimosse — queste
// simulavano capacità ora reali e canoniche altrove (Data Intake Studio,
// UEF Review Queue, Pilot Lifecycle Orchestrator), non uniche a questa
// pagina demo. Le sezioni A e D restano, invariate nella loro fonte dati.
//
// CC-00 — Admin Console panel-by-panel canonicalization (2026-09-19):
// Section D's data moved here from AdminPreviewService.getPrivacyFilterPreview()
// — it was real, accurate, always-true KORA privacy policy, not a synthetic
// "preview" of variable state, so it never belonged in a Preview-simulation
// service shared with Admin Home. Values unchanged, purely relocated.
import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

const PRIVACY_FILTER = {
  sensitive_fields_detected: 14,
  sensitive_fields_excluded: 14,
  excluded_categories: [
    'Email addresses',
    'Phone numbers',
    'Postal addresses',
    'Tax identifiers (codice fiscale)',
    'Health and clinical details',
    'Free-text personal notes',
    'Diagnostic or therapist references',
  ],
  no_external_llm_on_hr_data: true,
  no_employer_access_individual: true,
  pseudonymization_applied: true,
};

const READINESS_PILL: Record<string, string> = {
  ready:   'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  partial: 'bg-[rgba(217,154,43,0.12)] text-[#7A5200] border-[rgba(217,154,43,0.22)]',
  blocked: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
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
  const privacy        = PRIVACY_FILTER;

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Page header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-[#06032B]">KORA Classification Engine™</h1>
          <BoundaryBadge mode="DEMO" variant="light" suffix="· dati sintetici" />
          <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-xs font-semibold text-[#8A5A00]">
            KORA Admin / Interno
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Vista interna dello stato di onboarding per{' '}
          <span className="font-medium text-[rgba(6,3,43,0.78)]">{onboarding.company_name}</span>{' '}
          e della policy di filtro privacy applicata ai dati sorgente.
        </p>
        <AIBoundaryNotice>
          KORA Classification Engine™ assiste il mapping e la revisione. Non calcola punteggi sui lavoratori.
          Motore rule-based/taxonomy-based. Nessun LLM esterno viene usato su dati HR o lavoratori.
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

    </div>
  );
}
