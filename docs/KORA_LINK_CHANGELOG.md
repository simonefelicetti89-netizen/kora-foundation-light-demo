# KORA Link — Changelog

**Branch:** `feat/kora-link-v1`
**Base:** `eaecdad` (`value-freeze-v1`)
**Non mergiare in main senza Gate 2 + Gate 3 chiusi + CTO review.**

---

## KL-09 — KORA Link Upstash Rate Limit Adapter

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route, nessuna scrittura DB

### Contenuto

Implementato l'adapter Upstash Redis reale in `lib/kora-link/rate-limit.ts`.
Aggiornato `lib/kora-link/config.ts` — aggiunto `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` a `KoraLinkEnv`.
Creato `tests/unit/kora-link-rate-limit-upstash.test.ts` — 35 test unit sull'adapter Upstash (mock SDK, nessuna chiamata network).
Aggiornato `tests/unit/kora-link-rate-limit.test.ts` — 57 → 59 test (aggiornata gestione upstash+env nel factory e assertProductionSafe).
Installato `@upstash/redis` e `@upstash/ratelimit` (unica dipendenza npm consentita in KL-09).

### Funzioni aggiunte / modificate

#### `lib/kora-link/rate-limit.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkUpstashEnvStatus` | type | `{ hasUrl, hasToken, ready }` — status env Upstash |
| `getKoraLinkUpstashEnvStatus(env?)` | fn | Legge URL e token da env — restituisce status senza lanciare, senza esporre valori |
| `assertKoraLinkUpstashReady(env?)` | fn | Lancia con lista env mancanti se `ready = false` — messaggi privacy-safe |
| `createUpstashKoraLinkRateLimiter(env?)` | fn | Costruisce adapter reale: Redis + Ratelimit lazy-initialized per route; `check()` chiama Upstash con sliding window |
| `createKoraLinkRateLimiter` | fn (updated) | Branch upstash: verifica env → real adapter o unavailable; lancia in production se env mancanti |
| `assertKoraLinkRateLimitProductionSafe` | fn (updated) | Branch upstash: aggiunge `assertKoraLinkUpstashReady` oltre al check provider |

#### Aggiunta a `lib/kora-link/config.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `UPSTASH_REDIS_REST_URL?` | KoraLinkEnv key | URL REST Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN?` | KoraLinkEnv key | Token autenticazione Upstash |

### Comportamento Upstash adapter

```
createUpstashKoraLinkRateLimiter(env)
  ├─ Lancia se URL o token mancanti (privacy-safe, nessun valore esposto)
  ├─ Crea Redis({ url, token }) una sola volta
  ├─ getLimiter(route): Ratelimit creato lazy su prima check(), riusato per route identica
  │    └─ Ratelimit.slidingWindow(limit, '60 s'), prefix 'kl:rl:<route>', analytics: false
  └─ check(ctx) → { allowed: result.success, provider: 'upstash', limit, remaining: result.remaining, resetAt: result.reset }
```

### Provider status KL-09

| Provider | Status | Comportamento factory |
|----------|--------|-----------------------|
| `null` (assente) | — | dev/test: unavailable/denied · production: throws |
| `'disabled'` | Dev/test only | dev/test: always-allow · production: throws |
| `'upstash'` + env mancanti | Dev/test: unavailable · production: throws |
| `'upstash'` + env configurati | ✅ Adapter reale Upstash |

### Copertura test

| File | Test | Suite |
|------|------|-------|
| `kora-link-rate-limit-upstash.test.ts` (nuovo) | 35 | 4 |
| `kora-link-rate-limit.test.ts` (aggiornato) | 59 (+2) | 7 |

| Suite (upstash) | Test |
|-----------------|------|
| getKoraLinkUpstashEnvStatus | 9 |
| assertKoraLinkUpstashReady | 8 |
| createUpstashKoraLinkRateLimiter — construction | 5 |
| createUpstashKoraLinkRateLimiter — check() behavior | 13 |

### Decisioni tecniche

