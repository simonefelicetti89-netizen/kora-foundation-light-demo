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
