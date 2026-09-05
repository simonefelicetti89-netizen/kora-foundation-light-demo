# KORA — OFFICIAL IMPLEMENTATION MASTER PLAN v2.1


**FINAL FREEZE VERSION**
**Architecture Freeze + Execution Manual · 26 agosto 2026**
**Sostituisce ogni piano precedente. Da qui si esegue: KORA non si ridisegna più durante lo sprint.**

Provenienza: **[VERIFIED]** letto nel codice · **[INFERRED]** dedotto · **[DECISION REQUIRED]** · **[UNKNOWN]** · **[EXTERNAL]**

> **Nota di governance.** La v2.1 supersede la v2.0 come autorità di esecuzione architetturale; la v2.0 resta disponibile come baseline storica. La v2.1 incorpora il Commercial Alignment e le decisioni fondatore F-01 → F-12. Nessuna promessa commerciale è stata ridotta per adattarsi allo stato corrente del repository.

---

# 1. EXECUTIVE VERDICT

La v2.1 completa l'ontologia congelata dalla v2.0 con il lato che mancava.

La v2.0 modellava il ciclo a partire da ciò che l'impresa **finanzia** — Program, Investment Case, Capital Map, Review. La promessa commerciale ha un secondo asse: ciò che le persone **esprimono** — Worker Listening, NeedObservation, Needs Map — e il punto in cui i due si incontrano. È da lì che nasce il confronto Investment Map × Needs Map, che è il nucleo distintivo del prodotto.

**La verifica sul codice ha migliorato l'ontologia.** KORA modella già relazioni cross-tenant in due punti: `commons.booking` ha `worker_tenant_id` e `post_tenant_id` — un lavoratore di un'azienda che prenota presso un'iniziativa promossa da un'altra — con il controllo di confine già implementato in SECURITY DEFINER **[VERIFIED]**; e `collective-initiatives.json` contiene `initiative_type: cross_company_volunteering`, `territory`, `companies_involved` come array, `partner_id` e `privacy_threshold_met` **[VERIFIED]**. Territorio e co-finanziamento **non sono capability future: sono forme già presenti, non ancora tipizzate.**

Ne discende la struttura a tre livelli della §3: **ProgramDefinition** (può essere di un'azienda, di un partner o di un territorio) → **ProgramParticipation** (la quota di una singola azienda, tenant-scoped) → **InvestmentCase** (l'impegno decisionale di quella partecipazione per un ciclo). Con `tenant_id NOT NULL` su Program, i programmi territoriali richiederebbero un refactor distruttivo entro un anno. Con questa separazione, non serve.

**Tre conseguenze dell'asse nuovo.** L'ontologia cresce di dieci oggetti — sette del dominio Survey, due del dominio Needs, uno di design. Il closed loop **si biforca**: dal confronto fra le mappe partono il percorso della risposta esistente e quello del bisogno senza risposta, che convergono solo quando il secondo produce un ciclo osservabile. E il calendario si divide in **due sprint**, perché Worker Listening è il sottosistema che raccoglie risposte individuali e non è comprimibile nei giorni residui di uno sprint dedicato ad altro.

**START non è commercialmente completo alla fine dello Sprint 1.** La release avviene alla fine dello Sprint 2. Il perimetro della promessa resta intero: cambia quando è consegnabile, non cosa contiene.

Nessuna nuova feature. Nessun cambio di categoria.

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
9. **Il bisogno esiste anche senza risposta.** Nessun costrutto può richiedere l'esistenza di un programma per rappresentare un bisogno. Il collegamento a un `ProgramDefinition` è sempre opzionale.
10. **N≥10 è una regola di divulgazione, non di esistenza.** Un'osservazione sotto soglia può essere conservata e non può essere esposta. La privacy non deve diventare una politica di distruzione del dato.

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
**Relations** → `action_family`, `pillar`, `partner_ids[]`, `territory_ref`, ← `ProgramBrief` (opzionale).
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
**Mutability** **append-only** · **Privacy** N≥10 in divulgazione · **Identity** `observation_id` + `period`.

### MEASUREMENT — derivato
Impact Unit, KORA Index, Confidence, Activation Debt, Contribution. **Deriva** da Observation + MethodologySnapshot. Porta sempre `lineage_id`.

### INVESTMENT REVIEW — stato + evento
**Purpose** il momento decisionale di un ciclo. **Relations** → InvestmentCase (1:1), → DecisionEvent (1:N), → ProgramBrief (0:N).
**Contiene** regola scattata, esito indicato, capitale classificato, `review_blocked_reason` se non decidibile.

### DECISION EVENT — evento append-only
Campi minimi: `indicated_decision`, `actual_decision`, `rationale_category`, `intervention`, `effective_date`, `supersedes`, `methodology_snapshot_id`, `program_version`, `case_version`, `decision_owner` (**ruolo organizzativo, mai persona**).

### SUBSEQUENT OBSERVATION — derivato
Il collegamento fra un DecisionEvent e le osservazioni del ciclo successivo. Si popola al secondo ciclo reale.

### SURVEY DEFINITION · SURVEY VERSION · SURVEY QUESTION — nuovi
**Purpose** cosa viene chiesto alle persone.
**Identity** `survey_definition_id` · `survey_version_id` · `question_id`.
**Tenancy** `tenant_id`, o KORA per i template condivisi.
**Mutability** la definizione è mutabile; **la versione è immutabile dopo la pubblicazione**.
**`SurveyQuestion` dichiara obbligatoriamente la propria funzione metodologica**: `question_function` ∈ `need_discovery` | `awareness_access` | `outcome_relevance`. Non sono tre survey diverse: sono funzioni della singola domanda, e possono convivere nella stessa somministrazione.
**Tipi di risposta ammessi nella v1**: scala, scelta singola, scelta multipla, risposta strutturata. **Nessun testo libero** — I16.
**Privacy** business data.

### SURVEY CAMPAIGN · SURVEY ASSIGNMENT — nuovi
**Purpose** la somministrazione nel tempo e la popolazione a cui è destinata.
**Tenancy** `tenant_id`. L'assegnazione descrive una **popolazione**, mai un elenco di individui esposto a un ruolo aziendale.
**Lifecycle** `DRAFT → PUBLISHED → OPEN → CLOSED`.
**Privacy** media; il `response_rate` è esposto solo in aggregato sopra soglia.

### SURVEY RESPONSE — nuovo
**Purpose** la risposta di una persona.
**Identity** `response_id`, legata a uno pseudonimo, **mai a un'identità esposta a un ruolo aziendale**.
**Tenancy** schema `personal`, **nessun `tenant_id`** — isolamento per identità, come `personal.worker_pib`, che non ha alcuna policy applicativa **[VERIFIED]**.
**Nature** **state con transizioni**, non evento append-only.
**Lifecycle** `draft → submitted → withdrawn | invalidated`. Transizioni, retention ed esercizio dei diritti dell'interessato sono definiti in NB-1 dopo la validazione DPO.
**Semantica congelata**: un record `submitted` è **immutabile**. Non può essere modificato in luogo; ogni correzione produce un nuovo record che supersede il precedente.
**Privacy** massima. Accesso solo via SECURITY DEFINER con `search_path` fisso.

### LISTENING RESULT — nuovo
**Purpose** l'aggregato prodotto da una campagna, sopra soglia.
**Identity** `listening_result_id` · **Tenancy** `analytics`, `tenant_id`, RLS piena.
**Nature** **aggregato materializzato, non vista ricalcolabile.** Calcolato una volta e conservato indipendentemente dalle risposte che lo hanno generato: la cancellazione o rettifica di una risposta individuale non deve modificare retroattivamente un aggregato già usato per una decisione.
**Lineage** → `SurveyVersion`, → `methodology_snapshot_id`, `lineage_id`. **Non conserva riferimenti persistenti alle singole `SurveyResponse`.**
**Privacy** media; esposto solo sopra soglia.

### NEED OBSERVATION — nuovo
**Purpose** un bisogno osservato in un contesto, **anche in assenza di qualunque programma**.
**Identity** `need_observation_id`. `need_signature` identifica il bisogno **semanticamente**; il contesto dell'osservazione è separato.
**Tenancy** `tenant_id NOT NULL`, RLS piena.
**Nature** **evento append-only**.
**Base di evidenza e divulgabilità sono separate**: `sample_size` non ha soglia minima per la persistenza; `privacy_status` ∈ `suppressed` | `publishable` è **derivato, mai impostabile a mano**. Un'osservazione sotto soglia esiste, è conservata, **non è esposta ad alcun ruolo aziendale**.
**Relations** ← ListeningResult; → `related_program_definition_id` **nullable — principio 9**.
**Privacy** media in aggregato; nessuna riconducibilità individuale.

### NEEDS MAP SNAPSHOT — nuovo
**Purpose** vista versionata dei bisogni per tenant e periodo, riproducibile come l'Index.
**Identity** `snapshot_id` · **Tenancy** `tenant_id` · **Nature** derivato versionato.
**Campi** `period`, `need_taxonomy_version`, `methodology_snapshot_id`, `observation_refs[]`, `banding_version`.

