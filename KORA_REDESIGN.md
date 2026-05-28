KORA — Product, UX & Implementation Master Document
Versione 2.0 · Documento unico di riferimento
Destinatari: il founder (Simone), ChatGPT (genera roadmap + prompt), Claude Code (esegue), Next / freelance (costruiscono).

Come usare questo documento (per ChatGPT): vedi PARTE VII in fondo. In sintesi: questo è la fonte di verità. Da qui derivi una roadmap a sprint e scrivi prompt atomici per Claude Code. Ogni prompt deve ancorarsi a KORA_DOCTRINE.md (principi non-negoziabili) e a una fase di questo documento. Non inventare architettura: implementa questa.


Modello operativo confermato: KORA è service-assisted. L'azienda invia i file a KORA; KORA li carica e opera l'intera pipeline (intake → ingestion → eligibility → UEF review → scoring → Decision Pack); l'azienda consuma solo l'output. Per i prossimi 12-18 mesi non esiste self-service cliente.


INDICE
PARTE I — Visione & Architettura

Diagnosi
Principio organizzatore: 3 Ambienti × Ruoli
I 3 Ambienti
I Ruoli
KORA HQ (Founder & Investor Console)
Information Architecture (sitemap)
Data Lineage
Navigazione

PARTE II — Design System (graficamente unico)
9. Direzione estetica
10. Design tokens (colori, tipografia, spacing, radius, ombre)
11. Componenti canonici (specifiche)
12. Pattern di layout
PARTE III — Architettura tecnica & Data Model
13. Stack e struttura cartelle
14. Data model (tipi TypeScript)
15. Gestione ambiente / ruolo / scenario (state)
PARTE IV — KORA Engine
16. Moduli engine e contratti
PARTE V — Roadmap di implementazione eseguibile
17. Le 8 fasi con obiettivi, file, acceptance criteria
PARTE VI — Definizione di "vendibile e accettabile"
18. Quality bar e checklist finale
PARTE VII — Istruzioni operative per ChatGPT

PARTE I — VISIONE & ARCHITETTURA
1. Diagnosi
Il prototipo attuale ha ~30 pagine in un nav piatto indifferenziato: stesso peso visivo, stesso nav, stessa identità. Chi guarda non sa dove si trova, chi è, se è simulato o reale, dove finiscono i dati. Causa radice: tre mondi diversi convivono senza confini (vetrina commerciale / piattaforma operativa / visione futura). Ogni aggiunta locale aumenta la dispersività. La cura non è sistemare le pagine: è costruire i confini e dichiarare il modello operativo (service-assisted).
2. Principio organizzatore: 3 Ambienti × Ruoli
Una sola piattaforma, due assi di navigazione:

Asse 1 — Ambiente (selettore in cima): DEMO (simulato) · LIVE (reale) · FUTURE (roadmap)
Asse 2 — Ruolo (dentro Demo e Live): Operator · Company · Worker · Partner · Advisor