- **Circular import evitato**: Tutto il codice Upstash è in `rate-limit.ts`, non in un file separato `rate-limit-upstash.ts`. Un file separato avrebbe creato un ciclo (`rate-limit.ts ↔ rate-limit-upstash.ts`) che in CJS-compiled Next.js può causare `undefined` su valori catturati durante l'inizializzazione modulo.
- **Vitest mock class-based**: `vi.fn().mockImplementation(() => ({}))` non è un costruttore valido. Si usano classi reali (`class MockRedis { constructor() {} }`) con `vi.hoisted` per condivisione stato tra factory closure e test.
- **No network al momento della costruzione**: `new Redis({...})` e `new Ratelimit({...})` non fanno chiamate network — i test factory non richiedono mock per questi path.
- **Lazy Ratelimit**: Un'istanza `Ratelimit` per route, creata al primo `check()` e riusata — evita overhead istanziazione per ogni request.

### Metriche

- File creati: 1 (`tests/unit/kora-link-rate-limit-upstash.test.ts`)
- File modificati: 5 (`lib/kora-link/rate-limit.ts`, `lib/kora-link/config.ts`, `tests/unit/kora-link-rate-limit.test.ts`, `package.json`, `package-lock.json`)
- Dipendenze aggiunte: 2 (`@upstash/redis`, `@upstash/ratelimit`)
- Provider Upstash integrato: sì
- Network calls nei test: 0 (SDK completamente mockato)
- TypeScript: 0 errori
- ESLint: 0 errori, 2 warning (parametri `_config` in mock constructor — attesi, test-only)
- Vitest: 8353/8353 passed (+38 rispetto a KL-08)
- Build: OK
- E2E: 6/6 passed

### Gate status post-KL-09

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-08 | ✅ COMPLETATI |
| KL-09 Upstash Rate Limit Adapter | ✅ COMPLETATO |
| KL-10 Route pubblica `/link/[token]` | Prerequisiti: Gate 2+3 chiusi · `KORA_LINK_ENABLED=true` · `KORA_LINK_RATE_LIMIT_PROVIDER=upstash` + Upstash env |

---

## KL-08 — Rate Limit Adapter Skeleton

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route, nessun provider Upstash

### Contenuto

Creato `lib/kora-link/rate-limit.ts` — modulo server-only per rate limiting KORA Link.
Creato `tests/unit/kora-link-rate-limit.test.ts` — 57 test unit, copertura completa.
Modificato `lib/kora-link/config.ts` — aggiunto `KORA_LINK_RATE_LIMIT_PROVIDER` a `KoraLinkEnv` + `getKoraLinkRateLimitProvider`.
Modificato `tests/unit/kora-link-config.test.ts` — aggiunti 7 test per `getKoraLinkRateLimitProvider` (totale: 66 test).

### Funzioni e costanti esportate

#### `lib/kora-link/rate-limit.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkRateLimitProvider` | type | `'disabled' \| 'upstash'` |
| `KoraLinkRateLimitContext` | type | Input per `check()`: route, identifier, now opzionale |
| `KoraLinkRateLimitDecision` | type | Output: allowed, provider, limit, remaining, resetAt, reason |
| `KoraLinkRateLimiter` | type | Interface: `{ check(ctx): Promise<Decision> }` |
| `KORA_LINK_RATE_LIMIT_WINDOW_MS` | const | `60_000` — re-exported da config |
| `KORA_LINK_PUBLIC_ROUTE_LIMIT` | const | `30` scan/finestra — route pubblica `/link/[token]` |
| `KORA_LINK_ACTIVATION_LIMIT` | const | `10` — attivazione chip |
| `KORA_LINK_PARTNER_SCAN_LIMIT` | const | `60` — scan partner Track A |
| `KORA_LINK_ADMIN_BATCH_LIMIT` | const | `10` — batch admin |
| `getKoraLinkRateLimitPolicy(route)` | fn | Restituisce `{ limit, windowMs }` per ogni route — lancia se route sconosciuta |
| `createDisabledKoraLinkRateLimiter()` | fn | Always-allow — dev/test only |
| `createUnavailableKoraLinkRateLimiter(provider)` | fn | Always-deny — provider assente o non integrato |
| `createKoraLinkRateLimiter(env?)` | fn | Factory: seleziona adapter da config — blocca in production se missing/disabled |
| `assertKoraLinkRateLimitProductionSafe(env?)` | fn | Guard startup: lancia se production con provider missing o disabled |
| `createRateLimitIdentifier(parts)` | fn | Crea identifier stabile per rate limit bucket — non accetta token raw |

