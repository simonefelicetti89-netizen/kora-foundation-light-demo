# KORA — Invariants

**Branch:** `docs/consolidation`
**Versione:** CC-05 · 2026-06-30
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN · Gate 5 OPEN

Questo documento elenca gli invarianti non negoziabili di KORA.

Un **invariante** è una proprietà del sistema che deve essere vera in ogni momento, in ogni ambiente, indipendentemente da chi sviluppa o da quale feature viene aggiunta. La violazione di un invariante non è un bug da fixare — è una rottura dell'identità del prodotto.

**Come usare questo documento:**
- Prima di ogni PR che tocca aree sensibili, verificare gli invarianti impattati.
- In code review, citare l'ID invariante se una modifica lo viola o lo mette a rischio.
- Ogni nuovo invariante deve passare per review CTO prima di essere aggiunto.
- Gli invarianti non si deprecano — si invalidano solo tramite decisione founder documentata in `docs/21-founder-gate-resolution-log.md`.

---

## Struttura di ogni invariante

Ogni invariante è strutturato con:
- **ID** — codice univoco
- **Titolo** — nome breve
- **Descrizione** — cosa garantisce
- **Vieta** — cosa non è mai permesso
- **Permette** — cosa è esplicitamente consentito
- **Area sorgente** — dove vive nel codice
- **Test esistenti** — copertura nota
- **Rischio se violato** — conseguenze operative
- **Impatto privacy** — danni alla privacy
- **Impatto metodologia** — danni alla metodologia KORA
- **Impatto cliente/investitore** — danni reputazionali e commerciali
- **Impatto KORA Link** — effetti specifici su KORA Link
- **Review richiesta** — livello di approvazione per modificare l'area

---

## Sezione A — Core KORA

### INV-A01 · KORA misura organizzazioni, non individui

**Descrizione:** Il KORA Index è un output company-level. I dati individuali (PIB, IU, partecipazioni) esistono come layer intermedio obbligatorio per produrre l'aggregato — mai come output finale visibile all'azienda.

**Vieta:**
- Qualsiasi output employer-facing che mostri dati individuali
- Route o API che restituiscano PIB, IU per worker_id a ruoli company
- Dashboard di confronto tra lavoratori visibili all'azienda

**Permette:**
- Output aggregato company-level (KORA Index, AR, MAR, pillar distribution)
- Output per segmento con N≥10 (department/site)
- My KORA — il lavoratore vede il proprio PIB in area privata

**Area sorgente:** `services/scoring/`, `lib/kora-engine/`, `app/company/`
**Test esistenti:** vitest — `lib/kora-engine/` (pipeline tests)
**Rischio se violato:** Violazione GDPR, perdita fiducia lavoratori, invalidazione del prodotto
**Impatto privacy:** CRITICO — de-anonimizzazione individuale
**Impatto metodologia:** CRITICO — KORA Index smette di essere un indice organizzativo
**Impatto cliente/investitore:** ALTO — KORA diventa un HR surveillance tool
**Impatto KORA Link:** Output scansioni KORA Link deve restare aggregato o worker-private
**Review richiesta:** security/privacy + legal/DPIA

---

### INV-A02 · Nessun ranking individuale dei lavoratori

**Descrizione:** KORA non produce classifiche di lavoratori, leaderboard, badge comparativi tra persone, o qualsiasi ordinamento che metta un lavoratore sopra o sotto un altro nella visione dell'azienda.

**Vieta:**
- Leaderboard, top-N worker, bottom-N worker visibili a ruoli company
- Score individuali confrontabili tra lavoratori in vista aziendale
- Notifiche o alert che nominino un lavoratore come "migliore" o "peggiore"

**Permette:**
- Il lavoratore vede il proprio trend storico nel proprio PIB (My KORA)
- L'azienda vede distribuzione statistica anonimizzata (Gini per EQW)
- Benchmark company vs industry (aggregato)

**Area sorgente:** `app/my-kora/`, `components/my-kora/`, `services/dynamic-cv/`
**Test esistenti:** Da aggiungere — test espliciti che verifichino assenza di ranking in output company
**Rischio se violato:** Gamification non consenziente, burn-out, pressioni sindacali, perdita fiducia
**Impatto privacy:** ALTO — profilo comparativo individuale = dato sensibile
**Impatto metodologia:** ALTO — il KORA Index non è un ranking
**Impatto cliente/investitore:** ALTO — incompatibile con mission KORA, attira critiche reputazionali
**Impatto KORA Link:** Scansioni KORA Link non devono generare chart "chi scannerizza di più"
**Review richiesta:** security/privacy + CTO

---

### INV-A03 · Output azienda solo aggregato o privacy-safe

**Descrizione:** Qualsiasi dato che il ruolo COMPANY_ADMIN o COMPANY_VIEWER riceve deve essere aggregato (company-level o segmento N≥10) oppure privacy-safe per design (es. count senza identifier).

**Vieta:**
- Endpoint che restituiscano dati individuali a ruoli company
- Import diretto di `workers.json`, `pib-records.json`, o qualsiasi seed file personal da componenti company-facing
- JSONB payload che contenga `worker_id`, `pseudonym_id`, o `auth_user_id` in risposta a company

**Permette:**
- `analytics.*` tables (aggregate) a COMPANY_ADMIN/VIEWER
- Funzioni SECURITY DEFINER che restituiscano count (non righe individuali)
- `workforce_baseline` (già aggregato per design)

**Area sorgente:** `app/company/`, `services/role-permission/`, `services/privacy-visibility/`
**Test esistenti:** Audit B168 — `lib/auth/access-matrix.ts` + `services/privacy-visibility/`
**Rischio se violato:** Violazione GDPR immediata, invalidazione DPA, responsabilità legale
**Impatto privacy:** CRITICO
**Impatto metodologia:** Alto — distorce il significato del KORA Index
**Impatto cliente/investitore:** CRITICO — perdita immediata di fiducia e accreditamento
**Impatto KORA Link:** Output company degli eventi KORA Link = count aggregato only
**Review richiesta:** security/privacy + legal/DPIA + Postgres/RLS

---

### INV-A04 · Worker privacy boundary sempre preservato

**Descrizione:** Lo schema `personal` è un boundary di accesso, non un namespace. Nessun ruolo company ottiene righe da `personal.*`. Questo è enforced a tre livelli: RLS (DB), service layer, access matrix.

**Vieta:**
- Policy RLS company su qualsiasi tabella `personal.*`
- Service che restituisca righe `personal.*` a caller con ruolo company
- `canAccess('COMPANY_ADMIN', 'personal.*')` che ritorni `true`

**Permette:**
- KORA_ADMIN accede a `personal.*` per provisioning e diagnostica
- WORKER accede alle proprie righe in `personal.*`
- Service-role (scoped) accede per pipeline computation — non per risposta API company

**Area sorgente:** `supabase/migrations/007–027`, `lib/auth/access-matrix.ts`, `services/privacy-visibility/`
**Test esistenti:** Test B168 — access-matrix unit tests
**Rischio se violato:** De-anonimizzazione sistemica
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO — demolisce la promessa privacy
**Impatto KORA Link:** worker_identity, pseudonym_map, worker_pib sono SEMPRE off-limits per company — anche con KORA Link attivo
**Review richiesta:** security/privacy + Postgres/RLS + legal/DPIA

---

### INV-A05 · Dati personali e dati analytics separati per schema

**Descrizione:** Lo schema `personal` contiene record individuali pseudonymizzati. Lo schema `analytics` contiene output aggregati. La separazione non è solo logica — è enforced dalla RLS differenziata.

**Vieta:**
- Colonne individuali in tabelle `analytics.*`
- Join `personal.*` → `analytics.*` in query company-facing
- Denormalizzazione di `worker_id` o `pseudonym_id` in `analytics.*`

**Permette:**
- FK anonime da `personal.worker_pib` a `analytics.uef_record` (source tracing, audit interno)
- `analytics.kora_index_result` che non contenga nessun identifier individuale

**Area sorgente:** `supabase/migrations/001, 005, 018`
**Test esistenti:** Da aggiungere — schema validation test
**Rischio se violato:** Accesso company a dati individuali via JOIN
**Impatto privacy:** CRITICO
**Impatto metodologia:** Alto
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Tabelle KORA Link devono rispettare la stessa separazione schema
**Review richiesta:** Postgres/RLS + security/privacy

---

### INV-A06 · KORA Index non espone dati individuali

**Descrizione:** `analytics.kora_index_result` e tutti i componenti del KORA Index v3 devono essere aggregati company-level. Nessuna componente del KORA Index v3 può rivelare informazioni su un singolo lavoratore.

**Vieta:**
- Componenti KORA Index che abbiano payload con `worker_id`
- Spiegabilità che nomi lavoratori specifici in output company
- EQW calcolato su meno di 10 lavoratori (re-identificazione)

**Permette:**
- Tutti i 10 componenti (AR, MAR, EVQ, INT, CONT, EQW, EQS, PC, PB, BTI) — aggregati
- Confidence Score accanto al KORA Index — aggregato
- Breakdown per pillar — aggregato

**Area sorgente:** `lib/kora-engine/`, `analytics.kora_index_result`, `lib/methodology-config/v0.1.ts`
**Test esistenti:** vitest — pipeline tests
**Rischio se violato:** Output KORA Index diventa strumento di surveillance
**Impatto privacy:** CRITICO
**Impatto metodologia:** CRITICO — il KORA Index smette di essere un output organizzativo
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** eventi KORA Link contribuiscono all'Index solo via aggregazione standard
**Review richiesta:** CTO + security/privacy

---

### INV-A07 · Confidence Score separato dal KORA Index

**Descrizione:** Il Confidence Score (CS) ha weight=0 nel calcolo del KORA Index v3. È un indicatore esterno di affidabilità del dato — non un componente del punteggio. Deve essere mostrato accanto al KORA Index, mai sommato né fuso.

**Vieta:**
- Qualsiasi path di calcolo che sommi CS al KORA Index value
- UI che mostri KORA Index senza CS affiancato
- Soppressione del CS in qualsiasi contesto

**Permette:**
- CS visualizzato come badge separato accanto al KORA Index
- CS usato per colorare o contestualizzare l'affidabilità dell'Index
- CS dettagliato in sezione separata (data completeness, evidence quality, etc.)

