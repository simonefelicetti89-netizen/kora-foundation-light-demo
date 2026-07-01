# KORA Link v1 — Technical Design Document

**Branch:** `feat/kora-link-v1`
**Base:** `eaecdad` (`value-freeze-v1`)
**Status:** Design only — nessun codice runtime, nessuna migration
**Data:** 2026-06-30
**Gate:** Gate 2 (OPEN) + Gate 3 (OPEN) — implementazione bloccata
**Pubblico:** CTO, tech lead, DPO, advisor, revisore esterno

---

## 1. Executive Summary

KORA Link è il ponte fisico-digitale che connette l'esperienza welfare/attivazione nel mondo fisico all'ecosistema KORA. In v1, KORA Link è implementato come un chip NFC personalizzato consegnato al worker, che porta inciso un URL pubblico contenente un token random, anonimo e revocabile.

**Il chip non identifica il worker.** Contiene solo un URL con un token. L'associazione tra token e identità worker avviene esclusivamente lato server, dopo che il worker ha:
1. scansionato il chip con il proprio dispositivo;
2. effettuato il login (o creato accesso) nell'app KORA;
3. accettato esplicitamente l'informativa privacy relativa a KORA Link.

**L'azienda non vede mai gli eventi individuali** del worker tramite KORA Link. Vede solo stati operativi aggregati: quanti link sono stati consegnati, quanti attivati, quanti revocati. Nessun ranking, nessuna timeline individuale, nessuna correlazione lavoratore↔comportamento.

**Il partner accreditato (v1.1+)** può ricevere una conferma di presenza a un evento verificato, ma non ottiene l'identità del worker né dati KORA individuali. La disclosure è minima e consensuale.

KORA Link v1 comprende: design del token model, feature flag, route pubblica (`/link/[token]`) design, activation flow design, admin batch conceptual model. Nessun codice viene scritto in questo documento — questo è il design gate prima di KL-02 (schema) e KL-03/KL-04 (migrations).

**Gate richiesti prima di qualsiasi implementazione runtime:**
- Gate 2: CTO review schema e produzione (OPEN)
- Gate 3: DPO/legal review per dati worker e consenso (OPEN)

---

## 2. Product Doctrine

Questi principi sono non negoziabili. Ogni decisione di design e implementazione deve essere valutata contro di essi.

| Principio | Implicazione pratica |
|-----------|---------------------|
| **KORA misura organizzazioni, non individui** | Il chip non identifica la persona; l'associazione è privata al worker |
| **Il chip non identifica la persona** | Il chip contiene solo token opaco — nessun nome, email, ID, ruolo |
| **Il token non contiene dati personali** | Token random, non derivato da identità, non decodificabile |
| **Il worker mantiene controllo e consenso** | L'attivazione è volontaria; il worker può revocare in autonomia |
| **L'azienda vede solo stati operativi e aggregati privacy-safe** | Mai scansioni individuali, mai timeline worker, mai ranking |
| **Il partner vede il minimo necessario** | Conferma evento verificato senza PII — minimum data disclosure |
| **Nessun double counting** | Un evento ha una sola `event_nature` e segue un solo track |
| **Ogni evento segue un solo binario** | Track A (partner verificato) o Track B (collettivo/KORA Space) — non entrambi |
| **Nessun employer monitoring individuale** | KORA Link non è un sistema di tracciamento presenziale individuale |
| **La revoca è immediata e intrasferibile** | Worker revoca → token invalido; chip è personale e non condivisibile |

---

## 3. Actors and Responsibilities

### KORA_ADMIN

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Generare batch di token, consegnare link a tenant, revocare token, sostituire token, visualizzare audit trail completo, governance partner, break-glass (documentato) |
| **Non può fare** | Associare autonomamente un token a un worker (richiede azione del worker), vedere PIB individuale tramite scan events |
| **Dati visibili** | Tutti gli stati operativi link; audit trail completo (senza contenuto scansioni worker private); parametri metodologici |
| **Dati non visibili** | Contenuto privato My KORA worker; timeline welfare individuale non correlata a Link |

### COMPANY_ADMIN

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Visualizzare stock link disponibili, link consegnati, link attivi, link revocati; segnalare link perso; richiedere sostituzione |
| **Non può fare** | Vedere quale worker ha attivato quale link; vedere eventi KORA Link individuali; associare token a worker; accedere ad audit trail individuale |
| **Dati visibili** | Conteggi aggregati: link disponibili, consegnati, attivi, revocati; trend di attivazione aggregata |
| **Dati non visibili** | token↔worker mapping; timestamp individuali scansione; eventi partner per singolo worker; PIB individuale |

### COMPANY_VIEWER

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Visualizzare report aggregati KORA Link se abilitato da COMPANY_ADMIN |
| **Non può fare** | Nessuna azione amministrativa su link; nessun accesso dati individuali |
| **Dati visibili** | Solo aggregati approvati da COMPANY_ADMIN |
| **Dati non visibili** | Tutto ciò che non è esplicitamente aggregato |

### WORKER

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Attivare il proprio link, revocare il proprio link, richiedere sostituzione, vedere la propria timeline Link in My KORA, aggiornare consenso |
| **Non può fare** | Attivare link altrui; trasferire token; vedere dati Link di altri worker |
| **Dati visibili** | Proprio stato link, proprie scansioni in My KORA, propri eventi partner verificati, proprio consenso |
| **Dati non visibili** | Dati Link di altri worker; mapping token→worker altrui; parametri scoring KORA |

### PARTNER_OPERATOR

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Registrare un evento verificato su presentazione link worker (v1.1+); validare presenza |
| **Non può fare** | Vedere identità worker; vedere PIB; vedere altri eventi del worker; accedere a KORA workspace |
| **Dati visibili** | Token opaco per validazione; conferma evento; evento reference proprio |
| **Dati non visibili** | Worker ID; nome; email; PIB; KORA Index; altre scansioni |

