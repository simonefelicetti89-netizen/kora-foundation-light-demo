# KORA — OFFICIAL IMPLEMENTATION MASTER PLAN v2.0

**Architecture Freeze + Execution Manual · 26 agosto 2026**
**Sostituisce ogni piano precedente. Da qui si esegue: KORA non si ridisegna più durante lo sprint.**

Provenienza: **[VERIFIED]** letto nel codice · **[INFERRED]** dedotto · **[DECISION REQUIRED]** · **[UNKNOWN]** · **[EXTERNAL]**

---

# 1. EXECUTIVE VERDICT

La v2.0 congela l'ontologia prima del calendario. È la correzione giusta: senza oggetti di dominio stabili, i blocchi dei giorni 26-30 inventerebbero architettura in cinque giorni.

**La verifica sul codice ha migliorato l'ontologia.** KORA modella già relazioni cross-tenant in due punti: `commons.booking` ha `worker_tenant_id` e `post_tenant_id` — un lavoratore di un'azienda che prenota presso un'iniziativa promossa da un'altra — con il controllo di confine già implementato in SECURITY DEFINER **[VERIFIED]**; e `collective-initiatives.json` contiene `initiative_type: cross_company_volunteering`, `territory`, `companies_involved` come array, `partner_id` e `privacy_threshold_met` **[VERIFIED]**. Territorio e co-finanziamento **non sono capability future: sono forme già presenti, non ancora tipizzate.**

Ne discende la struttura a tre livelli della §3: **ProgramDefinition** (può essere di un'azienda, di un partner o di un territorio) → **ProgramParticipation** (la quota di una singola azienda, tenant-scoped) → **InvestmentCase** (l'impegno decisionale di quella partecipazione per un ciclo). Con `tenant_id NOT NULL` su Program, i programmi territoriali richiederebbero un refactor distruttivo entro un anno. Con questa separazione, non serve.

Il resto della v1.2 regge. Le aggiunte sostanziali sono: **Read-Before-Write** come protocollo obbligatorio, **Contract Freeze entro il giorno 12** per i sei contratti dei blocchi finali, **Score Role Matrix** che elimina la percezione di cinque punteggi concorrenti, e la distinzione **Methodology DECIDED (g. 22) → COMPLETED (g. 30)**.

Nessuna nuova feature. Nessun cambio di categoria. Il perimetro resta intero.

---

# 2. NON-NEGOTIABLE PRINCIPLES

1. **One Product, One Truth.** I dati demo possono essere sintetici. La logica no.
2. **Read Before Write.** Nessuna modifica senza verifica dello stato reale. Il codice è la verità operativa; il piano è la verità architetturale; Claude Code le riconcilia **prima** di scrivere.
3. **No destructive refactor by default.** Non si cancella per assenza di caller, non si rinominano entità di dominio, non si cambiano formule, pesi, RLS o output pubblici senza autorizzazione esplicita.
4. **Il perimetro non si riduce.** Impact Unit, KORA Index, Confidence, Activation Debt, Safeguard, Contribution, Financial Intelligence, KPI HR, PIB, KORA Link, worker layer, Dynamic CV, worker opportunities, activity discovery, Partner Network, Commons, booking, iniziative territoriali, percorsi cross-company, benchmark, ecosystem layer: **tutti preservati**.
5. **Gli eventi non si riscrivono.** Decision Memory è append-only. Amendment e restatement preservano sempre la sequenza originale.
6. **L'ambiguità semantica non diventa mai precisione numerica.**
7. **Nessun oggetto di dominio entra nel sistema senza** tenant ownership, strategia RLS, privacy level, regola di aggregazione e auditabilità.
8. **Il worker layer è architettura di misura**, non rete futura.

---

# 3. KORA OFFICIAL DOMAIN ONTOLOGY

## 3.0 La correzione strutturale

Un programma **non è sempre di una sola azienda**. Può essere territoriale, co-finanziato, promosso da un partner o da un ente locale. Se `Program` avesse `tenant_id NOT NULL`, ogni programma condiviso richiederebbe un refactor distruttivo.

Struttura a tre livelli:

```
PROGRAM DEFINITION        cosa è il programma — può essere condiviso
       │                  owner: company | partner | territory | consortium
       ▼
PROGRAM PARTICIPATION     la quota di UNA azienda — tenant-scoped, RLS
       │                  budget, popolazione, eleggibilità
       ▼
INVESTMENT CASE           l'impegno decisionale di quella partecipazione,
                          per UN ciclo — versionato, congelato al commit
```

Un programma interno classico è il caso degenere: una definizione con una sola partecipazione. **Nessuna complessità aggiuntiva nel caso semplice, nessun refactor nel caso complesso.**

## 3.1 Oggetti fondamentali

### ORGANIZATION (`analytics.tenant`) — esistente **[VERIFIED]**
**Purpose** l'impresa cliente · **Identity** `tenant_id` · **Lifecycle** stateful · **Mutability** mutabile · **Tenancy** è la radice · **Privacy** business data · **Versioning** no · **Source of truth** DB.

### PROGRAM DEFINITION — nuovo
**Purpose** cosa è il programma, indipendentemente da chi lo finanzia.
**Identity** `program_definition_id`.
**Ownership** `owner_type`: `company` | `partner` | `territory` | `consortium`; `owner_ref` polimorfo.
**Tenancy** **nullable** — un programma territoriale non appartiene a un tenant.
**Relations** → `action_family`, `pillar`, `partner_ids[]`, `territory_ref`.
**Lifecycle** `DRAFT → PUBLISHED → ARCHIVED`.
**Mutability** mutabile prima di avere partecipazioni impegnate; poi versionata.
**Privacy** business data, nessun dato individuale.
**Source of truth** DB.
> Assorbe la forma già presente in `collective-initiatives.json`: `initiative_type`, `territory`, `companies_involved[]`, `partner_id` **[VERIFIED]**.

### PROGRAM PARTICIPATION — nuovo
**Purpose** la partecipazione di **una** azienda a una definizione.
**Identity** `participation_id` · **Tenancy** `tenant_id NOT NULL`, RLS piena.
**Relations** → ProgramDefinition (N:1), → InvestmentCase (1:N per ciclo).
**Attributi** `budget_allocated/committed/spent`, `spend_nature` (`discretionary`|`mandatory`|`mixed` + `mandatory_share`), `target_population_descriptor`, `target_population_size ≥ 10`, `eligibility_scope`.
**Lifecycle** `PLANNED → ACTIVE → CLOSED`.
**Privacy** aggregati only, N≥10.

### INVESTMENT CASE — nuovo
**Purpose** l'impegno decisionale per un ciclo. **Non è il contenitore universale**: è la definizione decisionale della partecipazione per un ciclo.
**Identity** `case_id`; `participation_id` + `cycle_index` uniche.
**Lifecycle** `DRAFT → COMMITTED → ACTIVE → REVIEWABLE → REVIEWED → CLOSED | NEXT_CYCLE`.
**Mutability** **immutabile dopo COMMITTED** salvo amendment versionato.
**Versioning** `version` + `ProgramAmendment` con `after_first_observation` calcolato dal sistema.
**Relations** → EvidencePlan (1:1), → DecisionRule[] (1:N), → InvestmentReview (1:1).
**Modes** `prospective` | `retrospective` (indelebile).

