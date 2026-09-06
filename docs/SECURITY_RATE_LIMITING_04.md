# Security Rate Limiting 04

**Sprint:** SECURITY-RATE-LIMITING-04
**Date:** 2026-07-14
**Preceded by:** SECURITY-ORIGIN-GUARD-03 (`docs/SECURITY_ORIGIN_GUARD_03.md`)
**Helper:** `lib/security/rate-limit.ts`

Adds centralized, category-based rate limiting to the mutating routes with
the clearest abuse/spam/bulk-misuse potential, on top of the existing
session auth and Origin guard. Does not touch CSP, RLS, Supabase schema,
Sentry, business logic, or the Origin guard's own logic (only imports it
where already present).

## Threat model

Every route this sprint protects already requires an authenticated
KORA_ADMIN / COMPANY_ADMIN / WORKER session (`require*User()`,
`lib/auth/kora-session.ts`) — none is reachable anonymously, and none is
brute-forceable in the classic sense (there is no credential to guess). The
realistic abuse shape here is:

1. **An authenticated actor calling a costly or side-effecting route too
   often** — a buggy client retry loop, a careless repeated bulk
   resubmission, or a compromised admin/worker session being used to spam
   invites, trigger repeated expensive pipeline runs, or mass-delete data.
2. **Operational cost, not just security** — invite/provisioning routes
   send real email (deliverability reputation, provider quota); pipeline
   routes consume real compute/DB load; a signed-URL route consumes storage
   provider quota.

This reframes the usual rate-limiting assumptions (IP-based, anonymous
brute force) — see "Identificazione del client" below for what that implies
for the key design.

## Route inventory

**87 route handler files analyzed** (same inventory as
SECURITY-ORIGIN-GUARD-03: 85 under `app/api/**` + `app/auth/callback/route.ts`
+ `app/link/[token]/activate/route.ts`). **45 files / 46 method-handlers**
are mutating (`POST`/`PUT`/`PATCH`/`DELETE`) — re-confirmed unchanged since
the previous sprint.

