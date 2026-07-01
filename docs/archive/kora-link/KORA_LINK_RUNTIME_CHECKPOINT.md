# KORA Link — Runtime Checkpoint KL-11

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Commit HEAD:** `9d00270` — KL-10 add KORA Link public route skeleton
**Autore:** KORA Engineering (Founder-led)

---

## 1. Executive Summary

KORA Link ha completato la fase di runtime base. Esistono moduli reali e testati per:
generazione/validazione token, configurazione server-side, rate limiting multi-provider (disabled + Upstash Redis),
e il bordo pubblico della route `/link/[token]`.

La route pubblica esiste ed è operativa nella sua struttura, ma **non fa DB lookup, non fa activation, non associa token a worker**. La feature flag `KORA_LINK_ENABLED` è default off: il sistema è safe-by-default in ogni ambiente.

Lo schema 034 (`kora_link.*`) esiste solo in `supabase/proposed/` — non è stato applicato a nessun database. RLS 035 non è stato ancora redatto. Nessuna migration KORA Link è presente in `supabase/migrations/`.

Il prossimo salto funzionale (DB lookup → activation → worker flow) richiede:
- review CTO/Postgres dello schema 034 (Gate 2);
- review DPO/legal per privacy notice e consent (Gate 3);
- draft e review RLS 035 (Gate 4);
- environment staging configurato e approvato (Gate 5).

Nessuno di questi step deve essere eseguito prima della chiusura dei gate corrispondenti.

---

## 2. Implemented Runtime Components

| Componente | File | Commit | Stato | Cosa fa | Cosa NON fa |
|-----------|------|--------|-------|---------|-------------|
| Token Core | `lib/kora-link/token.ts` | `e922080` | ✅ Production-ready | Genera token CSPRNG `kl1_<48 base62>`, valida formato, computa digest HMAC-SHA256, redatta token da log, legge secret da env | Non persiste digest, non fa DB lookup |
| Runtime Config | `lib/kora-link/config.ts` | `af44e17` | ✅ Production-ready | Feature flag, base URL, readiness check, rate limit config, provider selector | Non wira provider, non ha Supabase |
| Rate Limit Skeleton | `lib/kora-link/rate-limit.ts` | `f94e434` (KL-08) → `4ed26f7` (KL-09) | ✅ Production-ready | Policy per-route, disabled/unavailable adapter, Upstash adapter (lazy sliding window), factory con production guard, identifier builder | Non persiste contatori localmente (usa Upstash) |
| Public Route | `app/link/[token]/page.tsx` | `9d00270` | ✅ Skeleton complete | Server component `runtime=nodejs`, valuta stato via helper, notFound() per hidden/invalid, pagine safe per unavailable/rate_limited/skeleton | Nessun DB lookup, nessuna activation, nessuna UI completa |
| Route State Helper | `lib/kora-link/public-route.ts` | `9d00270` | ✅ Production-ready | `evaluateKoraLinkPublicRouteState()`: flag → format → readiness → rate limit → skeleton; tutto injectable | Nessun DB, nessun Supabase |
| Schema 034 draft | `supabase/proposed/034_kora_link_schema.sql` | `ff4a31b` | ⚠️ Draft — non applicato | 11 tabelle `kora_link.*`, pattern repo-consistente, 8 TODO CTO | Non in `migrations/`, non applicato, RLS assente |

### Test unitari KORA Link

| File test | Commit | Test | Suite | Copre |
|-----------|--------|------|-------|-------|
| `tests/unit/kora-link-token.test.ts` | `e922080` | 65 | 8 | Generazione, validazione, digest, redaction, secret |
| `tests/unit/kora-link-config.test.ts` | `af44e17` + `f94e434` | 66 | 8 | Flag, base URL, readiness, provider selector |
| `tests/unit/kora-link-rate-limit.test.ts` | `f94e434` + `4ed26f7` | 59 | 7 | Policy, disabled, unavailable, factory, production guard, identifier |
| `tests/unit/kora-link-rate-limit-upstash.test.ts` | `4ed26f7` | 35 | 4 | Upstash env status, assert, construction, check() |
| `tests/unit/kora-link-public-route.test.ts` | `9d00270` | 28 | 6 | Flag off, format, readiness, rate limit, skeleton, privacy |
| **Totale KORA Link** | | **253** | **33** | |

---

## 3. Commit Timeline KL-01 → KL-10

