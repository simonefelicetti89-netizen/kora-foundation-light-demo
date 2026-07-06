# KORA — Pilot Operating Runbook

**Audience:** whoever is executing (or approving) the remaining pilot validation sequence — founder/operator, technical reviewer, company pilot contact, privacy/governance reviewer.
**Introduced:** PILOT-OPERATING-RUNBOOK-01 (2026-07-06)

---

## 1. Purpose and scope

**What this runbook is for:** a step-by-step operating procedure for running the remaining pilot validation sequence safely — who does what, what to check before starting, how to execute each step, when to stop, and how to close out the pilot review honestly.

**What this runbook is not for:** it is not a technical reference for what each check proves (see `docs/PILOT_GOVERNANCE.md` and `docs/E2E_GOLDEN_PATH.md`/`docs/E2E_TWO_TENANT_ISOLATION.md` for that), not a reviewer-facing overview (see `docs/PILOT_REVIEW_PACKAGE.md`), and not a manual UI walkthrough (see `docs/GOLDEN_PATH_RUNBOOK.md` for that level of detail).

**This document does not execute anything.** It contains no credentials, no Supabase calls, no migrations, no live test runs, and no Production actions. It is a procedure to be followed by a human operator (or an AI agent under explicit human instruction), not a script. **Every live/staging action described here still requires its own explicit approval at the time it is run** — nothing in this runbook constitutes standing authorization to provision COMPANY_B, run `GD01`, or touch Production.

## 2. Roles and responsibilities

| Role | Responsibilities | May approve/review | Must not do |
|---|---|---|---|
| **Founder/operator** | Owns the pilot decision end-to-end; gives explicit approval for each mutating/staging action (COMPANY_B provisioning, `GD01`, credential cleanup); makes the final go/no-go call | Approves every step in §5 before it runs; approves pilot closeout | Skip approval steps; treat a prior approval as blanket authorization for a later, different action |
| **Technical reviewer/developer** | Executes read-only checks; prepares/documents mutating checks for founder approval; verifies evidence; flags stop conditions | Reviews technical evidence; recommends pass/fail per step | Provision COMPANY_B, run `GD01`, or touch Production without founder approval; continue past a stop condition |
| **Company pilot contact** | Provides the pilot company's real intake data and context when the golden path reaches that stage; receives the Decision Pack/report output | Reviews their own company's output for accuracy | Access another tenant's data; be given KORA_ADMIN credentials; be shown individual worker data |
| **Privacy/governance reviewer** | Confirms the privacy boundary (worker-individual data never employer-visible) holds at each relevant step; owns the "do not continue" call on any privacy/tenant failure | Approves that a step's evidence shows no privacy boundary breach | Approve a step whose evidence they haven't actually reviewed; waive a stop condition |
| **Academic/methodology reviewer** *(optional)* | Reviews methodology soundness and calibration-status claims; not involved in execution | Reviews `docs/METHODOLOGY.md`/`docs/10-architecture-v3-layer-specification.md` claims | Approve or execute any technical validation step |

## 3. Pre-pilot readiness checklist

Before starting **any** step in §5:

