# Economic Evidence Register — Template & Operating Procedure

**KORA-WP-040** — Economic Evidence Register (Controlled Manual Register)
**Status:** Pilot #1 — controlled manual register. No application table, no migration, no finance BI system, no customer-facing UI.

---

## 1. What this is

Doc `98` §7 (Errata 5), verbatim canonical decision:

> `KORA-WP-040 = CONTROLLED MANUAL ECONOMIC EVIDENCE REGISTER`. No dedicated application table, no migration, no finance BI system, no customer-facing UI.

This document **is** the register's template/specification and its operating procedure — the WP's own deliverable per registry `142`'s Acceptance criterion ("the register template/specification and operating procedure exist, are reviewable on a defined cadence, and are Case/audit-linked"). It is maintained and filled in manually by KORA Operations. No code in this repository reads, writes, computes, or derives anything from register entries — none exists, and none is built by this document.

**Productization boundary** (doc `98` §7, verbatim): *"Productization (a real table/UI) is triggered only by pilot evidence showing recurring volume/effort/error risk justifies it — never pre-built."* A future WP may productize this register once that evidence exists; this document is not that authorization, and nothing here should be read as scaffolding toward it.

## 2. The hard rule: `ADMIN-020 ≠ Cash Truth`

Doc `92` §11 (Lock 11, Resolved), verbatim: *"Hard distinction, now explicit: `ADMIN-020 = workload evidence`, never `= cash ledger`."*

This register **composes** evidence from several sources into one reviewable record. It does **not** become, replace, or override any of the following canonical systems of record:

- **Resource Allocation Ledger** (`KORA-WP-015`) — Company financial governance truth. This register may reference a Resource Allocation entry; it never mutates or duplicates one.
- **Commercial Entitlement + `analytics.fee_charge_event`** (`KORA-WP-062`) — the sole Platform Fee/billing truth. Commercial/Billing values in this register (§4.4) are **manually transcribed, point-in-time observations** of that canonical source as of the review date — never an alternate or competing billing record, never a second contract-tier/billing-cadence/invoice-cycle state.
- **`gov.workload_event`** (`KORA-WP-008`) — the sole Human Workload evidence source (§4.2 below reads from its aggregate, never re-derives or overwrites it).
- **Prime economic architecture** (Program Funds, Worker Entitlement, Partner payable, settlement, reconciliation, Shared Funding) — entirely out of scope. Doc `92` §11 names "Prime Inputs" as a **later** composition category, explicitly deferred to Prime's own timing (DD-4) — not part of this register's field schema today (§4 below has no Prime column).
- **KORA Index, IU, BTI, Confidence Score** — impact/scoring truth. The presence, amount, or completeness of economic evidence in this register never influences, informs, or feeds any impact-scoring computation. Economic evidence is not proof of impact.
- **Decision Spine** (Resource Allocation → Commitment → Evidence Plan → Activation/MVB → Core Decision Linkage → Review → Decision Pack) — this register is not a Decision Spine object, is never linked as one, and never substitutes for a Review verdict or an Advisor proposal.

## 3. Authority — organizational, not code-enforced

Registry `142`, verbatim: *"Auth/RLS: N/A — this is an operational procedure, not an app surface."* There is no application, route, or database object to gate — authority here is an **organizational** control, not a technical one:

