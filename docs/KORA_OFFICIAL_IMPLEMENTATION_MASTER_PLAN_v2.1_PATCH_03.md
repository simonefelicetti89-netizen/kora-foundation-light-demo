# KORA Master Plan v2.1 — Governance Patch 03

**Status:** ACTIVE ADDENDUM — does not modify the frozen Master Plan
**Date:** 2026-08-31
**Applies to:** `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` (FINAL FREEZE VERSION)
**Trigger:** Founder ratification of the "One Product / No Demo Runtime" architecture principle, following an independent read-only audit of every demo-specific runtime path in the current repository.

---

## Authority

- `docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1.md` remains frozen and is **not edited** by this patch.
- This patch clarifies and ratifies §13 "ONE PRODUCT / ONE TRUTH" — it does not introduce a new architectural requirement. §13's own text already states: *"Demo e live condividono schema, servizi, scoring, Confidence, Decision Pack, Financial Intelligence, Contribution, metodologia e UI. Differenza: solo la provenienza del dato."* — and names, all marked `[VERIFIED]`, `DemoScoringAdapter`, `ScoringSimulatorService`, `DemoDataService`, `AccessControlService`, `CommonsService`'s dual discovery path, the two Contribution seeds, the remaining `data/synthetic/` allowlist imports, the `app/company/financial/page.tsx` "not available in live" declaration, and the 11 `/demo` pages, as items to be eliminated or consolidated. This patch formalizes that text into an explicit founder decision, with the scope precision (Contribution, Ingestion/UEF, Company flows, and the operational-safety/product-truth boundary) an independent audit found necessary before implementation could safely begin.
- This patch changes no commercial or product scope, no methodology, no pillar, no KORA Index component, and no privacy rule. It reduces no commercial promise.
- Where this patch and the frozen Master Plan appear to disagree, the frozen Master Plan's literal text governs.

---

## Founder Decision — No Demo Runtime

**KORA has ONE product runtime.**

KORA must have no demo engine, no demo-specific business logic, no demo-specific methodology, no demo-specific scoring, no demo-specific KORA Index, no demo-specific Decision Pack, no demo-specific Contribution calculation, no runtime JSON/synthetic fallback, and no product behavior that changes because a company contains synthetic data.

Any example company used for sales, presentation, testing, onboarding, or product demonstration must be created as an **ordinary KORA tenant** in the canonical schema. It may contain entirely synthetic/fake data. That data must be processed through exactly the same schema, services, ingestion, UEF, scoring engine, methodology, Confidence, KORA Index, Financial Intelligence, Contribution, Decision Pack, authorization model, and product UI used by a real company. The application must not need to know, for product purposes, that the company is fake.

**Visibility rule.** A synthetic/fake company must not display any automatic, architecture-driven customer-facing indication that it is demo, synthetic, fake, sample, or test data — no automatic "Demo"/"Demo mode"/"Synthetic data"/"Dati sintetici" badge merely because the tenant contains synthetic data. The founder may manually name a company "KORA Demo," "Acme Demo," etc. as ordinary company content, or choose to label a presentation externally — neither is an architectural demo mode.

**Existing `/demo/*` routes are not exempted from this principle.** They are legacy/external showcase surfaces; their disposition (rewire onto canonical tenant runtime, redirect, or retire) is explicitly **not decided by this patch**. What this patch does establish: no surviving route, whichever are kept, may depend on demo-specific product logic or a synthetic runtime source in the final B-TRUTH state.

---

## Operational safety

`analytics.tenant.tenant_kind` (e.g. `'DEMO'`) may remain and continue to be used — strictly and only — for **operational safety**: preventing or isolating real emails, external API calls, provider/network side effects, webhooks, real invitations, production analytics contamination, or production reporting contamination.

`tenant_kind` must **never** alter methodology, calculations, scoring, the KORA Index, Contribution, the Decision Pack, business logic, customer-facing navigation, customer-facing copy, product capabilities, or product output.

**`tenant_kind` may change side effects. It may not change product truth.**

A concrete, already-identified gap this principle governs going forward (not fixed by this patch): `app/api/admin/companies/provision/route.ts` currently hardcodes `tenant_kind: 'LIVE'` with no parameter and unconditionally fires a real Supabase Auth invite email — before this route is reused to provision a synthetic tenant, it needs a `tenant_kind` input and a guard against real-world side effects for non-`LIVE` kinds. Not implemented by this patch.