**Area sorgente:** `analytics.confidence_result`, `analytics.kora_index_result.confidence_result_id`, `lib/methodology-config/v0.1.ts`
**Test esistenti:** Da verificare — il display test deve verificare presence di CS
**Rischio se violato:** CS soppresso → KORA Index appare più affidabile di quanto sia
**Impatto privacy:** Basso
**Impatto metodologia:** CRITICO — viola doc 21b e le regole di output del KORA Index
**Impatto cliente/investitore:** ALTO — un Index senza CS è non difendibile
**Impatto KORA Link:** N/A
**Review richiesta:** CTO

---

### INV-A08 · KORA Contribution non altera direttamente il KORA Index

**Descrizione:** KORA Contribution è un companion indicator. I dati che lo alimentano (commons.contribution_event, booking, adoption) non passano per la IU formula e non modificano nessun componente del KORA Index v3.

**Vieta:**
- Chiamate da `KoraContributionService` a `ScoringSimulatorService` o `LiveScoringAdapter`
- Dati `commons.contribution_event` in input alla pipeline KORA Index
- UI che sommi KORA Index + KORA Contribution in un numero unico

**Permette:**
- Mostrare KORA Index e KORA Contribution in pannelli affiancati
- Usare KORA Contribution come segnale qualitativo complementare
- Analisi narrativa combinata (separata dal calcolo)

**Area sorgente:** `services/kora-contribution/`, `commons.contribution_event`
**Test esistenti:** Da aggiungere — unit test che verifica isolamento
**Rischio se violato:** Double counting, Index gonfiato, metodologia non difendibile
**Impatto privacy:** Basso
**Impatto metodologia:** CRITICO — doppio conteggio viola design canonico
**Impatto cliente/investitore:** ALTO — metodologia non difendibile davanti a investitori
**Impatto KORA Link:** Modalità B KORA Link → Contribution only, non IU+Index. Confusione B→A = violazione
**Review richiesta:** CTO

---

### INV-A09 · KORA Space non produce ranking individuale

**Descrizione:** `commons.post`, `commons.booking`, e `commons.contribution_event` non devono mai essere usati per classificare lavoratori o creare score individuali visibili all'azienda.

**Vieta:**
- Report "top worker" basati su booking o contribution
- Tabelle che mostrino quante iniziative ha fatto il singolo lavoratore (in vista aziendale)
- Notifiche push alle aziende su attività individuali dei propri lavoratori in KORA Space

**Permette:**
- Aggregati di partecipazione per iniziativa (N≥10)
- Trend di contribuzione per l'azienda (company-level)
- KORA Contribution come indicatore company-level

**Area sorgente:** `app/company/`, `services/kora-contribution/`, `commons.*`
**Test esistenti:** RLS commons.booking — nessuna policy company diretta
**Rischio se violato:** KORA Space diventa uno strumento di controllo presenze
**Impatto privacy:** ALTO
**Impatto metodologia:** Alto
**Impatto cliente/investitore:** ALTO — KORA Space diventa ESG-washing con surveillance
**Impatto KORA Link:** KORA Link scan in KORA Space → Contribution aggregato, mai individuale verso azienda
**Review richiesta:** security/privacy + CTO

---

### INV-A10 · KORA Space è volontario, moderato e privacy-safe

**Descrizione:** La partecipazione di un lavoratore a KORA Space (booking, presenza a iniziative) è sempre volontaria. La moderazione è effettuata da KORA_ADMIN — non dall'azienda. Il lavoratore non può essere obbligato a partecipare.

**Vieta:**
- Status obbligatorio di partecipazione imposto dall'azienda
- Visualizzazione per azienda di chi NON ha partecipato (lista non-partecipanti)
- Penalità o alert automatici per mancata partecipazione

**Permette:**
- Iniziative proposte dall'azienda in KORA Space (status=draft/pending_review)
- KORA_ADMIN pubblica solo dopo revisione
- Worker sceglie se prenotare

**Area sorgente:** `commons.post` (status workflow), `commons.booking` (worker-initiated)
**Test esistenti:** RLS policy commons.post (company insert limited to draft/pending)
**Rischio se violato:** KORA Space si trasforma in presenza obbligatoria tracciata
**Impatto privacy:** ALTO
**Impatto metodologia:** Medio
**Impatto cliente/investitore:** ALTO — reputazionale, sindacale
**Impatto KORA Link:** Scansione KORA Link = partecipazione self-initiated dal lavoratore
**Review richiesta:** security/privacy + legal/DPIA

---

### INV-A11 · Tenant isolation sempre rispettata

**Descrizione:** Nessun tenant può vedere dati di un altro tenant. Ogni query, ogni policy, ogni funzione SECURITY DEFINER verifica `tenant_id = kora.tenant_id()`.

**Vieta:**
- Endpoint che restituiscano dati cross-tenant a qualsiasi ruolo (eccetto KORA_ADMIN)
- Funzioni SECURITY DEFINER che non verifichino tenant prima di restituire dati
- Seed data mischiati tra tenant in ambienti non-demo

**Permette:**
- KORA_ADMIN vede tutti i tenant per oversight
- Cross-company booking (commons) — con privacy garantita sul lavoratore individuale
- Aggregati multi-tenant a uso interno KORA_ADMIN

**Area sorgente:** `kora.tenant_id()`, ogni RLS policy su `analytics.*`, `personal.*`, `commons.*`, `gov.*`
**Test esistenti:** Access matrix B168 — tenant isolation test
**Rischio se violato:** Data breach cross-company, violazione contrattuale, GDPR
**Impatto privacy:** CRITICO
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** CRITICO — un'azienda vede i dati di un'altra
**Impatto KORA Link:** Il token KORA Link risolve al worker_identity del proprio tenant — mai cross-tenant senza consenso esplicito
**Review richiesta:** Postgres/RLS + security/privacy + CTO

---

### INV-A12 · Worker isolation sempre rispettata

**Descrizione:** Un worker non può vedere dati di un altro worker. Ogni query personal usa il pattern canonico `WHERE auth_user_id = auth.uid()` o subquery su `worker_identity`.

**Vieta:**
- Policy WORKER che non filtri su `auth.uid()` o subquery canonico
- Endpoint worker che restituiscano righe di altri worker
- Shared state in demo mode che usi dati di un worker per simulare un altro

**Permette:**
- Worker vede propri PIB, partecipazioni, CV, booking
- KORA_ADMIN vede tutti i worker per provisioning

**Area sorgente:** `supabase/migrations/007, 008, 017, 018, 025`
**Test esistenti:** RLS test individuali per ogni migration
**Rischio se violato:** Privacy leak inter-worker
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Il token KORA Link appartiene a UN worker — mai condivisibile tra worker
**Review richiesta:** Postgres/RLS + security/privacy

---

### INV-A13 · Service-role solo in moduli scoped e documentati

**Descrizione:** Il client Supabase con `SUPABASE_SERVICE_ROLE_KEY` bypassa RLS. Il suo uso è permesso solo nei 5 moduli scoped documentati in `ARCHITECTURE.md §6`. Mai nel client browser, mai in route unscoped.

**Vieta:**
- Service-role nel browser o in `NEXT_PUBLIC_*` context
- Service-role in route generiche che potrebbero essere chiamate da ruoli non-admin
- Nuovo modulo service-role senza documentazione e review CTO

**Permette:**
- `worker-provisioning`, `impact-unit`, `storage`, `uef`, `auth-admin` — i 5 client documentati
- Funzioni SECURITY DEFINER in SQL — uso equivalente e documentato

**Area sorgente:** `lib/supabase/clients/` (scoped clients)
**Test esistenti:** Da aggiungere — grep che verifichi absence di service-role in browser path
**Rischio se violato:** Bypass totale RLS — tutti i dati esposti
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Client KORA Link (token resolution) deve usare scoped service-role documentato
**Review richiesta:** CTO + security/privacy

---

### INV-A14 · RLS non è sostituibile dal solo service-layer

**Descrizione:** RLS (Row Level Security) è il boundary enforcement a livello database. Il service layer aggiunge protezione applicativa ma non sostituisce RLS — entrambi devono essere presenti.

