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

*KORA_LINK_CHANGELOG.md — KL-02 · 2026-06-30*
