# Sentry Privacy Hardening 06

**Sprint:** SENTRY-PRIVACY-HARDENING-06
**Date:** 2026-07-14
**Preceded by:** PUBLIC-PRIVACY-FOUNDATION-05 (`docs/PUBLIC_PRIVACY_FOUNDATION_05.md`)

Hardens Sentry data scrubbing across client/server/edge so that only
technical diagnostic data (error type, stack trace, route template,
release, environment, non-personal tags) is ever transmitted — never
email, name, cookies, Authorization/session tokens, request bodies, query
strings, or a raw token embedded in a URL.

## Inventario iniziale

### File di configurazione Sentry
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` (wrapper `withSentryConfig`, source maps, CSP `connect-src`)
- Nessun `instrumentation.ts` esiste nel progetto.

### Punti di cattura/istrumentazione (ricerca esaustiva sull'intero repository)

| API Sentry | Occorrenze | Dove |
|---|---|---|
| `Sentry.init` | 3 | i tre file di config |
| `Sentry.captureException` | 5 | `app/error.tsx`, `app/global-error.tsx`, `app/admin/error.tsx`, `app/worker/error.tsx`, `app/company/error.tsx` — sempre `Sentry.captureException(error)` su un `Error` grezzo, **nessun contesto/extra/tag manuale allegato in nessun punto** |
| `Sentry.captureMessage` | 0 | — |
| `Sentry.setUser` | 0 | — |
| `Sentry.setTag` | 0 | — |
| `Sentry.setContext` | 0 | — |
| `Sentry.setExtra` | 0 | — |
| `Sentry.addBreadcrumb` | 0 | — |
| `Sentry.withScope` | 0 | — |
| Replay integration | 0 | esplicitamente assente, confermato da `tests/unit/b170-error-boundary.test.ts` preesistente |
| Tracing/profiling oltre `tracesSampleRate: 0.1` | 0 | nessuna integrazione aggiuntiva |

**Conseguenza architetturale:** non essendoci alcun punto di logging manuale
rischioso da correggere, l'intero lavoro di minimizzazione si concentra
sulla cattura **automatica** di Sentry (richiesta HTTP, breadcrumb
automatici di fetch/xhr/console, contesto dell'ambiente) — motivo per cui
la sanitizzazione è centralizzata in un unico modulo (`lib/sentry/scrub.ts`)
applicato via `beforeSend`/`beforeBreadcrumb`, non sparsa nei 5 punti di
cattura (che restano invariati, vedi "Scope" più sotto).

### Variabili Sentry documentate
`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`,
`SENTRY_AUTH_TOKEN` (tutte vuote in `.env.local.example`, nessun valore
reale).

### Wrapper/helper preesistenti
Nessuno — `lib/sentry/scrub.ts` è nuovo, creato in questo sprint.

### Test Sentry preesistenti
`tests/unit/b170-error-boundary.test.ts` (30 test) — verifica strutturale
di config/error boundary, già confermava l'assenza di replay. Invariato,
tutti i 30 test restano verdi.

## Inventario dati potenzialmente inviati (per fonte)

| Fonte | Dato potenziale | Necessità tecnica | Rischio privacy | Stato |
|---|---|---|---|---|
| Configurazione client | IP visitatore (via `sendDefaultPii` implicito) | Bassa | Alto se non esplicitamente disabilitato | **minimizzabile → risolto** (`sendDefaultPii: false` esplicito) |
| Configurazione server/edge | Header richiesta, cookie, IP (cattura automatica HTTP) | Bassa-media (diagnosi di rete) | Alto | **minimizzabile → risolto** (`beforeSend` rimuove `request.headers`/`cookies`) |
| Instrumentation | — | — | — | Non applicabile (nessun `instrumentation.ts`) |
| Route handler | Nessun capture manuale trovato | — | — | Non applicabile |
| Middleware | Nessun capture Sentry in `middleware.ts` | — | — | Non applicabile |
| Error boundary | `error.message`, `error.stack`, `error.digest` | **Necessario** (diagnosi) | Medio (`message` può contenere dati interpolati, es. errore Supabase con email) | **minimizzabile → risolto** (scrub del solo `value` del messaggio, stacktrace mantenuto) |
| Logging manuale | Nessuno esiste | — | — | Non applicabile |
| Capture automatico errori | Breadcrumb fetch/xhr/console, contesto browser/OS | Media (diagnosi UX) | Alto per console/fetch (URL con token, messaggi con email) | **minimizzabile → risolto** (`beforeBreadcrumb`) |

## Rischi trovati

1. `sendDefaultPii` non era mai impostato esplicitamente — affidato al
   default dell'SDK (che in `@sentry/nextjs` v10 è `false`, ma non
   dichiarato nel codice, in violazione del principio "non assumere che il
   default sia sufficiente").
2. Nessun `beforeSend`/`beforeBreadcrumb` esisteva — la cattura automatica
   di richieste HTTP (server/edge) e breadcrumb (client) non aveva alcun
   filtro applicativo.
3. `error.message` nei 5 error boundary poteva teoricamente contenere un
   valore interpolato (es. un messaggio di errore Supabase con un'email,
   o un errore di validazione con un token) — nessuna sanitizzazione del
   testo libero esisteva.
4. Le route pubbliche `/link/[token]` e `/cv/share/[token]` non avevano
   alcuna garanzia che un URL con token reale non finisse in un evento o
   breadcrumb Sentry (via cattura automatica request/fetch).

Nessun rischio "critico" attivo trovato (nessun logging manuale rischioso,
nessuna integrazione replay/profiling, nessun `setUser` con email) — i
rischi erano tutti nella cattura *automatica* non filtrata, non in codice
applicativo scritto in modo negligente.

## Configurazione implementata (prima/dopo)

| Impostazione | Prima | Dopo |
|---|---|---|
| `sendDefaultPii` | non impostato (default SDK) | **`false`, esplicito**, nei 3 config |
| `beforeSend` | assente | `scrubSentryEvent` (`lib/sentry/scrub.ts`), nei 3 config |
| `beforeBreadcrumb` | assente | `scrubSentryBreadcrumb` (`lib/sentry/scrub.ts`), nei 3 config |
| Session replay | disabilitato (nessuna integrazione) | **invariato** — ancora disabilitato, nessuna integrazione aggiunta |
| Tracing | `tracesSampleRate: 0.1` | **invariato** |
| Profiling | assente | **invariato**, nessuna integrazione aggiunta |
| `tracesSampleRate`, DSN, `environment`, `release`, `enabled` (solo prod) | — | **invariati** |

## Campi rimossi (sempre, incondizionatamente)

- `event.user` — intero oggetto (email, username, id, ip_address, geo).
- `event.request.cookies`
- `event.request.headers` (incluso `Authorization`)
- `event.request.data` (body)
- `event.request.query_string`
- `event.request.env`
- Query string in `event.request.url` e in qualunque URL nei breadcrumb.
- Segmenti di path che sembrano token (hex 16+ caratteri) o UUID → generalizzati a `[token]`/`[id]`.
- Chiavi di `tags`/`extra`/`contexts` custom il cui nome corrisponde a un pattern sensibile (`email`, `password`, `secret`, `token`, `cookie`, `authoriz`, `session`, `worker_id`, `tenant_id`, `partner_id`, `user_id`, `ip_address`, `phone`, `address`, `codice_fiscale`, `iban`) o il cui valore assomiglia a un'email o a un token opaco (24+ caratteri alfanumerici).
- Breadcrumb `console` il cui messaggio corrisponde a un pattern sensibile (token/password/secret/authoriz/email) — **l'intero breadcrumb viene eliminato**, non solo mascherato.
- Campi `body`/`request`/`response`/`headers` in breadcrumb `fetch`/`xhr`, se presenti.
- Email e sottostringhe opache lunghe (24+ caratteri) in `exception.value`, `message`, `logentry.message` — sostituite con `[redacted]`.

## Campi mantenuti

- `exception.values[].type` e `.stacktrace` (integralmente).
- `release`, `environment`, `event_id`, `level`, `platform`.
- `tags`/`extra` non corrispondenti a un pattern sensibile (es. `error_code`, `feature`, `route_name`).
- `contexts` standard (`browser`, `os`, `device`, `runtime`, `app`, `culture`, `cloud_resource`) — non contengono dati personali per costruzione di Sentry.
- `request.method` e `request.url` (ridotto a route template, senza query string).
- Breadcrumb `fetch`/`xhr`: `method`, `status_code`, `url` (sanitizzato).
- Breadcrumb `navigation`: `to`/`from` (sanitizzati come URL).

## Policy URL/token

Ogni URL (in `event.request.url` e nei breadcrumb `fetch`/`xhr`/`navigation`)
passa da `sanitizeUrl()`:
1. Rimuove sempre la query string.
2. Route note (`/link/<token>`, `/link/<token>/activate`, `/cv/share/<token>`) → forma template esplicita.
3. Difesa in profondità generica: qualunque segmento di path che sia un UUID → `[id]`; qualunque segmento esadecimale di 16+ caratteri → `[token]` — copre altre route dinamiche (es. `/admin/companies/[companyId]`) senza doverle elencare una per una.

Il token reale non compare **mai** nell'output, verificato con test dedicati
sulle route esplicitamente citate nel brief e su un caso generico (UUID).

## Policy user context

Nessun `Sentry.setUser()` esiste nel codice applicativo (verificato con
scansione ricorsiva in `app/`, `components/`, `lib/`, `services/`, esclusi
commenti). `sanitizeUser()` rimuove comunque **incondizionatamente**
`event.user`, indipendentemente dalla fonte (manuale o automatica) — scelta
esplicita: **nessun identificatore utente, nemmeno pseudonimo, viene inviato
a Sentry in questo sprint**, non essendoci un caso d'uso reale di
correlazione cross-evento che lo giustifichi (coerente con "Se non è
necessario, evita del tutto l'identificatore utente"). Nessun hashing HMAC
introdotto, per lo stesso motivo — non aggiungere una chiave/segreto senza
necessità.

## Policy breadcrumbs

- `console`: eliminato interamente se il messaggio contiene un pattern
  sensibile; altrimenti il messaggio viene comunque passato da `scrubText`.
- `fetch`/`xhr`: URL sanitizzato (route template), `body`/`request`/
  `response`/`headers` rimossi se presenti; `method`/`status_code` mantenuti.
- `navigation`: `to`/`from` sanitizzati come URL.
- Qualunque altro breadcrumb: `data` passato dallo stesso filtro chiave/
  valore usato per `tags`/`extra` (non eliminato in blocco).

## Gestione errori Supabase

Nessun punto del codice allega oggi un oggetto errore Supabase completo a
Sentry (i 5 error boundary ricevono solo l'`Error` di React, non l'oggetto
Postgrest/Auth originale). Il rischio residuo — un messaggio d'errore che
*contiene* un'email o un token interpolato (es. `"duplicate key ... for
mario@x.com"`) — è coperto dalla sanitizzazione generica di
`exception.value`/`message` (`scrubText`), verificata con un test
dedicato che riproduce esattamente questa forma di messaggio. La
sanitizzazione riguarda **solo la copia inviata a Sentry** — l'oggetto
errore originale, non modificato, resta disponibile all'applicazione
(nessuna riga della logica applicativa è stata toccata).

