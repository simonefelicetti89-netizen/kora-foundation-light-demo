'use client';

import { useState } from 'react';

// P-01: Partner Workspace Light — Foundation Light Preview
// Synthetic demo data only. No marketplace, no booking, no payment.
// Partners in KORA are activation actors, not marketplace vendors.

// ─── Foundation Light demo constants ──────────────────────────────────────────
// Inline synthetic data — no seed file import from partner workspace.
// Partner profile references partner-citta-aperta from collective-initiatives.json.

const PARTNER_PROFILE = {
  id: 'partner-citta-aperta',
  name: 'Città Aperta APS',
  category: 'Associazione di Promozione Sociale',
  service_types: ['Volontariato territoriale', 'Community inclusion', 'Iniziative di solidarietà'],
  pillars: ['IMPACT', 'CONNECTION'],
  territory: 'Provincia di Bergamo',
  network_status: 'active',
  evidence_reliability: 'partial',
  validation_status: 'pending',
  synthetic_demo_data: true,
};

interface PartnerService {
  id: string;
  title: string;
  pillar: string;
  activation_purpose: string;
  evidence_type: string;
  evidence_protocol_status: 'audit_completed' | 'audit_pending' | 'not_requested';
  scope: string;
}

const PARTNER_SERVICES: PartnerService[] = [
  {
    id: 'svc-1',
    title: 'Programma Volontariato Territoriale',
    pillar: 'IMPACT',
    activation_purpose: 'Impegno verificato nella comunità locale. Rafforza attivazione IMPACT e CONNECTION.',
    evidence_type: 'Attestato partecipazione + conferma coordinatore',
    evidence_protocol_status: 'audit_pending',
    scope: 'Disponibile per aziende partner nel territorio di Bergamo.',
  },
  {
    id: 'svc-2',
    title: 'Workshop Community Leadership',
    pillar: 'CONNECTION',
    activation_purpose: 'Sviluppo competenze relazionali e leadership nella comunità.',
    evidence_type: 'Attestato di completamento',
    evidence_protocol_status: 'audit_completed',
    scope: 'On-site e online. Gruppo minimo 5 partecipanti.',
  },
  {
    id: 'svc-3',
    title: 'Giornata Solidarietà Aziendale',
    pillar: 'IMPACT',
    activation_purpose: 'Iniziativa collettiva aziendale verificata in contesto comunitario.',
    evidence_type: 'Report attività + lista presenze aggregata',
    evidence_protocol_status: 'audit_completed',
    scope: 'Evento collettivo. Partecipazione ≥10 lavoratori per soglia KORA.',
  },
  {
    id: 'svc-4',
    title: 'Percorso Mentoring Comunitario',
    pillar: 'LEGACY',
    activation_purpose: 'Trasferimento di competenze verso la comunità. Rilevante per pillar LEGACY.',
    evidence_type: 'Log sessioni + dichiarazione supervisore',
    evidence_protocol_status: 'not_requested',
    scope: 'Programma strutturato. Minimo 4 sessioni documentate.',
  },
  {
    id: 'svc-5',
    title: 'Supporto Psicologico Comunitario',
    pillar: 'LIFE',
    activation_purpose: 'Supporto psicologico in contesti di fragilità sociale. Pillar LIFE.',
    evidence_type: 'Attestato partecipazione + referral report',
    evidence_protocol_status: 'audit_pending',
    scope: 'In attesa di audit processo advisor. Non ancora disponibile per attivazione KORA.',
  },
];

// Collective initiative — referenced from collective-initiatives.json (synthetic)
const DEMO_INITIATIVE = {
  name: 'Bergamo Solidarity Network',
  pillar: 'IMPACT',
  pillar_secondary: 'CONNECTION',
  companies: 'Meridiana Group S.r.l. + Communitas Cooperativa',
  aggregate_participation: 28,
  aggregate_target: 40,
  aggregate_completed: 18,
  evidence_status: 'Parzialmente presentata',
  advisor_status: 'In attesa di review protocollo evidenze',
  kora_contribution_note:
    'Segnale KORA Contribution — direzionale. Non modifica direttamente il KORA Index.',
  not_kora_index_component: true,
  synthetic_demo_data: true,
};

// Activation requests from companies (no booking engine, no calendar, no payment)
interface ActivationRequest {
  id: string;
  company: string;
  service: string;
  pillar: string;
  status: string;
  participants_aggregate: number | null;
  evidence_submitted: boolean;
  date_requested: string;
}