### EVIDENCE PLAN · DECISION RULE — nuovi
Congelati al commit dell'Investment Case. `DecisionRule` è **regola versionata impegnata**: `metric` da vocabolario chiuso, `operator`, `threshold`, `minimum_confidence`, `decision_if_triggered`, `origin` (`company`|`kora_recommended`).

### DELIVERY / OPPORTUNITY — parzialmente esistente
**Purpose** come il programma raggiunge le persone: provider interno, partner, policy strutturale, opportunità prenotabile.
**Esistente** `services/worker-opportunity`, `activity-discovery`, `commons.booking` con `worker_tenant_id` e `post_tenant_id` **[VERIFIED]**.
**Relations** → ProgramDefinition, → Partner, → Booking.

### OBSERVATION — evento
**Purpose** record temporale di ciò che è accaduto: eligible, exposed, aware (nullable), activated, evidenza raccolta.
**Mutability** **append-only** · **Privacy** N≥10 sempre · **Identity** `observation_id` + `period`.

### MEASUREMENT — derivato
Impact Unit, KORA Index, Confidence, Activation Debt, Contribution. **Deriva** da Observation + MethodologySnapshot. Porta sempre `lineage_id`.

### INVESTMENT REVIEW — stato + evento
**Purpose** il momento decisionale di un ciclo. **Relations** → InvestmentCase (1:1), → DecisionEvent (1:N).
**Contiene** regola scattata, esito indicato, capitale classificato, `review_blocked_reason` se non decidibile.

### DECISION EVENT — evento append-only
Campi minimi: `indicated_decision`, `actual_decision`, `rationale_category`, `intervention`, `effective_date`, `supersedes`, `methodology_snapshot_id`, `program_version`, `case_version`, `decision_owner` (**ruolo organizzativo, mai persona**).

### SUBSEQUENT OBSERVATION — derivato
Il collegamento fra un DecisionEvent e le osservazioni del ciclo successivo. Si popola al secondo ciclo reale.

## 3.2 Attori e infrastrutture trasversali

| Oggetto | Stato | Tenancy | Privacy | Nota |
|---|---|---|---|---|
| **WORKER** (`personal.worker_identity`) | esistente **[VERIFIED]** | **nessun `tenant_id`** — isolamento per identità | massima | è la traduzione schematica della non-visibilità |
| **PIB** (`personal.worker_pib`) | esistente, con `reporting_period` e indice cross-periodo **[VERIFIED]** | nessuno | massima | nessuna policy applicativa: solo SECURITY DEFINER |
| **PARTNER** (`network.partner_*`) | esistente | nessun `tenant_id` | business | lato offerta |
| **ADVISOR** | esistente | tenant o partner | business | validazione evidenze |
| **TERRITORY / LOCAL ENTITY** | **da tipizzare** | nessuno | business | oggi vive come stringa `territory` nei seed **[VERIFIED]** |
| **EVIDENCE** | esistente | tenant | variabile | scala EV L1–L4 |
| **BENCHMARK COHORT** | nuovo | **nessuno** | k≥10 aziende | chiave `sector × workforce × period` |
| **METHODOLOGY SNAPSHOT** | parziale **[VERIFIED]** | nessuno | nessuna | immutabile |
| **DATA LINEAGE** | nuovo | tenant | nessuna | ricostruibilità |
| **KORA LINK** (`kora_link.*`) | esistente, gap DG-07 chiusi **[VERIFIED]** | ponte | massima | FUTURE CORE |
| **KORA CONTRIBUTION** | esistente **[VERIFIED]** | tenant | aggregata | companion indicator |

---

# 4. DOMAIN RELATIONSHIP MAP

```
                    TERRITORY ──┐
                    PARTNER ────┤
   ORGANIZATION ────────────────┴──▶ PROGRAM DEFINITION
        │                                    │
        │                                    │ 1:N
        └──────── 1:N ──▶ PROGRAM PARTICIPATION
                                  │
                                  │ 1:N (per ciclo)
                                  ▼
                          INVESTMENT CASE ──┬──▶ EVIDENCE PLAN
                                  │          └──▶ DECISION RULE[]
                                  │
                                  ▼
                    DELIVERY / OPPORTUNITY ──▶ BOOKING ──▶ PARTNER
                                  │              (worker_tenant × post_tenant)
                                  ▼
              OBSERVATION (eligible→exposed→aware→activated)  ◀── WORKER, PIB
                                  │
                                  ▼
                    MEASUREMENT (IU · Index · Confidence ·
                    Activation Debt · Contribution · BTI)
                                  │  ◀── METHODOLOGY SNAPSHOT
                                  │  ──▶ DATA LINEAGE
                                  ▼
                          INVESTMENT REVIEW
                                  │
                                  ▼
                    DECISION EVENT (append-only)
                                  │
                          ┌───────┴────────┐
                          ▼                ▼
                 DECISION MEMORY    BENCHMARK MEMORY
                  (vista derivata)   (record minimizzato)
                          │
                          ▼
                  SUBSEQUENT OBSERVATION ──▶ nuovo INVESTMENT CASE
```

**I sei casi che questa ontologia deve reggere senza refactor** — e regge:

| Caso | Come |
|---|---|
| Programma aziendale interno | Definition `owner_type=company` + 1 Participation |
| Programma importato retrospettivamente | Case `mode=retrospective` |
| Programma con provider | Definition → Delivery `existing_provider` |
| Programma territoriale | Definition `owner_type=territory`, `tenant_id` null, N Participation |
| Co-finanziato da più aziende | idem, ogni azienda ha budget e Case propri |
| Opportunità prenotabile dal lavoratore | Delivery → Booking, pattern `worker_tenant × post_tenant` già esistente **[VERIFIED]** |
| Programma multi-ciclo | Participation → N Investment Case, legati da `program_family` |

---

# 5. STATE VS EVENT MODEL

| Oggetto | Tipo | Mutabilità | Enforcement |
|---|---|---|---|
| Organization | **state** | mutabile | — |
| Program Definition | **state** | versionata dopo la prima partecipazione impegnata | app |
| Program Participation | **state** | mutabile fino a COMMITTED del Case | app |
| Investment Case | **versioned state** | **immutabile dopo COMMITTED**; amendment crea versione | trigger DB |
| Evidence Plan · Decision Rule | **committed versioned rule** | congelate al commit | trigger DB |
| Observation | **event** | **append-only** | trigger DB |
| Measurement | **derived** | ricalcolabile, ma ogni risultato persistito porta snapshot e lineage | — |
| Investment Review | **state + event** | lo stato si chiude, gli eventi restano | — |
| **Decision Event** | **event** | **append-only, I13** — nessun UPDATE, nessun DELETE; correzione = nuovo evento con `supersedes` | **trigger DB** |
| Decision Memory | **derived view** | derivata dagli eventi | — |
| Benchmark Memory | **derived, minimized** | derivazione unidirezionale, banding versionato | — |

**Regola**: nessuna tabella mutabile per eventi che devono avere valore storico. Una memoria che si può riscrivere non è memoria.

---

# 6. SCORE ROLE MATRIX