Cambiare ambiente cambia l'identità cromatica di tutta l'interfaccia. Cambiare ruolo cambia la sidebar e le pagine accessibili.
3. I 3 Ambienti
DEMO (simulato — accento ambra): due aziende complete, Meridiana Group (manifatturiero, 250 lav.) e NovaCare Services (servizi professionali, 420 lav.), con scenari S1/S2. Pipeline visibile end-to-end su dati sintetici. Watermark discreto "DEMO · DATI SIMULATI". Scopo: spiegare e vendere.
LIVE (reale — primario navy): piattaforma pulita, nessun dato precaricato. Operator crea aziende, carica i file ricevuti dal cliente, opera la pipeline. Pagine vuote mostrano stato insufficient_data, mai numeri finti. Scopo: erogare il servizio e fatturare. Stesso codice della Demo: cambia solo tenant.type e la sorgente dati.
FUTURE (roadmap — blueprint desaturato): tutto ciò che KORA sarà, come roadmap a fasi con dipendenze. Label "ROADMAP · NON ATTIVO". Scopo: pitch a investor/partner. Mai confuso con ciò che il cliente compra oggi.
4. I Ruoli
KORA OPERATOR (il team KORA): opera tutto. KORA HQ, Portfolio, creazione azienda, workforce baseline, data intake, AI ingestion, UEF review, scoring, index registry, benchmarks, network. È il banco di lavoro.
COMPANY ADMIN (cliente): consuma output. Cockpit, KORA Index, Activation & Debt, Pillars, Financial/BTI, Shared View, Decision Pack, Onboarding status (read-only). Non vede pipeline, altre aziende, KORA HQ. Nella v1 può essere anche solo report read-only senza login attivo.
COMPANY VIEWER: come Company Admin, sola lettura.
WORKER: solo My KORA (PIB privato, Dynamic Impact CV, Consent Vault). Nessuna gamification.
PARTNER: solo coorti aggregate sopra soglia N≥10. Mai nomi.
ADVISOR: coda review evidenze, validazione, audit trail.
5. KORA HQ — Founder & Investor Console
Dove: Live → Operator → "HQ". Chi: solo team KORA. Mai in Demo, mai a ruoli non-Operator. Contiene dati sensibili (prospect, deal, runway).
Sei aree:

5.1 GTM Pipeline (CRM): funnel a 8 stati (Lead → Contattata → Discovery → Pilot Proposto → Negoziazione → Pilot Attivo → Cliente → Persa); per azienda: settore, n. dipendenti, referente, fonte, pacchetto, valore, probabilità, pipeline pesata, date, note. Vista kanban + tabella. Oggi esiste come Excel standalone; migra dentro KORA dopo Fase 2.
5.2 Revenue & Contracts: pilot attivi, revenue contrattualizzata/incassata, ACV per pacchetto, fatturato per periodo, ARR proiettato.
5.3 Funnel & Sales Efficiency: conversion per stadio, sales cycle, win rate, pipeline pesata, velocity.
5.4 Market & Growth: aziende contattate/mese, crescita MoM, TAM/SAM/SOM, pipeline per settore/fonte.
5.5 Product & Methodology KPIs: aziende con Index calcolato, pilot completati, record processati, calibration status, tempo medio delivery, n. partner/advisor.
5.6 Investor Cockpit: one-screen aggregato (traction, crescita, efficienza, prodotto, mercato, narrativa).

Non mettere ancora: CAC, LTV, churn, burn multiple (rumore con <8-10 clienti). Verità: KORA HQ registra la traction, non la crea. Excel oggi, modulo dopo Fase 2, Investor Cockpit completo a 8-10 clienti.
6. Information Architecture (sitemap)
KORA
├── 🟡 DEMO (ambra)
│   ├── Operator: Portfolio Demo · Pipeline Meridiana (ingestion→UEF→scoring) · Pipeline NovaCare
│   ├── Company (Meridiana / NovaCare): Cockpit · Index · Activation · Pillars · Financial · Shared · Decision Pack
│   ├── Worker: My KORA (PIB, CV, Consent)
│   ├── Partner: coorti aggregate
│   └── Advisor: review queue
│
├── 🔵 LIVE (navy)
│   ├── Operator Console
│   │   ├── ★ KORA HQ (GTM · Revenue · Funnel · Market · Product KPI · Investor) [solo Operator]
│   │   ├── Portfolio (tutte le aziende reali)
│   │   ├── + Nuova Azienda → Setup · Workforce Baseline · Data Intake
│   │   ├── AI Ingestion (eligibility gate)
│   │   ├── UEF Review (revisione umana)
│   │   ├── Scoring (calcolo Index)
│   │   ├── Index Registry (versionato, tutte le aziende)
│   │   ├── Benchmarks (cross-azienda + settore)
│   │   └── Network (partner + advisor)
│   ├── Company Workspace: Cockpit · Index · Activation · Pillars · Financial · Shared · Decision Pack · Onboarding status (read-only)
│   ├── Worker: My KORA
│   ├── Partner: coorti
│   └── Advisor: review
│
├── 🔘 FUTURE (blueprint)
│   ├── Fase 1 — Pilot Calibration (Delphi, methodology v1.0)
│   ├── Fase 2 — Ecosystem (KORA Link, Marketplace, Academy, Certification)
│   └── Fase 3 — Worker-Owned (Wallet, Territorial Maps, Value Chain)
│
└── 🌐 VETRINA (pubblica)
    ├── Landing · Demo Guide · Foundation Light Pilot (offerta + pricing)