### PROGRAM BRIEF — nuovo
**Purpose** cosa dovrebbe essere costruito e perché. È il ponte fra ciò che si è capito e ciò che si costruirà.
**Identity** `program_brief_id` · **Tenancy** `tenant_id`.
**Nature** state versionato · **Lifecycle** `draft → approved → converted | discarded`.
**Due ingressi**: da una `InvestmentReview` (una risposta esistente da rifare) **oppure** direttamente da una `NeedObservation` senza programma (una risposta mai esistita).
**Relations** → `resulting_program_definition_id` **nullable**, immutabile una volta valorizzato.
**Non duplica l'InvestmentCase**: il Brief non ha decision rules, non ha budget impegnato, non ha ciclo, non ha `case_mode`. Risponde a *cosa costruire e perché*; l'InvestmentCase a *cosa vuole ottenere questa organizzazione in questo ciclo e con quali regole deciderà*. Sono in sequenza, non in sovrapposizione.

## 3.2 Attori e infrastrutture trasversali

| Oggetto | Stato | Tenancy | Privacy | Nota |
|---|---|---|---|---|
| **WORKER** (`personal.worker_identity`) | esistente **[VERIFIED]** | **nessun `tenant_id`** — isolamento per identità | massima | è la traduzione schematica della non-visibilità |
| **PIB** (`personal.worker_pib`) | esistente, con `reporting_period` e indice cross-periodo **[VERIFIED]** | nessuno | massima | nessuna policy applicativa: solo SECURITY DEFINER |
| **WORKER LISTENING** | **da costruire** | risposte in `personal` senza `tenant_id`; aggregati in `analytics` con `tenant_id` | **massima sulla risposta**, media sull'aggregato | NB-1; alimenta Needs Map, Evidence, Decision Pack |
| **NEED TAXONOMY** | **da costruire** | nessuna | nessuna | codici stabili, versionata, distinta dalla Action Taxonomy |
| **PARTNER** (`network.partner_*`) | esistente | nessun `tenant_id` | business | lato offerta |
| **ADVISOR** | esistente | tenant o partner | business | validazione evidenze |
| **TERRITORY / LOCAL ENTITY** | **da tipizzare** | nessuno | business | oggi vive come stringa `territory` nei seed **[VERIFIED]** |
| **EVIDENCE** | esistente | tenant | variabile | scala EV L1–L4 |
| **BENCHMARK COHORT** | nuovo | **nessuno** | k≥10 aziende | chiave `sector × workforce × period` |
| **METHODOLOGY SNAPSHOT** | parziale **[VERIFIED]** | nessuno | nessuna | immutabile |
| **DATA LINEAGE** | nuovo | tenant | nessuna | ricostruibilità |
| **KORA LINK** (`kora_link.*`) | esistente, gap DG-07 chiusi **[VERIFIED]** | ponte | massima | FUTURE CORE, commercialmente `OPTIONAL / ADD-ON` |
| **KORA CONTRIBUTION** | esistente **[VERIFIED]** | tenant | aggregata | companion indicator |

---

# 4. DOMAIN RELATIONSHIP MAP

```
                    TERRITORY ──┐
                    PARTNER ────┤
   ORGANIZATION ────────────────┴──▶ PROGRAM DEFINITION ◀── PROGRAM BRIEF
        │                                    │                    ▲
        │                                    │ 1:N                │
        └──────── 1:N ──▶ PROGRAM PARTICIPATION                   │
                                  │                               │
                                  │ 1:N (per ciclo)               │
                                  ▼                               │
                          INVESTMENT CASE ──┬──▶ EVIDENCE PLAN    │
                                  │          └──▶ DECISION RULE[] │
                                  ▼                               │
                    DELIVERY / OPPORTUNITY ──▶ BOOKING ──▶ PARTNER│
                                  │              (worker_tenant × post_tenant)
                                  ▼                               │
              OBSERVATION (eligible→exposed→aware→activated)  ◀── WORKER, PIB
                                  │                               │
   WORKER ──▶ SURVEY RESPONSE ────┤                               │
              (personal, pseudonimo)                              │
                  │ aggregazione sopra soglia                     │
                  ▼                                               │
            LISTENING RESULT ──▶ EVIDENCE                         │
                  │                                               │
                  ▼                                               │
            NEED OBSERVATION ──(nullable)──▶ PROGRAM DEFINITION   │
                  │                                               │
                  ▼                                               │
            NEEDS MAP SNAPSHOT                                    │
                  │                                               │
   INVESTMENT MAP ┴──▶ INVESTMENT × NEEDS ANALYSIS ───────────────┘
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

`NEED TAXONOMY` è trasversale e comunica con la Action Taxonomy attraverso un **mapping layer esplicito**, non attraverso identità.

**Gli otto casi che questa ontologia deve reggere senza refactor** — e regge:

| Caso | Come |
|---|---|
| Programma aziendale interno | Definition `owner_type=company` + 1 Participation |
| Programma importato retrospettivamente | Case `mode=retrospective` |
| Programma con provider | Definition → Delivery `existing_provider` |
| Programma territoriale | Definition `owner_type=territory`, `tenant_id` null, N Participation |
| Co-finanziato da più aziende | idem, ogni azienda ha budget e Case propri |
| Opportunità prenotabile dal lavoratore | Delivery → Booking, pattern `worker_tenant × post_tenant` già esistente **[VERIFIED]** |
| **Bisogno senza alcun programma** | NeedObservation con `related_program_definition_id` null → ProgramBrief → nuova Definition |
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
| Survey Definition | **state** | mutabile | app |
| **Survey Version** | **versioned state** | **immutabile dopo la pubblicazione** | trigger DB |
| **Survey Response** | **state con transizioni** | `draft → submitted → withdrawn \| invalidated`; **il record `submitted` è immutabile**, una correzione crea un nuovo record che supersede | app + trigger sul record `submitted` |
| **Listening Result** | **derived, materializzato** | calcolato una volta, conservato; **non ricalcolabile dalle risposte** | app |
| **Need Observation** | **event** | **append-only** | trigger DB |
| **Needs Map Snapshot** | **derived versionato** | immutabile per periodo | app |
| **Program Brief** | **versioned state** | `resulting_program_definition_id` immutabile una volta valorizzato | app |
| Observation | **event** | **append-only** | trigger DB |
| Measurement | **derived** | ricalcolabile, ma ogni risultato persistito porta snapshot e lineage | — |
| Investment Review | **state + event** | lo stato si chiude, gli eventi restano | — |
| **Decision Event** | **event** | **append-only, I13** — nessun UPDATE, nessun DELETE; correzione = nuovo evento con `supersedes` | **trigger DB** |
| Decision Memory | **derived view** | derivata dagli eventi | — |
| Benchmark Memory | **derived, minimized** | derivazione unidirezionale, banding versionato | — |

**Regola**: nessuna tabella mutabile per eventi che devono avere valore storico. Una memoria che si può riscrivere non è memoria.

**Perché `SurveyResponse` non è append-only puro**: una risposta può essere ritirata o invalidata, e il diritto di rettifica e cancellazione va esercitabile. Ciò che si congela è la semantica del record inviato, non il ciclo di vita dell'entità. È esattamente la ragione per cui `ListeningResult` deve essere materializzato: l'aggregato sopravvive alla cancellazione dell'individuale, ed è corretto che sia così.

---

# 6. SCORE ROLE MATRIX

Elimina la percezione di punteggi concorrenti.

| Costrutto | Cosa misura | Livello | Usato per | **NON** usato per | Visibile in | Può far scattare una decisione? | Dipende da |
|---|---|---|---|---|---|---|---|
| **Impact Unit** | intensità di attivazione di un evento | evento | comporre Index e Capital Map | confronti fra aziende | Evidence | no, è materia prima | tassonomia, BC, CQ, EV, CF, AGF, NM |
| **KORA Index** | attivazione complessiva del portafoglio | azienda/periodo | lettura sintetica, benchmark | decidere da solo | Portfolio/Explain, Cockpit/Overview | **no** — decide la Decision Rule | IU |
| **Confidence Score** | **quanto ci si può fidare del dato**, non quanto è buono il risultato | azienda/programma | qualificare ogni numero; soglia nelle regole | **mai dentro l'Index — peso zero permanente** **[VERIFIED]** | **sempre accanto al numero** | **sì, come condizione** | evidenza, completezza, mapping, verifica |
| **Needs Map** | i bisogni espressi, in aggregato | azienda/categoria/periodo | il confronto con l'offerta | **comporre l'Index; valutare le persone; ranking** | People/Overview, Portfolio/Explain | **no** — alimenta il confronto | Worker Listening, Need Taxonomy |
| **Activation Debt** | quota di spesa senza attivazione misurabile | azienda/programma | Capital Map | giudizio sul management | Portfolio | indirettamente | IU, budget |
| **Safeguard** | tutela contro attivazione anomala o gaming | evento/programma | integrità del dato | performance | Evidence | blocca, non decide | tassonomia, osservazioni |
| **BTI / Financial Intelligence** | traduzione economica dell'attivazione | azienda | Capital Map, Economic Case | ROI causale | Portfolio/Explain | no | Capital Map |
| **KORA Contribution** | valore generato **oltre i confini dell'impresa** | azienda/ecosistema | lettura ecosistemica | Index, Capital Map | People/Explain | no | commons, territorio |
| **Economic Case** | esposizione economica osservata | azienda | conversazione con il CFO | pseudo-ROI | Portfolio | no | Capital Map, KPI HR |
| **Benchmark** | posizione relativa e traiettoria | coorte | contesto | ranking del management | Cockpit, Portfolio | no | Benchmark Memory |

**La frase che risolve la confusione**: *l'Index misura, il Confidence qualifica, la Needs Map ascolta, il Capital Map traduce in euro, la Decision Rule decide, la Decision Memory ricorda, il Benchmark confronta, la Contribution guarda fuori.* Ruoli distinti, nessuna sovrapposizione.

---

# 7. TARGET ARCHITECTURE

```
   PROGRAM DEFINITION (company | partner | territory | consortium)
        → PARTICIPATION (per azienda) → INVESTMENT CASE (per ciclo)
        → EVIDENCE PLAN + DECISION RULES (congelate al commit)
        → DELIVERY / OPPORTUNITY → PARTNER → BOOKING
        → ELIGIBLE → EXPOSED → AWARE → ACTIVATED

   WORKER LISTENING → NEED OBSERVATIONS → NEEDS MAP
        └──▶ INVESTMENT × NEEDS ANALYSIS ◀── INVESTMENT MAP
                     │
                     ├── risposta esistente ──▶ ciclo sopra
                     └── risposta assente ──▶ PROGRAM BRIEF ──▶ nuova DEFINITION

        → EVIDENCE → IMPACT UNIT → KORA INDEX (+ Confidence, Safeguard, Debt)
        → CAPITAL MAP → ECONOMIC CASE (KPI HR, Financial Intelligence)
        → INVESTMENT REVIEW → DECISION EVENT
        → DECISION MEMORY → BENCHMARK → nuovo ciclo

   TRASVERSALI: worker layer · PIB · KORA Link · Contribution · Dynamic CV
                NEED TAXONOMY · METHODOLOGY SNAPSHOT · DATA LINEAGE
                privacy / pseudonymity
