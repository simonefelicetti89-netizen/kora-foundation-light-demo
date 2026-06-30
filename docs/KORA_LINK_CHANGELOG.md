# KORA Link — Changelog

**Branch:** `feat/kora-link-v1`
**Base:** `eaecdad` (`value-freeze-v1`)
**Non mergiare in main senza Gate 2 + Gate 3 chiusi + CTO review.**

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

*KORA_LINK_CHANGELOG.md — KL-05 · 2026-06-30*