### PARTNER_ADMIN

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Gestire operatori partner propri; vedere report aggregati eventi verificati propri; governance accreditamento |
| **Non può fare** | Accedere a dati KORA dei worker; vedere dati tenant company; cross-partner visibility |
| **Dati visibili** | Aggregati eventi propri partner; stato accreditamento; report anonymized |
| **Dati non visibili** | Identità worker; dati cross-tenant; dati altri partner |

### ADVISOR / AUDITOR (futuro)

| Campo | Dettaglio |
|-------|-----------|
| **Può fare** | Audit trail KORA Link su richiesta documentata; validazione metodologica eventi partner |
| **Non può fare** | Accesso non documentato; accesso PII non necessario all'audit |
| **Dati visibili** | Audit log metodologici; stati link senza PII inutile |
| **Dati non visibili** | Contenuto scansioni private; timeline worker non pertinente |

---

## 4. KORA Link Object Model

Definizioni concettuali — nessun SQL in questa sezione.

### 4.1 Link Batch

**Scopo:** Raggruppamento amministrativo di token generati in un'unica operazione.
**Campi concettuali:** `batch_id`, `tenant_id`, `created_by_admin_id`, `quantity`, `status` (created/delivered/partially_active/closed), `created_at`, `notes`
**Owner:** KORA_ADMIN
**Privacy level:** Admin-only
**Lifecycle:** created → delivered → (tokens activate) → closed

### 4.2 Physical Chip

**Scopo:** Oggetto fisico NFC consegnato al worker. Portatore del token pubblico.
**Campi concettuali:** `chip_ref` (opaco, stampa interna produzione), `batch_id`, `token_id`, `format` (NFC tipo 2/4), `url_inscribed`, `delivery_status`
**Owner:** KORA_ADMIN → delega a COMPANY_ADMIN per consegna
**Privacy level:** Admin+Company operational
**Lifecycle:** produced → batch_assigned → delivered_to_company → handed_to_worker → (worker activates) → active/revoked/replaced

### 4.3 Public Token

**Scopo:** Stringa random non-sequenziale incisa nel chip e presentata nell'URL pubblico.
**Campi concettuali:** `token_id`, `token_value` (random, opaco), `token_hash` (stored hashed se adottato), `batch_id`, `chip_ref`, `status` (unassigned/assigned/active/revoked/expired), `created_at`, `activated_at`, `revoked_at`, `expires_at?`
**Owner:** KORA_ADMIN (gestione); WORKER (attivazione e revoca)
**Privacy level:** Token opaco — non contiene PII
**Lifecycle:** generated → unassigned → assigned_to_chip → (worker scans) → activation_attempted → active → (revoke/replace/expire)

### 4.4 Link Assignment

**Scopo:** Record server-side che collega un token a un worker specifico. Creato solo dopo consenso esplicito.
**Campi concettuali:** `assignment_id`, `token_id`, `worker_id`, `tenant_id`, `assigned_at`, `consent_record_id`, `assignment_status` (active/revoked/replaced)
**Owner:** Sistema (creato automaticamente post-consenso)
**Privacy level:** KORA_ADMIN + Worker self — MAI employer-visible
**Lifecycle:** created_on_activation → active → (revoked/replaced)

### 4.5 Worker Activation

**Scopo:** Evento di attivazione — primo accesso del worker al link con login e consenso completati.
**Campi concettuali:** `activation_id`, `token_id`, `worker_id`, `activated_at`, `device_hint` (hash anonimo, non IP raw), `consent_version`, `activation_source` (nfc_scan/qr_code/manual_entry)
**Owner:** Sistema
**Privacy level:** Worker-private + KORA_ADMIN audit
**Lifecycle:** one-time event per token

### 4.6 Consent Record

**Scopo:** Prova del consenso del worker all'attivazione KORA Link e all'eventuale condivisione con partner.
**Campi concettuali:** `consent_id`, `worker_id`, `token_id`, `consent_type` (kora_link_activation / partner_scan_event), `consent_version`, `accepted_at`, `withdrawn_at?`, `legal_basis`
**Owner:** Worker (controllo); Sistema (custode)
**Privacy level:** Worker-private; KORA_ADMIN audit; DPO on request
**Lifecycle:** accepted → (optional: withdrawn) → archived

### 4.7 Link Event

**Scopo:** Evento generico tracciato tramite KORA Link — quick access, scan, check-in.
**Campi concettuali:** `event_id`, `token_id`, `worker_id` (nullable se non ancora attivato), `event_type` (quick_access/partner_scan/initiative_check_in), `event_nature` (Track A o Track B), `tenant_id`, `timestamp`, `context_ref?`, `partner_id?`
**Owner:** Sistema
**Privacy level:** Worker-private per eventi Track B; partner minimal per Track A
**Lifecycle:** created → (se Track A: validated_by_partner) → archived

### 4.8 Partner Scan

**Scopo:** Evento verificato da partner accreditato — registra presenza a evento senza rivelare identità.
**Campi concettuali:** `scan_id`, `token_id` (opaco per partner), `partner_id`, `event_ref`, `scan_timestamp`, `validation_status` (validated/rejected), `minimum_data_shared`
**Owner:** Partner (scansione); Sistema (validazione)
**Privacy level:** Partner vede solo token + evento reference; worker_id non esposto a partner
**Lifecycle:** scan_received → validated/rejected → archived

### 4.9 Revocation

**Scopo:** Disattivazione del token per perdita, furto, cambio link o richiesta worker.
**Campi concettuali:** `revocation_id`, `token_id`, `revoked_by` (worker_self/company_admin/kora_admin), `revocation_reason` (lost/stolen/voluntary/worker_offboarded/admin_override), `revoked_at`, `replacement_token_id?`
**Owner:** Worker (self) / KORA_ADMIN (admin override, documentato)
**Privacy level:** Admin + Worker self
**Lifecycle:** one-time event; token passa a status=revoked

### 4.10 Replacement

