# KORA Page Inventory — Fase 0 Audit
> Generato: 2026-06-04 · Aggiornato ad ogni fase di redesign

| Area | Route | Scopo (una frase) | Componenti chiave oggi | Problemi UX/Copy/Grafici | Priorità |
|---|---|---|---|---|---|
| **Public** | `/` | Landing pubblica: presenta KORA, anchor alle sezioni, CTA pilot | LandingMotion, KoraLogo, landing.module.css | Pillar color discrepancy (HTML vs token); nessun serif da rimuovere; CTA routes ok | P2 |
| **Public** | `/pilot` | Pagina pilot: costi, modalità, FAQ, form contatto mailto | pilot.module.css, ContactForm (useState) | Form senza feedback di successo; "Prenota call" rimosso senza sostituto; prezzi hardcoded (ora in packages.ts) | P2 |
| **Public** | `/demo-guide` | Guida navigabile della logica KORA per demo/onboarding | PageMasthead, SectionLabel, TOKENS | Copy ancora con vecchie label; nessun Explainer sulle metriche | P3 |
| **Public** | `/future-vision` | Roadmap architetturale in 4 fasi (static mockup, NON attivo) | PageMasthead, TM, TOKENS | Bene strutturata; badge "inattivo" coerenti; nessun serif rimasto | P3 |
| **Company** | `/company` | Executive Cockpit: stato attivazione e priority action board-ready | KoraIntelligenceHero, IntelligenceBrief, MetricTrio, MacroblockCompositionCard, ProssimaAzioneCard | Spacing tra sezioni già a 36px; nessun Explainer su AR/MAR/VR; sidebar "Command/Intelligence" ok | P1 |
| **Company** | `/company/kora-index` | Scomposizione KORA Index v3: narrative-first poi breakdown tecnico | HeroDiagnosis, ScoreDrivers, BoardActions, MacroblockCard, ComponentBreakdown | Già narrative-first da B47; mancano Explainer su componenti tecnici; serif in HeroDiagnosis | P1 |
| **Company** | `/company/financial` | Governance finanziaria BTI: spend → attivazione profonda → debt | KPICard, ChartFrame, FinCard locale | FinCard locale (non del Layer); serif in nessuno; DecisionContext ok; mancano Explainer su DA%/BTI | P1 |
| **Company** | `/company/activation` | Activation Intelligence: silent majority, debt concentrazione, siti | MetricCard locale, BarRow locale, SectionLabel | Componenti locali non del Layer; Safeguard prominent ok; mancano Explainer | P1 |
| **Company** | `/company/reports` | Decision Pack board-ready: 8 sezioni, export, raccomandazioni | DecisionPackHero, MetricGrid locale, vari report components | Grids responsive già fixati (B49); mancano Button standardizzato; no Explainer su metriche | P2 |
| **Company** | `/company/contribution` | Contribution Intelligence: iniziative collettive, livelli maturità | PageMasthead, SectionLabel, ChartFrame | Indicatore companion mai confuso con Index; copy ok; mancano Explainer | P2 |
| **Company** | `/company/pillars` | Pillar Intelligence: distribuzione IU sui 5 pillar | PageMasthead, SectionLabel | Usa pillar colors; nessun Explainer per ogni pillar; copy ok | P2 |
| **Company** | `/company/shared` | Institutional View: aggregati privacy-safe da condividere internamente | PageMasthead | Minimal; copy ok; nessun dato individuale | P3 |
| **Company** | `/company/data` | Data Intake Studio: stato fonti, completezza, eligibility | PageMasthead, SectionLabel, vari stati | Nessun DataBar; stati incompleti; empty state generico | P2 |
| **Company** | `/company/data/upload` | Upload file: intake CSV/Excel, mapping, preview | vari componenti locali | Grids 3-col fixati (B49); Field non standardizzato; form states locali | P2 |
| **Company** | `/company/ingestion` | Ingestion pipeline: BCM mapping, review | PageMasthead, SectionLabel | Similar a data; Field non standardizzato | P3 |
| **Company** | `/company/ingestion/mapping-review` | Revisione mapping tassonomia BCM | pagina locale | Nessun componente Layer; grafi locali | P3 |
| **Company** | `/company/uef-review` | UEF Review Queue: revisione record pending | pagina locale | Tabella non standardizzata; manca Table del Layer | P2 |
| **Company** | `/company/scoring` | Scoring run status e output | pagina locale | Minimal; nessuna Table | P3 |
| **Company** | `/company/profile` | Profilo azienda + stato onboarding | InfoRow locale | No Layer components; empty states generici | P3 |
| **Company** | `/company/onboarding` | Onboarding workflow steps | pagina locale | Step non standardizzati | P3 |
| **Company** | `/company/setup` | Setup tenant configurazione iniziale | pagina locale | Form non standardizzati; Field mancanti | P3 |
| **Company** | `/company/workforce-baseline` | Baseline workforce: headcount, segmenti | pagina locale | Grids 3-col; nessun DataBar | P3 |
| **Company** | `/company/workspace` | Workspace live autenticato per sessione COMPANY_ADMIN | CompanyWorkspaceView, DataSubmissionSection | Autenticato server-side; layout già pulito; badge sistemati (B49) | P2 |
| **Company** | `/company/reports/board-pack` | Board Pack PDF-ready | DecisionPackHero | Serve Button standardizzato per export | P2 |
| **Admin** | `/admin` | KORA Control Tower: vista operativa cross-azienda | IntelPanel, PriorityQueue, SectionHead | Già rebuilt B47; 2-col grids responsive; mancano Tabs per sezioni | P1 |
| **Admin** | `/admin/companies` | Company Console: lista pilot, stato, safeguard | CompanyConsolePanel | Tabella non del Layer; manca Table | P1 |
| **Admin** | `/admin/companies/new` | Creazione nuova azienda live | CreateLiveCompanyForm | Field non standardizzati; form locale | P2 |
| **Admin** | `/admin/companies/[companyId]` | Dettaglio singola azienda: pipeline, scoring, evidenze | pagina complessiva | Molti componenti locali; Tabs mancanti | P2 |
| **Admin** | `/admin/companies/[companyId]/onboarding` | Onboarding specifico company | pagina locale | Form non standardizzati | P3 |
| **Admin** | `/admin/companies/[companyId]/data-intake` | Data intake per company specifica | pagina locale | Field non standardizzati | P3 |
| **Admin** | `/admin/companies/onboarding` | Onboarding generale | pagina locale | Duplica pattern | P3 |
| **Admin** | `/admin/companies/data-intake` | Data intake generale | pagina locale | Field non standard | P3 |
| **Admin** | `/admin/companies/setup` | Setup configurazione company | pagina locale | Form locale | P3 |
| **Admin** | `/admin/companies/workforce-baseline` | Baseline workforce admin | pagina locale | Grids; nessun DataBar | P3 |
| **Admin** | `/admin/company-submissions` | Submission Queue: file caricati dalle aziende | AdminSubmissionQueue | Tabella non del Layer | P2 |
| **Admin** | `/admin/company-users` | Provisioning utenti aziendali | CompanyUserProvisioningPanel | Field non standard; tabella locale | P2 |
| **Admin** | `/admin/company-workspace` | Workspace admin view di una company | CompanyWorkspacePanel | Select/input non standard | P2 |
| **Admin** | `/admin/company-evidence-archive` | Evidence archive: batch, record, attachment | CompanyEvidenceArchivePanel | Tabella; nessun Layer Table | P2 |
| **Admin** | `/admin/company-live-preview` | Preview live workspace company | CompanyLivePreviewPanel | Minimal; ok | P3 |
| **Admin** | `/admin/tenants` | Onboarding tenant: stato pipeline | TenantOnboardingPanel | Badge ok; tabella locale | P2 |
| **Admin** | `/admin/data-intake` | Data Intake Studio admin | DataIntakeStudio, MatchReviewPanel | Complesso; FileField non standard; progress bar locale | P1 |
| **Admin** | `/admin/data-lifecycle` | Lifecycle dati: retention, archivio | DataLifecyclePanel | Input non standard | P3 |
| **Admin** | `/admin/uef-review` | UEF Review Queue admin | UefReviewQueue | Tabella complessa non del Layer | P1 |
| **Admin** | `/admin/ai-onboarding` | AI Onboarding Engine: pipeline 6-step | pagina locale | Tabella locale; stati incompleti | P2 |
| **Admin** | `/admin/operator` | Operator Console: scoring run wizard | OperatorConsole | Multi-step; nessun componente Layer | P2 |
| **Admin** | `/admin/portfolio` | Portfolio companies | pagina locale | Tabella locale | P2 |
| **Admin** | `/admin/network` | KORA Activation Network: partner, advisor, territory | pagina locale | Complesso; nessun Layer | P2 |
| **Admin** | `/admin/gtm` | GTM & Validazione founder | pagina locale | Badge fixati (B49); ok | P3 |
| **Admin** | `/admin/benchmarks` | Benchmark cross-azienda | pagina locale | DataBar mancante | P3 |
| **Admin** | `/admin/index-registry` | Registro KORA Index™ | pagina locale | Tabella locale | P3 |
| **Admin** | `/admin/login` | Login Supabase | pagina locale | Non toccare (auth) | — |
| **Admin** | `/admin/demo/acme-001` | Guided Demo ACME-001 | AcmeDemoHub | Badge; struttura ok | P3 |
| **Admin** | `/admin/demo/acme-001/company-workspace` | Demo workspace ACME | AcmeWorkspacePreview | Badge; struttura ok | P3 |
| **Worker** | `/my-kora` | Worker PIB privato: pillar, timeline, opportunità | PageMasthead, TOKENS, myKoraPreviewService | Aggiornato B45; Worker PIB™ masthead; nessun Explainer su PIB | P2 |
| **Worker** | `/my-kora/privacy` | Privacy & Condivisione lavoratore | pagina locale | Form toggle non standard; Field locale | P2 |
| **Worker** | `/my-kora/dynamic-cv` | Dynamic Impact CV portabile | pagina locale | CV items non standardizzati | P2 |
| **Worker** | `/my-kora/opportunities` | Opportunità di attivazione | pagina locale | Card locale | P3 |
| **Worker** | `/my-kora/bookings` | Prenotazioni (coming soon) | pagina stub | EmptyState generico | P3 |
| **Worker** | `/my-kora/collective` | Impatto collettivo (coming soon) | pagina stub | EmptyState generico | P3 |
| **Partner** | `/partner` | Workspace Partner: richieste, evidenze, protocollo | PageMasthead, DecisionContext, TOKENS | B45 aggiornato; Button non standard; struttura ok | P2 |
| **Advisor** | `/advisor` | Workspace Advisor: review queue, governance | PageMasthead, DecisionContext, TOKENS | B45 aggiornato; FAQ accordion; Button non standard | P2 |

---

## Legenda Priorità
- **P1** — Tocca in Fase 1 (pagine flagship, più alto impatto)
- **P2** — Fase 2–3 (core operativo, completamento Layer)
- **P3** — Fase 4–5 (secondario, admin profondo, stub)
- **—** — Non toccare (auth, infrastruttura)