Regola: intake/ingestion/UEF/scoring/baseline stanno SOLO in Operator Console. KORA HQ sta SOLO in Live→Operator.
7. Data Lineage — il filo del dato
Vista che segue un singolo record per tutto il viaggio:
"Rimborso asilo nido 2025"
 ① Caricato (Data Intake, fonte hr.xlsx) → ② Classificato (Eligible, LIFE) →
 ③ Revisionato (UEF Review, approvato) → ④ Computato (IU Engine, 0.84 IU, trace) →
 ⑤ Aggregato (privacy N≥10, pillar LIFE) → ⑥ Contribuito (Index, REACH +0.3) →
 ⑦ Visibile (Cockpit, parte del 34/100)
Cliccabile in entrambe le direzioni. Trasforma KORA da scatola nera a sistema tracciabile. È il più forte argomento di vendita verso un CFO. Completo in Operator Console; semplificato (fino alle categorie, non ai record) nel Company Index detail.
8. Navigazione
Top bar: [KORA] [DEMO|LIVE|FUTURE] ··· [Ruolo ▾] [Scenario S1|S2 ▾ (solo Demo)]. Environment switcher dominante a sinistra (cambia colore UI). Role switcher esplicito a destra. Scenario solo in Demo.
Sidebar contestuale: cambia per ambiente+ruolo. Mai più di 5-9 voci. Mai 30 insieme.

PARTE II — DESIGN SYSTEM (graficamente unico)
9. Direzione estetica
KORA deve sembrare infrastruttura finanziaria-grade: calma, densa, executive, affidabile. Riferimenti: Stripe (governance editoriale), Linear (precisione gerarchica), Mercury / Sigma Computing (dati seri ma calmi). Mai: HR software colorato, wellness app, dashboard SaaS generica, "feel-good" corporate.
La firma visiva unica di KORA (ciò che la rende riconoscibile): tutti i numeri e i dati sono in font monospace, su uno sfondo chiaro e arioso, con tipografia di testo Inter molto pulita. Questo "numeri in mono" è il pattern dei prodotti finanziari seri (Mercury, Ramp, Linear) e dà a KORA un'identità immediata e credibile senza essere appariscente. Accenti cromatici parsimoniosi. Molto spazio bianco. Gerarchia tipografica forte.
10. Design tokens

Implementare come CSS variables + Tailwind theme extension. Valori indicativi, calibrabili, ma la struttura è questa.

Colori — base (ambiente LIVE / default)
--ink:            #0F1729   /* testo primario */
--ink-soft:       #344256   /* testo secondario */
--muted:          #6B7A90   /* testo terziario, label */
--navy:           #1B2A4A   /* brand primario, sidebar */
--navy-deep:      #111B30   /* sidebar bg scuro */
--blue:           #2B5CE6   /* azione, link, focus */
--blue-soft:      #EAF0FE   /* bg azione tenue */
--surface:        #F7F8FA   /* sfondo pagina */
--surface-card:   #FFFFFF   /* card */
--border:         #E3E7ED   /* bordi */
--border-strong:  #CBD2DC
Colori — per ambiente (l'accento cambia tutta l'UI)
DEMO   --env-accent: #B8843A (ambra)   --env-soft: #FBF3E6   watermark "DEMO · SIMULATO"
LIVE   --env-accent: #2B5CE6 (blu)     --env-soft: #EAF0FE   nessun watermark
FUTURE --env-accent: #6B7A92 (slate)   --env-soft: #EEF1F5   label "ROADMAP · NON ATTIVO"
Colori — semantici (sobri, profondi)
--clear:   #1E7A46  (verde)   bg #E7F4EC   → Safeguard CLEAR, Eligible
--warning: #B26A00  (ambra)   bg #FBF1E0   → Safeguard WARNING, Limited
--danger:  #B42318  (rosso)   bg #FBEAE8   → Safeguard FLAGGED, Blocked
--neutral: #5B6B82  (grigio)  bg #F0F2F5
Colori — Pillar (5, distinti ma armonici)
LIFE:       #2E9E8F  (verde-acqua)
GROWTH:     #6457C7  (indaco)
CONNECTION: #D9663F  (corallo)
IMPACT:     #C9962B  (oro)
LEGACY:     #3E5C8A  (blu-ardesia)
Tipografia
Font UI/testo:   "Inter", system-ui, sans-serif
Font dati/numeri: "JetBrains Mono", "Geist Mono", monospace   ← firma KORA
Scala (px):
  display  52 / 600 / tracking -0.02em   (KORA Index hero)
  h1       30 / 600
  h2       22 / 600
  h3       17 / 600
  body     14 / 400                       (executive density: 14, non 16)
  small    12.5 / 400
  micro    11 / 500 / uppercase / tracking 0.04em  (label, badge)