**Scopo:** Nuovo token emesso in sostituzione di un token revocato o danneggiato.
**Campi concettuali:** `replacement_id`, `old_token_id`, `new_token_id`, `replaced_at`, `reason`, `requested_by`
**Owner:** KORA_ADMIN (emissione); Worker (richiesta)
**Privacy level:** Admin + Worker self
**Lifecycle:** one-time per coppia old→new token

### 4.11 Audit Record

**Scopo:** Traccia immutabile di ogni azione rilevante sul lifecycle KORA Link.
**Campi concettuali:** `audit_id`, `event_type` (enum), `actor_role`, `actor_id_hash` (non cleartext), `resource_type`, `resource_id`, `timestamp`, `result`, `metadata_safe` (senza PII)
**Owner:** Sistema; KORA_ADMIN read; DPO on request
**Privacy level:** Admin-only; nessun PII inutile; actor hashato
**Lifecycle:** append-only, mai modificato

---

## 5. Token Model

### Caratteristiche fondamentali

| Proprietà | Valore / Regola |
|-----------|----------------|
| Formato | Stringa random, caso-insensitive, URL-safe |
| Lunghezza | 32–64 caratteri (da definire in KL-02) |
| Sequenzialità | **Non sequenziale** — impossibile enumerare batch da un token |
| Generazione | CSPRNG (crypto-safe random) — mai UUID v1/v3/v5 temporali |
| Contenuto | Nessun PII, nessun tenant name, nessun worker_id, nessun timestamp leggibile |
| Storage | Da decidere (KL-02): cleartext con indice hashed, oppure solo hash con ricerca diretta |
| Revocabilità | SÌ — revoca immediata lato server; chip fisico diventa inerte |
| Rotazione | SÌ — replacement genera nuovo token; vecchio token invalido |
| TTL | Da decidere in open questions §20 |
| URL NFC | `https://app.kora.<dominio>/link/<public-token>` |

### Token hashing: considerazioni

**Pro hash:** Token non leggibile in chiaro nel DB; leak DB non espone token attivi.
**Contro hash:** Ricerca deve avvenire per hash (non per prefisso); debug più complesso.
**Raccomandazione (da confermare KL-02):** Usare BLAKE2b o SHA-256 del token, con salt fisso per deployment. Il token cleartext non è mai loggato.

### Comportamento per stato token

| Stato token | Comportamento route pubblica `/link/[token]` |
|-------------|---------------------------------------------|
| Non esistente | `404` — risposta identica a revocato (no timing oracle) |
| Non ancora attivato | Mostra flow di attivazione — invita al login |
| Attivo (worker associato) | Quick access: redirect a My KORA workspace del worker (richiede sessione) |
| Revocato | `404` — risposta identica a non esistente |
| Scaduto (se TTL adottato) | `404` — risposta identica |
| Già associato (altra sessione tenta attivazione) | Mostra messaggio: "Questo link è già attivato. Se sei il titolare, accedi a My KORA." |
| Token formato invalido (non UUID/non regex) | `400` prima di qualsiasi DB query (Zod su param, pattern H-008) |

**Privacy invariant:** Nessuna risposta distingue "token inesistente" da "token revocato". Questo previene enumeration e disclosure del lifecycle a attori non autorizzati.

---

## 6. NFC Chip Content

### Cosa deve contenere il chip

Il chip NFC deve contenere **esclusivamente**:
- URL pubblico KORA nel formato: `https://app.kora.<dominio>/link/<public-token>`
- Il token è la sola informazione variabile

**Esempio concettuale:**
```
https://app.kora.ai/link/k7x9mP2rQvLtJ5nBwFdAeZ8cYhGs3uN
```

### Cosa NON deve contenere il chip

Il chip non deve mai contenere, né come dato strutturato né codificato:

| Dato proibito | Motivazione |
|---------------|-------------|
| Nome lavoratore | PII — chip è anonimo per design |
| Email | PII |
| Matricola / codice fiscale | PII |
| Nome o codice azienda | Disclosure struttura organizzativa |
| `worker_id` / UUID worker | Identificatore ricollegabile |
| `tenant_id` | Informazione organizzativa |
| Dati sanitari o welfare | Sensibili per natura |
| Punteggio / scoring | Discriminatorio se leggibile da chip |
| Partner info | Non pertinente al chip |
| Timestamp di emissione | Riduce unicità apparente token |

### Protezione fisica

- Il chip è personale e non trasferibile
- La consegna è documentata a livello di batch (non di identità)
- Il worker è informato che il chip non deve essere condiviso
- La perdita o il furto comportano revoca immediata e replacement

---

## 7. Lifecycle

### A. Link Generated by KORA Admin

KORA_ADMIN genera un batch di N token tramite il pannello admin. Ogni token è random, non-sequenziale. Il batch è associato a un tenant. I token entrano in stato `unassigned`.

### B. Link Delivered to Company

KORA_ADMIN trasferisce la responsabilità del batch a COMPANY_ADMIN (delivery record). I chip fisici vengono prodotti con il token iscritto e spediti all'azienda. Token: `unassigned` → `assigned_to_chip`.

### C. Link Handed to Worker

COMPANY_ADMIN consegna il chip fisico al worker. La consegna può essere registrata opzionalmente nel sistema (delivery_to_worker record) senza associare token↔worker (solo conferma che il chip è stato fisicamente consegnato a un membro del team, senza ID). Token rimane `assigned_to_chip`.

### D. Worker Scans Link

Il worker avvicina lo smartphone al chip. Lo smartphone apre il browser all'URL KORA Link. La route pubblica `/link/[token]` riceve la richiesta. Se il token è valido e non attivato, mostra il flow di onboarding. Se già attivato, verifica sessione.

### E. Worker Logs In / Creates Access

Il worker effettua il login (se già ha account) o crea accesso (se prima volta). Il login avviene tramite il flow auth standard KORA — nessun shortcut auth tramite il chip stesso (il chip non autentica, instrada).

### F. Worker Accepts Privacy Notice