**Vieta:**
- Disabilitare RLS su una tabella contando sul service layer per la sicurezza
- Aggiungere tabelle senza `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Policy RLS troppo permissive compensate solo da logica applicativa

**Permette:**
- Defense in depth: RLS + service layer + access matrix
- RLS conservativa + service layer che aggiunge logica di business

**Area sorgente:** Tutte le migration, `lib/auth/access-matrix.ts`
**Test esistenti:** RLS test per ogni migration
**Rischio se violato:** Bug nel service layer → dati esposti senza fallback
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Tabelle 034/035 KORA Link devono avere RLS dal giorno 1
**Review richiesta:** Postgres/RLS + security/privacy

---

### INV-A15 · Access matrix non è sostituibile dalla sola RLS

**Descrizione:** `lib/auth/access-matrix.ts` è un controllo applicativo puro (funzione sincrona, no DB). RLS controlla il database. Entrambi devono coesistere — né uno né l'altro è sufficiente da solo.

**Vieta:**
- Rimuovere chiamate a `canAccess()` contando solo su RLS
- Rimuovere RLS contando solo su `canAccess()`
- `canAccess()` che faccia query DB (non è la sua funzione — deve restare pura)

**Permette:**
- `canAccess()` come guard sincrona in middleware e API route
- RLS come guard a livello DB
- I due layer si integrano, non si sostituiscono

**Area sorgente:** `lib/auth/access-matrix.ts`, `middleware.ts`
**Test esistenti:** Unit test access-matrix (B168)
**Rischio se violato:** Un layer solo non copre tutti gli attack vector
**Impatto privacy:** ALTO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Route KORA Link devono avere sia `canAccess()` guard che RLS
**Review richiesta:** security/privacy + CTO

---

### INV-A16 · Triple protection — nessuno dei tre layer è sufficiente da solo

**Descrizione:** La protezione privacy di KORA usa tre layer indipendenti: (1) RLS database, (2) service layer `RolePermissionService`/`PrivacyVisibilityService`, (3) access matrix `canAccess()`. Tutti e tre devono essere presenti e coerenti.

**Vieta:**
- Rimuovere uno dei tre layer per "semplificare"
- Assumere che un layer copra il fallimento di un altro
- Aggiungere un nuovo tipo di dato sensibile senza aggiornare tutti e tre i layer

**Permette:**
- Aggiungere un quarto layer (es. field-level encryption) senza rimuovere i tre esistenti

**Area sorgente:** `supabase/migrations/`, `services/privacy-visibility/`, `services/role-permission/`, `lib/auth/access-matrix.ts`
**Test esistenti:** B168 — test su tutti e tre i layer
**Rischio se violato:** Un singolo bug espone dati
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** KORA Link introduce un nuovo tipo di evento — deve passare per tutti e tre i layer
**Review richiesta:** security/privacy + Postgres/RLS + CTO

---

### INV-A17 · Demo/live/mock distinguibili in ogni momento

**Descrizione:** Il sistema deve sempre sapere in quale modalità sta operando: `demo` (sintetico), `live` (reale), `future` (mockup statico). Questa distinzione deve essere visibile in UI e nell'audit log.

**Vieta:**
- Demo data che non sia etichettata come `synthetic_demo_data: true` dove surfacée in UI
- Route live che non verifichino l'ambiente prima di operare
- Future Vision screen senza label "Future Vision / Not Active in Foundation Light"

**Permette:**
- Switcher di modalità in ambienti non-produzione
- Banner ambiente visibile in staging

**Area sorgente:** `NEXT_PUBLIC_KORA_ENV`, `audit.audit_log.environment`, `components/demo/`
**Test esistenti:** Da aggiungere — check environment label in UI component test
**Rischio se violato:** Confusione demo/live, dato sintetico mostrato come reale a investitori
**Impatto privacy:** Medio
**Impatto metodologia:** Alto
**Impatto cliente/investitore:** ALTO — investor demo con dati non etichettati è ingannevole
**Impatto KORA Link:** Demo KORA Link deve essere chiaramente etichettata
**Review richiesta:** dev

---

### INV-A18 · Feature incomplete gated o chiaramente etichettate

**Descrizione:** Qualsiasi feature non production-ready deve avere o un feature flag che la nasconda, o una label visibile "non attiva", o entrambi. Non esistono feature "quasi pronte" senza confine esplicito.

**Vieta:**
- Route accessibili senza auth che mostrino feature non complete come complete
- Shell vuota senza label che sembri una feature live

**Permette:**
- Feature flag ON/OFF
- Schermata "Coming Soon" con label chiara
- Future Vision screen (labellate come tali)

**Area sorgente:** `lib/constants/feature-flags.ts`, `app/future-vision/`
**Test esistenti:** Da aggiungere
**Rischio se violato:** Presentazione fuorviante a clienti/investitori
**Impatto privacy:** Basso
**Impatto metodologia:** Basso
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** `KORA_LINK_ENABLED=false` è l'implementation di questo invariante per KORA Link
**Review richiesta:** dev + CTO (per feature rilevanti)

---

### INV-A19 · Nessun dato reale in ambienti di sviluppo

**Descrizione:** L'ambiente di sviluppo locale punta a staging (`haqf****`). L'ambiente di produzione (`azdn****`) non deve mai essere usato per sviluppo. Nessun dato reale di worker o aziende viene importato in locale.

**Vieta:**
- `.env.local` che punti a `azdn****` (produzione)
- Dump di dati reali importati in locale
- SUPABASE_SERVICE_ROLE_KEY di produzione in ambienti dev

**Permette:**
- Dati sintetici da `data/synthetic/` (doc 25)
- Staging database per sviluppo e test
- `.env.production.local.backup` gitignored per emergenza

**Area sorgente:** `.env.local`, `.env.staging.local`, `docs/ENVIRONMENT_SAFETY_CHECK.md`
**Test esistenti:** N/A — processo, non codice
**Rischio se violato:** Accesso accidentale a dati reali in sviluppo, leak
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Device e token KORA Link di produzione non devono mai essere in sviluppo locale
**Review richiesta:** CTO + security/privacy

---

### INV-A20 · Produzione mai usata per sviluppo

**Descrizione:** Il database di produzione (`azdn****`) è off-limits per qualsiasi attività di sviluppo, debug, o test. Nessun developer accede a produzione senza review esplicita e auditata.

**Vieta:**
- Connessione a produzione da ambienti dev locali
- Migration apply a produzione senza Gate 2 chiuso e CTO review
- Test o seed run su produzione

**Permette:**
- Accesso di emergenza (break-glass) — tracciato e documentato
- Deploy Vercel su produzione — solo post-review

**Area sorgente:** `.env.production.local.backup`, `docs/ENVIRONMENT_SAFETY_CHECK.md`
**Test esistenti:** N/A — processo
**Rischio se violato:** Corruzione dati reali, GDPR, contratti violati
**Impatto privacy:** CRITICO
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Mai testare KORA Link NFC su device reali in produzione prima di staging sign-off
**Review richiesta:** CTO + security/privacy

---

## Sezione B — Engine / Metodologia

### INV-B21 · Pesi metodologia non hardcoded in UI o route

**Descrizione:** I pesi del KORA Index v3 (macroblocchi, componenti) sono letti da `lib/methodology-config/v0.1.ts` tramite `getMacroblockWeights()` e `getAllComponentEffectiveWeights()`. Nessun peso è scritto come costante in componenti, route, o servizi.

**Vieta:**
- `const AR_WEIGHT = 0.125` in qualsiasi file diverso da `lib/methodology-config/`
- Pesi inline nei componenti React
- `getComponentWeights()` (deprecata — lancia eccezione)

**Permette:**
- Lettura pesi via `getMacroblockWeights()` e `getAllComponentEffectiveWeights()`
- Override pesi in `data/methodology/methodology-config.json` per versione successiva

**Area sorgente:** `lib/methodology-config/v0.1.ts`, `data/methodology/methodology-config.json`
**Test esistenti:** vitest — methodology-config tests
**Rischio se violato:** Pesi divergono tra UI e calcolo, metodologia non reproducibile
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO — Index non difendibile se i pesi non sono verificabili
**Impatto KORA Link:** IU generati da KORA Link leggono gli stessi pesi da methodology-config
**Review richiesta:** CTO

---

### INV-B22 · Modifiche a `lib/kora-engine/` richiedono review metodologica

**Descrizione:** Il KORA Engine (24 moduli, 14-stage pipeline) implementa la metodologia canonica. Ogni modifica deve essere accompagnata da review metodologica — non solo tecnica.

**Vieta:**
- PR che modifichino `lib/kora-engine/` senza sign-off metodologico
- Shortcut che saltino uno dei 14 stage

**Permette:**
- Bug fix con review metodologica
- Aggiunta di flag opzionali (DF, EXF, SF) già previsti dalla formula canonica

**Area sorgente:** `lib/kora-engine/` (24 moduli)
**Test esistenti:** vitest — pipeline unit e integration tests
**Rischio se violato:** Formula IU alterata silenziosamente, Index non più difendibile
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Stage che processano eventi KORA Link devono avere stessa review
**Review richiesta:** CTO

---

### INV-B23 · Modifiche a `lib/methodology-config/` richiedono review metodologica

**Descrizione:** `lib/methodology-config/v0.1.ts` e `data/methodology/methodology-config.json` sono la fonte di verità dei pesi e delle soglie. Ogni modifica cambia il significato del KORA Index per tutti i tenant.

**Vieta:**
- Modifica a `methodology-config.json` senza bump di versione e review
- Versione v0.2 senza documentazione delle modifiche rispetto a v0.1

**Permette:**
- Nuova versione `v0.2.ts` con bump esplicito e nota di migrazione

**Area sorgente:** `lib/methodology-config/v0.1.ts`, `data/methodology/methodology-config.json`
**Test esistenti:** vitest — methodology-config tests
**Rischio se violato:** Pesi cambiano silenziosamente per tutti i tenant
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** N/A
**Review richiesta:** CTO

---

### INV-B24 · Scoring path DEMO/PREVIEW/LIVE separati

**Descrizione:** Tre path di scoring: DEMO (sintetico via `ScoringSimulatorService`), PREVIEW (dinamico via `DynamicScoringPreviewService`), LIVE (reale via `run-kora-pipeline.ts`). I path non si mescolano.

**Vieta:**
- LIVE path che usi dati sintetici
- DEMO path che scriva su DB reale
- Mixer path in produzione

**Permette:**
- Test che usino DEMO path per rapidità
- Staging che usi PREVIEW path per validazione

**Area sorgente:** `services/scoring/IScoringService.ts`, `DemoScoringAdapter`, `LiveScoringAdapter`, `PreviewScoringAdapter`
**Test esistenti:** vitest — scoring adapter tests
**Rischio se violato:** Dati sintetici in index live o dati live in demo
**Impatto privacy:** ALTO (se LIVE path espone dati individuali)
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Scan events KORA Link si materializzano solo in LIVE path
**Review richiesta:** CTO + dev

---

### INV-B25 · Un errore UI non deve modificare il significato metodologico dell'Index

**Descrizione:** Componenti UI che mostrano il KORA Index devono consumare output del servizio — non ricalcolare. Un bug UI può mostrare un valore sbagliato ma non deve alterare il valore memorizzato o il significato metodologico.

**Vieta:**
- Componente React che ricalcoli parzialmente il KORA Index o i componenti
- Logica di formula dentro componenti React

**Permette:**
- Componenti che formattino e visualizzino output di servizio
- Arrotondamento display-side (non di storage)

**Area sorgente:** `components/kora-index/`, `services/scoring/`
**Test esistenti:** Da aggiungere — componenti devono testare solo display, non calcolo
**Rischio se violato:** Bug UI altera interpretazione del KORA Index
**Impatto privacy:** N/A
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** N/A
**Review richiesta:** dev + CTO

---

### INV-B26 · Il KORA Index deve restare spiegabile e difendibile

**Descrizione:** Ogni KORA Index result deve avere: valore, CS, calibration_status, methodology_version_id, breakdown 10 componenti, Activation Safeguard, limitations text. Questi sono inseparabili.

**Vieta:**
- Mostrare solo il valore numerico del KORA Index senza gli elementi inseparabili
- Sopprimere `calibration_status = 'pre_empirical_calibration'`
- Output KORA Index senza breakdown componenti

**Permette:**
- Layout che condensi gli elementi ma li includa tutti
- Progressive disclosure (dettaglio expandable) purché tutti gli elementi siano raggiungibili

**Area sorgente:** `analytics.kora_index_result`, `components/kora-index/KoraIndexHero`
**Test esistenti:** Da aggiungere — snapshot test che verifichi presenza di tutti gli elementi
**Rischio se violato:** KORA Index appare come black box, non difendibile
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** N/A
**Review richiesta:** CTO

---

### INV-B27 · Ogni modifica al motore deve avere test o golden path

**Descrizione:** `lib/kora-engine/` è il cuore del prodotto. Ogni modifica deve essere accompagnata da test che verifichino il comportamento atteso — o da un golden path documentato se i test non sono praticabili.

**Vieta:**
- PR su `lib/kora-engine/` senza test aggiornati o golden path
- Merge che rompa test esistenti

**Permette:**
- Test di integrazione che usino dati sintetici
- Test di regressione che verifichino invarianza dell'output per input noti

**Area sorgente:** `lib/kora-engine/`, `__tests__/`
**Test esistenti:** vitest 8079/8079 (baseline CC-00)
**Rischio se violato:** Regressioni silenziose sulla metodologia
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Test per stage che processano KORA Link events
**Review richiesta:** CTO + dev

---

### INV-B28 · BTI, financial e activation non contaminano privacy worker

**Descrizione:** `analytics.bti_result`, `gov.budget_governance`, e `analytics.activation_result` contengono dati finanziari e di attivazione aggregati. Non devono essere usati per inferire dati individuali.

**Vieta:**
- Uso di `activation_result` per identificare chi non ha partecipato
- Correlazione budget×worker individuale esposta a company
- `department_activation` con segmenti N<10

**Permette:**
- BTI come indicatore company-level di efficienza budget
- Activation rate aziendale aggregato

**Area sorgente:** `analytics.bti_result`, `analytics.activation_result`, `gov.budget_governance`
**Test esistenti:** N≥10 enforced in `activation_result.department_activation` (mig 001 note)
**Rischio se violato:** Dati finanziari usati per profilare lavoratori
**Impatto privacy:** ALTO
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** N/A
**Review richiesta:** security/privacy

---

### INV-B29 · Action plan e Decision Pack derivano da dati consentiti

**Descrizione:** Il Decision Pack e l'Action Plan devono basarsi solo su dati che il ruolo ricevente è autorizzato a vedere. Nessun dato non-consentito deve influenzare il contenuto del pack.

**Vieta:**
- Decision Pack che contenga raccomandazioni basate su dati individuali non consentiti
- Action Plan che nomini lavoratori specifici in output aziendale

**Permette:**
- Raccomandazioni basate su aggregati company-level
- Spiegabilità che citi trend, non individui

**Area sorgente:** `services/report-generator/`, `analytics.decision_pack_version`
**Test esistenti:** Da aggiungere
**Rischio se violato:** Il Decision Pack diventa un documento di sorveglianza
**Impatto privacy:** ALTO
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** N/A
**Review richiesta:** security/privacy + CTO

---

### INV-B30 · Formule legacy documentate o deprecate esplicitamente

**Descrizione:** I vecchi nomi formula (ES, EF, RF, SQ, PA, EQT, CT, EC, GF) sono superseded. Qualsiasi riferimento a formule legacy deve essere documentato come deprecato — mai silenziosamente rimosso senza nota.

**Vieta:**
- Nuovi usi di nomi formula legacy in codice o commenti
- Rimozione silenziosa senza nota di deprecazione

**Permette:**
- Commenti che spieghino la mappatura legacy→canonica
- Test che verifichino il comportamento dei nomi canonici

**Area sorgente:** `lib/kora-engine/`, `lib/constants/`
**Test esistenti:** N/A
**Rischio se violato:** Confusione metodologica, formula sbagliata applicata silenziosamente
**Impatto privacy:** N/A
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** Medio
**Impatto KORA Link:** N/A
**Review richiesta:** dev

---

## Sezione C — KORA Link v1

### INV-C31 · KORA Link è una feature reale, non un mockup

**Descrizione:** A differenza delle Future Vision screens, KORA Link v1 è una feature pianificata per implementazione reale. Il feature flag `KORA_LINK_ENABLED` la esclude oggi, ma il design deve essere corretto dal giorno 1.

**Vieta:**
- Design KORA Link con scorciatoie privacy o metodologiche "perché è solo un prototipo"
- Dati KORA Link che non rispettino gli invarianti del modello produzione

**Permette:**
- Stub del servizio con interface corretta e implementazione placeholder
- UI mockup labellata come "Coming with KORA Link v1"

**Area sorgente:** `lib/constants/feature-flags.ts`, `feat/kora-link-v1` branch
**Test esistenti:** N/A — feature non ancora implementata
**Rischio se violato:** KORA Link v1 parte con debito tecnico e privacy debt
**Impatto privacy:** ALTO
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Questo invariante IS KORA Link
**Review richiesta:** CTO + security/privacy

---

### INV-C32 · KORA Link gated da `KORA_LINK_ENABLED`, default OFF

**Descrizione:** `FEATURE_FLAGS.KORA_LINK_ENABLED = process.env.KORA_LINK_ENABLED === 'true'`. Qualsiasi codice KORA Link deve essere wrappato da questo flag. Default: `false` (assente = OFF).

**Vieta:**
- Codice KORA Link che esegua senza verificare il flag
- `NEXT_PUBLIC_KORA_LINK_ENABLED` — il flag è server-side only

**Permette:**
- Abilitare il flag in staging per testing
- Route KORA Link che restituiscano 404 o redirect se flag è OFF

**Area sorgente:** `lib/constants/feature-flags.ts`, `.env.local.example`
**Test esistenti:** N/A
**Rischio se violato:** Feature KORA Link attiva in produzione prima che sia pronta
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO — feature non pronta esposta
**Impatto KORA Link:** Questo invariante IS il meccanismo di gating
**Review richiesta:** dev + CTO

---

### INV-C33 · Il chip NFC è anonimo e intercambiabile

**Descrizione:** Il chip fisico (NFC card, QR sticker, codice manuale) non contiene identità. Contiene solo un URL o token opaco. Il legame chip↔worker nasce solo al momento dell'attivazione self-service — non alla produzione o alla distribuzione del chip.

**Vieta:**
- Stampare `worker_id` o nome sul chip
- Generare chip pre-associati a un worker specifico
- Database che leghi chip a worker prima dell'attivazione

**Permette:**
- Chip con token casuale (`kora_token` non significativo)
- Attivazione self-service da parte del lavoratore
- Riassegnazione chip a nuovo lavoratore dopo revoca

**Area sorgente:** `034_kora_link_schema.sql` (candidato), `feat/kora-link-v1`
**Test esistenti:** N/A
**Rischio se violato:** Chip diventa badge di identità — KORA Link diventa controllo presenze identificativo
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO — viola la promessa anti-sorveglianza
**Impatto KORA Link:** Questo invariante definisce il design fisico del chip
**Review richiesta:** security/privacy + legal/DPIA + CTO

---

### INV-C34 · Il chip contiene solo URL/token, mai dati personali

**Descrizione:** Il payload NFC o QR contiene solo un URL di tipo `https://kora.app/link/{token}` dove `{token}` è una stringa casuale. Nessun dato personale, nessun `worker_id`, nessun `tenant_id` nel payload fisico.