Elimina la percezione di punteggi concorrenti.

| Costrutto | Cosa misura | Livello | Usato per | **NON** usato per | Visibile in | Può far scattare una decisione? | Dipende da |
|---|---|---|---|---|---|---|---|
| **Impact Unit** | intensità di attivazione di un evento | evento | comporre Index e Capital Map | confronti fra aziende | Evidence | no, è materia prima | tassonomia, BC, CQ, EV, CF, AGF, NM |
| **KORA Index** | attivazione complessiva del portafoglio | azienda/periodo | lettura sintetica, benchmark | decidere da solo | Portfolio/Explain, Cockpit/Overview | **no** — decide la Decision Rule | IU |
| **Confidence Score** | **quanto ci si può fidare del dato**, non quanto è buono il risultato | azienda/programma | qualificare ogni numero; soglia nelle regole | **mai dentro l'Index — peso zero permanente** **[VERIFIED]** | **sempre accanto al numero** | **sì, come condizione** | evidenza, completezza, mapping, verifica |
| **Activation Debt** | quota di spesa senza attivazione misurabile | azienda/programma | Capital Map | giudizio sul management | Portfolio | indirettamente | IU, budget |
| **Safeguard** | tutela contro attivazione anomala o gaming | evento/programma | integrità del dato | performance | Evidence | blocca, non decide | tassonomia, osservazioni |
| **BTI / Financial Intelligence** | traduzione economica dell'attivazione | azienda | Capital Map, Economic Case | ROI causale | Portfolio/Explain | no | Capital Map |
| **KORA Contribution** | valore generato **oltre i confini dell'impresa** | azienda/ecosistema | lettura ecosistemica | Index, Capital Map | People/Explain | no | commons, territorio |
| **Economic Case** | esposizione economica osservata | azienda | conversazione con il CFO | pseudo-ROI | Portfolio | no | Capital Map, KPI HR |
| **Benchmark** | posizione relativa e traiettoria | coorte | contesto | ranking del management | Cockpit, Portfolio | no | Benchmark Memory |

**La frase che risolve la confusione**: *l'Index misura, il Confidence qualifica, il Capital Map traduce in euro, la Decision Rule decide, la Decision Memory ricorda, il Benchmark confronta, la Contribution guarda fuori.* Sette ruoli, nessuna sovrapposizione.

---

# 7. TARGET ARCHITECTURE

```
   PROGRAM DEFINITION (company | partner | territory | consortium)
        → PARTICIPATION (per azienda) → INVESTMENT CASE (per ciclo)
        → EVIDENCE PLAN + DECISION RULES (congelate al commit)
        → DELIVERY / OPPORTUNITY → PARTNER → BOOKING
        → ELIGIBLE → EXPOSED → AWARE → ACTIVATED
        → EVIDENCE → IMPACT UNIT → KORA INDEX (+ Confidence, Safeguard, Debt)
        → CAPITAL MAP → ECONOMIC CASE (KPI HR, Financial Intelligence)
        → INVESTMENT REVIEW → DECISION EVENT
        → DECISION MEMORY → BENCHMARK → nuovo ciclo

   TRASVERSALI: worker layer · PIB · KORA Link · Contribution · Dynamic CV
                METHODOLOGY SNAPSHOT · DATA LINEAGE · privacy/anonymity
```

---

# 8. ARCHITECTURE REGISTRY

**Due sezioni distinte, mai confuse.**

**A — Componenti di codice.** `lib/architecture/registry.ts` tipizzato (fonte unica) → `scripts/generate-architecture-doc.ts` → `docs/ARCHITECTURE_REGISTRY.md` derivato. Stati: `CANONICAL` `CONSOLIDATE` `COMPLETE` `FROZEN` `FUTURE_CORE` `LEGACY` `DEAD` `INVESTIGATE`. `DEAD` richiede `deletableWhen` **e** `decisionRef`. Granularità: componenti di dominio (~75) — `services/*`, superfici top-level `app/*`, moduli `lib/kora-engine/*`, directory di dominio in `lib/`. **Esclusi**: helper, componenti UI, utility.

**B — Target Ontology Objects.** Sezione separata: per ogni oggetto della §3, stato di implementazione (`EXISTS` | `PARTIAL` | `TO BUILD`), tabelle, servizi, blocco che lo realizza. **Il registro descrive il codice, l'ontologia descrive il dominio.**

Invariante **I10**: fallisce se un componente di dominio non è registrato, se un `DEAD` manca dei due campi, se il Markdown è disallineato.

---

# 9. CONSTITUTIONAL INVARIANTS

| # | Invariante | Stato | Quando |
|---|---|---|---|
| I1 | Nessun accesso aziendale a record individuali | parziale **[VERIFIED]** | CC-002 |
| I2 | N≥10 ovunque, nessuna costante duplicata (gap: `app/company/activation/page.tsx:24`) **[VERIFIED]** | gap | CC-002 |
| I3 | Isolamento PIB (nessuna policy applicativa, mig 027) **[VERIFIED]** | ok | — |
| I4 | KORA Link identità da `auth.uid()` **[VERIFIED]** | ok | — |
| I5 | Protezione differencing su filtri combinabili | gap lato company | CC-002 |
| I6 | Confidence esterno all'Index, peso zero | dichiarato, non forzato | CC-002 |
| **I7** | **Golden cases IU, ≥20 casi, al centesimo** | **assente** | **CC-002** |
| I8 | Isolamento a due tenant | solo E2E che salta **[VERIFIED]** | CC-002 |
| I9 | Allowlist import sintetici → 0 | assente | CC-002 |
| I10 | Registro completo | assente | CC-003 |
| I11 | Snapshot metodologico su ogni risultato persistito | colonne esistono **[VERIFIED]** | B-SNAP |
| I12 | Ogni numero decisionale ricostruibile fino alla sorgente | assente | B-LIN |
| **I13** | **Decision Event append-only** — trigger DB, non convenzione | assente | N8 |
| **I14** | **Ogni nuovo oggetto di dominio ha tenant ownership, RLS, privacy level, regola di aggregazione, auditabilità** | assente | N1 |

---

# 10. METHODOLOGY

**Formula attiva**: `IU = NM × BC × CQ × EV × CF × AGF` **[VERIFIED]**.
**Contratto completo**: include DF, EXF, SF come opzionali definiti e non attivi.

| Fattore | Stato | Nota |
|---|---|---|
| NM | `canonical` con fallback | — |
| **BC** | `provisional`, **literal in `IUComputationService.ts:16-29`** **[VERIFIED]** | → configurazione versionata (B-BC) |
| CQ | `provisional`, penalità a scalini | consolidabile: i campi mancanti sono già tracciati |
| EV | `provisional`, **fallback 0.5 su tipo non mappato** **[VERIFIED]** | chiudibile completando la mappa dei tipi |
| **CF** | **`proxy`** su sede/cluster; il codice vieta di presentarlo come canonico **[VERIFIED]** | richiede storia cross-periodo: limite di tempo, non di codice |
| AGF | `canonical` | — |
| **DF** | non implementato — Durability Factor 1.00–1.30, solo LEGACY **[VERIFIED]** | famiglia `future_and_legacy` esiste **[VERIFIED]** |
| **EXF** | non implementato — Externality Factor 1.00–1.20, solo IMPACT **[VERIFIED]** | famiglia `territorial_impact` esiste **[VERIFIED]** |
| **SF** | non implementato — Strategic Fit 0.80–1.10, richiede evidenza documentata **[VERIFIED]** | esiste un tipo evidenza adeguato? **[TO VERIFY IN CC-044]** |

