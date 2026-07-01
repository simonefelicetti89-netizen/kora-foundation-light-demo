# B168.6 Sprint — Completion Log

## Phase 1 — IP Indexation Stop ✓

- Commit: in B168.6 Phase 1-2-3 commit (56fba97)
- `public/robots.txt`: Disallow all, Allow / e /landing
- noindex metadata su admin, demo, worker, company, partner layout + /request-access
- X-Robots-Tag HTTP header su tutti i path sensibili via next.config.ts

## Phase 2 — Security Headers ✓

- Commit: in B168.6 Phase 1-2-3 commit (56fba97)
- CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Tutte applicate via next.config.ts

## Phase 3 — xlsx CVE Upgrade ✓

- Commit: in B168.6 Phase 1-2-3 commit (56fba97)
- xlsx v0.18.5 rimosso (CVE-2023-30533, CVE-2024-22363)
- exceljs v4.4.0 per server-side (excel-parser.ts)
- read-excel-file/browser per client-side (roster-parser.ts, file-parser.ts)
- Tutti i caller aggiornati con await

## Phase 4.0 — Precondizioni (service-role scoped + idempotency) ✓

- Commit: `043f697`
- `lib/supabase/worker-provisioning-service-key.ts`: ALLOWED_IDENTITY_INSERT_FIELDS whitelist
- `lib/supabase/impact-unit-service-key.ts`: ALLOWED_IU_SELECT_COLUMNS whitelist (Decisione A)
- 028 CREATE POLICY wrappata in DO $$ IF NOT EXISTS
- 5105/5105 test verdi

## Phase 4 — Applicazione 027 + 028 in produzione

- Ambiente target: ___ [da completare]
- Backup timestamp: ___
- Migration 027 applicata: ___
- Migration 028 applicata: ___
- Smoke test: vedere phase4-smoke-evidence.md
- audit_reader grants verificati: [ ] sì  [ ] pending
- Expected gap documentato: ip_hash/user_agent_hash NULL → B168.7
- Commit P4.3: ___
- Commit P4.4: ___
- Commit P4.5: ___

### ADR creato

`docs/decisions/ADR-002-service-role-scoping.md` — pattern service-role scoped con whitelist assertion.

## Defense-in-Depth Status

| Layer | Status | Attivato |
|---|---|---|
| Layer 1 — Middleware (path intercept) | ✓ attivo | B168 |
| Layer 2 — Server layout (redirect + log) | ✓ attivo | B168 |
| Layer 3 — RLS (DB-level deny) | ⏳ pending Phase 4 | da applicare |

Con Phase 4 completa: worker individual data è zero-access per KORA_ADMIN
a tutti e 3 i livelli (middleware + layout + RLS).

Garanzia citabile in DPIA, contratti, fundraising dopo Phase 4 execution confermata.
