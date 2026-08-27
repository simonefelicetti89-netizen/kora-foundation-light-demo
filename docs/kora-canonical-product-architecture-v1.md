# KORA Canonical Product Architecture — v1.1

**Phase:** 1M-A — Canonical QA Patch
**Authority level:** Master reference — supersedes all prior product descriptions where in conflict
**Date:** 2026-05-19 (QA patch applied same date)
**Author:** Simone Felicetti (Founder) + Claude Code (architectural synthesis + QA)
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL) · Gate 3 OPEN · Gate 5 OPEN
**Sections:** 34 (§25 Capability Scope Matrix added; §26 "Do Not Build Yet" added; §33 Alignment Plan restructured by priority tier)

---

> **Precedence note (added 2026-08-27, does not modify this document's original content):** As of 2026-08-26, `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.0.md` is the current architectural truth for target architecture — domain ontology (Program/Investment/Decision layer), the Architecture Registry, constitutional invariants, and execution governance. Where this document's authority claims below (§1, §34) address those specific matters, the Master Plan now governs instead. This document remains authoritative, unchanged, for everything else it defines: product positioning, the five pillars, capability scope, language policy, boundary rules, and current-state product architecture. See `CLAUDE.md` §8 for the full hierarchy.

---

## 1. Purpose and Authority of This Document

Questo documento è il riferimento canonico dell'architettura di prodotto KORA. Ogni sessione futura — di codice, product, UX, pitch, demo, metodologia, marketing, commerciale o documentazione — deve leggerlo prima di agire e non deve contraddirlo.

This document consolidates KORA's current vision, Foundation Light scope, future architecture, intelligence module catalogue, language policy, boundary rules, and alignment instructions for all future work.

**What this document is:**
- The canonical product architecture reference for KORA Foundation Light and future product decisions
- A strategic and architectural constitution, not a technical implementation plan
- An authority that resolves conflicts between older documents

**What this document is not:**
- Not code
- Not SQL
- Not a Prisma schema
- Not legal advice
- Not tax advice
- Not ESG assurance
- Not methodology calibration
- Not permission to build future modules now
- Not a substitute for Gate 2, Gate 3, or Gate 5 reviews

Conflicts between existing documents are resolved by this hierarchy: doc 21 (founder gate decisions D-01–D-21) → this document → doc 10 (Architecture v3) → doc 21b (methodology governance) → doc 22A (build cutline) → docs 24, 25, 26.

**Eccezione metodologica:** Per definizioni delle componenti del KORA Index, formula IU, sequenza algoritmica a 14 stadi, struttura dell'Activation Safeguard e significato dei codici metodologici, `docs/10-architecture-v3-layer-specification.md` è l'autorità governante. Questo documento non può ridefinire componenti, formule o algoritmi senza un aggiornamento esplicito di doc 10.

---

## 2. KORA in One Sentence

**Italiano (primario):**
> "KORA è il layer di intelligence e orchestrazione che trasforma iniziative people frammentate in attivazione organizzativa verificata."

**English (secondary):**
> "KORA is the intelligence and orchestration layer that transforms fragmented people initiatives into verified organizational activation."

**Canonical narrative:**
> "KORA misura, orchestra, valida, protegge e spiega."

---

## 3. What KORA Is

KORA è:

1. **Human Impact Intelligence Platform** — la categoria di prodotto canonica
2. **People activation intelligence layer** — il layer che misura l'attivazione organizzativa reale
3. **Orchestration layer** — il ponte operativo tra insight e azione verificata
4. **Privacy-first trust infrastructure** — architettura che separa per design il layer personale del lavoratore dall'intelligenza organizzativa del datore di lavoro
5. **Organizational activation intelligence system** — sistema di misura dell'attivazione a livello di organizzazione, non di individuo
6. **Evidence and explainability layer** — ogni output KORA è spiegabile, tracciabile e taggato con versione metodologica e stato di calibrazione
7. **People evidence layer supporting CSR/ESG reporting context** — KORA fornisce il layer di evidenza people che mancava alle piattaforme ESG, senza essere una piattaforma ESG
8. **Activation memory of the organization over time** — KORA accumula memoria di attivazione longitudinale; diventa più prezioso con il tempo
9. **Pilot-grade diagnostic intelligence in Foundation Light** — intelligenza diagnostica pre-calibrazione empirica, correttamente etichettata

---

## 4. What KORA Is Not

KORA non è e non deve diventare:

| Drift rischio | Posizionamento corretto |
|---|---|
| Welfare platform | Activation intelligence |
| HR tool / HR dashboard | Organizational activation and evidence |
| Wellbeing tracker | People evidence layer |
| Generic ESG dashboard | People evidence layer supporting CSR/ESG context |
| Worker surveillance system | Aggregate-only company intelligence + worker-owned personal layer |
| Marketplace | KORA Activation Network |
| Wallet / payment platform | Contribution intent and governance only |
| Booking engine | Activation orchestration |
| Reward / gamification system | Verified activation measurement |
| Employee performance tool | Organizational-level activation intelligence |
| Individual ranking tool | Company-level aggregate output |
| Public company ranking platform (in Foundation Light) | Private diagnostic intelligence |
| ESG compliance engine | Evidence layer supporting context for ESG reporting |
| CSRD/ESRS assurance tool | Evidence provider, not assurance provider |
| Legal/tax advisory tool | Outside scope by design |

---

## 5. Core Narrative Spine

La gerarchia narrativa di KORA:

1. KORA misura l'attivazione organizzativa reale — non il welfare, non il sentiment, non il budget speso.
2. KORA spiega perché l'attivazione è forte o debole — tramite Confidence Score, Activation Safeguard, pillar distribution, Activation Debt, Evidence Debt.
3. KORA protegge i dati dei lavoratori by design — nessun dato individuale visibile al datore di lavoro; il layer personale appartiene al lavoratore.
4. KORA raccomanda cosa fare dopo — next best actions, initiative suggestions, evidence uplift recommendations.
5. KORA orchestra iniziative verificate nel tempo — dall'insight al gap, dal gap all'iniziativa, dall'iniziativa alla partecipazione verificata.
6. KORA confronta l'attivazione con KPI HR, ROI e segnali CSR/ESG come layer interpretativi adiacenti — non come componenti del KORA Index.
7. KORA trasforma tutto questo in evidenze utilizzabili da leadership, HR, Finance, ESG, advisor, investitori, stakeholder e mercato.
8. KORA consente in futuro di comunicare pubblicamente segnali verificati — senza esporre dati individuali e senza sovradichiarare certificazioni.

---

## 6. The Three Workspaces

### A. Company Workspace

**Scopo:** intelligenza sull'attivazione organizzativa a livello di azienda.

**Mostra:**
- Executive Cockpit
- KORA Index (con tutte le 10 componenti, Confidence Score, Activation Safeguard, methodology_version_id, calibration_status)
- Activation & Participation
- KORA Contribution (separato dal KORA Index)
- Pillars & Initiatives
- Initiative Studio
- Data & Evidence
- Financial Governance
- CSR & People Evidence
- HR KPI Correlation (layer adiacente)
- People ROI & Outcome Correlation (layer adiacente)
- Benchmark & Normalization
- KORA Evolution
- Public KORA Snapshot (futuro)

**Non deve mai mostrare:**
- PIB individuale del lavoratore
- UEF individuali
- IU individuali per lavoratore identificabile
- Worker timeline personale
- Dynamic Impact CV
- Bookings del lavoratore
- Preferenze personali del lavoratore
- Dati sanitari, psicologici, di diagnosi

---

### B. My KORA — Worker Layer

**Scopo:** il layer di valore personale del lavoratore. Il lavoratore possiede questo layer.

**Mostra:**
- PIB Light (personale, non visibile al datore di lavoro)
- Privacy & Sharing (cosa vede e non vede il datore di lavoro)
- Dynamic Impact CV (controllato dal lavoratore)
- Personal impact timeline
- Worker-owned evidence
- Opportunities
- Consent controls
- Data portability (futuro)

**Regola fondamentale:** "Il datore di lavoro vede l'organizzazione. Il lavoratore possiede il layer personale."

**Non deve mai diventare:**
- Performance score visibile al datore di lavoro
- Worker ranking
- Reward system o gamification layer
- Strumento di sorveglianza del datore di lavoro

---

### C. KORA Operating Console

**Scopo:** sala di controllo interna KORA. Non è un admin dashboard generico.

**Include:**
- AI Onboarding Engine
- Activation Orchestration Engine
- Company Portfolio
- KORA Index Registry
- Benchmarks
- Advisor Network
- Partner Network
- Platform Analytics
- Billing & Revenue Light
- Founder Validation / GTM
- Methodology & Gate Status
- CSR Evidence Mapping control
- HR KPI Correlation configuration
- Public Snapshot approval controls
- Certification & Assurance Path status

---

## 7. The Four Core Engines

### A. AI Onboarding Engine

**Flusso:**
```
source intake
→ rule-based / taxonomy-based mapping (BCM taxonomy)
→ sensitive field exclusion
→ UEF draft queue
→ human review
→ scoring readiness
```

**Regole:**
- L'AI assiste il mapping e la review; non valuta i lavoratori.
- v0.1 è rule-based/taxonomy-based. Nessuna chiamata a LLM esterni su dati HR o dati lavoratori.
- Solo i record UEF approvati da revisore umano entrano nello scoring.
- Il campo `ai_confidence` e `mapping_method` sono obbligatori su ogni UEF.

---

### B. Activation Orchestration Engine

**Scopo:** KORA passa dal misurare ciò che è accaduto all'orchestrare ciò che deve accadere.

**Gestisce:**
- Iniziative interne all'azienda
- Iniziative esterne
- Iniziative cross-company
- Iniziative create da partner
- Iniziative progettate da advisor
- Iniziative suggerite da KORA
- Economic contribution intents

**Lifecycle di un'iniziativa:**
```
activation gap detected
→ initiative proposed
→ KORA classifies (pillar, type, additionality level)
→ evidence requirement defined
→ advisor / partner validation if needed
→ approved / conditionally approved / rejected
→ participation monitored
→ evidence collected
→ outcome measured
→ KORA Index / KORA Contribution interpreted
```

---

### C. Scoring / Methodology Engine

**Flusso canonico:**
```
approved UEF
→ Feature Vector
→ Impact Units (IU)
→ PIB (Personal Impact Balance — obbligatorio, mai bypassabile)
→ Company Aggregation
→ Activation Safeguard
→ KORA Index
→ Confidence Score (inseparabile dal KORA Index)
→ Explainability
```

**Formula IU canonica (letta da `lib/methodology-config/v0.1.ts`, mai hardcoded):**
```
IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]
```

---

### D. Evidence / Confidence / Explainability Engine

**Ogni output KORA deve mostrare obbligatoriamente:**
- Confidence Score
- Activation Safeguard status (CLEAR / WARNING / FLAGGED)
- `methodology_version_id`
- `calibration_status` (Foundation Light = `pre_empirical_calibration`)
- Limitations statement
- Explainability breakdown
- Data completeness indicator
- Evidence quality indicator
- Next best actions

Confidence e Safeguard sono non-sopprimibili. Non esiste output KORA senza di essi.

---

## 8. Canonical Scoring Flow — 9 Regole Vincolanti

```
approved UEF → Feature Vector → IU → PIB → Company Aggregation
→ Activation Safeguard → KORA Index → Confidence Score → Explainability
```

1. PIB è obbligatorio e non bypassabile.
2. I ruoli employer non vedono mai il PIB individuale.
3. Activation Safeguard è obbligatorio e non bypassabile. Thresholds: CLEAR = AR ≥ 0.40 AND MAR ≥ 0.30; WARNING = 0.20 ≤ AR < 0.40 OR 0.15 ≤ MAR < 0.30; FLAGGED = AR < 0.20 OR MAR < 0.15.
4. Confidence Score è inseparabile dal KORA Index.
5. `calibration_status` è obbligatorio su ogni output di scoring.
6. `methodology_version_id` è obbligatorio su ogni output di scoring.
7. Ogni score deve essere spiegabile con formula trace.
8. Nessun score viene mostrato senza Confidence Score e limitazioni.
9. Foundation Light porta sempre `calibration_status = pre_empirical_calibration`.

---

## 9. KORA Index — Regola Canonica

Il KORA Index v3 ha esattamente **10 componenti**. Non una di più, non una di meno.

| Codice | Nome | Significato |
|---|---|---|
| `AR` | Activation Rate | Quota di workforce con almeno un IU approvato nel periodo |
| `MAR` | Meaningful Activation Rate | Quota con IU sopra la soglia di materialità |
| `NI` | Normalized Intensity | Magnitudine media di IU per lavoratore attivo |
| `WB` | Worker Balance | Distribuzione equa degli IU tra lavoratori attivi |
| `PC` | Pillar Coverage | Numero di pillar con presenza significativa |
| `PB` | Pillar Balance | Equità della distribuzione IU tra pillar coperti |
| `EQ` | Equity | Misura se i lavoratori attivati sono distribuiti equamente tra i segmenti della workforce — dipartimenti, fasce di seniority, tipi di contratto, siti e altri segmenti aggregati sopra soglia privacy. Alta Equity significa che l'attivazione non è sistematicamente concentrata in segmenti privilegiati o già ad alta partecipazione. |
| `VR` | Verification Rate | Quota di IU supportata da evidenza verificata o parzialmente verificata |
| `CO` | Continuity | Quota di lavoratori con engagement sostenuto cross-periodo |
| `CS` | Confidence Score | Completezza dati, qualità delle fonti, peso della verifica |

**Nota metodologica su EQ, VR e CS:**
- EQ (Equity) misura l'equità distributiva dell'attivazione tra segmenti della workforce.
- VR (Verification Rate) misura la quota di IU supportata da evidenza verificata o certificata.
- CS (Confidence Score) misura la reliability metodologica complessiva: completezza dati, qualità fonti, copertura della verifica e qualità dell'evidence base dell'output.
- "Evidence Quality" come concetto è distribuita tra VR, CS, EV (correction factor), Evidence Debt e Trust Ledger; non è una componente standalone del KORA Index.
- Terminologie storiche come "Event Quality" o "EQT" non devono essere mappate su EQ. EQ = Equity è la definizione canonica per `docs/10-architecture-v3-layer-specification.md` §17.

**Regole assolute:**
- Non creare un'undicesima componente.
- KORA Contribution è separato e non entra nel KORA Index.
- KORA Ecosystem Reach è separato.
- ROI è un layer interpretativo adiacente, non una componente.
- CSR/ESG Evidence Mapping è adiacente, non una componente.
- HR KPI è un layer di contesto adiacente, non una componente.
- Benchmark è adiacente, non una componente.
- Public Snapshot è adiacente, non una componente.
- Additionality non è una componente; modifica il qualification e il weighting upstream.
- Dati finanziari, ESG, HR e reputazionali non entrano automaticamente nel KORA Index.

---

## 10. What Never Enters the KORA Index

- Budget speso / fondi caricati
- Dimensione del catalogo partner
- Metriche ESG isolate
- KPI HR isolati (assenteismo, turnover, retention da soli)
- Dati di diversità isolati
- Sentiment da engagement survey isolato
- KORA Contribution
- KORA Ecosystem Reach
- LinkedIn/condivisioni pubbliche
- Top-up del lavoratore
- Reputazione pubblica o badge
- Stato di certificazione da solo
- Attività di compliance legale obbligatoria minima non trasformata in attivazione aggiuntiva verificata
- Disponibilità partner senza partecipazione del lavoratore
- Partecipazione a marketplace
- Pagamenti o contribuzione economica senza partecipazione verificata

---

## 11. Additionality / Compliance Weighting

**Principio:** KORA premia l'additionality, l'attivazione verificata e la partecipazione distribuita — non la mera compliance.

| Livello | Codice | Descrizione |
|---|---|---|
| 1 | `mandatory_legal_minimum` | Obbligo di legge minimo — valore KORA nullo o minimo |
| 2 | `mandatory_company_policy` | Policy aziendale obbligatoria — valore KORA basso |
| 3 | `contractual_required` | Richiesto da contratto — valore KORA basso |
| 4 | `voluntary_optional` | Opzionale, su base volontaria — valore KORA medio |
| 5 | `additional_beyond_requirement` | Aggiuntivo rispetto al minimo richiesto — valore KORA elevato |
| 6 | `strategic_company_initiative` | Iniziativa strategica aziendale documentata — valore KORA elevato |
| 7 | `collective_verified_initiative` | Iniziativa collettiva verificata con evidenza — massima rilevanza KORA Contribution |

**Esempi:**
- Corso di sicurezza obbligatorio per legge → `mandatory_legal_minimum` → nessun valore di attivazione KORA
- Workshop cultura sicurezza avanzata oltre il minimo legale → `additional_beyond_requirement` → valore KORA elevato
- Corso di digital skills volontario completato e verificato → `voluntary_optional` → valore GROWTH
- Sustainability Day / Earth Day → `strategic_company_initiative` → valore IMPACT/CONNECTION se partecipazione ampia e verificata
- Volontariato cross-company con partner → `collective_verified_initiative` → massima rilevanza KORA Contribution se verificato

---

## 12. New Intelligence Modules (A–P)

I seguenti moduli sono capacità canoniche KORA. Lo stato (demo / futuro / corrente) è indicato per ciascuno.

### A. Activation Debt — Debito di attivazione
Mostra quale parte dell'organizzazione rimane esclusa dall'attivazione reale.
Include: popolazione eleggibile inattiva, dipartimenti sotto-attivati, siti sotto-attivati, pillar debt, continuity debt, additionality debt, silent majority detection, budget speso senza attivazione, iniziative con reach basso.
**Status:** Demo (Foundation Light, visualizzazione analitica su dati sintetici)

### B. Evidence Debt — Debito di evidenza
Mostra quale evidenza manca o è debole.
Include: fonti mancanti, record auto-dichiarati, iniziative a bassa verifica, advisor review pending, gap di evidenza partner, potenziale di uplift della confidenza, CSR evidence gaps.
**Status:** Demo (Foundation Light)

### C. Trust Ledger — Registro di fiducia
Un registro di fiducia dietro ogni claim di impatto.
Include: fonte del dato, validazione, versione metodologica, confidenza, limitazioni, esclusioni, advisor review, audit trail, stato evidenza, calibration status.
**Status:** Architetturale corrente; visualizzazione completa futura

### D. Activation Flywheel
Ciclo:
```
data ingestion → evidence review → KORA Index → activation gaps
→ recommended initiatives → orchestration → worker participation
→ verified evidence → better intelligence → better allocation
→ stronger reporting → public trust signals
```
**Status:** Narrativo/architetturale corrente; operativo futuro

### E. No-Surveillance Proof
Dimostrazione visiva e architetturale che il datore di lavoro non può accedere ai dati individuali del lavoratore.
Mostra: nessun PIB individuale, nessuna worker timeline, nessun Dynamic CV, nessun booking, nessuna preferenza personale, nessun record di wellbeing sensibile, soglia aggregazione, separazione Identity Store, worker-owned layer.
**Status:** Demo (Foundation Light, privacy boundary components)

### F. Additionality Lens
Vista chiara su compliance vs additionality. Mostra se le azioni sono mandatory minimum, company-required, voluntary, strategic, additional o collective verified.
**Status:** Demo (Foundation Light, Initiative Studio)

### G. Silent Majority Detector
Identifica se i programmi people raggiungono l'organizzazione o solo la minoranza già-coinvolta.
**Status:** Demo (Foundation Light, Analytics layer)

### H. Access Equity & Inclusion Evidence Layer
Vista aggregata (solo sopra la soglia di privacy) dell'accesso alle iniziative per: dipartimenti, siti, job family, workforce operativa vs ufficio, remoto vs plant, tipo contratto, fasce seniority, fasce età, distribuzione di genere (solo aggregata con cautela legale/privacy).
Regole: nessun profiling individuale, nessuna esposizione sensibile, nessun ranking, sempre sopra la privacy threshold.
**Status:** Demo (Foundation Light, aggregazione sintetica)

**Relazione con EQ:** EQ nel KORA Index cattura l'equità distributiva a livello sintetico. L'Access Equity & Inclusion Evidence Layer fornisce l'analisi disaggregata avanzata. I due layer sono complementari, non sostitutivi. EQ rimane una componente del KORA Index; il modulo H è il layer di analisi dettagliata dell'equità.

### I. Activation Intervention Simulator
Simulazione di interventi, non solo budget.
Esempi di input: lancia Operations Wellbeing Day, aggiungi percorso di mentoring verificato, converti volontariato auto-dichiarato in iniziativa advisor-verificata.
Output: componenti KORA coinvolte, impatto probabile per pillar, requisiti di evidenza, confidenza, rischio di bassa partecipazione, effetto su KORA Index o KORA Contribution, livello di additionality.
**Status:** Demo (Foundation Light, simulazione sintetica)

### J. Board Pack
Pack di reporting executive premium.
Contiene: KORA Index + Confidence, Activation Debt, Evidence Debt, top 3 rischi, top 3 decisioni, priorità trimestre prossimo, CSR/ESG evidence mapping, HR KPI correlation, ROI interpretation, limitazioni e calibration status.
**Status:** Mockup demo / futuro operativo

### K. Benchmark & Normalization Layer
Confronta: azienda vs se stessa nel tempo, azienda vs settore, azienda vs fascia dimensionale, azienda vs territorio, dipartimento vs media aziendale, pillar vs benchmark, qualità evidenza vs benchmark, Activation Debt vs benchmark, KORA Contribution vs benchmark.
Regole: nessun ranking pubblico in Foundation Light; benchmark mostra confidenza e sample size; benchmark reali richiedono dataset sufficiente; benchmark sintetici solo in demo.
**Status:** Demo (Foundation Light, dati sintetici)

### L. KORA Evolution & Temporal Intelligence
Mostra: evoluzione KORA Index, evoluzione pillar, evoluzione Activation Debt, evoluzione Evidence Debt, evoluzione confidenza, evoluzione continuità, impatto interventi nel tempo, before/after iniziative, traiettoria trimestrale, stabilità score, regression warnings.
Principio: "KORA diventa più prezioso con il passare del tempo perché l'organizzazione costruisce una memoria di attivazione."
**Status:** Demo (Foundation Light, longitudinale su dati sintetici)

### M. KORA Value Chain
Futuro. Estende il layer di attivazione umana dalla workforce dell'azienda a: fornitori, contractors, partner ecosystem, lavoratori in outsourcing, reti cooperative, territorio, valore della filiera.
Rilevante per: ESRS S2, supplier social assessment, responsible business conduct, procurement, social value chain.
**Status:** Non in Foundation Light. Futuro / Governance / Certified scope only.

### N. Partner Activation Quality
Segnale interno/governance. Non crea ranking pubblico dei partner.
Include: affidabilità delle evidenze, continuità generata, distribuzione dell'attivazione, partecipazione ripetuta, contributo per pillar, qualità dei dati, stato advisor review, compliance privacy.
Regole: nessun star rating, nessuna leaderboard pubblica, nessun marketplace scoring.
**Status:** Demo (Foundation Light, segnale interno)

### O. Advisor Confidence Stamp
Indicatore di review da advisor.
Include: revisione da advisor, scope della review, livello di confidenza, limitazioni, data, scadenza/ciclo di revisione, note advisor.
Non si chiama "certified" a meno che non siano soddisfatti i requisiti del tier Certified.
**Status:** Demo / futuro operativo

### P. Worker Consent & Data Portability
Layer di controllo di proprietà del lavoratore.
Il lavoratore può: vedere quali dati esistono, capire cosa è privato, vedere cosa il datore di lavoro non può accedere, scegliere cosa entra nel Dynamic Impact CV, esportare future credenziali verificate, gestire preferenze di condivisione, acconsentire a futuri feature di portabilità, revocare la condivisione opzionale dove applicabile.
Foundation Light usa solo dati demo/sintetici.
**Status:** Demo (Foundation Light, privacy controls)

---

## 13. Activation Orchestration and Initiative Studio

**Principio fondamentale:** KORA passa dal misurare ciò che è accaduto all'orchestrare ciò che deve accadere.

**Initiative Studio non è:**
- Un event manager
- Un marketplace
- Un'engine di pagamento
- Un booking system

**Initiative Studio è:** il ponte operativo tra insight di attivazione e azione verificata.

**Lifecycle canonico:**
```
activation gap detected
→ initiative proposed (company / partner / advisor / KORA suggestion)
→ KORA classifies (pillar, type, additionality level)
→ evidence requirement defined
→ advisor / partner validation if needed
→ approved / conditionally approved / rejected
→ participation monitored
→ evidence collected and verified
→ outcome measured
→ KORA Index / KORA Contribution interpreted
```

**Tipi di iniziativa gestiti:**
- Iniziative interne all'azienda
- Iniziative esterne
- Iniziative cross-company
- Iniziative create da partner
- Iniziative progettate da advisor
- Iniziative suggerite da KORA
- Economic contribution intents

---

## 14. Partner-Created Initiatives and KORA Activation Network

I partner sono attori dell'ecosistema, non vendor di un marketplace.

**Termine canonico:** KORA Activation Network
**Termine vietato:** marketplace

**Flusso:**
```
partner proposes initiative
→ KORA evaluates (pillar fit, evidence requirement, additionality, privacy risk)
→ company joins or contributes
→ workers participate
→ partner provides evidence
→ advisor validates if necessary
→ KORA measures
```

La qualità del partner viene valutata internamente tramite Partner Activation Quality — senza ranking pubblico, senza leaderboard, senza star rating.

---

## 15. Economic Contribution / KORA Impact Pledge

**Dichiarazioni vincolanti:**
1. KORA non detiene fondi.
2. KORA non esegue pagamenti.
3. KORA non è un wallet.
4. KORA non è un istituto di pagamento.
5. KORA non è un marketplace.
6. Il denaro da solo non è impatto.

Il budget allocato non produce attivazione senza partecipazione verificata dei lavoratori. Il contributo economico non aumenta automaticamente il KORA Index. Può supportare il KORA Contribution solo se l'iniziativa è validata e attivata.

**Struttura di una contribution intent:**
- Intenzione di contribuzione → approvazione → budget committed → budget used → evidenza → validazione advisor → partecipazione aggregata → effetto su KORA Contribution → interpretazione Financial Governance

---

## 16. CSR Evidence Mapping Layer

**Definizione:**
Il CSR Evidence Mapping Layer collega le evidenze KORA — iniziative, partecipazione, qualità delle fonti, verifiche, continuità, pillar, contribution e raccomandazioni — ai principali framework CSR/ESG rilevanti per la dimensione people/social. Il layer non modifica il KORA Index e non produce compliance automatica. Serve a rendere più leggibile, tracciabile e riutilizzabile il patrimonio informativo KORA nei processi di rendicontazione.

**Posizionamento canonico:**
> "KORA non è una piattaforma ESG. È il people evidence layer che mancava alle piattaforme ESG."

**Framework supportati:**
- CSRD — Corporate Sustainability Reporting Directive
- ESRS 2 — General Disclosures
- ESRS S1 — Own Workforce
- ESRS S2 — Workers in the Value Chain (solo scope futuro / Value Chain)
- ESRS S3 — Affected Communities
- D.Lgs. 125/2024 — Recepimento italiano CSRD
- GRI 401 — Employment
- GRI 403 — Occupational Health and Safety
- GRI 404 — Training and Education
- GRI 405 — Diversity and Equal Opportunity (solo aggregato e con cautela)
- GRI 413 — Local Communities
- ISO 26000 — Social Responsibility
- OECD Guidelines for Multinational Enterprises on Responsible Business Conduct
- UN Guiding Principles on Business and Human Rights
- UN Global Compact Ten Principles

| Affermazione corretta | Affermazione vietata |
|---|---|
| "KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili." | "KORA garantisce la conformità CSRD/ESRS." |
| "KORA fornisce il layer di evidenza people per il reporting sociale." | "KORA certifica la sostenibilità dell'azienda." |
| "KORA supporta l'evidence mapping per ESRS S1." | "KORA sostituisce la consulenza ESG/legale/fiscale." |

**KORA non sostituisce:** consulenti ESG, consulenti legali, consulenti fiscali, revisori di assurance, statutory sustainability reporting, processi di compliance CSRD/ESRS, processi di reporting GRI, certificazioni ISO, due diligence sui diritti umani.

**KORA fornisce:** evidenze people strutturate, activation intelligence, tracciabilità, spiegabilità, confidenza, versioning metodologico, qualità dell'evidenza, contesto report-ready, potenziale annex CSR evidence.

**Disclaimer CSR/ESG obbligatorio — da includere in ogni output con riferimento ESG:**

> "KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio."

Questo disclaimer deve essere presente obbligatoriamente in:
- Pagine CSR Evidence Mapping della piattaforma
- ESG/CSR Evidence Annex
- Board Pack dove compare il CSR/ESG evidence mapping
- Public KORA Snapshot se viene menzionata la rilevanza CSR/ESG
- Qualsiasi report pilot che faccia riferimento a CSRD / ESRS / GRI / ISO 26000 / OECD / UNGP / UN Global Compact

Il disclaimer non può essere annacquato, omesso o spostato in note a piè di pagina non visibili.

---

## 17. ESG and HR KPI Context Layer

> "Il KORA Index misura il layer di attivazione people. I KPI HR, le metriche ESG e gli indicatori ROI sono layer interpretativi adiacenti: contestualizzano KORA, ma non entrano automaticamente nel KORA Index."

**Ruoli consentiti per ESG/HR KPI:**
- Import di contesto
- Export di report annex
- Supporto ESRS S1 / rendicontazione sociale
- Supporto GRI-oriented reporting
- Supporto board-level CSR evidence
- Correlation analysis
- Evidence appendix
- Confronto HR outcome
- ROI interpretation

**Ruoli vietati:**
- Metrica ESG che migliora automaticamente il KORA Index
- KPI HR che migliora automaticamente il KORA Index
- Foundation Light che rivendica causalità
- KORA che dichiara compliance regolatoria

---

## 18. HR KPI Correlation Layer

Layer adiacente formale di interpretazione. Non è una componente del KORA Index e non alimenta il KORA Index automaticamente.

**Scopo:** confrontare KORA Index, componenti, pillar e segnali di attivazione con outcome HR e indicatori organizzativi. Il confronto produce contesto interpretativo, non scoring.

**Famiglie di KPI:**
Assenteismo · turnover · retention · uscite volontarie · tenure · mobilità interna · completamento training · incidenti sicurezza / infortuni · near miss · engagement survey · eNPS · rappresentanza diversity · distribuzione genere · fasce età · tipo contratto · sito/dipartimento · remoto vs plant · completamento onboarding · promozione / crescita interna · attrattività recruiting · distribuzione performance (solo aggregata e con cautela)

**Regole:**
- L'HR KPI Correlation Layer è interpretazione adiacente, non scoring.
- I KPI HR non alimentano il KORA Index automaticamente.
- Tutti i confronti HR KPI sono aggregate-only e rispettano le safe thresholds.
- I dati sensibili o legati alla diversity devono essere trattati con cautela rafforzata.
- Ogni output di correlazione deve includere esplicitamente la dichiarazione "correlazione ≠ causalità".
- Foundation Light non può rivendicare accuratezza predittiva né effetti causali.
- I dati di diversità sono utilizzabili solo come contesto aggregato di accesso/equità; mai per profiling individuale o decisioni lavorative.
- Nessuna decisione di assunzione, promozione, licenziamento o valutazione individuale può basarsi su output KORA.

**Esempio consentito:**
"I reparti con maggiore attivazione KORA mostrano, nello stesso periodo, un tasso di assenteismo inferiore. [Correlazione osservata — non causalità dimostrata]"

**Esempio vietato:**
"KORA riduce l'assenteismo."

---

## 19. People ROI & Outcome Correlation Layer

Il ROI è un layer interpretativo adiacente, non una componente della metodologia KORA e non entra nel KORA Index.

**5 tipi ROI — distinzione obbligatoria:**
1. **Budget Efficiency ROI** — efficienza del budget people vs attivazione prodotta
2. **Activation ROI** — attivazione verificata generata per unità di investimento
3. **HR Outcome Correlation** — confronto tra segnali di attivazione e outcome HR (aggregate-only)
4. **ESG / People Reporting ROI** — valore della rendicontazione people abilitata da KORA
5. **Reputation / Trust ROI** — segnali di fiducia futuri verso mercato e stakeholder

**Metriche consentite (indicative e direzionali, non prescrittive):**
Cost per active worker · cost per meaningful activation · cost per verified activation · cost per IU (solo indicativo e con limitazioni) · budget allocation vs activation · activation uplift · spend without activation · activation without heavy spend · evidence coverage · reporting readiness · retention correlation · absenteeism correlation · turnover correlation · engagement correlation

**Regole:**
- Il ROI è interpretazione adiacente, non una componente metodologica.
- Cost per IU e cost per meaningful activation sono indicatori direzionali, non metriche assolute.
- Foundation Light non può rivendicare causalità ROI.
- Ogni output ROI deve mostrare confidenza e limitazioni esplicite.
- Non è consentito presentare ROI come risultato certificato o garantito.

**Principio canonico:**
> "KORA mostra dove investimenti people, attivazione verificata e outcome HR appaiono allineati o disallineati."

**Esempio consentito:**
"KORA mostra dove investimenti people, attivazione verificata e outcome HR appaiono allineati o disallineati."

**Esempio vietato:**
"KORA ha generato un ROI del X% riducendo il turnover."

**Vietato in Foundation Light:** "KORA ha ridotto il turnover", "KORA ha migliorato la produttività", "KORA ha ridotto l'assenteismo" — a meno di validazione empirica in versioni metodologiche future.

---

## 20. Public KORA Snapshot & Social Trust Layer

Layer futuro di comunicazione reputazionale e di fiducia. **In Foundation Light è mockup/futuro — nessuna condivisione pubblica reale.**

**Scopo:** consentire alle aziende di comunicare risultati KORA aggregati verificati verso l'esterno senza esporre dati individuali e senza sovradichiarare certificazioni.

**Status in Foundation Light:** mockup statico / future-vision only. Nessuna pubblicazione reale. Nessuna integrazione LinkedIn attiva. Nessun QR verificabile live.

**Output futuri (non attivi in Foundation Light):**
Public KORA Snapshot · Verified KORA Snapshot · KORA Contribution Snapshot · LinkedIn share card · social sharing card · public company KORA profile · website embed badge · QR verification · advisor-reviewed status · Foundation / Governance / Certified status · period-over-period improvement card · verified initiative highlights

**Le card LinkedIn e social sono output di comunicazione futura — non certificazioni attive.**

**Ogni Public Snapshot deve obbligatoriamente mostrare:**
- Versione metodologica (`methodology_version_id`)
- Stato di calibrazione (`calibration_status`)
- Confidence Score
- Data completeness / limitazioni dove rilevante
- Dichiarazione "nessun dato individuale incluso"

**Vincoli assoluti:**
- Nessun dato individuale
- Nessun PIB, nessuna worker timeline, nessun Dynamic CV
- Nessun ranking pubblico in Foundation Light
- Nessuna dichiarazione di "certified" senza tier Certified
- Advisor-reviewed non equivale a Certified
- Verified KORA Snapshot non equivale a Certified organization
- Confidence Score sempre visibile
- Versione metodologica sempre visibile
- Calibration status sempre visibile
- Distinzione chiara tra diagnostic, advisor-reviewed e certified

**Posizionamento canonico:**
> "KORA consente in futuro di comunicare segnali aggregati di fiducia, non ranking pubblici né claim ESG certificati."

> "KORA trasforma l'intelligence interna sull'attivazione people in segnali di fiducia comunicabili verso stakeholder, mercato e talenti, senza esporre dati individuali e senza sovradichiarare certificazioni."

---

## 21. Certification & Assurance Path

**6 livelli di maturità:**

| Livello | Nome | Descrizione |
|---|---|---|
| 1 | Diagnostic | Foundation Light. Pre-calibrazione empirica. Pilot-grade diagnostic intelligence. |
| 2 | Tracked | Foundation. Misurazione ricorrente, trend, KORA Evolution. |
| 3 | Governed | Governance. Audit trail, policy rules, advisor involvement, financial governance. |
| 4 | Advisor-reviewed | Evidenza, iniziativa, metodologia o eligibilità specifica rivista da advisor qualificato. |
| 5 | KORA Certified | Tier certificato futuro. Richiede validazione metodologica, revisione esterna, processo evidence-grade. |
| 6 | Public Verified Snapshot | Segnale pubblico condivisibile con QR verification e strict claims controls. |

**Distinzioni assolute — non negoziabili:**

| Affermazione | Corretta? |
|---|---|
| Diagnostic ≠ Certified | Sì — Foundation Light è Diagnostic, non Certified |
| Advisor-reviewed ≠ Certified | Sì — l'advisor review è un layer di fiducia, non un tier di certificazione |
| Public Snapshot ≠ Certified | Sì — il Public Snapshot è un segnale di fiducia, non una certificazione organizzativa |
| Verified initiative ≠ Certified organization | Sì — un'iniziativa verificata non certifica l'intera organizzazione |
| KORA Certified = futuro | Sì — richiede validazione metodologica futura, processo evidence-grade, revisione esterna, attivazione esplicita del tier |

**Regole:**
- Foundation Light non è certificata. Nessun output Foundation Light può usare linguaggio "certified".
- Advisor-reviewed non equivale a certified.
- Public Snapshot non è automaticamente certified.
- Verified Snapshot non è Certified organization.
- Le dichiarazioni Certified richiedono il tier Certified e i relativi requisiti soddisfatti.
- KORA Certified richiede: validazione metodologica, evidenza process, revisione esterna qualificata, attivazione esplicita del tier — nessuno di questi elementi è presente in Foundation Light.

---

## 22. KORA Output Library

| Output | Audience | Claim consentiti | Claim vietati |
|---|---|---|---|
| Executive Summary | C-suite aziendale | Activation intelligence, KPI, next actions | Causalità, certificazione |
| Board Pack | Board, investitori | Activation Debt, Evidence Debt, ROI interpretation | Compliance guarantee |
| HR People Activation Report | CHRO, HR Analytics | Distribuzione attivazione, pillar, segmenti | Ranking individuale |
| ESG/CSR Evidence Annex | ESG Lead, advisor | Evidence mapping, framework alignment | Compliance CSRD/ESRS |
| CFO People ROI Note | CFO | Budget efficiency, spend vs activation | Causality ROI |
| Advisor Review Pack | Advisor | Evidence quality, confidence, limitations | Certified claim senza tier |
| Public KORA Snapshot | Stakeholder esterni | Aggregate verified signals | Ranking, individual data |
| Worker Privacy Statement | Lavoratori | Cosa il datore di lavoro vede e non vede | — |
| Methodology Appendix | Tutti | Formula, versione, calibration status | Claims di precisione assoluta |
| Data Quality Appendix | Tutti | Completezza fonti, verification rate | — |
| Evidence Debt Report | CHRO, advisor | Gap di evidenza, uplift potential | — |
| Activation Debt Report | CHRO, CFO | Popolazione inattiva, budget senza attivazione | — |
| Initiative Recommendation Pack | CHRO, HR | Next best actions per pillar | Causalità |
| KORA Evolution Report | C-suite | Trend longitudinale, score stability | — |
| Benchmark Note | CHRO, CEO | Confronto settore/dimensione (sintetico in demo) | Ranking competitivo assoluto |
| Investor Evidence Pack | Founder, advisor | Category creation, moat potential, methodology | Certified claims |

---

## 23. Final Recommendations Layer

Ogni warning o segnale critico deve produrre una raccomandazione con questa struttura:

1. Problema rilevato
2. Causa probabile
3. Iniziativa raccomandata
4. Pillar coinvolto
5. Livello di additionality
6. Requisito di evidenza
7. Effetto atteso
8. Confidenza
9. Next step operativo
10. Effetto su: KORA Index / KORA Contribution / CSR Evidence Mapping / ROI interpretation

---

## 24. My KORA / Worker Layer Boundary

**7 regole:**
1. Il lavoratore possiede il proprio layer personale.
2. Il datore di lavoro vede solo l'intelligenza organizzativa aggregata.
3. Il lavoratore vede: PIB Light, privacy controls, timeline personale, Dynamic Impact CV preview, opportunità.
4. Nessun ranking, nessuna gamification, nessuna logica di performance.
5. Nessuna visibilità employer sui dati personali del lavoratore. Mai.
6. Foundation Light demo usa solo dati sintetici o pseudonimizzati.
7. Consent e data portability sono feature di fiducia future.

**Dynamic Impact CV** è controllato dal lavoratore. Il lavoratore sceglie cosa entra. Il datore di lavoro non può accedervi.

---

## 25. Capability Scope Matrix — Demo / Pilot / Future

Questa matrice definisce lo stato di ogni capacità canonica KORA per ciascun orizzonte di build. Il suo scopo è impedire che le sessioni future di Claude Code, Next, o lavoro di documentazione interpretino capacità canoniche come scope immediato di build.

**Legenda:**
- ✅ Attivo — implementato e funzionante in questo orizzonte
- 🔶 Parziale / Mockup — UI presente, logica sintetica o simulata, non operativo su dati reali
- 🔲 Futuro — canonico ma non in scope per questo orizzonte
- ❌ Bloccato — esplicitamente vietato (Gate o red line)

| Capacità | Foundation Light Demo | Foundation Light Pilot | Future / Governance / Certified | Note / Vincoli |
|---|---|---|---|---|
| KORA Index | ✅ | ✅ | ✅ | Sempre con CS, Activation Safeguard, calibration_status |
| Confidence Score | ✅ | ✅ | ✅ | Inseparabile dal KORA Index. Non sopprimibile. |
| Activation Safeguard | ✅ | ✅ | ✅ | CLEAR/WARNING/FLAGGED. Non bypassabile. |
| Explainability | ✅ | ✅ | ✅ | Formula trace obbligatoria su ogni score |
| AI Onboarding Engine | ✅ (rule-based/BCM) | ✅ | ✅ | Nessun LLM esterno su dati HR/lavoratori |
| Activation Debt | ✅ (sintetico) | ✅ | ✅ | Demo su dati sintetici; interpretazione qualitativa |
| Evidence Debt | ✅ (sintetico) | ✅ | ✅ | Demo su dati sintetici |
| Trust Ledger | 🔶 (architetturale) | ✅ | ✅ | Visualizzazione completa in Pilot/Future |
| No-Surveillance Proof | ✅ | ✅ | ✅ | Privacy boundary components attivi in Demo |
| Additionality Lens | ✅ | ✅ | ✅ | Parte di Initiative Studio |
| Silent Majority Detector | ✅ (sintetico) | ✅ | ✅ | Analytics layer, dati sintetici in Demo |
| Access Equity & Inclusion Evidence Layer | 🔶 (aggregazione sintetica) | ✅ | ✅ | Solo aggregato, sopra privacy threshold. Mai individuale. |
| Activation Intervention Simulator | ✅ (simulazione) | ✅ | ✅ | Simulazione sintetica in Demo |
| HR KPI Correlation Layer | 🔶 (interpretazione sintetica) | 🔶 | ✅ | Correlazione, non causalità. Foundation Light = no predictive claims. |
| People ROI & Outcome Correlation Layer | 🔶 (indicatori direzionali) | 🔶 | ✅ | ROI interpretation only. No causality claims. |
| CSR Evidence Mapping Layer | 🔶 (mockup/demo) | ✅ | ✅ | Disclaimer obbligatorio. Non sostituisce consulenza ESG/legale. |
| Benchmark & Normalization Layer | 🔶 (benchmark sintetici) | 🔶 | ✅ | Benchmark reali richiedono dataset sufficiente. No ranking pubblico. |
| KORA Evolution | 🔶 (longitudinale sintetico) | ✅ | ✅ | Trend su dati sintetici in Demo |
| Public KORA Snapshot | 🔲 (mockup future-vision) | 🔲 | ✅ | Nessuna condivisione reale in Foundation Light |
| LinkedIn / Social Sharing | 🔲 (mockup future-vision) | 🔲 | ✅ | Output comunicazione futuro, non certificazione attiva |
| Board Pack | 🔶 (mockup demo) | 🔶 | ✅ | Struttura visibile in demo; operativo in Pilot/Future |
| KORA Output Library | 🔶 (preview/mockup) | ✅ | ✅ | Export simulation in Demo |
| KORA Value Chain | ❌ | ❌ | ✅ | Non in Foundation Light. Future / Governance / Certified scope only. |
| KORA Certified | ❌ | ❌ | ✅ | Futuro. Richiede validazione metodologica, processo evidence-grade, revisione esterna. |
| Advisor Confidence Stamp | 🔶 (demo) | ✅ | ✅ | Non equivale a Certified |
| Partner Activation Quality | 🔶 (segnale interno) | ✅ | ✅ | No star rating, no leaderboard pubblica |
| Worker Consent & Data Portability | 🔶 (privacy controls demo) | 🔶 | ✅ | Solo sintetico in Foundation Light |
| KORA Impact Pledge / Economic Contribution Intent | 🔶 (mockup intent) | 🔶 | ✅ | KORA non esegue pagamenti. No wallet. Nessun payment execution in qualsiasi orizzonte. |

**Nessuna capacità contrassegnata 🔲 o ❌ può essere costruita in Foundation Light.**
**Nessuna capacità può contraddire Gate 2, Gate 3, o Gate 5.**
**Una capacità canonica non è permesso di costruirla ora.**

---

## 26. Foundation Light — Current Demo Boundary

**Stack tecnico:**
- Next.js 14+ App Router
- TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Dati sintetici locali (JSON seed files)
- Mock service layer
- Role/Scenario/Persona switcher

**Vincoli attivi:**
- Nessun SQL DDL
- Nessun Prisma
- Nessun Supabase (production mode)
- Nessuna migration
- Nessuna auth di produzione
- Nessuna chiamata LLM esterna su dati HR/lavoratori
- Nessun pagamento / wallet / marketplace
- Nessuna KORA Link operational logic
- Nessun dato lavoratore reale
- Nessun output fiscale live
- Nessuna dichiarazione certified pubblica
- Nessuna condivisione pubblica reale

**Route attuali:**
```
/
/demo-guide
/company
/company/kora-index
/company/activation
/company/contribution
/company/pillars
/company/data
/company/ingestion
/company/uef-review
/company/scoring
/company/reports
/company/financial
/my-kora
/my-kora/privacy
/my-kora/dynamic-cv
/my-kora/opportunities
/my-kora/bookings
/my-kora/collective
/admin
/admin/ai-onboarding
/admin/portfolio
/admin/index-registry
/admin/benchmarks
/admin/network
/admin/gtm
/partner
/advisor
/future-vision
```

### Do Not Build Yet — Explicit Deferred Scope

Le seguenti capacità sono canoniche ma esplicitamente fuori dallo scope corrente. Nessuna sessione futura di Claude Code o developer può costruirle senza un cambio formale di scope approvato dal founder.

- SQL DDL di qualsiasi tipo
- Prisma schema o `prisma generate`
- Supabase production schema o client SDK (production mode)
- Production RBAC / RLS
- Real worker accounts o dati lavoratori reali
- Real company data ingestion
- Live HRIS / LMS / welfare provider integrations
- Payment execution di qualsiasi tipo
- Wallet
- Marketplace
- Booking engine transazionale
- Real KORA Impact Pledge execution
- Real LinkedIn / social publishing
- Public company ranking
- KORA Certified claims (in Foundation Light o Pilot non certificato)
- KORA Value Chain production module
- Real HR KPI predictive analytics (con claim di causalità o accuratezza predittiva)
- Causal ROI engine
- Chiamate LLM esterne su dati HR o dati lavoratori

---

## 27. Gate and Prohibition Rules

**Gate 2 (OPEN):** blocca SQL DDL, Prisma, Supabase production, backend production services, database migrations, production RBAC/RLS.

**Gate 3 (OPEN):** blocca live data ingestion, real worker accounts, real HRIS/LMS integrations, production auth.

**Gate 5 (OPEN):** blocca live fiscal/tax classification outputs, automated guardrail enforcement, tax-advice outputs.

**9 proibizioni assolute:**
1. Nessun SQL, Prisma, o Supabase production prima della chiusura di Gate 2.
2. Nessuna chiamata a LLM esterni su dati HR o dati lavoratori.
3. Nessun pagamento, wallet, checkout, voucher o KIP execution.
4. Nessun ranking individuale dei lavoratori.
5. Nessuna visibilità employer su dati individuali dei lavoratori. Mai.
6. Nessuna dichiarazione certified pubblica in Foundation Light.
7. Nessuna garanzia di compliance CSR/ESG.
8. Nessuna rivendicazione di causalità ROI in Foundation Light.
9. Nessun benchmark/ranking pubblico in Foundation Light.

---

## 28. Claims Policy

| ✅ Si può dire | ❌ Non si può ancora dire |
|---|---|
| KORA misura l'attivazione organizzativa verificata. | KORA prova scientificamente l'impatto umano. |
| KORA fornisce intelligenza diagnostica pilot-grade. | KORA certifica la compliance ESG. |
| KORA separa l'intelligenza aziendale dal layer personale del lavoratore. | KORA garantisce la conformità CSRD/ESRS. |
| KORA aiuta a identificare Activation Debt e next best actions. | KORA migliora la retention. |
| KORA supporta il contesto CSR/ESG attraverso evidenze people strutturate. | KORA riduce l'assenteismo. |
| KORA espone Activation Debt e Evidence Debt. | KORA riduce il turnover. |
| KORA confronta segnali di attivazione con KPI HR come correlazione/contesto. | KORA causa miglioramenti di produttività. |
| KORA supporta l'interpretazione ROI, non la causalità ROI. | KORA valuta i dipendenti. |
| KORA può produrre futuri segnali di fiducia pubblici con strict safeguards. | KORA produce rating pubblici certificati in Foundation Light. |

---

## 29. Buyer-Specific Narrative

### A. CHRO
Focus: distribuzione dell'attivazione, engagement della workforce, silent majority, efficacia dei programmi people, correlazione retention, contesto engagement.
Messaggio chiave: "KORA ti mostra dove i programmi people raggiungono l'organizzazione e dove rimangono escluse le persone che ne avrebbero più bisogno."

### B. CFO
Focus: budget vs attivazione, spesa senza attivazione significativa, costo per meaningful activation, ROI interpretation, accountability delle decisioni.
Messaggio chiave: "KORA ti mostra dove il budget people produce attivazione reale e dove viene sprecato senza raggiungere la workforce."

### C. ESG / Sustainability Lead
Focus: CSR Evidence Mapping, ESRS S1/S3, GRI, ISO 26000, qualità delle evidenze, dati sociali report-ready.
Messaggio chiave: "KORA è il people evidence layer che mancava al tuo processo di rendicontazione ESG — strutturato, verificato, spiegabile e non un'auto-dichiarazione."

### D. CEO
Focus: layer umano della maturità organizzativa, rischio, fiducia, direzione di miglioramento, reputazione pubblica futura.
Messaggio chiave: "KORA ti dà il layer di intelligenza che trasforma le iniziative people in un asset organizzativo misurabile e comunicabile."

### E. Investor / Advisor
Focus: category creation, metodologia, architettura privacy, activation intelligence, evidence moat, commercial wedge, future data moat.
Messaggio chiave: "KORA crea una nuova categoria — Human Impact Intelligence — con un moat costruito su dati longitudinali di attivazione, architettura privacy-by-design e un ecosistema advisor/partner non replicabile rapidamente."

### F. HR Analytics / People Analytics
Focus: correlation layer, confronto KPI, attivazione per segmento, benchmark, trend longitudinali.
Messaggio chiave: "KORA collega la misura dell'attivazione people ai KPI HR che già conosci, aggiungendo il layer di causalità interpretativa che i tool analytics tradizionali non hanno."

### G. Employer Brand / Communications
Focus: Public KORA Snapshot, LinkedIn sharing, trust signals, iniziative verificate, no overclaim.
Messaggio chiave: "KORA ti permette di comunicare l'impatto people verso l'esterno con evidenza verificata — senza overpromise e senza esporre dati individuali."

---

## 30. Moat and Defensibility

**Moat potenziale (da costruire con clienti, dati e adozione):**
1. Metodologia versioned e audit-ready
2. Dataset longitudinale di attivazione organizzativa
3. Architettura trust/privacy (no employer visibility into individual data)
4. Ecosistema advisor/partner
5. Category creation (Human Impact Intelligence Platform)
6. Activation memory longitudinale
7. Orchestration loop (dall'insight all'azione verificata)
8. CSR/ESG evidence mapping layer
9. HR KPI correlation dataset nel tempo
10. ROI interpretation dataset nel tempo
11. Trust Ledger come standard di tracciabilità
12. Public Snapshot come trust layer comunicabile
13. KORA Value Chain come estensione futura ESG supply chain
14. Activation Flywheel come lock-in intelligente (più dati → migliore intelligenza → migliore allocation → più dati)

**Dichiarazione onesta:**
Il moat reale richiede clienti, dati, utilizzo, calibrazione empirica e adozione dell'ecosistema. Foundation Light è la prova di concetto della categoria e dell'architettura. Il moat si costruisce con i pilot.

---

## 31. Category Control — Anti-Drift Rules

| Se KORA comincia a sembrare... | Correggi verso... |
|---|---|
| Welfare platform | Activation intelligence e orchestrazione |
| HR dashboard | Attivazione organizzativa e evidenza |
| ESG platform | People evidence layer a supporto del contesto CSR/ESG |
| Marketplace | KORA Activation Network |
| Wallet / payment | Contribution intent e governance only |
| Surveillance | Intelligenza aziendale aggregate-only + worker-owned personal layer |
| Gamification | Rimuovi ranking, reward, streak, leaderboard |
| Public ranking | Verified snapshot senza ranking, senza certified claim senza tier |

---

## 32. Execution Priorities After This Document

| Priorità | Task |
|---|---|
| P1 | Consolidamento documentale canonico (questo documento) |
| P2 | Allineamento Italian-first della copy della piattaforma |
| P3 | Documentazione del CSR Evidence Mapping Layer |
| P4 | Documentazione dell'HR KPI Correlation Layer |
| P5 | Documentazione del People ROI & Outcome Correlation Layer |
| P6 | Framing Activation Debt / Evidence Debt / Trust Ledger |
| P7 | Framing futuro del Public KORA Snapshot & Social Trust Layer |
| P8 | Framing Initiative Studio / Additionality Lens più robusto |
| P9 | Demo lens per buyer specifici (CHRO, CFO, ESG Lead, CEO) |
| P10 | Board Pack e Output Library mockup — solo dopo che il core story è chiaro |

---

## 33. Existing Document Alignment Plan

La tabella seguente elenca i documenti esistenti che richiedono aggiornamento di allineamento con questo master. Nessun documento viene riscritto ora. Questo documento ha autorità su tutti.

**Priorità di aggiornamento:**
- **A — Prima del prossimo prompt di codice o prodotto** — questi documenti guidano build e demo attivi; un disallineamento causa errori immediati
- **B — Prima della prossima demo a stakeholder esterni** — questi documenti guidano il posizionamento e la compliance della demo
- **C — Possono essere aggiornati successivamente** — contenuto storico o strategico, non operativo nel ciclo corrente

---

### A — Aggiornare prima del prossimo prompt di codice o prodotto

| Documento | Perché aggiornare ora | Cosa deve cambiare | Cosa non deve cambiare | Impatto |
|---|---|---|---|---|
| `CLAUDE.md` | Guida ogni sessione Claude Code; deve riflettere EQ corretto, moduli A–P, Italian-first, Capability Scope Matrix | Correggere EQ nella tabella componenti; aggiungere riferimento a questo documento; riflettere Italian-first in §12 | Red lines, gate rules, coding principles | Codice — critico |
| `build-readiness-brief.md` | Usato per valutare readiness del build; mancano moduli A–P e Capability Scope Matrix | Aggiungere Phase 1M come milestone; aggiungere checklist nuovi moduli; aggiungere riferimento Capability Scope Matrix | Struttura del brief | Solo docs |
| `24-foundation-light-product-functional-spec.md` | Specifica prodotto usata per build; mancano CSR Evidence Mapping, HR KPI Layer, Additionality Lens, Italian-first policy | Aggiungere sezioni per moduli nuovi; aggiungere language policy; aggiornare screen spec con nuovi moduli | Spec prodotto core, ruoli, permission matrix | Docs + codice |
| `26-foundation-light-technical-build-handoff.md` | Guida tecnica per developer; mancano route Initiative Studio e riferimenti moduli A–P | Aggiungere route activation per Initiative Studio; aggiornare lista mock services; aggiungere CSR/HR KPI context layer references | Tech stack, folder structure, mock service discipline | Codice |
| `demo-walkthrough.md` | Script narrativo della demo; ancora in inglese/old positioning; manca KORA Activation Network language | Aggiornare language Italian-first; aggiungere narrative Activation Debt/Evidence Debt; sostituire "marketplace" con KORA Activation Network | Struttura della demo, scenario flow | Solo docs |

---

### B — Aggiornare prima della prossima demo a stakeholder esterni

| Documento | Perché aggiornare prima della demo | Cosa deve cambiare | Cosa non deve cambiare | Impatto |
|---|---|---|---|---|
| `18-foundation-light-mvp-build-scope.md` | Scope MVP non include Initiative Studio e Activation Orchestration Engine | Aggiungere Initiative Studio e Activation Orchestration Engine nello scope; aggiornare Capability Scope Matrix | Scope quattro layer | Docs + codice |
| `22A-foundation-light-demo-build-cutline.md` | Build cutline non include Initiative Studio né Capability Scope Matrix | Aggiungere Initiative Studio, Activation Orchestration Engine; aggiungere sezione "Do Not Build Yet" | Cutline categorie A/B/C/D | Docs + codice |
| `23-code-readiness-audit-and-canonical-doc-map.md` | Catalogo moduli obsoleto; mancano moduli A–P | Aggiornare catalogo; aggiungere nuovi moduli; aggiungere cross-reference a questo documento | Audit authority hierarchy | Solo docs |
| `21b-methodology-risk-acceptance-and-provisional-score-policy.md` | Policy governance v0.1 non copre Public Snapshot, Certification path, Advisor Confidence Stamp | Aggiungere sezioni per Public Snapshot claims policy, Certification path constraints, disclaimer ESG | Governance v0.1, calibration_status rules | Docs + futuro codice |
| `27-gate-2-cto-architecture-review-pack.md` | CTO review pack non riflette footprint nuovi moduli | Aggiungere footprint moduli A–P; aggiornare KORA Activation Network language; aggiungere Capability Scope Matrix reference | Gate 2 conditions, architecture decisions | Solo docs |

---

### C — Possono essere aggiornati successivamente

| Documento | Cosa deve cambiare | Cosa non deve cambiare | Impatto |
|---|---|---|---|
| `01-foundational-product-brief.md` | Aggiungere language policy Italian-first; nuovi moduli A–P; CSR Evidence Mapping | Posizionamento KORA e categoria | Solo docs |
| `02-product-architecture-tiering-pricing.md` | Sostituire "marketplace" con KORA Activation Network; aggiungere Certification path | Struttura dei tier | Solo docs |
| `03-business-model-revenue-architecture.md` | Aggiungere Board Pack, Output Library, Certification path | Revenue model | Solo docs |
| `04-fiscal-policy-eligibility-layer.md` | Solo aggiungere cross-reference a questo documento | Tutto | Solo docs |
| `05-eligibility-confidence.md` | Solo aggiungere cross-reference a questo documento | Tutto | Solo docs |
| `06-methodological-constitution.md` | Aggiungere livelli additionality (7), Trust Ledger, nuovi moduli | Metodologia core | Solo docs |
| `10-architecture-v3-layer-specification.md` | Aggiungere riferimenti ai moduli A–P; Trust Ledger; Activation Debt; CSR layer; EQ corretta | 14-stage algorithm, IU formula, 10 componenti | Docs + futuro codice |
| `11-economic-fiscal-architecture-integration.md` | Aggiungere regole contribution intent; chiarire KORA non è wallet | Architettura economica | Solo docs |
| `19-ai-ingestion-engine-placement.md` | Già accurato — solo aggiungere cross-reference | Tutto | — |
| `20-foundation-light-technical-implementation-plan.md` | Aggiungere Phase 1M canonical doc step | Piano tecnico | Solo docs |
| `25-demo-dataset-and-scenarios-spec.md` | Solo aggiungere cross-reference a questo documento | Dati sintetici | — |
| `phase-1k-activation-orchestration-and-additionality-recovery.md` | Superseded nelle sezioni orchestration e additionality; aggiungere cross-reference | Deliverable completati Phase 1K | Solo docs |

---

## 34. Final Decision

Questo documento è il riferimento canonico dell'architettura di prodotto per KORA Foundation Light e per tutte le future decisioni di prodotto. Ogni lavoro futuro — di codice, product, UX, pitch, demo, metodologia, commerciale o documentazione — non deve contraddirlo.

Il documento Authority Hierarchy applicabile:

1. **doc 21** (D-01–D-21, founder gate decisions) — override su tutto
2. **Questo documento** (`kora-canonical-product-architecture-v1.md`) — override su tutti i documenti di prodotto e architettura
3. **doc 10** (Architecture v3) — override su tutte le decisioni di schema
4. **doc 21b** (methodology governance) — override su tutti gli output display
5. **doc 22A** (build cutline) — override su tutte le decisioni di scope
6. **docs 24, 25, 26** — dettagli del demo build
7. **Appendix B, WhitePaper v3/v4** — solo storico; non usare per implementazione

---

**Before coding or modifying product documentation, read docs/kora-canonical-product-architecture-v1.md. Do not contradict it.**

**If a future prompt conflicts with this document, the prompt must be corrected before execution.**