> **Avvertenza obbligatoria**: vecchio CF = *Context Fit*; CF attuale = *Continuity Factor*; Context Fit **confluito in SF** **[VERIFIED]**. Implementare SF senza saperlo produce doppio conteggio con CF.

Stati metodologici: `canonical` · `provisional` · `proxy` · `fallback`. **Mai bollini in UI**: vivono nel dato e nel Methodology Appendix.

---

# 11. METHODOLOGY SNAPSHOT

Immutabile, per ogni risultato persistito. Contiene: `methodology_version` · `taxonomy_version` · `bc_calibration_version` · `factor_statuses` (jsonb) · `pipeline_version` · `config_hash` · `calculation_timestamp`.

**Conflitto da risolvere**: `001:70` usa il default `'KORA Methodology v0.1'`, `005:45` usa `'KORA-METHOD-v1.0'` **[VERIFIED]**. Aggiungendo il nome file `v0.1.ts` e la chiave `kora_index_v3` per un prodotto chiamato "Index v1.0", sono **quattro nomi per una cosa sola**.

Esposizione: **versione leggibile all'esterno** (`MAJOR.MINOR`), **hash immutabile all'interno**. Distinzione obbligatoria fra `AS_ORIGINALLY_CALCULATED` e `RESTATED_UNDER_METHODOLOGY`. **I risultati storici non si modificano retroattivamente.**

---

# 12. DATA LINEAGE

```
SOURCE DATA → TRANSFORMATION → METHODOLOGY SNAPSHOT
  → CALIBRATION / TAXONOMY VERSION → RESULT → USAGE (report/decisione)
```

```
kora.calculation_lineage
  lineage_id · snapshot_id · tenant_id · source_batch_ids uuid[]
  engine_chain text[] · result_type · result_ref · computed_at
  restatement_of lineage_id NULL
```

Ogni risultato persistito porta `lineage_id`. **Test I12**: dato un `lineage_id`, ricalcolando con lo stesso snapshot si ottiene lo stesso numero al centesimo. Vive nel livello **Evidence**, mai mostrato al CFO.

---

# 13. ONE PRODUCT / ONE TRUTH

Demo e live condividono schema, servizi, scoring, Confidence, Decision Pack, Financial Intelligence, Contribution, metodologia e UI. **Differenza: solo la provenienza del dato.**

Da eliminare o consolidare **[tutti VERIFIED]**: `DemoScoringAdapter` (legge punteggi pre-calcolati da `kora-index-outputs.json`) · `ScoringSimulatorService` · `DemoDataService` · `AccessControlService` (registro utenti demo) · 29 file `data/synthetic/` importati dai servizi, fra cui `KoraContributionService:3-4` · la dichiarazione "non disponibile in live" in `app/company/financial/page.tsx` · le 11 pagine `/demo` con ruolo `DEMO_VIEWER`, synth-only **[DECISION REQUIRED D-C]** · seed incoerenti fra loro (S2 Ferretti assente dagli output Index).

---

# 14. WORKER ARCHITECTURE

> **IL WORKER LAYER È PARTE DELL'ARCHITETTURA DI MISURA.**

Non è rete futura. Serve a: **exposure** e **awareness** (senza, la diagnosi fra "programma inefficace" e "programma non arrivato" non esiste); **cross-period history** e quindi **CF canonico**; **PIB**; **KORA Link**; **opportunity access**; **booking**; closed loop futuro.

Non può essere rimosso né ridotto a feature futura. Il consolidamento (`/worker` 2.376 L con auth reale vs `/my-kora` 4.023 L su demo-state **[VERIFIED]**) è **[DECISION REQUIRED D-D]** dopo l'architecture matrix di CC-024 — dodici dimensioni, non il conteggio righe.

---

# 15. PARTNER / BOOKING / TERRITORY ARCHITECTURE

**Già esistente e canonico** **[VERIFIED]**: `services/commons/BookingService.ts` (422 L, 4 rotte API, scrive nel PIB con maggiorazione cross-company) · `commons.booking` con `worker_tenant_id` e `post_tenant_id` e controllo di confine in SECURITY DEFINER · `network.partner_*` · `services/worker-opportunity`, `activity-discovery`.

**Capacità future da preservare senza refactor distruttivo**: azienda progetta programma → seleziona partner → finanzia → più aziende co-finanziano → ente locale propone iniziativa → lavoratore scopre e prenota → partner eroga → KORA raccoglie evidenza → il programma rientra nella Review.

**L'ontologia della §3 le rende tutte possibili oggi.** Non si implementano ora; non si rendono impossibili.

`services/booking-request/BookingRequestService.ts` è uno **stub di 24 righe che ritorna `[]` e `null`** **[VERIFIED]** — superato, non è la capability.

---

# 16. BENCHMARK ARCHITECTURE

**Il benchmark non è una pagina: è un servizio trasversale.** Deve poter alimentare Cockpit, Portfolio, Review, futuro Investment Case e board reporting.

**Cohort key**: `sector_band × workforce_band × period`. Nessuna regione nella prima versione. **k ≥ 10 aziende**, nessun tenant oltre il 25% dei record, coorti pre-dichiarate e **non componibili da query** (altrimenti si ricava per differenza il dato del singolo concorrente pur rispettando k su ogni query). Nessun ranking sul management, nessun `rule_stringency_delta` iniziale.

**Tre assi**: *You vs peers* (a k≥10) · **You vs yourself** (dal secondo ciclo, **indipendente dalla coorte — va costruito per primo**) · *Where peers are moving* (quando esiste storia di coorte).

**Stage 0** con contatore reale — *"7 aziende su 10 nella tua coorte"* — esiste prima che il benchmark funzioni: è ciò che rende percepibile l'effetto di rete.

**Politica di comparabilità**: snapshot che differiscono per `MINOR` → comparabili con nota; per `MAJOR` o `bc_calibration_version` → restatement, normalizzazione documentata, o esclusione con conteggio esposto. **Mai fusione silenziosa.**

---

# 17. DECISION MEMORY

Asset longitudinale, non dashboard. `decisione → intervento → osservazione successiva` è impossibile da ricostruire a posteriori: è il moat.

**Append-only per costituzione (I13)**, con trigger a livello DB. Campi minimi del DecisionEvent: `indicated_decision` · `actual_decision` · `rationale_category` · `intervention` · `effective_date` · `supersedes` · `methodology_snapshot_id` · `program_version` · `case_version` · `decision_owner` **come ruolo organizzativo** (`board` · `executive_management` · `hr` · `finance` · `hse_esg` · `operations` · `joint_committee` · `works_council`) — **mai una persona**, e mai nel record di benchmark.

Coincide con il ciclo PDCA: è anche evidenza di miglioramento continuo per l'auditor ISO.

---

# 18. EXPERIENCE ARCHITECTURE