Il worker visualizza l'informativa KORA Link dedicata: cosa è KORA Link, cosa viene registrato, chi può vedere cosa, come revocare. Il worker accetta esplicitamente. Il Consent Record viene creato con versione dell'informativa firmata.

### G. Server-Side Association token↔worker

Solo dopo consenso esplicito: il sistema crea il Link Assignment (`token_id` → `worker_id`). Questo record non è mai visibile all'azienda — è worker-private e KORA_ADMIN audit. Token: `assigned_to_chip` → `active`.

### H. Link Active

Il worker ha il chip attivo. Le scansioni successive aprono direttamente My KORA (se sessione attiva) o il login (se sessione scaduta). Gli eventi vengono registrati nella timeline privata del worker.

### I. Link Used for Quick Access / Initiative / Partner Scan

- **Quick access:** Scan apre My KORA — accesso rapido al workspace personale
- **Initiative check-in (KORA Space):** Scan in contesto evento → confirm partecipazione a iniziativa (Track B)
- **Partner scan (v1.1+):** Partner accreditato scansiona token → conferma presenza evento verificato (Track A)

### J. Link Revoked / Lost / Replaced

- **Worker revoca:** Self-service in My KORA → token status = `revoked` → chip inerte
- **COMPANY_ADMIN segnala perdita/furto:** Richiesta a KORA_ADMIN → revoca admin documentata
- **Replacement:** KORA_ADMIN genera nuovo token, crea replacement record, new chip spedito

### K. Worker Leaves Company

Worker offboarding → KORA_ADMIN o processo automatico revoca il token. Il Link Assignment viene chiuso. I dati di attivazione vengono trattati secondo retention policy (da definire in Gate 3). Il chip fisico non è più valido.

### L. Audit Retained Privacy-Safe

L'audit trail del lifecycle link viene archiviato con le seguenti garanzie: nessun PII inutile, actor_id hashato, token revocati non ricercabili, dati conformi a retention policy concordata con DPO.

---

## 8. Worker Activation Flow

```
SCAN CHIP
  │
  ▼
GET /link/<token> (public route)
  │
  ├── Token format invalid → 400 (Zod validation, no DB query)
  │
  ├── Token not found / revoked / expired → 404 (timing-safe, identical response)
  │
  ├── Token unassigned / assigned_to_chip (not yet activated)
  │     │
  │     ▼
  │   [Onboarding screen — "Attiva il tuo KORA Link"]
  │     │
  │     ├── Worker non loggato → redirect login con ?next=/link/<token>
  │     │
  │     └── Worker loggato
  │           │
  │           ▼
  │         [Privacy Notice KORA Link]
  │           │
  │           ├── Rifiuta → nessuna associazione; token rimane unassigned
  │           │
  │           └── Accetta → POST /api/worker/kora-link/activate
  │                           → Crea ConsentRecord
  │                           → Crea LinkAssignment (token↔worker)
  │                           → token status = active
  │                           → Redirect My KORA
  │
  └── Token active (già associato)
        │
        ├── Worker loggato + è il titolare → redirect My KORA workspace
        │
        ├── Worker loggato + NON è il titolare → 403 "Questo link appartiene a un altro account"
        │
        └── Worker non loggato → redirect login (post-login: verifica titolarità)
```

### Gestione casi edge

| Caso | Comportamento |
|------|---------------|
| Link già attivo, stessa sessione | Redirect diretto a My KORA |
| Link già attivo, sessione diversa | Prompt login; post-login: verifica titolarità |
| Link non valido (token invalido) | 400 pre-DB (Zod) |
| Link non trovato / revocato | 404 — risposta identica (no disclosure) |
| Worker non ha account KORA | Flow creazione account → poi onboarding link |
| Worker revoca volontariamente | My KORA → Impostazioni Link → Revoca → Conferma → token revocato |
| Link perso/rubato | Worker o Company segnala → Admin revoca → Replacement su richiesta |
| Doppia attivazione (stesso token, due worker) | Impossibile — assignment è 1:1; secondo tentativo → "già attivato" |

---

## 9. Company Flow

### Dati visibili a COMPANY_ADMIN

| Dato | Visibile | Granularità |
|------|----------|------------|
| Totale link ricevuti dal batch | SÌ | Numero |
| Link consegnati ai worker (fisicamente) | SÌ | Numero (senza nome worker) |
| Link attivati (token in stato active) | SÌ | Numero aggregato |
| Link non ancora attivati | SÌ | Numero |
| Link revocati | SÌ | Numero + motivo aggregato (lost/voluntary/offboarded) |
| Trend attivazione nel tempo | SÌ | Grafico aggregato |
| Link problematici da segnalare | SÌ | Azione operativa (segnala perdita) |

### Dati MAI visibili a COMPANY_ADMIN

- Quale worker specifico ha attivato quale token
- Timestamp individuali di attivazione o scansione
- Scansioni partner individuali
- Iniziative individuali a cui il worker ha partecipato via Link
- PIB o scoring del worker
- Qualsiasi dato personale legato al Link

### Azioni disponibili

- Richiedere sostituzione link perso (segnalazione aggregata — il sistema revoca e genera replacement senza identificare il worker)
- Visualizzare report operativo batch
- Contattare KORA_ADMIN per problemi di fornitura

---

## 10. KORA Admin Flow

### Generazione batch

1. KORA_ADMIN seleziona tenant destinatario
2. Specifica quantità link da generare
3. Sistema genera N token random via CSPRNG
4. Batch record creato con stato `created`
5. Audit record generato: `BATCH_CREATED`
6. Admin può scaricare manifesto batch (solo admin — contiene token list per produzione chip)

### Gestione stato link

- Pannello con lista token per tenant (filtrabili per stato)
- Audit trail per token selezionato
- Azioni: revoca, replacement, note admin

### Revoca amministrativa

- KORA_ADMIN può revocare token per: offboarding worker, segnalazione furto company, abuso rilevato
- Ogni revoca admin richiede `revocation_reason` documentato
- Audit record immutabile: `TOKEN_REVOKED_ADMIN` + actor_id_hash + reason