**Public/semi-public surfaces checked** (per the brief's explicit categories):

| Category | Finding |
|---|---|
| Login | No app-owned route — `app/login/page.tsx` calls `supabase.auth.signInWithPassword()` directly, client-side. Supabase Auth's own native rate limiting is the relevant control; there is no app code to attach a limiter to. |
| Reset password (request) | Same — `app/auth/forgot-password/page.tsx` calls `supabase.auth.resetPasswordForEmail()` directly. No app route. |
| Setup/reset password (submit) | Same — `app/worker/setup-password`, `app/company/setup-password`, `app/auth/reset-password` all call `supabase.auth.updateUser({ password })` directly. No app route. |
| Public token route | `app/link/[token]/activate/route.ts` — **already rate-limited** by the dedicated, mature `lib/kora-link/rate-limit.ts` (Upstash-backed, its own policy per KORA Link route type). Not duplicated here — see "Route escluse" below. |
| Public CV share view | `app/cv/share/[token]/page.tsx` — a Server Component **page**, not an `app/api` route handler; token is 256-bit (64 hex chars), so brute-force enumeration is computationally infeasible regardless of rate limiting. Considered and excluded from this sprint's route-handler-centric helper — see "Route escluse" below. |
| User search/verify endpoint | None exists in the codebase today (no email-existence-check API). Not applicable. |
| Request-access page | Purely informational, no form submission, no API route (confirmed in SECURITY-CI-CREDIBILITY-01-era codebase reading and re-checked here). Not applicable. |

## Classificazione delle 45 route mutanti

**Alta priorità (12 route protette in questo sprint)** — see "Policy" table
below for full detail per route.

**Media priorità (identificate, non implementate in questo sprint — nessuna
regressione di sicurezza rispetto a oggi, solo non ancora rate-limited):**
`admin/commons/bookings/[id]` (PATCH), `admin/company-submissions/[id]/review`,
`admin/company-users` (PATCH status), `admin/data-lifecycle/archive`,
`admin/decision-pack/status`, `admin/demo/provision-viewer`,
`admin/evidence-attachments/lifecycle`, `admin/evidence-attachments/preview`,
`admin/evidence-attachments/register`, `admin/evidence-attachments/signed-url`
(storage-quota consideration, worth a future limit),
`admin/partners/[id]/status`, `admin/partners` (POST create),
`admin/tenants/[id]/promote-to-pilot`, `admin/tenants` (POST create),
`admin/uef/enrich`, `admin/uef/review`, `admin/worker-initiatives` (POST/PATCH),
`admin/workforce-baseline`, `commons/posts` (POST/PATCH — generic UGC spam
potential, not one of the brief's named categories),
`company/data-submissions/*` (POST variants), `worker/dynamic-cv/shares/[id]/revoke`,
`worker/profile` (PATCH).

**Implementate in B-WORKER final cleanup (2026-09-06)** — moved out of the
"media priorità" bucket above, closing the pre-B-WORKER audit's P2 finding
for these three: `worker/commons/bookings` (POST — create), `worker/onboarding`
(POST), `worker/initiatives/[id]/interest` (POST). All three use the existing
`token_creation` category (self-service, worker-scoped, same risk shape as
`worker/dynamic-cv/share`) — see the policy table below.

**Escluse (motivazione esplicita):**
- `app/link/[token]/activate` — già protetta da `lib/kora-link/rate-limit.ts`
  (dedicato, Upstash-backed). Aggiungere questo helper sarebbe una doppia
  protezione ridondante, esplicitamente vietata dal brief.
- `app/api/auth/logout` — nessun valore di abuso (disconnette la propria
  sessione; al più un fastidio, non un vettore di attacco).
- `app/api/worker/pib/redistribute` — azione self-service, single-row,
  nessun pattern di abuso plausibile diverso dal normale utilizzo.
- `app/api/worker/commons/bookings/[id]` (DELETE, cancella propria
  prenotazione) e `app/api/worker/dynamic-cv/shares/[id]/revoke` — azioni
  self-service di "annullamento", basso valore di abuso.

**Dubbie → risolte per design (non per esclusione di route):** come nello
sprint Origin Guard, ogni `require*User()` accetta sia sessione cookie sia
`Authorization: Bearer` (stesso `resolveUser()` condiviso). Il rate limiter
non ha bisogno di distinguere i due casi: la chiave è sempre l'`actorId`
risolto DOPO l'auth, indipendentemente dal meccanismo con cui la sessione è
stata stabilita — quindi non c'è alcuna classificazione route-per-route da
fare su questo punto (a differenza dell'Origin guard, qui non esiste un
bypass "bearer" da gestire, perché il rate limit si applica comunque
sull'identità autenticata risolta, sia essa arrivata da cookie o da bearer).

## Storage scelto

**Upstash Redis**, tramite `@upstash/ratelimit` + `@upstash/redis` —
**già dipendenze del progetto**, **già usate** da `lib/kora-link/rate-limit.ts`,
**già documentate** in `.env.local.example` (`UPSTASH_REDIS_REST_URL` +
`UPSTASH_REDIS_REST_TOKEN`). Nessun nuovo servizio esterno, nessun nuovo
secret. Un prefisso di chiave distinto (`sec:rl` vs il `kl:rl` di KORA Link)
mantiene i due contatori indipendenti sulla stessa istanza Redis.

**Perché non solo in-memory in produzione:** l'app è deployata su Vercel —
funzioni serverless, potenzialmente multi-istanza, nessuna memoria di
processo condivisa tra invocazioni. Un `Map` in-memory darebbe una falsa
sicurezza: ogni istanza vedrebbe solo le proprie richieste, azzerando di
fatto il limite reale su un deploy con più istanze concorrenti (dimostrato
empiricamente in `tests/unit/security-rate-limiting-04.test.ts`, sezione
"multi-istanza simulata"). Per questo `assertRateLimitProductionSafe()`
lancia un errore all'avvio se `NODE_ENV=production` e il provider non è
`upstash` con le env configurate — stesso pattern già usato da
`assertKoraLinkRateLimitProductionSafe()`.

**In-memory (`createMemoryRateLimitStore`)** è quindi limitato esplicitamente
a: sviluppo locale single-process, test automatizzati (con clock iniettato).
Mai l'unica protezione in produzione.

### Comportamento esplicito per ogni scenario di misconfigurazione

`assertRateLimit()` (il punto d'ingresso usato da ogni route) non lancia
**mai** un'eccezione non gestita — nessuno scenario di misconfigurazione può
far crashare una route o l'intero deploy. Ogni errore di configurazione o di
costruzione dello store viene catturato e trattato con lo stesso fail mode
documentato per la categoria (vedi tabella policy), esattamente come un
errore runtime dello storage:

| Scenario | Produzione | Fuori produzione |
|---|---|---|
| `SECURITY_RATE_LIMIT_PROVIDER` assente | Rifiutato da `assertRateLimitProductionSafe()` → fail mode della categoria (mai crash, mai fallback silenzioso a memory) | Default a `memory` |
| Valore non riconosciuto (es. refuso) | Rifiutato (parsing fallisce) → fail mode della categoria | Rifiutato (parsing fallisce) → fail mode della categoria (stesso comportamento, nessuna distinzione per ambiente su un valore genuinamente invalido) |
| `=memory` | Rifiutato da `assertRateLimitProductionSafe()` → fail mode della categoria | Store in-memory, comportamento normale |
| `=disabled` | Rifiutato da `assertRateLimitProductionSafe()` → fail mode della categoria (**non** bypassa il guard come farebbe fuori produzione) | Bypassa sempre il guard (`return null`) |
| `=upstash` ma credenziali assenti/incomplete | Rifiutato da `assertRateLimitProductionSafe()` → fail mode della categoria | Store "unavailable" concettuale: stessa gestione, fail mode della categoria |
| `=upstash` con credenziali presenti ma Upstash irraggiungibile a runtime | `store.hit()` fallisce → fail mode della categoria (percorso già gestito da `checkRateLimit`, non da questa matrice di costruzione) | Idem |

In tutti i casi "fail mode della categoria": **open** → la richiesta procede
(`assertRateLimit` restituisce `null`); **closed** → la richiesta riceve
`429` con `Retry-After` calcolato sulla finestra della policy (nessun
dettaglio della misconfigurazione nel corpo della risposta). Verificato da
17 test dedicati in `tests/unit/security-rate-limiting-04.test.ts`
("misconfigurazione in produzione: mai un crash, mai una falsa
disponibilità").

**Nota:** `assertRateLimitProductionSafe()` non è agganciata a un hook di
avvio (`instrumentation.ts` non esiste in questo progetto) — è invocata
lazily al primo utilizzo dello store condiviso, non al boot del processo.
Questo è intenzionale e replica lo stesso pattern già presente per
`assertKoraLinkRateLimitProductionSafe()` in `lib/kora-link/rate-limit.ts`
(anch'essa mai invocata a un hook di avvio in questo codebase): un errore di
configurazione del rate limiter fa fallire solo le route che lo usano
(secondo il fail mode di categoria), non l'intero processo Next.js al boot —
scelta deliberata per limitare il blast radius di una misconfigurazione a un
sottoinsieme di route, non all'intera applicazione.

## Identificazione del client (chiave)

`${category}:actor:${actorId}` dove `actorId` è l'id opaco (UUID Supabase)
dell'utente autenticato risolto DOPO il controllo auth di route — mai email,
token, cookie completo, header Authorization completo, o IP. Motivazione:
tutte le route protette richiedono già una sessione autenticata (vedi
Threat model) — l'IP non aggiungerebbe granularità utile (molti admin
legittimi possono condividere un IP aziendale; un attore con sessione valida
può cambiare IP a piacere) e introdurrebbe la questione, non necessaria qui,
di come derivare un IP affidabile dietro proxy/`X-Forwarded-For`. L'actorId
autenticato è stabile, sempre disponibile a questo punto del flusso, e non
manipolabile lato client (nessun bypass tramite header: non essendoci alcun
input controllato dal chiamante nella chiave, non esiste un header da
manipolare per cambiarla — l'unico modo di ottenere una chiave diversa è
autenticarsi con un'identità diversa, il che significa essere comunque
soggetti al limite sotto quella nuova identità).

## Policy per categoria

| Categoria | Route | Limite | Finestra | Fail mode | Motivazione | Rischio residuo |
|---|---|---|---|---|---|---|
| `invite` | `admin/company-users` (POST), `admin/partners/[id]/invite-user` | 8 | 5 min | **open** | Gli inviti singoli sono azioni occasionali; un invito realmente massivo passa dall'endpoint bulk dedicato. 8/5min copre un normale batch manuale senza abilitare spam. | Fail-open: durante un'interruzione Redis, un attore già autenticato potrebbe inviare più inviti del previsto per una finestra; accettabile, nessun costo esterno irreversibile in pochi minuti. |
| `single_provisioning` | `admin/workers/provision` | 15 | 5 min | **open** | Flusso operativo core (onboarding worker uno alla volta); soglia più alta di `invite` perché più frequente in uso normale. | Come sopra. |
| `bulk_provisioning` | `admin/workers/bulk-provision` | 3 | 15 min | **closed** | Operazione rara e deliberata (CSV multiplo + invii email multipli); richieste ripetute rapide indicano bug o abuso (spam email, carico DB). | Fail-closed: un'interruzione Redis blocca temporaneamente un bulk provisioning legittimo — costo minore di un bulk-invio incontrollato. |
| `heavy_provisioning` | `admin/companies/provision`, `admin/live-company` | 5 | 10 min | **closed** | Creazione tenant/company con effetti collaterali multipli (utente admin, invito email); rara per natura. | Come sopra — priorità al contenimento su un'operazione con effetti collaterali multipli, non alla disponibilità. |
| `costly_admin_operation` | `admin/operator-flow`, `admin/scoring/run-approved-batch`, `admin/uef/generate-candidates`, `admin/data-intake/accept` | 5 | 5 min | **open** | Compute/pipeline costosi, nessuna ragione legittima per eseguirli decine di volte al minuto; ma pool di attori ristretto (solo KORA_ADMIN) e nessun costo esterno irreversibile — bloccare l'intera console admin per un'interruzione Redis sarebbe sproporzionato. | Fail-open: durante un'interruzione Redis un admin potrebbe rilanciare la pipeline più volte del previsto — costoso in compute, non distruttivo, non irreversibile. |
| `destructive_admin_operation` | `admin/data-lifecycle/delete` | 5 | 10 min | **closed** | Azione distruttiva (cancellazione dati); il costo di bloccare temporaneamente un'eliminazione legittima durante un'interruzione è nettamente inferiore al rischio di cancellazioni ripetute incontrollate. | Fail-closed intenzionale — nessun rischio residuo accettato qui. |
| `token_creation` | `worker/dynamic-cv/share`, `worker/commons/bookings` (POST, aggiunta B-WORKER final cleanup 2026-09-06), `worker/onboarding` (POST, idem), `worker/initiatives/[id]/interest` (POST, idem) | 10 | 60 min | **open** | Azione self-service, worker-scoped, basso rischio (condividere il proprio CV, prenotare un'iniziativa, completare l'onboarding, o esprimere interesse qualche volta in più non è una violazione di sicurezza). | Fail-open: priorità a non rompere un flusso UX worker-facing a basso rischio durante un'interruzione infrastrutturale. |

## Fail-open / fail-closed — riassunto della decisione

Non è stata scelta automaticamente né uniformemente. Il criterio applicato:
**fail-closed dove l'azione è distruttiva o ha effetti collaterali esterni
costosi/irreversibili in caso di abuso non contenuto** (cancellazione dati,
bulk email/provisioning, creazione tenant pesante); **fail-open dove il
pool di attori è già ristretto da un ruolo autenticato, l'azione non è
distruttiva, e bloccare l'intera funzionalità per un'interruzione Redis
sarebbe un'indisponibilità autoinflitta sproporzionata al rischio residuo**
(operazioni di calcolo costose ma non distruttive; azioni self-service a
basso rischio). Testato esplicitamente in
`tests/unit/security-rate-limiting-04.test.ts`.

## Ordine di integrazione: Origin guard → auth → rate limit → business logic

Per tutte e 12 le route: `assertSameOrigin(request)` (invariato dal
precedente sprint) → `require*User(request)` → `assertRateLimit(category,
actorId)` → logica esistente. **Non** l'ordine di default suggerito dal
brief ("Origin guard → rate limit → auth"), per una ragione tecnica
motivata: la chiave del rate limiter è l'`actorId` autenticato (vedi
"Identificazione del client" sopra) — non può essere costruita prima che
l'auth abbia risolto un'identità. Origin guard resta comunque il primissimo
controllo eseguito (nessuna regressione lì), e nessun controllo auth
esistente è stato rimosso o alterato — verificato dai test di
non-regressione dedicati.

## Comportamento locale / staging / produzione

- **Locale/test**: `SECURITY_RATE_LIMIT_PROVIDER` non impostata o
  `memory` → store in-memory, best-effort, per-processo.
- **Staging/produzione**: `SECURITY_RATE_LIMIT_PROVIDER=upstash` con
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configurate — richiesto,
  altrimenti `assertRateLimitProductionSafe()` lancia un errore all'avvio se
  `NODE_ENV=production`.

## Nuove variabili d'ambiente

- `SECURITY_RATE_LIMIT_PROVIDER` (`memory` | `upstash` | `disabled`) —
  documentata in `.env.local.example`, nessun valore reale. Riusa
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, già esistenti, non
  duplicate.

## Come aggiungere in futuro una nuova route rate-limited

1. Scegliere la categoria esistente più vicina al profilo di rischio (vedi
   tabella "Policy per categoria"), oppure aggiungerne una nuova in
   `RATE_LIMIT_POLICIES` con relativa motivazione limite/finestra/fail-mode
   documentata in questo file.
2. Import:
   ```ts
   import { assertRateLimit } from '@/lib/security/rate-limit';
   ```
3. Dopo la risoluzione dell'auth (e dopo l'Origin guard, se presente),
   prima della business logic:
   ```ts
   const rateLimitGuard = await assertRateLimit('<categoria>', <actorId>);
   if (rateLimitGuard) return rateLimitGuard;
   ```
4. Aggiungere la route all'inventario in
   `tests/unit/security-rate-limiting-04-routes.test.ts`.

## Limiti e rischi residui

- Le 26 route "media priorità" elencate sopra non sono rate-limited in
  questo sprint — nessuna regressione rispetto a oggi (non lo erano prima),
  ma restano un gap per un futuro sprint dedicato.
- `admin/evidence-attachments/signed-url` genera URL firmati (costo storage
  provider) e non è coperta in questo sprint pur avendo un profilo di
  rischio degno di nota — segnalata esplicitamente come candidata futura.
- La chiave basata su `actorId` non protegge da un singolo attore autorizzato
  che usi deliberatamente più account autenticati in parallelo — mitigato
  dal fatto che il pool di account admin/worker legittimi è già controllato
  dal provisioning stesso (nessun self-signup).
- Login/reset password restano fuori dalla portata del rate limiter
  applicativo perché non esistono come route app-owned — la protezione
  reale lì è nativa di Supabase Auth (rate limit lato provider), non
  costruita in questo sprint.

## Nota costituzionale

Il rate limiting qui implementato è **difesa aggiuntiva**. Non sostituisce
autenticazione, autorizzazione basata su ruolo, RLS, CAPTCHA, monitoring/
alerting, o eventuali limiti nativi del provider (Supabase Auth ha i propri
rate limit su login/reset/invito, indipendenti da questo helper). Vale lo
stesso principio già dichiarato per l'Origin guard in
`docs/SECURITY_ORIGIN_GUARD_03.md`.