## Replay / tracing / profiling

Invariati rispetto a prima dello sprint: replay disabilitato (nessuna
integrazione), `tracesSampleRate: 0.1` mantenuto, nessun profiling
introdotto. Nessuna delle tre superfici è stata resa più invasiva, per
esplicito divieto del brief.

## File creati e modificati

**Creati:**
- `lib/sentry/scrub.ts` — sanitizzazione centralizzata.
- `tests/unit/sentry-privacy-hardening-06.test.ts` — 37 test.
- Questo documento.

**Modificati:**
- `sentry.client.config.ts` — `sendDefaultPii: false`, `beforeSend`, `beforeBreadcrumb`.
- `sentry.server.config.ts` — idem.
- `sentry.edge.config.ts` — idem.

**Non modificati (deliberatamente):** i 5 file `app/**/error.tsx` — la
sanitizzazione via `beforeSend` copre ogni evento indipendentemente dal
punto di cattura, quindi non è stato necessario né opportuno toccare la UI
degli error boundary.

## Limiti residui

- La sanitizzazione basata su pattern (nome chiave, forma del valore) non
  può garantire la rimozione del 100% di ogni possibile dato personale in
  un messaggio di errore in linguaggio libero non previsto — è una difesa
  ragionevole e testata sui casi noti, non una garanzia assoluta.
