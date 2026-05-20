'use client';

// AD-01: Advisor Workspace Light — Foundation Light Preview
// Synthetic demo data only. No real review workflow. No certification.
// Advisor-reviewed ≠ KORA Certified.

// ─── Foundation Light demo constants ──────────────────────────────────────────
// Inline synthetic data — no seed file import from advisor workspace.
// Advisor profile references adv-001 from AdminPreviewService synthetic data.

const ADVISOR_PROFILE = {
  id: 'adv-001',
  name: 'Dr. Francesca Lombardi',
  specialization: 'LIFE / Salute preventiva e benessere organizzativo',
  assigned_companies: ['Meridiana Group S.r.l.'],
  pending_reviews: 3,
  synthetic_demo_data: true,
};

type ChecklistItemStatus = 'ok' | 'pending' | 'missing';
type ReviewStatus = 'pending' | 'reviewed' | 'needs_information';

interface ReviewItem {
  id: string;
  title: string;
  review_type: string;
  status: ReviewStatus;
  status_label: string;
  pillar: string;
  confidence_signal: string;
  company: string;
  notes: string;
}

interface ChecklistItem {
  label: string;
  status: ChecklistItemStatus;
}

const REVIEW_QUEUE: ReviewItem[] = [
  {
    id: 'rev-001',
    title: 'Revisione evidenza — Bergamo Solidarity Network',
    review_type: 'Revisione evidenza',
    status: 'pending',
    status_label: 'In attesa',
    pillar: 'IMPACT',
    confidence_signal: 'Parziale',
    company: 'Meridiana Group S.r.l.',
    notes: 'Documentazione parzialmente presentata. Richiede conferma coordinatore.',
  },
  {
    id: 'rev-002',
    title: 'Validazione iniziativa — Skills Forward 2025',
    review_type: 'Validazione iniziativa',
    status: 'pending',
    status_label: 'In attesa',
    pillar: 'GROWTH',
    confidence_signal: 'Alta attesa',
    company: 'Meridiana Group S.r.l.',
    notes: 'Curriculum strutturato. In attesa di conferma erogazione prime sessioni.',
  },
  {
    id: 'rev-003',
    title: 'Contesto metodologico — Uplift Verification Rate',
    review_type: 'Contesto metodologico',
    status: 'reviewed',
    status_label: 'Revisionato',
    pillar: 'Generale',
    confidence_signal: 'Valutato',
    company: 'Meridiana Group S.r.l.',
    notes: 'Raccomandazione: convertire evidenze auto-dichiarate in verificate tramite partner.',
  },
];

const EVIDENCE_DETAIL = {
  id: 'rev-001',
  evidence_title: 'Log partecipazione — Bergamo Solidarity Network (Q4 2025)',
  source_type: 'Invio partner + conferma coordinatore',
  checklist: [
    { label: 'Soglia aggregazione privacy rispettata (≥10 partecipanti)', status: 'ok' as ChecklistItemStatus },
    { label: 'Classificazione livello evidenza (partial / verified)', status: 'pending' as ChecklistItemStatus },
    { label: 'Allineamento pillar IMPACT confermato', status: 'ok' as ChecklistItemStatus },
    { label: 'Additionality verificata (volontario, non obbligo legale)', status: 'pending' as ChecklistItemStatus },
    { label: 'Firma coordinatore ricevuta', status: 'missing' as ChecklistItemStatus },
  ] as ChecklistItem[],
  advisor_note:
    'Documentazione incompleta. Manca la firma del coordinatore e la conferma delle ore effettive. Richiedere informazioni aggiuntive prima di approvare.',
  recommendation: 'needs_information' as const,
  confidence_stamp: 'Non assegnato — in attesa di documentazione completa',
  synthetic_demo_data: true,
};

// ─── Style helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ReviewStatus, { style: string; label: string }> = {
  pending:          { style: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'In attesa' },
  reviewed:         { style: 'bg-green-50 text-green-700 border-green-200',  label: 'Revisionato' },
  needs_information:{ style: 'bg-sky-50 text-sky-700 border-sky-200',        label: 'Richiede info' },
};

const CHECKLIST_ICON: Record<ChecklistItemStatus, { icon: string; style: string }> = {
  ok:      { icon: '✓', style: 'text-green-600' },
  pending: { icon: '○', style: 'text-amber-500' },
  missing: { icon: '✗', style: 'text-red-500' },
};

