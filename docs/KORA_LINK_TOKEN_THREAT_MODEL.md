# KORA Link — Token Threat Model

**Branch:** `feat/kora-link-v1-platform`
**Status:** Design only — nessun codice runtime, nessuna migration
**Data:** 2026-06-30
**Dipende da:** `docs/KORA_LINK_V1_DESIGN.md`, `docs/KORA_LINK_KL02_DECISION_GATE.md`
**Pubblico:** CTO, DPO, security reviewer

---

## 1. Executive Summary

Il chip NFC KORA Link contiene esclusivamente un URL del tipo `https://app.kora.ai/link/<token>` dove `<token>` è una stringa random opaca, non sequenziale, non interpretabile. Il token non contiene PII, non identifica il worker, non identifica il tenant, non è decodificabile in alcuna informazione personale o organizzativa.

Il token **non deve mai essere salvato in chiaro** nel database. Il digest deve essere calcolato come `HMAC-SHA256(token, KORA_LINK_TOKEN_SECRET)` con un secret server-side dedicato, mai nel DB. Il lookup avviene solo per digest. Il token cleartext non entra nel DB, non entra nei log, non entra in messaggi di errore.

La route pubblica `/link/[token]` deve rispondere con risposte indistinguibili per token mancante, revocato, scaduto e malformato (tutti `404`), prevenendo qualsiasi timing oracle o informazione sul lifecycle del token.

Rate limiting e logging policy sono **requisiti bloccanti prima del runtime**: nessuna route pubblica che accetta token arbitrari da internet può andare in produzione senza rate limiting. La mancanza di rate limiting espone a enumerazione di token, denial of service e amplification attacks.

Il token da solo non è sufficiente per nulla: non autentica il worker, non bypassa il login, non garantisce accesso a dati KORA. È una chiave fisica che instrada verso un login standard — il sistema di sicurezza reale è il layer di autenticazione e consenso post-scan.

---

## 2. Token Asset Definition

### Cosa è il public token

- Stringa random generata via CSPRNG, non sequenziale
- Identifica un chip fisico NFC (relazione 1:1 chip↔token)
- Instrada verso la route pubblica KORA Link
- Portatore di un URL pubblico — non un segreto crittografico in sé

### Cosa NON è

