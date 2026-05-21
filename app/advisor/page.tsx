'use client';

import Link from 'next/link';

// AD-01: Advisor Professional Workspace — Foundation Light Preview
// Synthetic demo data only. No real review workflow. No certification.
// Advisor-reviewed ≠ KORA Certified.
// Advisor performs: Process Audit, Evidence Protocol Review, sample checks, re-review, exception review.

// ─── Advisor profile ─────────────────────────────────────────────────────────

const ADVISOR_PROFILE = {
  full_name: 'Dr. Francesca Lombardi',
  avatar_initials: 'FL',
  advisor_id: 'KORA-ADV-042',
  license_number: 'ADV-LIFE-042-2026',
  advisor_type: 'Validator',
  seniority_level: 'Senior Advisor',
  specialization: 'LIFE / Salute preventiva e benessere organizzativo',
  issued_at: '2025-09-15',
  expires_at: '2026-09-15',
  license_status: 'Attiva — demo',
  academy_credits: 18,
  required_credits: 24,
  assigned_companies: ['Meridiana Group S.r.l.'],
  pending_reviews: 3,
  synthetic_demo_data: true,
};

// ─── Portfolio assignments ────────────────────────────────────────────────────

const ADVISOR_ASSIGNMENTS = [
  {
    id: 'as-001',
    entity: 'Meridiana Group S.r.l.',
    entity_type: 'Company',
    scope: 'Foundation Light pilot',
    next_check: '2026-04-12',
    status: 'Attivo',
  },
  {
    id: 'as-002',
    entity: 'Città Aperta APS',
    entity_type: 'Partner',
    scope: 'Protocollo IMPACT / CONNECTION — audit processo completato',
    next_check: null,
    status: 'Completato',
  },
  {
    id: 'as-003',
    entity: 'VitaLab Network',
    entity_type: 'Partner',
    scope: 'Protocollo LIFE — audit processo richiesto',
    next_check: null,
    status: 'In corso',
  },
  {
    id: 'as-004',
    entity: 'GrowthLab Academy',
    entity_type: 'Partner',
    scope: 'Protocollo GROWTH / LEGACY — review periodica',
    next_check: null,
    status: 'Periodico',
  },
] as const;

const ASSIGNMENT_STATUS_BADGE: Record<string, string> = {
  'Attivo':     'bg-green-50 text-green-700 border-green-200',
  'Completato': 'bg-slate-50 text-slate-500 border-slate-200',
  'In corso':   'bg-amber-50 text-amber-700 border-amber-200',
  'Periodico':  'bg-blue-50 text-blue-700 border-blue-200',
};

const ENTITY_TYPE_BADGE: Record<string, string> = {
  'Company': 'bg-indigo-50 text-indigo-600 border-indigo-200',
  'Partner': 'bg-violet-50 text-violet-600 border-violet-200',
};

// ─── Review queue ─────────────────────────────────────────────────────────────

type ReviewStatus = 'pending' | 'reviewed' | 'needs_information';
type Priority = 'alta' | 'media' | 'bassa';

interface ReviewQueueItem {
  id: string;
  item_title: string;
  entity: string;
  review_type: string;
  status: ReviewStatus;
  priority: Priority;
  due_date: string;
  review_scope: string;
  privacy_boundary: string;
  synthetic_demo_data: true;
}

const REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: 'rq-001',
    item_title: 'Protocollo LIFE — VitaLab Network',
    entity: 'VitaLab Network',
    review_type: 'Evidence Protocol Review',
    status: 'pending',
    priority: 'alta',
    due_date: '2026-04-05',
    review_scope: 'Protocollo evidenze servizio LIFE — validità, additionality, fonte',
    privacy_boundary: 'Solo protocollo — nessun dato individuale',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-002',
    item_title: 'Sample check Bergamo Solidarity Network',
    entity: 'Bergamo Solidarity Network',
    review_type: 'Sample Check',
    status: 'pending',
    priority: 'media',
    due_date: '2026-04-18',
    review_scope: 'Campione aggregato — evidenza parziale in verifica',
    privacy_boundary: 'Aggregati sopra soglia — nessun nominativo',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-003',
    item_title: 'Re-review Workshop Community Leadership',
    entity: 'Città Aperta APS',
    review_type: 'Re-review',
    status: 'pending',
    priority: 'media',
    due_date: '2026-05-02',
    review_scope: 'Eccezione evidenza parziale — revisione protocollo',
    privacy_boundary: 'Solo protocollo — perimetro assegnato',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-004',
    item_title: 'Audit processo Programma Volontariato Territoriale',
    entity: 'Meridiana Group S.r.l.',
    review_type: 'Advisor Process Audit',
    status: 'pending',
    priority: 'alta',
    due_date: '2026-04-20',
    review_scope: 'Audit preliminare processo e protocollo IMPACT',
    privacy_boundary: 'Solo processo — nessun dato lavoratore individuale',
    synthetic_demo_data: true,
  },
  {
    id: 'rq-005',
    item_title: 'Exception review evidenza parziale',
    entity: 'GrowthLab Academy',
    review_type: 'Exception Review',
    status: 'reviewed',
    priority: 'bassa',
    due_date: '2026-05-10',
    review_scope: 'Eccezione evidenza GROWTH — campione straordinario',
    privacy_boundary: 'Solo eccezione — perimetro review assegnata',
    synthetic_demo_data: true,
  },
];