**Vieta:**
- URL KORA Link con `?worker_id=...` o `?tenant_id=...`
- Token che codifichino informazioni leggibili (non opachi)
- Payload NFC con dati NDEF diversi dall'URL

**Permette:**
- Token UUID casuale o stringa base64url
- URL che risolva server-side a worker+tenant+contesto

**Area sorgente:** `034_kora_link_schema.sql` (candidato) — `kora_link.device_registry.token`
**Test esistenti:** N/A
**Rischio se violato:** Chiunque legga il chip con smartphone può estrarre `worker_id`
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Design fondamentale del token
**Review richiesta:** security/privacy + CTO

---

### INV-C35 · Il token è casuale, non significativo e revocabile

**Descrizione:** Il token KORA Link deve essere generato con CSPRNG (crittograficamente sicuro), avere entropia sufficiente (≥128 bit), e poter essere revocato invalidando il record lato server senza sostituire il chip fisico.

**Vieta:**
- Token sequenziali o prevedibili (`link-001`, `link-002`)
- Token non revocabili senza sostituzione fisica del chip
- Token con scadenza non configurabile

**Permette:**
- UUID v4 o stringa base64url da 32+ byte
- Soft-revoke lato DB (status='revoked') — chip fisico riutilizzabile con nuovo token

**Area sorgente:** `034_kora_link_schema.sql` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Token prevedibile = attacco enumerazione; token non revocabile = chip smarrito = accesso permanente
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Security design del token
**Review richiesta:** security/privacy + CTO

---

### INV-C36 · Nessun `worker_id` nell'URL KORA Link

**Descrizione:** L'URL pubblico della route KORA Link non deve contenere identificatori di worker, nemmeno pseudonimi. L'unico parametro pubblico è il token opaco.

**Vieta:**
- `/link/{worker_id}`, `/link/{pseudonym_id}`, `/link/{worker_ref}`
- Query param `?uid=...` o `?ref=...` nell'URL pubblico

**Permette:**
- `/link/{token}` dove `token` è opaco e non significativo

**Area sorgente:** `app/link/[token]/`, route handler KORA Link
**Test esistenti:** N/A
**Rischio se violato:** URL enumerabili → profilazione worker
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** URL design della route pubblica
**Review richiesta:** security/privacy

---

### INV-C37 · Nessun `tenant_id` nell'URL KORA Link

**Descrizione:** L'URL pubblico KORA Link non deve contenere `tenant_id` o `tenant_code`. La risoluzione tenant avviene lato server tramite lookup del token.

**Vieta:**
- `/link/{tenant_id}/{token}`, `/link/{tenant_code}/{token}`
- Header o cookie che espongano tenant_id nella risposta pubblica

**Permette:**
- Risoluzione server-side: `token → (worker_identity_id, tenant_id, context)`

**Area sorgente:** Route handler KORA Link
**Test esistenti:** N/A
**Rischio se violato:** URL espone a quale azienda appartiene il chip
**Impatto privacy:** ALTO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** URL design
**Review richiesta:** security/privacy