- [ ] Repo is on `main`, working tree clean (`git status`).
- [ ] CI is green on the latest `main` commit (`.github/workflows/ci.yml`).
- [ ] Gate 2 status is understood by everyone involved: **CLOSED WITH CONDITIONS**, staging-only — see `docs/GATE2_STATUS.md`.
- [ ] `docs/PILOT_REVIEW_PACKAGE.md` has been shared with, and read by, whoever is reviewing the pilot externally.
- [ ] The target environment for this session is explicitly named (local / staging / Production) — never assumed.
- [ ] Everyone involved understands the local/staging/Production and demo/live data boundaries (§4).
- [ ] COMPANY_A account status is known (exists, tenant `STAGE-001`, per `docs/GOLDEN_PATH.md`).
- [ ] COMPANY_B provisioning status is known (as of this doc: **does not exist** — see `docs/PILOT_GOVERNANCE.md` §10).
- [ ] Credential handling rules are understood: credentials are set in the operator's own shell/secret store, never pasted into chat, issues, PRs, or commits (see `docs/testing-e2e-auth.md`).
- [ ] Data intake prerequisites for the specific step about to run are understood (e.g. `GD01` needs a disposable/synthetic staging tenant, never a real client's — see `docs/E2E_GOLDEN_PATH.md`).
- [ ] Privacy boundaries are acknowledged by the privacy/governance reviewer before any step that could touch real or realistic data.
- [ ] Stop conditions (§7) have been read by whoever is executing, before execution starts.

## 4. Environment and data boundaries

- **Local** — default target for all E2E scaffolds; auto-starts a local dev server; no explicit opt-in needed.
- **Staging** — a real, non-Production Supabase-backed deployment; requires `E2E_ALLOW_PRODUCTION=true` to target with any authenticated E2E scaffold (the guard cannot distinguish staging from Production by hostname alone — see `docs/E2E_GOLDEN_PATH.md`).
- **Production** — the live Vercel deployment. Never a target for `GD01`, `T01`/`T02`, or any mutating check. Only manual, read-only smoke checks (public pages, KORA_ADMIN login) have ever been run there.
- **Demo/synthetic data** — fabricated, `synthetic_demo_data: true`, safe to reset/regenerate freely.
- **Live data** — anything belonging to a real tenant (including disposable staging tenants used for `GD01`, which still accumulate real rows). Treat as real even when synthetic-sourced, once it's gone through the live pipeline.
- **What must never be done in Production:** COMPANY_B provisioning, `GD01`, `T01`/`T02`, any migration, any Supabase Admin API call, any credential rotation.
- **What requires explicit approval, every time, no matter how routine it feels:** any action touching staging Supabase, COMPANY_B provisioning specifically, and anything targeting Production at all.
- **What to do when the environment is unclear:** stop. Do not guess. Do not proceed on an assumption about which environment a command will hit — this is a stop condition (§7).

## 5. Pilot validation sequence

Canonical order (unchanged from `docs/PILOT_GOVERNANCE.md` §16 — **that document is the canonical governance sequence; this section is the operating view of the same sequence**, not a competing one):

1. `A02` — COMPANY_A authenticated smoke.
2. COMPANY_B provisioning.
3. `A03`/`A04` — COMPANY_B login + tenant-separation smoke.
4. `T01`/`T02` — two-tenant isolation.
5. `GD01` — data-bearing golden path.
6. RLS-06 — live positive control, if still outstanding at that point.
7. Credential cleanup/reset.
8. Final review.

Each step still requires its own explicit approval when it is actually run — this list is descriptive of order, not a standing green light.

## 6. Check classification

| Step | Purpose | Read-only or mutating | Required accounts/env | Pass condition | Stop condition | Evidence to collect |
|---|---|---|---|---|---|---|
| `A02` | Confirm COMPANY_A can log in and reach `/company/workspace` via the real E2E fixture | Read-only | `E2E_COMPANY_A_EMAIL`/`PASSWORD`, local or staging | Test passes; workspace reached; no worker-level identifier in markup | Auth failure, wrong workspace, or any worker-level identifier appears | Test run output, environment name, pass/fail |
| COMPANY_B provisioning | Create a second real tenant + COMPANY_ADMIN account via `/api/admin/companies/provision` | **Mutating** — creates a real tenant/auth user | KORA_ADMIN session, staging only, founder approval | Tenant + user created, `app_metadata.kora_tenant_id` set correctly | Wrong tenant created, cross-tenant email conflict (409), any unexpected write | Provisioning response (`tenantId`, `tenantCode`, no credential values), approval record |
| `A03`/`A04` | Confirm COMPANY_B can log in, and COMPANY_A/B sessions resolve to different tenants | Read-only | `E2E_COMPANY_A_*` + `E2E_COMPANY_B_*`, local or staging | Both reach workspace; tenant names/codes differ | Either session resolves to the other's tenant, or any worker-level identifier appears | Test run output, environment name |
| `T01`/`T02` | Confirm COMPANY_A/B sessions cannot resolve each other's `/api/company/workspace` data, including via query-param injection | Read-only | Same as `A03`/`A04` | Each session resolves only to its own tenant; injected foreign tenant code has no effect | Cross-tenant data appears in either response; injected parameter changes the result | Test run output, environment name |
| `GD01` | Drive the full upload → UEF → scoring → Decision Pack pipeline through the real UI, then confirm COMPANY_ADMIN visibility | **Mutating** — creates real `source_batch`/UEF/`kora_index_result`/Decision Pack rows | KORA_ADMIN + COMPANY_A creds, `E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true`, disposable staging tenant only, founder approval | Non-empty KORA Index/Confidence/Safeguard rendered; Decision Pack shows canonical labels; no worker-level identifier in COMPANY_ADMIN view | Any step fails; wrong tenant targeted; worker-level identifier appears; PDF/HTML shows a superseded version label | Test run output, environment name, tenant code used (not credentials) |
| RLS-06 (live) | Prove KORA_ADMIN's legitimate cross-tenant access still works, live, against direct Postgres | **Mutating** — writes/cleans up synthetic fixture rows | `RLS06_PG_URL`/`RLS06_ALLOW_RUN`, local Supabase only | All assertions pass; fixture rows confirmed cleaned up afterward | Any assertion fails; fixture rows not cleaned up; unexpected non-local `PG_URL` | Test run output, cleanup confirmation query result (no row content) |
| Credential cleanup | Reset/rotate any credentials used during validation | **Mutating** | Founder approval, deferred until every step above is done | Old credentials confirmed invalid; new ones stored per standing secret-handling practice | Any credential value appears in chat/logs/commits during cleanup | Confirmation that rotation happened — never the values themselves |
| Final review | Confirm claims match evidence; update docs if needed | Read-only | N/A | `docs/PILOT_REVIEW_PACKAGE.md` and `docs/PILOT_GOVERNANCE.md` accurately reflect what actually ran | Any doc still claims something that wasn't actually run live | Updated doc diffs, closeout checklist (§11) completed |

## 7. Stop conditions

Any of the following is an immediate stop. When one occurs:
**(1) stop immediately — (2) do not continue to the next validation step — (3) record the blocker — (4) escalate to the founder/operator and the technical reviewer — (5) do not claim the affected proof passed, in any doc, PR, or conversation.**

- Wrong-tenant data visible (any session showing another tenant's data).
- Worker-level identifiers exposed (`worker_id`, `kora_worker_id`, `token_digest`, `link_id`, or any individual PIB/UEF data, in any employer-facing surface).
- Auth/session mismatch (a session resolving to the wrong role or wrong tenant).
- Unexpected Production target (any command about to hit Production without prior explicit approval for that specific action).
- Failed migration/schema precondition (a step assumes a migration is applied and it isn't).
- Failed CI/build (`tsc`, `npm test`, or `npm run build` failing on the commit being validated).
- `GD01` mutation failure (any step of the golden-path pipeline errors, or writes to the wrong tenant).
- Secrets printed/exposed (any credential value appearing in a terminal, log, chat message, PR, or commit).
- Unclear environment (anyone involved is not sure whether a command targets local, staging, or Production).
- Unclear account/tenant identity (anyone involved is not sure which account or tenant a session/action belongs to).
- Unexpected data write (any write occurring that wasn't the specific, approved, intended one for that step).

## 8. Evidence collection

**What to capture:**
- Command outputs (test run summaries, `npx playwright test --list` output, build/lint results).
- PR links and merge commit hashes.
- Test summaries (pass/fail counts, which tests ran vs. skipped).
- Screenshots, only if genuinely needed to document a UI state (never a screenshot containing credential fields with values filled in).
- Environment name (local/staging/Production) — always record which one was targeted.
- Pass/fail notes per step, in the operator's own words, tied to the check classification in §6.

**What not to capture or share:**
- Raw env values of any kind.
- Passwords, service-role keys, or any Supabase key.
- Full server logs that may contain tokens or session cookies.
- Individual worker identifiers or any individual-level data.
- Unredacted personal data of any kind.

## 9. Communication templates

**Pre-pilot readiness note**
```
Pilot validation session — [date]
Target environment: [local/staging/Production]
Pre-pilot checklist (§3): complete / incomplete — [note any gaps]
Steps planned this session: [list from §5]
Approvals obtained: [who approved what]
```

**Validation result note**
```
Step: [A02 / COMPANY_B provisioning / A03-A04 / T01-T02 / GD01 / RLS-06 / credential cleanup / final review]
Environment: [local/staging/Production]
Result: PASS / FAIL / SKIPPED — [reason if skipped]
Evidence: [test output summary / PR link / commit hash]
Stop condition triggered: yes/no — [which one, if yes]
```

**Blocker/escalation note**
```
Blocker: [what happened]
Step affected: [from §5]
Stop condition (§7): [which one]
Escalated to: [founder/operator, technical reviewer, privacy reviewer]
Claim status: NOT claiming this step passed
Next action: [what needs to happen before retrying]
```

**Post-pilot summary**
```
Session date: [date]
Steps run: [list, with PASS/FAIL/SKIPPED per §6]
Blockers encountered: [list, or "none"]
Docs updated: [list, or "none needed"]
Claims that changed status: [list, or "none"]
Credential cleanup: scheduled for [date] / executed on [date] / not yet due
Next roadmap step: [name]
```

## 10. Do-not-mix rules

- Do not mix pilot validation with credential cleanup — cleanup is deferred to the end of the roadmap by deliberate decision (`docs/PILOT_GOVERNANCE.md` §15), not something to fold into a routine validation session.
- Do not mix pilot validation with new feature development — a validation session proves existing behavior; it does not build new behavior.
- Do not mix pilot validation with KORA Link implementation — KORA Link is frozen and has no coupling to the golden path.
- Do not run `GD01` casually — it mutates real tenant data every time and requires its own explicit gate (`E2E_GOLDEN_DATA_BEARING_ALLOW_RUN=true`) plus founder approval.
- Do not provision COMPANY_B without explicit approval — it is a deliberate, real-tenant-creating action, never a routine step.
- Do not change runtime/auth/RLS/scoring behavior during a validation session — if a change seems needed, stop, log it as a separate finding, and address it in its own sprint.
- Do not continue after a privacy/tenant failure — this is not a judgment call; see §7.

## 11. Closeout checklist

- [ ] Every claim made about this session is verified against the actual evidence collected (§8) — no step is described as "passed" unless its pass condition (§6) was actually met.
- [ ] Every failed/blocked step is logged, with its stop condition (§7) and escalation record.
- [ ] Evidence is collected and redacted per §8 before being stored or shared anywhere.
- [ ] `docs/PILOT_GOVERNANCE.md` and/or `docs/PILOT_REVIEW_PACKAGE.md` are updated if any claim's status actually changed (e.g. `GD01` moving from "scaffolded" to "proven").
- [ ] Credential cleanup is scheduled (or executed, if this was the final session) — never executed early, never skipped silently.
- [ ] `docs/PILOT_REVIEW_PACKAGE.md` is re-checked against the "do not claim" boundaries (its §7) to confirm nothing there has become stale.
- [ ] The next roadmap step is identified and named, not just implied.

## 12. Links to canonical docs

- `docs/PILOT_REVIEW_PACKAGE.md` — reviewer-facing entry point: executive overview, evidence matrix, do-not-claim boundaries, external sharing guidance.
- `docs/PILOT_GOVERNANCE.md` — canonical governance index: proven/scaffolded/blocked/deferred status, the authoritative final validation sequence.
- `docs/GOLDEN_PATH_RUNBOOK.md` — manual, step-by-step KORA_ADMIN UI walkthrough for the golden path itself (upload → UEF → scoring → Decision Pack).
- `docs/PILOT_INTAKE_PROTOCOL.md` — how to onboard a real pilot company, from contract signature to live KORA Index.
- `docs/DEPLOY_CHECKLIST.md` — manual pre/post-deploy checklist for any deploy a pilot company could be affected by.
- `docs/E2E_GOLDEN_PATH.md` — what `GD01` proves, required env vars, how to run it, known gaps.
- `docs/E2E_TWO_TENANT_ISOLATION.md` — what `T01`/`T02` prove, required env vars, why COMPANY_B currently blocks them.
- `docs/GATE2_STATUS.md` — canonical Gate 2 status and what it does/doesn't authorize.
- `docs/CI.md` — what CI runs and excludes on every PR/push to `main`.

---

**Document version:** v1.0
**Created:** 2026-07-06 (PILOT-OPERATING-RUNBOOK-01)