const STATUS_BADGE: Record<ReviewStatus, { style: string; label: string }> = {
  pending:           { style: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'In attesa' },
  reviewed:          { style: 'bg-green-50 text-green-700 border-green-200',  label: 'Revisionato' },
  needs_information: { style: 'bg-sky-50 text-sky-700 border-sky-200',        label: 'Richiede info' },
};

const PRIORITY_BADGE: Record<Priority, string> = {
  alta:  'bg-red-50 text-red-600 border-red-200',
  media: 'bg-amber-50 text-amber-600 border-amber-200',
  bassa: 'bg-slate-50 text-slate-500 border-slate-200',
};

// ─── Evidence review panel (existing deep-dive) ───────────────────────────────

type ChecklistItemStatus = 'ok' | 'pending' | 'missing';

interface ChecklistItem {
  label: string;
  status: ChecklistItemStatus;
}

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

const CHECKLIST_ICON: Record<ChecklistItemStatus, { icon: string; style: string }> = {
  ok:      { icon: '✓', style: 'text-green-600' },
  pending: { icon: '○', style: 'text-amber-500' },
  missing: { icon: '✗', style: 'text-red-500' },
};

// ─── Calendar preview ─────────────────────────────────────────────────────────

const CALENDAR_ITEMS = [
  { time: '09:00', title: 'Audit processo Città Aperta APS', type: 'Partner review',                entity: 'Città Aperta APS' },
  { time: '11:30', title: 'Call Meridiana Group',            type: 'Evidence protocol alignment',  entity: 'Meridiana Group S.r.l.' },
  { time: '14:00', title: 'Sample check VitaLab Network',   type: 'LIFE protocol',                 entity: 'VitaLab Network' },
  { time: '16:30', title: 'Academy update',                  type: 'Evidence Protocol Library',    entity: 'KORA Academy' },
] as const;

// ─── Review threads mock ─────────────────────────────────────────────────────

const REVIEW_THREADS = [
  {
    id: 'rt-001',
    title: 'Protocollo LIFE — evidenza mancante',
    participants: ['Advisor', 'VitaLab Network', 'KORA Admin'],
    last_update: '2026-04-03',
    status: 'Aperta',
    status_style: 'bg-amber-50 text-amber-700 border-amber-200',
    latest_note: 'Documentazione incompleta per protocollo LIFE. Richiesta integrazione entro 2026-04-05.',
  },
  {
    id: 'rt-002',
    title: 'Sample check — Bergamo Solidarity Network',
    participants: ['Advisor', 'Città Aperta APS'],
    last_update: '2026-04-15',
    status: 'In attesa',
    status_style: 'bg-slate-50 text-slate-500 border-slate-200',
    latest_note: 'Campione aggregato ricevuto. In attesa di conferma coordinatore.',
  },
  {
    id: 'rt-003',
    title: 'Re-review — Workshop Community Leadership',
    participants: ['Advisor', 'Città Aperta APS', 'KORA Admin'],
    last_update: '2026-04-28',
    status: 'Chiusa',
    status_style: 'bg-green-50 text-green-700 border-green-200',
    latest_note: 'Re-review completata. Protocollo aggiornato con nuove linee guida.',
  },
];

// ─── Trust Ledger ─────────────────────────────────────────────────────────────

const TRUST_LEDGER = [
  {
    date: '2026-03-20',
    entity: 'Città Aperta APS',
    event: 'Audit processo completato',
    outcome: 'Protocollo attivo',
    confidence_effect: 'Aumenta affidabilità evidenze',
    next_action: 'Monitoraggio periodico Q2 2026',
  },
  {
    date: '2026-03-28',
    entity: 'VitaLab Network',
    event: 'Evidenza incompleta rilevata',
    outcome: 'Re-review richiesta',
    confidence_effect: 'Confidence pending — in attesa',
    next_action: 'Completare protocollo LIFE entro 2026-04-05',
  },
  {
    date: '2026-04-01',
    entity: 'Meridiana Group',
    event: 'Sample check completato',
    outcome: 'Nessuna anomalia',
    confidence_effect: 'Mantenere monitoraggio',
    next_action: 'Review pianificata Q3 2026',
  },
];