#### Aggiunta a `lib/kora-link/config.ts`

| Export | Tipo | Scopo |
|--------|------|-------|
| `getKoraLinkRateLimitProvider(env?)` | fn | Legge `KORA_LINK_RATE_LIMIT_PROVIDER` — null se assente, throw se valore non riconosciuto |

### Provider status KL-08

| Provider | Status | Comportamento factory |
|----------|--------|-----------------------|
| `null` (assente) | — | dev/test: unavailable/denied · production: throws |
| `'disabled'` | Dev/test only | dev/test: always-allow · production: throws |
| `'upstash'` | Pending KL-09+ | qualsiasi env: unavailable/not_implemented |

### Regole production enforcement

```
KORA_LINK_RATE_LIMIT_PROVIDER missing  → blocca in production (throw da factory + assertKoraLinkRateLimitProductionSafe)
KORA_LINK_RATE_LIMIT_PROVIDER=disabled → blocca in production (throw da factory + assertKoraLinkRateLimitProductionSafe)
KORA_LINK_RATE_LIMIT_PROVIDER=upstash  → accettato (Upstash non integrato → denied per ogni request — enforcement a livello route in KL-09+)
```

### Copertura test

| File | Test | Suite |
|------|------|-------|
| `kora-link-rate-limit.test.ts` | 57 | 7 |
| `kora-link-config.test.ts` (delta KL-08) | +7 | +1 (`getKoraLinkRateLimitProvider`) |

| Suite (rate-limit) | Test |
|--------------------|------|
| Constants | 5 |
| getKoraLinkRateLimitPolicy | 8 |
| createDisabledKoraLinkRateLimiter | 8 |
| createUnavailableKoraLinkRateLimiter | 7 |
| createKoraLinkRateLimiter | 9 |
| assertKoraLinkRateLimitProductionSafe | 7 |
| createRateLimitIdentifier | 13 |

### Metriche