### Break-Glass

Accesso in emergenza all'associazione token↔worker (es. indagine abuso grave):
- Richiede autorizzazione documentata (DPO/CTO)
- Ogni break-glass genera audit record `BREAK_GLASS_ACCESS` con justification
- Non disponibile a COMPANY_ADMIN in nessun caso
- Incapsulato in `FounderValidationService` pattern — non in route standard

### Replacement

1. Admin identifica token da sostituire (via token_id, mai via worker_id direttamente)
2. Vecchio token → `revoked`; Replacement record creato
3. Nuovo token generato
4. Nuovo chip prodotto e spedito
5. Assignment migrato al nuovo token (se worker ha già attivato)

---

## 11. Partner Flow

### v1 — Quick Access / Activation Only

In v1, KORA Link non prevede interazione con partner esterni. Il link è usato solo per:
- Quick access del worker al proprio workspace KORA
- Activation flow

Nessun endpoint partner in v1.

### v1.1 — Partner Scan Pilot (primo pilota controllato)

Partner accreditato (palestra, nutrizionista, organizzazione volontariato certificata) può scansionare il link del worker per registrare presenza a un evento verificato.

**Flow:**
1. Partner scan device (app dedicata) legge token dall'URL KORA Link
2. `POST /api/partner/scan` con token (opaco) + event_ref + partner_id
3. Sistema verifica: token attivo? partner accreditato? worker ha consenso partner scan?
4. Se tutti i check passano: crea `PartnerScan` record; restituisce `{ ok: true, event_confirmed: true }` al partner
5. Partner NON riceve worker_id, nome, email, PIB o altri dati
6. Worker vede l'evento verificato nella propria timeline My KORA (Track A)

**Minimum data disclosure al partner:**
- Token (già in suo possesso da scan)
- Conferma evento (sì/no)
- Reference evento (per il partner stesso)

**Non riceve mai:**
- Identità worker
- Dati KORA worker
- Dati altri partner
- Dati aziendali

### v2 — Full Accreditation + L4 Impact

Partner con verifica L4 completa può generare eventi che alimentano il ciclo IU/PIB/Index secondo le regole canoniche (doc 10, stage 5-11). Richiede: Gate 3 chiuso + KCP accreditamento + audit trail completo + CTO review separato.

---

## 12. Two-Track Event Model

### Track A — Verified Partner Event

**Definizione:** Evento verificato da un partner accreditato KORA (KCP) tramite scan fisico o digitale del KORA Link.

**Caratteristiche:**
- Partner è accreditato e ha firmato data agreement
- Il consenso del worker al partner scan è separato e specifico
- L'evento genera un `PartnerScan` record
- In v2: può alimentare IU/PIB/Index secondo metodologia canonica
- In v1.1: solo registro — nessun effetto automatico su scoring
- Traccia: `event_nature = 'verified_partner'`

**Esempi:** presenza a sessione palestra convenzionata, check-in formazione certificata, partecipazione evento volontariato verificato

### Track B — Collective / KORA Space Signal

**Definizione:** Segnale di partecipazione collettiva o KORA Space — non verificato da partner esterno, autogestito da worker o company.

**Caratteristiche:**
- Partecipazione a iniziative collettive dell'azienda
- Sponsorship di collega
- Booking di un'opportunità welfare
- Traccia: `event_nature = 'collective_signal'`
- Contribuisce a KORA Contribution (companion indicator) — NON al KORA Index direttamente
- Non richiede verifica partner

**Esempi:** check-in a evento aziendale, booking palestra convenzionata senza verifica reale, partecipazione iniziativa collettiva interna

### Regola di separazione

```
Ogni evento ha esattamente una event_nature.
Un evento non può essere sia Track A che Track B.
Non è possibile sommare lo stesso evento in entrambe le tracce (no double counting).
```

**Implicazione per v1:** In v1, tutti gli eventi KORA Link sono Track B o quick_access — nessun evento Track A attivo (partner scan non implementato in v1).

---

## 13. Privacy Boundary

| Dato | Worker (self) | COMPANY_ADMIN | KORA_ADMIN | PARTNER_OPERATOR | Aggregato company | Note |
|------|:---:|:---:|:---:|:---:|:---:|------|
| Token (valore pubblico) | SÌ | NO | SÌ (lista) | SÌ (suo scan) | NO | Il token è opaco — non rivela identità |
| Worker identity (nome/email) | SÌ | SÌ (HR) | SÌ | **NO** | NO | Partner non riceve mai identità |
| token↔worker mapping | SÌ | **NO** | SÌ | **NO** | NO | L'associazione è worker-private |
| Tenant (azienda) | SÌ | SÌ | SÌ | **NO** | NO | Partner non conosce il tenant |
| Scan timestamp (individuale) | SÌ | **NO** | SÌ (audit) | Solo suo | NO | Company non vede scan individuali |
| Activation state (per token) | SÌ | Aggregato | SÌ | **NO** | SÌ (count) | Company vede count, non quale worker |
| Partner scan event | SÌ (propri) | **NO** | SÌ | Solo propri | **NO** | Nessuna vista cross-partner |
| Initiative participation | SÌ | Aggregato privacy-safe | SÌ | **NO** | SÌ (count≥10) | Soglia safe_aggregation_threshold |
| Consent record | SÌ | **NO** | SÌ (audit) | **NO** | **NO** | Gestito dal worker |
| Audit record | SÌ (propri) | **NO** | SÌ | **NO** | **NO** | Audit è admin-only |
| PIB contribution da Link | SÌ (propria) | **NO** | SÌ (metodologico) | **NO** | Aggregato | PIB mai employer-visible |
| KORA Index effect da Link | **NO** (individuale) | Aggregato Index | SÌ | **NO** | SÌ (Index) | KORA Index è company-level — mai worker-level |

---

## 14. Security / Threat Model