// ─── Academy courses ──────────────────────────────────────────────────────────

type CourseStatus = 'completato' | 'in_corso' | 'da_iniziare';

const ACADEMY_COURSES: {
  id: string;
  title: string;
  level: string;
  credits: number;
  status: CourseStatus;
}[] = [
  { id: 'ac-001', title: 'Evidence Protocol Review',          level: 'Obbligatorio', credits: 6, status: 'completato'   },
  { id: 'ac-002', title: 'Privacy & Worker Data Boundaries',  level: 'Obbligatorio', credits: 4, status: 'completato'   },
  { id: 'ac-003', title: 'Impact Unit Methodology v0.1',      level: 'Avanzato',     credits: 6, status: 'in_corso'     },
  { id: 'ac-004', title: 'Advisor Process Audit',             level: 'Avanzato',     credits: 8, status: 'da_iniziare'  },
];

const COURSE_STATUS_BADGE: Record<CourseStatus, { style: string; label: string }> = {
  completato:   { style: 'bg-green-50 text-green-700 border-green-200',  label: 'Completato' },
  in_corso:     { style: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'In corso' },
  da_iniziare:  { style: 'bg-slate-50 text-slate-500 border-slate-200',  label: 'Da iniziare' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorDashboard() {
  const creditsPercent = Math.round((ADVISOR_PROFILE.academy_credits / ADVISOR_PROFILE.required_credits) * 100);

  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── 1. Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Foundation Light Preview
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
            Solo dati sintetici
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Advisor Workspace</h1>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-2xl">
          Il layer professionale per audit processo, review protocollo evidenze e governance fiduciaria KORA.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            'Audit processo — non validazione azione per azione',
            'Advisor-reviewed ≠ KORA Certified',
            'Solo perimetro assegnato',
            'Nessun PIB individuale',
            'Nessun dato lavoratore',
          ].map((b) => (
            <span key={b} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. Advisor Profile — professional identity ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Profilo Advisor
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">

          {/* Avatar + name + license */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold shrink-0">
              {ADVISOR_PROFILE.avatar_initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-slate-900">{ADVISOR_PROFILE.full_name}</p>
                <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                  {ADVISOR_PROFILE.seniority_level}
                </span>
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                  {ADVISOR_PROFILE.advisor_type}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{ADVISOR_PROFILE.specialization}</p>
            </div>
          </div>

          {/* License fields */}
          <div className="grid gap-3 sm:grid-cols-2 text-sm border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs text-slate-400">Advisor ID</p>
              <p className="font-mono text-slate-700 mt-0.5">{ADVISOR_PROFILE.advisor_id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Numero licenza</p>
              <p className="font-mono text-slate-700 mt-0.5">{ADVISOR_PROFILE.license_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Stato licenza</p>
              <span className="inline-block mt-0.5 rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                {ADVISOR_PROFILE.license_status}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Emissione / Scadenza</p>
              <p className="text-slate-700 mt-0.5 font-mono text-xs">
                {ADVISOR_PROFILE.issued_at} → {ADVISOR_PROFILE.expires_at}
              </p>
            </div>
          </div>

          {/* Credits progress */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-slate-500">
                Crediti Academy: <span className="font-bold text-slate-700">{ADVISOR_PROFILE.academy_credits}</span> / {ADVISOR_PROFILE.required_credits}
              </p>
              <span className="text-xs font-mono text-slate-400">{creditsPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-2 rounded-full bg-indigo-400 transition-all"
                style={{ width: `${creditsPercent}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Crediti richiesti per rinnovo licenza: {ADVISOR_PROFILE.required_credits} — Stato: in accumulo
            </p>
          </div>
        </div>

        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-700 leading-relaxed">
            Licenza Advisor demo. Non rappresenta abilitazione professionale reale,
            certificazione regolatoria o KORA Certified attivo.
          </p>
        </div>
      </div>

      {/* ── 3. Advisor Portfolio ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Portfolio Advisor
        </h2>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          {[
            { label: 'Aziende seguite',              value: '4' },
            { label: 'Partner auditati',             value: '7' },
            { label: 'Protocolli in review',         value: '5' },
            { label: 'Sample check aperti',          value: '3' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-center">
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Assignment table */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {ADVISOR_ASSIGNMENTS.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800">{a.entity}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${ENTITY_TYPE_BADGE[a.entity_type]}`}>
                      {a.entity_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{a.scope}</p>
                  {a.next_check && (
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Prossimo check: {a.next_check}
                    </p>
                  )}
                </div>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${ASSIGNMENT_STATUS_BADGE[a.status] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          L&apos;Advisor vede solo il perimetro assegnato. Non accede al PIB individuale o alla timeline personale dei lavoratori.
        </p>
      </div>

      {/* ── 4. Review Queue — Process Audit ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Review Queue — Process Audit
          </h2>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {REVIEW_QUEUE.filter((r) => r.status === 'pending').length} in attesa
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Questa queue riguarda protocolli, processi, eccezioni e controlli a campione.
          Non è una validazione azione-per-azione.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {REVIEW_QUEUE.map((item) => {
            const sb = STATUS_BADGE[item.status];
            return (
              <div key={item.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{item.item_title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.review_type} · {item.entity}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${sb.style}`}>
                      {sb.label}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                  <span>Scadenza: <span className="font-mono text-slate-600">{item.due_date}</span></span>
                  <span>Perimetro: <span className="text-slate-500">{item.review_scope}</span></span>
                </div>
                <p className="text-[10px] text-slate-300 italic">{item.privacy_boundary}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          synthetic_demo_data: true · Foundation Light preview
        </p>
      </div>

      {/* ── 5. Process Audit Model ── */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
          Modello di audit processo KORA
        </p>
        <p className="text-sm text-blue-800 leading-relaxed">
          L&apos;Advisor non valida ogni singola azione. L&apos;Advisor esegue un audit preliminare del processo
          e del protocollo evidenze del partner. Le azioni successive sono considerate ammissibili se
          rispettano il protocollo approvato, con monitoraggio periodico, controlli a campione e
          possibilità di re-review.
        </p>
        <ul className="space-y-1 pt-1">
          {[
            'Advisor Process Audit — audit preliminare del processo e del protocollo',
            'Evidence Protocol Review — revisione del protocollo evidenze per tipo di servizio',
            'Monitoraggio periodico — review pianificate e campioni straordinari',
            "Re-review — l'Advisor può riaprire la review in caso di eccezioni o variazioni",
            'Trust Ledger — storico audit, acceptance rate, prossima review',
          ].map((item) => (
            <li key={item} className="flex gap-2 text-xs text-blue-700">
              <span className="text-blue-400 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── 6. Evidence Review Panel ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Pannello revisione evidenza — Demo
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">

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

          <div className="rounded bg-amber-50 border border-amber-100 px-3 py-3 space-y-1">
            <p className="text-xs font-semibold text-amber-800">Nota advisor</p>
            <p className="text-xs text-amber-700 leading-relaxed">{EVIDENCE_DETAIL.advisor_note}</p>
          </div>

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

      {/* ── 7. Calendar Preview ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Calendario Advisor — preview
          </h2>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            21 Mag 2026 — dimostrativo
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Calendario dimostrativo. Nessuna integrazione calendario reale, nessuna notifica, nessuna prenotazione live.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {CALENDAR_ITEMS.map((item) => (
            <div key={item.time} className="flex items-start gap-4 px-4 py-3">
              <p className="text-sm font-mono font-semibold text-indigo-400 shrink-0 w-12 pt-0.5">
                {item.time}
              </p>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.type} · {item.entity}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Nessun calendario reale · Nessuna notifica · Nessuna prenotazione live · Dati sintetici demo.
        </p>
      </div>

      {/* ── 8. Review Threads mock ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Review Threads — preview
        </h2>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Thread dimostrativi collegati a review assegnate. Non è chat libera, non invia messaggi, non genera notifiche.
        </p>
        <div className="space-y-3">
          {REVIEW_THREADS.map((thread) => (
            <div key={thread.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{thread.title}</p>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${thread.status_style}`}>
                  {thread.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {thread.participants.map((p) => (
                  <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed italic">{thread.latest_note}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-400 font-mono">
                  Aggiornato: {thread.last_update}
                </p>
                <button
                  disabled
                  className="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-400 cursor-not-allowed"
                >
                  Apri thread — demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 9. Trust Ledger ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Trust Ledger Advisor
        </h2>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Il Trust Ledger non è un ranking pubblico. È un audit trail interno su processi, protocolli, eccezioni e review.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="divide-y divide-slate-100">
            {TRUST_LEDGER.map((entry, i) => (
              <div key={i} className="px-4 py-3 grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">{entry.date}</span>
                  <span className="text-xs font-semibold text-slate-700">{entry.entity}</span>
                  <span className="text-xs text-slate-500">— {entry.event}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px]">
                  <span>
                    Esito: <span className="font-medium text-slate-600">{entry.outcome}</span>
                  </span>
                  <span>
                    Confidence: <span className="font-medium text-slate-600">{entry.confidence_effect}</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Prossima azione: {entry.next_action}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          synthetic_demo_data: true · Audit trail solo nel perimetro assegnato.
        </p>
      </div>

      {/* ── 10. Advisor Academy — Future Vision ── */}
      <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-orange-800">KORA Advisor Academy</h2>
          <span className="rounded border border-orange-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
            Future Vision / Non attivo in Foundation Light
          </span>
        </div>
        <p className="text-xs text-orange-700 leading-relaxed">
          Percorso futuro per formazione, aggiornamento, crediti, rinnovo licenza e specializzazioni Advisor.
        </p>

        {/* Credits summary */}
        <div className="rounded-lg border border-orange-200 bg-white px-4 py-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-orange-700">{ADVISOR_PROFILE.academy_credits}</p>
            <p className="text-[10px] text-slate-400">Crediti accumulati</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-500">{ADVISOR_PROFILE.required_credits}</p>
            <p className="text-[10px] text-slate-400">Crediti richiesti</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">{ADVISOR_PROFILE.expires_at}</p>
            <p className="text-[10px] text-slate-400">Scadenza rinnovo</p>
          </div>
        </div>

        {/* Course cards */}
        <div className="space-y-2">
          {ACADEMY_COURSES.map((course) => {
            const cs = COURSE_STATUS_BADGE[course.status];
            return (
              <div key={course.id} className="rounded-lg border border-orange-100 bg-white p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">{course.title}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {course.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{course.credits} crediti</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${cs.style}`}>
                    {cs.label}
                  </span>
                  <button
                    disabled
                    className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-400 cursor-not-allowed"
                  >
                    Avvia corso — Future Vision
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Future Vision CTAs */}
        <div className="flex flex-wrap gap-2">
          <button
            disabled
            className="rounded border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
          >
            Rinnova licenza — Future Vision
          </button>
          <button
            disabled
            className="rounded border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-400 cursor-not-allowed"
          >
            Paga quota Academy — Future Vision
          </button>
        </div>

        <p className="text-[11px] text-orange-600 leading-relaxed">
          Academy preview. Nessun LMS reale, nessun pagamento, nessuna certificazione attiva in Foundation Light.
        </p>
      </div>

      {/* ── 11. Privacy boundary — can / cannot see ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Perimetro di accesso Advisor
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-800 mb-2">L&apos;Advisor può vedere</p>
            <ul className="space-y-1.5">
              {[
                'Protocolli assegnati nel proprio perimetro',
                'Partner assegnati e storico audit',
                'Evidenze aggregate o campioni demo',
                'Stato audit processo',
                'Review queue nel perimetro assegnato',
                'Trust Ledger nel proprio perimetro',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-green-700">
                  <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold text-rose-800 mb-2">L&apos;Advisor non può vedere</p>
            <ul className="space-y-1.5">
              {[
                'PIB individuale dei lavoratori',
                'Dynamic Impact CV',
                'Timeline personale del lavoratore',
                'Scelte private del lavoratore',
                'Ranking o classifiche lavoratori',
                'Dati aziendali non assegnati',
                'Pagamenti o wallet aziendali',
              ].map((item) => (
                <li key={item} className="flex gap-1.5 text-xs text-rose-700">
                  <span className="text-rose-400 shrink-0 mt-0.5">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 12. Certification boundary ── */}
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

      {/* ── 13. Future Vision CTA ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Evoluzione Advisor Network</p>
          <p className="text-xs text-slate-400 mt-0.5">
            KORA Certified, Academy completa, marketplace advisor, Value Chain territoriale — post-pilot.
          </p>
        </div>
        <Link
          href="/future-vision"
          className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Vedi evoluzione Advisor Network →
        </Link>
      </div>

      {/* ── 14. Limitations block ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Stato demo
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Dati sintetici demo. Advisor Workspace è una preview del ruolo professionale KORA.
          Non abilita licenze reali, certificazioni regolatorie, pagamenti, LMS produttivo,
          chat o calendario live.
        </p>
        <p className="mt-1.5 text-[10px] font-mono text-slate-400">
          synthetic_demo_data: true · KORA Methodology v0.1 · calibration_status: pre_empirical_calibration
        </p>
      </div>

    </div>
  );
}