---

### INV-C38 · Risoluzione token solo lato server

**Descrizione:** Il mapping `token → worker_identity_id` avviene SOLO in un server-side API route, usando scoped service-role. Mai nel browser, mai via client Supabase autenticato pubblicamente.

**Vieta:**
- Client-side resolution del token
- API route che esponga la lookup table al client
- Token resolution via `anon` key Supabase

**Permette:**
- Next.js API route server-side che fa lookup via service-role scoped e poi risponde con dati aggregati o redirect autenticato

**Area sorgente:** `app/api/link/[token]/route.ts` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Chiunque possa enumerare token → map to worker
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Core architecture della route pubblica
**Review richiesta:** security/privacy + CTO

---

### INV-C39 · Legame token↔worker nasce solo all'attivazione self-service

**Descrizione:** Un chip distribuito non è ancora associato a nessun worker. L'associazione nasce quando il lavoratore attiva il proprio chip autonomamente — non quando l'azienda distribuisce il chip, non quando KORA_ADMIN crea il device record.

**Vieta:**
- Associazione chip→worker da parte dell'azienda (anche se il chip è stato distribuito dall'azienda)
- `device_registry` con `worker_identity_id` popolato prima dell'attivazione self-service
- KORA_ADMIN che associ chip a worker senza il consenso e l'azione del worker

**Permette:**
- KORA_ADMIN che crea il `device_registry` senza `worker_identity_id` (non associato)
- Worker che attiva il proprio chip via route autenticata (`POST /api/link/activate`)
- Flusso: azienda distribuisce chip (non associato) → worker lo attiva (associazione)

**Area sorgente:** `034_kora_link_schema.sql` (candidato), `app/api/link/activate/`
**Test esistenti:** N/A
**Rischio se violato:** Azienda può pre-associare chip → KORA Link diventa controllo presenze identificativo
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Questo invariante definisce il flusso di ownership del chip
**Review richiesta:** security/privacy + legal/DPIA + CTO

---

### INV-C40 · KORA Admin non associa ordinariamente chip a persone

**Descrizione:** Il percorso ordinario di associazione chip è self-service (lavoratore attiva). KORA_ADMIN può associare chip SOLO in break-glass cases documentati, con `reason` obbligatorio e audit immediato.

**Vieta:**
- Route KORA_ADMIN che permettano bulk-assign chip a worker senza loro azione
- Associazione admin senza `reason` e audit entry
- Override admin che bypassi il consenso del lavoratore

**Permette:**
- Break-glass: KORA_ADMIN associa chip a worker con reason obbligatorio + audit log
- KORA_ADMIN che REVOCA un chip (per smarrimento o richiesta worker)

**Area sorgente:** `app/admin/link/` (candidato), `audit.audit_log`
**Test esistenti:** N/A
**Rischio se violato:** KORA Admin usa il sistema per profilare lavoratori senza consenso
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Definisce le eccezioni ammesse al flusso self-service
**Review richiesta:** security/privacy + legal/DPIA

---

### INV-C41 · Azienda distribuisce chip ma non rompe il confine privacy

**Descrizione:** L'azienda può acquistare e distribuire chip KORA Link ai propri dipendenti. Questo non le dà visibilità su chi ha attivato il chip o quando è stato scansionato. La distribuzione è un atto logistico, non un atto di accesso.

**Vieta:**
- Dashboard aziendale che mostri "chi ha attivato il proprio chip"
- Report aziendale con lista chip attivi/non attivi per worker
- Notifiche aziendali su attivazione chip del singolo lavoratore

**Permette:**
- Report aggregato: "X% dei chip distribuiti è stato attivato" (N≥10)
- Report: "Y eventi totali registrati questo mese" (aggregato)

**Area sorgente:** `app/company/` (candidato), RLS tabelle 034/035
**Test esistenti:** N/A
**Rischio se violato:** La distribuzione chip diventa strumento di pressione
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Definisce il confine privacy lato azienda per KORA Link
**Review richiesta:** security/privacy + legal/DPIA + CTO

---

### INV-C42 · Lavoratore è proprietario del proprio link nel flusso default

**Descrizione:** Il lavoratore può vedere il proprio chip, i propri scan event, revocare il chip, richiedere sostituzione. Il flusso default è worker-owned — non company-owned.

**Vieta:**
- Impossibilità per il worker di vedere i propri scan event in My KORA
- Impossibilità per il worker di revocare il proprio chip
- Company che possa revocare il chip di un worker senza sua richiesta

**Permette:**
- Worker revoca il proprio chip via My KORA
- Worker richiede nuovo chip
- Company revoca il chip SOLO su richiesta documentata del worker o per licenziamento (con audit)

**Area sorgente:** `app/my-kora/` (candidato), `app/api/link/revoke/`
**Test esistenti:** N/A
**Rischio se violato:** Il chip diventa proprietà dell'azienda sul lavoratore
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Worker ownership del chip
**Review richiesta:** security/privacy + legal/DPIA

---

### INV-C43 · Azienda gestisce link solo nel proprio tenant e solo per casi previsti

**Descrizione:** COMPANY_ADMIN può gestire chip KORA Link SOLO per lavoratori del proprio tenant, e SOLO per operazioni esplicitamente previste (es. revoca su richiesta, sostituzione chip smarrito). Non ha accesso a chip di altri tenant né a operazioni non previste.

**Vieta:**
- COMPANY_ADMIN che acceda a device_registry di altri tenant
- COMPANY_ADMIN che crei device record per lavoratori non del proprio tenant

**Permette:**
- COMPANY_ADMIN che revoca chip di propri lavoratori (con audit)
- COMPANY_ADMIN che veda count aggregato chip del proprio tenant

**Area sorgente:** RLS `035_kora_link_rls.sql` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Cross-tenant device management
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** RLS candidata per 035
**Review richiesta:** Postgres/RLS + security/privacy

---

### INV-C44 · KORA Admin può intervenire solo in break-glass con reason obbligatorio

**Descrizione:** Quando KORA_ADMIN deve intervenire su un chip o su un'associazione (bypass del flusso ordinario), deve fornire una `reason` testuale che viene registrata nell'audit log. Non esistono operazioni admin KORA Link senza traccia.

**Vieta:**
- Operazione admin su chip senza audit entry
- `reason` nullable per operazioni admin su KORA Link
- Bulk operations admin senza review esplicita

**Permette:**
- Break-glass con reason obbligatorio e audit immediato
- Report periodico delle operazioni break-glass per oversight

**Area sorgente:** `audit.audit_log`, `app/admin/link/` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Operazioni non tracciate, accountability violata
**Impatto privacy:** ALTO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Accountability del sistema
**Review richiesta:** security/privacy + CTO

---

### INV-C45 · Ogni evento KORA Link deve essere auditato

**Descrizione:** Tutti gli eventi sul lifecycle del chip (create, assign, activate, scan, revoke, lost, replace) producono un'entry in `audit.audit_log` con `action = 'kora_link.{evento}'`, `resource_type = 'kora_link_device'`, e payload non-PII.

**Vieta:**
- Evento KORA Link senza audit entry
- Audit entry KORA Link con PII in `payload`
- DELETE di audit entries KORA Link

**Permette:**
- Audit entry con `actor_role`, `actor_id`, `action`, `resource_id` (token_id, non worker_id), `created_at`

**Area sorgente:** `audit.audit_log`, handler KORA Link
**Test esistenti:** N/A
**Rischio se violato:** Nessuna traccia degli eventi, accountability impossibile
**Impatto privacy:** ALTO (accountability)
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Questo è un prerequisito non negoziabile per KORA Link v1
**Review richiesta:** security/privacy + CTO

---

### INV-C46 · 7 eventi audit minimi per KORA Link

**Descrizione:** Gli eventi minimi da auditare sono: `create` (device creato), `assign` (chip consegnato a tenant), `activate` (worker attiva il chip), `scan` (chip scansionato), `revoke` (chip revocato), `lost` (smarrimento dichiarato), `replace` (sostituzione chip).

**Vieta:**
- Omissione di uno di questi 7 eventi dal tracking
- Merge di eventi distinti in uno solo (es. `assign+activate` in un solo record)

**Permette:**
- Aggiunta di eventi non in lista (es. `transfer`, `recycle`) purché documentati

**Area sorgente:** `audit.audit_log.action`, handler KORA Link
**Test esistenti:** N/A
**Rischio se violato:** Lifecycle incompleto, impossibile ricostruire la storia di un chip
**Impatto privacy:** ALTO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Completezza audit trail
**Review richiesta:** security/privacy

---

### INV-C47 · Token revoked/lost/invalid non espone dati

**Descrizione:** Se un token è nello stato `revoked`, `lost`, o non esiste nel DB, la route `/link/{token}` risponde con un errore generico che non rivela perché il token non è valido, a chi appartiene, o se esiste.

**Vieta:**
- Risposta diversa per "token revocato" vs "token inesistente" (oracle attack)
- Messaggio di errore che riveli `worker_ref` o `tenant_code`
- Redirect a pagina con dettagli del chip precedente

**Permette:**
- Risposta generica: "Il link non è più valido. Contatta il tuo operatore KORA."
- Log interno dell'errore (non esposto al client)

**Area sorgente:** `app/link/[token]/route.ts` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Token oracle attack — attaccante può determinare se un token è revocato vs inesistente
**Impatto privacy:** ALTO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Error handling design
**Review richiesta:** security/privacy

---

### INV-C48 · Route pubblica `/link/[token]` non espone PII

**Descrizione:** La route pubblica KORA Link è accessibile senza autenticazione (il chip è fisico, lo smartphone non è autenticato in KORA quando scannerizza). La risposta deve essere priva di PII.

**Vieta:**
- Risposta JSON con `worker_id`, `worker_ref`, `name`, `email`, `tenant_name`
- Redirect con dati personali in query param
- Esposizione del `tenant_id` nella risposta pubblica

**Permette:**
- Redirect verso una pagina autenticata senza dati personali nell'URL
- Risposta con solo: action type, UI label generica, redirect URL opaco

**Area sorgente:** `app/link/[token]/` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Chiunque scannerizzi il chip ottiene PII
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Design della route pubblica — prerequisito fondamentale
**Review richiesta:** security/privacy + CTO