| Rischio | Descrizione | Mitigazione v1 | Mitigazione futura |
|---------|-------------|---------------|-------------------|
| Token guessing | Attaccante tenta di indovinare token validi | Token 32-64 char random; risposta 404 identica per missing/revoked (no oracle) | Rate limiting su `/link/[token]` (H-009) |
| Token sharing | Worker condivide chip/token con colleghi | Chip personale; un solo assignment per token; secondo tentativo = "già attivato" | Audit anomaly detection |
| Lost chip | Chip smarrito | Revoca self-service o via company; replacement rapido | Alert proattivo se scan da location inattesa |
| Stolen chip | Chip rubato con scansione malevola | Revoca immediata; window di abuso = tempo tra furto e revoca | Revoca automatica post-offboarding |
| Malicious scan | Scan non autorizzato del chip (reader vicino fisicamente) | Token è pubblico ma inutile senza login worker; non bypass auth | NFC encryption level (hardware decision) |
| Partner misuse | Partner scansiona token senza consenso worker | Consent check server-side prima di ogni scan; partner non ottiene PII | Partner audit trail; accreditamento revocabile |
| Company misuse | Company tenta di correlare token ad identità | token↔worker mapping non è mai restituito a company-role endpoint | RLS + endpoint design; audit ogni accesso |
| Re-identification | Incrociare scan timestamp + location per identificare worker | Scan timestamp non forniti a company; location non raccolta | k-anonymity review pre-v1.1 |
| Replay | Riuso di scan event registrato | Scan events sono idempotenti per partner_id+event_ref+date | Nonce per scan events (v1.1) |
| CSRF / Open redirect | Redirect malevolo post-scan | `/link/[token]` redirect solo a dominio KORA; no open redirect | CSP headers; redirect allowlist |
| Public route abuse | DoS o scan massivo sulla route pubblica | Zod format check pre-DB (H-008); 404 uniforme | Rate limiting infrastruttura (H-009, CTO decision) |
| Rate limiting missing | Nessun rate limiting in v1 | Documentato; accettato per v1 (demo-grade) | Upstash/Redis rate limiter (H-003, H-009) |
| Logs leaking token | Token scritto in chiaro nei log | Token mai loggato in chiaro; log usano token_id (UUID interno) se necessario | Log sanitization review |

---

## 15. Audit Model

### Audit events obbligatori

| Evento | Trigger | Dati nel record |
|--------|---------|----------------|
| `BATCH_CREATED` | Admin crea batch | batch_id, tenant_id, quantity, admin_id_hash, timestamp |
| `BATCH_DELIVERED` | Batch associato a tenant | batch_id, tenant_id, timestamp |
| `TOKEN_ASSIGNED_TO_CHIP` | Token legato a chip fisico | token_id, chip_ref, batch_id, timestamp |
| `ACTIVATION_ATTEMPTED` | Worker tenta attivazione | token_id, timestamp, result (ok/failed/already_active) |
| `ACTIVATION_COMPLETED` | Worker completa attivazione con consenso | token_id, worker_id_hash, consent_version, timestamp |
| `CONSENT_ACCEPTED` | Worker accetta informativa Link | consent_id, consent_version, worker_id_hash, timestamp |
| `CONSENT_WITHDRAWN` | Worker revoca consenso | consent_id, worker_id_hash, timestamp |
| `SCAN_RECEIVED` | Partner o sistema riceve scan | token_id, partner_id (se Track A), event_type, timestamp |
| `PARTNER_EVENT_VALIDATED` | Scan partner validato | token_id, partner_id, event_ref, timestamp, result |
| `TOKEN_REVOKED` | Token revocato (qualsiasi motivo) | token_id, revoked_by_role, reason, timestamp, replacement_token_id? |
| `TOKEN_REPLACED` | Replacement completato | old_token_id, new_token_id, reason, timestamp |
| `BREAK_GLASS_ACCESS` | Accesso admin straordinario all'associazione | admin_id_hash, justification, timestamp, approver |
| `PARTNER_VALIDATION_FAILED` | Scan partner fallito (token non valido, no consenso) | token_id, partner_id, failure_reason, timestamp |

### Invarianti audit

- Audit log è **append-only** — nessun record modificabile
- `actor_id` sempre hashato (mai cleartext) nell'audit record
- Token value mai presente in audit log (solo token_id UUID interno)
- PII worker mai presente in audit (solo worker_id_hash se necessario)
- Retention: da concordare con DPO (Gate 3)

---

## 16. Feature Flag

### `KORA_LINK_ENABLED`

```typescript
// Lettura dal feature flag (pseudocodice — implementazione in KL-05)
const koraLinkEnabled = process.env.KORA_LINK_ENABLED === 'true';
```

### Regole

| Regola | Dettaglio |
|--------|-----------|
| Default | `false` (off) — nessuna route attiva, nessuna UI visibile |
| Effetto su route | `/link/[token]` restituisce `404` se flag off |
| Effetto su UI | Sidebar/nav KORA Link nascosti se flag off |
| Effetto su KORA Index | Nessun effetto — Link non alimenta Index se flag off |
| Effetto su worker workspace | Sezione KORA Link in My KORA nascosta se flag off |
| Produzione | **Non attivare senza Gate 2 + Gate 3 chiusi** |
| Staging demo | Può essere attivato in staging per test con dati sintetici |
| Audit | Ogni cambio del flag documentato nel KORA_LINK_CHANGELOG.md |

---

## 17. V1 Scope

Cosa entra in KORA Link v1:

| Componente | Status v1 |
|-----------|----------|
| Design doc (questo documento) | ✅ KL-01 |
| Feature flag `KORA_LINK_ENABLED` | KL-05 (post Gate 2) |
| Token model e generazione random | KL-02/KL-03 |
| Route pubblica `/link/[token]` design | KL-02 (threat model) |
| Route pubblica `/link/[token]` skeleton | KL-05 (post Gate 2) |
| Anonymous token opaco | KL-03 |
| Activation flow (design) | ✅ §8 questo doc |
| Activation flow (implementazione) | KL-06 (post Gate 2+3) |
| Admin batch conceptual model | ✅ §10 questo doc |
| Admin batch UI | KL-07 (post Gate 2) |
| Worker self-service association | KL-06 |
| Revoke/replace conceptual model | ✅ §4.9/4.10 questo doc |
| Revoke/replace implementazione | KL-06 |
| Audit conceptual model | ✅ §15 questo doc |
| Audit implementazione | KL-03 (schema) + KL-06 (runtime) |
| Consent record | KL-06 |