- La configurazione lato dashboard Sentry (retention, scrubbing lato
  server Sentry, sensitive fields, regione) non è verificabile dal codice
  — vedi checklist dedicata sotto.
- Non è stato introdotto alcun identificatore utente pseudonimo: se in
  futuro servisse una correlazione cross-evento, andrà progettato con un
  HMAC server-side dedicato (mai hash semplice di email, mai lato client)
  — non implementato ora perché non necessario oggi.

## Istruzioni per futuri sviluppatori

- Non aggiungere `Sentry.setUser()`, `Sentry.setTag()`, `Sentry.setContext()`
  o `Sentry.setExtra()` con dati potenzialmente personali senza passare
  prima da una revisione: anche se `beforeSend` filtra le chiavi note, un
  nome di chiave imprevisto con un valore sensibile potrebbe non essere
  intercettato dal solo pattern-matching.
- Se serve aggiungere una nuova route dinamica con token/id sensibili,
  verificare che `sanitizeUrl()` la generalizzi correttamente (di norma sì,
  se il segmento è un UUID o una stringa esadecimale di 16+ caratteri) —
  altrimenti aggiungere una regola esplicita in `lib/sentry/scrub.ts`,
  seguendo il modello di `/link/[token]`.
- Non disabilitare `beforeSend`/`beforeBreadcrumb` per "semplificare il
  debug" — se serve più contesto in sviluppo, usare i log locali, non
  Sentry (che comunque non invia eventi fuori produzione, `enabled:
  process.env.NODE_ENV === 'production'`, invariato).
