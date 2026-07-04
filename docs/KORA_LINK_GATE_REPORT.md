# KORA Link — Gate Report KL-11

**Data:** 2026-07-01
**Branch:** `feat/kora-link-v1-platform`
**Commit HEAD:** `9d00270`
**Scopo:** Stato operativo dei gate di avanzamento per KORA Link v1

---

## KL-19 Addendum (2026-07-04) — Gate 2 Technical Review Closure

**This section updates the Gate 2 status below; the rest of this report (KL-11, 2026-07-01) is left as the historical record and is not otherwise rewritten.** See `docs/KORA_LINK_STATUS.md` for the current single-source status and `supabase/proposed/034_kora_link_schema.sql`'s header for the full resolution text.

KORA-LINK-S2 (KL-19) reviewed the 8 open TODOs listed in §3 below and closed the engineering-decidable portion:

| # | Tema | Esito KL-19 |
|---|------|-------------|
| TODO-1 (FK targets) | **RESOLVED** — no-FK cross-schema pattern confirmed consistent with migration 033 precedent; boundary now RLS-proven live by RLS-03/RLS-05/RLS-06 (merged 2026-07-04) |
| TODO-2 (`UNIQUE NULLS NOT DISTINCT`) | **Already resolved at KL-16** (partner_scans deferred to 036); KL-19 additionally confirmed `supabase/config.toml` pins Postgres `major_version = 17`, well above the PG15 floor that mattered |
| TODO-3 (generated `scan_date`) | **Already resolved at KL-16** (partner_scans deferred) |
| TODO-4 (redundant indexes) | **Already resolved at KL-16** (`idx_links_token_digest` removed — UNIQUE constraint already indexes it) |
| TODO-5 (audit log retention) | **PARTIALLY RESOLVED** — mechanism recommendation (Edge Function on schedule, not `pg_cron`) is an engineering call and is now documented; the retention **duration** itself remains a genuine **Gate 3 / DPO blocker** — cannot be resolved by engineering judgment |
| TODO-6 (schema naming) | **RESOLVED** — `kora_link` as a dedicated schema confirmed consistent with the repo's one-schema-per-domain convention (`analytics`/`personal`/`commons`/`gov`/`audit`/`network`) |
| TODO-7 (`public_lookup_attempts`) | **Already resolved at KL-16** — table removed; Upstash handles rate limiting operationally |
| TODO-8 (`link_delivery_records` scope) | **RESOLVED** — confirmed in-scope for v1; deferring to 036 would not reduce v1 scope since the functionality is needed by Gate 6/7 regardless of which migration file defines it |