const ACTIVATION_REQUESTS: ActivationRequest[] = [
  {
    id: 'req-001',
    company: 'Meridiana Group S.r.l.',
    service: 'Giornata Solidarietà Aziendale',
    pillar: 'IMPACT',
    status: 'confermata',
    participants_aggregate: 22,
    evidence_submitted: true,
    date_requested: 'Aprile 2026',
  },
  {
    id: 'req-002',
    company: 'Communitas Cooperativa',
    service: 'Workshop Community Leadership',
    pillar: 'CONNECTION',
    status: 'in_attesa',
    participants_aggregate: null,
    evidence_submitted: false,
    date_requested: 'Maggio 2026',
  },
  {
    id: 'req-003',
    company: 'Meridiana Group S.r.l.',
    service: 'Programma Volontariato Territoriale',
    pillar: 'IMPACT',
    status: 'evidenza_richiesta',
    participants_aggregate: 14,
    evidence_submitted: false,
    date_requested: 'Maggio 2026',
  },
];

const REQUEST_STATUS_BADGE: Record<string, { style: string; label: string }> = {
  confermata:         { style: 'bg-green-50 text-green-700 border-green-200',    label: 'Confermata' },
  in_attesa:          { style: 'bg-amber-50 text-amber-700 border-amber-200',    label: 'In attesa' },
  evidenza_richiesta: { style: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Evidenza richiesta' },
};

// Evidence submissions and review status
interface EvidenceItem {
  id: string;
  service: string;
  company: string;
  evidence_type: string;
  submitted: boolean;
  advisor_status: string | null;
  notes: string;
}

const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'ev-001',
    service: 'Giornata Solidarietà Aziendale',
    company: 'Meridiana Group S.r.l.',
    evidence_type: 'Report attività + lista presenze aggregata',
    submitted: true,
    advisor_status: 'in_revisione',
    notes: 'Documentazione ricevuta. In attesa di revisione advisor.',
  },
  {
    id: 'ev-002',
    service: 'Bergamo Solidarity Network',
    company: 'Cross-company (aggregato)',
    evidence_type: 'Report collettivo aggregato',
    submitted: true,
    advisor_status: 'parziale',
    notes: "Evidenza parziale. Richiesta integrazione da Communitas Cooperativa.",
  },
  {
    id: 'ev-003',
    service: 'Programma Volontariato Territoriale',
    company: 'Meridiana Group S.r.l.',
    evidence_type: 'Attestato partecipazione + conferma coordinatore',
    submitted: false,
    advisor_status: null,
    notes: "In attesa di caricamento documenti da parte dell'azienda.",
  },
];