Numeri/KPI: sempre font mono, tabular-nums.
Spacing (scala 4px)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
Gutter pagina: 32. Gap card: 16-24. Padding card: 20-24.
Radius & ombre (sobri)
--radius-sm: 6px    (chip, badge, input)
--radius-md: 10px   (card)
--radius-lg: 14px   (hero, modali)
--shadow-1: 0 1px 2px rgba(16,23,41,.05)
--shadow-2: 0 4px 12px rgba(16,23,41,.08)   (solo hover/elevati)
Niente ombre pesanti. Preferire bordi sottili a ombre.
11. Componenti canonici (specifiche)
Costruire una volta, usare ovunque. Ogni informazione che appare in due posti usa lo stesso componente.

EnvironmentBadge — pill in top bar; colore = env-accent; testo "DEMO/LIVE/FUTURE".
RoleBadge / RoleSwitcher — dropdown esplicito; mostra ruolo attivo con icona e label piena.
ScenarioSwitcher — segmented control S1|S2; visibile SOLO in Demo.
KoraIndexHero — score in display mono (es. 34), /100 muted; sotto: SafeguardBadge + ConfidenceChip + methodology line (KORA-METHOD-v0.1.0 · pre-empirical). Lo score è il primo elemento, dominante.
MacroblockCard — nome, peso (es. 25%), valore mono, mini-barra, driver, opportunità. 4 istanze identiche (REACH/QUALITY/EQUITY/BTI).
ComponentRow — riga dei 10 componenti analitici: sigla, nome, valore mono, micro-barra.
ConfidenceChip — sempre con etichetta ESTERNO · peso 0. Mai stilizzato come componente dell'Index.
SafeguardBadge — CLEAR | WARNING | FLAGGED con colore semantico; mostra soglie AR/MAR in tooltip.
EligibilityChip — Eligible | Limited | Blocked con colore fisso (verde/ambra/rosso).
PillarTag — icona + colore pillar; uno dei 5.
KpiTile — label micro uppercase + valore display mono + delta opzionale. Per Cockpit e KORA HQ.
DataTable — stile tabella unico: header su --surface, righe con bordo sottile, numeri mono tabular allineati a destra. Tutte le tabelle usano questo.
LineageTrail — i 7 step del data lineage, verticale, cliccabile.
MethodologyNote — UNA per pagina, in fondo, max 3 bullet. Mai ripetuta nelle sezioni.
EmptyState — per Live senza dati: icona, "Dati non sufficienti", checklist di cosa manca, CTA. Mai numeri finti.
EnvironmentBanner — banner orizzontale sticky (non giallo invadente): Demo = "Dati dimostrativi · il pilot reale usa i tuoi dati"; Live = nessuno o "Beta".
FunnelBoard / PipelineTable / InvestorSummaryCard — per KORA HQ.

Regola progressive disclosure: ogni pagina = Titolo (1 numero che conta) → Contesto (3-4 numeri) → Dettaglio (collassabile). Executive vede il punto in 3 secondi.
12. Pattern di layout

