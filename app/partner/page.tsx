'use client';

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
  advisor_validation: 'validated' | 'pending' | 'not_requested';
  scope: string;
}

const PARTNER_SERVICES: PartnerService[] = [
  {
    id: 'svc-1',
    title: 'Programma Volontariato Territoriale',
    pillar: 'IMPACT',
    activation_purpose: 'Impegno verificato nella comunità locale. Rafforza attivazione IMPACT e CONNECTION.',
    evidence_type: 'Attestato partecipazione + conferma coordinatore',
    advisor_validation: 'pending',
    scope: 'Disponibile per aziende partner nel territorio di Bergamo.',
  },
  {
    id: 'svc-2',
    title: 'Workshop Community Leadership',
    pillar: 'CONNECTION',
    activation_purpose: 'Sviluppo competenze relazionali e leadership nella comunità.',
    evidence_type: 'Attestato di completamento',
    advisor_validation: 'validated',
    scope: 'On-site e online. Gruppo minimo 5 partecipanti.',
  },
  {
    id: 'svc-3',
    title: 'Giornata Solidarietà Aziendale',
    pillar: 'IMPACT',
    activation_purpose: 'Iniziativa collettiva aziendale verificata in contesto comunitario.',
    evidence_type: 'Report attività + lista presenze aggregata',
    advisor_validation: 'validated',
    scope: 'Evento collettivo. Partecipazione ≥10 lavoratori per soglia KORA.',
  },
  {
    id: 'svc-4',
    title: 'Percorso Mentoring Comunitario',
    pillar: 'LEGACY',
    activation_purpose: 'Trasferimento di competenze verso la comunità. Rilevante per pillar LEGACY.',
    evidence_type: 'Log sessioni + dichiarazione supervisore',
    advisor_validation: 'not_requested',
    scope: 'Programma strutturato. Minimo 4 sessioni documentate.',
  },
  {
    id: 'svc-5',
    title: 'Supporto Psicologico Comunitario',
    pillar: 'LIFE',
    activation_purpose: 'Supporto psicologico in contesti di fragilità sociale. Pillar LIFE.',
    evidence_type: 'Attestato partecipazione + referral report',
    advisor_validation: 'pending',
    scope: 'In attesa di validazione advisor. Non ancora disponibile per attivazione KORA.',
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
  advisor_status: 'In attesa di revisione advisor',
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
    note: "In attesa di validazione advisor prima dell'attivazione.",
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
    action: 'Validazione advisor completata',
    detail: 'Workshop Community Leadership — validato',
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

const VALIDATION_BADGE: Record<string, { style: string; label: string }> = {
  validated:     { style: 'bg-green-50 text-green-700 border-green-200',   label: 'Validato advisor' },
  pending:       { style: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'In attesa' },
  not_requested: { style: 'bg-slate-50 text-slate-500 border-slate-200',   label: 'Non richiesto' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerDashboard() {
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
                Parziale — validazione in corso
              </span>
            </div>
          </div>

          <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500">Nota: </span>
            Il partner non è un fornitore certificato KORA. Lo status di affidabilità dell&apos;evidenza
            dipende dalla qualità della documentazione fornita e dalla validazione advisor assegnata.
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
            const vb = VALIDATION_BADGE[svc.advisor_validation];
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
            return (
              <div key={req.id} className="rounded-lg border border-slate-200 bg-white p-4">
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
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
                  {req.participants_aggregate !== null && (
                    <span>Partecipanti aggregati: <span className="font-medium text-slate-600">{req.participants_aggregate}</span></span>
                  )}
                  <span>Evidenza: <span className={`font-medium ${req.evidence_submitted ? 'text-green-700' : 'text-amber-600'}`}>{req.evidence_submitted ? 'Presentata' : 'Non ancora presentata'}</span></span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Nessuna conferma calendario · Nessuna chat · Nessun pagamento · Dati sintetici demo.
        </p>
      </div>

      {/* ── Evidence & Review Status ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Evidenze & Stato Revisione
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Documentazione presentata per la verifica KORA. L&apos;advisor assegnato revisiona le evidenze
          prima dell&apos;approvazione. Solo conteggi aggregati — nessun dato individuale.
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

      {/* ── Advisor Verification Area ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Area Verifica Advisor
        </p>
        <p className="text-xs text-slate-400 mb-3">
          Stato di validazione advisor per ciascun servizio del partner. L&apos;advisor assegnato da KORA
          revisiona l&apos;idoneità metodologica e la qualità dell&apos;evidenza — non il contenuto individuale.
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Servizio</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Pillar</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Stato validazione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PARTNER_SERVICES.map((svc) => {
                const vb = VALIDATION_BADGE[svc.advisor_validation];
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
        <p className="mt-2 text-[11px] text-slate-400">
          La validazione advisor abilita il servizio all&apos;attivazione KORA. In assenza di validazione,
          il servizio genera evidenza a reliability ridotta (EV corretto automaticamente dal motore di scoring).
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
            'Solo conteggi aggregati sopra soglia privacy (≥10 lavoratori)',
            'Nessun dato aziendale confidenziale fuori dal perimetro assegnato',
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