const EVIDENCE_STATUS_BADGE: Record<string, { style: string; label: string }> = {
  in_revisione: { style: 'bg-amber-50 text-amber-700 border-amber-200',    label: 'In revisione' },
  parziale:     { style: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Parziale' },
  approvata:    { style: 'bg-green-50 text-green-700 border-green-200',    label: 'Approvata' },
};

// Availability windows — static preview, no real calendar, no booking
const AVAILABILITY_WINDOWS = [
  {
    id: 'av-001',
    period: 'Maggio 2026',
    service: 'Giornata Solidarietà Aziendale',
    slots_label: '2 slot indicativi',
    note: "Coordinamento via email. Nessuna prenotazione diretta in KORA.",
  },
  {
    id: 'av-002',
    period: 'Giugno 2026',
    service: 'Workshop Community Leadership',
    slots_label: '3 slot indicativi',
    note: "Minimo 5 partecipanti. Conferma necessaria fuori piattaforma.",
  },
  {
    id: 'av-003',
    period: 'Giugno–Luglio 2026',
    service: 'Percorso Mentoring Comunitario',
    slots_label: 'Aperto — programma strutturato',
    note: "In attesa di audit processo advisor prima dell'attivazione.",
  },
];

// Action log — partner activity trace (no real messaging, no notifications)
const ACTION_LOG = [
  {
    id: 'log-001',
    date: '12 Mag 2026',
    action: 'Evidenza caricata',
    detail: 'Report Giornata Solidarietà Aziendale — Meridiana Group S.r.l.',
    status: 'completata',
  },
  {
    id: 'log-002',
    date: '08 Mag 2026',
    action: 'Richiesta attivazione ricevuta',
    detail: 'Workshop Community Leadership — Communitas Cooperativa',
    status: 'in_corso',
  },
  {
    id: 'log-003',
    date: '28 Apr 2026',
    action: 'Audit processo advisor completato',
    detail: 'Workshop Community Leadership — protocollo evidenze rivisto',
    status: 'completata',
  },
  {
    id: 'log-004',
    date: '15 Apr 2026',
    action: 'Profilo partner aggiornato',
    detail: 'Aggiunto servizio: Percorso Mentoring Comunitario',
    status: 'completata',
  },
];

const LOG_STATUS_BADGE: Record<string, { style: string; label: string }> = {
  completata: { style: 'bg-green-50 text-green-700 border-green-200',  label: 'Completata' },
  in_corso:   { style: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'In corso' },
};

// ─── Style helpers ────────────────────────────────────────────────────────────

const PILLAR_BADGE: Record<string, string> = {
  IMPACT:     'bg-blue-50 text-blue-700 border-blue-200',
  CONNECTION: 'bg-violet-50 text-violet-700 border-violet-200',
  LIFE:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  GROWTH:     'bg-amber-50 text-amber-700 border-amber-200',
  LEGACY:     'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const PROTOCOL_BADGE: Record<string, { style: string; label: string }> = {
  audit_completed: { style: 'bg-green-50 text-green-700 border-green-200',   label: 'Audit processo completato' },
  audit_pending:   { style: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Audit processo in corso' },
  not_requested:   { style: 'bg-slate-50 text-slate-500 border-slate-200',   label: 'Protocollo non definito' },
};

// ─── Phase 1N-C3: Daily Operations constants ──────────────────────────────────
// All synthetic demo data. No individual workers. No company KORA Index.

interface CompanyScope {
  company_name: string;
  sector: string;
  territory: string;
  relationship_status: string;
  active_requests: number;
  active_services: number;
  aggregate_participants: number | null;
  privacy_status: string;
  next_action: string;
  synthetic_demo_data: true;
}

const PARTNER_COMPANY_SCOPE: CompanyScope[] = [
  {
    company_name: 'Meridiana Group S.r.l.',
    sector: 'Manufacturing',
    territory: 'Lombardia / Bergamo',
    relationship_status: 'Pilot attivo',
    active_requests: 3,
    active_services: 2,
    aggregate_participants: 42,
    privacy_status: 'Aggregato sopra soglia',
    next_action: 'Completare evidenza per Workshop Community Leadership',
    synthetic_demo_data: true,
  },
  {
    company_name: 'Communitas Cooperativa',
    sector: 'Servizi alla persona',
    territory: 'Lombardia',
    relationship_status: 'Richiesta in review',
    active_requests: 1,
    active_services: 1,
    aggregate_participants: null,
    privacy_status: 'Soglia privacy non ancora raggiunta',
    next_action: 'Confermare finestra di attivazione',
    synthetic_demo_data: true,
  },
  {
    company_name: 'Studio Aurora Benefit',
    sector: 'Professional services',
    territory: 'Milano',
    relationship_status: 'Interesse ricevuto',
    active_requests: 1,
    active_services: 1,
    aggregate_participants: null,
    privacy_status: 'Solo richiesta demo',
    next_action: 'Valutare fit LIFE / CONNECTION',
    synthetic_demo_data: true,
  },
];

const RELATIONSHIP_STATUS_BADGE: Record<string, { style: string }> = {
  'Pilot attivo':        { style: 'bg-green-50 text-green-700 border-green-200' },
  'Richiesta in review': { style: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Interesse ricevuto':  { style: 'bg-slate-50 text-slate-500 border-slate-200' },
};

interface ActivationCohort {
  cohort_label: string;
  company: string;
  service: string;
  participant_count: number | null;
  privacy_threshold_status: string;
  scheduled_window: string;
  action_status: string;
  evidence_status: string;
  synthetic_demo_data: true;
}

const ACTIVATION_COHORTS: ActivationCohort[] = [
  {
    cohort_label: 'Meridiana Group — Sede Bergamo',
    company: 'Meridiana Group S.r.l.',
    service: 'Programma Volontariato Territoriale',
    participant_count: 28,
    privacy_threshold_status: 'Sopra soglia privacy',
    scheduled_window: 'Q4 2025',
    action_status: 'Azione completata',
    evidence_status: 'Evidenza richiesta',
    synthetic_demo_data: true,
  },
  {
    cohort_label: 'Communitas — gruppo volontariato',
    company: 'Communitas Cooperativa',
    service: 'Giornata Solidarietà Aziendale',
    participant_count: null,
    privacy_threshold_status: 'Sotto soglia privacy — conteggio non visibile',
    scheduled_window: 'Q2 2026',
    action_status: 'In valutazione partner',
    evidence_status: 'Da definire',
    synthetic_demo_data: true,
  },
  {
    cohort_label: 'Studio Aurora — cohort demo',
    company: 'Studio Aurora Benefit',
    service: 'Percorso Mentoring Comunitario',
    participant_count: null,
    privacy_threshold_status: 'Richiesta non confermata',
    scheduled_window: 'Q2 2026',
    action_status: 'Interesse ricevuto',
    evidence_status: 'Non avviata',
    synthetic_demo_data: true,
  },
];

type AgendaItemType = 'request_review' | 'scheduled_activation' | 'evidence_followup' | 'advisor_check';

interface AgendaItem {
  id: string;
  time: string;
  title: string;
  company: string;
  service: string;
  type: AgendaItemType;
  status: string;
  synthetic_demo_data: true;
}

const TODAY_AGENDA: AgendaItem[] = [
  {
    id: 'ag-001',
    time: '09:30',
    title: 'Review richiesta Meridiana Group',
    company: 'Meridiana Group S.r.l.',
    service: 'Programma Volontariato Territoriale',
    type: 'request_review',
    status: 'Da valutare',
    synthetic_demo_data: true,
  },
  {
    id: 'ag-002',
    time: '11:00',
    title: 'Workshop Community Leadership',
    company: 'Meridiana Group S.r.l.',
    service: 'Workshop Community Leadership',
    type: 'scheduled_activation',
    status: 'Programmata demo',
    synthetic_demo_data: true,
  },
  {
    id: 'ag-003',
    time: '14:30',
    title: 'Follow-up evidenza Bergamo Solidarity Network',
    company: 'Meridiana Group S.r.l.',
    service: 'Giornata di volontariato territoriale',
    type: 'evidence_followup',
    status: 'Evidenza richiesta',
    synthetic_demo_data: true,
  },
  {
    id: 'ag-004',
    time: '16:00',
    title: 'Check protocollo evidenze con Advisor',
    company: 'Città Aperta APS',
    service: 'Protocollo evidenze LIFE / IMPACT',
    type: 'advisor_check',
    status: 'Audit processo',
    synthetic_demo_data: true,
  },
];

const AGENDA_TYPE_BADGE: Record<AgendaItemType, { style: string; label: string }> = {
  request_review:       { style: 'bg-amber-50 text-amber-700 border-amber-200',    label: 'Review richiesta' },
  scheduled_activation: { style: 'bg-blue-50 text-blue-700 border-blue-200',       label: 'Attivazione' },
  evidence_followup:    { style: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Follow-up evidenza' },
  advisor_check:        { style: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Check Advisor' },
};

interface FinancialRow {
  period: string;
  company: string;
  service: string;
  completed_activations: number;
  estimated_amount: string;
  status: string;
  payment_boundary: string;
  synthetic_demo_data: true;
}

const PARTNER_FINANCIAL_PREVIEW: FinancialRow[] = [
  {
    period: 'Q4 2025',
    company: 'Meridiana Group S.r.l.',
    service: 'Programma Volontariato Territoriale',
    completed_activations: 2,
    estimated_amount: '€ 4.800 demo',
    status: 'Da consuntivare',
    payment_boundary: 'Nessun pagamento eseguito',
    synthetic_demo_data: true,
  },
  {
    period: 'Q1 2026',
    company: 'Meridiana Group S.r.l.',
    service: 'Workshop Community Leadership',
    completed_activations: 1,
    estimated_amount: '€ 2.200 demo',
    status: 'In verifica evidenze',
    payment_boundary: 'Nessuna fattura generata',
    synthetic_demo_data: true,
  },
  {
    period: 'Q4 2025',
    company: 'Communitas Cooperativa',
    service: 'Giornata Solidarietà Aziendale',
    completed_activations: 1,
    estimated_amount: '€ 1.600 demo',
    status: 'Liquidabile — demo',
    payment_boundary: 'Preview informativa',
    synthetic_demo_data: true,
  },
  {
    period: 'Q2 2026',
    company: 'Studio Aurora Benefit',
    service: 'Percorso Mentoring Comunitario',
    completed_activations: 0,
    estimated_amount: '€ 0 demo',
    status: 'Non fatturabile — evidenza incompleta',
    payment_boundary: 'Nessun payout partner',
    synthetic_demo_data: true,
  },
];

const FINANCIAL_STATUS_BADGE: Record<string, string> = {
  'Da consuntivare':                       'bg-slate-50 text-slate-500 border-slate-200',
  'In verifica evidenze':                  'bg-amber-50 text-amber-700 border-amber-200',
  'Liquidabile — demo':                    'bg-green-50 text-green-700 border-green-200',
  'Non fatturabile — evidenza incompleta': 'bg-red-50 text-red-600 border-red-200',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerDashboard() {
  const [demoActions, setDemoActions] = useState<Record<string, string>>({});

  return (
    <div className="space-y-10 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Partner Workspace Light</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Foundation Light Preview
          </span>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
            KORA Activation Network
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
          I partner KORA non sono vendor di marketplace: sono attori di attivazione che abilitano
          iniziative, servizi ed evidenze verificabili a beneficio delle aziende e dei loro lavoratori.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Nessun marketplace', 'Nessuna prenotazione diretta', 'Nessun pagamento KORA'].map((b) => (
            <span key={b} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              {b}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Aziende in perimetro', value: PARTNER_COMPANY_SCOPE.length.toString() },
            { label: 'Richieste attive', value: PARTNER_COMPANY_SCOPE.reduce((s, c) => s + c.active_requests, 0).toString() },
            { label: 'Evidenze da completare', value: EVIDENCE_ITEMS.filter((e) => !e.submitted).length.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center">
              <p className="text-xl font-bold text-slate-800">{value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Aziende in perimetro ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Aziende in perimetro
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Il partner vede solo aziende e richieste nel proprio perimetro operativo. Non vede KORA Index
          aziendale, dati HR confidenziali o dati individuali dei lavoratori.
        </p>
        <div className="space-y-3">
          {PARTNER_COMPANY_SCOPE.map((co) => {
            const rb = RELATIONSHIP_STATUS_BADGE[co.relationship_status] ?? { style: 'bg-slate-50 text-slate-500 border-slate-200' };
            return (
              <div key={co.company_name} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{co.company_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{co.sector} · {co.territory}</p>
                  </div>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${rb.style}`}>
                    {co.relationship_status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-slate-50 px-2 py-1.5">
                    <p className="text-sm font-bold text-slate-700">{co.active_requests}</p>
                    <p className="text-[10px] text-slate-400">Richieste attive</p>
                  </div>
                  <div className="rounded bg-slate-50 px-2 py-1.5">
                    <p className="text-sm font-bold text-slate-700">{co.active_services}</p>
                    <p className="text-[10px] text-slate-400">Servizi attivi</p>
                  </div>
                  <div className="rounded bg-slate-50 px-2 py-1.5">
                    <p className="text-sm font-bold text-slate-700">
                      {co.aggregate_participants !== null ? co.aggregate_participants : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400">Partecipanti agg.</p>
                  </div>
                </div>
                {co.aggregate_participants === null && (
                  <p className="text-[10px] text-amber-600 italic">{co.privacy_status}</p>
                )}
                <div className="flex items-start gap-1.5">
                  <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">→</span>
                  <p className="text-[11px] text-slate-500">{co.next_action}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Dati sintetici demo · Nessun KORA Index aziendale · Nessun dato HR confidenziale · Nessun dato individuale.
        </p>
      </div>

      {/* ── Agenda operativa di oggi — demo ── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Agenda operativa di oggi — demo
          </p>
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            21 Mag 2026
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Agenda dimostrativa. Nessuna integrazione calendario reale, nessuna notifica, nessuna conferma operativa live.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {TODAY_AGENDA.map((item) => {
            const tb = AGENDA_TYPE_BADGE[item.type];
            return (
              <div key={item.id} className="flex items-start gap-4 px-4 py-3">
                <p className="text-sm font-mono font-semibold text-slate-500 shrink-0 w-10 pt-0.5">{item.time}</p>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${tb.style}`}>
                      {tb.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{item.company} · {item.service}</p>
                </div>
                <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shrink-0">
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Nessun calendario reale · Nessuna notifica · Nessuna conferma live · Dati sintetici demo.
        </p>
      </div>

      {/* ── Partner Profile Card ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Profilo Partner
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-900">{PARTNER_PROFILE.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">{PARTNER_PROFILE.category}</p>
            </div>
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${PARTNER_PROFILE.network_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              {PARTNER_PROFILE.network_status === 'active' ? 'Rete attiva' : 'Non attivo'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-slate-400">Territorio</p>
              <p className="text-slate-700 mt-0.5">{PARTNER_PROFILE.territory}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tipologie di servizio</p>
              <p className="text-slate-700 mt-0.5">{PARTNER_PROFILE.service_types.join(' · ')}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Pillar serviti</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {PARTNER_PROFILE.pillars.map((p) => (
                  <span key={p} className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PILLAR_BADGE[p] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400">Affidabilità evidenza</p>
              <span className="inline-block mt-0.5 rounded border bg-amber-50 border-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                Parziale — revisione protocollo evidenze in corso
              </span>
            </div>
          </div>

          <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500">Nota: </span>
            Il partner non è un fornitore certificato KORA. Le azioni sono ammissibili se rispettano
            il protocollo evidenze approvato. L&apos;Advisor esegue un audit preliminare del processo
            e del protocollo — non valida le singole azioni.
          </div>
        </div>
      </div>

      {/* ── Services / Opportunities Preview ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Servizi & Opportunità di Attivazione
        </p>
        <p className="text-xs text-slate-400 mb-3">
          I servizi sotto non sono prenotabili direttamente. Le aziende richiedono l&apos;attivazione;
          KORA verifica l&apos;evidenza dopo la partecipazione.
        </p>
        <div className="space-y-3">
          {PARTNER_SERVICES.map((svc) => {
            const vb = PROTOCOL_BADGE[svc.evidence_protocol_status];
            return (
              <div key={svc.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{svc.title}</p>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PILLAR_BADGE[svc.pillar] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {svc.pillar}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${vb.style}`}>
                      {vb.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{svc.activation_purpose}</p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span><span className="font-medium text-slate-500">Evidenza richiesta:</span> {svc.evidence_type}</span>
                </div>
                <p className="text-[11px] text-slate-400 italic">{svc.scope}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Nessun prezzo · Nessun checkout · Nessun carrello · Nessuna esecuzione pagamento.
          Il partner coordina con le aziende fuori dalla piattaforma KORA in Foundation Light.
        </p>
      </div>

      {/* ── Activation Requests Preview ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Richieste di Attivazione — Preview
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Richieste ricevute da aziende per i servizi del partner. Nessuna conferma diretta in piattaforma
          — il coordinamento avviene fuori da KORA in Foundation Light.
        </p>
        <div className="space-y-2">
          {ACTIVATION_REQUESTS.map((req) => {
            const rb = REQUEST_STATUS_BADGE[req.status] ?? { style: 'bg-slate-50 text-slate-500 border-slate-200', label: req.status };
            const demoAction = demoActions[req.id];
            return (
              <div key={req.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{req.service}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{req.company} · {req.date_requested}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PILLAR_BADGE[req.pillar] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {req.pillar}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${rb.style}`}>
                      {rb.label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                  {req.participants_aggregate !== null && (
                    <span>Partecipanti aggregati: <span className="font-medium text-slate-600">{req.participants_aggregate}</span></span>
                  )}
                  <span>Evidenza: <span className={`font-medium ${req.evidence_submitted ? 'text-green-700' : 'text-amber-600'}`}>{req.evidence_submitted ? 'Presentata' : 'Non ancora presentata'}</span></span>
                </div>
                {demoAction ? (
                  <div className="rounded bg-green-50 border border-green-100 px-2.5 py-1.5 text-[11px] text-green-700 font-medium">
                    Azione demo registrata: {demoAction} — non persistente.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: 'Accetta richiesta — demo', action: 'Accettata' },
                      { label: 'Richiedi informazioni — demo', action: 'Info richiesta' },
                      { label: 'Segna come programmata — demo', action: 'Programmata' },
                    ].map(({ label, action }) => (
                      <button
                        key={label}
                        onClick={() => setDemoActions((prev) => ({ ...prev, [req.id]: action }))}
                        className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Azioni demo non persistenti. In Foundation Light non esiste workflow operativo reale.
          Nessuna conferma calendario · Nessuna chat · Nessun pagamento · Dati sintetici demo.
        </p>
      </div>

      {/* ── Coorti di attivazione ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Coorti di attivazione
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Le persone non sono mostrate nominativamente. Il partner opera su coorti autorizzate e
          conteggi aggregati sopra soglia privacy.
        </p>
        <div className="space-y-2">
          {ACTIVATION_COHORTS.map((cohort) => (
            <div key={cohort.cohort_label} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{cohort.cohort_label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{cohort.company} · {cohort.service}</p>
                </div>
                <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  {cohort.scheduled_window}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
                <span>
                  Partecipanti:{' '}
                  {cohort.participant_count !== null
                    ? <span className="font-semibold text-slate-700">{cohort.participant_count}</span>
                    : <span className="italic text-amber-600">{cohort.privacy_threshold_status}</span>
                  }
                </span>
                <span>Stato: <span className="font-medium text-slate-600">{cohort.action_status}</span></span>
                <span>Evidenza: <span className="font-medium text-slate-600">{cohort.evidence_status}</span></span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Nessun nominativo · Nessun ID lavoratore · Nessun PIB individuale · Solo aggregati sopra soglia (≥10) · Dati sintetici.
        </p>
      </div>

      {/* ── Evidence & Review Status ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Evidenze & Stato Revisione
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Documentazione presentata rispetto al protocollo evidenze approvato. L&apos;Advisor revisiona
          il protocollo e gestisce eccezioni o campioni — non approva ogni singolo documento.
          Solo conteggi aggregati — nessun dato individuale.
        </p>
        <div className="space-y-2">
          {EVIDENCE_ITEMS.map((ev) => {
            const eb = ev.advisor_status
              ? (EVIDENCE_STATUS_BADGE[ev.advisor_status] ?? { style: 'bg-slate-50 text-slate-500 border-slate-200', label: ev.advisor_status })
              : null;
            return (
              <div key={ev.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{ev.service}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ev.company}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${ev.submitted ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {ev.submitted ? 'Presentata' : 'Non presentata'}
                    </span>
                    {eb && (
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${eb.style}`}>
                        {eb.label}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  <span className="font-medium">Tipo evidenza:</span> {ev.evidence_type}
                </p>
                <p className="text-[11px] text-slate-400 italic">{ev.notes}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Dati sintetici · Nessun dato individuale · Solo aggregati sopra soglia privacy (≥10).
        </p>
      </div>

      {/* ── Evidence Protocol Status — Process Audit ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Stato Protocollo Evidenze — Audit Processo
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Stato dell&apos;audit di processo per ciascun servizio del partner. L&apos;Advisor KORA revisiona
          il protocollo evidenze e la metodologia — non valida le singole azioni.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Servizio</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Pillar</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Stato audit processo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PARTNER_SERVICES.map((svc) => {
                const vb = PROTOCOL_BADGE[svc.evidence_protocol_status];
                return (
                  <tr key={svc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs text-slate-700">{svc.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PILLAR_BADGE[svc.pillar] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {svc.pillar}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${vb.style}`}>
                        {vb.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 rounded bg-blue-50 border border-blue-100 px-3 py-2.5 text-[11px] text-blue-700 leading-relaxed">
          <span className="font-semibold">Modello di validazione KORA: </span>
          L&apos;Advisor non valida ogni singola azione. L&apos;Advisor esegue un audit preliminare del processo
          e del protocollo evidenze del partner. Le azioni successive sono considerate ammissibili se
          rispettano il protocollo approvato, con monitoraggio periodico, controlli a campione e
          possibilità di re-review.
        </div>
      </div>

      {/* ── Resoconto attività e fatturazione — preview ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Resoconto attività e fatturazione — preview
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Preview informativa. Nessuna fattura fiscale generata, nessun pagamento eseguito, nessun wallet,
          nessun payout partner in Foundation Light.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Periodo</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Azienda / Servizio</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Attivazioni</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Importo stimato</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PARTNER_FINANCIAL_PREVIEW.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{row.period}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-700">
                    <p className="font-medium">{row.company}</p>
                    <p className="text-slate-400">{row.service}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-right text-slate-600">{row.completed_activations}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-right text-slate-600">{row.estimated_amount}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${FINANCIAL_STATUS_BADGE[row.status] ?? 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {row.status}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 italic">{row.payment_boundary}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Importi stimati indicativi · Nessuna fattura · Nessun pagamento · Nessun payout · Dati sintetici demo.
        </p>
      </div>

      {/* ── Availability Windows ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Finestre di Disponibilità — Preview
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Periodi indicativi in cui il partner è disponibile per attivazioni. Nessun calendario
          interattivo, nessuna prenotazione diretta, nessuna esecuzione slot in KORA Foundation Light.
        </p>
        <div className="space-y-2">
          {AVAILABILITY_WINDOWS.map((av) => (
            <div key={av.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{av.service}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{av.period}</p>
                </div>
                <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {av.slots_label}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 italic">{av.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Nessun calendario · Nessun slot prenotabile · Nessuna esecuzione real-time · Dati indicativi sintetici.
        </p>
      </div>

      {/* ── Action Logging Preview ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Log Azioni Partner — Preview
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Traccia delle azioni recenti associate al partner nel sistema KORA. Nessuna notifica in tempo
          reale, nessuna chat, nessun feed sociale.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {ACTION_LOG.map((log) => {
            const lb = LOG_STATUS_BADGE[log.status] ?? { style: 'bg-slate-50 text-slate-500 border-slate-200', label: log.status };
            return (
              <div key={log.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-slate-700">{log.action}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${lb.style}`}>
                      {lb.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{log.detail}</p>
                </div>
                <p className="text-[11px] text-slate-400 shrink-0">{log.date}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Nessuna notifica push · Nessun feed · Nessuna chat · Traccia sintetica demo.
        </p>
      </div>

      {/* ── Collective Initiative Preview ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Iniziativa Collettiva — Preview
        </p>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-blue-900">{DEMO_INITIATIVE.name}</p>
              <p className="text-xs text-blue-700 mt-0.5">
                Iniziativa cross-company — {DEMO_INITIATIVE.companies}
              </p>
            </div>
            <div className="flex gap-1.5">
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PILLAR_BADGE[DEMO_INITIATIVE.pillar]}`}>
                {DEMO_INITIATIVE.pillar}
              </span>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PILLAR_BADGE[DEMO_INITIATIVE.pillar_secondary]}`}>
                {DEMO_INITIATIVE.pillar_secondary}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-blue-600">Partecipazione aggregata</p>
              <p className="font-bold text-blue-900 mt-0.5">
                {DEMO_INITIATIVE.aggregate_participation} / {DEMO_INITIATIVE.aggregate_target}
              </p>
              <p className="text-xs text-blue-600">{DEMO_INITIATIVE.aggregate_completed} completati</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Stato evidenza</p>
              <p className="text-sm text-blue-800 mt-0.5">{DEMO_INITIATIVE.evidence_status}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Revisione advisor</p>
              <p className="text-sm text-blue-800 mt-0.5">{DEMO_INITIATIVE.advisor_status}</p>
            </div>
          </div>

          <div className="rounded bg-blue-100 border border-blue-200 px-3 py-2 text-[11px] text-blue-700">
            <span className="font-semibold">Segnale KORA Contribution: </span>
            {DEMO_INITIATIVE.kora_contribution_note}
          </div>

          <p className="text-[11px] text-blue-600">
            Solo conteggi aggregati sopra soglia privacy. Nessun dato individuale visibile al partner.
          </p>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Dati sintetici — Foundation Light demo preview · synthetic_demo_data: true
        </p>
      </div>

      {/* ── KORA Activation Community — Future Vision ── */}
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            KORA Activation Community
          </p>
          <span className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Future Vision / Not Active in Foundation Light
          </span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          In futuro, i partner KORA potranno coordinarsi in una rete di attivazione condivisa:
          co-progettare iniziative cross-partner, condividere segnali di disponibilità aggregati,
          e ricevere richieste di attivazione territoriale da più aziende in modo coordinato.
        </p>
        <ul className="space-y-1">
          {[
            'Rete di coordinamento cross-partner (non attiva)',
            'Segnali di attivazione aggregati multi-azienda (non attivo)',
            'Co-progettazione iniziative condivise (non attivo)',
            'Nessun social feed · Nessun ranking partner · Nessun marketplace',
          ].map((item) => (
            <li key={item} className="flex gap-2 text-xs text-slate-400">
              <span className="text-slate-300 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-400">
          Questa sezione è un mockup statico. Nessuna logica attiva, nessun dato live, nessuna funzionalità abilitata.
        </p>
      </div>

      {/* ── Partner Access Boundary ── */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-1.5">
        <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
          Perimetro di accesso Partner
        </p>
        <p className="text-sm text-emerald-800 leading-relaxed">
          Il partner non vede PIB individuali, timeline personali, Dynamic Impact CV o dati privati
          dei lavoratori. Opera solo su iniziative, richieste e evidenze nel perimetro autorizzato.
        </p>
        <ul className="space-y-1 pt-1">
          {[
            'Nessun PIB individuale visibile',
            'Nessuna timeline personale del lavoratore',
            'Nessun Dynamic Impact CV',
            'Nessun nominativo, email o ID lavoratore',
            'Nessun KORA Index aziendale',
            'Nessun dato HR confidenziale',
            'Solo conteggi aggregati sopra soglia privacy (≥10 lavoratori)',
            'Solo perimetro operativo autorizzato — nessuna visibilità cross-perimetro',
          ].map((item) => (
            <li key={item} className="flex gap-2 text-xs text-emerald-700">
              <span className="text-emerald-400 shrink-0 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