App shell: sidebar fissa a sinistra (navy-deep, 240px) + top bar (56px) + content area (max-width 1200-1280px, gutter 32, sfondo --surface).
Sidebar: logo in alto, environment switcher subito sotto, nav contestuale, ruolo/utente in basso.
Card grid: 12 colonne; KPI in righe da 3-4; dettagli in 1-2 colonne.
Densità: alta ma respirata. Mai muri di testo. Numeri grandi, label piccole.


PARTE III — ARCHITETTURA TECNICA & DATA MODEL
13. Stack e struttura cartelle
Stack confermato: Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui. Nessun DB ora (seed in file). Nessuna auth ora (role/env via context). Engine in TypeScript puro. Charts: Recharts o equivalente. Persistenza reale (Supabase/Prisma) rinviata a quando si passa a MVP cliente vero.
/app
  /(public)                 landing, demo-guide, pilot
  /demo                     ambiente DEMO (route group)
    /[role]/...             operator | company | worker | partner | advisor
  /live                     ambiente LIVE
    /operator/...           console + HQ + pipeline
    /company/...            workspace cliente
    /worker /partner /advisor
  /future                   roadmap
/components
  /ui                       shadcn base
  /kora                     componenti canonici (sez. 11)
/lib
  /demo/demo-tenants.ts     TUTTI i seed (Meridiana, NovaCare)
  /kora-engine/             moduli engine (PARTE IV)
  /types/                   tipi dominio (sez. 14)
  /env/                     environment + role + scenario context
/config
  bcm-taxonomy-v0.1.json    classificazione eligibility
/docs
  KORA_DOCTRINE.md
  KORA_REDESIGN.md          (questo file)
Principio: nessun numero hardcoded nei componenti. Tutto viene da lib/demo/demo-tenants.ts (per Demo) o dall'engine (per Live). Un solo source of truth per i numeri.
14. Data model (tipi TypeScript)
typescripttype Environment = "demo" | "live" | "future";
type Role = "operator" | "company" | "worker" | "partner" | "advisor";
type Scenario = "S1" | "S2";

interface Tenant {
  id: string;
  name: string;
  type: "demo" | "real";
  sector: string;
  totalWorkers: number;
  country: string;
  fiscalYear: number;
  dataMode: "synthetic_seed" | "uploaded_data";
  scoringMode: "seeded_demo" | "computed" | "insufficient_data";
}

interface WorkforceBaseline {
  tenantId: string;
  totalWorkers: number;
  departments: { name: string; pct: number; workers: number; AR?: number }[];
  sites: { name: string; pct: number; workers: number }[];
  privacyThreshold: number; // default 10
}

interface ScenarioData {            // per scenario S1/S2 di un demo tenant
  koraIndex: number;
  confidenceScore: number;          // esterno, peso 0
  safeguard: "CLEAR" | "WARNING" | "FLAGGED";
  components: Record<string, number>; // AR, MAR, NI, VR, CO, WB, PC, PB, EQ
  macroblocks: { reach: number; quality: number; equity: number; bti: number };
  pillarShare: Record<"LIFE"|"GROWTH"|"CONNECTION"|"IMPACT"|"LEGACY", number>;
  workerConcentration: { topPct: number; topShare: number; bottomPct: number; bottomShare: number };
  budget: { total: number; used: number; deepActivation: number; economicRelief: number; activationDebt: number; costPerIU: number };
  eligibility: { eligible: number; limited: number; blocked: number };
}

interface DemoTenant extends Tenant {
  workforce: WorkforceBaseline;
  scenarios: { S1: ScenarioData; S2: ScenarioData };
  initiatives: Initiative[];
}