---

### INV-C49 · NFC, QR e codice manuale sono tre vie verso lo stesso token

**Descrizione:** Il token KORA Link è unico. Può essere raggiunto via NFC (tap), via QR (scan), o via codice manuale (digitazione). I tre canali fisici convergono alla stessa logica server-side.

**Vieta:**
- Token diversi per NFC vs QR vs manuale sullo stesso chip/card
- Logica di attribution diversa per canale fisico

**Permette:**
- Distinzione del `channel` nell'audit log (`nfc` | `qr` | `manual`) per analytics
- Stesso comportamento applicativo indipendentemente dal canale

**Area sorgente:** Handler KORA Link, `034_kora_link_schema.sql` (candidato — campo `device_type`)
**Test esistenti:** N/A
**Rischio se violato:** Inconsistenza attribution tra canali
**Impatto privacy:** Basso
**Impatto metodologia:** Medio
**Impatto cliente/investitore:** Medio
**Impatto KORA Link:** Design multi-canale
**Review richiesta:** dev

---

### INV-C50 · Nessun lettore dedicato richiesto per uso ordinario

**Descrizione:** Lo smartphone del lavoratore (iOS/Android con NFC nativo o camera per QR) è il lettore. KORA Link non richiede hardware proprietario per l'uso ordinario.

**Vieta:**
- Architettura che richieda totem, terminale dedicato, o app proprietaria per scansionare
- SDK KORA Link che richieda hardware certificato

**Permette:**
- Totem o terminale KORA Link per contesti specifici (es. eventi fisici) — come canale aggiuntivo, non obbligatorio
- App KORA che faciliti la scansione (ma non obbligatoria — il sistema URL/NFC funziona con qualsiasi browser)

**Area sorgente:** Design fisico KORA Link
**Test esistenti:** N/A
**Rischio se violato:** Adozione bloccata dalla necessità di hardware
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO — barriera all'adozione
**Impatto KORA Link:** Accessibilità del sistema
**Review richiesta:** CTO

---

## Sezione D — Modello a Due Binari KORA Link

### INV-D51 · Ogni evento KORA Link ha un solo `event_nature`

**Descrizione:** Ogni scan event KORA Link è classificato con un solo `event_nature` che determina univocamente quale binario alimenta. Non esiste evento con `event_nature` multipla o ambigua.

**Vieta:**
- `event_nature = ['partner_verified', 'collective']` (array)
- Event_nature nullable o 'unknown' in produzione

**Permette:**
- `event_nature` come enum: `partner_verified` | `collective` | `mentorship` | `cross_company` | `app_access`

**Area sorgente:** `034_kora_link_schema.sql` (candidato — campo `event_nature`)
**Test esistenti:** N/A
**Rischio se violato:** Double counting, attribution non deterministica
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO — double counting
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Core del modello a due binari
**Review richiesta:** CTO

---

### INV-D52 · Ogni evento KORA Link alimenta un solo binario

**Descrizione:** Un evento KORA Link produce esattamente un output: o un IU (Track 1 → KORA Index) oppure un segnale KORA Contribution (Track 2). Mai entrambi dallo stesso evento.

**Vieta:**
- Attribution handler che per lo stesso `scan_event_id` scriva sia in `personal.worker_pib` che in `commons.contribution_event`
- Event che "vale doppio"

**Permette:**
- Un evento `partner_verified` → solo Track 1
- Un evento `collective` → solo Track 2

**Area sorgente:** Attribution handler KORA Link, `034_kora_link_schema.sql`
**Test esistenti:** N/A
**Rischio se violato:** Double counting sistemico
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Separazione binari — invariante fondamentale
**Review richiesta:** CTO

---

### INV-D53 · Mai doppio conteggio

**Descrizione:** Un evento fisico non può produrre due contributi al KORA Index o a KORA Contribution. Il sistema deve garantire idempotenza (unique constraint su `scan_event_id` nella tabella di attribution).

**Vieta:**
- INSERT su `worker_pib` o `contribution_event` senza unique constraint su `scan_event_id`
- Retry senza ON CONFLICT DO NOTHING

**Permette:**
- ON CONFLICT DO NOTHING per idempotenza
- Logging dei conflict per monitoring

**Area sorgente:** `035_kora_link_rls.sql` (candidato), attribution handler
**Test esistenti:** N/A
**Rischio se violato:** KORA Index gonfiato, metodologia non riproducibile
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Idempotency design — critico per eventi fisici (retry di rete comuni)
**Review richiesta:** CTO + Postgres/RLS

---

### INV-D54 · Accesso rapido My KORA via NFC non alimenta nessun binario

**Descrizione:** Uno dei casi d'uso KORA Link è "tappo il chip e accedo a My KORA" (autenticazione rapida o deep link). Questo uso non è un evento di impact — non produce IU né Contribution.

**Vieta:**
- `event_nature = 'app_access'` che generi IU o Contribution
- Conteggio degli accessi rapidi come "attività"

**Permette:**
- Log dell'accesso rapido per sicurezza (audit)
- Deep link a My KORA autenticato
- Statistiche interne: "X accessi rapidi questo mese" (non esposto a company)

**Area sorgente:** Handler KORA Link, `event_nature = 'app_access'`
**Test esistenti:** N/A
**Rischio se violato:** Ogni accesso a My KORA diventa un "impatto" — KORA Index inflazionato
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Caso d'uso accesso rapido chiaramente separato
**Review richiesta:** CTO

---

### INV-D55 · Modalità A — partner verified → EV L4 → IU → PIB → KORA Index

**Descrizione:** Quando il lavoratore scannerizza presso un partner accreditato L4, l'evento produce: EV=L4 (1.00), IU computation, scrittura su `personal.worker_pib`, aggregazione in `analytics.activation_result`, contributo a KORA Index.

**Vieta:**
- Modalità A senza verifica che il partner sia accreditato L4 al momento dell'evento
- IU computation in Modalità A che usi EV diverso da quello dell'accreditamento effettivo
- Scrittura IU da KORA Link che non passi per il layer standard IU formula

**Permette:**
- EV L4 = 1.00 per partner accreditato al momento dell'evento
- IU computation tramite lo stesso engine delle altre IU (non una logica separata)

**Area sorgente:** Attribution handler Modalità A, `lib/kora-engine/`
**Test esistenti:** N/A
**Rischio se violato:** IU generati senza accreditamento valido, oppure accreditamento scaduto post-evento non ricalcolato
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Core della Modalità A
**Review richiesta:** CTO

---

### INV-D56 · Modalità B — collective/mentorship/cross_company → KORA Contribution

**Descrizione:** Quando il lavoratore scannerizza in un contesto collettivo, mentorship, o cross-company, l'evento produce un segnale KORA Contribution — non IU. Non passa per il KORA Index.

**Vieta:**
- Modalità B che scriva su `personal.worker_pib`
- Modalità B che contribuisca a `analytics.activation_result`
- Modalità B che alteri il KORA Index

**Permette:**
- Scrittura su `commons.contribution_event` con `contribution_kind` appropriato
- KORA Contribution aggiornato per il tenant

**Area sorgente:** Attribution handler Modalità B, `commons.contribution_event`
**Test esistenti:** N/A
**Rischio se violato:** Contributo collettivo gonfia il KORA Index
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Core della Modalità B
**Review richiesta:** CTO

---

### INV-D57 · Un evento presso partner non è mai anche evento collettivo

**Descrizione:** Modalità A e Modalità B sono mutualmente esclusive per ogni singolo scan event. Un partner accreditato L4 che ospita un evento collettivo non può produrre entrambi i binari per lo stesso scan.

**Vieta:**
- Handler che determini `event_nature` in base alla presenza di altri partecipanti in tempo reale
- Evento che cambi binario dopo che la scansione è avvenuta

**Permette:**
- Partner accreditato L4 che può ospitare eventi collettivi: la CONFIGURAZIONE del device_registry determina il binario al momento dell'attivazione del device, non al momento della scansione

**Area sorgente:** `device_registry.event_nature` o `device_registry.attribution_mode` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Ambiguità del binario, double counting rischio
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Design del device_registry
**Review richiesta:** CTO

---

### INV-D58 · Evento Contribution non altera direttamente il KORA Index

**Descrizione:** Allineato con INV-A08 ma specifico per KORA Link: un scan event Modalità B produce Contribution, non KORA Index. Anche se lo stesso lavoratore ha scan Modalità A e scan Modalità B, i due non si sommano nel KORA Index.

**Vieta:**
- Attribution handler Modalità B che chiami il KORA Engine pipeline
- `commons.contribution_event` generato da KORA Link che sia referenziato in `analytics.kora_index_result`

**Permette:**
- Display affiancato: KORA Index (da Modalità A) + KORA Contribution (da Modalità B + KORA Space)

**Area sorgente:** Attribution handler, `lib/kora-engine/`
**Test esistenti:** N/A
**Rischio se violato:** Double counting KORA Index
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Separazione binari — allineato con INV-A08
**Review richiesta:** CTO

---

### INV-D59 · Output azienda degli eventi KORA Link è aggregato o privacy-safe

**Descrizione:** Le aziende non possono vedere chi ha scansionato, quando, e quante volte a livello individuale. Possono vedere solo aggregati (es. "47 scan questo mese") con N≥10.

**Vieta:**
- Dashboard aziendale con lista worker + count scan
- Report "chi ha usato KORA Link" visibile a COMPANY_ADMIN

**Permette:**
- "X scan totali questo mese nel tuo tenant" (count aggregato)
- "Y% dei chip attivi ha generato almeno uno scan" (aggregato, N≥10)

**Area sorgente:** RLS `035_kora_link_rls.sql` (candidato), `app/company/` KORA Link section
**Test esistenti:** N/A
**Rischio se violato:** KORA Link diventa sistema di tracking presenze
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Confine privacy lato azienda per KORA Link
**Review richiesta:** security/privacy + legal/DPIA

---

### INV-D60 · Nessuna scansione crea ranking individuale

**Descrizione:** Il numero di scansioni di un lavoratore non è mai visibile a ruoli company, né usato per creare classifiche o ordinamenti tra lavoratori.

**Vieta:**
- `SELECT worker_ref, COUNT(scan) FROM scan_event GROUP BY worker_ref` esposta a COMPANY_ADMIN
- "Top scanners" visibili a company