- Non è un access token, JWT, API key, o session token
- Non contiene PII (nome, email, worker_id, tenant_id)
- Non identifica il worker (l'associazione è server-side, privata)
- Non identifica il tenant (il batch↔tenant è server-side, non nel token)
- Non è reversibile in informazioni personali o organizzative
- Non è sufficiente da solo per autenticare nessuno

### Cosa abilita il token (dopo login + consenso worker)

- Associazione server-side tra chip fisico e account worker (una volta sola)
- Accesso rapido a My KORA workspace per il worker titolare (quick access)
- Check-in a iniziative collettive (Track B, v1)
- Futura: conferma presenza a partner event verificati (Track A, v1.1+)

### Cosa NON abilita il token

- Non bypassa l'autenticazione — il worker deve fare login
- Non bypassa il consenso privacy — il worker deve accettare esplicitamente
- Non permette accesso a dati di altri worker
- Non permette a employer di vedere eventi individuali
- Non permette a partner di vedere identità worker

### Perché non è identità

Il token è associato a un chip fisico, non a una persona. Prima dell'attivazione, nessuna persona è collegata al token. Dopo l'attivazione, l'associazione è privata server-side: il token stesso non rivela chi sia il titolare a chiunque lo legga fisicamente o lo scansioni.

### Perché non è credenziale sufficiente senza login e consenso

Senza login, il token è solo un URL pubblico. Senza consenso esplicito, nessuna associazione viene creata. Il sistema richiede tre condizioni simultanee per creare un Link Assignment: (1) token valido e non revocato, (2) worker autenticato con sessione attiva, (3) worker ha accettato l'informativa KORA Link. Qualsiasi condizione mancante interrompe il flusso senza side effect.

---

## 3. Token Generation

### CSPRNG

Utilizzare esclusivamente `crypto.getRandomValues()` (Web Crypto API, disponibile in Node 18+ e Edge Runtime) o `crypto.randomBytes()` (Node.js legacy). Non usare `Math.random()`, `Date.now()`, UUID v1/v3/v5 (basati su clock o namespace), o qualsiasi altra fonte non crittograficamente sicura.

**Implementazione raccomandata (pseudocodice, non codice runtime):**
```
rawToken = base62_encode(crypto.randomBytes(36))  // ~48 char output
```

### Lunghezza token

**Raccomandazione: 48 caratteri base62.**

Calcolo entropia: base62^48 ≈ 2^285. Con 1 miliardo di token attivi, la probabilità di collisione per un singolo tentativo è ~2^285 / 10^9 ≈ impossibile in pratica. Abbondantemente sopra i 128 bit di sicurezza convenzionale.

URL completo risultante: `https://app.kora.ai/link/<48char>` = ~76 caratteri — ben dentro i limiti NFC tipo 4 (max ~2000 byte NDEF) e tipo 2 (max ~137 byte NDEF URL record). Compatibile con QR code standard.

### Charset

**Base62: `[A-Za-z0-9]`** — 62 simboli.

Motivazione:
- URL-safe senza encoding (`%XX`) necessario
- Case-sensitive ma senza caratteri ambigui (`0`, `O`, `I`, `l` — tutti presenti in base62 ma disambiguati dalla lunghezza)
- Riducibile a base58 se si vogliono eliminare ambiguità visive (`0OIl`) — non necessario per URL digitali
- Non richiede escape né percent-encoding nel path URL

### Entropia minima

Minimo 128 bit di entropia effettiva. Con 48 char base62: ~285 bit. Margine confortevole.

### Collision handling

Con entropia ~285 bit, le collisioni sono teoricamente impossibili per qualsiasi volume realistico (miliardi di token). Tuttavia, lo schema deve includere un vincolo `UNIQUE(token_digest)` nel DB con retry in caso di violazione (probabilità astronomicamente bassa, ma il codice non deve crashare).

**Pattern raccomandato:**
```
genera token → calcola digest → INSERT con ON CONFLICT DO NOTHING → riprova se 0 righe inserite
```

### Uniqueness

Il digest è `UNIQUE` nel DB. Non esiste collisione di digest senza collisione del token grezzo (preimage resistance di HMAC-SHA256).

### Rotazione

Un token può essere ruotato: si genera un nuovo token raw, si calcola il nuovo digest, si crea un Replacement record (`old_token_id → new_token_id`), il vecchio token viene marcato `revoked`, il nuovo token eredita l'assignment worker (se il vecchio era attivo). Il chip fisico associato al vecchio token diventa inerte — è necessario un nuovo chip fisico con il nuovo URL.

### Token versioning

Includere un prefisso di versione nel formato token per permettere future migrazioni di hashing senza invalidare tutti i token esistenti:

**Formato raccomandato:** `kl1_<47-char-base62>` — prefisso fisso `kl1_` (versione 1, KORA Link).

La lunghezza totale diventa ~52 caratteri — ancora ben dentro i limiti NFC. Il prefisso permette alla route di riconoscere immediatamente la versione prima di qualsiasi operazione crittografica.

---

## 4. Token Storage Strategy

### Opzione A — Token cleartext nel DB

**Pro:** Lookup diretto O(1), debug semplice, no crypto.
**Contro:** Se il DB è compromesso, tutti i token attivi sono immediatamente utilizzabili. Se un log è compromesso e il token è stato scritto per errore, stessa cosa.
**Rischio leak DB:** CRITICO — token direttamente utilizzabili.
**Rischio leak log:** ALTO se qualcuno loga erroneamente il token.
**Lookup performance:** O(1) con indice su token.
**Implementabilità in Node/Next:** Triviale.
**Raccomandazione:** **ESCLUSA.** Il guadagno in semplicità non giustifica l'esposizione totale in caso di DB leak.

### Opzione B — Hash semplice con salt fisso (SHA-256 + salt)

**Pro:** DB leak non espone token; salt riduce rainbow table attack.
**Contro:** Il salt è un segreto aggiuntivo ma non è HMAC — non autentica il server come produttore del digest. Un attaccante con salt potrebbe pre-computare digest da wordlist se il token space fosse piccolo (non è il caso con 285 bit, ma il pattern è difensivamente debole).
**Rischio leak DB:** BASSO — digest non reversibile senza salt.
**Rischio leak log:** BASSO se salt è protetto.
**Lookup performance:** O(1) con `UNIQUE(token_hash)`.
**Implementabilità in Node/Next:** `crypto.createHash('sha256').update(salt + token).digest('hex')` — semplicissimo.
**Raccomandazione:** Sufficiente per entropia alta come la nostra, ma HMAC-SHA256 è preferibile per difendibilità e semantica corretta.

### Opzione C — HMAC-SHA256 con secret server-side (raccomandato)

**Pro:** Semanticamente corretto — il digest certifica che il server ha prodotto il token. Il secret non è nel DB. Anche con DB dump + secret leak in due eventi separati, la finestra di attacco è limitata. Algoritmo standard, ampiamente supportato, dimostrabile a CTO/security auditor. `crypto.createHmac` disponibile nativamente in Node senza dipendenze.
**Contro:** Richiede gestione di un secret (`KORA_LINK_TOKEN_SECRET`) come env var. Rotazione del secret invalida tutti i digest esistenti (richiede migration o dual-secret period). Complessità marginalmente superiore a opzione B.
**Rischio leak DB:** BASSO — digest non reversibile senza secret.
**Rischio leak log:** BASSO se token cleartext non loggato (policy §10).
**Lookup performance:** O(1) con `UNIQUE(token_digest)` su indice BTREE.
**Implementabilità in Node/Next:** `crypto.createHmac('sha256', process.env.KORA_LINK_TOKEN_SECRET).update(token).digest('hex')` — due righe.
**Raccomandazione:** **SCELTA RACCOMANDATA.** Standard de-facto, nativo Node, difendibile, performance identica a opzione B.

### Opzione D — BLAKE2b keyed hash

**Pro:** Più veloce di SHA-256 su hardware moderno; keyed mode equivalente a HMAC.
**Contro:** Non nativo in Node senza dipendenza (`@noble/hashes` o `blake2` npm package). Introduce una dipendenza aggiuntiva per un beneficio minimo (la velocità non è il collo di bottiglia per N token attivi < 1 milione). Meno familiare a security auditor generalisti. HMAC-SHA256 è già ampiamente auditato e standardizzato (RFC 2104).
**Rischio leak DB:** Identico a HMAC-SHA256.
**Lookup performance:** O(1), marginalmente più veloce (irrilevante).
**Implementabilità in Node/Next:** Richiede dipendenza npm esterna.
**Raccomandazione:** **NON raccomandata per v1.** Il vantaggio tecnico è reale ma irrilevante nella pratica. HMAC-SHA256 è più semplice, nativo, e meglio difendibile. BLAKE2b keyed hash può essere considerato in v2 se emerge un requisito di performance.

---

## 5. Recommended Token Storage Decision

### Decisione finale: HMAC-SHA256 con `KORA_LINK_TOKEN_SECRET`

**Schema di calcolo:**
```
token_digest = HMAC-SHA256(token_value, KORA_LINK_TOKEN_SECRET)
               → hex string 64 char
```

**Invarianti:**
- `token_value` (cleartext) generato una sola volta via CSPRNG
- `token_value` scritto sul chip NFC / nel QR una sola volta al momento della produzione
- `token_value` non è mai salvato nel DB
- `token_value` non è mai scritto nei log applicativi
- `token_value` non è mai incluso in messaggi di errore, audit body, o response body
- `token_digest` è il solo valore persistito nel DB
- `UNIQUE(token_digest)` enforced a livello DB
- Lookup: `SELECT * FROM kora_link.token WHERE token_digest = $computed_digest`

**Cosa serve come env var futura:**

`KORA_LINK_TOKEN_SECRET`
- Tipo: stringa random sicura, minimo 256 bit (32 byte → 64 char hex o 44 char base64)
- Generazione: `openssl rand -hex 32` o equivalente
- Deve essere separato tra staging e produzione
- Non deve mai essere nel codice sorgente, nei log, o nel DB
- Deve essere ruotato con procedura documentata (doppio digest period)
- Deve essere un Vercel Environment Variable di tipo "Secret" (non "Plain Text")
- Non deve mai essere esposto a client-side (solo server-side / Edge Runtime)

**Rotazione del secret:** in caso di rotazione di `KORA_LINK_TOKEN_SECRET`, tutti i digest esistenti devono essere ricalcolati in una migration controllata con il vecchio secret, oppure si adotta un "dual-secret period" in cui il sistema accetta digest calcolati con entrambi i secret durante la transizione. La rotazione è un evento raro e documentato, non operativo routinario.

---

## 6. Token Lifecycle

### Stati

| Stato | Descrizione |
|-------|-------------|
| `generated` | Token creato nel batch admin; digest in DB; chip non ancora prodotto |
| `assigned_to_tenant` | Batch consegnato a tenant; chip in produzione o in transito |
| `delivered` | Chip fisicamente consegnato al worker (opzionale — solo se registrato) |
| `activation_pending` | Worker ha scansionato, è nel flow di onboarding, non ha ancora completato il consenso |
| `active` | Worker ha completato attivazione e consenso; LinkAssignment creato |
| `suspended` | Token temporaneamente disabilitato da admin (es. indagine) — stato reversibile |
| `revoked` | Token definitivamente invalidato (perdita, furto, offboarding, abuso) — irreversibile |
| `replaced` | Token sostituito da un nuovo token; record storico mantenuto |
| `expired` | TTL pre-attivazione scaduto; chip fisicamente inerte |
| `orphaned` | Token assegnato a tenant poi eliminato/disabilitato; nessun worker può attivarlo |

### Transizioni per stato

| Stato | Chi può transizionare | Worker vede | Company vede | KORA Admin vede | Partner vede | Audit |
|-------|-----------------------|-------------|--------------|-----------------|--------------|-------|
| `generated` | KORA_ADMIN | Nulla | Nulla | SÌ — batch list | Nulla | `BATCH_CREATED` |
| `assigned_to_tenant` | KORA_ADMIN (batch delivery) | Nulla | Conteggio batch | SÌ | Nulla | `BATCH_DELIVERED` |
| `delivered` | KORA_ADMIN o COMPANY_ADMIN (opz.) | Nulla | Conteggio (agg.) | SÌ | Nulla | `CHIP_DELIVERED` (opz.) |
| `activation_pending` | Sistema (scan + login) | Flow attivazione | Nulla | SÌ | Nulla | `ACTIVATION_ATTEMPTED` |
| `active` | Sistema (post-consenso) | My KORA Link section | Conteggio attivi | SÌ + mapping | Nulla | `ACTIVATION_COMPLETED` |
| `suspended` | KORA_ADMIN | "Link temporaneamente non disponibile" | Nulla | SÌ | Nulla | `TOKEN_SUSPENDED` |
| `revoked` | Worker / COMPANY_ADMIN / KORA_ADMIN | "Link non attivo" | Conteggio revocati | SÌ | Nulla | `TOKEN_REVOKED` |
| `replaced` | KORA_ADMIN | "Link sostituito" → nuovo link | Conteggio (agg.) | SÌ | Nulla | `TOKEN_REPLACED` |
| `expired` | Sistema (cron/trigger pre-TTL) | "Link scaduto" | Conteggio scaduti | SÌ | Nulla | `TOKEN_EXPIRED` |
| `orphaned` | Sistema (tenant deactivation) | N/A | N/A | SÌ | Nulla | `TOKEN_ORPHANED` |

**Invarianti di transizione:**
- Da `revoked` non si torna ad altri stati (solo `replaced` crea un nuovo token)
- Da `replaced` non si torna ad `active` (il vecchio token è morto)
- Da `expired` si può solo fare replacement (non re-attivazione)
- `suspended` → `active` solo con KORA_ADMIN esplicito + audit

---

## 7. TTL Policy

### Token non attivato

**TTL pre-attivazione: 180 giorni dall'emissione del batch.**

Un chip non attivato dopo 6 mesi è quasi certamente: non consegnato, smarrito, dimenticato, o assegnato a un worker che non ha più accesso. Il TTL riduce il numero di token "zombie" revocabili solo manualmente. La scadenza automatica è operativamente più sicura.

**Implementazione:** colonna `pre_activation_expires_at = created_at + INTERVAL '180 days'` sulla tabella `kora_link.token`. La route pubblica controlla questo campo prima di mostrare il flow di attivazione. Un token scaduto risponde con `404` identico a revocato (§8).

### Token attivato

**Nessun TTL post-attivazione in v1.**

Motivazione: forzare la scadenza di un chip fisico già attivato richiederebbe UX di rinnovo (notifica proattiva, replacement fisico, nuovo consenso) — fuori scope v1. Il token post-attivazione rimane valido finché non è revocato manualmente (offboarding, perdita, richiesta worker).

**Futuro (v2):** considerare TTL post-attivazione di 2 anni per ridurre superficie di attacco su chip fisici vecchi.

### Token sospeso

Un token sospeso non ha TTL intrinseco. La sospensione è uno stato temporaneo gestito da KORA_ADMIN con documentazione. La sospensione deve avere una `suspended_until` o deve essere esplicitamente revocata/riattivata.

### Token partner scan

In v1.1+, i `PartnerScan` events avranno un TTL implicito sull'evento stesso (l'evento è valido per una data specifica), ma il token usato per lo scan non cambia stato in base allo scan.