// Real-tenant pipeline entities
interface RawRecord { id; tenantId; sourceId; rawPayload; detectedCategory?; detectedPillar?; mappingConfidence?; reviewStatus: "pending"|"approved"|"rejected"; }
interface EligibilityClassification { recordId; status: "Eligible"|"Limited"|"Blocked"; reason; pillar?; }
interface UEFRecord { id; tenantId; sourceRecordId; pillar; eventType; duration?; intensity?; evidenceTier; verificationStatus; eligibilityStatus; }
interface ImpactUnitRecord { id; tenantId; uefRecordId; pillar; iuValue; calculationTrace: Record<string,number>; }
interface KoraIndexResult { tenantId; period; koraIndex; macroblocks; components; confidenceScore; safeguard; scoringMode; methodologyVersion; calculationTrace; }
15. Gestione ambiente / ruolo / scenario (state)

EnvironmentProvider (React context): tiene environment, role, scenario. Espone setter. Avvolge l'app.
Environment determina il tema (CSS var --env-accent), il watermark, e quale set di tenant è disponibile (demo seed vs real).
Scenario rilevante solo in Demo; in Live è ignorato (i dati reali non hanno scenari).
Tutte le pagine leggono da context, mai valori hardcoded. Un componente <KoraIndexHero> riceve i dati derivati dal tenant+scenario correnti.
Routing: l'ambiente è nel path (/demo/..., /live/..., /future). Il ruolo è nel path sotto l'ambiente. Lo scenario è uno stato UI (context), non nel path.


PARTE IV — KORA ENGINE
16. Moduli engine e contratti
In lib/kora-engine/, pure functions, ogni output con calculationTrace. In Demo l'engine può girare sui seed per derivare i numeri (così i numeri sono computati, non hardcoded, e matchano i valori canonici). In Live gira sui dati caricati.
eligibility-gate.ts   classifyEligibility(raw): EligibilityClassification
                       Blocked: compliance D.Lgs81/DVR/DPI/231/sorv.sanitaria/privacy
                       Limited: buoni pasto/fuel/gift/fringe/voucher
                       Eligible: childcare/caregiving/mental health/upskilling/...

uef-mapper.ts          mapRawToUEF(raw, elig): UEFRecord | null   (null se Blocked)

iu-engine.ts           calculateIU(uef): ImpactUnitRecord
                       IU = NM × BC × ES × EF × CQ × CF × RF × SF
                       ogni fattore salvato in calculationTrace (no black box)

privacy-aggregator.ts  aggregate(iu[], baseline, threshold=10)
                       sopprime gruppi < soglia; mai PIB individuale all'azienda

bti-engine.ts          calculateBTI(budget, iuAgg): BTIResult
                       raw budget NON entra nell'Index; BTI score = macroblocco 20%

confidence-engine.ts   calculateConfidence(inputs): number   (esterno, peso 0)
                       da: source completeness, mapping confidence, evidence quality,
                       verification coverage, privacy suppression, review status

safeguard-engine.ts    calculateSafeguard(AR, MAR): "CLEAR"|"WARNING"|"FLAGGED"
                       CLEAR: AR≥40 AND MAR≥30; FLAGGED: AR<20 OR MAR<10; else WARNING
                       gate interpretativo, NON componente di scoring

kora-index-engine.ts   calculateKoraIndex(inputs): KoraIndexResult
                       macroblocchi: REACH 25% · QUALITY 30% · EQUITY 25% · BTI 20%
                       Confidence escluso (peso 0). Safeguard escluso (gate).
Verifica engine (acceptance): dato il seed Meridiana, l'engine deve produrre S1 = Index 34, Safeguard WARNING, macroblocchi 30/37/40/28. Se non torna, l'engine è sbagliato (i numeri canonici vincono).