**DOMANDA → DECISIONE → SPIEGAZIONE → PROVA**, sopra **Overview → Explain → Evidence**.

| Domanda del compratore | Superficie | Profondità |
|---|---|---|
| Dove sto perdendo capitale? | **Cockpit** | Overview |
| Cosa devo decidere? | **Cockpit** (decisioni sopra la piega) | Overview |
| Perché? | **Investment Review** | Explain |
| Su quali evidenze? | **Evidence & Method** | Evidence |
| Cosa avevamo deciso? | **Decision Memory** | Explain |
| Come siamo messi rispetto agli altri? | **Benchmark** | Overview |
| Cosa facciamo adesso? | **next Investment Case** | Overview |

Ogni pagina riceve un `pathRank`: `PRIMARY` (percorso del compratore) · `SECONDARY` (un click) · `DEEP` (Evidence) · `OPERATIONAL` (fuori dal prodotto cliente). **Nessuna pagina eliminata: escono dal percorso mentale, non dal prodotto.** Test sulla composizione del percorso PRIMARY.

I sette costrutti non sono sette prodotti: il loro ruolo è fissato nella §6 e la UI lo rispecchia.

---

# 19. CONSOLIDATION BLOCKS

| ID | Goal | Min local prereq | Effort | Note chiave |
|---|---|---|---|---|
| **B-REG** | registro + ontologia in CI | — | S | I10 |
| **B-INV** | invarianti pre-refactor | — | M | **I7 è la rete di sicurezza di tutto** |
| **B-SEC** | hardening pilot | — | S | esito duplice, §26 |
| **B-CI** | migration & E2E truth | — | M | **blocca N1**: nessuna nuova migrazione prima |
| **B-CLAIM** | fix claim DF/EXF/SF | D-E | XS | 3 file + test |
| **B-CONF** | Confidence canonico | B-INV, D-A | M | due formule diverse **[VERIFIED]** |
| **B-PACK** | Decision Pack canonico | B-INV, D-B | L | 7 capability uniche in `report-generator` **[VERIFIED]** |
| **B-BC** | BC in configurazione | **B-INV I7** | S | zero differenze numeriche |
| **B-SNAP** | Methodology Snapshot | B-BC, D-F | M | risolve i quattro nomi |
| **B-LIN** | Data Lineage | B-SNAP | M | I12 |
| **B-TRUTH** | One Truth | B-CONF, B-PACK, B-SNAP, D-C | **XL** | **finestra esclusiva** |
| **B-WORKER** | superficie unica | B-TRUTH, D-D | L | `/my-kora` gira su `AccessControlService` |
| **B-SPEC** | ontologia + spec nel repo | D-K | S | **blocca tutto Phase B** |

---

# 20. NEW KORA BLOCKS

| ID | Nome | Min local prereq | Effort |
|---|---|---|---|
| **N1** | ProgramDefinition + Participation — tipi, migrazioni, RLS, I14 | B-SPEC, B-CI | L |
| **N2** | Investment Case — ciclo di vita, commit gate, amendment | N1 | L |
| **N3** | Evidence Plan | N2, D-I | M |
| **N4** | Decision Rules + applicabilità metriche | N2 + flag tenant | M |
| **N5** | Retrospective Case | N2, N4 | S |
| **N6** | Capital Map | N4, **B-BC** | M |
| **N7** | Investment Review + Decision Event | N6, **B-CONF** | M |
| **N8** | Decision Memory (append-only, I13) | N7, **B-SNAP** | M |
| **N9** | Benchmark Memory + Stage 0 (servizio trasversale) | N8 | M |
| **N10a** | Funnel — modello e conteggi | N1 | S |
| **N10b** | Funnel — popolamento exposure | **B-WORKER**, N10a | M |
| **N11** | Economic Case | N6 + sganciamento KPI HR | M |
| **N12** | Cockpit | N7, **B-LIN** | M |
| **N13** | Portfolio Review | N12, **B-PACK** | L |
| **N14** | Experience Simplification (`pathRank`, mappa domande) | B-REG | M+ |

---

# 21. CONTRACT FREEZE PLAN — entro il giorno 12

**Corregge il rischio dei giorni 26-30**: i blocchi finali non devono inventare architettura in cinque giorni.

Congelati a livello di **tipo e contratto**, non di implementazione, e verificati contro l'ontologia ufficiale:

| Contratto | Deve dichiarare | Verificato contro |
|---|---|---|
| `CapitalMapResult` | partizione per **stato** che somma a `budget_allocated`; **natura** come dimensione ortogonale; `reallocation_candidate` come **flag**, non classe | §3, §5 |
| `InvestmentReview` | regola scattata, esito indicato, esito effettivo, `review_blocked_reason` | §3, §6 |
| `DecisionEvent` | i dieci campi minimi della §17; append-only | §5, I13 |
| `BenchmarkMemoryRecord` | chiave `sector × workforce × period`; banding versionato; nessun testo libero, nessun `decision_owner`, nessun tenant | §16 |
| `EconomicCaseResult` | tre livelli — Observed Capital, Documented Economic Exposure, Economic Opportunity; **nessun pseudo-ROI** | §6 |
| `PortfolioReview` | struttura a revisione di portafoglio, non a punteggio | §18, §20 |

**Acceptance**: sei contratti tipizzati, compilanti, con test di forma, **approvati da me entro il giorno 12**.

---

# 22. LOCAL DEPENDENCY GRAPH

```
G1  B-SPEC · B-REG · B-INV · B-SEC · B-CI · B-CLAIM      (nessun prereq)
G3  N1                       ← B-SPEC + B-CI
G5  N2 · N10a                ← N1
G6  B-BC                     ← B-INV(I7)
G8  N3 · N4                  ← N2 (+ flag tenant, NON B-WORKER)
G11 N6                       ← N4 + B-BC
G12 CONTRACT FREEZE          ← ontologia + N2
G13 N7 · N11                 ← N6 + B-CONF
G16 N8 · N12                 ← N7 + B-SNAP + B-LIN
G18 N9                       ← N8
G26 N10b                     ← B-WORKER
G27 N13                      ← N12 + B-PACK
```

**Le tre serializzazioni vere**: B-TRUTH esclusiva · B-WORKER dopo B-TRUTH · N13 dopo B-PACK. Tutto il resto è parallelizzabile su domini disgiunti.

---

# 23. METHODOLOGY COMPLETION GATE

**Due soglie distinte.**

**METHODOLOGY DECIDED — giorno 22.** Per CQ, EV, CF, DF, EXF, SF: `SOURCE DATA → COMPUTABILITY → FORMULA → RANGE → TEST → VERSION → ACTIVATION DECISION`. Sei schede, sei decisioni **[D-N]**.

**METHODOLOGY COMPLETED — giorno 30.** Ogni fattore giudicato **computabile con dati già disponibili** deve essere **IMPLEMENTATO, TESTATO, VERSIONATO**.

Può restare inattivo o proxy **solo** se: richiede dati non disponibili · richiede storia longitudinale inesistente · non c'è evidenza sufficiente · c'è rischio di doppio conteggio · manca una definizione metodologicamente difendibile. **La ragione va documentata. "Rimandato per tempo" non è una ragione accettabile.**

