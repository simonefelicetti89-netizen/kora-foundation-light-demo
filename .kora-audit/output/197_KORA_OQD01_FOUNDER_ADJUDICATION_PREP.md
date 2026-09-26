# 197 — OQ-D01 Founder Adjudication Preparation

**ANALYSIS ONLY. No code modified. No tests modified. No commit. No push.**

---

## 1. Executive conclusion

OQ-D01's own literal prerequisite — "once DD-3/DD-2/DD-1 fix the object model they route to" (report 61) — has been satisfied: DD-1, DD-2, and DD-3 all reached their own final freeze/lock readouts (reports 80-82, 76-77, 69-70 respectively). But DD-1's own final architecture readout explicitly separates "UI/navigation" out as a distinct, later concern it does NOT itself decide (report 80, line 177: lists "UI/navigation" among items still owed to "the complete implementation handoff," separate from what DD-1 froze). So the blocker that kept OQ-D01 waiting is gone, but no one has since taken the follow-up step of actually deciding the navigation/IA structure. **A genuine Founder decision is still required — but it is much smaller than "design KORA's information architecture."** The real, current-code-truth finding: none of the five environments' navigation today uses `KORA-GAP-PLATFORM-025`'s own target taxonomy (Home/Intelligence/Decision/Program/Space/Network/Settings) — each environment instead uses its own organically-grown, product-feature-driven grouping (e.g., Company's sidebar groups by literal product names like "KORA Index™," "Budget-to-Human-Impact™," not by abstract category). Building that full target taxonomy now would be a large, separate undertaking, not a WP-073-sized closure item. The smallest possible decision is therefore binary: **close `KORA-GAP-PLATFORM-025` against the current, already-functioning five-environment structure (documented + regression-tested), or require the full target taxonomy to be built first.** No route-string freeze is required either way — the gap's own substance is grouping/hierarchy/relationship semantics, not URL spelling.

## 2. Exact OQ-D01 source wording

- `.kora-audit/output/49_GLOBAL_TRACEABILITY_MATRIX.md` line 231: `OQ-D01 | Sidebar / route architecture of the five environments | ENGINEERING (Master Plan) — informs NETWORK-001, all environment rows`.
- `.kora-audit/output/60_EXPERIENCE_EXTERNAL_SURFACES_AND_ASSETS_v1.1.md` §2, verbatim: *"Open (Master Plan 2.0 decisions — do NOT freeze route paths yet): OQ-D01 (sidebar / route architecture of the five environments) · OQ-D02 (Territory tab vs filter vs map mode) · OQ-D03 (contextual shortcuts to Partners & Capacity from Home / Program / Decision)."* Same section: *"Workstream: IA consolidation. SELLABILITY-BLOCKING. Assessed in `61` as a possible deep-dive question (bundled into DD-1) — not its own deep dive."*
- `KORA-GAP-PLATFORM-025`'s own full requirement (same source): *"Explicit rules, per the five frozen environments, for: primary navigation · object hierarchy · contextual navigation · global vs local nav · the Home / Intelligence / Decision / Program / Space / Network / Settings relationship · Space = a transversal function present in Company / My KORA / Partner / Admin (PD-017, not a portal) · Network lives under Space → Network (PD-018) · Territory is a transversal contextual lens, not a sixth environment (PD-020, FPQ-03) · cross-links among Decision, Program, Capacity, Evidence, Advisor, Resource Allocation."*
- **Report 61 corrects report 60's own "bundled into DD-1" framing** (line 162, 165, verbatim): *"None of the three blocking deep dives (DD-1/DD-2/DD-3) is gated on an experience-architecture decision. DD-3's object catalogue, DD-2's assignment model, and DD-1's operator-model unit are all backend/domain decisions; the IA question (OQ-D01/D02/D03 — where routes/tabs live) is explicitly deferred to Master Plan 2.0 by Product Truth itself ('Sidebar/route definitiva è Master Plan Decision'). Verdict: NOT a deep dive. Carried instead as a Master Plan 2.0 cross-cutting workstream (`56` §22-31, `60`)... The Master Plan should schedule: ... (b) route/IA finalisation (OQ-D01/D02/D03) once DD-3/DD-2/DD-1 fix the object model they route to..."*

No conflict between reports 60 and 61 once read together — 61 is the actual, more precise assessment; 60's "bundled into DD-1" phrasing is loose shorthand for "sequenced after DD-1" (and DD-2/DD-3), not "decided within DD-1's own scope." No `STOP — FOUNDER REVIEW REQUIRED` triggered by this — the sources are consistent once correctly read together, not contradictory.

## 3. DD-1 status

**C — DD-1 DOES NOT RESOLVE OQ-D01.** DD-1 (reports 78-82) froze the KORA Control Plane's own backend/domain operating model (governance, permissions, queues, audit, the Program/Case/Assignment object semantics). Its own final architecture readout (report 80, line 177) explicitly lists "UI/navigation" as a *separate* item in "the complete implementation handoff," distinct from what DD-1 itself decided. Report 80's own §6 (report 82) reinforces the same separation: *"Context navigation and access authorization are kept fully separate."* DD-2 (Advisor operating model, reports 73-77) and DD-3 (canonical domain model, reports 67-70) are similarly backend/domain-scoped, per report 61's own explicit characterization. **The prerequisite report 61 named for OQ-D01 — DD-1/2/3 fixing the object model routes point to — IS now satisfied** (all three show terminal FREEZE/LOCK readouts), but no document after that freeze performs the actual OQ-D01 decision step itself. Report 102 (the most recent verified execution registry, superseded only by Registry 142 for WP sequencing) still carries the identical, unresolved `KORA-GAP-PLATFORM-025 ... PARTIALLY IMPLEMENTED` line — confirming this was never separately closed out.

## 4. Current five-environment route/sidebar truth

Reconstructed directly from `lib/navigation/admin-nav-groups.ts` and `components/layout/Sidebar.tsx`'s own `buildNavGroups()` function — code truth, not inferred.

### 4.1 KORA ADMIN
- **Structure**: data-driven, externalized config (`ADMIN_NAV_GROUPS`), with its own permanent regression test (`tests/unit/b169-nav-groups.test.ts`) — the most mature of the five.
- **Groups**: Pilot Lifecycle (Pipeline & Trials, Founder Validation) · Companies (All Companies, Tenant Registry) · Privacy & Governance (Governance & Privacy) · Operations (Submission Queue, UEF Review & Scoring, Impact Units, Data Lifecycle, Worker Provisioning, Trial Control Center, KORA Link ×3, Case) · Network & Content (KORA Space Moderation, Worker Initiatives, Partner Map, Partner Ecosystem Model, KORA Activation Layer, Activation Signal Pipeline) · Demo Lab (`environmentTag: SYNTHETIC`).
- **Default/landing route**: `/admin` (implicit, root of the group structure).
- **Labels**: plain operational English/Italian mix, product-feature-named, not abstract-category-named.
- **Duplicated/orphaned**: none found at this pass; the file's own header comment records a prior cleanup ("6 `/demo/company/*` items EXCLUDED — RIDONDANTI," "CC-00 Residual demo retirement... entries removed").
- **Already coherent?** Reasonably yes, for what it covers — six clear functional groups, already tested.
- **Exact unresolved OQ-D01 issue**: no "Home/Intelligence/Decision/Program/Space/Network/Settings" categorization present anywhere; groups are operational, not aligned to the target taxonomy.

### 4.2 COMPANY
- **Structure**: inline in `Sidebar.tsx`'s `buildNavGroups('COMPANY_ADMIN', ...)`, not yet externalized like Admin's.
- **Groups** (5, by code structure): a "start here" group (Executive Cockpit, Status Center, KORA Index™, KORA Workspace) · an "intelligence/analysis" group (Opportunità *(preview)*, Living KORAL, Budget-to-Human-Impact™, Activation Intelligence™, KORA Contribution™, Pillar Analysis, Bisogni Aziendali, Selezione Attività *(preview)*, Segnali Attivazione *(preview)*) · a "reporting" group (Stato Dati, Decision Pack, KORA Wallboard) · a "network" group (Il tuo Advisor, KORA Space, KORA Link, Campagne KORA Link *(preview)*) · a "settings" group (Profilo & Stato).
- **Default/landing route**: `/company` ("Executive Cockpit... Punto di partenza — naviga tutte le aree").
- **Labels**: literal, trademarked product names (KORA Index™, Budget-to-Human-Impact™, Activation Intelligence™, KORA Contribution™) used directly as nav-item labels — not abstracted into "Decision"/"Intelligence" categories.
- **Duplicated/orphaned**: none found; `Living KORAL` appears as a normal top-level item despite being explicitly "NOT BASE PILOT SCOPE" per Registry 142 — noted as an observed fact only, not touched (Living KORAL is explicitly off-limits to this and every adjacent task).
- **Already coherent?** Internally usable, but the largest gap from the target taxonomy of any environment — 17+ items across 5 groups, entirely feature-named.
- **Exact unresolved OQ-D01 issue**: same as Admin — zero alignment to Home/Intelligence/Decision/Program/Space/Network/Settings; additionally, `KORA-GAP-PLATFORM-025`'s own explicit rule ("Space = a transversal function present in Company / My KORA / Partner / Admin") is not reflected — "KORA Space" here is one sibling nav item among many, not a distinguished transversal function.

### 4.3 WORKER (My KORA)
- **Structure**: inline in `Sidebar.tsx`'s `buildNavGroups('WORKER', ...)` (implicit from the same function, role-gated).
- **Groups**: a primary group (My KORA Home, Personal Impact Balance, Dynamic Impact CV, Opportunità) · a "space" group (KORA Space *(Anteprima, preview)*, KORA Space, Attività disponibili *(preview)*, My KORA Link, Prenotazioni, Collettivo *(comingSoon)*) · a "privacy" group (Privacy & Condivisione) · Future Vision (`inactive: true`).
- **Default/landing route**: `/worker/workspace` (or `/admin/preview/worker` when viewed via Admin's own role-preview mode).
- **Duplicated/orphaned**: two "KORA Space"-labeled entries coexist (`/my-kora/kora-space`, explicitly a preview with synthetic data, and `/worker/commons`, the real one) — a disclosed, intentional dual-state (preview vs. real), not an accidental duplicate, but a genuine naming collision worth the Founder's awareness.
- **Already coherent?** Reasonably so for its own scope; smaller surface than Company.
- **Exact unresolved OQ-D01 issue**: same taxonomy-alignment gap as above.

### 4.4 PARTNER
- **Structure**: inline, `buildNavGroups('PARTNER', ...)`.
- **Groups**: a primary group (Workspace Partner, KORA Link, Iniziative KORA Link *(preview)*, Demo Guide) · an "engagement" group (Proposte Partner *(preview)*, Relazioni con i lavoratori *(preview)*, Segnali aggregati *(preview)*, Confine privacy *(preview)*) · a "catalog" group (Catalogo Attività *(preview)*, Richieste attività *(preview)*) · Future Vision (`inactive: true`).
- **Default/landing route**: `/partner/workspace`.
- **Duplicated/orphaned**: none found.
- **Already coherent?** Structurally yes, but heavily preview-flagged — 6 of 10 real items are `preview: true`, meaning most of the Partner environment's own navigable surface is explicitly not-yet-final by the app's own existing convention (a genuine, disclosed immaturity, not an IA defect).
- **Exact unresolved OQ-D01 issue**: same taxonomy-alignment gap.

### 4.5 ADVISOR
- **Structure**: inline, `buildNavGroups('ADVISOR', ...)` — by far the thinnest.
- **Groups**: a single group (Review & Governance → `/demo/advisor`, Demo Guide) · Future Vision (`inactive: true`).
- **Default/landing route**: `/demo/advisor`.
- **Duplicated/orphaned**: none found, but the environment is minimal by design — matches doc 22A §5.3's own explicit "Advisor Portal Light" scope ("No advisor account/login system for demo").
- **Already coherent?** Yes, for its own deliberately narrow scope.
- **Exact unresolved OQ-D01 issue**: same taxonomy-alignment gap, at a much smaller scale (2 real items).

## 5. Unresolved architecture points

One recurring point across all five: **no environment currently organizes its navigation around the Home/Intelligence/Decision/Program/Space/Network/Settings taxonomy `KORA-GAP-PLATFORM-025` names.** Each grew its own product-feature-driven grouping instead. Secondary points: (a) "Space" is not implemented as the cross-environment transversal function PD-017 describes — it appears as an ordinary sibling nav item per environment instead; (b) Territory/Network (PD-018/PD-020/OQ-D02/OQ-D03) do not exist as navigable concepts anywhere yet; (c) the Worker environment's dual "KORA Space" labeling (preview vs. real) is a minor, disclosed naming collision.

## 6. Route-freeze interpretation

- **Is the "do NOT freeze route paths yet" instruction still active?** Its own stated reason (report 61: route/IA finalization should happen "once DD-3/DD-2/DD-1 fix the object model they route to") has been satisfied — DD-1/2/3 are all frozen. So the specific PROHIBITION tied to that unmet prerequisite no longer applies mechanically. However, no later document affirmatively lifts the instruction either — it was never revisited. **Answer: PARTIAL** — the prerequisite condition is met, but the instruction itself was never explicitly re-opened or closed by a subsequent Founder/Product act.
- **What prerequisite was supposed to happen first?** DD-1, DD-2, DD-3 settling the backend/domain object model that routes/tabs would need to point to.
- **Has it now occurred?** Yes — confirmed via reports 80-82 (DD-1), 76-77 (DD-2), 69-70 (DD-3), all terminal freeze/lock readouts.
- **Can OQ-D01 be closed without freezing physical URL paths?** **Yes.** `KORA-GAP-PLATFORM-025`'s own requirement text is entirely about grouping/hierarchy/relationship semantics ("primary navigation · object hierarchy · contextual navigation · global vs local nav · the ... relationship") — it never names URL string format as part of its own Acceptance. The current five-environment route paths (`/admin/*`, `/company/*`, `/worker/*` etc.) can remain exactly as they are under either Option A or Option B below.
- **Can navigation architecture be closed while route strings remain provisional?** Yes, for Option A (§9) definitionally — the current routes ARE what gets documented/tested, verbatim, with no renaming. Even for Option B, a target taxonomy could initially be expressed as a SIDEBAR GROUPING layer over the existing URLs, without renaming them — URL renaming would be a further, separate, not-yet-necessary sub-decision.

## 7. OQ-D02/OQ-D03 relationship

- **OQ-D02 status**: open — "Territory tab / filter / map mode," concerns a feature (Territory Lens, per doc 45/46's own `NETWORK-017`) that does not exist in the current codebase at all. Entirely unbuilt, unrelated to the five-environment sidebar structure itself.
- **OQ-D03 status**: open — "Contextual shortcuts to Partners & Capacity from Home/Program/Decision," also concerns features (a Partner/Capacity directory, per `NETWORK-004`) not yet built.
- **Hard prerequisite for OQ-D01?** No. OQ-D02 and OQ-D03 concern specific, not-yet-built features (Territory Lens, Partner/Capacity directory) that would eventually plug INTO whatever navigation structure OQ-D01 settles — they do not block OQ-D01's own resolution. Report 61's own listing treats all three as one workstream by association (all IA-related, all Master-Plan-cross-cutting), not as a dependency chain.
- **Does WP-073 need to wait for them?** No. **WP-073 must not, and does not need to, expand into OQ-D02/OQ-D03** — those features are unbuilt and out of WP-073's own disclosed scope (Registry 142 names only `KORA-GAP-A11Y-001` and `KORA-GAP-PLATFORM-025` as WP-073's Primary Closures; OQ-D02/D03 inform separate, later `NETWORK-*` capability rows, not WP-073).

## 8. Founder decision necessity

**Classification: 3 — FOUNDER CHOICE REQUIRED.** Not because the sources leave the underlying CONCEPTS ambiguous (DD-1/2/3 already settled those), but because two materially different, both-valid paths remain genuinely open for how `KORA-GAP-PLATFORM-025` gets closed: accept the current, already-built, already-functioning five-environment structure as the durable interim IA (small, immediate), or require the full Home/Intelligence/Decision/Program/Space/Network/Settings taxonomy to be built first (large, a separate undertaking). This is not classification #1 (current code does not already satisfy the target-taxonomy architecture the gap describes — verified, §4-5) nor #2 (there is no single mechanical derivation from frozen sources to today's nav structure — the target taxonomy requires deciding how ~40 existing, concretely-named nav items map onto 7 abstract categories, which is inherently a Product/UX judgment call, not an engineering one).

## 9. Smallest Founder decision set

**DECISION**
Should `KORA-WP-073` close `KORA-GAP-PLATFORM-025` against the CURRENT, already-built five-environment navigation structure (documented and regression-tested as the accepted interim IA), or must the full Home/Intelligence/Decision/Program/Space/Network/Settings taxonomy be implemented across all five environments first?

**OPTION A — Close against current structure**
- Route/sidebar consequence: zero route or sidebar changes anywhere. WP-073 adds a short IA-documentation artifact (recording each environment's own current groups/routes/default-landing-page/current-location semantics, exactly as inventoried in §4) plus permanent regression tests proving no orphaned routes and coherent grouping, matching the KORA Admin environment's own already-established `b169-nav-groups.test.ts` pattern for the other four environments too.
- The target Home/Intelligence/Decision/Program/Space/Network/Settings taxonomy becomes an explicitly separate, later initiative — not yet assigned a WP number in Registry 142.

**OPTION B — Build the target taxonomy now**
- Route/sidebar consequence: every one of the ~40+ existing nav items across all five environments gets re-grouped (at minimum) under the seven target categories; "Space" would need to become a genuinely cross-environment transversal function (PD-017) rather than a per-environment sibling item; Territory/Network placeholders would need to be reserved even though their own features (OQ-D02/D03) remain unbuilt.
- URL renaming is a further, independent sub-choice — Option B does not by itself require it (a grouping layer over existing URLs is possible), but is more likely to prompt it in practice.

**OPTION C**: not identified as genuinely necessary — no third materially-different valid path was found in the sources.

**IMPACT**
- Users: Option A — no visible change to any of the five environments. Option B — every authenticated user's own navigation changes, in every environment, simultaneously.
- Code: Option A — new tests/docs only, in `tests/unit/` and disk-only reports; zero application files touched. Option B — every `Sidebar.tsx`/nav-group file touched (likely `lib/navigation/admin-nav-groups.ts` restructured, plus four new externalized configs for Company/Worker/Partner/Advisor, matching Admin's own already-set precedent), a substantially larger and riskier change than anything else this WP has done.
- Future WPs: Option A — none affected; `KORA-WP-088` (Design System Full Closure, independent per report 195 §10) unaffected either way. Option B — a future, currently-unnumbered WP would very likely need to be created for it, given its own scale; it does not fit inside WP-073's own canonical "Size: M."

**RECOMMENDATION BOUNDARY**: no ranking or recommendation given here, per explicit instruction — this is a factual tradeoff statement only.

## 10. Minimum closure condition

If Option A is chosen, the exact minimum evidence to mark `KORA-GAP-PLATFORM-025 = CLOSED`, drawn only from what canon itself supports (Registry 142's own Acceptance field for `KORA-WP-073`: "site-wide closure"; its own Tests field: "full-site accessibility audit" — IA closure is bundled into the same site-wide-closure Acceptance, not given a separately-worded criterion):
- A short, disk-recorded (or in-repo) document naming, per environment, its own current navigation groups, default/landing route, and confirmation of no orphaned destinations (already gathered in §4 of this report — would need to be formally recorded as the WP-073 IA closure artifact).
- Permanent regression tests, per environment, proving the nav-group structure matches that record (extending `b169-nav-groups.test.ts`'s own precedent to the other four environments) — this is the one piece of `KORA-GAP-PLATFORM-025` closure evidence genuinely missing today, since only KORA Admin currently has this.
- Confirmation that current-location/active-state indication exists (already true — `EXPERIENCE_LAYER.md` §4 documents the existing "terracotta active pill" mechanism).

If Option B is chosen, the minimum closure condition is materially different and larger (a documented target taxonomy, remapped nav items, updated tests across all five environments, likely a fresh, larger canonical pre-check of its own) — not detailed further here since Option B has not been chosen and detailing it in full would exceed this task's own "smallest possible decision package" mandate.

## 11. Expected implementation after decision

**If Option A:**
- Expected files to modify: likely 0 application files; possibly small additions extracting Company/Worker/Partner/Advisor nav groups into their own `lib/navigation/*.ts` files (matching Admin's own pattern) IF the Founder also wants that specific mechanical parity — genuinely optional, not required by the minimum closure condition itself.
- Expected tests to add/change: 4 new permanent test files (or one consolidated file), one per remaining environment, mirroring `tests/unit/b169-nav-groups.test.ts`.
- Route strings: unchanged.
- Sidebars: unchanged (or only refactored into external config files, a mechanical/structural change, not a content/grouping change).
- Effort: **SMALL.**

**If Option B:**
- Expected files: `components/layout/Sidebar.tsx`, all five nav-group sources, likely `docs/EXPERIENCE_LAYER.md` itself (needing a rewrite of §7), plus every page that assumes its own current sidebar grouping context.
- Expected tests: a full rewrite of nav-group tests across all five environments, plus new tests for the "Space" transversal-function requirement specifically.
- Route strings: likely, though not strictly required (§6).
- Sidebars: fully restructured, all five.
- Effort: **LARGE.**

## 12. WP-073 impact

If Option A is adjudicated: WP-073 can proceed to a genuine COMPLETE immediately — the remaining work (§11) is small, mechanical, and does not require further Founder input. If Option B is adjudicated: WP-073 either absorbs a scope far beyond its own canonical "Size: M" (a Founder-authorized scope change) or the IA-taxonomy work is spun out as its own, currently-unnumbered future WP, with WP-073 itself remaining PARTIAL/blocked until that separate work completes — a further sequencing decision the Founder would also need to make explicitly at that point, not resolved here.

## 13. Git status

Clean — this task performed read-only research against the original worktree's own `.kora-audit/output/` reports and this worktree's own current code, wrote only this disk-only report, and modified no application code, no tests, created no commit.