PARTE V — ROADMAP DI IMPLEMENTAZIONE ESEGUIBILE
Otto fasi. Ogni fase: obiettivo unico, file principali, criteri di accettazione (definizione di "done"). Non si passa alla fase successiva finché i criteri non sono soddisfatti. ChatGPT genera 1 o più prompt atomici per fase.
FASE 0 — Audit read-only
Obiettivo: mappare il repo, trovare dove vivono i numeri, identificare gli hardcoded incoerenti. Nessuna modifica.
Output: SPRINT_0_AUDIT.md (stack, mappa cartelle, caccia ai numeri canonici/anomali, scenario state, mappa per pagina, open questions).
Done quando: esiste il report e sappiamo dove sono i numeri.
FASE 1 — Fix coerenza numerica
Obiettivo: chiudere i bug numerici. La demo deve essere internamente coerente.
Bug: workforce sedi 560→250 (Milano 100, Bergamo 90, Torino 35, Remoto 25); Activation Debt 84k→45k; worker concentration 10%/61%→12%/64%; version history 57.4/62.8→34/54; pillar LIFE 62% (batch) vs 44% (canonico) da separare; ingestion 312/350→250; Decision Pack stato "Pronto+Bloccato" da unificare.
File: lib/demo/demo-tenants.ts (centralizzazione seed), pagine che hardcodano.
Done quando: nessun numero anomalo nel repo; ogni pagina legge dal seed centrale; aprendo le 13 pagine in S1 i numeri sono identici a KORA_DOCTRINE sez. 4.
FASE 2 — Architettura 3 ambienti
Obiettivo: introdurre Environment + Role + Scenario context; route group /demo /live /future; tema cromatico per ambiente; spostare intake/ingestion/UEF/scoring/baseline in Operator Console (fuori da Company).
File: lib/env/*, app/(demo|live|future)/*, EnvironmentProvider, EnvironmentBadge/Banner.
Done quando: l'environment switcher cambia path e colore UI; in Live→Company NON esistono pagine di pipeline; in Demo i numeri restano coerenti; scenario switcher appare solo in Demo.
FASE 3 — Operator Console + Portfolio + KORA HQ (light)
Obiettivo: vera console operatore. Portfolio su tutte le aziende (Index a colpo d'occhio), Index Registry, Benchmarks. KORA HQ con GTM Pipeline + KPI base (anche leggendo da un seed/JSON che rispecchia l'Excel).
Done quando: Operator vede tutte le aziende, non una; KORA HQ esiste solo in Live→Operator; nessun ruolo non-Operator può raggiungerlo.
FASE 4 — Sidebar contestuale + Role switcher
Obiettivo: nav che cambia per ambiente+ruolo; mai 30 voci; role switcher esplicito.
Done quando: ogni combinazione ambiente+ruolo mostra 5-9 voci pertinenti; impossibile vedere voci di un altro ruolo.
FASE 5 — Engine skeleton (numeri computati)
Obiettivo: lib/kora-engine/* deriva i numeri demo dai seed (eligibility, safeguard, index aggregator come minimo). I numeri restano canonici ma diventano computati.
Done quando: l'engine produce S1 Meridiana = 34/WARNING/30-37-40-28 dai dati grezzi del seed; calculationTrace visibile.
FASE 6 — Data Lineage
Obiettivo: vista del filo del dato (7 step), cliccabile bidirezionale, in Operator (completo) e Company (semplificato).
Done quando: da un record si arriva al contributo nell'Index e viceversa.
FASE 7 — Design system canonico + polish
Obiettivo: applicare tokens (sez. 10) e componenti (sez. 11) ovunque; numeri in mono; MethodologyNote unica; empty states; progressive disclosure; rimuovere disclaimer fatigue.
Done quando: tutte le pagine usano gli stessi componenti; un occhio esterno percepisce "una piattaforma unica", non pagine separate; estetica coerente con sez. 9.
FASE 8 — NovaCare + Live empty platform
Obiettivo: secondo tenant demo (NovaCare, servizi professionali, 420 lav., profilo pillar diverso); piattaforma Live pulita con creazione azienda reale + upload + stato insufficient_data + run engine.
Done quando: due demo coerenti e distinte; in Live si può creare un'azienda reale, caricare un CSV, e ottenere un Index computato (o insufficient_data se mancano dati).
Tempistica indicativa: Fasi 0-1 prima di qualsiasi vendita (irreprensibilità numerica); Fase 2 risolve ~70% della dispersività; dopo Fase 7 il prodotto è "graficamente unico e accettabile"; dopo Fase 8 è "piattaforma", non "demo".

PARTE VI — DEFINIZIONE DI "VENDIBILE E ACCETTABILE"
Un prodotto è vendibile/accettabile quando supera questa quality bar. Usala come checklist di accettazione finale.
Coerenza (Fase 1)

 Zero numeri anomali nel repo; ogni numero deriva da un'unica fonte.
 Le 13 pagine in S1 mostrano gli stessi numeri canonici.

Chiarezza strutturale (Fasi 2-4)

 Si capisce sempre: in quale ambiente sono, chi sono, se è simulato o reale.
 Demo (ambra) e Live (navy) sono visivamente inconfondibili.
 Il lavoro (intake/ingestion/UEF/scoring) è solo in Operator; il cliente vede solo output.
 KORA HQ è irraggiungibile da ruoli non-Operator e in Demo.
 Ogni schermata ha 5-9 voci nav, non 30.

Credibilità metodologica (Fasi 5-6)

 Confidence Score sempre marcato "esterno, peso 0".
 Compliance sempre Blocked (0 IU); economic relief sempre Limited.
 Esiste il Data Lineage: ogni numero è tracciabile fino al dato grezzo.

Identità visiva (Fase 7)

 Numeri in monospace ovunque; testo in Inter.
 Tutte le card/badge/tabelle usano i componenti canonici.
 Un disclaimer per pagina, non sei.
 L'estetica comunica "infrastruttura finanziaria", non "HR tool".

Completezza commerciale

 La pagina Pilot comunica offerta, pacchetti, prezzi, confini.
 La sequenza di presentazione (Demo→Operator→Live) funziona in 10 minuti.
 Due demo (Meridiana + NovaCare) dimostrano generalizzabilità.

Test finale: un CFO esterno naviga 5 minuti senza trovare contraddizioni numeriche; un freelance apre il repo e capisce l'architettura in mezza giornata leggendo i due .md.

PARTE VII — ISTRUZIONI OPERATIVE PER CHATGPT
Tuo compito: a partire da questo documento e da KORA_DOCTRINE.md, generare (a) una roadmap a sprint e (b) prompt atomici per Claude Code (Antigravity).
Regole per i prompt che scrivi:

Uno per volta, atomici. Ogni prompt = un obiettivo completabile e verificabile. Mai un mega-prompt che fa più fasi insieme. Simone preferisce prompt corti.
Ancora sempre ai documenti. Ogni prompt deve dire: "Leggi KORA_DOCTRINE.md e KORA_REDESIGN.md. Implementa la Fase N. Rispetta i vincoli." Claude Code ha i due file nel repo.
Rispetta l'ordine delle fasi. Non scrivere il prompt della Fase 5 prima che la 4 sia accettata. Fase 0 → 1 → 2 → … → 8.
Includi sempre i criteri di accettazione della fase (PARTE V) dentro il prompt, come "Done quando…". Così Claude Code sa quando ha finito e Simone sa cosa verificare.
Vincoli ricorrenti da ripetere in ogni prompt: non hardcodare numeri (usa il seed centrale); non violare la dottrina (Confidence esterno, compliance Blocked, no gamification, PIB privato); non mescolare demo e real; branch dedicato per fase (feature/sprint-N-...), mai commit diretti su main; audit/lettura prima di modifiche estese.
Output dei prompt: chiedi a Claude Code, a fine fase, un breve report (file toccati, cosa è computato vs mock, cosa manca, build/lint result) così Simone può portarlo a validazione.
Dopo ogni fase, fermati. Simone verifica (eventualmente con Claude in chat come quality gate) prima di procedere.

Sequenza che ti consiglio di produrre subito: prompt Fase 0 (audit) → attendere report → prompt Fase 1 (fix numerici, sui file reali emersi dall'audit) → attendere verifica → Fase 2, e così via.
Non fare: non proporre stack alternativi, non aggiungere feature non in questo documento, non anticipare self-service cliente (modello è service-assisted), non introdurre auth/DB prima della Fase 8 se non esplicitamente deciso.

Documenti collegati: KORA_DOCTRINE.md (principi non-negoziabili e numeri canonici), KORA_Sales_Tracker.xlsx (CRM operativo giorno 1).
Versione 2.0 — master document di implementazione.
Add KORA redesign master document