---

## 18. Explicitly Out of Scope for V1

| Fuori scope | Motivazione |
|-------------|------------|
| BTC / wallet / transazioni crypto | Nessun modello finanziario in KORA Link v1 |
| Payment / checkout | Escluso da Foundation Light (doc 22A §7) |
| MiCA / KYC / AML | Nessuna operazione finanziaria regolamentata |
| Health data individuale da scan | Chip non raccoglie dati biometrici o sanitari |
| Medical data | Mai in scope KORA Link |
| Scoring automatico da scan | In v1, scan non alimenta automaticamente IU/PIB |
| Partner accreditation full | v1.1 pilot controllato; v2 per full KCP |
| Advisor audit workflow full | Futura integrazione Gate 2+ |
| Public marketplace | Escluso da Foundation Light |
| Wearable / IoT sensors | Futura roadmap KORA Certified |
| Employer individual monitoring | **Mai in scope** — contrario alla product doctrine §2 |
| Worker ranking da KORA Link | **Mai in scope** — contrario alla product doctrine §2 |
| `gov.kip_records` | **Esplicitamente escluso per sempre** (CLAUDE.md) |
| Real HRIS integrazione | Gate 3 |
| Automatic guardrail tax enforcement | Gate 5 |

---

## 19. Future Migrations Plan

Nota: nessun SQL in questo documento. Le seguenti sono specifiche concettuali per le migration draft che saranno scritte in KL-03 e KL-04.

### `034_kora_link_schema.sql` (KL-03)

**Schema:** `kora_link` (nuovo schema isolato) o `personal.kora_link_*` (se integrato)

**Tabelle da definire:**

| Tabella | Scopo | Note |
|---------|-------|------|
| `kora_link.batch` | Link batch admin | Schema `kora_link` isolato |
| `kora_link.token` | Public token + lifecycle | Token hash se adottato; NOT NULL unique su hash |
| `kora_link.chip` | Chip fisico reference | FK su batch + token |
| `kora_link.assignment` | token↔worker mapping | FK su token + worker_identity; mai employer-visible per RLS |
| `kora_link.activation_event` | Record attivazione | Append-only |
| `kora_link.revocation` | Record revoca | Append-only |
| `kora_link.replacement` | Record replacement | FK su old_token + new_token |
| `kora_link.consent_record` | Consenso worker | FK su worker_identity + version |
| `kora_link.link_event` | Evento generico (scan, access, initiative) | event_nature enum |
| `kora_link.partner_scan` | Scan partner verificato | FK su token + partner |
| `audit.kora_link_audit` | Audit trail (estensione schema audit esistente) | Append-only; actor_id_hash |

**Enum da definire:**
- `kora_link.token_status`: `unassigned`, `assigned_to_chip`, `active`, `revoked`, `expired`
- `kora_link.revocation_reason`: `lost`, `stolen`, `voluntary`, `worker_offboarded`, `admin_override`
- `kora_link.event_nature`: `quick_access`, `initiative_check_in`, `verified_partner_scan`
- `kora_link.audit_event_type`: tutti gli eventi in §15

**Indici:**
- `token.token_hash` — UNIQUE (primary lookup path)
- `token.status` — per query batch admin
- `assignment.worker_id` — per worker self-service
- `assignment.token_id` — FK lookup
- `link_event.worker_id + timestamp` — timeline worker
- `partner_scan.partner_id + event_ref + date` — idempotency

**Vincoli:**
- `assignment (token_id)` UNIQUE — un token ha al massimo un worker associato
- `consent_record (worker_id, token_id)` UNIQUE — un consenso per coppia worker+token
- Tutte le FK con `ON DELETE RESTRICT` per integrità audit

### `035_kora_link_rls.sql` (KL-04)

**Principi RLS da rispettare:**

| Policy | Regola |
|--------|--------|
| `kora_link.assignment` SELECT | Solo `kora.role() = 'KORA_ADMIN'` O `worker_id = kora.worker_id()` |
| `kora_link.assignment` INSERT | Solo sistema (`SECURITY DEFINER` function per activation) |
| `kora_link.token` SELECT (admin) | Solo KORA_ADMIN — full visibility |
| `kora_link.token` SELECT (public route) | Via `SECURITY DEFINER` function — solo status lookup, no worker_id leak |
| `kora_link.link_event` SELECT | Worker self (`worker_id = kora.worker_id()`) + KORA_ADMIN |
| `kora_link.partner_scan` SELECT | Partner vede solo propri scan (`partner_id = kora.partner_id()`) |
| `kora_link.consent_record` SELECT | Worker self + KORA_ADMIN |
| `kora_link.batch` SELECT | Solo KORA_ADMIN |
| `audit.kora_link_audit` SELECT | Solo KORA_ADMIN |
| Tenant boundary | `tenant_id = kora.tenant_id()` su tutte le tabelle con tenant scope |

**SECURITY DEFINER:**
- `fn_kora_link_activate(token_hash, worker_id, consent_version)` — esegue associazione in un'unica transazione con validazioni
- `fn_kora_link_revoke(token_id, reason, actor_role)` — revoca con audit
- `fn_kora_link_public_status(token_hash)` — lookup stato pubblico senza esporre worker_id

**Company aggregate view:**
- View materializzata o function `v_kora_link_batch_stats(tenant_id)` — restituisce solo counts, mai mapping individuale
- RLS su view: solo COMPANY_ADMIN del tenant corrispondente

---

## 20. Open Questions

Queste domande devono essere risolte prima che KL-02 possa iniziare. Alcune richiedono decisione CTO, altre DPO, alcune entrambi.