I fattori inattivi restano nel Methodology Appendix con: `DEFINED` · `NOT ACTIVE` · `REASON` · `DATA REQUIRED` · `VERSION TARGET`.

---

# 24. FRESH TENANT TEST

Un dataset **mai usato durante lo sviluppo** attraversa autonomamente: ingestione → normalizzazione → tassonomia → IU → Index/Contribution → funnel → Capital Map → Investment Review → Decision Pack.

**Due categorie di input, entrambe obbligatorie.**

**ADVERSARIAL DATA** — campi obbligatori mancanti · tipi di evidenza non mappati (esercita il fallback EV 0.5) · gruppi con esattamente 9 e 10 persone · famiglie di azione non in tassonomia · intestazioni non canoniche · date fuori periodo · importi zero e negativi · programmi senza budget.

**REAL-WORLD MESSY DATA** — nomi programma incoerenti fra sistemi · stesso provider scritto in modi diversi · budget annuale con consuntivo trimestrale · programmi che attraversano periodi · obbligatorio misto a volontario · beneficiari indiretti e familiari · iniziative territoriali · duplicati · classificazioni ambigue · dati parziali da più sistemi.

**Il sistema deve distinguere quattro esiti**: `INVALID DATA` · `UNCERTAIN MAPPING` · `VALID BUT INCOMPLETE` · `VALID OBSERVATION`.

> **Regola assoluta: l'ambiguità semantica non diventa mai precisione numerica.** Un provider scritto in tre modi non diventa silenziosamente tre provider, né uno solo: diventa `UNCERTAIN MAPPING` con confidenza dichiarata.

**FT-1 giorno 20** (fino al funnel, subito dopo One Truth — otto giorni di runway) · **FT-2 giorno 28** (catena completa).

**Se FT-1 rivela un fallimento strutturale, quello è il segnale per rinegoziare il calendario, non per comprimere in silenzio i blocchi successivi.**

---

# 25. BUYABILITY GATES

| | Giorno | Su cosa | Verifica |
|---|---|---|---|
| **Alpha** | 14 | **artefatto di design, non un branch** | percorso a sette domande + **si capisce che il centro è il Program e il suo ciclo, non "software per Investment Case"** |
| **Beta** | 23 | pipeline reale, tenant dimostrativo | numeri veri |
| **Final** | 29 | catena completa | dodici risposte, da **una persona che non conosce KORA** |

Le dodici risposte: capitale allocato · attivato · dove sono i problemi · solidità dell'evidenza · programmi che richiedono attenzione · decisioni pre-registrate · condizioni scattate · cosa KORA propone · cosa è cambiato dal ciclo precedente · posizione rispetto ai peer · quante aziende mancano se la coorte non c'è · quali evidenze sostengono ciascun numero. **Senza attraversare quindici dashboard.**

L'Alpha si butta via: non deve diventare codice con logica finta, sarebbe One Truth violato dalla porta di servizio.

---

# 26. SECURITY / PRIVACY GATES

**Pilot blocker**: dipendenze high · superficie worker su auth reale · migration truth · E2E realmente eseguiti · qualunque bypass di privacy dimostrato.

**Esito del gate dipendenze — due soli ammessi:**
- **SECURITY PASS**
- **SECURITY BLOCKED BY EXPLICIT DEPENDENCY DECISION** — con advisory, package, exploitability nel contesto KORA, fix disponibile, rischio di breaking change **[D-L]**

**Claude Code non deve forzare un upgrade per rendere artificialmente verde il gate.**

**Parallelizzabile, richiesto prima della release**: validazione di schema sulle 37 rotte mutanti su 44 **[VERIFIED]** · formato errore unico (14 punti con `error.message` al client **[VERIFIED]**) · rate limiting oltre le 12 rotte su 86 **[VERIFIED]** · `search_path` su `kora.is_service_role_context`, unica su 22 senza **[VERIFIED]** · CSP con nonce.

**Regola I14**: nessun nuovo oggetto di dominio senza tenant ownership, strategia RLS, privacy level, regola di aggregazione, auditabilità. **Campo obbligatorio in ogni specifica.**

---

# 27. PILOT RELEASE GATE

Buyability Final superato · una sola superficie lavoratore autenticata · nessuna schermata che dichiari qualcosa non disponibile in live · Methodology Appendix redatto · schema validation, error envelope, rate limiting · test di differencing verde · `/demo` decisa e applicata · **[EXTERNAL]** DPIA, DPA, ROPA avviate; memo art. 4 commissionato; finestra pen test prenotata.

---

# 28. 30-DAY EXECUTION CALENDAR

| Giorni | Workstream A | Workstream B | C (non-code) | Gate / Decisione | Output |
|---|---|---|---|---|---|
| **1-2** | CC-001 inventario | CC-002 invarianti I2/I6/I9 | **B-SPEC: ontologia + spec** · legale, pen test, Delphi · CC-045 dataset FT | **D-E…D-K, D-M** | ontologia congelata; dataset ostile + messy |
| **3-4** | CC-003 registro + ontologia in CI | CC-002 **I7 golden**, I5, I8 | CC-006 sicurezza | approvazione inventario | registro verde; **I7 congelato** |
| **5-6** | CC-007 CI truth | **CC-027 N1 Definition + Participation** | CC-008 fix claim | **D-L** | CI verificata; ontologia tipizzata |
| **7-8** | CC-004 audit Confidence | CC-028 N1 RLS + I14 | Methodology Appendix v0 | **D-A** | N1 completo |
| **9-10** | CC-005 audit Decision Pack | CC-029 **N2 Investment Case** | mappa domande (N14) | **D-B** | ciclo di vita |
| **11** | CC-011 Confidence | CC-030 N2 commit gate + amendment | CC-009 **B-BC** | — | un solo CS |
| **12** | CC-012 adversarial CS | **CC-047 CONTRACT FREEZE** — sei contratti | — | **CONTRACT FREEZE APPROVATO** | contratti tipizzati |
| **13** | CC-013 Decision Pack | CC-031 **N3 + N4** | prototipo Buyability Alpha | — | regole valutabili |
| **14** | CC-014 adversarial DP | CC-031 completamento | — | **BUYABILITY ALPHA** · **D-C** | un solo DP |
| **15** | **INTEGRAZIONE** | — | — | — | suite verde |
| **16** | CC-015 **B-SNAP** | CC-032 **N5 + N10a** | CC-024 architecture matrix worker | **D-D** | snapshot; retrospettivo |
| **17-19** | **CC-018…021 · B-TRUTH — FINESTRA ESCLUSIVA** | — | Methodology Appendix | approvazione per gruppo | seed → tenant |
| **20** | CC-022 chiusura B-TRUTH | — | — | **FT-1** | demo = live, I9 = 0 |
| **21-22** | CC-023 adversarial + rimedi FT-1 | CC-017 **B-LIN** | **CC-044 Methodology** | **METHODOLOGY DECIDED · D-N** | lineage; sei decisioni |
| **23** | CC-025 **B-WORKER** | CC-033 **N6 Capital Map** | — | **BUYABILITY BETA** | superficie unica |
| **24** | CC-026 adversarial worker | CC-033 completamento + **implementazioni metodologiche approvate** | — | — | fattori computabili implementati |
| **25** | **INTEGRAZIONE** | — | — | — | suite verde |
| **26** | CC-034 **N7 Review + DecisionEvent** | CC-035 **N10b + N11** | — | — | Review; funnel; Economic Case |
| **27** | CC-036 **N8 Decision Memory** | CC-037 **N9 Benchmark** | — | — | memoria immutabile |
| **28** | CC-038 **N12 Cockpit** | CC-039 **N14 Experience** | — | **FT-2** | decisioni sopra la piega |
| **29** | CC-040 **N13 Portfolio Review** | CC-041 adversarial finale | — | **BUYABILITY FINAL** | portfolio review |
| **30** | CC-042 rimedi | CC-043 E2E catena completa | — | **CODE + METHODOLOGY COMPLETE** | catena verde |