- **Who may create/correct an entry:** KORA Operations staff only (an internal KORA_ADMIN-equivalent operational role), consistent with every other ADMIN-020-adjacent primitive this WP composes from (`KORA-WP-008`'s own "KORA-internal-operator primitive (KORA_ADMIN, Advisor) — never a Worker productivity/timesheet tool").
- **Company / Advisor / Partner / Worker:** no role outside KORA Operations creates, edits, or reviews register entries. This mirrors `KORA-WP-040`'s own "Primary Closures: none directly — cross-cutting instrumentation" — the register is a KORA-internal control, never a Company- or Advisor-facing surface.
- **Manual is not ungoverned:** every entry must satisfy §5 (validation) before it is considered complete, and every entry/review must be Case-linked (§6).

## 4. Register schema (one entry = one structured record)

Doc `98` §7, verbatim canonical field schema — reproduced here exactly, no field invented, none omitted:

### 4.1 Identity / Linkage
- Record ID (unique per entry, assigned by KORA Operations at creation)
- Company (the Company this entry's evidence concerns)
- Period (the reporting period this entry covers, e.g. a calendar month or pilot phase)
- Case reference (the Operational Case, see §6, this entry/review is linked to)
- Source/evidence reference (a pointer to where the underlying evidence lives — e.g. an invoice number, a provider statement reference; never the raw document itself, see §7)

### 4.2 Human Workload
- Sourced **exclusively** from `KORA-WP-008`'s existing aggregate reader (`getAggregateEffortByCategory()`, `lib/operations/effort-capture-service.ts`) — total minutes per activity category for the Company/period in question. Recorded here as a **read, point-in-time transcription** of that aggregate; this register never writes to `gov.workload_event` and never recomputes workload totals independently.

### 4.3 Infrastructure / External Cost
- Provider/category (e.g. hosting, third-party data provider, professional services)
- Amount
- Period
- Evidence source (where the cost is documented — an invoice, a provider statement)

### 4.4 Commercial / Billing
- Activation invoiced (yes/no + amount, transcribed from Commercial Entitlement / `analytics.fee_charge_event` as of the review date)
- Recurring fee invoiced (amount, transcribed from the same canonical source)
- Amount collected
- Payment date
- Outstanding amount

### 4.5 Advisor Economic Input
- Accrued/payable cost (the Advisor's own economic cost for the period — a manually-recorded observation, never a payable/settlement transaction; `KORA-WP-074`'s own future Advisor payable-status view, if built, remains the eventual canonical payable surface, not this register)
- Payment timing

### 4.6 Classification
- One of exactly three values: **actual**, **estimated**, **unknown** — applied per entry, recording the evidence quality of the figures above. No other classification value is used.

### 4.7 Provenance
- Recorded-by (the KORA Operations staff member who created/last corrected the entry)
- Recorded-at (timestamp)
- Source document (a reference identifier only — see §7, no raw document content is copied into this register)

## 5. Validation — manual, but not arbitrary

Before an entry is considered complete, KORA Operations confirms:

- Identity/linkage is fully populated (record ID, Company, period, Case reference, source/evidence reference all present).
- Every populated monetary field has an explicit currency; pilot #1 scope is **EUR only** — no multi-currency handling exists or is needed today, and none should be improvised. Amounts are recorded as exact decimal figures (e.g. `1234.56`), never as an approximated floating-point transcription.
- Classification (§4.6) is set to exactly one of `actual` / `estimated` / `unknown` for the entry as a whole; an entry composed of a mix of actual and estimated sub-figures records the **weakest** applicable classification (i.e. `estimated` if any material figure is estimated, `unknown` if any material figure is unknown).
- Provenance (§4.7) is fully populated.
- A malformed or internally inconsistent entry (e.g. an "actual" classification with no source/evidence reference) is **not recorded** — it is corrected before entry, or classified `unknown` with the gap disclosed in the Case (§6).

## 6. Case- and audit-linkage (mandatory, procedural)

Registry `142`, verbatim: *"Audit: register entries manually Case-linked and reviewed per the written procedure."*

Every register entry, and every periodic review of the register (§8), is linked to one **Operational Case** (`KORA-WP-007`, `lib/operations/operational-case-service.ts` — the existing, unmodified shared Case primitive; `organisationType: 'admin'`, since this is a KORA-internal cross-cutting control with no single Company owner). Opening and resolving that Case already produces its own `audit.governance_event` record (`KORA-WP-006`) automatically — this is the register's audit trail. No separate logging mechanism is built or needed; **this document specifies a procedure that reuses the existing Case/audit primitives, it does not introduce a new governance mechanism.**

`KORA-WP-046`'s observability (correlation IDs, structured logs) is explicitly **not** used as economic evidence or as this register's audit trail — it remains technical execution visibility only, unrelated to this procedure.

## 7. Privacy / sensitive data

- No Worker or PIB (Personal Impact Balance) data appears anywhere in this register — it is Company/Advisor/KORA-Operations-level economic evidence only.
- No bank account numbers, payment-card data, or credentials of any kind are ever recorded.
- "Source document" / "source/evidence reference" fields (§4.1, §4.7) are **reference identifiers only** (e.g. an invoice number, a filename, a provider-statement date) — raw invoices, statements, or other source documents are never copied into the register itself; they are retained separately under KORA Operations' own document-handling practice, outside this register's scope.
- Free-text is bounded to what each field explicitly requires (a reference identifier, a provider name) — this register has no open-ended notes field.

## 8. Review cadence (defined, per Acceptance)

The register is reviewed **monthly**, and additionally **before any Founder-facing economic or ROI narrative is drafted from it** — whichever comes first. Each review is its own Operational Case (§6), during which KORA Operations confirms every entry created since the last review satisfies §5, and reconciles the register's Commercial/Billing transcription (§4.4) against the canonical Commercial Entitlement / `fee_charge_event` source as of the review date.

This specific cadence (monthly) is this document's own procedural choice — it is not itself quoted from a named frozen source, and KORA Operations may adjust it; what registry `142`'s Acceptance criterion requires, and what this document satisfies, is that a defined cadence exists and is followed, not this exact interval.

## 9. Immutability / correction model

Because no application table exists, this register's records live in whatever durable medium KORA Operations chooses to maintain (e.g. a controlled spreadsheet or document store) — **not** a database table this repository defines or governs. The following rules apply regardless of the chosen medium:

- A recorded entry is **not silently altered**. A correction is a new, dated entry referencing the record ID it corrects, never an overwrite of the original.
- A recorded entry is **not deleted** as a matter of course — it represents historical evidence. If an entry is later found to have been created in error (not merely imprecise), it is marked superseded/void with a reason, never removed outright.
- Duplicate detection (e.g. the same invoice reference recorded twice) is a manual check performed at entry time and again at each periodic review (§8) — no uniqueness constraint is enforced by this repository, because no table exists to enforce one against.

## 10. Downstream contract — `KORA-WP-043` / `KORA-WP-044`

Both `WP-043` (Test Pyramid Build-Out) and `WP-044` (Security Hardening Batch) list `KORA-WP-040` among the same 14-node Base Pilot I0/I1 Completion Frontier as every other WP in this engagement's recent sequence — their own registry entries record `ADMIN-020/Econ-Evidence: N/A` for themselves. Because this WP adds **zero application code** (no route, no service, no table), there is no functional surface for either downstream WP to extend: `WP-044`'s security-hardening scope has no route to harden here; `WP-043`'s test-pyramid scope has no application-domain behavior to add coverage for beyond this WP's own existing structural-completeness test (`tests/unit/kora-wp-040-economic-evidence-register.test.ts`). **What this WP provides now:** a reviewable, canonical specification and procedure document, plus a test proving its own structural completeness. **What `WP-043`/`WP-044` remain responsible for:** their own frontier-wide passes, unaffected by anything specific to this WP beyond its own existence and completion.