| # | Domanda | Owner | Impatto |
|---|---------|-------|---------|
| OQ-01 | **URL dominio finale per chip NFC** — `app.kora.ai/link/...` o dominio dedicato `link.kora.ai/...`? | CTO / Founder | Produzione chip + DNS + CSP |
| OQ-02 | **Token hashing** — store token cleartext (con indice hashed) o solo hash? | CTO | Schema design (KL-03), debug workflow |
| OQ-03 | **TTL token** — token con scadenza (es. 2 anni) o indeterminato? | CTO / DPO | Lifecycle, replacement workflow |
| OQ-04 | **Activation requires company pre-assignment** — il worker può attivare qualsiasi token, o solo token pre-assegnati all'azienda del worker? | Product / CTO | Activation flow §8 |
| OQ-05 | **Chi consegna fisicamente il chip** — KORA consegna chip a company, o direttamente al worker? Processo tracciabile? | Ops / Legal | Audit delivery, responsabilità |
| OQ-06 | **Partner pilot v1.1** — c'è un partner pilota già identificato? Quando? | Founder / Sales | Scope v1.1 timeline |
| OQ-07 | **Livello di audit** — audit completo (ogni scan) o solo eventi lifecycle (activation, revocation)? | DPO / CTO | Schema audit size, GDPR minimizzazione |
| OQ-08 | **Rate limiting provider** — Upstash Redis, Vercel Edge, altro? | CTO | H-003/H-009 prerequisito |
| OQ-09 | **Informativa privacy KORA Link** — testo da validare DPO; versioning? | DPO / Legal | Gate 3 |
| OQ-10 | **DPA / customer terms KORA Link** — separati da DPA KORA generale o estensione? | Legal | Gate 3 |
| OQ-11 | **Staging test accounts** — chi gestisce i test account worker/company su staging per testare activation flow? | CTO / Ops | KL-08 prerequisito |
| OQ-12 | **Schema isolation** — `kora_link.*` schema dedicato o tabelle in `personal.*` / `analytics.*`? | CTO | KL-03 design |
| OQ-13 | **Consent versioning** — sistema di versioning informativa consent + migrazione utenti su nuova versione? | DPO | Gestione GDPR |
| OQ-14 | **Physical chip spec** — NFC tipo 2 o tipo 4? Produttore? URL max length? | Ops | Chip production |
| OQ-15 | **Break-glass policy formale** — chi può autorizzare break-glass? Processo documentale? | CTO / DPO / Founder | Security governance |

---

## 21. Implementation Gates

Il seguente piano di gate è sequenziale e obbligatorio. Nessun gate può iniziare prima che il precedente sia completato.

### Gate KL-01 — Design ✅ COMPLETATO
**Questo documento.** Design tecnico-funzionale KORA Link v1.
**Prerequisiti:** Nessuno
**Output:** `docs/KORA_LINK_V1_DESIGN.md`
**Decisione richiesta:** Founder/CTO review e approvazione design

### Gate KL-02 — Route Threat Model + Schema Draft
**Contenuto:** Threat model dettagliato per route pubblica `/link/[token]`; schema concettuale tabelle; risoluzione OQ-01/OQ-02/OQ-03/OQ-12
**Prerequisiti:** KL-01 approvato; OQ-01/OQ-02/OQ-03 risolti; Gate 2 parzialmente aperto
**Output:** `docs/KORA_LINK_THREAT_MODEL.md` + schema draft
**Gate blocker:** Gate 2 (CTO review)

### Gate KL-03 — Migration 034 Draft
**Contenuto:** `supabase/migrations/034_kora_link_schema.sql` — solo draft, non applicata
**Prerequisiti:** KL-02 approvato; schema definitivo; Gate 2 chiuso
**Output:** Migration file (revisione CTO obbligatoria prima di apply)
**Gate blocker:** Gate 2

### Gate KL-04 — RLS 035 Draft
**Contenuto:** `supabase/migrations/035_kora_link_rls.sql` — solo draft, non applicata
**Prerequisiti:** KL-03 approvato; policy privacy approvata DPO
**Output:** Migration file RLS
**Gate blocker:** Gate 2 + Gate 3

### Gate KL-05 — Public Route Skeleton + Feature Flag
**Contenuto:** Route `/app/link/[token]/page.tsx` o `/app/api/link/[token]/route.ts` dietro `KORA_LINK_ENABLED` flag; struttura UI attivazione scheletrica; Zod su param token
**Prerequisiti:** KL-04 approvato; feature flag infrastruttura; Gate 2 chiuso
**Blocchi runtime:** Nessun dato reale; nessuna migration applicata in staging

### Gate KL-06 — Worker Activation UI + Self-Service
**Contenuto:** Activation flow completo; consent screen; My KORA sezione KORA Link; revoca self-service
**Prerequisiti:** KL-05; migration 034/035 applicate in staging; account test worker staging; Gate 3 parzialmente chiuso (consenso wording approvato DPO)

### Gate KL-07 — Admin Batch UI
**Contenuto:** Pannello admin generazione batch; stato link per tenant; revoca admin; replacement
**Prerequisiti:** KL-06; migration in staging

### Gate KL-08 — Staging Test Only
**Contenuto:** Test end-to-end su staging con dati sintetici; smoke test Playwright autenticati per activation flow; nessun dato reale
**Prerequisiti:** KL-07; account test staging pronti (OQ-11)

### Gate KL-09 — CTO / Security Review
**Contenuto:** Review completa da CTO + eventuale pen test su route pubblica; RLS verification; privacy review DPO; sign-off formale
**Prerequisiti:** KL-08 completato; tutti gli OQ risolti; Gate 3 chiuso
**Output:** Approvazione scritta prima di qualsiasi accensione in produzione

---

*KORA_LINK_V1_DESIGN.md — KL-01 · 2026-06-30 · Branch `feat/kora-link-v1`*
*Versione: v1.0-design-only*
*Prossimo gate: KL-02 — Route Threat Model + Schema Draft*