- File creati: 2 (`lib/kora-link/rate-limit.ts`, `tests/unit/kora-link-rate-limit.test.ts`)
- File modificati: 3 (`lib/kora-link/config.ts`, `tests/unit/kora-link-config.test.ts`, `docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze aggiunte: 0
- Provider Upstash integrato: no
- Produzione con provider missing/disabled bloccata: sì
- TypeScript: 0 errori
- ESLint: 0 errori, 0 warning
- Vitest: 8315/8315 passed (+63 rispetto a KL-07)
- Build: OK
- E2E: 6/6 passed

### Gate status post-KL-08

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-07 | ✅ COMPLETATI |
| KL-08 Rate Limit Adapter Skeleton | ✅ COMPLETATO |
| KL-09 Route pubblica `/link/[token]` | Prerequisiti: `KORA_LINK_ENABLED=true` · `KORA_LINK_RATE_LIMIT_PROVIDER=upstash` + Upstash Redis integrato · Gate 2+3 |

---

## KL-01 — KORA Link v1 Design Doc

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1`
**Tipo:** Design only — nessuna modifica runtime

### Contenuto

Creato `docs/KORA_LINK_V1_DESIGN.md` — design tecnico-funzionale completo di KORA Link v1.

Sezioni prodotte (21 sezioni, design-only):

| Sezione | Contenuto |
|---------|-----------|
| §1 Executive Summary | Descrizione KORA Link v1, bridge fisico-digitale, NFC anonimo |
| §2 Product Doctrine | 9 principi non negoziabili |
| §3 Actors | KORA_ADMIN, COMPANY_ADMIN/VIEWER, WORKER, PARTNER_OPERATOR/ADMIN, ADVISOR |
| §4 Object Model | 11 entità concettuali (batch, chip, token, assignment, activation, consent, event, partner scan, revocation, replacement, audit) |
| §5 Token Model | Random, non-sequenziale, revocabile, hashing, comportamento per stato |
| §6 NFC Chip Content | Solo URL+token; lista esaustiva dati proibiti |
| §7 Lifecycle | Fasi A-L: generated → delivered → activated → active → revoked |
| §8 Worker Activation Flow | Diagramma flow completo, tutti i casi edge |
| §9 Company Flow | Dati visibili (aggregati), dati mai visibili |
| §10 KORA Admin Flow | Batch, stato, revoca, break-glass, replacement |
| §11 Partner Flow | v1 (no partner), v1.1 (scan pilot), v2 (full L4) |
| §12 Two-Track Event Model | Track A (verified partner) vs Track B (collective/KORA Space); no double counting |
| §13 Privacy Boundary | Tabella completa: 11 dati × 6 ruoli |
| §14 Security/Threat Model | 14 rischi con mitigazione v1/futura |
| §15 Audit Model | 13 audit events obbligatori; invarianti audit |
| §16 Feature Flag | `KORA_LINK_ENABLED` — regole, default off |
| §17 V1 Scope | Cosa entra in v1 con gate reference |
| §18 Out of Scope | Lista esaustiva esclusi (incluso employer monitoring, ranking, `gov.kip_records`) |
| §19 Future Migrations | Piano concettuale 034 (schema) + 035 (RLS) — no SQL |
| §20 Open Questions | 15 domande aperte pre-KL-02 |
| §21 Implementation Gates | KL-01 → KL-09: gate sequenziali con prerequisiti |

### Metriche

- File creati: 2 (`docs/KORA_LINK_V1_DESIGN.md`, `docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8079/8079 green (branch base, pre-CC improvements)
- Build: OK

### Gate status

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN — blocca KL-02+ |
| Gate 3 (DPO/legal) | OPEN — blocca KL-04+ |
| KL-01 (Design) | ✅ COMPLETATO |
| KL-02 (Threat model + schema) | Non iniziato — in attesa review KL-01 |

### Open questions prioritarie (pre-KL-02)

- OQ-01: URL dominio finale chip NFC
- OQ-02: Token hashing sì/no
- OQ-03: TTL token
- OQ-12: Schema isolation (`kora_link.*` vs integrato)

---

## KL-02 — Decision Gate: Open Questions + Branch Strategy

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1`
**Tipo:** Decisionale — nessuna modifica runtime

### Contenuto

Creato `docs/KORA_LINK_KL02_DECISION_GATE.md` — documento decisionale pre-codice KORA Link.

| Sezione | Contenuto |
|---------|-----------|
| §1 Executive Summary | Stato post-KL-01; divergenza branch; cosa serve prima del codice |
| §2 Branch Topology | Merge base `eaecdad`; 1 ahead / 10 behind `platform/readiness`; perché questa divergenza blocca il codice |
| §3 OQ-01→OQ-04/OQ-12 | 5 domande critiche con analisi opzioni e raccomandazione netta |
| §4 Additional OQs | 16 domande addizionali con owner, blocco codice/produzione |
| §5 Recommended Decisions | Tabella decisioni raccomandate con rationale e residual risk |
| §6 Branch Strategy Options | Analisi A/B/C dettagliata con pro/contro |
| §7 Recommended Strategy | **Option B** — nuovo branch `feat/kora-link-v1-platform` da `platform/readiness` + cherry-pick KL-01 |
| §8 Pre-Migration Gates | 10 gate (MG-01→MG-10) con status |
| §9 Pre-Runtime Gates | 13 gate (RG-01→RG-13) con status |
| §10 Next KL Prompts | Sequenza KL-03→KL-08 |

### Decisioni raccomandate chiave

| OQ | Decisione |
|----|-----------|
| OQ-01 URL dominio | `https://app.kora.ai/link/<token>` — stessa app, nessuna infra aggiuntiva |
| OQ-02 Token hash | Solo hash BLAKE2b+salt — DB leak non espone token attivi |
| OQ-03 TTL | 180gg pre-attivazione, nessun TTL post-attivazione v1 |
| OQ-04 Pre-assignment | Batch↔tenant server-side; chip rimane anonimo |
| OQ-12 Schema | `kora_link.*` dedicato — isolamento e revocabilità completi |

### Branch strategy raccomandata

**Option B:** `feat/kora-link-v1-platform` da `platform/readiness` + cherry-pick `361829a` (KL-01).

Motivazione: KORA Link codice deve partire dalla base hardenizzata CC-07→CC-15; cherry-pick zero-risk (2 doc files); storia pulita; non blocca review CTO di `platform/readiness`.

### Metriche

- File creati: 1 (`docs/KORA_LINK_KL02_DECISION_GATE.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8079/8079 green
- Build: OK

### Gate status post-KL-02

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy execution | In attesa approvazione Founder/CTO su OQ + Option B |

---

## KL-04 — Token Threat Model

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Design only — nessuna modifica runtime

### Contenuto

Creato `docs/KORA_LINK_TOKEN_THREAT_MODEL.md` — threat model tecnico completo del token KORA Link.

| Sezione | Contenuto |
|---------|-----------|
| §1 Executive Summary | Token anonimo, HMAC-SHA256, rate limiting bloccante |
| §2 Token asset definition | Cosa è/non è il token; perché non è credenziale da sola |
| §3 Token generation | CSPRNG, 48 char base62, prefisso `kl1_`, ~285 bit entropia |
| §4 Token storage comparison | Opzioni A/B/C/D con pro/contro/rischio |
| §5 Storage decision | **HMAC-SHA256 + `KORA_LINK_TOKEN_SECRET`** — definitivo |
| §6 Token lifecycle | 10 stati con transizioni, visibilità per ruolo, audit |
| §7 TTL policy | 180gg pre-attivazione, no TTL post v1, replacement |
| §8 Public route behavior | Tabella completa per ogni condizione di stato |
| §9 Uniform error/timing | 404 uniforme, timing oracle, messaggi pubblici |
| §10 Logging policy | Cosa non loggare mai; cosa loggare; IP/DPO |
| §11 Rate limiting | Per-endpoint, Upstash Redis, bloccante per prod |
| §12 Replay/abuse | 13 rischi con mitigazione v1/futura e blocco codice/prod |
| §13 Lost/stolen/replacement | Processo end-to-end per worker, company, admin |
| §14 Partner scan constraints | Vincoli v1.1+: privacy, accreditamento, no double counting |
| §15 Migration 034 requirements | Tabelle, enum, indici, vincoli per `kora_link.*` |
| §16 RLS 035 requirements | Deny-by-default, policy per tabella, SECURITY DEFINER |
| §17 Environment/secrets | `KORA_LINK_TOKEN_SECRET` spec, lunghezza, rotazione |
| §18 Acceptance criteria — migration | 14 item checklist |
| §19 Acceptance criteria — runtime | 15 item checklist |
| §20 Final recommendation | Storage, TTL, route behavior, rate limiting; KL-05 sì |

### Decisioni chiave

| Tema | Decisione |
|------|-----------|
| Hash algorithm | **HMAC-SHA256** (non BLAKE2b — nativo Node, standard, difendibile) |
| Token format | `kl1_` + 48 char base62 → ~285 bit entropia |
| Storage | Solo `token_digest` nel DB — cleartext mai persistito |
| Secret | `KORA_LINK_TOKEN_SECRET` env var, 256 bit, staging/prod separati |
| TTL | 180gg pre-attivazione; no TTL post-attivazione v1 |
| 404 uniforme | Missing = revocato = scaduto = sospeso (no oracle) |
| Rate limiting | Upstash Redis — bloccante per produzione, opzionale staging |

### OQ risolte da KL-04

- OQ-02: HMAC-SHA256 confermato (supera BLAKE2b per praticità Node/Next)
- OQ-06: token length = 48 char base62 (+ prefisso `kl1_`)
- OQ-07: charset = base62 [A-Za-z0-9]
- Versioning: prefisso `kl1_` per migration futura algoritmo

### Metriche

- File creati: 1 (`docs/KORA_LINK_TOKEN_THREAT_MODEL.md`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Codice runtime modificato: 0
- Migrations create: 0
- TypeScript: 0 errori
- Vitest: 8128/8128 green
- Build: OK
- E2E Playwright: 6/6 passed

### Gate status post-KL-04

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy | ✅ COMPLETATO |
| KL-04 Token Threat Model | ✅ COMPLETATO |
| KL-05 Migration 034 draft | In attesa approvazione CTO su token strategy + schema |

---

## KL-05 — Migration 034 Draft: KORA Link Schema

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** SQL draft in `supabase/proposed/` — NON applicato a nessun database

### Contenuto

Creato `supabase/proposed/034_kora_link_schema.sql` — draft schema KORA Link
per review CTO/Postgres/DPO. NON in `supabase/migrations/`.

### Stile repo rilevato da audit 031/032/033

| Aspetto | Scelta repo | Applicato in 034 |
|---------|------------|-----------------|
| Enum | `text + CHECK` (non `CREATE TYPE`) | ✅ Sì |
| PK | `uuid DEFAULT gen_random_uuid()` | ✅ Sì |
| Timestamps | `timestamptz NOT NULL DEFAULT now()` | ✅ Sì |
| updated_at | Trigger `set_updated_at()` (mig 001) | ✅ Sì |
| Index naming | `idx_<table>_<col>` | ✅ Sì |
| FK tenant_id | No FK (repo pattern da 033) | ✅ Sì |
| Header | Block comment con gate/prerequisiti | ✅ Sì |
| Transaction | `BEGIN;` / `COMMIT;` | ✅ Sì |
| PostgREST reload | `NOTIFY pgrst, 'reload schema';` | ✅ Sì |
| RLS | In file separato (035) | ✅ Sì (solo TODO commentati) |

### Tabelle nel draft

| # | Tabella | Scopo |
|---|---------|-------|
| 1 | `kora_link.link_batches` | Batch admin chip NFC |
| 2 | `kora_link.links` | Token record (digest-only, no cleartext) |
| 3 | `kora_link.link_assignments` | Associazione token↔worker post-consenso |
| 4 | `kora_link.link_consents` | Consenso worker all'informativa Link |
| 5 | `kora_link.link_events` | Log operativo eventi lifecycle |
| 6 | `kora_link.revocations` | Revoca/sospensione audit trail |
| 7 | `kora_link.link_replacements` | Catena replacement old→new token |
| 8 | `kora_link.partner_scans` | Placeholder Track A scan partner (v1.1+) |
| 9 | `kora_link.audit_log` | Audit append-only privacy-safe |
| 10 | `kora_link.public_lookup_attempts` | Supporto rate limiting public route |
| 11 | `kora_link.link_delivery_records` | Traccia consegna chip a company |

### Invarianti critici nel draft

- `token_value` (cleartext): **ZERO colonne** in tutto lo schema — confermato
- `UNIQUE(token_digest)` enforced via `CONSTRAINT uq_link_token_digest`
- `UNIQUE(link_id) WHERE status = 'active'` su `link_assignments` — un solo assignment attivo per token
- `partner_scans` non alimenta IU/PIB/Index — commento esplicito nel file
- Nessuna policy RLS — solo TODO commentati per 035
- 8 TODO CTO espliciti per review pre-apply

### Metriche

- File creati: 1 (`supabase/proposed/034_kora_link_schema.sql`, 1272 righe)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- File in `supabase/migrations/`: 0 nuovi
- Codice runtime modificato: 0
- TypeScript: 0 errori
- Vitest: 8128/8128 green
- Build: OK
- E2E Playwright: 6/6 passed

### Gate status post-KL-05

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN — review di 034 è il gate |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy | ✅ COMPLETATO |
| KL-04 Token Threat Model | ✅ COMPLETATO |
| KL-05 Migration 034 draft | ✅ COMPLETATO — in attesa review CTO |
| KL-06 RLS 035 draft | In attesa approvazione CTO su schema 034 |

---

---

## KL-06 — Token Core: generazione, validazione, digest, redazione

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route

### Contenuto

Creato `lib/kora-link/token.ts` — modulo server-only per il token core KORA Link.
Creato `tests/unit/kora-link-token.test.ts` — 65 test unit copertura completa.

### Funzioni esportate

| Funzione | Scopo |
|----------|-------|
| `generateToken()` | Genera token CSPRNG `kl1_<48 base62>` con rejection sampling (no modulo bias) |
| `validateTokenFormat(token)` | Valida formato — restituisce `{ valid: true }` o `{ valid: false, reason }`, mai eccezione |
| `isValidTokenFormat(token)` | Type guard booleano su `validateTokenFormat` |
| `computeDigest(tokenValue, secret)` | HMAC-SHA256(tokenValue, secret) → 64-char hex — unico valore da persistere in DB |
| `digestPrefix(digest)` | Restituisce i primi 8 char del digest — per audit log, non come lookup key |
| `getTokenSecret()` | Legge `KORA_LINK_TOKEN_SECRET` da `process.env`; lancia eccezione se assente o < 64 char |
| `redactToken(input)` | Sostituisce ogni `kl1_<48 base62>` con `kl1_[REDACTED]` — chiamare prima di qualsiasi logger |

### Costanti esportate

| Costante | Valore | Note |
|----------|--------|------|
| `KORA_LINK_TOKEN_PREFIX` | `'kl1_'` | Prefisso versione 1 |
| `KORA_LINK_TOKEN_PAYLOAD_LENGTH` | `48` | Char base62 dopo il prefisso |
| `KORA_LINK_TOKEN_MIN_LENGTH` | `52` | Lunghezza totale (4 + 48) |
| `KORA_LINK_TOKEN_MAX_LENGTH` | `52` | Uguale a MIN in v1 |
| `KORA_LINK_TOKEN_DIGEST_LENGTH` | `64` | HMAC-SHA256 hex output |
| `KORA_LINK_TOKEN_DIGEST_PREFIX_LENGTH` | `8` | Char prefix per audit log |
| `KORA_LINK_SECRET_MIN_LENGTH` | `64` | 256 bit in hex |

### Invarianti rispettati

- `token_value` (cleartext): **mai passato a nessun logger** — `redactToken()` è il guardrail
- `KORA_LINK_TOKEN_SECRET`: letto da env, mai hardcodato, mai loggato
- Rejection sampling: byte ≥ 248 scartati — nessun modulo bias su base62
- `computeDigest` produce sempre hex lowercase di 64 char
- `digestPrefix` restituisce 8 char per correlazione audit, non come lookup key
- Nessuna importazione da client/browser; `node:crypto` only

### Copertura test (65 test, 8 suite)

| Suite | Test |
|-------|------|
| Constants | 7 — valori canonici verificati |
| generateToken | 7 — formato, unicità 1000 campioni, copertura charset |
| validateTokenFormat (valid) | 3 — casi corretti |
| validateTokenFormat (invalid) | 13 — null, undefined, numero, vuoto, prefisso errato, lunghezza errata, char non-base62 |
| isValidTokenFormat | 3 — type guard |
| computeDigest | 8 — determinismo, differenza per input diversi, unicità 1000 digest, eccezioni |
| digestPrefix | 6 — lunghezza, valore, hex, eccezioni |
| getTokenSecret | 6 — env mancante, vuoto, troppo corto, valido, eccezione con messaggio bit |
| redactToken | 10 — token bare, in frase, in URL, multipli, assente, parziale, da generateToken |

### File non modificati

- Nessuna route `/link/[token]`
- Nessuna UI
- Nessuna migration
- Nessun file `.env`
- `supabase/proposed/034_kora_link_schema.sql` non modificato
- Nessun codice RLS, auth, middleware, service-role, Supabase client

### Metriche

- File creati: 2 (`lib/kora-link/token.ts`, `tests/unit/kora-link-token.test.ts`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze npm aggiunte: 0 (solo `node:crypto` nativo)
- TypeScript: 0 errori (`tsc --noEmit`)
- Vitest KL-06: 65/65 passed
- Vitest suite completa: 8193/8193 passed (+65 rispetto a KL-05)
- Build: non rilanciate (no modifica route/UI)
- Supabase usato: no
- DB connesso: no
- SQL eseguito: no

### Gate status post-KL-06

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 Design | ✅ COMPLETATO |
| KL-02 Decision Gate | ✅ COMPLETATO |
| KL-03 Branch strategy | ✅ COMPLETATO |
| KL-04 Token Threat Model | ✅ COMPLETATO |
| KL-05 Migration 034 draft | ✅ COMPLETATO — in attesa review CTO |
| KL-06 Token Core | ✅ COMPLETATO |
| KL-07 Route pubblica `/link/[token]` | Prerequisiti: `KORA_LINK_ENABLED` feature flag; rate limiting Upstash; Gate 2+3 |

---

---

## KL-07 — Runtime Config Core

**Data:** 2026-06-30
**Branch:** `feat/kora-link-v1-platform`
**Tipo:** Codice TypeScript runtime + test unit — nessuna migration, nessuna UI, nessuna route

### Contenuto

Creato `lib/kora-link/config.ts` — modulo server-only per configurazione KORA Link.
Creato `tests/unit/kora-link-config.test.ts` — 59 test unit, copertura completa.

### Funzioni e costanti esportate

| Export | Tipo | Scopo |
|--------|------|-------|
| `KoraLinkEnv` | type | Subset env per KORA Link — accetta `process.env` e oggetti parziali nei test |
| `KoraLinkReadinessResult` | type | `{ ready: true }` o `{ ready: false; missing: string[] }` |
| `KoraLinkRateLimitConfig` | type | Shape config rate limiting |
| `KORA_LINK_RATE_LIMIT_WINDOW_MS` | const | `60_000` (1 minuto) |
| `KORA_LINK_RATE_LIMIT_MAX_PUBLIC` | const | `20` scansioni per finestra |
| `KORA_LINK_RATE_LIMIT_KEY_PREFIX` | const | `'kl:rl:pub:'` — prefix Redis |
| `isKoraLinkEnabled(env?)` | fn | `true` solo se `KORA_LINK_ENABLED === 'true'` — case-sensitive, default off |
| `getKoraLinkPublicBaseUrl(env?)` | fn | Legge e valida URL, strip trailing slash, lancia se assente/invalida |
| `getKoraLinkReadiness(env?)` | fn | Check non-bloccante — non lancia mai |
| `assertKoraLinkReady(env?)` | fn | Guard bloccante per route handler |
| `getKoraLinkRateLimitConfig()` | fn | Restituisce config rate limiting — nessun provider integrato |

### Design pattern

Tutte le funzioni accettano `env?: KoraLinkEnv` con default `process.env`.
Nessuna lettura env al top-level: il modulo è sicuro per test e build.

```ts
// test injection — nessun process.env polluted
getKoraLinkReadiness({ KORA_LINK_ENABLED: 'true', ... });

// produzione
assertKoraLinkReady(); // legge process.env
```

### Note TypeScript (TS2559)

`KoraLinkEnv` include un index signature `[key: string]: string | undefined` oltre alle named properties. Necessario in TypeScript 5.9 per passare `process.env` come default (weak-type check). I named keys restano come documentazione e type hint.

### Copertura test (59 test, 7 suite)

| Suite | Test |
|-------|------|
| Constants | 4 |
| isKoraLinkEnabled | 9 — tutti i valori falsy + 'true' esatto |
| getKoraLinkPublicBaseUrl (valid) | 7 — https, http, trailing slash, porta, path |
| getKoraLinkPublicBaseUrl (invalid) | 7 — assente, non-URL, protocollo non supportato, no info leak |
| getKoraLinkReadiness | 13 — tutti i casi ready/not-ready, conteggio missing |
| assertKoraLinkReady | 7 — no-throw, throws, errore non espone secret |
| getKoraLinkRateLimitConfig + type shapes | 11 |

### Metriche

- File creati: 2 (`lib/kora-link/config.ts`, `tests/unit/kora-link-config.test.ts`)
- File modificati: 1 (`docs/KORA_LINK_CHANGELOG.md`)
- Dipendenze aggiunte: 0
- TypeScript: 0 errori nel codice KL (errori `.next/dev/types/validator.ts` pre-esistenti, file gitignored)
- Vitest KL-07: 59/59 passed
- Vitest suite totale: 8252/8252 (+59 rispetto a KL-06)
- Build: OK
- E2E: 6/6 passed
- ESLint: 0 errori, 0 warning

### Gate status post-KL-07

| Gate | Status |
|------|--------|
| Gate 2 (CTO schema review) | OPEN |
| Gate 3 (DPO/legal) | OPEN |
| KL-01 → KL-06 | ✅ COMPLETATI |
| KL-07 Runtime Config Core | ✅ COMPLETATO |
| KL-08 Route `/link/[token]` | Prerequisiti: `KORA_LINK_ENABLED=true` · Upstash Redis · Gate 2+3 |

---

*KORA_LINK_CHANGELOG.md — KL-07 · 2026-06-30*