- Il test di inventario in `tests/unit/sentry-privacy-hardening-06.test.ts`
  (§18, §24) fallisce automaticamente se viene introdotto un
  `Sentry.setUser()` in `app/`, `components/`, `lib/`, `services/` —
  mantenerlo aggiornato se la struttura delle cartelle cambia.

## Checklist verifica dashboard Sentry (manuale, per il titolare)

Il repository non può provare da solo la configurazione lato dashboard.
Da verificare direttamente su sentry.io:

- [ ] **Retention eventi** — periodo di conservazione configurato per il progetto.
- [ ] **Data scrubbing lato server Sentry** — impostazioni "Data Scrubber" del progetto (indipendenti da `beforeSend`, sono un secondo livello lato Sentry).
- [ ] **Sensitive fields** — elenco di nomi di campo che Sentry stesso maschera automaticamente (Settings → Security & Privacy).
- [ ] **Replay** — confermare che il replay sia disabilitato anche a livello di progetto/organizzazione, non solo di codice.
- [ ] **IP collection** — impostazione "Store IP Address" del progetto (deve essere disattivata, coerente con `sendDefaultPii: false`).
- [ ] **Source maps** — chi può accedere ai source map caricati (contengono nomi di file e struttura del codice sorgente).
- [ ] **Alerting** — destinatari delle notifiche di errore, per evitare che finiscano a canali non autorizzati.
- [ ] **Environment** — nomi degli ambienti configurati corrispondono a `NEXT_PUBLIC_KORA_ENV` realmente usato.
- [ ] **Accessi al progetto** — elenco membri/team con accesso al progetto Sentry.
- [ ] **DPA** — stato dell'accordo di trattamento dati con Sentry (vedi anche `docs/PUBLIC_PRIVACY_FOUNDATION_05C_PROVIDER_RETENTION_VERIFICATION.md`).
- [ ] **Regione** — data residency del progetto Sentry (US/EU).
- [ ] **Integrazioni terze** — eventuali integrazioni Slack/GitHub/altro collegate al progetto, che potrebbero ricevere una copia degli eventi.

**Nota:** nessuno di questi punti è dichiarato verificato in questo
documento — richiedono tutti accesso diretto alla dashboard, che questo
sprint non ha e non può simulare.