| Step | Commit | Titolo | Tipo | Test | Note |
|------|--------|--------|------|------|------|
| KL-01 | `b2b99ad` | define KORA Link v1 design | docs | — | Design doc 21 sezioni, design-only |
| KL-02 | `9a5cad0` | define KORA Link decision gate | docs | — | OQ-01→OQ-15 risolte, Option B branch strategy |
| KL-03 | *(branch)* | Branch `feat/kora-link-v1-platform` da `platform/readiness` | infra | — | Cherry-pick KL-01 docs; nessun commit dedicato |
| KL-04 | `a83a449` | define KORA Link token threat model | docs | — | HMAC-SHA256 confermato, TTL policy, 14 rischi |
| KL-05 | `ff4a31b` | draft KORA Link schema 034 | schema draft | — | `supabase/proposed/` — NON in migrations |
| KL-06 | `e922080` | token core — generation, validation, digest, redaction | runtime | +65 | `lib/kora-link/token.ts`, `node:crypto` only |
| KL-07 | `af44e17` | runtime config core | runtime | +66 | `lib/kora-link/config.ts`, env injectable |
| KL-08 | `f94e434` | rate limit skeleton | runtime | +57→59 | Adapter pattern, production guard, disabled/unavailable |
| KL-09 | `4ed26f7` | Upstash rate limiter | runtime + deps | +35 | `@upstash/redis` + `@upstash/ratelimit`, lazy sliding window |
| KL-10 | `9d00270` | public route skeleton | route | +28 | `app/link/[token]/page.tsx`, notFound() safe pattern, AppShell public |

---

## 4. Current Public Route Behavior

La route `/link/[token]` (server component, `runtime=nodejs`, `force-dynamic`) segue questa logica:

```
GET /link/<rawToken>
  ├─ KORA_LINK_ENABLED != 'true'  → notFound()      [no oracle, non rivela nulla]
  ├─ token formato non valido      → notFound()      [no oracle, prima di qualsiasi operazione]
  ├─ runtime non pronto            → UnavailablePage [secret/base URL mancanti]
  ├─ rate limiter throw/missing    → UnavailablePage [factory throw catturato safe]
  ├─ rate limit denied             → RateLimitedPage [429-like, nessun dettaglio]
  └─ all checks passed             → SkeletonPage    [pagina minimale, nessun dato]
```

**Non fa:**
- nessuna query Supabase
- nessun DB lookup per token_digest
- nessuna activation worker
- nessuna associazione token↔worker
- nessun consent record
- nessun scoring o Impact Unit
- nessun dato personale / company / partner
- nessun log del token raw

---

## 5. Privacy Posture

| Invariante | Status |
|-----------|--------|
| Token cleartext mai persistito in DB | ✅ — 034 non ha colonne `token_value` |
| Token raw mai loggato | ✅ — nessun `console.*` nei moduli runtime; `redactToken()` disponibile |
| Digest HMAC-SHA256 | ✅ — `computeDigest()` in `token.ts`, `node:crypto` only |
| `KORA_LINK_TOKEN_SECRET` server-side only | ✅ — letto da env, mai esposto in risposta o error |
| Route pubblica non rivela esistenza token | ✅ — `notFound()` sia per flag off che per token malformato |
| Nessuna visibilità employer su dati individuali | ✅ — route non usa Supabase, non ha output individuale |
| Nessuna associazione token↔worker | ✅ — non implementata in KL-10 |
| Nessun dato personale nel chip NFC | ✅ — chip contiene solo URL; spec in KL-04 |
| AppShell non mostra chrome autenticato | ✅ — `/link/` in `PUBLIC_ROUTE_PREFIXES` |
| Identifier rate limit anonimo | ✅ — default `anonymous:public_link`; raw token non usato come key |

---

## 6. Security Posture

| Controllo | Status |
|-----------|--------|
| Feature flag `KORA_LINK_ENABLED` default off | ✅ |
| Rate limiting presente e obbligatorio in production | ✅ — Upstash sliding window 60s |
| `provider=disabled` bloccato in production | ✅ — factory + production guard lancia |
| `provider` missing bloccato in production | ✅ — idem |
| Token format validation prima di ogni operazione | ✅ — secondo check dopo flag |
| Errori privacy-safe (no oracle, no raw value leak) | ✅ — tutti gli stati testati |
| Nessun `console.log` token o secret | ✅ — verificato lint + grep |
| Nessun import Supabase nei moduli KORA Link | ✅ — verificato grep |
| Nessuna chiamata service-role | ✅ |
| Nessun DB lookup | ✅ |
| `runtime='nodejs'` — non Edge | ✅ — necessario per `node:crypto` |

---

## 7. Testing Status

| Metrica | Valore | Nota |
|---------|--------|------|
| TypeScript (`tsc --noEmit`) | ✅ 0 errori | Verificato post KL-10 |
| Vitest totale suite | ✅ **8381/8381** | 198 file di test |
| Vitest KORA Link (5 file) | ✅ **253/253** | 33 suite |
| — `kora-link-token` | ✅ 65 | 8 suite |
| — `kora-link-config` | ✅ 66 | 8 suite |
| — `kora-link-rate-limit` | ✅ 59 | 7 suite |
| — `kora-link-rate-limit-upstash` | ✅ 35 | 4 suite (mock SDK, zero network) |
| — `kora-link-public-route` | ✅ 28 | 6 suite (env + limiter injection) |
| Build Next.js | ✅ OK | `/link/[token]` come route `ƒ Dynamic` |
| E2E Playwright | ✅ 6/6 | Smoke suite pubbliche, nessuna regressione |
| ESLint (file KL-10) | ✅ 0 errori, 0 warning | |

