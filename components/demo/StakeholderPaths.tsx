'use client';

import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import type { KoraRole } from '@/lib/types';

interface ScreenLink { label: string; href: string }

interface StakeholderCard {
  id: string;
  roleLabel: string;
  koraRole: KoraRole;
  firstRoute: string;
  goal: string;
  keyMessage: string;
  keyScreens: ScreenLink[];
  talkingPoints: string[];
  accent: { border: string; badge: string; btn: string };
}

const STAKEHOLDER_CARDS: StakeholderCard[] = [
  {
    id: 'ceo',
    roleLabel: 'CEO / Direzione',
    koraRole: 'COMPANY_ADMIN',
    firstRoute: '/company',
    goal: "Capire se l'organizzazione sta trasformando azioni reali in valore umano misurabile.",
    keyMessage: "KORA mostra il livello di attivazione organizzativa, la qualità dell'evidenza e le priorità direzionali.",
    keyScreens: [
      { label: 'Executive Cockpit', href: '/company' },
      { label: 'KORA Index', href: '/company/kora-index' },
      { label: 'Activation Debt', href: '/company/activation' },
      { label: 'Report & Board Pack', href: '/company/reports' },
    ],
    talkingPoints: [
      "Il KORA Index misura l'attivazione aggregata su 10 componenti — non il benessere individuale.",
      "L'Activation Safeguard segnala se la partecipazione è sufficiente a rendere l'output interpretabile.",
      "Il Confidence Score mostra quanto sono affidabili le evidenze sottostanti.",
      "L'Activation Debt rivela la maggioranza silenziosa: chi non è ancora attivato.",
      "KORA non valuta singoli lavoratori — è intelligence organizzativa, non sorveglianza.",
    ],
    accent: {
      border: 'border-indigo-200 hover:border-indigo-400',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      btn: 'bg-indigo-700 hover:bg-indigo-800 text-white',
    },
  },
  {
    id: 'chro',
    roleLabel: 'CHRO / HR Director',
    koraRole: 'COMPANY_ADMIN',
    firstRoute: '/company/activation',
    goal: "Leggere partecipazione, continuità, equità, debito di attivazione e worker trust.",
    keyMessage: "KORA aiuta HR a capire chi resta fuori dall'attivazione, senza sorvegliare individui.",
    keyScreens: [
      { label: 'Activation Debt', href: '/company/activation' },
      { label: 'KORA Index', href: '/company/kora-index' },
      { label: 'My KORA (lavoratore)', href: '/my-kora' },
      { label: 'Report & Board Pack', href: '/company/reports' },
    ],
    talkingPoints: [
      "EQ (Equity) misura se l'attivazione è distribuita equamente tra reparti e segmenti — senza dati individuali.",
      "MAR (Meaningful Activation Rate) distingue la partecipazione nominale da quella sostanziale.",
      "L'Activation Debt identifica reparti o sedi con bassa copertura, prioritizzando gli interventi.",
      "CO (Continuity) mostra se l'engagement è sostenuto nel tempo o puntuale.",
      "Il lavoratore mantiene il proprio layer personale (PIB, Dynamic CV) — non visibile ad HR.",
    ],
    accent: {
      border: 'border-blue-200 hover:border-blue-400',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      btn: 'bg-blue-700 hover:bg-blue-800 text-white',
    },
  },
  {
    id: 'cfo',
    roleLabel: 'CFO',
    koraRole: 'COMPANY_ADMIN',
    firstRoute: '/company/financial',
    goal: "Collegare budget people/welfare/training a activation debt, Impact Units e priorità di investimento.",
    keyMessage: "KORA rende visibile il rapporto tra spesa, attivazione e valore direzionale, senza claim di ROI garantito.",
    keyScreens: [
      { label: 'Financial Governance', href: '/company/financial' },
      { label: 'Activation Debt', href: '/company/activation' },
      { label: 'Report & Board Pack', href: '/company/reports' },
    ],
    talkingPoints: [
      "KORA mostra budget allocato per pillar vs. Impact Units prodotte — non è contabilità, è allineamento.",
      "Il costo per IU è un indicatore informativo, non una metrica di performance certificata.",
      "L'Activation Debt stima il valore di attivazione non realizzato — dati sintetici demo.",
      "Nessun claim di ROI garantito: KORA è intelligence diagnostica, non previsione finanziaria.",
      "La vista Financial Governance è separata dal calcolo del KORA Index.",
    ],
    accent: {
      border: 'border-emerald-200 hover:border-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      btn: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    },
  },
  {
    id: 'esg',
    roleLabel: 'ESG / Sustainability Lead',
    koraRole: 'COMPANY_ADMIN',
    firstRoute: '/company/reports',
    goal: "Organizzare evidenze people utili a reporting, CSR/ESG narrative e stakeholder communication.",
    keyMessage: "KORA supporta evidenze people strutturate e spiegabili, ma non garantisce compliance normativa.",
    keyScreens: [
      { label: 'Report & Board Pack', href: '/company/reports' },
      { label: 'Dati & Evidenze', href: '/company/data' },
      { label: 'Activation Debt', href: '/company/activation' },
      { label: 'Future Vision', href: '/future-vision' },
    ],
    talkingPoints: [
      "KORA organizza evidenze people/social verificate per pillar IMPACT e LEGACY — utili a reporting CSR/ESG.",
      "Il Verification Rate (VR) misura la quota di attività supportata da evidenze verificate o parziali.",
      "Nessuna compliance CSRD/ESRS garantita — KORA è supporto alle evidenze, non motore regolatorio.",
      "La Future Vision mostra moduli post-pilot: Public KORA Snapshot e Value Chain territoriale.",
      "Il disclaimer CSR/ESG è obbligatorio su ogni output che tocca ESG.",
    ],
    accent: {
      border: 'border-teal-200 hover:border-teal-400',
      badge: 'bg-teal-50 text-teal-700 border-teal-200',
      btn: 'bg-teal-700 hover:bg-teal-800 text-white',
    },
  },
  {
    id: 'worker',
    roleLabel: 'Rappresentante Lavoratori',
    koraRole: 'WORKER',
    firstRoute: '/my-kora',
    goal: "Verificare che il lavoratore abbia valore personale e privacy, non sorveglianza.",
    keyMessage: "Il PIB individuale, la timeline personale e il Dynamic Impact CV restano nel layer personale del lavoratore.",
    keyScreens: [
      { label: 'My KORA Home', href: '/my-kora' },
      { label: 'Privacy & Condivisione', href: '/my-kora/privacy' },
    ],
    talkingPoints: [
      "Il PIB (Personal Impact Balance) è privato del lavoratore — non è mai visibile al datore di lavoro.",
      "Il Dynamic Impact CV appartiene al lavoratore e viene condiviso solo con consenso esplicito.",
      "L'azienda vede solo dati aggregati sopra soglia (≥10 lavoratori) — nessun identificatore individuale.",
      "KORA non classifica, non rankifica e non sorveglia i singoli lavoratori.",
      "Il layer My KORA è separato architetturalmente dallo spazio aziendale.",
    ],
    accent: {
      border: 'border-violet-200 hover:border-violet-400',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
      btn: 'bg-violet-700 hover:bg-violet-800 text-white',
    },
  },
  {
    id: 'partner',
    roleLabel: 'Partner',
    koraRole: 'PARTNER',
    firstRoute: '/partner',
    goal: "Capire il ruolo operativo del partner nella pipeline KORA.",
    keyMessage: "Il partner abilita azioni verificabili, opera su coorti aggregate e protocolli evidenze, non vende in un marketplace.",
    keyScreens: [
      { label: 'Workspace Partner', href: '/partner' },
    ],
    talkingPoints: [
      "Il partner abilita azioni verificabili nel perimetro KORA — non gestisce un marketplace.",
      "L'Evidence Protocol Review definisce il protocollo evidenze per tipo di servizio del partner.",
      "Il partner vede solo coorti aggregate — nessun nominativo, email o ID lavoratore.",
      "Il Trust Ledger registra lo storico audit e l'acceptance rate del partner.",
      "Le richieste di attivazione sono aggregate-only — nessun KORA Index aziendale visibile al partner.",
    ],
    accent: {
      border: 'border-amber-200 hover:border-amber-400',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      btn: 'bg-amber-700 hover:bg-amber-800 text-white',
    },
  },
  {
    id: 'advisor',
    roleLabel: 'Advisor',
    koraRole: 'ADVISOR',
    firstRoute: '/advisor',
    goal: "Capire il ruolo di audit processo, Evidence Protocol Review e Trust Ledger.",
    keyMessage: "L'Advisor non valida ogni azione: audita il processo, monitora periodicamente e gestisce sample check / re-review.",
    keyScreens: [
      { label: 'Workspace Advisor', href: '/advisor' },
      { label: 'Workspace Partner', href: '/partner' },
    ],
    talkingPoints: [
      "L'Advisor esegue un Advisor Process Audit del processo e del protocollo evidenze — non valida ogni singola azione.",
      "Evidence Protocol Review: revisione del protocollo per tipo di servizio partner.",
      "Monitoraggio periodico e sample check: l'Advisor può riaprire la review in caso di eccezioni.",
      "Advisor-reviewed non equivale a KORA Certified — la certificazione è un livello futuro, non attivo.",
      "L'Advisor accede solo al perimetro assegnato — nessun PIB, nessuna timeline personale del lavoratore.",
    ],
    accent: {
      border: 'border-orange-200 hover:border-orange-400',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      btn: 'bg-orange-700 hover:bg-orange-800 text-white',
    },
  },
  {
    id: 'investor',
    roleLabel: 'Investor / CTO Reviewer',
    koraRole: 'COMPANY_ADMIN',
    firstRoute: '/demo-guide',
    goal: "Valutare architettura, metodologia, privacy, estensibilità e readiness tecnica.",
    keyMessage: "KORA è una piattaforma metodologica, non una dashboard: pipeline, privacy architecture, explainability e confidence sono parte del prodotto.",
    keyScreens: [
      { label: 'Demo Guide', href: '/demo-guide' },
      { label: 'KORA Index Detail', href: '/company/kora-index' },
      { label: 'Dati & Evidenze', href: '/company/data' },
      { label: 'Report & Board Pack', href: '/company/reports' },
      { label: 'Future Vision', href: '/future-vision' },
    ],
    talkingPoints: [
      "Pipeline 14-stage: Ingestion → Privacy → UEF → NM → BC → AGF → IU → PIB → Aggregation → Safeguard → KORA Index.",
      "Privacy architecture: aggregation threshold ≥10, pseudonymization, role-based access, employer-worker separation.",
      "Explainability nativa: ogni output include Confidence Score, methodology_version_id, calibration_status.",
      "Gate architecture: Gate 2 (CTO) blocca SQL/Prisma/Supabase; Gate 3 blocca live data; Gate 5 blocca fiscal output.",
      "Foundation Light è pre-calibrazione empirica (Delphi Study post-pilot) — methodology v0.1 pesi provvisori.",
    ],
    accent: {
      border: 'border-slate-300 hover:border-slate-500',
      badge: 'bg-slate-100 text-slate-600 border-slate-200',
      btn: 'bg-slate-800 hover:bg-slate-900 text-white',
    },
  },
];

export function StakeholderPaths() {
  const { setRole } = useRole();
  const router = useRouter();

  function handleOpen(koraRole: KoraRole, firstRoute: string) {
    setRole(koraRole);
    router.push(firstRoute);
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Percorsi demo per stakeholder
        </h2>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
          KORA Foundation Light può essere esplorata da diversi punti di vista: strategia, HR, finance, ESG,
          lavoratori, partner, advisor e tecnologia.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {STAKEHOLDER_CARDS.map((card) => (
          <div
            key={card.id}
            className={`rounded-lg border bg-white p-5 space-y-3 transition-shadow hover:shadow-sm ${card.accent.border}`}
          >
            <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${card.accent.badge}`}>
              {card.roleLabel}
            </span>

            <p className="text-sm font-medium text-slate-700 leading-snug">{card.goal}</p>

            <div className="flex flex-wrap gap-1">
              {card.keyScreens.map((s) => (
                <span key={s.href} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                  {s.label}
                </span>
              ))}
            </div>

            <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2 text-xs text-slate-600 leading-relaxed italic">
              {card.keyMessage}
            </div>

            <ul className="space-y-1">
              {card.talkingPoints.map((pt) => (
                <li key={pt} className="flex gap-1.5 text-xs text-slate-500">
                  <span className="text-slate-300 shrink-0 mt-0.5">·</span>
                  {pt}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleOpen(card.koraRole, card.firstRoute)}
              className={`w-full rounded-md px-3 py-2 text-xs font-semibold transition-colors ${card.accent.btn}`}
            >
              Apri percorso — {card.roleLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