### Replacement

Un replacement genera un nuovo token con un nuovo TTL pre-attivazione (se il vecchio non era ancora attivato) oppure parte già come `active` (se il vecchio era attivo e il worker ha già fornito consenso, con re-consenso richiesto per il nuovo token).

---

## 8. Public Route Behavior `/link/[token]`

### Logica di routing per stato

| Condizione | Risposta | Audit |
|------------|----------|-------|
| `KORA_LINK_ENABLED = false` | `404` — identico a token non trovato | NO (pre-DB) |
| Token malformato (non regex base62, non prefisso `kl1_`, lunghezza errata) | `400` → redirect pagina errore generica o `404` uniforme | NO (pre-DB, Zod) |
| Token troppo corto (<48 char payload) o troppo lungo (>52 char totale) | `400` pre-DB | NO |
| Digest non trovato nel DB (token inesistente) | `404` uniforme | NO |
| Token trovato, stato `revoked` | `404` uniforme — identico a non trovato | SÌ (rate-limited) |
| Token trovato, stato `expired` | `404` uniforme | SÌ (rate-limited) |
| Token trovato, stato `suspended` | `404` uniforme | SÌ (rate-limited) |
| Token trovato, stato `replaced` | `404` uniforme (il chip vecchio è inerte) | SÌ |
| Token trovato, stato `generated`/`assigned_to_tenant`/`delivered` (non ancora attivabile) | `404` uniforme (non esporre che esiste) | SÌ (KORA_ADMIN) |
| Token trovato, stato `activation_pending` o `active` (non ancora attivato), TTL valido | Flow attivazione onboarding | SÌ |
| Token trovato, stato `active`, worker loggato + titolare | Redirect `/my-kora` (quick access) | SÌ |
| Token trovato, stato `active`, worker loggato + NON titolare | `403` — "Questo link appartiene a un altro account" | SÌ |
| Token trovato, stato `active`, worker non loggato | Redirect login con `?next=/link/<token>` | SÌ |
| Activation: consenso rifiutato | Nessun assignment creato; token resta `activation_pending`→ può ritentare | SÌ |
| Activation: consenso accettato | `POST /api/link/activate` → assignment + consenso record | SÌ |