---

# 29. PARALLELIZATION MAP

**Sicuri**: B-REG ∥ B-INV ∥ B-SEC · B-CONF ∥ B-PACK · N1…N6 ∥ qualunque consolidamento tranne B-TRUTH · B-LIN ∥ N6 · N12 ∥ N14.
**Mai**: B-TRUTH con qualunque codice · CC-011 con CC-013 · B-WORKER con N10b · N13 con B-PACK.
**Da verificare**: N11 con N9 **[TO VERIFY IN CC-033]**.

Massimo due workstream di codice. Il terzo è sempre non-code.

---

# 30. CLAUDE CODE EXECUTION INDEX

| CC | Titolo | Mode | Blocco | Prereq | Gate umano |
|---|---|---|---|---|---|
| 001 | Inventario registro + ontologia | A-audit | B-REG | — | **Sì** |
| 002 | Invarianti pre-refactor | B | B-INV | — | Sì |
| 003 | Registro tipizzato + sezione ontologia | B | B-REG | 001 ok | Sì |
| 004 | Audit Confidence | A-audit | B-CONF | 002 | **Sì → D-A** |
| 005 | Audit Decision Pack | A-audit | B-PACK | 002 | **Sì → D-B** |
| 006 | Hardening sicurezza | B | B-SEC | — | Sì → D-L |
| 007 | CI / migration truth | A-audit | B-CI | — | Sì |
| 008 | Fix claim DF/EXF/SF | B | B-CLAIM | D-E | No |
| 009 | BC in configurazione | B | B-BC | 002 (I7) | Sì |
| 010 | Audit One Truth esteso | A-audit | B-TRUTH | 003 | **Sì → D-C** |
| 011-012 | Consolidamento + adversarial Confidence | A | B-CONF | D-A | Sì |
| 013-014 | Consolidamento + adversarial Decision Pack | A | B-PACK | D-B | Sì |
| 015 | Methodology Snapshot | A | B-SNAP | 009, D-F | Sì |
| 017 | Data Lineage | A | B-LIN | 015 | Sì |
| 018-023 | One Truth per gruppo di seed | A-migration | B-TRUTH | 010, D-C | **Sì per gruppo** |
| 024 | Architecture matrix worker (12 dimensioni) | A-audit | B-WORKER | — | **Sì → D-D** |
| 025-026 | Consolidamento + adversarial worker | A | B-WORKER | D-D, 023 | Sì |
| 027-028 | N1 ProgramDefinition + Participation | B | N1 | B-SPEC, 007 | Sì |
| 029-030 | N2 Investment Case | B | N2 | 028 | Sì |
| 031 | N3 + N4 | B | N3, N4 | 030, D-I | Sì |
| 032 | N5 + N10a | B | N5, N10a | 031 | Sì |
| 033 | N6 Capital Map | A | N6 | 031, 009, 047 | Sì |
| 034 | N7 Review + DecisionEvent | A | N7 | 033, 011, 047 | Sì |
| 035 | N10b + N11 | B | N10b, N11 | 025, 033 | Sì |
| 036 | N8 Decision Memory (I13) | A | N8 | 034, 015, 047 | Sì |
| 037 | N9 Benchmark (3 assi, trasversale) | A | N9 | 036, 047 | Sì |
| 038 | N12 Cockpit | B | N12 | 034, 017 | Sì |
| 039 | N14 Experience Simplification | B | N14 | 003 | Sì |
| 040 | N13 Portfolio Review | B | N13 | 038, 013, 047 | Sì |
| 041-042 | Adversarial finale + rimedi | A-adv | — | 040 | **Sì** |
| 043 | E2E catena completa | release | — | 042 | **Sì** |
| **044** | Methodology Completion Gate | A-audit | §23 | 009, 015 | **Sì → D-N** |
| **045** | Generazione dataset FT (adversarial + messy) | B | §24 | D-M | Sì |
| **046** | Esecuzione FT-1 e FT-2 | QA | §24 | 045, 022 | **Sì** |
| **047** | **CONTRACT FREEZE — sei contratti** | B | §21 | ontologia, N2 | **Sì** |

**Da scrivere solo dopo un audit**: 011 (004+D-A) · 013 (005+D-B) · 018-023 (010+D-C) · 025 (024+D-D) · 027 (B-SPEC) · implementazioni metodologiche (044+D-N).

---

# 31. CLAUDE CODE READ-BEFORE-WRITE PROTOCOL

**Questa sezione compare all'inizio di ogni prompt futuro.**

> Claude Code **non può** iniziare una modifica basandosi soltanto sul prompt.

**PHASE 0 — REPOSITORY STATE VERIFICATION**

1. verificare branch e `git status`
2. leggere i file target indicati
3. cercare caller e dipendenze (import statici **e dinamici**)
4. leggere i test correlati
5. verificare schema e migrazioni coinvolte
6. verificare route e API coinvolte
7. cercare **implementazioni concorrenti**
8. leggere la documentazione canonica
9. verificare gli invarianti costituzionali applicabili
10. **descrivere lo stato reale trovato** e confrontarlo con l'assunzione del prompt

Poi produrre lo **STATE REPORT** e dichiarare `STATE_MATCH = YES | NO`.

**Se `STATE_MATCH = YES`** → PHASE 1, implementazione.

**Se `STATE_MATCH = NO`** → **STOP**. Produrre:

```
IMPLEMENTATION BLOCKED — STATE MISMATCH
EXPECTED STATE:
ACTUAL STATE:
FILES:
IMPACT:
RECOMMENDED OPTIONS:
```

e attendere approvazione. **Non adattare silenziosamente il task.**

**Se una decisione comporta scegliere fra due comportamenti entrambi validi** → **STOP** e produrre `DECISION REQUIRED` con OPTION A, OPTION B, TRADEOFF, RECOMMENDATION.

**Due modalità.** **MODE A — Audit First**: AUDIT read-only → HUMAN GATE → IMPLEMENT → ADVERSARIAL QA. Obbligatoria per Confidence, Decision Pack, One Truth, worker consolidation, metodologia, Capital Map, Decision Memory, benchmark, refactor sensibili alla sicurezza. **MODE B — Read-First Implement**: PHASE 0 read/verify → report → implement solo se lo stato coincide → test → report. **Nessun prompt salta la fase READ.**

---

# 31bis. TEMPLATE UFFICIALE DEI PROMPT