**Net result:** of the 8 original TODOs, all are now either resolved-at-KL-16, resolved-at-KL-19, or reclassified as one of exactly 3 genuine Gate 3 (DPO/legal) blockers (audit log retention **duration**, `request_fingerprint` hashing strategy, `link_consents.consent_version`/`delivered_to_label` content approval — see `034`'s header for the precise BLOCKER text on each). **Zero open engineering/CTO questions remain in 034.** A human CTO should still formally ratify the KL-19 resolutions (this pass was an engineering/AI-assisted technical review, not a substitute for that ratification), but no further schema engineering work blocks it.

**Byproduct fix:** a naming inconsistency was found between `035`'s `TODO_SECURITY_DEFINER` spec section (which named functions `fn_kora_link_public_lookup`/`fn_kora_link_activate`/etc.) and `036`'s actual implementation (`fn_public_lookup_link`/`fn_activate_link_for_worker`/etc., which the runtime code in `lib/kora-link/public-lookup.ts`/`activation.ts` already correctly calls). Reconciled in `035` as a comment-only fix — no RLS policy or function logic was touched.

**Gate 2 row in §1 below should now read:** 🟡 SUBSTANTIVELY CLOSED (engineering) — human CTO ratification pending, no open engineering questions.
**Gate 4 row is unaffected by KL-19** — 035's own RLS review (worker-self-select policy, SECURITY DEFINER grants still commented out) remains open and separate; KL-19 only reconciled stale header references in 035/036, not their substance.

New test coverage: `tests/unit/kora-link-schema034-review.test.ts` (034/035/036 reference consistency, PG15-construct-elimination regression lock, public-lookup RPC minimality).

---

## 1. Gate Status Summary

| Gate | Nome | Stato | Owner | Blocca | Note |
|------|------|-------|-------|--------|------|
| Gate 1 | Runtime Base | ✅ COMPLETE | Engineering | — | KL-06→KL-10 completi |
| Gate 2 | Schema 034 Review | 🟡 SUBSTANTIVELY CLOSED (engineering) — KL-19, 2026-07-04 | CTO / Postgres | Human CTO ratification only — no open engineering questions | 5/8 TODO risolti con motivazione documentata; 3 riclassificati come blocker Gate 3 (DPO) — vedi addendum KL-19 sopra |
| Gate 3 | Privacy / DPO / Legal | 🔴 OPEN | DPO / Legal | Activation consent, partner scan, live data | Privacy notice non approvata |
| Gate 4 | RLS 035 Review | 🔴 OPEN — draft exists, incomplete | CTO + DPO | Qualsiasi DB write/read con RLS | 035 draft redatto (KORA_ADMIN-only su tutte le 9 tabelle); worker self-select e le due funzioni SECURITY DEFINER sono commentate — vedi `KORA_LINK_ADR.md` |
| Gate 5 | Staging Env | 🔴 OPEN — not ready | Engineering + Infra | Test reali con KORA_LINK_ENABLED=true | Dipende da Gate 2+3+4 |
| Gate 6 | Public Route Enablement | 🟡 SKELETON COMPLETE | Engineering | `KORA_LINK_ENABLED=true` in staging/prod | Richiede Gate 2+3+5 |
| Gate 7 | Worker Activation | 🔴 OPEN — not started | Engineering + DPO | Worker flow end-to-end | Dipende da Gate 2+3+4+6 |
| Gate 8 | Partner Scan | 🔴 OPEN — fuori scope v1 | Product + Engineering | Track A scan partner | v1.1+ scope |
| Gate 9 | Production Readiness | 🔴 OPEN | Engineering + CTO + DPO | Deploy production | Dipende da tutti i gate precedenti |

---

## 2. Gate 1 — Runtime Base

**Stato: ✅ COMPLETE**

### Evidenze

| Componente | File | Test | Status |
|-----------|------|------|--------|
| Token core | `lib/kora-link/token.ts` | 65 | ✅ |
| Runtime config | `lib/kora-link/config.ts` | 66 | ✅ |
| Rate limit adapter | `lib/kora-link/rate-limit.ts` | 59 | ✅ |
| Upstash adapter | (in rate-limit.ts) | 35 | ✅ |
| Public route helper | `lib/kora-link/public-route.ts` | 28 | ✅ |
| Public route page | `app/link/[token]/page.tsx` | — | ✅ server component |
| Schema 034 draft | `supabase/proposed/034_kora_link_schema.sql` | — | ⚠️ draft only |

**Vitest KORA Link:** 253/253 · **Build:** OK · **E2E:** 6/6 · **TypeScript:** 0 errori

### Gate 1 — Non bloccante

Gate 1 è chiuso. Nessuna azione richiesta prima di procedere con Gate 2.

---

## 3. Gate 2 — Schema 034 Review

**Stato: 🔴 OPEN — blocca DB lookup, activation, tutto il DB path**

**Owner:** CTO + DBA/Postgres specialist  
**File da revieware:** `supabase/proposed/034_kora_link_schema.sql`

### Decisioni pendenti (8 TODO CTO nel file)

| # | Tema | Decisione richiesta |
|---|------|-------------------|
| TODO-1 | FK targets | Confermare che nessuna FK punta a `public.users` / `auth.users` direttamente; pattern repo usa implicit FK via applicazione |
| TODO-2 | `UNIQUE NULLS NOT DISTINCT` | Sintassi disponibile solo in PostgreSQL ≥15; confermare versione Supabase instance |
| TODO-3 | Colonna generated `scan_date` | `GENERATED ALWAYS AS (scan_timestamp::date) STORED` — confermare compatibilità + performance |
| TODO-4 | Indici ridondanti su UNIQUE | Rimuovere `CREATE INDEX` ridondanti dove `UNIQUE CONSTRAINT` già crea l'indice |
| TODO-5 | Retention audit log | Definire policy retention `kora_link.audit_log` (GDPR, erasure request) |
| TODO-6 | Schema naming finale | Confermare `kora_link` vs integrazione in schema esistente |
| TODO-7 | `public_lookup_attempts` | Necessaria se rate limit è su Upstash? Ridondante? |
| TODO-8 | `link_delivery_records` | Scope v1 vs v1.1? Tabella necessaria al lancio? |

### Prerequisiti per chiusura Gate 2

```
✓ Tutti gli 8 TODO CTO risolti con decisione documentata
✓ Review Postgres per sintassi e compatibilità versione
✓ Conferma pattern FK coerente con resto del repo (027-033)
✓ Nessun `token_value` cleartext — confermato (0 colonne)
✓ UNIQUE(token_digest) confermato
✓ Script testato su istanza staging vuota (dry run)
✓ Approvazione formale CTO → 034 può passare in migrations/
```

### Cosa sblocca la chiusura di Gate 2

- Promozione 034 da `proposed/` → `supabase/migrations/`
- Draft RLS 035 (Gate 4 può partire)
- DB lookup `token_digest → link record` (KL-12+)
- Admin batch generation
- Company aggregate view

---

## 4. Gate 3 — Privacy / DPO / Legal

**Stato: 🔴 OPEN — blocca activation consent, qualsiasi live data, partner scan**

**Owner:** DPO + Legal  
**Dipendenze:** Gate 3 può avanzare in parallelo a Gate 2, ma entrambi devono chiudersi prima di Gate 7

### Punti da definire

| Tema | Dettaglio | Urgenza |
|------|-----------|---------|
| Privacy notice activation | Testo informativa worker pre-attivazione chip | Alta — bloccante per consent record |
| Versioning consent | Schema `consent_version` in 034 — chi decide la versione? | Alta |
| Worker control | Worker può revocare in autonomia? Come? Pagina My KORA? | Alta |
| Employer visibility | Confermare che employer NON vede dati individuali (già by design) | Media — da formalizzare |
| Audit log retention | Quanto tempo si conservano gli eventi `kora_link.audit_log`? | Media |
| IP hash / logging policy | Hash IP per rate limit: va loggato? Quale retention? | Media |
| Partner scan (futuro) | Quali dati il partner può leggere al momento dello scan? | Bassa — v1.1 |
| Break-glass | Policy per accesso KORA Admin a dati sensibili in emergenza | Media |

### Prerequisiti per chiusura Gate 3

```
✓ Privacy notice testo approvato DPO
✓ consent_version = 1 definito e documentato
✓ Worker revoke flow approvato
✓ Employer visibility confermata non-individuale (formalizzato)
✓ Retention policy audit log documentata
✓ IP hash policy documentata
✓ Nessuna comunicazione automatica a employer su singolo worker
```

---

## 5. Gate 4 — RLS 035

**Stato: 🔴 OPEN — draft esistente (`supabase/proposed/035_kora_link_rls.sql`, 725 righe) ma incompleto: policy worker self-select su `link_assignments` e le funzioni SECURITY DEFINER `fn_kora_link_public_lookup`/`fn_kora_link_activate` sono commentate. Nessuna policy company-facing esiste ancora. Non revisionato, non applicato.** Aggiornato KORA-LINK-S1 (2026-07-04) — vedi `KORA_LINK_ADR.md`.

**Owner:** CTO + DBA  
**Dipendenze:** Gate 2 deve essere sostanzialmente avanzato (tabelle 034 stabilizzate) prima di redigere 035

### Policy RLS richieste (per tabella 034)

| Tabella | Policy | Principio |
|---------|--------|-----------|
| `kora_link.link_batches` | KORA Admin solo | company non vede batch di altre company |
| `kora_link.links` | KORA Admin + SECURITY DEFINER lookup | nessun ruolo legge direttamente `token_digest` |
| `kora_link.link_assignments` | Worker self-service (solo il proprio) | company non vede assignment individuale |
| `kora_link.link_consents` | Worker self-service (solo il proprio) | company non vede consent individuale |
| `kora_link.link_events` | KORA Admin + SECURITY DEFINER | audit trail non modificabile |
| `kora_link.revocations` | Worker (insert) + KORA Admin (read) | |
| `kora_link.link_replacements` | KORA Admin solo | |
| `kora_link.partner_scans` | Partner operator (solo i propri scan) + KORA Admin | v1.1+ |
| `kora_link.audit_log` | KORA Admin read-only, append-only | nessun delete |
| `kora_link.public_lookup_attempts` | SECURITY DEFINER solo | no accesso diretto |
| `kora_link.link_delivery_records` | KORA Admin + Company (solo le proprie) | |

### Principio generale

```sql
-- Deny by default su tutto lo schema kora_link
ALTER DEFAULT PRIVILEGES IN SCHEMA kora_link REVOKE ALL ON TABLES FROM PUBLIC;

-- Tutto il lookup pubblico tramite SECURITY DEFINER function
-- (non accesso diretto da route Next.js tramite anon/service-role)
```

### Prerequisiti per chiusura Gate 4

```
✓ 034 stabilizzato (Gate 2 avanzato)
✓ 035 draft redatto — draft esiste ma incompleto (worker self-select e SECURITY DEFINER lookup commentati, nessuna policy company-facing) — vedi `KORA_LINK_ADR.md`
✓ Review negativa: employer non vede nessun dato individuale
✓ Review positiva: worker vede solo i propri dati
✓ Audit log append-only verificato (no delete policy)
✓ SECURITY DEFINER functions definite per public route lookup
✓ Approvazione CTO + DPO
```

---

## 6. Gate 5 — Staging Env

**Stato: 🔴 OPEN — non configurato**

**Owner:** Engineering + Infra  
**Dipendenze:** Gate 2 + Gate 3 + Gate 4 devono essere almeno avanzati

### Variabili d'ambiente future (staging only)

| Env var | Fonte | Note |
|---------|-------|------|
| `KORA_LINK_ENABLED` | Vercel staging env | `'true'` solo in staging dopo Gate 2+3+4 |
| `KORA_LINK_TOKEN_SECRET` | Secret manager | 256 bit (64 hex chars), staging-specifico, mai shared con prod |
| `KORA_LINK_PUBLIC_BASE_URL` | Staging URL | es. `https://staging.kora.ai` |
| `KORA_LINK_RATE_LIMIT_PROVIDER` | Vercel staging env | `'upstash'` |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard | Istanza staging dedicata |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard | Token staging-specifico |

### Regole staging

```
✗ Non usare gli stessi secret di production
✗ Non abilitare prima di Gate 2+3+4 chiusi
✗ Non usare dati worker reali in staging
✗ KORA_LINK_ENABLED = 'false' in production fino a Gate 9
✓ Istanza Upstash staging separata da production
✓ Token secret staging ruotato dopo ogni test cycle
```

---

## 7. Gate 6 — Public Route Enablement

**Stato: 🟡 SKELETON COMPLETE — enablement bloccato**

**Owner:** Engineering  
**Dipendenze:** Gate 2 (schema), Gate 3 (privacy notice), Gate 5 (staging env)

### Cosa è già pronto

```
✓ app/link/[token]/page.tsx — server component testato
✓ lib/kora-link/public-route.ts — evaluator testato
✓ Rate limiter Upstash integrato e testato
✓ Token format validation
✓ notFound() per hidden/invalid (no oracle)
✓ Safe error pages per unavailable/rate_limited
✓ AppShell chrome soppresso per /link/
✓ 253 unit test KORA Link verdi
✓ E2E 6/6
```

### Cosa manca per enablement

```
✗ KORA_LINK_ENABLED = 'true' in staging (dopo Gate 5)
✗ DB lookup implementato (dopo Gate 2+4)
✗ Privacy notice approvata (Gate 3)
✗ E2E smoke con KORA_LINK_ENABLED=true
✗ Review sicurezza pre-abilitazione
```

### Prerequisiti per chiusura Gate 6

```
✓ Gate 2, 3, 4, 5 chiusi
✓ DB lookup token_digest → link record implementato
✓ Risposte uniformi per tutti gli stati (incluso token revocato/non trovato)
✓ E2E con feature flag enabled in staging
✓ Review log: nessun token raw in output
✓ Rate limiter Upstash verificato in staging
```

---

## 8. Gate Decision

**Stato operativo al 2026-07-01 (KL-11):**

```
RUNTIME_BASE        → ✅ READY_FOR_REVIEW
DB_LOOKUP           → 🔴 NOT_READY — richiede Gate 2+4
WORKER_ACTIVATION   → 🔴 NOT_READY — richiede Gate 2+3+4+6
PARTNER_SCAN        → 🔴 NOT_READY — richiede Gate 2+3+4+8 (v1.1+)
STAGING_ENABLEMENT  → 🔴 NOT_READY — richiede Gate 2+3+4+5
PRODUCTION          → 🔴 NOT_READY — richiede Gate 2+3+4+5+6+7+9
```

**Gate decisione singola:**

```
KORA Link v1 è RUNTIME_READY_FOR_REVIEW.
NON è NOT_READY_FOR_DB_LOOKUP.
NON è NOT_READY_FOR_ACTIVATION.
NON è NOT_READY_FOR_PRODUCTION.

La feature flag KORA_LINK_ENABLED deve restare 'false' in tutti gli ambienti
fino alla chiusura di Gate 2+3+4 e al completamento di Gate 5+6.
```

**Prossima azione raccomandata:** Avviare il processo di review per Gate 2 (CTO + Postgres review di 034). È il gate critico dal quale dipende l'intera catena.

---

*KORA_LINK_GATE_REPORT.md — KL-11 · 2026-07-01*
*Branch: feat/kora-link-v1-platform · HEAD: 9d00270*