### Regola centrale

```
Risposte identiche (404) per: token non trovato, revocato, scaduto, sospeso, sostituito.
Ragione: prevenire qualsiasi disclosure sul lifecycle del token a chi non è autorizzato.
```

### Redirect allowlist

Il redirect post-activation e post-login deve essere validato contro una allowlist statica:
- `/my-kora` e sottopercorsi
- `/link/[token]` stesso (per ritentare dopo login)

Nessun `?next=` con URL assoluto arbitrario. Open redirect è un vettore classico.

---

## 9. Uniform Error and Timing Policy

### 404 uniforme

Tutte le condizioni "token non usabile" devono restituire `404` con body identico:

```json
{ "error": "Link non trovato." }
```

Nessun campo aggiuntivo. Nessun `reason`, `status`, `code`. Il body identico previene differenziazione per contenuto.

### Timing oracle mitigation

Il tempo di risposta non deve variare tra "token non trovato nel DB" e "token trovato ma revocato". Entrambi fanno una query al DB (lookup per digest) — il timing è già allineato. Per "token malformato" (pre-DB), la risposta è più rapida — questo è accettabile perché la malformazione è rilevabile pubblicamente senza DB query, e non rivela informazioni sul lifecycle.

**Se si vuole timing uniforme assoluto:** aggiungere un delay fisso (`await new Promise(r => setTimeout(r, FIXED_DELAY_MS))`) per tutte le risposte 404, indipendentemente dal motivo. Raccomandato in produzione se si vogliono prevenire timing side-channel sofisticati.

### Messaggi pubblici ammessi

- `{ "error": "Link non trovato." }` — per 404
- `{ "error": "Link non valido." }` — per 400 malformato
- `{ "error": "Accesso non consentito." }` — per 403 (titolarità errata)
- `{ "error": "Servizio temporaneamente non disponibile." }` — per 500

### Cosa non mostrare mai

- Nome del tenant
- Email o ID del worker
- Stato interno del token (`revoked`, `expired`, ecc.)
- `token_digest` o hash
- Stack trace
- Messaggio di errore DB
- Ragione della revoca

### Errori interni

Errori 5xx devono essere loggati internamente con dettaglio completo, ma restituire solo il messaggio generico al client.

---

## 10. Logging Policy

### Non loggare mai

| Dato proibito | Motivazione |
|---------------|-------------|
| Token cleartext (`kl1_<...>`) | Chiunque legga il log può usare il chip |
| URL completo con token (`/link/kl1_...`) | Equivalente al token stesso |
| Token digest completo (64 char hex) | Anche il digest non deve essere in chiaro nei log — sufficiente audit_event_id |
| Worker identity in log public route | PII non necessaria nel log di una route pubblica |
| Tenant name in log o errori | Disclosure organizzativa |
| `partner_id` in log per eventi individuali | Minimalizzazione dati |
| IP address in chiaro (se non legalmente giustificato) | GDPR — richede DPO sign-off |

### Loggare in log applicativo (strutturato)

| Dato | Formato | Note |
|------|---------|------|
| `event_type` | enum stringa | `ACTIVATION_ATTEMPTED`, `TOKEN_LOOKUP_MISS`, ecc. |
| `result` | `ok` / `not_found` / `forbidden` / `error` | Categoria, non dettaglio |
| `token_version` | `kl1` | Solo prefisso versione |
| `token_digest_prefix` | primi 8 char del digest | Solo per correlazione audit — non reversibile |
| `request_id` | UUID per correlazione | Generato per ogni request |
| `rate_limit_bucket` | stringa hash dell'IP (non IP chiaro) | Se ammesso da DPO |
| `timestamp` | ISO 8601 UTC | |
| `http_status` | intero | |
| `duration_ms` | intero | Per performance monitoring |

### Log audit (append-only, separato)

Il log audit (§15) usa `token_id` UUID interno — mai digest, mai cleartext. È separato dal log applicativo e ha una retention policy distinta da concordare con DPO.

### IP logging

L'IP address è dato personale sotto GDPR. Le opzioni sono:
- Non loggare IP (massima privacy, meno forensics)
- Loggare hash dell'IP (con salt rotante) — pseudonimizzazione
- Loggare IP con retention breve (es. 24h) e DPO sign-off

**Richiede DPO/legal:** qualsiasi logging di IP, anche hashato, richiede conferma DPO. In v1 staging, logare solo per debug con cancellazione automatica post-test.

---

## 11. Rate Limiting Requirement

### Endpoint e requisiti

| Endpoint | Tipo | Limite consigliato v1 | Blocca runtime | Blocca prod |
|----------|------|----------------------|:---:|:---:|
| `GET /link/[token]` (public) | Per-IP | 30 req/min per IP | **SÌ** | **SÌ** |
| `POST /api/link/activate` | Per-IP + per-session | 5 tentativi/10min per IP | **SÌ** | **SÌ** |
| `POST /api/link/revoke` (worker self) | Per-session | 10 req/ora | NO | SÌ |
| `POST /api/admin/kora-link/batch` | Admin only | 5 batch/ora per admin | NO | SÌ |
| `POST /api/partner/scan` (v1.1+) | Per-partner | 1000 scan/ora per partner | NO (v1.1) | SÌ (v1.1) |