```
TITLE ·  BLOCK ·  MODE (A|B) ·  BRANCH
CONTEXT
TARGET ARCHITECTURE ROLE          [quale parte del loop serve]

── PHASE 0 — READ FIRST ──
FILES TO READ
SEARCHES TO RUN                   [caller, duplicati, import dinamici]
TESTS TO READ
MIGRATIONS TO READ
DOCS TO READ
EXPECTED CURRENT STATE
STATE VERIFICATION REPORT         [output obbligatorio]
STOP CONDITIONS                   [→ IMPLEMENTATION BLOCKED]

── PHASE 1 — IMPLEMENTATION SCOPE ──
ALLOWED FILES
FORBIDDEN FILES
PRESERVE
FUTURE CORE TO PRESERVE
MIGRATIONS · RLS · PRIVACY        [obbligatori per nuovi oggetti — I14]
TESTS
ADVERSARIAL CHECKS
ACCEPTANCE CRITERIA
ROLLBACK
FINAL REPORT

GIT RULES: commit = NO · push = NO   [salvo autorizzazione esplicita]
```

---

# 32. SAFE DELETION PLAN

| Elemento | Quando | Condizione |
|---|---|---|
| `app/company/reports/board-pack/page.tsx` (13 L, solo redirect) **[VERIFIED]** | dopo B-REG | registro `DEAD` con `decisionRef` |
| `services/booking-request/BookingRequestService.ts` (24 L, ritorna `[]`/`null`) **[VERIFIED]** | dopo B-REG | idem — **`commons/BookingService` resta** |
| `DemoScoringAdapter` · `ScoringSimulatorService` · `demo-data` · `access-control` | fine B-TRUTH | I9 = 0, adversarial superata |
| Il perdente fra i due Confidence | dopo D-A | memo approvato |
| I perdenti fra i tre Decision Pack | dopo D-B | **7 capability migrate o ritirate esplicitamente** |
| `services/privacy-visibility/` | dopo B-INV | I2 copre lo strato canonico |

Nient'altro. `company-setup` e `report-generator` restano **INVESTIGATE**.

---

# 33. DO-NOT-DELETE / FUTURE CORE

`services/commons/BookingService.ts` + schema `commons` — **vivo e canonico**, con il pattern cross-tenant `worker_tenant_id × post_tenant_id` **[VERIFIED]** · `network.partner_*`, `app/partner/` · `kora_link.*` — FUTURE CORE, gap DG-07 chiusi **[VERIFIED]** · `personal.worker_pib`, `services/worker-pib/` — prerequisito di CF canonico · `services/kora-contribution/` · `services/dynamic-cv/` · `services/worker-opportunity/`, `activity-discovery/` — **base tecnica di Exposure** · `collective-initiatives` come forma dei programmi territoriali **[VERIFIED]** · `services/company-setup/`, `services/report-generator/` — **INVESTIGATE**.

---

# 34. FAILURE / ROLLBACK

La suite rompe → non si adatta il test al codice. Prima si stabilisce se il test è obsoleto o il codice sbagliato. Un golden case IU che cambia dove non doveva è un difetto per definizione.
Un invariante costituzionale fallisce → stop del branch. I1-I14 non si negoziano.
Un adversarial trova un bloccante → il blocco non è concluso; prompt di rimedio, non si prosegue.
`STATE_MISMATCH` → non si procede, si riconcilia.
B-TRUTH rompe la demo → scenario più probabile: migrazione per file, un commit ciascuno, seed originali in `data/seed-source/` fino alla chiusura.
Slittamento oltre due giorni sul percorso critico → si sposta l'ultimo blocco non critico e lo si dichiara; **non si comprime in silenzio**.
Le giornate 15 e 25 sono presidi, non riserve.

---

# 35. FINAL DEFINITION OF DONE

**ONTOLOGY FROZEN — giorno 2.** Oggetti, relazioni, stato vs evento, tenancy e privacy congelati e nel repository.

**CONTRACTS FROZEN — giorno 12.** Sei contratti tipizzati e approvati.

**CODE COMPLETE — giorno 30.** Quattordici blocchi implementati, integrati, testati. Una sola pipeline, una sola verità metodologica, un solo Decision Pack, un solo Confidence, una sola superficie lavoratore. Ogni numero ricostruibile fino alla sorgente. Decision Event append-only con trigger DB. Catena end-to-end verde su tenant dimostrativo **e** tenant cliente, con gli stessi servizi.

**METHODOLOGY COMPLETE — giorno 30.** Sei decisioni prese al giorno 22; ogni fattore computabile con i dati disponibili **implementato, testato, versionato** al giorno 30. Gli inattivi hanno ragione documentata fra le cinque ammesse. **Zero fattori "rimandati per tempo".**

**PIPELINE PROVEN — giorno 30.** FT-2 superato su dati adversarial **e** messy: ogni passaggio produce un risultato o un rifiuto motivato e tracciabile, distinguendo `INVALID` · `UNCERTAIN MAPPING` · `VALID BUT INCOMPLETE` · `VALID OBSERVATION`. **Mai un risultato inventato.**

**PRODUCT COMPLETE — giorno 30.** Buyability Final superato da una persona che non conosce KORA. Methodology Appendix redatto. Nessuna schermata che dichiari qualcosa non disponibile in live.

**Con dati vuoti o proxy per natura, dichiarati**: CF resta `proxy` finché non esiste storia cross-periodo · `subsequent_observation` si popola al secondo ciclo reale · Benchmark resta Stage 0 finché non ci sono dieci aziende, **ma l'asse *You vs yourself* funziona dal secondo ciclo di ciascun cliente**. Limiti di tempo e adozione, non di codice.

**PILOT RELEASE APPROVED — [EXTERNAL]**: DPIA, DPA, memo art. 4.
**ENTERPRISE ASSURANCE COMPLETE — [EXTERNAL]**: pen test, calibrazione Delphi.

---

## Cosa è KORA

L'Investment Case è il **prima**. IU, Index e Contribution sono il **metro**. Il Capital Map è la **lettura economica**. La Review è il **momento decisionale**. La Decision Memory è il **tempo**. Il Benchmark è il **mercato**. Worker layer, PIB, KORA Link, partner network, booking e territorio sono il **livello di rete**.

KORA costruisce una memoria verificabile di come il capitale investito nelle persone viene allocato, attivato, osservato e trasformato in decisioni.

Se un blocco sembra allontanarsi da questo, è il blocco a essere sbagliato.

---

## Come si lavora da qui

1. prendi il prossimo CC-ID dalla §30
2. se ha una decisione a monte, chiudila con la §3 del piano
3. scrivi il prompt sul template della §31bis
4. Claude Code esegue **PHASE 0** e riporta lo stato
5. se `STATE_MATCH = NO`, si ferma e si riconcilia
6. se coincide, implementa
7. esegue i test
8. produce il report
9. approvi
10. solo allora si passa al blocco successivo

**Nessun prompt si fida del piano più del codice.** Il codice è la verità operativa, il Master Plan è la verità architetturale, Claude Code le riconcilia prima di scrivere.

**`commit = NO` · `push = NO` finché non hai approvato.**

**Documento congelato. Da qui si esegue.**