**Implemented (2026-08-31, Synthetic Company Foundation).** `app/api/admin/companies/provision/route.ts` and `app/api/admin/tenants/route.ts` now accept an optional `tenant_kind`/`tenantKind` input (`LIVE`/`DEMO`/`TEST`/`SANDBOX`, default `LIVE` — every existing caller that omits it is unchanged). For any non-`LIVE` value, `provision/route.ts` never calls `inviteUserByEmail`; it goes straight to `createUser({ email_confirm: true })`, the same no-real-email path the `LIVE` branch already used as its own SMTP-unavailable fallback — the only difference is *when* that path is taken (by `tenant_kind`, not by error), not what it does. `app_metadata` shape, RLS behavior, and every downstream canonical read are unchanged regardless of `tenant_kind` — verified for one concrete capability (`commons.post` insert/select) by `tests/integration/rls-12-tenant-kind-parity.test.ts` (DB-backed, mandatory CI gate). A deterministic, safety-gated seed script (`scripts/seed-synthetic-company.ts`, dev/CI tooling — not product code, nothing under `app/`/`services/`/`lib/` imports it) creates one canonical reference `tenant_kind='DEMO'` tenant for future B-TRUTH seed-group migrations to target. `OP-001` (the pre-existing, deeply legacy-hardcoded synthetic pipeline tenant — 10+ files reference `tenant_code === 'OP-001'` directly, per migration 014's own header) is untouched by this work; it remains a separate, later untangling effort, not folded into this foundation.

---

## Contribution protection

An independent audit found that `KoraContributionService.computeContributionV2` currently contains real, non-duplicated product methodology — component weighting (`activationDepth`/`evidenceQuality`/`ecosystemContribution`/`adoptionReach`/`strategicBreadth`), maturity-band classification, a confidence score, and insufficient-signal handling — with **no equivalent in the DB-backed live Contribution path** (`getContributionLive`/`getContributionPromoterView`/`getContributionOriginEmployerView`), whose types (`LiveContributionSummary`, `ContributionPromoterView`, `ContributionOriginEmployerView`) carry no score/band/confidence field by explicit design (`CONTRIBUTION_SCORE_PRESENTATION_MODE = 'provisional_demo_only'`).

**This founder decision is: same methodology on canonical data, not removal of methodology.** This patch does **not** authorize deleting `computeContributionV2` or its supporting logic. The required future target, in order:

1. Preserve the existing Contribution V2 methodology (the weighting formula, maturity bands, confidence calculation, insufficient-signal gate) unchanged.
2. Change its input construction from synthetic JSON (`data/synthetic/collective-initiatives.json` → `ContributionPipelineInput[]`) to canonical DB-backed data (`commons.contribution_event`/`commons.post` → the same `ContributionPipelineInput[]` shape).
3. Verify methodology parity between the JSON-fed and DB-fed computation before any cutover.
4. Only then retire the synthetic-JSON-reading path (`getContribution`/`getContributionSummary`/`getContributionScore`).

Not implemented by this patch.

---

## Ingestion / UEF

Target architecture, ratified but not implemented by this patch:

```
fake input data → canonical data-intake path → canonical UEF → canonical pipeline
```

not:

```
fake input → demo ingestion service → demo UEF service
```

An independent audit found the live pipeline (`lib/kora-engine/run-kora-pipeline.ts`, `lib/data-intake/*`) to be a strict superset of the demo Ingestion/UEF chain (`IngestionPipelineService`, `UEFReviewService`, `CompanyDataIntakeService`) — the demo chain never computes IU/EV/NM/BC/CQ/CF/AGF, only eligibility classification and display routing, and its own classifier (`EligibilityGateService`) states in its own header that it is "NOT the live scoring eligibility engine." No unique methodology requiring preservation was found in this cluster, unlike Contribution above. A concrete, already-identified structural blocker: `app/api/admin/data-intake/accept/route.ts` currently **excludes** `tenantCode === 'OP-001'` from the live path by name — the inverse of what this decision requires; this route will need to stop excluding the synthetic tenant, not continue to. Not implemented by this patch.

---

## Company Setup / Onboarding

Target architecture, ratified but not implemented by this patch: `CompanySetupService` remains the pre-provisioning/setup workflow; the canonical provisioning API (`app/api/admin/companies/provision/route.ts`) remains the sole authority that creates real tenant/auth state; `CompanyOnboardingService` remains the post-provisioning readiness/status logic, reading canonical tenant data instead of `data/synthetic/company-onboarding.json`. A synthetic company follows exactly this same model — there is no separate demo-company provisioning workflow. Not implemented by this patch.

---

## B-TRUTH consequence

- `I9` target remains **0** — unchanged, unmodified by this decision.
- **No permanent runtime-synthetic exception is created by this decision.** Nothing in this patch grants any file, service, or cluster a standing exemption from the I9=0 target; the Contribution protection above is a *sequencing* requirement (methodology preserved and ported before deletion), not an exception to eventual deletion.
- The fake/example company target architecture is: converge onto the canonical runtime as an ordinary `tenant_kind='DEMO'` tenant — it does not remain a parallel technical mode.
- The final scoring/demo group (`DemoScoringAdapter` · `ScoringSimulatorService` · `DemoDataService` · `AccessControlService`, §32) remains sequenced **last**, per the frozen Master Plan's own explicit condition (`fine B-TRUTH`, `I9 = 0, adversarial superata`) — this patch does not reorder it forward.
- **CC-022** (closure gate, `demo = live, I9 = 0`) and **CC-023** (adversarial validation + remedies) remain required and unmodified.
- **This patch does not claim B-TRUTH complete.** `I9` is unchanged at 24 files / 36 imports as of this patch.

---

## Registry status (informational — no changes made by this patch)

No `lib/architecture/registry.ts` entries were modified by this patch — this decision changes no *current* status; it constrains *future* work. The following entries will need updating once the corresponding implementation work referenced above actually happens (listed for traceability, not actioned here):

- `svc.company-onboarding` / `svc.company-setup`: their mutual `competingWith` field was found, by a prior audit, to mischaracterize two genuinely non-overlapping responsibilities (pre-provisioning wizard vs. post-provisioning readiness dashboard) as competitors. Correction deferred to the implementation task that wires them per the Company Setup / Onboarding section above.
- `svc.kora-contribution`: should eventually note that its DB-input port (this patch's Contribution protection section) is a tracked prerequisite for its synthetic-JSON methods' retirement, not merely "B-TRUTH" as a bare `decisionRef`.
- `svc.ingestion-pipeline` / `svc.uef-review`: their `FROZEN`/`DEMO_RUNTIME` classification notes (Patch 01 §7) already state this is transitional, not permanent — this patch reinforces that reading and adds the concrete migration target (canonical data-intake path) that was previously undecided.
- `svc.demo-data` / `svc.scoring-simulator` / `svc.access-control`: unaffected — already correctly `CONSOLIDATE`, already correctly scheduled for the final group.

---

*This patch ratifies scope and sequencing. It authorizes no code change on its own — each section above states explicitly that its target is "not implemented by this patch."*