### Perché è bloccante per la route pubblica

`GET /link/[token]` è accessibile a qualsiasi IP, senza autenticazione, prima di qualsiasi check. Senza rate limiting:
- Un attaccante può tentare di enumerare token (sebbene con 285 bit di entropia l'enumerazione sia inutile praticamente, il costo server è reale)
- Un attaccante può eseguire DoS sul DB con digest computation su ogni request
- Un attaccante può tentare replay massivo di URL raccolti

**Anche con entropia teoricamente sicura, il rate limiting è obbligatorio** perché protegge le risorse server (CPU per HMAC, DB connections, Next.js worker threads) da abuse non crittograficamente rilevante.

### Provider/implementation

Opzioni per Node/Next.js:

| Provider | Pro | Contro | Raccomandazione |
|----------|-----|--------|----------------|
| **Upstash Redis + @upstash/ratelimit** | Serverless-native, edge-compatible, atomic, semplice API | Costo aggiuntivo, dipendenza esterna | **Preferito** per produzione Vercel |
| Vercel Edge Rate Limiting | Integrato, zero-config | Configurazione limitata, meno granulare | Alternativa v1 semplice |
| In-memory Map (Node.js) | Zero dipendenze | Non funziona su serverless (stateless per request), non su multi-instance | **Solo per test locale** — non production |
| Middleware Vercel IP-based | Zero-config su Vercel | Solo per blocco IP statico, non sliding window | Complementare, non sostitutivo |

**Raccomandazione: Upstash Redis (`@upstash/ratelimit`)** — già ampiamente adottato nell'ecosistema Next.js, sliding window nativa, edge-compatible, configurabile per endpoint.

### Fallback per staging (v1)

In staging/demo: rate limiting opzionale o con limiti molto alti (1000 req/min). Il blocco per runtime si riferisce alla produzione. I test su staging devono però verificare che il meccanismo di rate limiting si attivi correttamente prima del go-live.

---

## 12. Replay and Abuse Handling

| Rischio | Descrizione | Mitigazione v1 | Mitigazione futura | Blocca codice | Blocca prod |
|---------|-------------|---------------|-------------------|:---:|:---:|
| Scansioni ripetute (stesso chip) | Worker scansiona più volte — normale uso quotidiano | Quick access idempotente; eventi Track B deduplicati per (worker, date, event_type) | Audit anomaly detection per scan frequency | NO | NO |
| Token sharing (worker condivide URL) | Worker condivide URL del chip con un collega | Assignment 1:1; secondo login vede "link già attivo"; tenant check | Alert se scan da device/location molto diversi | NO | NO |
| Screenshot QR | Worker fotografa QR e condivide immagine | Stessa mitigazione di token sharing; login richiesto | — | NO | NO |
| Lost chip | Chip smarrito in luogo pubblico | Revoca self-service in My KORA; replacement rapido | Alert proattivo se scan da geolocation anomala (opt-in) | NO | SÌ (processo) |
| Stolen chip | Chip rubato con intenzione | Revoca immediata; window abuso = tempo tra furto e segnalazione | NFC encryption level (hardware) | NO | SÌ (processo) |
| Brute force token | Tentativo di indovinare token validi | Entropia 285 bit — computazionalmente impossibile; rate limiting | — | **SÌ** (rate limit) | **SÌ** |
| Enumeration | Scan sistematico di token simili per trovare pattern | Token non sequenziale; 404 uniforme; rate limiting | | **SÌ** (rate limit) | **SÌ** |
| Malicious partner (v1.1+) | Partner scansiona token senza consenso worker, tenta estrazione PII | Consent check server-side; partner riceve solo conferma booleana, mai PII | Partner audit trail; accreditamento revocabile | NO (v1) | **SÌ** (v1.1) |
| Malicious employer | Company tenta di correlare token a identità worker | token↔worker mapping MAI ritornato a company endpoint; RLS | Audit ogni accesso company; anomaly detection | **SÌ** (RLS design) | **SÌ** |
| Malicious worker | Worker tenta di attivare token altrui | Tenant check: token batch deve corrispondere al tenant del worker loggato | — | NO | SÌ |
| Browser history leakage | URL con token nel browser history dell'utente | Token nel path (non in query param) — non migliore alternativa per NFC URL. Mitigazione: uso quick HTTPS, HSTS | Considerare token monouso per privacy estrema (v3) | NO | NO |
| CSRF su activation | Richiesta cross-origin forged per attivare un token | `POST /api/link/activate` deve verificare CSRF token o SameSite cookie; non solo GET-activatable | — | **SÌ** (CSRF) | **SÌ** |
| Replay di scan partner | Partner re-usa scan event loggato | Idempotency check: (partner_id, token_digest, event_ref, date) UNIQUE | Nonce su scan events (v1.1) | NO (v1) | **SÌ** (v1.1) |
| Timing oracle su lookup | Differenziare "non trovato" da "revocato" per timing | Query DB identica per entrambi i casi; optional: delay fisso | — | **SÌ** | **SÌ** |

---

## 13. Lost / Stolen / Replacement Process

### Segnalazione worker (chip perso)

1. Worker accede a My KORA → sezione KORA Link
2. Worker seleziona "Segnala chip perso/rubato"
3. Conferma azione (modale con disclaimer: il chip diventerà inattivo immediatamente)
4. `POST /api/link/revoke` con `reason: 'lost'`
5. Sistema: token → `revoked`; RevocationRecord creato; audit `TOKEN_REVOKED` (actor: worker_self)
6. Worker vede: "Il tuo KORA Link è stato disattivato. Richiedi un sostituto."
7. Replacement request: invia richiesta a KORA_ADMIN (via form o automatismo)

### Segnalazione company (chip perso di un dipendente)

1. COMPANY_ADMIN accede al pannello operativo KORA Link
2. Seleziona "Segnala link perso" (senza identificare quale worker)
3. Sistema: COMPANY_ADMIN non conosce quale token appartiene a quale worker — la segnalazione è una richiesta operativa a KORA_ADMIN
4. KORA_ADMIN identifica il token (via audit trail, senza esporre identità a company) e procede alla revoca
5. Company vede: conteggio link revocati aggiornato (aggregato)

### Revoca da KORA_ADMIN

1. KORA_ADMIN seleziona token nel pannello (per `token_id` interno, non cleartext)
2. Sceglie motivo da enum: `lost`, `stolen`, `voluntary`, `worker_offboarded`, `admin_override`
3. `admin_override` richiede campo `justification` non vuoto
4. Sistema: token → `revoked`; RevocationRecord creato; audit `TOKEN_REVOKED_ADMIN` con actor_id_hash + reason + justification
5. Se worker è attivo: notifica opzionale al worker (email o in-app) che il link è stato disattivato

### Replacement

1. Replacement token generato da KORA_ADMIN (stesso processo batch, quantità = 1)
2. ReplacementRecord creato: `old_token_id → new_token_id`
3. Se vecchio token era `active` (worker aveva già attivato): nuovo token nasce in stato `active` con stessa associazione worker (o richiede re-attivazione — decisione CTO/DPO)
4. Nuovo chip fisico prodotto e spedito
5. Worker riceve nuovo chip e non deve fare nulla se associazione migrata, oppure ri-attiva il nuovo chip

### Cosa succede al vecchio token

- Rimane nel DB in stato `revoked`
- `token_digest` rimane nel DB (integrità referenziale e audit)
- Il chip fisico è inerte — qualsiasi scan porta a `404`
- Gli eventi registrati sul vecchio token rimangono nell'audit trail
- Gli eventi Track B/Track A registrati prima della revoca rimangono validi (revoca non cancella storia)

### Cosa succede allo storico eventi

- Gli eventi (link_event, partner_scan) associati al vecchio token non vengono cancellati
- Sono accessibili al worker in My KORA (propri eventi storici)
- KORA_ADMIN può accedere all'audit trail
- L'azienda non vede mai i singoli eventi — vede solo aggregati

### Cosa vede l'azienda

- Conteggio link revocati (aggregato)
- Motivo aggregato (es. "3 link persi, 1 offboarding") — non per worker specifico

### Cosa NON vede l'azienda

- Quale worker ha avuto il chip revocato
- Il timestamp della revoca individuale
- Il motivo per worker specifico
- Gli eventi accumulati sul token prima della revoca

---

## 14. Partner Scan Future Constraints

Questi vincoli si applicano a partire da v1.1. Sono documentati ora per vincolare il design della migration 034.

### Vincoli di privacy

- Il partner riceve esclusivamente: token opaco (già in suo possesso) + conferma booleana evento + event_ref proprio. **Mai `worker_id`, nome, email, PIB, tenant.**
- Il consent del worker al partner scan è separato dal consent di attivazione. Un worker può attivare KORA Link senza acconsentire agli scan partner.
- Il consent partner scan è revocabile dal worker in modo indipendente.

### Vincoli di accreditamento

- Un partner può eseguire scan solo se il suo `accreditation_status = 'active'` al momento dello scan.
- L'accreditamento è revocabile da KORA_ADMIN senza preavviso in caso di abuso.
- Ogni accreditamento ha un `accreditation_scope` (tipo di evento verificabile).

### Vincoli metodologici

- Un evento Track A (partner verificato) non alimenta automaticamente IU/PIB/Index in v1.1 — richiede una policy esplicita e review metodologica (CTO + methodology team).
- In v1.1: solo registrazione degli eventi. L'effetto sul scoring è v2.
- No double counting: un evento ha esattamente una `event_nature`. Un evento verificato da partner non può essere anche un evento Track B per lo stesso giorno/stesso tipo.

### Vincoli audit

- Ogni scan partner genera un audit event `PARTNER_SCAN_RECEIVED` e `PARTNER_SCAN_VALIDATED` (o `PARTNER_SCAN_REJECTED`).
- I scan di partner diversi non sono visibili tra loro (cross-partner isolation).
- Il sistema non espone al partner la frequenza storica di scan dello stesso token.

---

## 15. Migration 034 Requirements

Requisiti per `034_kora_link_schema.sql` — senza SQL.

### Schema

Nuovo schema dedicato: `kora_link`

### Tabelle minime

| Tabella | Colonne chiave | Note |
|---------|---------------|------|
| `kora_link.batch` | `id UUID PK`, `tenant_id UUID FK`, `created_by UUID`, `quantity INT`, `status`, `created_at`, `notes` | Owner KORA_ADMIN |
| `kora_link.token` | `id UUID PK`, `batch_id UUID FK`, `token_digest CHAR(64) UNIQUE NOT NULL`, `token_version VARCHAR(10) NOT NULL DEFAULT 'kl1'`, `status token_status NOT NULL`, `pre_activation_expires_at TIMESTAMPTZ`, `created_at`, `activated_at`, `revoked_at`, `replaced_by UUID FK nullable` | Digest UNIQUE + indice; cleartext NEVER stored |
| `kora_link.assignment` | `id UUID PK`, `token_id UUID FK UNIQUE`, `worker_id UUID FK`, `tenant_id UUID FK`, `assigned_at TIMESTAMPTZ`, `consent_record_id UUID FK`, `status assignment_status` | UNIQUE(token_id) — 1:1 | 
| `kora_link.activation_event` | `id UUID PK`, `token_id UUID FK`, `worker_id UUID FK nullable`, `activated_at TIMESTAMPTZ`, `consent_version VARCHAR`, `activation_source activation_source_enum` | Append-only |
| `kora_link.consent_record` | `id UUID PK`, `worker_id UUID FK`, `token_id UUID FK`, `consent_type consent_type_enum`, `consent_version VARCHAR`, `accepted_at TIMESTAMPTZ`, `withdrawn_at TIMESTAMPTZ nullable` | UNIQUE(worker_id, token_id, consent_type) |
| `kora_link.link_event` | `id UUID PK`, `token_id UUID FK`, `worker_id UUID FK nullable`, `event_type link_event_type_enum`, `event_nature event_nature_enum`, `tenant_id UUID FK`, `occurred_at TIMESTAMPTZ`, `partner_id UUID nullable`, `context_ref UUID nullable` | Append-only; event_nature = Track A o B |
| `kora_link.revocation` | `id UUID PK`, `token_id UUID FK`, `revoked_by_role role_enum`, `actor_id_hash CHAR(64)`, `reason revocation_reason_enum`, `justification TEXT nullable`, `revoked_at TIMESTAMPTZ`, `replacement_token_id UUID nullable FK` | Append-only; actor_id hashato |
| `kora_link.replacement` | `id UUID PK`, `old_token_id UUID FK`, `new_token_id UUID FK`, `reason TEXT`, `replaced_at TIMESTAMPTZ`, `requested_by_role role_enum` | |
| `kora_link.partner_scan` | `id UUID PK`, `token_id UUID FK`, `partner_id UUID FK`, `event_ref VARCHAR`, `scan_timestamp TIMESTAMPTZ`, `validation_status scan_status_enum`, `scan_date DATE` | UNIQUE(partner_id, token_id, event_ref, scan_date) per idempotency |
| `kora_link.audit_log` | `id UUID PK`, `event_type audit_event_type_enum`, `actor_role role_enum`, `actor_id_hash CHAR(64)`, `resource_type VARCHAR`, `resource_id UUID`, `occurred_at TIMESTAMPTZ`, `result VARCHAR`, `metadata JSONB` | Append-only; INSERT only policy RLS |

### Enum minimi

- `token_status`: `generated, assigned_to_tenant, delivered, activation_pending, active, suspended, revoked, replaced, expired, orphaned`
- `revocation_reason`: `lost, stolen, voluntary, worker_offboarded, admin_override`
- `event_nature`: `quick_access, initiative_check_in, verified_partner_scan`
- `link_event_type`: `quick_access, partner_scan, initiative_check_in`
- `activation_source`: `nfc_scan, qr_code, manual_entry`
- `consent_type`: `kora_link_activation, partner_scan_event`
- `scan_status`: `validated, rejected`
- `audit_event_type`: (tutti i 13 eventi da §15 KL-01 + nuovi da questo doc)
- `assignment_status`: `active, revoked, replaced`

### Indici obbligatori

- `kora_link.token(token_digest)` — UNIQUE, usato per ogni lookup
- `kora_link.token(status)` — per query admin su batch
- `kora_link.token(batch_id)` — per gestione batch
- `kora_link.assignment(token_id)` — UNIQUE (enforced da constraint)
- `kora_link.assignment(worker_id)` — per worker self-service
- `kora_link.link_event(worker_id, occurred_at)` — per timeline worker
- `kora_link.partner_scan(partner_id, scan_date)` — per report partner
- `kora_link.audit_log(resource_id, occurred_at)` — per audit per token

### Vincoli critici

- `assignment.token_id` UNIQUE — un token ha al massimo un assignment
- `consent_record(worker_id, token_id, consent_type)` UNIQUE
- `partner_scan(partner_id, token_id, event_ref, scan_date)` UNIQUE — idempotency
- Tutte le FK con `ON DELETE RESTRICT` per integrità audit
- `audit_log` senza FK verso tabelle KORA Link (insert-only, immutabile)

---

## 16. RLS 035 Requirements

Requisiti per `035_kora_link_rls.sql` — senza SQL.

### Principio base: deny-by-default

Tutte le tabelle `kora_link.*` hanno `RLS ENABLED` con policy `USING (false)` di default. Le policy esplicite aggiungono accesso, non lo tolgono.

### Policy per tabella

| Tabella | KORA_ADMIN | COMPANY_ADMIN | WORKER (self) | PARTNER | Public route |
|---------|:---:|:---:|:---:|:---:|:---:|
| `batch` | SELECT/INSERT/UPDATE | SELECT (solo conteggi) | NO | NO | NO |
| `token` | SELECT/INSERT/UPDATE | NO (solo via view aggregata) | NO | NO | Via SECDEF fn |
| `assignment` | SELECT | NO | SELECT (own) | NO | Via SECDEF fn |
| `activation_event` | SELECT | NO | SELECT (own) | NO | NO |
| `consent_record` | SELECT | NO | SELECT+INSERT (own) | NO | NO |
| `link_event` | SELECT | NO | SELECT (own) | NO | NO |
| `revocation` | SELECT/INSERT | NO | INSERT (own, reason=voluntary/lost) | NO | NO |
| `replacement` | SELECT/INSERT | NO | NO | NO | NO |
| `partner_scan` | SELECT | NO | SELECT (own) | SELECT (own partner_id) | NO |
| `audit_log` | SELECT | NO | NO | NO | NO |

### View aggregata per COMPANY_ADMIN

Una view materializzata o function `v_kora_link_batch_stats(tenant_id)` che ritorna:
- count(`total`), count(`active`), count(`activation_pending`), count(`revoked`), count(`expired`)
- Nessun `worker_id`, nessun `token_digest`, nessun timestamp individuale
- RLS su view: `tenant_id = kora.current_tenant_id()`

### SECURITY DEFINER functions per public route

La route pubblica non deve avere accesso diretto alle tabelle. Usa una SECURITY DEFINER function:

`fn_kora_link_public_lookup(token_digest TEXT) → TABLE(token_id UUID, token_status token_status, pre_activation_expires_at TIMESTAMPTZ)`

La function:
- Accetta solo il digest (mai il cleartext)
- Ritorna solo i campi necessari per il routing (status, TTL)
- Non ritorna `worker_id`, `tenant_id`, `batch_id`
- Se token non trovato: ritorna 0 righe (identico a revocato → caller risponde 404)

Analogamente per activation:
`fn_kora_link_activate(token_digest TEXT, worker_id UUID, consent_version TEXT) → BOOLEAN`

### Audit INSERT policy

`kora_link.audit_log`: INSERT ONLY per ruoli di sistema. Nessun UPDATE, nessun DELETE, nessun SELECT per ruoli non-admin.

### Invarianti RLS

- Nessuna policy espone `assignment.worker_id` a ruoli company
- Nessuna policy espone `token_digest` a ruoli non-admin
- Partner vede solo propri scan (`partner_id = kora.current_partner_id()`)
- Worker vede solo propri eventi (`worker_id = kora.current_worker_id()`)
- Tenant isolation: ogni tabella con `tenant_id` ha `tenant_id = kora.current_tenant_id()` come guard

---

## 17. Environment and Secret Requirements

### `KORA_LINK_ENABLED`

- Tipo: `boolean` stringa (`'true'` / `'false'`)
- Default: `'false'`
- Staging: può essere `'true'` per test
- Produzione: `'false'` fino a Gate 2 + Gate 3 chiusi + CTO sign-off
- Non esporre mai a client (solo `process.env` server-side)

### `KORA_LINK_TOKEN_SECRET`

- Tipo: stringa random sicura
- Lunghezza minima: 256 bit = 32 byte → rappresentati come 64 char hex o 44 char base64
- Generazione: `openssl rand -hex 32` (in locale) o Vercel Secret Generator
- Staging: secret diverso dalla produzione — mai usare lo stesso secret
- Rotazione: procedura documentata; dual-secret period durante rotazione
- Storage: Vercel Environment Variable tipo "Sensitive" (encrypted at rest)
- Mai in: codice sorgente, `.env.local` committato, log, DB, response body
- Mai esposto: zero accesso client-side; solo Server Components, API Routes, Edge Middleware

### `KORA_LINK_RATE_LIMIT_PROVIDER` (futuro)

- Tipo: enum stringa (`'upstash'`, `'vercel-edge'`, `'none'`)
- Default: `'none'` (staging senza rate limiting)
- Produzione: obbligatorio `'upstash'` o `'vercel-edge'`
- Richiede anche: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` se provider = upstash

### `KORA_LINK_PUBLIC_BASE_URL` (opzionale)

- Tipo: URL stringa
- Default: `https://app.kora.ai` (production) / `https://staging.kora.ai` (staging)
- Usato per generare gli URL da iscrivere sui chip
- Non esposto a client

### Requisiti generali secrets

- Tutti i secret separati per environment (staging ≠ produzione)
- Nessun secret nel repository (incluso `.env.local` — solo `.env.local.example` con placeholder)
- Rotazione pianificata documentata
- Accesso limitato: solo i processi server-side che lo necessitano
- Audit ogni accesso al secret (livello infrastruttura Vercel)

---

## 18. Acceptance Criteria Before Migration

```
✅ Token storage strategy approvata da CTO (HMAC-SHA256 + KORA_LINK_TOKEN_SECRET)
✅ TTL policy approvata (180gg pre-attivazione, no TTL post v1)
✅ Token format approvato (kl1_ + 48 char base62, digest 64 char hex)
✅ Rate limiting strategy decisa (provider scelto, anche se non implementato)
✅ Logging policy approvata (no token cleartext nei log)
✅ Privacy notice draft disponibile (non serve approvazione finale per migration draft)
✅ Branch strategy completata (feat/kora-link-v1-platform su platform/readiness) ← FATTO
✅ Schema isolation approvata (kora_link.* dedicato)
✅ KORA_LINK_TOKEN_SECRET strategy approvata (env var, mai nel DB)
✅ Gate 2 CTO review avviato (schema discussion)
⬜ Uniform 404 response approvata
⬜ Redirect allowlist definita
⬜ SECURITY DEFINER function strategy approvata
⬜ Audit retention policy (DPO)
```

---

## 19. Acceptance Criteria Before Runtime

```
⬜ Migration 034 schema draft completata e revisionata da CTO
⬜ Migration 035 RLS draft completata e revisionata da CTO + DPO
⬜ Gate 2 chiuso
⬜ Gate 3 chiuso (o privacy notice approvata per staging limitato)
⬜ Route threat model approvata (questo documento)
⬜ KORA_LINK_ENABLED=false in produzione confermato (default già off)
⬜ 404 uniforme testata — indistinguibile tra missing/revoked/expired
⬜ Rate limiting implementato e testato su staging
⬜ Zero log contenenti token cleartext — verificato in staging
⬜ CSRF handling su POST /api/link/activate testato
⬜ Redirect allowlist testata — no open redirect
⬜ Staging E2E: activation flow, revoca, quick access
⬜ Staging E2E: company non vede dati individuali
⬜ Staging E2E: tenant isolation — worker azienda A non attiva chip azienda B
⬜ CTO/security sign-off scritto
```

---

## 20. Final Recommendation

### Token storage

**HMAC-SHA256(`token_value`, `KORA_LINK_TOKEN_SECRET`)** — digest 64 char hex, `UNIQUE` nel DB. Token cleartext mai persistito, mai loggato. Secret come env var `KORA_LINK_TOKEN_SECRET`, 256 bit, staging/prod separati. Questa è la scelta più difendibile e implementabile in Node/Next.js senza dipendenze aggiuntive.

### TTL

**180 giorni pre-attivazione** (colonna `pre_activation_expires_at`). Nessun TTL post-attivazione in v1. Revoca manuale come meccanismo primario post-attivazione. Replacement genera nuovo token con nuovo TTL pre-attivazione.

### Public route behavior

`404` uniforme per: token non trovato, revocato, scaduto, sospeso, sostituito. `400` per token malformato (pre-DB, via Zod). Nessun disclosure di stato, tenant, worker. Redirect solo su allowlist KORA. CSRF check su POST activation. Rate limiting obbligatorio prima del go-live.

### Rate limiting

Provider: **Upstash Redis** (`@upstash/ratelimit`). Non bloccante per migration draft (KL-05), bloccante per route runtime (KL-07). In staging: limiti alti o disabilitato, con test che verifichi che il meccanismo si attivi. In produzione: obbligatorio prima di qualsiasi traffico reale.

### Si può procedere a KL-05 (migration 034 draft)?

**SÌ**, con le seguenti condizioni:
1. CTO ha letto e approvato le decisioni di token storage (§5), lifecycle (§6), schema (§15)
2. La migration 034 è un **draft** — non viene applicata a nessun DB
3. OQ-06 (token length), OQ-07 (charset) e OQ-02 (hashing) sono considerate risolte da questo documento
4. La migration non include logica RLS (quella è KL-06/035)

KL-05 può produrre `supabase/migrations/034_kora_link_schema.sql` come file di testo per review CTO — senza `supabase db push`, senza `supabase migration apply`, senza alcuna connessione a DB reale.

---

*KORA_LINK_TOKEN_THREAT_MODEL.md — KL-04 · 2026-06-30 · Branch `feat/kora-link-v1-platform`*
*Versione: v1.0*
*Prossimo gate: KL-05 — Migration 034 draft (schema kora_link.*)*