```

---

# 8. ARCHITECTURE REGISTRY

**Due sezioni distinte, mai confuse.**

**A — Componenti di codice.** `lib/architecture/registry.ts` tipizzato (fonte unica) → `scripts/generate-architecture-doc.ts` → `docs/ARCHITECTURE_REGISTRY.md` derivato. Stati: `CANONICAL` `CONSOLIDATE` `COMPLETE` `FROZEN` `FUTURE_CORE` `LEGACY` `DEAD` `INVESTIGATE`. `DEAD` richiede `deletableWhen` **e** `decisionRef`. Granularità: componenti di dominio — `services/*`, superfici top-level `app/*` governate dalla policy, moduli `lib/kora-engine/*`, directory di dominio in `lib/`. **Esclusi**: helper, componenti UI, utility.

**Criterio della policy sulle superfici**: *commercially meaningful product surfaces must be governed.* `APP_SURFACE_POLICY` comprende almeno `app/worker`, `app/my-kora`, `app/admin`, `app/demo`, **`app/commons`** e **`app/partner`**. Le prime due aggiunte perché `app/commons` è la superficie di pubblicazione di KORA Space — esegue `insert` reali su `commons.post` **[VERIFIED]** — ed è venduta in START, e `app/partner` è il lato offerta. `app/link` e `app/cv` restano fuori: sono viste sottili su capability già registrate, da rivalutare se acquisiscono logica propria.

**B — Target Ontology Objects.** Sezione separata: per ogni oggetto della §3, stato di implementazione (`EXISTS` | `PARTIAL` | `TO BUILD`), tabelle, servizi, blocco che lo realizza. **Il registro descrive il codice, l'ontologia descrive il dominio.** I dieci oggetti nuovi entrano qui come `TO_BUILD` con `implementationBlock` valorizzato; le voci di `ARCHITECTURE_REGISTRY` corrispondenti si aggiungono solo quando il codice esiste.

Invariante **I10**: fallisce se un componente di dominio non è registrato, se un `DEAD` manca dei due campi, se il Markdown è disallineato.

---

# 9. CONSTITUTIONAL INVARIANTS

| # | Invariante | Stato | Quando |
|---|---|---|---|
| I1 | Nessun accesso aziendale a record individuali. **Esteso**: nessun ruolo aziendale raggiunge un aggregato con `sample_size < 10`, attraverso rotte, funzioni, viste o combinazioni di filtri | parziale **[VERIFIED]** | CC-002, esteso in NB-1/NB-2 |
| I2 | N≥10 come **soglia canonica**: nessuna costante di soglia duplicata o configurata sotto 10 | chiuso da CC-002 | — |
| I3 | Isolamento PIB (nessuna policy applicativa, mig 027) **[VERIFIED]** | ok | — |
| I4 | KORA Link identità da `auth.uid()` **[VERIFIED]** | ok | — |
| I5 | Protezione differencing su filtri combinabili. **Esteso**: categoria × segmento × periodo; **differencing temporale**; **nessuna esposizione della storia di soppressione** | CC-002, esteso in NB-2 | CC-002, NB-2 |
| I6 | Confidence esterno all'Index, peso zero | chiuso da CC-002 | — |
| **I7** | **Golden cases IU, ≥20 casi, al centesimo** | chiuso da CC-002 | — |
| I8 | Isolamento a due tenant | CC-002 | — |
| I9 | Allowlist import sintetici → 0 | CC-002; 28 file in allowlist, azzerata da B-TRUTH | B-TRUTH |
| I10 | Registro completo | chiuso da CC-003 | esteso alla policy a sei superfici |
| I11 | Snapshot metodologico su ogni risultato persistito | colonne esistono **[VERIFIED]** | B-SNAP |
| I12 | Ogni numero decisionale ricostruibile fino alla sorgente. **Esteso** a `NeedObservation` e `ListeningResult` | assente | B-LIN |
| **I13** | **Decision Event append-only** — trigger DB, non convenzione | assente | N8 |
| **I14** | **Ogni nuovo oggetto di dominio ha tenant ownership, RLS, privacy level, regola di aggregazione, auditabilità** | assente | N1, esteso ai dieci oggetti nuovi |
| **I15** | **Isolamento della risposta individuale.** `SurveyResponse` in `personal`, senza `tenant_id`, senza policy applicative, accesso solo via SECURITY DEFINER con `search_path` fisso. Il test fallisce se una policy applicativa viene aggiunta | assente | NB-1 |
| **I16** | **Nessun testo libero nella v1 del Listening.** `SurveyQuestion.question_type` non ammette risposta libera. Rimovibile solo dopo design privacy/DPO dedicato | assente | NB-1 |
| **I17** | **Isolamento della pseudonym map.** `personal.worker_pseudonym_map` non raggiungibile da alcun ruolo aziendale né da alcun percorso di aggregazione del Listening | assente | NB-1 |

**Dal punto di vista aziendale, un bisogno `suppressed` deve essere indistinguibile da un bisogno inesistente.** Non si espone lo stato precedente, non si espone la transizione `suppressed → publishable`, non si espone il numero di categorie soppresse, non si espone la storia del `privacy_status`. La transizione è essa stessa informazione, ed è coperta da I5.

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

## 10.1 Need Taxonomy

**Distinta dalla Action Taxonomy, e non è un fattore dell'Impact Unit.** La Need Taxonomy descrive il **problema**; la Action Taxonomy — 79 azioni, 9 famiglie, 19 blocchi — descrive le possibili **risposte**. Forzarne l'identità renderebbe irrappresentabile il caso in cui a un bisogno corrispondono più famiglie di risposta, o nessuna.

**Struttura di ogni voce**: `stable_code` (immutabile per sempre) · `label` (mutabile) · `description` (mutabile) · `parent_code?` · `introduced_in_taxonomy_version` · `status` ∈ `active` | `deprecated` · `superseded_by?` (`stable_code`).

**Deprecazione e supersessione.** Quando un codice viene deprecato, l'osservazione storica **mantiene la propria `need_signature` originale** — è storia, non si riscrive. Confronto e aggregazione devono però poter risolvere la catena `superseded_by` per riconoscere che si tratta dello stesso bisogno. Senza questa risoluzione, la prima deprecazione spezza in due lo storico dei bisogni: **è il vero motivo per cui i codici devono essere stabili**, molto più del rename di un'etichetta.

**Mapping Need → Action** — contratto separato, cardinalità **N:M**:

```
NeedCategory → [ActionFamily]
  + mapping_version
  + confidence: 'direct' | 'partial' | 'indirect'
  + rationale
```

N:M perché un bisogno di conciliazione può trovare risposta in `family_and_care`, in `trust_and_flexibility_policy` o in un servizio territoriale; e perché **un bisogno può non avere alcuna famiglia mappata** — che è il caso E. È il mapping esplicito a rendere calcolabile il confronto Investment Map × Needs Map: senza, il confronto non esiste.

**Governance e contenuto sono cose diverse.** Il **contratto** della tassonomia è congelato al Contract Freeze; il **contenuto** è metodologicamente evolvibile. Nello Sprint 1 si produce un **set iniziale controllato sufficiente al pilota**, derivato per inversione dalle nove famiglie di azione esistenti — per ciascuna: a quale bisogno risponde. Nasce per costruzione mappabile e non inventato. Il contenuto cresce poi attraverso i casi E osservati nel Listening: **una nuova categoria entra per revisione metodologica, mai automaticamente.** Si aggiunge una categoria quando qualcuno l'ha espressa, non quando qualcuno l'ha immaginata.

---

# 11. METHODOLOGY SNAPSHOT

Immutabile, per ogni risultato persistito. Contiene: `methodology_version` · `taxonomy_version` · **`need_taxonomy_version`** · `bc_calibration_version` · **`contribution_config_version`** · `factor_statuses` (jsonb) · `pipeline_version` · `config_hash` · `calculation_timestamp`.

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

Ogni risultato persistito porta `lineage_id`, inclusi **`ListeningResult` e `NeedObservation`**.

**Il lineage di `ListeningResult` punta a `SurveyVersion` e a `methodology_snapshot_id`, non alle singole `SurveyResponse`.** L'aggregato è materializzato proprio perché deve restare ricostruibile anche dopo che una risposta individuale è stata cancellata o ritirata: la riproducibilità storica non può dipendere da dati soggetti a diritto di cancellazione.

**Test I12**: dato un `lineage_id`, ricalcolando con lo stesso snapshot si ottiene lo stesso numero al centesimo. Vive nel livello **Evidence**, mai mostrato al CFO.

---

# 13. ONE PRODUCT / ONE TRUTH

Demo e live condividono schema, servizi, scoring, Confidence, Decision Pack, Financial Intelligence, Contribution, metodologia e UI. **Differenza: solo la provenienza del dato.**

Da eliminare o consolidare **[tutti VERIFIED]**: `DemoScoringAdapter` (legge punteggi pre-calcolati da `kora-index-outputs.json`) · `ScoringSimulatorService` · `DemoDataService` · `AccessControlService` (registro utenti demo) · **`CommonsService`, che importa `commons-initiatives.json` per la discovery mentre `getPublishedInitiatives` legge dal DB live — due percorsi di scoperta nello stesso servizio** · i due seed di `KoraContributionService:3-4` · i restanti file `data/synthetic/` importati dai servizi — 28 nell'allowlist di CC-002, da portare **a zero, non svuotata e mantenuta** · la dichiarazione "non disponibile in live" in `app/company/financial/page.tsx` · le 11 pagine `/demo` con ruolo `DEMO_VIEWER`, synth-only **[DECISION REQUIRED D-C]** · seed incoerenti fra loro (S2 Ferretti assente dagli output Index).

---

# 14. WORKER ARCHITECTURE

> **IL WORKER LAYER È PARTE DELL'ARCHITETTURA DI MISURA.**

Non è rete futura. Serve a: **exposure** e **awareness** (senza, la diagnosi fra "programma inefficace" e "programma non arrivato" non esiste); **cross-period history** e quindi **CF canonico**; **PIB**; **KORA Link**; **opportunity access**; **booking**; **Worker Listening**, e quindi la Needs Map; closed loop futuro.

Non può essere rimosso né ridotto a feature futura. **È il collo di bottiglia dell'intera promessa START**: il percorso critico passa per `B-TRUTH → B-WORKER → NB-1 → NB-2 attivo → NB-3`.

Il consolidamento (`/worker` 2.376 L con auth reale vs `/my-kora` 4.023 L su demo-state **[VERIFIED]**) è **[DECISION REQUIRED D-D]** dopo l'architecture matrix di CC-024 — dodici dimensioni, non il conteggio righe.

**Requisiti che D-D deve ora includere**: auth reale · **assegnazioni survey** · **invii autenticati** · worker identity · **boundary di privacy della risposta individuale** · **pipeline di evidenza verso NeedObservation** · opportunities · activity discovery · booking · Dynamic CV · KORA Link.

Il requisito decisivo è l'invio autenticato con isolamento della risposta, che richiede il pattern `personal.*` — nessun `tenant_id`, isolamento per identità, accesso solo via SECURITY DEFINER — già implementato da `worker_identity` (mig 007), `worker_pseudonym_map` (mig 017) e `worker_pib` (mig 018 + 027) **[VERIFIED]**. **Non è un pattern nuovo: è l'applicazione di uno provato.**

---

# 15. PARTNER / BOOKING / TERRITORY ARCHITECTURE

**Già esistente e canonico** **[VERIFIED]**: `services/commons/BookingService.ts` (422 L, 4 rotte API, scrive nel PIB con maggiorazione cross-company) · `commons.booking` con `worker_tenant_id` e `post_tenant_id` e controllo di confine in SECURITY DEFINER · `network.partner_*` · `services/worker-opportunity`, `activity-discovery`. `app/partner` è ora governata da I10.

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

**Shared Needs future-proof.** L'aggregazione futura di bisogni compatibili fra imprese richiede una `need_signature` **stabile e semantica**: l'identità del bisogno deriva da `need_taxonomy_version` + `need_category_code` + `need_subcategory_code?`, **mai da tenant, settore, fascia dimensionale o periodo**, che sono contesto dell'osservazione. La stessa necessità osservata in contesti diversi deve poter essere riconosciuta come lo stesso bisogno. Shared Needs e Demand Aggregation **non si implementano ora**; ciò che si protegge è la compatibilità futura, e senza signature stabile richiederebbero una migrazione distruttiva.

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
| **Cosa ci stanno dicendo le persone?** | **Needs** | Overview |
| Perché? | **Investment Review** | Explain |
| Su quali evidenze? | **Evidence & Method** | Evidence |
| Cosa avevamo deciso? | **Decision Memory** | Explain |
| Come siamo messi rispetto agli altri? | **Benchmark** | Overview |
| Cosa facciamo adesso? | **next Investment Case** | Overview |

Ogni pagina riceve un `pathRank`: `PRIMARY` (percorso del compratore) · `SECONDARY` (un click) · `DEEP` (Evidence) · `OPERATIONAL` (fuori dal prodotto cliente). **Nessuna pagina eliminata: escono dal percorso mentale, non dal prodotto.** Test sulla composizione del percorso PRIMARY.

Gli otto costrutti non sono otto prodotti: il loro ruolo è fissato nella §6 e la UI lo rispecchia.

---

# 19. CONSOLIDATION BLOCKS

| ID | Goal | Min local prereq | Effort | Note chiave |
|---|---|---|---|---|
| **B-REG** | registro + ontologia in CI | — | S | I10; policy estesa a sei superfici |
| **B-INV** | invarianti pre-refactor | — | M | **I7 è la rete di sicurezza di tutto** |
| **B-SEC** | hardening pilot | — | S | esito duplice, §26 |
| **B-CI** | migration & E2E truth | — | M | **blocca N1**: nessuna nuova migrazione prima |
| **B-CLAIM** | fix claim DF/EXF/SF | D-E | XS | 3 file + test |
| **B-CONF** | Confidence canonico | B-INV, D-A | M | due formule diverse **[VERIFIED]** |
| **B-PACK** | Decision Pack canonico | B-INV, D-B | L | 7 capability uniche in `report-generator` **[VERIFIED]** |
| **B-BC** | BC in configurazione | **B-INV I7** | S | zero differenze numeriche |
| **B-SNAP** | Methodology Snapshot | B-BC, D-F | M+ | risolve i quattro nomi; **esteso a `contribution_config_version`** |
| **B-LIN** | Data Lineage | B-SNAP | M | I12, esteso a Listening e Needs |
| **B-024** | **applicazione migrazione 024** | B-CI | S | task dedicato: precheck schema, verifica conflitti con 025-048, apply, verifica RLS `worker_cross_company_select` e `opening_grade`, rollback. **Non superseded [VERIFIED]** |
| **B-TRUTH** | One Truth | B-CONF, B-PACK, B-SNAP, D-C | **XL+** | **finestra esclusiva**; esteso a `CommonsService` e ai seed Contribution |
| **B-WORKER** | superficie unica | B-TRUTH, D-D | L | requisiti Listening inclusi; **collo di bottiglia del percorso critico** |
| **B-SPEC** | ontologia + spec nel repo | D-K | S | **blocca tutto Phase B** |

**Contribution — criterio comportamentale.** L'intervento sulle costanti `CONTRIBUTION_IS_KORA_INDEX_COMPONENT`, `CONTRIBUTION_NO_RANKING`, `CONTRIBUTION_GATE_3_REQUIRED` **non consiste nell'importarle**. Oggi sono consumate **solo da `tests/unit/kora-contribution-hardening.test.ts`** e da una stringa `data-testid`; il servizio non le tocca mai **[VERIFIED]**. Sono garanzie testate, non applicate. Criterio di accettazione: **invertire il valore di una costante deve produrre un cambiamento osservabile nel runtime o far fallire esplicitamente un guard.** Se il runtime resta invariato, l'import è decorativo e il task non è concluso. È lo stesso criterio adversarial di B-BC: cambia un valore, qualcosa deve rompersi.

---

# 20. NEW KORA BLOCKS

| ID | Nome | Min local prereq | Effort | Tier |
|---|---|---|---|---|
| **N1** | ProgramDefinition + Participation — tipi, migrazioni, RLS, I14 | B-SPEC, B-CI | L | START |
| **N2** | Investment Case — ciclo di vita, commit gate, amendment | N1 | L | START |
| **N3** | Evidence Plan | N2, D-I | M | START |
| **N4** | Decision Rules + applicabilità metriche | N2 + flag tenant | M | START |
| **N5** | Retrospective Case | N2, N4 | S | START |
| **N6** | Capital Map **+ read model Investment Map** | N4, **B-BC** | M+ | START |
| **N7** | Investment Review + Decision Event **+ output verso ProgramBrief** | N6, **B-CONF** | M | START |
| **N8** | Decision Memory (append-only, I13) | N7, **B-SNAP** | M | GOVERN |
| **N9** | Benchmark Memory + Stage 0 (servizio trasversale) | N8 | M | GOVERN |
| **N10a** | Funnel — modello e conteggi | N1 | S | START |
| **N10b** | Funnel — popolamento exposure | **B-WORKER**, N10a | M | START |
| **N11** | Economic Case | N6 + sganciamento KPI HR | M | START |
| **N12** | Cockpit | N7, **B-LIN** | M | START |
| **N13** | Portfolio Review | N12, **B-PACK** | L | START |
| **N14** | Experience Simplification (`pathRank`, mappa domande) | B-REG | M+ | START |
| **NB-1** | **Worker Listening** | **B-WORKER**, F-11, F-12 validata DPO | **L** | START |
| **NB-2** | **Needs Map** | contratto congelato (modello) · NB-1 (attivazione) | **M** | START |
| **NB-3** | **Investment × Needs** | NB-2 + N6 read model | **S** | START |
| **NB-4** | **Program Brief** | B-PACK, N7, NB-2 | **S** | START |

**Nota di packaging**: N8 Decision Memory viene anticipato tecnicamente nello Sprint 2 per chiudere il ciclo architetturale e rendere verificabile la sequenza decisione → intervento → osservazione successiva. Commercialmente resta una capability GOVERN e non entra nel perimetro START.

## NB-1 — Worker Listening

**Purpose**: raccolta nativa dei segnali dalle persone, con isolamento della risposta individuale.

**Admin**: definizione survey, versionamento, domande e opzioni (scala, scelta singola, scelta multipla, risposta strutturata — **nessun testo libero, I16**), `question_function` obbligatorio, pubblicazione, popolazione target, assegnazione, chiusura, response rate aggregato.

**Worker**: elenco delle survey assegnate in superficie autenticata, bozza, invio, stato di completamento.

**Data**: `SurveyDefinition` · `SurveyVersion` · `SurveyQuestion` · `SurveyCampaign` · `SurveyAssignment` · `SurveyResponse` · `ListeningResult`.

**Privacy**: isolamento della risposta (I15) · identità pseudonima con isolamento della map (I17) · nessun accesso aziendale all'individuale (I1) · N≥10 in divulgazione · differencing e differencing temporale (I5) · protezione sui filtri combinati · retention · audit su ogni accesso alle risposte, incluso `KORA_ADMIN`.

**Output**: `ListeningResult` materializzato · `survey_aggregate` **come output**, non più solo come input · creazione di `NeedObservation` · integrazione Evidence.

**Collegamento obbligatorio**: una domanda `outcome_relevance` deve essere tracciabile in aggregato a un `ProgramDefinition` effettivamente attivato dal rispondente. Senza, NB-3 non può distinguere il caso D.

## NB-2 — Needs Map

**Include**: `NeedObservation` · `NeedsMapSnapshot` · Need Taxonomy (contratto + set iniziale controllato) · mapping Need → Action · aggregazione con soglia · versionamento · privacy · provenienza della fonte · confronto temporale.
**Non include**: Shared Needs.
**Riusa**: `EquityAccessIntelligenceService` per `segment_ref` e underserved population — misura già i segmenti sotto e sopra-attivati con soppressione N<10 **[VERIFIED]** · `lib/privacy/group-threshold.ts` per la soppressione · la scala EV per `evidence_level`.

**Contratto `NeedObservation`**: `need_observation_id` · `tenant_id` **NOT NULL** · `need_signature` · `need_taxonomy_version` · `need_category_code` · `need_subcategory_code?` · **`sample_size`** (nessuna soglia minima) · **`privacy_status`** ∈ `suppressed` | `publishable`, derivato · `population_descriptor` · `segment_ref?` · `source_type` ∈ `worker_listening` | `survey_aggregate_upload` | `activation_signal` | `advisor_assessment` · `evidence_refs[]` · `evidence_level` · `observation_period` · `observed_at` · `related_program_definition_id?` **nullable** · `methodology_snapshot_id?` · `lineage_id`.

**Prevalenza e intensità**: la **prevalenza** è derivabile da `sample_size` e dal denominatore eleggibile e si congela come derivata. L'**intensità** dipende dalla scala di risposta, che NB-1 non ha ancora definito: si rimanda a NB-1 e non si congela ora.

## NB-3 — Investment × Needs

Distingue cinque casi.

| Caso | Dati necessari |
|---|---|
| **A** — programma adeguato e attivo | ProgramDefinition mappato su `need_category_code` + activation ≥ atteso + evidenza sufficiente |
| **B** — esiste ma non conosciuto | programma mappato + `exposed` alto + `aware` basso (N10b) |
| **C** — conosciuto ma difficile da raggiungere | programma mappato + `aware` alto + `activated` basso |
| **D** — attivato ma non pertinente | programma mappato + `activated` adeguato + **`NeedObservation` persistente sulla stessa categoria, alimentata da domande `outcome_relevance`** |
| **E** — bisogno senza risposta | `NeedObservation` con `related_program_definition_id` null **e** nessun programma in famiglie mappate |

**Prerequisito esplicito sul caso D**: richiede dati `outcome_relevance` collegabili in aggregato a un programma realmente attivato. **In loro assenza il confronto dichiara il caso `NOT DETERMINABLE`, e non lo collassa sul caso A.** Il funnel da solo non basta: senza sapere se il bisogno permane *dopo* l'esperienza, un programma attivato appare sempre riuscito.

## NB-4 — Program Brief

**Input**: `NeedObservation` · gap dalla Needs Map · `InvestmentReview` · evidenze · popolazione · contesto decisionale.
**Output**: `ProgramBrief`.
**Contratto**: `program_brief_id` · `tenant_id` · `problem_statement` · `need_observation_refs[]` · `evidence_refs[]` · `target_population_descriptor` + `size` · `objective` · `response_characteristics` · `constraints` · `indicators_to_observe[]` · `status` ∈ `draft` | `approved` | `discarded` | `converted` · `created_from_review_id?` · `created_from_need_observation_id?` · `resulting_program_definition_id?`.
**Riusa**: `evidence-gap-engine` per gli evidence refs, `EquityAccessIntelligenceService` per la popolazione, `ActivationOpportunityService` per il problema, il Decision Pack come contenitore di origine.

---

# 21. CONTRACT FREEZE PLAN — entro il giorno 12

**Corregge il rischio dei blocchi finali**: non devono inventare architettura in pochi giorni.

Congelati a livello di **tipo e contratto**, non di implementazione, e verificati contro l'ontologia ufficiale.

| Contratto | Deve dichiarare | Verificato contro |
|---|---|---|
| `CapitalMapResult` | partizione per **stato** che somma a `budget_allocated`; **natura** come dimensione ortogonale; `reallocation_candidate` come **flag**, non classe | §3, §5 |
| `InvestmentReview` | regola scattata, esito indicato, esito effettivo, `review_blocked_reason`; output opzionale verso ProgramBrief | §3, §6 |
| `DecisionEvent` | i dieci campi minimi della §17; append-only | §5, I13 |
| `BenchmarkMemoryRecord` | chiave `sector × workforce × period`; banding versionato; nessun testo libero, nessun `decision_owner`, nessun tenant | §16 |
| `EconomicCaseResult` | tre livelli — Observed Capital, Documented Economic Exposure, Economic Opportunity; **nessun pseudo-ROI** | §6 |
| `PortfolioReview` | struttura a revisione di portafoglio, non a punteggio | §18, §20 |
| **`NeedObservation`** | i campi della §20; `sample_size` senza soglia; `privacy_status` derivato; **`related_program_definition_id` nullable**; `need_signature` da codici stabili | §3, §5, principio 9 |
| **`NeedsMapSnapshot`** | `period`, `need_taxonomy_version`, `methodology_snapshot_id`, `observation_refs[]`, `banding_version` | §11, §16 |
| **`ProgramBrief`** | i campi della §20; due ingressi; `resulting_program_definition_id` nullable e immutabile una volta valorizzato | §3, §20 |
| **`NeedTaxonomyContract`** | struttura (codici stabili, label, gerarchia), governance, versionamento, changelog, deprecazione e supersessione, provenienza, pubblicazione, **contratto di mapping Need → Action** | §10.1 |

**Non congelato: `ListeningResult`.** È un aggregato derivato interamente da `NeedObservation.source_type` e dallo schema survey, entrambi definiti dentro NB-1. Congelarne la forma prima di sapere quali domande vengono poste sarebbe l'errore che il calendario a due sprint esiste per evitare. Va **allineato** a `NeedObservation.source`, non congelato prima.

**Acceptance**: dieci contratti tipizzati, compilanti, con test di forma, **approvati entro il giorno 12**.

---

# 22. LOCAL DEPENDENCY GRAPH

```
CONTRACT FREEZE (10) ──┬──▶ NB-2 modello ────────────────┐
   giorno 12           │                                  │
                       └──▶ N1 ──▶ N2 ──▶ N4 ──▶ N6 ──▶ N7
                                                    │      │
B-INV(I7) ──▶ B-BC ────────────────────────────────┘      │
                                                           ▼
B-CONF ────────────────────────────────────────────▶ NB-4 Program Brief
                                                           ▲
B-CI ──▶ B-024 ──▶ KORA Space live                        │
                                                           │
B-TRUTH (finestra esclusiva) ──▶ B-WORKER ──▶ NB-1 ──▶ NB-2 attivo ──▶ NB-3
                                     │                          │
                                     └───────────────────▶ N8 ──┘
```

**Le serializzazioni vere**: B-TRUTH esclusiva · B-WORKER dopo B-TRUTH · NB-1 dopo B-WORKER · NB-3 dopo NB-2 attivo e N6 · N13 dopo B-PACK.

**Il percorso critico** è `B-TRUTH → B-WORKER → NB-1 → NB-2 attivo → NB-3`. B-WORKER non è più un blocco di consolidamento fra gli altri: è il collo di bottiglia della promessa START.

**Il modello di NB-2 non dipende da NB-1** e può essere congelato e costruito nello Sprint 1; è la sua **alimentazione nativa** a dipendere dal Listening.

---

# 23. METHODOLOGY COMPLETION GATE

**Due soglie distinte.**

**METHODOLOGY DECIDED — Sprint 1, giorno 22.** Per CQ, EV, CF, DF, EXF, SF: `SOURCE DATA → COMPUTABILITY → FORMULA → RANGE → TEST → VERSION → ACTIVATION DECISION`. Sei schede, sei decisioni **[D-N]**.

**METHODOLOGY COMPLETED — fine Sprint 1.** Ogni fattore giudicato **computabile con dati già disponibili** deve essere **IMPLEMENTATO, TESTATO, VERSIONATO**.

Può restare inattivo o proxy **solo** se: richiede dati non disponibili · richiede storia longitudinale inesistente · non c'è evidenza sufficiente · c'è rischio di doppio conteggio · manca una definizione metodologicamente difendibile. **La ragione va documentata. "Rimandato per tempo" non è una ragione accettabile.**

I fattori inattivi restano nel Methodology Appendix con: `DEFINED` · `NOT ACTIVE` · `REASON` · `DATA REQUIRED` · `VERSION TARGET`.

---

# 24. FRESH TENANT TEST

Un dataset **mai usato durante lo sviluppo** attraversa autonomamente: ingestione → normalizzazione → tassonomia → IU → Index/Contribution → funnel → Capital Map → Investment Review → Decision Pack.

**Tre categorie di input, tutte obbligatorie.**

**ADVERSARIAL DATA** — campi obbligatori mancanti · tipi di evidenza non mappati (esercita il fallback EV 0.5) · gruppi con esattamente 9 e 10 persone · famiglie di azione non in tassonomia · **categorie di bisogno non in Need Taxonomy** · intestazioni non canoniche · date fuori periodo · importi zero e negativi · programmi senza budget.

**REAL-WORLD MESSY DATA** — nomi programma incoerenti fra sistemi · stesso provider scritto in modi diversi · budget annuale con consuntivo trimestrale · programmi che attraversano periodi · obbligatorio misto a volontario · beneficiari indiretti e familiari · iniziative territoriali · duplicati · classificazioni ambigue · dati parziali da più sistemi.

**LISTENING DATA (Sprint 2)** — risposte con popolazioni a 9 e 10 · periodi mancanti · **una campagna priva di domande `outcome_relevance`**: il sistema deve dichiarare il caso D `NOT DETERMINABLE`, **non produrre un falso caso A**.

**Il sistema deve distinguere quattro esiti**: `INVALID DATA` · `UNCERTAIN MAPPING` · `VALID BUT INCOMPLETE` · `VALID OBSERVATION`.

> **Regola assoluta: l'ambiguità semantica non diventa mai precisione numerica.** Un provider scritto in tre modi non diventa silenziosamente tre provider, né uno solo: diventa `UNCERTAIN MAPPING` con confidenza dichiarata.

**FT-1 — Sprint 1, giorno 20** (fino al funnel, subito dopo One Truth — otto giorni di runway) · **FT-2 — Sprint 1, giorno 28** (catena fino al Decision Pack) · **FT-3 — Sprint 2** (catena completa con Listening e Needs Map).

**Se FT-1 rivela un fallimento strutturale, quello è il segnale per rinegoziare il calendario, non per comprimere in silenzio i blocchi successivi.**

---

# 25. BUYABILITY GATES

| | Quando | Su cosa | Verifica |
|---|---|---|---|
| **Alpha** | Sprint 1, giorno 14 | **artefatto di design, non un branch** | percorso a otto domande + **si capisce che il centro è il Program e il suo ciclo, non "software per Investment Case"** |
| **Beta** | Sprint 1, giorno 23 | pipeline reale, tenant dimostrativo | numeri veri |
| **Final** | **fine Sprint 2** | catena completa | dodici risposte, da **una persona che non conosce KORA** |

Le dodici risposte: capitale allocato · attivato · dove sono i problemi · solidità dell'evidenza · programmi che richiedono attenzione · decisioni pre-registrate · condizioni scattate · cosa KORA propone · cosa è cambiato dal ciclo precedente · posizione rispetto ai peer · quante aziende mancano se la coorte non c'è · quali evidenze sostengono ciascun numero. **Senza attraversare quindici dashboard.**

L'Alpha si butta via: non deve diventare codice con logica finta, sarebbe One Truth violato dalla porta di servizio.

**START non è commercialmente completo** finché non sono tutti soddisfatti: **auth worker reale** · **Worker Listening nativo** · **Needs Map** · **Investment × Needs** · **KORA Space live** (024 applicata e discovery live) · **Contribution methodology-safe** · **Decision Pack canonico** · **Program Brief** · **gate privacy verdi** (I15, I16, I17; DPIA che copre il Listening). Il giorno 30 non si salva artificialmente: è il gate di fine Sprint 1, non la release.

---

# 26. SECURITY / PRIVACY GATES

**Pilot blocker**: dipendenze high · superficie worker su auth reale · migration truth · E2E realmente eseguiti · qualunque bypass di privacy dimostrato.

**Esito del gate dipendenze — due soli ammessi:**
- **SECURITY PASS**
- **SECURITY BLOCKED BY EXPLICIT DEPENDENCY DECISION** — con advisory, package, exploitability nel contesto KORA, fix disponibile, rischio di breaking change **[D-L]**

**Claude Code non deve forzare un upgrade per rendere artificialmente verde il gate.**

**Parallelizzabile, richiesto prima della release**: validazione di schema sulle 37 rotte mutanti su 44 **[VERIFIED]** · formato errore unico (14 punti con `error.message` al client **[VERIFIED]**) · rate limiting oltre le 12 rotte su 86 **[VERIFIED]** · `search_path` su `kora.is_service_role_context`, unica su 22 senza **[VERIFIED]** · CSP con nonce.

**Regola I14**: nessun nuovo oggetto di dominio senza tenant ownership, strategia RLS, privacy level, regola di aggregazione, auditabilità. **Campo obbligatorio in ogni specifica.**

## 26.1 Requisiti privacy del Worker Listening

Non negoziabili, e vincolanti per NB-1.

**La risposta appartiene al lavoratore.** `SurveyResponse` in schema `personal`, senza `tenant_id`, isolamento per identità — lo stesso pattern di `personal.worker_pib`, che non ha alcuna policy di accesso applicativo **[VERIFIED]**. Accesso solo via SECURITY DEFINER con `search_path` fisso (I15).

**L'azienda non può recuperare la risposta individuale**, per nessun ruolo, con nessuna combinazione di filtri (I1).

**Identità pseudonima, non anonima pura** — `personal.worker_pseudonym_map` isolata da ogni percorso di aggregazione (I17). **`FOUNDER DIRECTION — REQUIRES DPO VALIDATION`**: pseudonimo abilita la Needs Map longitudinale di GOVERN; anonimo puro è più difendibile ma la rende impossibile. La direzione è presa, la validazione è esterna e va avviata prima dello Sprint 2.

**Nessun testo libero nella v1** (I16). Una risposta aperta è re-identificabile per contenuto anche in un aggregato sopra soglia. Rimovibile solo dopo design privacy/DPO dedicato.

**Soglia N≥10 in divulgazione**, con la costante canonica di `lib/constants/kora.ts`. **Non è una regola di esistenza**: un'osservazione sotto soglia si conserva e non si espone.

**Differencing** su filtri combinabili, coorti piccole, **differencing temporale**, e **nessuna esposizione della storia di soppressione** (I5). Un bisogno soppresso deve essere indistinguibile da un bisogno inesistente.

**Ritenzione e cancellazione**: politica esplicita sulle risposte individuali, con esercizio dei diritti dell'interessato. Le risposte grezze non sopravvivono all'aggregato oltre il necessario — ed è per questo che `ListeningResult` è materializzato.

**Audit log** su ogni accesso alle risposte individuali, incluso il ruolo `KORA_ADMIN`.

---

# 27. PILOT RELEASE GATE

Buyability Final superato · una sola superficie lavoratore autenticata · nessuna schermata che dichiari qualcosa non disponibile in live · Methodology Appendix redatto · schema validation, error envelope, rate limiting · test di differencing verde · `/demo` decisa e applicata · **[EXTERNAL]** DPIA — **che deve coprire esplicitamente il Worker Listening** — DPA, ROPA avviate; memo art. 4 commissionato; finestra pen test prenotata.

---

# 28. EXECUTION CALENDAR

La release START avviene alla fine dello Sprint 2. I trenta giorni non sono più una verità del prodotto: sono la durata dello Sprint 1.

## Sprint 1 — Fondazioni, architettura, decision core (30 giorni)

| Giorni | Workstream A | Workstream B | C (non-code) | Gate / Decisione | Output |
|---|---|---|---|---|---|
| **1-2** | CC-001 inventario | CC-002 invarianti I2/I6/I9 | **B-SPEC: ontologia + spec** · legale, pen test, Delphi · **avvio validazione DPO F-12** · CC-045 dataset FT | **D-E…D-K, D-M** | ontologia congelata; dataset ostile + messy |
| **3-4** | CC-003 registro + ontologia in CI | CC-002 **I7 golden**, I5, I8 | CC-006 sicurezza | approvazione inventario | registro verde; **I7 congelato** |
| **5-6** | CC-007 CI truth | **CC-027 N1 Definition + Participation** | CC-008 fix claim · CC-048 audit Need Taxonomy | **D-L** | CI verificata; ontologia tipizzata |
| **7-8** | CC-004 audit Confidence | CC-028 N1 RLS + I14 | Methodology Appendix v0 | **D-A** | N1 completo |
| **9-10** | CC-005 audit Decision Pack | CC-029 **N2 Investment Case** | mappa domande (N14) · CC-053 policy I10 | **D-B** | ciclo di vita; sei superfici governate |
| **11** | CC-011 Confidence | CC-030 N2 commit gate + amendment | CC-009 **B-BC** | — | un solo CS |
| **12** | CC-012 adversarial CS | **CC-047 CONTRACT FREEZE — dieci contratti** | — | **CONTRACT FREEZE APPROVATO** | contratti tipizzati, incluso `NeedTaxonomyContract` |
| **13** | CC-013 Decision Pack | CC-031 **N3 + N4** · CC-049 NeedObservation tipi | prototipo Buyability Alpha | — | regole valutabili |
| **14** | CC-014 adversarial DP | CC-050 mapping Need → Action | — | **BUYABILITY ALPHA** · **D-C** | un solo DP; set iniziale controllato |
| **15** | **INTEGRAZIONE** | — | — | — | suite verde |
| **16** | CC-015 **B-SNAP** | CC-032 **N5 + N10a** | CC-024 architecture matrix worker | **D-D** · **stima Sprint 2** | snapshot; retrospettivo |
| **17-19** | **CC-018…021 · B-TRUTH — FINESTRA ESCLUSIVA** | — | Methodology Appendix | approvazione per gruppo | seed → tenant |
| **20** | CC-022 chiusura B-TRUTH · CC-051 **B-024** | — | — | **FT-1** | demo = live, I9 = 0; KORA Space live |
| **21-22** | CC-023 adversarial + CC-052 discovery live | CC-017 **B-LIN** | **CC-044 Methodology** | **METHODOLOGY DECIDED · D-N** | lineage; sei decisioni |
| **23** | CC-025 **B-WORKER** | CC-033 **N6 + read model Investment Map** | — | **BUYABILITY BETA** | superficie unica |
| **24** | CC-026 adversarial worker | CC-033 completamento + **implementazioni metodologiche approvate** · CC-054 Contribution | — | — | fattori computabili implementati |
| **25** | **INTEGRAZIONE** | — | — | — | suite verde |
| **26** | CC-034 **N7 Review + DecisionEvent** | CC-035 **N10b + N11** | — | — | Review; funnel; Economic Case |
| **27** | CC-038 **N12 Cockpit** | CC-039 **N14 Experience** | — | — | decisioni sopra la piega |
| **28** | CC-040 **N13 Portfolio Review** | CC-061 Investment Map read model | — | **FT-2** | portfolio review |
| **29-30** | CC-041 adversarial + CC-042 rimedi | CC-043 E2E catena | — | **GATE FINE SPRINT 1** | architettura completa; decision core funzionante |

**Gate di fine Sprint 1**: architettura completa · decision core funzionante · Needs Map **modellata** e alimentabile in modo assistito tramite `survey_aggregate` come input · metodologia decisa e completata.

## Sprint 2 — START completion

**Contenuto**: **NB-1 Worker Listening** (CC-055…060) · **NB-2 attivazione nativa** · **NB-3 Investment × Needs** (CC-062) · **NB-4 Program Brief** (CC-063) · **N8 Decision Memory** · **N9 Benchmark Stage 0** · **FT-3** · **Buyability Final** · DPIA estesa al Listening.

**Durata: non stimata.** NB-1 è un blocco L con RLS nuova, e la sua dimensione reale dipende da due cose oggi non decise: l'esito della validazione DPO su F-12 e la scelta D-D. **La stima si produce al giorno 16 dello Sprint 1**, dopo CC-024 e con l'esito DPO in mano. Un numero prodotto ora sarebbe inventato.

**Release gate reale**: fine Sprint 2.

## GOVERN

Listening periodico e coorti temporali · Needs Map longitudinale · Program Design · Partner Activation · Advisor Review & Sign-off.

## NETWORK

Nulla da costruire. Solo `need_signature` protetta.

---

# 29. PARALLELIZATION MAP

**Sicuri**: B-REG ∥ B-INV ∥ B-SEC · B-CONF ∥ B-PACK · N1…N6 ∥ qualunque consolidamento tranne B-TRUTH · B-LIN ∥ N6 · N12 ∥ N14 · **NB-2 modello ∥ qualunque cosa** (non dipende da NB-1).
**Mai**: B-TRUTH con qualunque codice · CC-011 con CC-013 · B-WORKER con N10b · **NB-1 con B-WORKER** · N13 con B-PACK.
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
| 024 | Architecture matrix worker (12 dimensioni + requisiti Listening) | A-audit | B-WORKER | — | **Sì → D-D** |
| 025-026 | Consolidamento + adversarial worker | A | B-WORKER | D-D, 023 | Sì |
| 027-028 | N1 ProgramDefinition + Participation | B | N1 | B-SPEC, 007 | Sì |
| 029-030 | N2 Investment Case | B | N2 | 028 | Sì |
| 031 | N3 + N4 | B | N3, N4 | 030, D-I | Sì |
| 032 | N5 + N10a | B | N5, N10a | 031 | Sì |
| 033 | N6 Capital Map + read model | A | N6 | 031, 009, 047 | Sì |
| 034 | N7 Review + DecisionEvent | A | N7 | 033, 011, 047 | Sì |
| 035 | N10b + N11 | B | N10b, N11 | 025, 033 | Sì |
| 036 | N8 Decision Memory (I13) | A | N8 | 034, 015, 047 | Sì |
| 037 | N9 Benchmark (3 assi, trasversale) | A | N9 | 036, 047 | Sì |
| 038 | N12 Cockpit | B | N12 | 034, 017 | Sì |
| 039 | N14 Experience Simplification | B | N14 | 003 | Sì |
| 040 | N13 Portfolio Review | B | N13 | 038, 013, 047 | Sì |
| 041-042 | Adversarial finale + rimedi | A-adv | — | 040 | **Sì** |
| 043 | E2E catena completa | release | — | 042 | **Sì** |
| 044 | Methodology Completion Gate | A-audit | §23 | 009, 015 | **Sì → D-N** |
| 045 | Generazione dataset FT (adversarial + messy + listening) | B | §24 | D-M | Sì |
| 046 | Esecuzione FT-1, FT-2, FT-3 | QA | §24 | 045, 022 | **Sì** |
| 047 | **CONTRACT FREEZE — dieci contratti** | B | §21 | ontologia, N2 | **Sì** |
| **048** | Audit Need Taxonomy — costrutti riusabili e criteri di categoria | A-audit | NB-2 | contract freeze | **Sì** |
| **049** | NeedObservation + NeedsMapSnapshot — tipi e migrazioni | B | NB-2 | 048 | Sì |
| **050** | Need → Action mapping layer + set iniziale controllato | B | NB-2 | 049 | Sì |
| **051** | Apply migrazione 024 — precheck, apply, verifica, rollback | A-migration | B-024 | 007, F-09 | **Sì** |
| **052** | Ritiro discovery sintetica `CommonsService` | B | B-TRUTH | 051 | Sì |
| **053** | Estensione `APP_SURFACE_POLICY` + registry | B | B-REG | 003 | Sì |
| **054** | Contribution — costanti come policy runtime + config versionata | B | B-SNAP | 015 | Sì |
| **055** | Audit privacy Worker Listening — schema, RLS, differencing | A-audit | NB-1 | B-WORKER, **DPO** | **Sì** |
| **056** | Survey domain — tipi e migrazioni | B | NB-1 | 055 | Sì |
| **057** | Admin survey — definizione, pubblicazione, assegnazione | B | NB-1 | 056 | Sì |
| **058** | Worker survey — compilazione autenticata | B | NB-1 | 056, D-D | Sì |
| **059** | ListeningResult materializzato + produzione NeedObservation | B | NB-1 | 058 | Sì |
| **060** | Adversarial Worker Listening — differencing, temporale, filtri, soppressione | A-adv | NB-1 | 059 | **Sì** |
| **061** | Investment Map read model | B | N6 | 033 | Sì |
| **062** | Investment × Needs — cinque casi, D non determinabile senza outcome_relevance | B | NB-3 | 059, 061 | Sì |
| **063** | ProgramBrief | B | NB-4 | 034, 049 | Sì |

**Da scrivere solo dopo un audit**: 011 (004+D-A) · 013 (005+D-B) · 018-023 (010+D-C) · 025 (024+D-D) · 027 (B-SPEC) · implementazioni metodologiche (044+D-N) · **050 (dopo 048)** · **056 (dopo 055 e validazione DPO)** · **058 (dopo D-D)**.

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

**Due modalità.** **MODE A — Audit First**: AUDIT read-only → HUMAN GATE → IMPLEMENT → ADVERSARIAL QA. Obbligatoria per Confidence, Decision Pack, One Truth, worker consolidation, metodologia, Capital Map, Decision Memory, benchmark, **Worker Listening**, **Needs Map**, refactor sensibili alla sicurezza. **MODE B — Read-First Implement**: PHASE 0 read/verify → report → implement solo se lo stato coincide → test → report. **Nessun prompt salta la fase READ.**

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
| `services/privacy-visibility/` | dopo B-INV | lo strato canonico è coperto |

**Nessun percorso sintetico si cancella prima che la migrazione live sia completata e verificata.** L'allowlist di `lib/security/synthetic-import-allowlist.ts` va portata **a zero e poi eliminata insieme al suo guard test — non svuotata e mantenuta**, come il file stesso dichiara.

Nient'altro. `company-setup` e `report-generator` restano **INVESTIGATE**.

---

# 32a. CC-022 — CHIARIMENTO SCOPE I9 (ratifica fondatore, 2026-09-05)

**Regola originale (invariata, non cancellata):** Sezione 28, riga "20" — "CC-022 chiusura B-TRUTH ... demo = live, I9 = 0"; Sezione 32 — "`DemoScoringAdapter` · `ScoringSimulatorService` · `demo-data` · `access-control` | fine B-TRUTH | I9 = 0, adversarial superata".

**Contraddizione rilevata (CC-00 Closure Decision Gate, 2026-09-05):** al momento della verifica, 3 dei 6 residui I9 allora rimanenti in `lib/security/synthetic-import-allowlist.ts` (`AccountProvisioningService`, `WorkerAchievementService`, `WorkerProvisioningService`) non sono azzerabili senza una decisione di prodotto Worker/My KORA — decisione che il Master Plan stesso riserva esplicitamente a **B-WORKER** (Sezione 28, riga "23", CC-025 — "superficie unica"; righe 478/683/690 — percorso critico `B-TRUTH → B-WORKER → NB-1 → NB-2 attivo → NB-3`). La stessa Execution Calendar fa iniziare B-WORKER al giorno 23, **dopo** CC-022 (giorno 20). CC-022, letta alla lettera come azzeramento globale dell'allowlist, richiederebbe quindi una decisione B-WORKER prima che B-WORKER stesso inizi.

**Ratifica (founder decision, CC-00 Governance Ratification, 2026-09-05):**
- `GLOBAL_I9_ZERO_REINTERPRETED = YES` — "I9 = 0" resta l'obiettivo finale dell'allowlist nel suo complesso, ma il **gate di chiusura di CC-022** viene riletto come riferito al solo sottoinsieme di proprietà B-TRUTH.
- `BTRUTH_SCOPED_I9_ZERO_REQUIRED = YES` — CC-022 può dichiararsi chiuso solo quando i residui `owner: 'B_TRUTH'` sono a zero: `ScoringSimulatorService`, `DemoDataService`, `ActivationSafeguardService` (percorso `evaluateFromSeed()`).
- `BWORKER_RESIDUALS_STILL_TRACKED = YES` — i residui `owner: 'B_WORKER'` (`AccountProvisioningService`, `WorkerAchievementService`, `WorkerProvisioningService`) restano nell'allowlist, restano visibili nel conteggio totale, e restano un requisito di chiusura per B-WORKER stesso — non vengono eliminati né dichiarati permanenti.
- **Non è un'esenzione generica.** Si applica solo a questi 3 residui, la cui proprietà B-WORKER è già evidenziata dal Master Plan stesso (non inventata qui). Qualunque nuovo residuo futuro è `owner: 'B_TRUTH'` per default e richiede la propria giustificazione esplicita per essere riassegnato.

Dettaglio implementativo (campo `owner` per residuo, guardie di regressione, contratto di trasferimento a B-WORKER): `lib/security/synthetic-import-allowlist.ts`, `lib/architecture/registry.ts`, `tests/unit/cc00-i9-governance-ratification.test.ts`.

---

# 33. DO-NOT-DELETE / FUTURE CORE

`services/commons/BookingService.ts` + schema `commons` — **vivo e canonico**, con il pattern cross-tenant `worker_tenant_id × post_tenant_id` **[VERIFIED]** · `network.partner_*`, `app/partner/` · `kora_link.*` · `personal.worker_pib`, `personal.worker_pseudonym_map`, `services/worker-pib/` — prerequisiti di CF canonico **e di Worker Listening** · `services/kora-contribution/` e `lib/kora-contribution/` · `services/dynamic-cv/` · `services/worker-opportunity/`, `activity-discovery/` — **base tecnica di Exposure** · `collective-initiatives` come forma dei programmi territoriali **[VERIFIED]** · **i nuovi oggetti Survey, Needs e ProgramBrief, che nascono core e non sono mai candidati alla rimozione** · `services/company-setup/`, `services/report-generator/` — **INVESTIGATE**.

**`FROZEN` non significa non vendibile.** Uno stato `FROZEN` nel registry indica che **lo sviluppo è fermo**, non che la capability sia indisponibile. **KORA Link è `FROZEN` nel registry e `OPTIONAL / ADD-ON` nel listino**: disponibile secondo configurazione, popolazione attivata e pricing dedicato, e **non è requisito per dichiarare START core completato**. I due stati sono compatibili e vanno letti su piani diversi — il registry descrive il codice, il listino descrive l'offerta.

---

# 34. FAILURE / ROLLBACK

La suite rompe → non si adatta il test al codice. Prima si stabilisce se il test è obsoleto o il codice sbagliato. Un golden case IU che cambia dove non doveva è un difetto per definizione.
Un invariante costituzionale fallisce → stop del branch. I1-I17 non si negoziano.
Un adversarial trova un bloccante → il blocco non è concluso; prompt di rimedio, non si prosegue.
`STATE_MISMATCH` → non si procede, si riconcilia.
B-TRUTH rompe la demo → scenario più probabile: migrazione per file, un commit ciascuno, seed originali in `data/seed-source/` fino alla chiusura.
Slittamento oltre due giorni sul percorso critico → si sposta l'ultimo blocco non critico e lo si dichiara; **non si comprime in silenzio**.
Le giornate 15 e 25 dello Sprint 1 sono presidi, non riserve.

---

# 35. FINAL DEFINITION OF DONE

**ONTOLOGY FROZEN — Sprint 1, giorno 2.** Oggetti, relazioni, stato vs evento, tenancy e privacy congelati e nel repository.

**CONTRACTS FROZEN — Sprint 1, giorno 12.** Dieci contratti tipizzati e approvati, incluso il `NeedTaxonomyContract`. Il **contratto** della tassonomia è congelato; il **contenuto** resta metodologicamente evolvibile.

**METHODOLOGY COMPLETE — fine Sprint 1.** Sei decisioni prese al giorno 22; ogni fattore computabile con i dati disponibili **implementato, testato, versionato**. Gli inattivi hanno ragione documentata fra le cinque ammesse. **Zero fattori "rimandati per tempo".**

**FOUNDATION COMPLETE — fine Sprint 1.** Architettura completa, decision core funzionante, una sola pipeline, una sola verità metodologica, un solo Decision Pack, un solo Confidence, una sola superficie lavoratore, KORA Space live, Needs Map modellata e alimentabile in modo assistito. FT-1 e FT-2 superati.

**LISTENING COMPLETE — Sprint 2.** Worker Listening nativo: definizione, pubblicazione, assegnazione, compilazione autenticata, `ListeningResult` materializzato, produzione di `NeedObservation`. I15, I16, I17 verdi. Adversarial su differencing, differencing temporale e soppressione superata.

**CODE COMPLETE — fine Sprint 2.** Tutti i blocchi implementati, integrati, testati. Ogni numero ricostruibile fino alla sorgente. Decision Event append-only con trigger DB. Catena end-to-end verde su tenant dimostrativo **e** tenant cliente, con gli stessi servizi.

**PIPELINE PROVEN — fine Sprint 2.** FT-3 superato su dati adversarial, messy **e** di listening: ogni passaggio produce un risultato o un rifiuto motivato e tracciabile, distinguendo `INVALID` · `UNCERTAIN MAPPING` · `VALID BUT INCOMPLETE` · `VALID OBSERVATION`. Il caso D è `NOT DETERMINABLE` quando mancano dati `outcome_relevance`, **mai collassato su A**. **Mai un risultato inventato.**

**PRODUCT COMPLETE — fine Sprint 2.** Buyability Final superato da una persona che non conosce KORA. Methodology Appendix redatto. Nessuna schermata che dichiari qualcosa non disponibile in live. **Questa è la release START.**

**Con dati vuoti o proxy per natura, dichiarati**: CF resta `proxy` finché non esiste storia cross-periodo · `subsequent_observation` si popola al secondo ciclo reale · Benchmark resta Stage 0 finché non ci sono dieci aziende, **ma l'asse *You vs yourself* funziona dal secondo ciclo di ciascun cliente** · la Needs Map longitudinale richiede più cicli di Listening. Limiti di tempo e adozione, non di codice.

**PILOT RELEASE APPROVED — [EXTERNAL]**: DPIA che copre il Worker Listening, DPA, memo art. 4.
**ENTERPRISE ASSURANCE COMPLETE — [EXTERNAL]**: pen test, calibrazione Delphi.

---

## Cosa è KORA

L'Investment Case è il **prima**. Il Worker Listening e la Needs Map sono **la metà del ciclo che parte dalle persone**. IU, Index e Contribution sono il **metro**. Il Capital Map è la **lettura economica**. La Review è il **momento decisionale**. Il Program Brief è **il ponte verso ciò che ancora non esiste**. La Decision Memory è il **tempo**. Il Benchmark è il **mercato**. Worker layer, PIB, KORA Link, partner network, booking e territorio sono il **livello di rete**.

KORA costruisce una memoria verificabile di come il capitale investito nelle persone viene allocato, attivato, osservato e trasformato in decisioni — e di ciò che le persone dicono di aver bisogno, anche quando una risposta non esiste ancora.

Se un blocco sembra allontanarsi da questo, è il blocco a essere sbagliato.

---

## Come si lavora da qui

1. prendi il prossimo CC-ID dalla §30
2. se ha una decisione a monte, chiudila con le decisioni fondatore
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

---

`MASTER PLAN v2.1 = FINAL EDITORIAL FREEZE APPROVED`