**Permette:**
- Lavoratore che vede il proprio storico scan in My KORA
- KORA_ADMIN che vede scan totali per diagnostica (non ranking)

**Area sorgente:** `034_kora_link_schema.sql`, RLS `035`
**Test esistenti:** N/A
**Rischio se violato:** KORA Link diventa gamification con ranking
**Impatto privacy:** CRITICO
**Impatto metodologia:** CRITICO — viola INV-A02
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Allineato con INV-A02 per il contesto KORA Link
**Review richiesta:** security/privacy + CTO

---

## Sezione E — Partner L4 / Advisor Audit

### INV-E61 · EV L4 = 1.00 solo se accreditamento valido al momento dell'evento

**Descrizione:** Il valore EV nella formula IU per un evento partner KORA Link è 1.00 SOLO se il partner risulta accreditato L4 alla data/ora dell'evento. L'accreditamento è verificato al momento del lookup, non al momento dell'insert.

**Vieta:**
- IU computation che usi EV=1.00 per eventi antecedenti all'accreditamento
- Snapshot EV calcolato al momento del load, non dell'evento

**Permette:**
- Lookup `accredited_until >= event_timestamp` prima della IU computation

**Area sorgente:** Attribution handler Modalità A, `network.partner_profile`
**Test esistenti:** N/A
**Rischio se violato:** IU gonfiati per eventi pre-accreditamento
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Timing check per Modalità A
**Review richiesta:** CTO

---

### INV-E62 · Accreditamento scaduto non produce L4

**Descrizione:** Se `accredited_until < now()`, il partner non è più L4. Nuovi scan presso questo partner usano EV secondo il livello di accreditamento corrente (es. L2 se ha solo documentazione interna).

**Vieta:**
- Uso di EV=1.00 per partner con `accredited_until` nel passato
- Cache di EV che non scada con l'accreditamento

**Permette:**
- EV determinato dinamicamente al momento dell'evento
- Notifica a KORA_ADMIN quando un partner è prossimo a scadenza

**Area sorgente:** Attribution handler, `network.partner_profile.accreditation_status`
**Test esistenti:** N/A
**Rischio se violato:** IU per eventi post-scadenza con EV=1.00 non corretto
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Temporalità dell'accreditamento
**Review richiesta:** CTO

---

### INV-E63 · Accreditamento revocato non produce L4

**Descrizione:** Se l'accreditamento di un partner è revocato, tutti gli eventi futuri usano EV ridotto. Questa è una revoca prospettica — non retroattiva di default.

**Vieta:**
- Ricalcolo retroattivo automatico di tutti gli IU passati alla revoca
- Accesso al sistema partner con status 'revoked'

**Permette:**
- Revoca prospettica: eventi futuri usano EV ridotto
- Ricalcolo retroattivo SOLO se esplicitamente autorizzato da KORA_ADMIN (con audit)
- `accreditation_status = 'suspended'` come step intermedio prima di 'revoked'

**Area sorgente:** `network.partner_profile.accreditation_status`, Attribution handler
**Test esistenti:** N/A
**Rischio se violato:** Partner revocato continua a produrre L4
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Allineato con INV-E62
**Review richiesta:** CTO

---

### INV-E64 · L'EV si risolve all'istante dell'evento

**Descrizione:** EV è determinato dal livello di accreditamento del partner nel momento esatto in cui l'evento avviene. Non può essere modificato retroattivamente senza review esplicita.

**Vieta:**
- Aggiornamento automatico dell'EV di IU già registrati quando l'accreditamento cambia
- EV determinato al momento del report, non dell'evento

**Permette:**
- `ev_at_event_time` colonna opzionale in `analytics.impact_unit` per tracciare EV snapshot
- Review manuale con ricalcolo esplicito se necessario

**Area sorgente:** `analytics.impact_unit.ev`, Attribution handler
**Test esistenti:** N/A
**Rischio se violato:** IU instabili — cambiano valore nel tempo senza azione esplicita
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Snapshot EV per Modalità A
**Review richiesta:** CTO

---

### INV-E65 · Advisor audit è dato di prima classe

**Descrizione:** Le note e i risultati dell'advisor audit (valutazione da parte di KORA Advisor) sono dati strutturati — non note libere. Devono avere schema minimo definito.

**Vieta:**
- Advisor audit come campo testo libero senza schema
- Perdita di dati advisor audit

**Permette:**
- Schema strutturato con i campi minimi (INV-E66)

**Area sorgente:** `analytics.decision_pack_version`, `services/founder-validation/`
**Test esistenti:** N/A
**Rischio se violato:** Audit non verificabile, non difendibile
**Impatto privacy:** N/A
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Advisor audit per accreditamento partner KORA Link
**Review richiesta:** CTO

---

### INV-E66 · Advisor audit contiene almeno: chi, quando, esito, validità, scadenza

**Descrizione:** Ogni record di advisor audit deve avere: `reviewer_id` (chi), `reviewed_at` (quando), `outcome` (esito: pass/fail/conditional), `valid_from`, `valid_until` (validità e scadenza).

**Vieta:**
- Record advisor audit senza uno dei 5 campi minimi
- `valid_until = null` per un accreditamento attivo

**Permette:**
- Campi aggiuntivi (note, checklist items) purché i 5 minimi siano presenti

**Area sorgente:** `network.partner_profile` (campi accreditamento), `services/advisor/`
**Test esistenti:** N/A
**Rischio se violato:** Accreditamento non verificabile, scadenza non determinabile
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Prerequisito per Modalità A
**Review richiesta:** CTO

---

### INV-E67 · `accredited_until` obbligatorio per validità temporale

**Descrizione:** Il campo `accredited_until` (o equivalente) è obbligatorio in ogni record di accreditamento. Senza di esso, la validità temporale non è determinabile.

**Vieta:**
- Partner con `accreditation_level = 'L4'` e `accredited_until IS NULL` in produzione

**Permette:**
- `accredited_until` lontano nel futuro per accreditamenti "permanenti" (es. 2099-12-31) — ma deve essere esplicito

**Area sorgente:** `network.partner_profile`
**Test esistenti:** N/A
**Rischio se violato:** Partner con accreditamento eterno senza scadenza — revoca impossibile per scadenza
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Prerequisito Modalità A
**Review richiesta:** CTO

---

### INV-E68 · Revoca partner predispone ricalcolo

**Descrizione:** Quando un partner viene revocato, il sistema deve predisporre (non necessariamente eseguire automaticamente) il ricalcolo delle IU generate dopo la data di revoca. Il ricalcolo è un'operazione esplicita, non automatica.

**Vieta:**
- Sistema che ignori completamente gli IU post-revoca
- Ricalcolo automatico silenzioso senza audit entry

**Permette:**
- Flag `needs_recalculation` su IU generati da partner post-revoca
- KORA_ADMIN che avvia ricalcolo esplicito con audit entry

**Area sorgente:** Attribution handler, `analytics.impact_unit`
**Test esistenti:** N/A
**Rischio se violato:** IU gonfiati con EV=1.00 per eventi post-revoca partner
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Gestione ciclo di vita partner
**Review richiesta:** CTO

---

### INV-E69 · Ogni evento L4 sa quale partner/accreditamento l'ha generato

**Descrizione:** In `analytics.impact_unit` (o nella tabella attribution KORA Link), ogni IU generato da Modalità A deve avere tracciabilità verso il `partner_id` e l'`accreditation_record_id` che hanno determinato EV=L4.

**Vieta:**
- IU da KORA Link Modalità A senza FK al partner che l'ha accreditato
- Factor trace che non includa il partner come sorgente

**Permette:**
- `source_partner_id` e `ev_accreditation_id` in `analytics.impact_unit` o nella tabella attribution

**Area sorgente:** `analytics.impact_unit.factor_trace` (attuale), tabelle candidato 034
**Test esistenti:** N/A
**Rischio se violato:** IU non ricostruibili alla loro sorgente partner
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Audit trail Modalità A
**Review richiesta:** CTO

---

### INV-E70 · Partner accreditation richiede review metodologica e tecnica