---

## 8. What Is NOT Implemented

I seguenti componenti **non esistono ancora** e non devono essere implementati prima della chiusura dei gate indicati:

| Componente | Gate bloccante | Note |
|-----------|---------------|------|
| DB lookup `token_digest → link record` | Gate 2 (schema) + Gate 4 (RLS) | Richiede 034 applicato + 035 RLS |
| Worker activation flow | Gate 2 + Gate 3 + Gate 4 | Richiede consent, privacy notice DPO-approvata |
| Consent record creation | Gate 3 (DPO/legal) | Testo privacy notice da approvare |
| Token↔worker assignment | Gate 2 + Gate 3 + Gate 4 | |
| Admin batch generation UI | Gate 2 | Richiede tabella `link_batches` |
| Company operational dashboard | Gate 2 + Gate 4 | Solo dati aggregati, RLS obbligatoria |
| Partner scan (Track A) | Gate 2 + Gate 3 + Gate 4 + Gate 8 | v1.1+ scope |
| Impact Units da scan KORA Link | Gate 2+ | Fuori da KL-10 scope |
| PIB update da Link event | Gate 2+ | |
| KORA Index effect da Link | Gate 2+ | |
| KORA Contribution da Link | Gate 2+ | |
| RLS 035 | Gate 4 | Non ancora redatto |
| Promotion 034 → `supabase/migrations/` | Gate 2 chiuso | Nessuna migration applicabile prima |
| Staging env abilitato | Gate 5 | `KORA_LINK_ENABLED=true` in staging |
| Production enablement | Gate 6 | Rate limiter + review completa |

---

## 9. Current Blockers

| Blocker | Tipo | Gate |
|---------|------|------|
| CTO/Postgres review di 034 (8 TODO espliciti nel file) | Architetturale | Gate 2 |
| Decisione FK targets (pro/contro vs repo pattern) | Schema | Gate 2 |
| Decisione `UNIQUE NULLS NOT DISTINCT` PostgreSQL ≥15 | Compatibilità | Gate 2 |
| Decisione colonna generated `scan_date` | Schema | Gate 2 |
| Decisione indici ridondanti su UNIQUE constraint | Performance | Gate 2 |
| Decisione retention audit log | Compliance | Gate 2 + Gate 3 |
| Draft RLS 035 (deny-by-default per tutte le tabelle) | Sicurezza | Gate 4 |
| Privacy notice testo (lingua, versione, consent) | Legale | Gate 3 |
| DPO review privacy notice activation | Legale | Gate 3 |
| Strategia account staging per test reali | Infra | Gate 5 |
| Upstash env staging (URL + token) | Infra | Gate 5 |
| Policy IP hashing/logging per rate limit | Privacy | Gate 3 |
| Break-glass policy per KORA Admin override | Governance | Gate 2 + Gate 3 |

---

## 10. Recommended Next Steps

Tre opzioni possibili per il prossimo ciclo:

### Option A — DB/RLS path (RACCOMANDATA)

Sblocca il gate critico architetturale prima di qualsiasi altra cosa.

```
KL-12: CTO review checklist for 034 — tutti gli 8 TODO risolti
KL-13: draft 035 RLS in proposed — deny-by-default per tutte le tabelle kora_link.*
KL-14: RLS negative test plan — verifica che employer non veda dati individuali
KL-15: promote 034+035 solo dopo dual review (CTO + DPO)
```

**Perché prima:** senza schema applicato e RLS, nessun'altra funzionalità KORA Link può essere costruita. Runtime base è pronto. Il collo di bottiglia è il Gate 2.

### Option B — Runtime safety path

Rafforzare la resilienza del bordo pubblico prima di toccare DB.

```
KL-12: middleware timeout guard / Supabase paused resilience test
KL-13: E2E smoke suite per /link/[token] con flag enabled/disabled
KL-14: staging env checklist e runbook
```

**Utile se** Gate 2 richiede più tempo del previsto e si vuole avanzare in parallelo.

### Option C — Product flow path

Definire il flusso worker prima di scrivere codice.

```
KL-12: worker activation UX spec (consent flow, pagine, stati)
KL-13: consent copy draft e privacy notice
KL-14: admin batch generation spec
```

**Utile se** si vuole avere il product design pronto prima che Gate 2 si chiuda.

**Raccomandazione:** **Option A** come asse principale. Option B e C in parallelo se le risorse lo consentono, ma non bloccanti.

---

*KORA_LINK_RUNTIME_CHECKPOINT.md — KL-11 · 2026-07-01*
*Branch: feat/kora-link-v1-platform · HEAD: 9d00270*