const PILLAR_BADGE: Record<string, string> = {
  IMPACT:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-violet-50 text-violet-700 border-violet-200',
  LIFE:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  GROWTH:     'bg-amber-50 text-amber-700 border-amber-200',
  LEGACY:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  Generale:   'bg-slate-50 text-slate-500 border-slate-200',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorDashboard() {
  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Advisor Workspace Light</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
          L&apos;Advisor supporta la qualità delle evidenze e la confidenza metodologica.
          La revisione Advisor non equivale a certificazione KORA Certified.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            'Advisor-reviewed ≠ Certified',
            'Solo perimetro assegnato',
            'Nessun PIB individuale',
          ].map((b) => (
            <span key={b} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── Advisor Profile ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Advisor</p>
          <p className="font-semibold text-slate-800 mt-0.5">{ADVISOR_PROFILE.name}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Specializzazione</p>
          <p className="text-slate-700 mt-0.5">{ADVISOR_PROFILE.specialization}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Aziende assegnate</p>
          <p className="text-slate-700 mt-0.5">{ADVISOR_PROFILE.assigned_companies.join(', ')}</p>
        </div>
      </div>

      {/* ── Review Queue ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Coda di revisione assegnata
          </p>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {REVIEW_QUEUE.filter((r) => r.status === 'pending').length} in attesa
          </span>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {REVIEW_QUEUE.map((item) => {
            const sb = STATUS_BADGE[item.status];
            return (
              <div key={item.id} className="px-4 py-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.review_type} · {item.company}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.notes}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${sb.style}`}>
                    {sb.label}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PILLAR_BADGE[item.pillar] ?? PILLAR_BADGE['Generale']}`}>
                    {item.pillar}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Dati sintetici — Foundation Light demo preview · synthetic_demo_data: true
        </p>
      </div>

      {/* ── Evidence Review Panel ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Pannello revisione evidenza — Demo
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">

          {/* Evidence header */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-400">Evidenza</p>
              <p className="font-semibold text-slate-800 mt-0.5">{EVIDENCE_DETAIL.evidence_title}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tipologia fonte</p>
              <p className="text-slate-700 mt-0.5">{EVIDENCE_DETAIL.source_type}</p>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">Checklist di revisione</p>
            <ul className="space-y-2">
              {EVIDENCE_DETAIL.checklist.map((item) => {
                const icon = CHECKLIST_ICON[item.status];
                return (
                  <li key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`shrink-0 font-bold w-4 text-center ${icon.style}`}>{icon.icon}</span>
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Advisor note */}
          <div className="rounded bg-amber-50 border border-amber-100 px-3 py-3 space-y-1">
            <p className="text-xs font-semibold text-amber-800">Nota advisor</p>
            <p className="text-xs text-amber-700 leading-relaxed">{EVIDENCE_DETAIL.advisor_note}</p>
          </div>

          {/* Recommendation + Confidence stamp */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Raccomandazione</p>
              <span className="inline-block mt-0.5 rounded border bg-sky-50 border-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-700">
                Richiedi informazioni aggiuntive
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Advisor Confidence Stamp</p>
              <p className="text-xs text-slate-500 mt-0.5">{EVIDENCE_DETAIL.confidence_stamp}</p>
            </div>
          </div>

          {/* Demo action buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {['Approva', 'Richiedi informazioni', 'Rifiuta'].map((action) => (
              <button
                key={action}
                disabled
                className="rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
                title="Demo — nessuna validazione reale in Foundation Light."
              >
                {action}
              </button>
            ))}
            <span className="self-center text-[10px] text-slate-400 italic">
              Demo — nessuna validazione reale in Foundation Light.
            </span>
          </div>
        </div>
      </div>

      {/* ── Advisor Access Boundary ── */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-1.5">
        <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
          Perimetro di accesso Advisor
        </p>
        <p className="text-sm text-emerald-800 leading-relaxed">
          L&apos;Advisor vede solo il perimetro di revisione assegnato. Non accede al PIB individuale,
          al layer personale del lavoratore o a dati aziendali non necessari alla review.
        </p>
        <ul className="space-y-1 pt-1">
          {[
            'Nessun PIB individuale',
            'Nessuna timeline personale del lavoratore',
            'Nessun Dynamic Impact CV',
            'Solo evidenze e iniziative nel perimetro assegnato',
            'Tutte le decisioni di revisione sono tracciate e versioned metodologicamente',
          ].map((item) => (
            <li key={item} className="flex gap-2 text-xs text-emerald-700">
              <span className="text-emerald-400 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Certification Boundary ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Limite certificazione
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Advisor-reviewed non significa Certified. KORA Certified è un livello futuro e non attivo
          in Foundation Light.
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          La revisione advisor contribuisce al Verification Rate e al Confidence Score dell&apos;output
          KORA Index. Non certifica l&apos;azienda, non produce compliance regolatoria, non sostituisce
          consulenza ESG, legale o fiscale.
        </p>
      </div>

    </div>
  );
}