**Descrizione:** Il processo di accreditamento di un nuovo partner L4 richiede sia una review metodologica (il servizio offerto genera impatto reale nelle categorie KORA?) sia una review tecnica (l'integrazione è sicura, il device è correttamente configurato?).

**Vieta:**
- Accreditamento L4 auto-approvato senza KORA_ADMIN review
- Accreditamento basato solo su criteri tecnici senza validazione metodologica

**Permette:**
- Workflow di accreditamento in due fasi: tecnica (dev/CTO) + metodologica (advisor/fondatore)

**Area sorgente:** `network.partner_profile`, `services/advisor/`, `services/founder-validation/`
**Test esistenti:** N/A
**Rischio se violato:** Partner non qualificati producono EV=L4 e gonfiamo il KORA Index
**Impatto privacy:** N/A
**Impatto metodologia:** CRITICO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Prerequisito per ogni partner Modalità A
**Review richiesta:** CTO + metodologica

---

## Sezione F — Wallet Futuro

### INV-F71 · Wallet/BTL non implementato in KORA Link v1

**Descrizione:** KORA Link v1 non include wallet, token, criptovaluta, o qualsiasi meccanismo di pagamento/ricompensa digitale. Il chip è un sistema di attribution, non un sistema di pagamento.

**Vieta:**
- Qualsiasi logica wallet/crypto/payment in KORA Link v1
- Campo `balance`, `amount`, `token_value` nel data model KORA Link v1

**Permette:**
- Architettura che lasci uno stub/hook per future versioni (campo `wallet_hook_reserved` NULL, non usato)

**Area sorgente:** `034_kora_link_schema.sql` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Complessità regolatoria immediata (MiCA, KYC/AML)
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO — wallet in v1 è un non-starter regolatorio
**Impatto KORA Link:** Scope boundary v1
**Review richiesta:** legal/DPIA + CTO

---

### INV-F72 · Il data model può lasciare un hook futuro per wallet

**Descrizione:** È permesso (ma non obbligatorio) includere un campo `wallet_hook` o simile in `device_registry` o `scan_event`, valorizzato a NULL in v1, per facilitare l'estensione futura senza migration breaking.

**Vieta:**
- Hook wallet con logica attiva in v1
- Campo wallet collegato a tabelle di pagamento in v1

**Permette:**
- Campo nullable `future_wallet_integration` con valore sempre NULL in v1

**Area sorgente:** `034_kora_link_schema.sql` (candidato)
**Test esistenti:** N/A
**Rischio se violato:** Migration breaking quando si aggiungerà wallet
**Impatto privacy:** Basso
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** Basso
**Impatto KORA Link:** Forward compatibility
**Review richiesta:** CTO

---

### INV-F73 · Nessuna tabella wallet in v1

**Descrizione:** Nelle migration 034 e 035, non esiste nessuna tabella con semantica wallet: no `wallet`, `ledger`, `transaction`, `balance`, `reward`, `coin`, `token_balance`.

**Vieta:**
- Creazione di qualsiasi tabella wallet nelle migration KORA Link v1

**Permette:**
- Documentation only: nota in commento sulle future wallet migration

**Area sorgente:** `034_kora_link_schema.sql`, `035_kora_link_rls.sql`
**Test esistenti:** N/A
**Rischio se violato:** Complessità regolatoria, fuori scope v1
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Scope v1
**Review richiesta:** legal/DPIA

---

### INV-F74 · Nessuna logica wallet in v1

**Descrizione:** Nei service, handler, e route KORA Link v1, non esiste logica wallet: no balance computation, no reward attribution, no token transfer.

**Vieta:**
- `WalletService`, `RewardService`, `TokenAttributionService` in KORA Link v1

**Permette:**
- Interface stub (no implementation) per review futura

**Area sorgente:** `services/`, `lib/`
**Test esistenti:** N/A
**Rischio se violato:** Wallet attivo senza framework legale
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Scope v1
**Review richiesta:** legal/DPIA + CTO

---

### INV-F75 · Nessun codice crypto/payment/KYC/AML/MiCA in v1

**Descrizione:** KORA Link v1 non contiene nessuna libreria o logica relativa a criptovalute, payment processing, KYC (know your customer), AML (anti money laundering), o conformità MiCA.

**Vieta:**
- `import ethers from 'ethers'` o equivalenti in KORA Link v1
- Payment gateway integration in KORA Link v1
- KYC verification flow in KORA Link v1

**Permette:**
- Documentazione del framework legale necessario per le versioni future

**Area sorgente:** `package.json`, `services/`
**Test esistenti:** N/A
**Rischio se violato:** Violazioni regolatorio, liability
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Scope boundary v1
**Review richiesta:** legal/DPIA + CTO

---

### INV-F76 · Prima del wallet servono cornice legale-finanziaria, KYC/AML/MiCA/custodia

**Descrizione:** Qualsiasi futura versione di KORA Link con wallet richiede: parere legale sulla struttura del token, framework KYC/AML, valutazione MiCA, custodia del token, e sign-off legale. Nessuno di questi è presente in v1.

**Vieta:**
- Lancio wallet senza completamento di tutti i prerequisiti legali

**Permette:**
- Studio di fattibilità e analisi legale in parallelo allo sviluppo di v1

**Area sorgente:** N/A — processo
**Test esistenti:** N/A
**Rischio se violato:** Violazioni MiCA, AML, responsabilità penale
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Future versions only
**Review richiesta:** legal/DPIA

---

### INV-F77 · Il wallet non deve essere confuso con KORA Link v1

**Descrizione:** Nelle comunicazioni interne, external docs, pitch deck, e codice, KORA Link v1 è chiaramente definito come sistema di attribution NFC/QR — non come wallet. La futura versione wallet è un prodotto separato.

**Vieta:**
- Presentare KORA Link v1 come "wallet KORA" a investitori o clienti
- README o doc che descrivano KORA Link v1 con terminologia wallet

**Permette:**
- Roadmap che menzioni wallet come step futuro, chiaramente separato da v1

**Area sorgente:** Docs, pitch deck, `spec/KORA_PRODUCT_DOCTRINE.md`
**Test esistenti:** N/A
**Rischio se violato:** Confusione investitori, aspettative sbagliate, liability
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Comunicazione prodotto
**Review richiesta:** CTO + founder

---

## Sezione G — Investor/Client Readiness

### INV-G78 · Feature non production-ready dichiarate gated

**Descrizione:** Ogni feature che non è production-ready deve essere dichiarata come tale — con un gate esplicito, un label, o un feature flag. Non esistono feature "quasi pronte" invisibili.

**Vieta:**
- Feature in produzione senza test, senza review, senza data model
- Shell UI vuota che sembri una feature live senza label

**Permette:**
- "Coming Soon" label
- Feature flag OFF
- Future Vision label

**Area sorgente:** `app/future-vision/`, `lib/constants/feature-flags.ts`
**Test esistenti:** N/A
**Rischio se violato:** Presentazione fuorviante
**Impatto privacy:** Basso
**Impatto metodologia:** Basso
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** KORA Link deve avere label "Coming with KORA Link v1" fino all'attivazione
**Review richiesta:** CTO

---

### INV-G79 · Pagine shell o "prossimamente" etichettate in demo

**Descrizione:** Durante la demo guidata o investor demo, qualsiasi pagina shell o placeholder deve avere label visibile che indichi il suo stato.

**Vieta:**
- Pagine shell mostrate come feature live in investor demo
- Label rimossa per "rendere più pulita la demo"

**Permette:**
- Label discreta ma presente: "Coming in [release]" o "In development"

**Area sorgente:** `app/future-vision/`, componenti demo
**Test esistenti:** N/A
**Rischio se violato:** Demo ingannevole, perdita fiducia investitori al discovery
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** KORA Link demo deve essere chiaramente labellata
**Review richiesta:** CTO + founder

---

### INV-G80 · Demo guidata usa dati sintetici e lo dichiara

**Descrizione:** In qualsiasi demo (investor, client, onboarding), i dati mostrati sono sintetici. Questo deve essere dichiarato in UI (label `Dati sintetici — solo per dimostrazione`) e nella comunicazione verbale.

**Vieta:**
- Demo con dati reali di clienti non-anonimi
- Assenza di label su dati sintetici in UI demo

**Permette:**
- Scenari sintetici convincenti che illustrino il valore del prodotto

**Area sorgente:** `data/synthetic/`, `components/demo/`, ENV label
**Test esistenti:** N/A
**Rischio se violato:** Violazione GDPR se dati reali esposti; confusione se demo = realtà
**Impatto privacy:** CRITICO
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** Demo KORA Link usa device e token sintetici
**Review richiesta:** CTO + legal/DPIA

---

### INV-G81 · Investor demo distingue chiaramente live / preview / roadmap

**Descrizione:** La demo per investitori deve avere tre categorie visivamente distinte: ciò che è **live** oggi (dati reali, produzione), ciò che è **preview** (staging, in testing), ciò che è **roadmap** (pianificato, non implementato).

**Vieta:**
- Confondere preview con live in presentazione investor
- Presentare roadmap come già implementato

**Permette:**
- Badge colorati: verde = live, giallo = preview, grigio = roadmap

**Area sorgente:** `docs/KORA_PLATFORM_INVENTORY.md`, pitch deck, UI
**Test esistenti:** N/A
**Rischio se violato:** Misrepresentation a investitori, potenziale fraud
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** CRITICO
**Impatto KORA Link:** KORA Link è roadmap — etichettato come tale
**Review richiesta:** CTO + founder

---

### INV-G82 · Feature disabilitata non appare come promessa tecnica già pronta

**Descrizione:** Una feature con feature flag OFF non deve essere presentata come "già implementata ma disabilitata". Se non è pronta, è roadmap.

**Vieta:**
- "Abbiamo già KORA Link, basta abilitare un flag" — se il flag non è production-ready

**Permette:**
- "Stiamo sviluppando KORA Link — la architettura è in piedi, il codice è in corso"

**Area sorgente:** `lib/constants/feature-flags.ts`, comunicazioni
**Test esistenti:** N/A
**Rischio se violato:** Aspettative sbagliate → cliente/investitore deluso al discovery
**Impatto privacy:** N/A
**Impatto metodologia:** N/A
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** KORA_LINK_ENABLED=false ≠ "pronto ma off"
**Review richiesta:** CTO + founder

---

### INV-G83 · Ogni nuova feature ha design doc, data model, test, risk notes, release gate

**Descrizione:** Prima che una feature entri in produzione deve esistere: (1) design doc, (2) data model, (3) test suite, (4) risk notes (privacy/metodologia/operativo), (5) release gate esplicito.

**Vieta:**
- Feature in produzione senza uno dei 5 elementi
- "Lo aggiungiamo dopo" per qualsiasi dei 5

**Permette:**
- Feature flag OFF come release gate temporaneo mentre gli altri elementi maturano

**Area sorgente:** `spec/`, `DATA_MODEL.md`, `ARCHITECTURE.md`
**Test esistenti:** N/A
**Rischio se violato:** Debito tecnico, privacy debt, regressioni silenziose
**Impatto privacy:** ALTO
**Impatto metodologia:** ALTO
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** KORA Link v1 deve soddisfare tutti e 5 i criteri prima del go-live
**Review richiesta:** CTO

---

### INV-G84 · Nessuna modifica ad aree off-limits senza review

**Descrizione:** Le aree off-limits documentate in `ARCHITECTURE.md §12` e `CLAUDE.md §17` non possono essere modificate senza review esplicita CTO + security/privacy + founder (dove applicabile).

**Vieta:**
- PR che tocchi aree off-limits senza review
- Bypass di gate mediante workaround tecnici

**Permette:**
- Review esplicita che autorizza la modifica con documentazione

**Area sorgente:** `ARCHITECTURE.md §12`, `CLAUDE.md §17`, `spec/INVARIANTS.md`
**Test esistenti:** N/A
**Rischio se violato:** Violazione gate, privacy, metodologia
**Impatto privacy:** Variabile (CRITICO per aree privacy)
**Impatto metodologia:** Variabile
**Impatto cliente/investitore:** ALTO
**Impatto KORA Link:** Migration 034/035 richiedono CTO + security/privacy review
**Review richiesta:** CTO + security/privacy + founder (case-by-case)

---

*Fine INVARIANTS.md — 84 invarianti definiti.*
*Ogni invariante è non negoziabile salvo decisione founder documentata in `docs/21-founder-gate-resolution-log.md`.*
