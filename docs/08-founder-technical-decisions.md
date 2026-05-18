# KORA Founder Technical Decisions Before Schema

*Status: Approved Decision Set — Foundation Light v0.1*
*Purpose: Resolve the 10 open architectural decisions from Section 36 of the Conceptual Data Model before technical database schema design begins.*
*Aligned with: Methodological Constitution v0.1, Conceptual Data Model v0.1*

---

## Purpose of This Document

The KORA Conceptual Data Model (doc 07) defines what the platform must know. Section 36 identified 10 decisions that cannot be deferred to implementation: they are architectural choices that shape the database schema from its first table. Getting them wrong means rebuilding foundational infrastructure later — not refactoring, rebuilding.

This document structures each decision with the information a founder needs to make it: what is at stake, what the realistic options are, which choice is recommended for Foundation Light, what can wait, and what the risk of a wrong call looks like.

**These are recommendations, not decisions.** Every choice in this document remains open until explicitly confirmed by the founder. The final column of each section — "Founder Decision" — is left blank for Simone to confirm.

No code. No schema. No implementation stack. This is a decision-making document.

---

## Decision 1 — Privacy Architecture

### The Decision to Make

How is the Worker Identity Layer physically separated from the Anonymized Worker Profile layer?

These two entities were defined as architecturally distinct in the conceptual model. The Worker Identity Layer holds identifiable data — name, employee ID, contract type, real employment history. The Anonymized Worker Profile holds the pseudonymized analytical record — the worker's Impact Units, pillar balance, and activation history — linked only by a pseudonym token, never by a real identifier. The question is: how strong is the separation at the technical level?

### Why It Matters

This is the most important decision in the entire schema. KORA's privacy proposition — that the employer never sees individual identifiable scoring — is only credible if it is enforced by architecture, not by policy. Policy can be circumvented. Architecture cannot.

If these two layers share the same database, a determined developer or an accidental query could join them and re-identify workers. If they are separated correctly, re-identification is structurally impossible without the pseudonymization key — which must be held independently.

This decision determines whether KORA's privacy guarantee is real or theatrical.

### Available Options

**Option A — Single database, separate schemas, access control separation**
The Worker Identity Layer and the Anonymized Worker Profile live in the same database cluster but in separate schemas. Access control rules prevent the analytical schema from accessing the identity schema. The pseudonymization key is managed by a dedicated internal service.

**Option B — Separate databases, same infrastructure**
The Worker Identity Layer lives in a dedicated database. The Anonymized Worker Profile lives in a separate database. They share the same infrastructure provider and deployment environment but are logically and physically separate stores. No direct join is possible at the query level.

**Option C — Separate databases, separate infrastructure environments**
The Worker Identity Layer is deployed on a physically distinct infrastructure environment from the analytical database. The two can only communicate through a controlled, audited pseudonymization service — never by direct connection. This is the highest isolation model.

**Option D — Worker identity held by the company, not KORA**
KORA never stores the Worker Identity Layer at all. The company maps its own identifiers to KORA pseudonyms before submitting data. KORA only receives and processes pseudonymized data from the start. Identity resolution for data subject rights (deletion, export) is handled by the company, not by KORA.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — Same DB, schema separation** | Low implementation complexity; faster to build; easier to manage | Weakest isolation; a misconfigured query or permission can breach the boundary; less defensible in a GDPR audit |
| **B — Separate databases** | Strong logical separation; joins between identity and analytical data are structurally prevented; reasonable implementation complexity | More infrastructure to manage; requires a pseudonymization service layer; slightly higher operational cost |
| **C — Separate infrastructure** | Maximum isolation; most defensible privacy architecture; strongest audit posture | Significantly higher complexity and operational cost; overkill for Foundation Light stage |
| **D — Company holds identity** | KORA stores zero identifiable data; radical simplicity from a GDPR perspective; eliminates KORA's data controller risk for personal identity data | Shifts operational burden to the company; complicates data subject rights support; requires the company to maintain the mapping — which not all companies can do reliably |

### Recommended Choice for Foundation Light

**Option B — Separate databases, same infrastructure.**

This is the minimum viable privacy architecture that is genuinely defensible. Option A introduces risk that is not proportionate to the complexity saved. Option C is correct long-term but overkill for Foundation Light given the constrained build window. Option D, while architecturally elegant, places an operational burden on the company that many SME and mid-market customers cannot reliably carry.

Option B provides real structural separation — joins between identity and analytical data are impossible at the query layer — while remaining buildable within a 90-day timeline.

A pseudonymization service layer must be included from day one. It does not need to be sophisticated, but it must exist as a distinct component that controls all identity-to-pseudonym mappings. This service is the core of the privacy architecture and must not be an afterthought.

### What Can Be Deferred

The migration from Option B to Option C — full infrastructure separation — can be deferred to Foundation or Governance tier, when enterprise customers and GDPR audit requirements make the added investment justified.

Option D can be offered as a customer configuration choice in the Governance tier for companies with strong data management capabilities who prefer not to share any identifiable data with KORA at all.

### Risks If Decided Incorrectly

If Option A is chosen and a breach or GDPR audit occurs, KORA's privacy guarantee is publicly and legally exposed as not architecturally enforced. This is a reputational and regulatory risk that could be fatal at the category-building stage of the company.

If Option C is chosen for Foundation Light, the implementation cost and timeline risk makes the 90-day sellable product impossible to deliver.

### Legal / Privacy / CTO Review Required

**Yes — legal review required before finalizing.** A privacy lawyer or DPO must confirm whether the chosen separation is sufficient under Italian and EU GDPR standards, particularly given that KORA processes data about employees on behalf of a data controller (the company). The determination of whether KORA is a data processor or a joint controller has architectural implications.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 2 — Pseudonymization Key Management

### The Decision to Make

Who holds the pseudonymization key, and how is it managed to support data subject rights — specifically the right to deletion (GDPR Article 17) and the right to data portability (Article 20)?

### Why It Matters

The pseudonymization key is the bridge between the Worker Identity Layer and the Anonymized Worker Profile. Without it, the analytical record for a worker cannot be linked back to a specific person. This is what makes the architecture privacy-preserving.

But data subject rights require KORA to be able to act on a request from a specific worker: delete all their data, or export all their data. Without the key, KORA cannot identify which pseudonymized records belong to that worker. With the key, KORA can — but whoever holds the key has de-facto re-identification capability.

Key management is not just a technical question. It is a legal and governance question about who bears responsibility and who holds power.

### Available Options

**Option A — KORA holds the key internally**
The pseudonymization key is held by KORA's internal privacy service. KORA can resolve pseudonyms to identities for data subject rights processing but does not expose this capability to any employer user. All rights requests are handled by KORA as data processor on behalf of the employer.

**Option B — Split key: KORA holds one half, company holds the other**
Pseudonymization uses a combined key. Neither party alone can reverse the pseudonym. Data subject rights require cooperation between KORA and the company. This is the strongest control model but the most operationally complex.

**Option C — Company holds the key**
KORA generates the pseudonyms but the mapping table — real ID to pseudonym — is held by the company, not by KORA. KORA processes only pseudonymized data. Data subject rights are routed through the company, which uses the mapping to identify the relevant pseudonym and instructs KORA to delete or export the records associated with it.

**Option D — Per-company keys**
Each company has its own pseudonymization key, held by KORA but scoped to that company. Data subject rights for a worker at Company A cannot be resolved using Company B's key. Isolates data subject rights by company, reduces blast radius of a key compromise.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — KORA holds key** | Simple operations; KORA can handle rights requests directly; good UX for the company | KORA has de-facto re-identification capability; requires strong access control and audit trail on key usage |
| **B — Split key** | Maximum privacy control; neither party alone can re-identify | High operational complexity; data subject rights require coordination; may not be practical for Foundation Light |
| **C — Company holds key** | KORA stores nothing identifiable; clean from a data controller perspective | Company must maintain the mapping reliably; many companies will not do this well; creates friction in rights processing |
| **D — Per-company keys** | Blast radius isolation; compromising one company's key does not expose others; clean tenant isolation | Slightly higher key management complexity than a single global key; still requires KORA to hold keys |

### Recommended Choice for Foundation Light

**Option D — Per-company keys, held by KORA's internal privacy service.**

This is the most practical balance for Foundation Light. KORA holds the keys — simplifying data subject rights processing and making the product operationally manageable — but each company's key is isolated, so a compromise or misconfiguration in one tenant cannot expose another. Key usage is logged to the audit trail: every time a key is used to resolve a pseudonym, a record is created.

Option B is the gold standard but is too operationally complex for the 90-day build. It should be offered as an option for enterprise customers in the Governance tier.

Option C is elegant in theory but creates an unacceptable operational risk: if the company loses or mismanages its mapping table, data subject rights become impossible to fulfill — exposing KORA to regulatory liability even though it is not technically at fault.

### What Can Be Deferred

The transition to Option B (split keys) can be offered as an enterprise-grade privacy option in the Governance or Certified tier. Companies with particularly sensitive datasets or strong DPO requirements may want this control.

Key rotation policies and key escrow architecture can be deferred to Foundation or Governance tier.

### Risks If Decided Incorrectly

If KORA has no per-company key isolation (a single global pseudonymization key), a key compromise exposes all workers across all companies simultaneously. This is a catastrophic data breach scenario. Per-company isolation must be built from day one, even if the key management tooling is simple at first.

If KORA cannot fulfill data subject rights requests (deletion or export) because the key architecture does not support it, every data subject request becomes a regulatory incident. GDPR deletion requests carry a 30-day deadline. A broken key management system means a clock that KORA cannot stop.

### Legal / Privacy / CTO Review Required

**Yes — legal and privacy review required.** The key management approach must be reviewed by a GDPR-qualified privacy lawyer or DPO before implementation. The data processing agreement (DPA) between KORA and each company customer will need to address who holds the keys, how rights requests are processed, and what KORA's obligations are as a data processor.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 3 — Multi-Geography Support Scope

### The Decision to Make

Should Foundation Light support only Italy at launch, or should the fiscal/budget perimeter configuration be built to support multiple jurisdictions from day one — even if other countries are not actively seeded?

### Why It Matters

KORA's fiscal eligibility layer depends on a configurable taxonomy of fiscal/budget perimeters. In Italy, this means Welfare Aziendale, fringe benefit thresholds under TUIR Articles 51 and 100, and the specific Italian budget law annual update cycle. In France, Germany, or the UK, the fiscal framework is completely different.

If the schema is hardcoded for Italy, adding a second country later requires restructuring the fiscal taxonomy — which affects every partner eligibility profile, every policy rule, and every audit trail record linked to a fiscal perimeter. This is an expensive change to make post-launch.

If the schema is built as configurable from day one, the Italian fiscal taxonomy is simply the first instance of a country configuration — and adding France or Germany means adding a new country configuration, not rebuilding the schema.

### Available Options

**Option A — Italy-only at Foundation Light; multi-geography deferred**
The fiscal perimeter taxonomy is seeded only for Italy. The schema is designed with multi-geography in mind (the country attribute exists on every relevant entity) but no other country taxonomy is populated or enforced. Adding a new country later requires populating the taxonomy but not restructuring the schema.

**Option B — Multi-geography configurable from day one; only Italy seeded**
The schema and taxonomy architecture are fully multi-geography from day one. The Italian fiscal perimeters are seeded as the default. Other countries can be configured by populating the relevant taxonomy entries, without any schema change. The company entity specifies its primary geography, and the fiscal perimeter display filters accordingly.

**Option C — Multi-geography fully launched at Foundation Light**
Italy, one or two additional jurisdictions (e.g., France, UK) are actively seeded and tested at Foundation Light launch.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — Italy-only, defer architecture** | Simplest build; nothing wasted on unused jurisdictions | If the schema is not designed for multi-geography, adding countries later requires expensive restructuring |
| **B — Architecture multi-geography, seed Italy only** | Clean long-term architecture; no schema change required to add new countries; no additional build complexity at launch | Slightly more upfront design work to ensure the taxonomy is configurable; negligible risk |
| **C — Full multi-geography at launch** | Ready for European expansion from day one | Adds significant build complexity and testing overhead with no revenue justification at Foundation Light stage |

### Recommended Choice for Foundation Light

**Option B — Architecture multi-geography, seed Italy only.**

The architecture cost of building for configurability is low. The restructuring cost of adding multi-geography to an Italy-only schema after launch is high. The right approach is to design the fiscal perimeter taxonomy as a configurable, country-scoped structure from the start — with Italy as the first and only populated instance at launch.

This means every Fiscal/Budget Perimeter entity carries a country code. Every partner eligibility profile carries a country scope. The policy rules engine filters by company geography. None of this adds significant build complexity; it simply means designing the schema correctly from the beginning rather than patching it later.

Option C is out of scope for Foundation Light. First, validate the model in Italy. Then expand.

### What Can Be Deferred

The actual taxonomy seeding for additional countries (France, Germany, UK, Spain, etc.) is deferred to Foundation or Governance tier, when an actual customer in that jurisdiction is ready to use the product. The architecture work happens now; the content work happens when there is demand.

Localization (translated UI, country-specific report templates) is deferred entirely to post-Foundation Light.

### Risks If Decided Incorrectly

If Option A is chosen and the schema is not designed for multi-geography from the start — even if Italy-only data is populated — adding a second country becomes a breaking change. Every partner eligibility profile, every policy rule and every historical audit record linked to a fiscal perimeter has to be migrated. This is a significant and avoidable restructuring cost.

### Legal / Privacy / CTO Review Required

**No legal review required for this decision specifically.** However, when expanding to additional jurisdictions, each country's fiscal and privacy framework must be reviewed with local counsel before launching. This decision is architectural, not legal.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 4 — Ingestion Pipeline Design

### The Decision to Make

Should the ingestion pipeline be synchronous — the company uploads data and KORA processes it immediately — or asynchronous — uploads are queued and processed in batches, with status tracked and results returned when processing is complete?

### Why It Matters

The ingestion pipeline is the entry point of KORA. Every Ingestion Batch, every Raw Dataset, every UEF Record flows through it. The design choice here determines how the ingestion experience works for the company user, how classification and scoring jobs are structured, and how errors, rejections and quality flags are surfaced.

For Foundation Light — where the ingestion model is a human-assisted CSV-style upload rather than a live API integration — this choice is particularly important because the data volumes and the workflow expectations are different from a real-time streaming environment.

### Available Options

**Option A — Synchronous processing**
The company uploads a file or submits data. KORA processes it immediately, in the same request cycle. Classification, quality checks, UEF conversion and scoring all happen before a response is returned. The company sees results immediately.

**Option B — Asynchronous processing with status tracking**
The company uploads data. KORA accepts the submission and queues it for processing. The company sees a "Processing" status. When processing is complete — minutes or hours later — the company is notified and can view results. The Ingestion Batch entity tracks queue status throughout.

**Option C — Asynchronous with manual review step**
Same as Option B, but before final scoring, a KORA analyst or the company performs a review step: verifying classifications, resolving ambiguous mappings, and approving the batch for final scoring. Scoring only runs after approval.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — Synchronous** | Immediate feedback; simple UX; no queue infrastructure required | Fails for large datasets; any processing error fails the entire upload; does not scale; no opportunity for human review before scoring |
| **B — Asynchronous, no review** | Scales to large datasets; processing errors are isolated to the batch; simple queue infrastructure; standard and expected pattern | Results not immediate; requires status tracking and notification infrastructure; slightly more complex than Option A |
| **C — Asynchronous with manual review** | Matches the Foundation Light delivery model (consultant-assisted); allows quality control before scoring; appropriate for pre-automated tiers | Adds a human step that must be operationalized; extends turnaround time; not suitable for fully automated tiers |

### Recommended Choice for Foundation Light

**Option C — Asynchronous with manual review step.**

This recommendation is deliberately shaped by what Foundation Light actually is: a consultant-assisted diagnostic, not an automated self-serve tool. The company submits data. A KORA analyst reviews the ingestion batch, resolves classification ambiguities, and approves the batch for final scoring before the KORA Index is calculated. This is not a limitation — it is the Foundation Light delivery model, and it is a feature, not a bug.

Option A fails at scale and removes the possibility of human quality oversight that Foundation Light requires. Option B is appropriate for later tiers where ingestion becomes self-serve and automated, but it skips the review step that protects output quality in the first version.

The Ingestion Batch entity must carry a status field that supports this workflow: Submitted → Under Review → Approved → Processing → Complete → Error. This does not add significant complexity; it adds the operational scaffold that Foundation Light actually needs.

For Foundation tier and beyond, the manual review step can be made optional or automated for low-ambiguity batches.

### What Can Be Deferred

Fully automated ingestion — where the entire pipeline from upload to KORA Index runs without human involvement — is deferred to Foundation or Governance tier, when the classification rules are mature enough to be trusted without review.

Real-time streaming ingestion (continuous data from partner APIs) is a Future Ecosystem feature and must not be architected for at Foundation Light stage.

### Risks If Decided Incorrectly

If Option A is chosen and a large company submits a dataset with thousands of records, the synchronous model will time out or fail. Foundation Light is pitched to companies with meaningful workforce sizes — a 500-person company might have years of welfare and training data to ingest. Synchronous processing is a reliability and user experience risk.

If the manual review step is omitted entirely, Foundation Light outputs are based on raw automated classification without quality control. This weakens the audit defensibility of the KORA Index at exactly the moment — the first impression — when trust must be established.

### Legal / Privacy / CTO Review Required

**CTO review recommended.** The specific queue technology, retry logic and error handling design are implementation choices. The conceptual decision — asynchronous with a manual review stage — is a founder and product decision. The CTO should validate that the chosen approach is compatible with the selected infrastructure before schema design begins.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 5 — Methodology Version Activation

### The Decision to Make

When KORA publishes a new version of its methodology — updated weights, revised formulas, new Impact Unit coefficients — how are company scores and historical data handled? Are existing scores automatically recalculated under the new version, or do they remain under the version that produced them?

### Why It Matters

The KORA Methodological Constitution defines all weights, coefficients and formulas as provisional and subject to revision. Methodology v0.1 is explicitly labelled "Pre-Calibration." Future versions will update the scoring model as empirical evidence accumulates.

When a new version is published, there are two types of records to consider:

- **Historical scores** — KORA Index values, Impact Units and PIB records already calculated under the prior version.
- **Pending data** — data that is present in the system but not yet scored, or data that will be submitted in the future.

The decision about what happens to historical scores under a new methodology version has significant implications for audit integrity, commercial trust and engineering complexity.

### Available Options

**Option A — Preserve historical scores under the version that produced them; new data scored under new version**
Historical KORA Index records retain their v0.1 label permanently. When the company's Q4 report was generated under v0.1, it stays as a v0.1 report. New ingestion batches submitted after v0.2 is published are scored under v0.2. The company can see both, and the version label on each output tells them which methodology was in effect.

**Option B — Automatic recalculation of all historical data under the new version**
When a new methodology version is published, KORA reruns scoring on all historical data for all companies under the new version. The company's history is restated. The old scores are retained in version history but the "current" view shows scores calculated under the latest methodology.

**Option C — Optional recalculation, company-initiated**
Historical data is not automatically recalculated. But the company (or KORA analyst) can trigger a recalculation of any historical period under the current methodology version. This produces a restated score that sits alongside the original. Both are labelled with their respective methodology version.

**Option D — No recalculation ever; strict version isolation**
Historical scores are permanently locked under the version that produced them. No recalculation. The new version applies only to new data. Trend charts show version breaks explicitly — a line on the chart where the methodology changed — rather than presenting a single continuous series.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — Preserve historical, score new under new version** | Audit integrity preserved; historical scores remain defensible; clean version boundaries | Trend comparisons across version boundaries require care; "year over year" comparisons mix versions |
| **B — Automatic recalculation** | Clean continuous score history; easier trend analysis | Historical audit records are implicitly restated; companies may question why their prior score changed; higher compute cost; can create confusion if a major methodology revision significantly changes a company's history |
| **C — Optional recalculation** | Maximum flexibility; companies can choose whether to restate | Complexity: multiple score versions for the same historical period can be confusing; requires careful UI design to avoid ambiguity |
| **D — Strict version isolation** | Maximum audit integrity; no question about what was the basis of any historical score; cleanest from a legal/compliance perspective | Trend analysis is complicated; requires explicit methodology version markers in every chart and export; requires the company to understand methodology versioning |

### Recommended Choice for Foundation Light

**Option A — Preserve historical scores under the version that produced them; score new data under the current version.**

This is the correct default for a platform where auditability is a core promise. When a company's HR director or tax auditor reviews a Q2 report produced under KORA Methodology v0.1, that report must remain interpretable under v0.1 — regardless of what v0.2 says. Retroactive restatement of historical scores is operationally and legally uncomfortable: it changes the evidentiary basis of decisions that have already been made.

The engineering implication: every scoring output must carry a `methodology_version` field. Every Impact Unit, every KORA Index record, every PIB record is tagged with the version that produced it. When a new version is activated, new ingestion batches are scored under the new version. Historical records are never touched.

For trend analysis across versions, KORA surfaces a version-break marker — not an apology or a complication, but a clearly labelled methodological transition that the company can understand and explain.

### What Can Be Deferred

Option C — optional recalculation — can be offered in the Governance or Certified tier for companies that specifically want to produce restated historical scores for a regulatory review or an investor ESG report. This is a feature with real value for mature customers; it does not belong in Foundation Light.

### Risks If Decided Incorrectly

If Option B is chosen and a major methodology revision significantly changes a company's KORA Index retroactively, the company may lose trust in the platform. If they shared a Q3 report with their board under v0.1 and the same quarter now shows a significantly different score under v0.2, the credibility of the earlier report is undermined — even if the new score is methodologically more correct.

If the methodology version field is not built from day one, adding it later requires retroactively migrating every scoring record in the database. This is avoidable if the field is included in the schema from the first ingestion batch.

### Legal / Privacy / CTO Review Required

**No specific legal review required for this decision.** However, the audit trail implications should be confirmed with the advisor who reviews KORA's compliance reporting methodology: if reports produced under a specific methodology version are used as the basis for a tax deduction or a regulatory filing, the version provenance of those reports matters.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 6 — Evidence Record Storage

### The Decision to Make

Where are evidence documents — receipts, certificates, attendance records, photographs, confirmation emails — physically stored? Does KORA store them internally, or does it link to an external document management system (DMS) owned by the company or a third-party service?

### Why It Matters

Evidence Records are what make the verification layer of KORA meaningful. An Advisor-Confirmed eligibility classification is only as trustworthy as the underlying documentation that an advisor reviewed. A verified action is only as defensible as the evidence that was uploaded to support it.

The physical location of that evidence has practical implications: who is responsible for its integrity, how long it must be retained, who can access it, what happens if the company cancels their KORA subscription, and whether KORA is responsible for storage costs at scale.

### Available Options

**Option A — Internal storage in KORA's data store**
All evidence documents are uploaded to and stored within KORA's infrastructure — a blob storage layer (e.g., S3-compatible storage). KORA is responsible for storage, access control, retention and backup. The Evidence Record entity holds a pointer to the internal location.

**Option B — External DMS linked by reference**
KORA does not store the actual documents. The Evidence Record entity holds a URL or reference ID pointing to the document in the company's own DMS (e.g., SharePoint, Google Drive, a welfare platform's document store). KORA records the link, the metadata (what was documented, by whom, when), and the classification it supports — but the document itself lives outside KORA.

**Option C — Hybrid — internal by default, external by exception**
KORA stores documents internally by default. For companies that prefer to manage their own document storage, KORA accepts external DMS references as an alternative. Both models are supported in the Evidence Record entity.

**Option D — External storage only, with KORA-controlled access**
Documents are stored in an external provider (e.g., a dedicated blob storage layer outside the main KORA database) but KORA controls access. The document store is logically "KORA's" but physically separate from the operational database. A pointer in the Evidence Record links to this external-but-KORA-controlled store.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — Internal** | Simple; KORA controls integrity and access; no dependency on external systems | KORA is responsible for storage costs, data retention obligations, backup and document security; adds complexity to offboarding and data portability |
| **B — External DMS** | KORA has no storage obligation for document content; simple Evidence Record entity; documents remain under the company's control | Links can break (document moved, deleted or permissions changed); KORA cannot guarantee evidence integrity; audit trail has a gap if the linked document disappears |
| **C — Hybrid** | Maximum flexibility; accommodates different company data management practices | Increases implementation complexity; two code paths for evidence retrieval; harder to enforce consistent access controls |
| **D — External-but-KORA-controlled** | Clean separation of operational database and document storage; scales well; document access controlled by KORA; standard architectural pattern | Slightly more infrastructure to manage; still a storage cost; slightly more complex than pure internal |

### Recommended Choice for Foundation Light

**Option D — External-but-KORA-controlled blob storage, with a pointer in the Evidence Record entity.**

Option A conflates the operational database with document storage — two things that should scale independently. A large welfare dataset may include hundreds of uploaded documents per company; storing these inline or in the operational database creates performance and cost problems at scale.

Option B is unsuitable as a primary model because broken links compromise the audit trail. If an evidence document disappears from an external DMS after a company offboards from a welfare provider, the classification it supported becomes unverifiable. For a platform where audit defensibility is a core product promise, this is an unacceptable risk.

Option D is the industry-standard approach: a purpose-built blob storage layer (outside the operational database) controlled by KORA, with signed access URLs generated on demand. The Evidence Record entity holds the document identifier and metadata; the storage layer holds the file. The two are linked by a stable, KORA-managed reference that does not depend on any external system's uptime or access policy.

### What Can Be Deferred

Option B — accepting external DMS links — can be offered as a secondary option in the Governance tier, for companies that have strong internal document management and prefer to retain custody of their evidence documents. In that case, KORA accepts the external link but records a metadata snapshot (document hash, timestamp, description) at the time of linking, so at least the state of the evidence at classification time is recorded even if the original document later moves.

### Risks If Decided Incorrectly

If Option B is the primary model and linked documents break, KORA's audit trail contains gaps. During a tax audit, a company tries to demonstrate that a benefit was verified by an advisor — but the supporting document link is dead. The classification is now unsupported. KORA shares reputational risk even if it is not technically responsible.

If document storage is not separated from the operational database from the start, adding a separate storage layer later requires migrating every existing Evidence Record — a significant and disruptive operation.

### Legal / Privacy / CTO Review Required

**Yes — both CTO and legal review recommended.** Evidence documents may contain sensitive personal data (health records, psychological support receipts, medical certificates). The storage architecture must comply with GDPR requirements for personal data — including appropriate access controls, retention periods, and the right to deletion. The blob storage provider and its data residency must be confirmed before launch.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 7 — Report Generation Architecture

### The Decision to Make

When a company user requests a KORA report — the quarterly KORA Index summary, the HR/ESG export, the pillar balance view — is that report generated fresh in the moment (on-demand calculation) or retrieved from a pre-computed store where it was calculated and saved at a scheduled time?

### Why It Matters

The answer determines how the Report entity behaves, how data freshness is managed, how long a user waits for results, and what happens when the underlying data or methodology changes between two views of the same report.

For Foundation Light — where ingestion is batch-based and happens on a defined cycle — this decision is more straightforward than it would be in a real-time platform. But it still matters for schema design and for setting correct expectations with buyers about what "real-time" means in KORA.

### Available Options

**Option A — On-demand generation**
Every time a user views a report, KORA recalculates it from the underlying data. The Report entity holds configuration (which period, which segment, which perimeters) but not output. Output is computed fresh on request.

**Option B — Pre-computed and stored**
Reports are calculated on a schedule (e.g., after each ingestion batch is approved) and stored as Report records. When a user views a report, they are viewing the stored output of the last calculation. A "last computed" timestamp tells them how current the data is.

**Option C — Pre-computed with on-demand refresh**
Reports are pre-computed and stored (Option B), but the user can trigger a manual refresh that recalculates the report from the latest available data. The stored version is the default; a fresh calculation is available on request.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — On-demand** | Always current; no stale data risk; simpler Report entity | Slow for large datasets; puts computation load at the moment of highest user attention (when they're looking at the screen); no audit-stable snapshot of "the report as it was at this time" |
| **B — Pre-computed** | Fast; predictable; provides a stable snapshot of the report at a specific point in time; supports audit trail (the report that was presented is preserved) | Data is only as current as the last computation; user must understand that the report reflects data up to the last ingestion batch, not today |
| **C — Hybrid** | Best of both — stable stored version with on-demand refresh capability | More complex; two code paths for report retrieval; risk of user confusion about which version they are looking at |

### Recommended Choice for Foundation Light

**Option B — Pre-computed reports, stored as Report entities, generated after each ingestion batch is approved.**

Foundation Light operates on a batch ingestion model. Data does not flow continuously — it arrives in periodic batches. On-demand calculation in this context does not produce a fresher result; it produces the same result as the last pre-computed version, just more slowly. The Foundation Light delivery cadence — a diagnostic based on a submitted dataset — naturally aligns with pre-computed, stored reports.

Pre-computation also provides an important audit property: the report that was presented to the company's leadership on a specific date is permanently stored. If a company used that report to make a budget decision or provide evidence to an advisor, KORA can reproduce exactly what was shown and when. On-demand generation cannot provide this guarantee because recalculating the same report after a methodology version change or new data ingestion would produce a different result.

The Report entity carries: report type, company, time period covered, ingestion batch it was derived from, methodology version used, computed timestamp, and the stored output in a structured, exportable format.

### What Can Be Deferred

Option C — manual on-demand refresh — is appropriate for Foundation and Governance tiers where companies have recurring data feeds and want to see updates more frequently than a batch cycle allows. Deferred.

### Risks If Decided Incorrectly

If Option A is chosen and the query for a complex KORA Index calculation across a large workforce takes 30 seconds to return on a report page load, the product experience is unacceptable for a premium platform. Pre-computation is also the correct architecture for a product that makes audit claims about its outputs — you cannot audit a report that is never stored.

### Legal / Privacy / CTO Review Required

**CTO review recommended.** The specifics of how pre-computed reports are stored (format, compression, access control) and how long they are retained are implementation decisions. The conceptual choice — pre-computed and stored — is a product and founder decision.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 8 — Advisor Identity Management

### The Decision to Make

Are KORA-authorized advisors — the individuals who review eligibility classifications, approve ingestion batches, and provide advisor-confirmed confidence levels — managed as first-class KORA users (with accounts inside the KORA system) or as external identity references (named in records but not holding KORA accounts)?

### Why It Matters

The Advisor Review entity links a review decision to a specific advisor. The Eligibility Confidence model at the highest levels (Advisor-Confirmed, KORA Advisor-Confirmed) requires that the reviewing advisor be identifiable, attributable and traceable. The question is whether that identity is managed inside KORA's user system or referenced externally.

This decision also has commercial implications: a KORA Advisor Network — where advisors hold KORA accounts and can operate within the platform — is a future revenue stream and an ecosystem feature. How much of that infrastructure is needed at Foundation Light?

### Available Options

**Option A — External reference only**
The Advisor Review entity records the advisor's name, title, organization and the date of review. The advisor is not a KORA user. The record is populated by the KORA analyst who manages the engagement, based on documentation provided externally. No advisor login. No advisor-facing interface.

**Option B — Full KORA user account for advisors**
Advisors are onboarded as KORA users with a specific advisor role. They log into KORA, review the classification records they have been assigned, and submit their review within the platform. The Advisor Review entity is linked to their User record.

**Option C — Lightweight advisor identity — email-confirmed, no full account**
Advisors are identified by email. When an advisor review is requested, an email is sent to the advisor with a secure link to a review interface. The advisor confirms or modifies the classification through that interface. The response is linked back to the Advisor Review entity. No persistent account, but the identity is email-confirmed.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — External reference** | Simplest implementation; no user management for advisors; no external-facing interface to build | Advisor identity is not verified within KORA; auditability depends on the KORA analyst recording the information accurately; advisor cannot interact with KORA directly |
| **B — Full user account** | Most complete; advisors are first-class participants; audit trail is direct and verified; enables advisor network features | Requires advisor user management, onboarding flow, role permissions and an advisor-facing interface; disproportionate to Foundation Light scope |
| **C — Email-confirmed lightweight identity** | Verified identity without full account infrastructure; advisor interacts with KORA but does not need a persistent account; supports audit trail with confirmed identity | Requires a secure link generation and email workflow; more complex than Option A; less scalable than Option B for high-volume advisor networks |

### Recommended Choice for Foundation Light

**Option A — External reference, with structured metadata.**

For Foundation Light, advisor reviews are part of the consultant-assisted delivery model. The KORA analyst working with the company documents the advisor's review based on written communications, signed opinions or advisory letters. The Advisor Review entity records: advisor name, title, organization, type of review, date, methodology version in effect, and a reference to the supporting documentation (linked or uploaded as an Evidence Record).

This is not a limitation on audit quality. An advisor's written opinion on letterhead, documented and stored in the Evidence Record system, is more legally robust than a button click inside an application. Option A at Foundation Light can be presented to customers as the appropriate model for the consulting-grade service they are receiving.

Option B is the right architecture for the KORA Advisor Network at Foundation or Governance tier, when the advisor ecosystem becomes a commercial product in its own right.

### What Can Be Deferred

Option B — full KORA advisor accounts — is deferred to Foundation tier, when advisor network participation becomes a revenue stream and advisors need direct platform access to review multiple company portfolios. This is a significant feature that deserves its own specification.

Option C — lightweight email-confirmed identity — is a sensible intermediate step for the Foundation tier before Option B is fully built.

### Risks If Decided Incorrectly

If Option B is attempted at Foundation Light, the engineering scope expands significantly: an advisor-facing interface, role permissions for advisors, onboarding flows, and security considerations for external users accessing company data. This delays the 90-day sellable product without commercial benefit at this stage.

If Option A produces Advisor Review records that are poorly structured or inconsistently populated, the audit trail is weaker than it should be. The structured metadata requirement — specifically, that advisor name, organization, review type and date are mandatory fields — must be enforced.

### Legal / Privacy / CTO Review Required

**Legal review recommended** at the point of designing the advisor review workflow: when an advisor provides a classification opinion within KORA's workflow, there may be questions about professional liability, confidentiality obligations and whether the opinion is specific to this company or generic. These are commercial and legal design questions, not schema questions, but they affect what the Advisor Review entity must record.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 9 — Audit Trail Immutability

### The Decision to Make

How is audit trail immutability enforced? The KORA Methodological Constitution defines the audit trail as a non-negotiable, append-only record of every significant action in the platform. The question is how this is enforced technically, conceptually, and through governance.

### Why It Matters

The audit trail is what makes KORA's outputs legally defensible. If a company uses a KORA report to support a tax filing or respond to a labor inspection, the audit trail must demonstrate that the data was processed consistently, the classifications were applied correctly, and no records were altered after the fact.

If the audit trail can be edited, deleted or overwritten, it is not an audit trail — it is a log with a misleading name. The immutability mechanism must be real, not a convention.

### Available Options

**Option A — Append-only database table with application-level controls**
The Audit Trail Records table is designed as append-only: insert operations are permitted; update and delete operations are blocked at the application level. No audit trail record is ever overwritten. The immutability is enforced by application logic and database permissions.

**Option B — Cryptographic hashing — hash chains**
Each audit trail record contains a cryptographic hash of its content plus the hash of the prior record, creating a chain. Any modification to any record breaks the chain and is detectable. This does not prevent deletion but makes tampering visible.

**Option C — Write-once external log service**
Audit trail records are written to a write-once external logging service (e.g., a WORM-compliant storage system, an external immutable log provider). The operational database contains a pointer to the external log record. The immutability guarantee comes from the external service, not from KORA's own controls.

**Option D — Database-level immutability with periodic export to read-only archive**
Audit trail records are stored in the main database with application-level append-only controls (Option A), and periodically exported to a read-only archive — a separate storage system from which records cannot be modified or deleted. The archive is the legally defensible copy; the operational database is the working copy.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — Application-level append-only** | Simple; no additional infrastructure; standard pattern | Relies on application-level controls being correctly implemented; a database administrator with direct access could still delete records; weakest guarantees in adversarial scenarios |
| **B — Hash chains** | Tamper-evident; any modification is detectable; strong for audit defensibility | Does not prevent deletion; requires careful implementation; adds computation to every record write |
| **C — External write-once service** | Strongest immutability guarantee; legally robust; independent of KORA's own infrastructure | External dependency; added cost and complexity; not necessary at Foundation Light scale |
| **D — Application-level with read-only archive** | Practical balance; the archive provides legal defensibility even if the operational table is compromised; manageable implementation complexity | Requires periodic export process; two storage locations to manage; archive must be secured correctly |

### Recommended Choice for Foundation Light

**Option A — Append-only table with application-level controls, with Option D as the near-term upgrade path.**

For Foundation Light, Option A is the appropriate starting point. The audit trail operates in a controlled environment with a small number of KORA users. Application-level append-only controls — where the database role used by the application has insert permissions but not update or delete permissions on the audit trail table — are sufficient for the Foundation Light operational context.

However, the design must be explicit: the immutability mechanism at Foundation Light is application-level. This must be documented transparently in any governance claims KORA makes about its audit trail. The product should not claim cryptographic or write-once immutability before that capability is in place.

Option D — periodic export to a read-only archive — is the correct near-term upgrade and should be planned as a Foundation tier feature. Option B — hash chains — adds tamper-evidence without adding immutability, and can be implemented as an enhancement once Option D is in place.

### What Can Be Deferred

Options B and C are deferred to Governance or Certified tier, when the audit trail's legal defensibility becomes a formal product claim in the KORA Certified offering. At that stage, the investment in cryptographic integrity or a write-once external service is justified by the commercial promise being made.

### Risks If Decided Incorrectly

If KORA claims full immutability at Foundation Light but enforces it only at the application level, a sophisticated audit could expose that a database administrator could have modified records. This undermines the credibility of the audit trail at exactly the moment a customer depends on it.

The correct approach is to be precise about what is guaranteed at each tier: Foundation Light offers application-enforced append-only audit records; Governance offers read-only archived audit records; Certified offers cryptographic or write-once audit trail with independent verification. Honesty about the capability at each level is more credible than overstating it from the start.

### Legal / Privacy / CTO Review Required

**CTO review required.** The specific mechanism for enforcing append-only behavior at the database level — database roles, permissions, write policies — is a technical design decision. The choice of archive technology and export schedule is also a technical decision. The conceptual requirement — that audit trail records must never be altered — is a product requirement. Both layers need to be consistent.

**Legal review recommended** before making formal audit trail claims in commercial agreements or marketing materials. The language used to describe KORA's audit trail in contracts with customers should accurately reflect the technical mechanism in place at the time.

### Founder Decision

**To be confirmed by Simone.**

---

## Decision 10 — Partner Eligibility Profile Ownership

### The Decision to Make

Who can create or update a Partner Service Eligibility Profile in KORA — and when multiple parties can contribute, whose update takes precedence and at what confidence level?

The Eligibility Profile is the record that defines whether a specific partner service is Eligible, Conditional, Uncertain or Excluded under each Fiscal/Budget Perimeter. It is the foundation of KORA's fiscal governance layer. Its ownership and update workflow determine whether it is trustworthy.

### Why It Matters

The Eligibility Profile is consulted every time a company activates a service under a tax-advantaged perimeter. If the profile is wrong — because a partner overstated their eligibility, because an advisor's review was not captured correctly, or because a legislative change was not reflected — a company may activate a service under a perimeter it does not qualify for. This is a fiscal compliance risk.

Multiple parties have a legitimate interest in the Eligibility Profile:
- **Partners** know their own services and want to declare their fiscal eligibility status.
- **Advisors** independently verify eligibility classifications for specific companies.
- **KORA** maintains taxonomy and inferred classifications.
- **Companies** may want to configure overrides for their own policy perimeters.

The question is how these inputs are weighted and who controls what.

### Available Options

**Option A — KORA-only update**
Only KORA can create or modify Eligibility Profiles. Partners submit eligibility information through a structured intake process. KORA analysts review and publish the profile. No external party can directly update a profile in the system.

**Option B — Partner-submitted, KORA-approved**
Partners can submit eligibility profiles through a partner portal or intake form. KORA reviews and approves before publication. The partner's submission sets the initial profile; KORA approval is required before it becomes visible to companies. Confidence level: Partner-Declared (before KORA review) or Partner-Documented (after KORA review).

**Option C — Multi-party with confidence-linked precedence**
Multiple parties can update the Eligibility Profile, with each contribution tagged by source and confidence level. A KORA-or-Advisor-Confirmed update supersedes a Partner-Declared update. The profile always displays the highest-confidence current classification, with the full history of contributions visible in the audit trail.

**Option D — Company-level override layer**
The global Eligibility Profile (Option A, B or C above) exists at the network level. Each company can additionally configure a company-level override for their own policy purposes — for example, excluding a service that is globally Eligible because company policy does not allow it, or noting that their advisor has reviewed a Conditional service and confirmed it as Eligible for their specific situation. Company-level overrides do not affect the global profile; they apply only within that company's configuration.

### Pros and Cons

| Option | Pros | Cons |
|---|---|---|
| **A — KORA-only** | Maximum control; high trust in profile quality; no risk of self-serving partner declarations distorting the catalog | Operationally intensive for KORA; does not scale if the partner network grows large; slow to update when fiscal legislation changes |
| **B — Partner-submitted, KORA-approved** | Scales better; leverages partner knowledge; KORA review maintains quality standards | Requires partner intake workflow and KORA review queue; partner submissions at Partner-Declared confidence until reviewed |
| **C — Multi-party with confidence precedence** | Most comprehensive; captures all available intelligence; transparent about the source of each classification; audit trail shows full history | More complex; requires clear confidence precedence rules and UI to display them without confusion |
| **D — Company override layer** | Allows company-specific customization without contaminating the global profile; captures advisor-confirmed classifications specific to a company | Adds a second layer to the eligibility model; requires the UI to clearly distinguish global vs company-level classifications |

### Recommended Choice for Foundation Light

**Option B for the network-level profile, with Option D as a company-level configuration layer from Foundation tier onward.**

For Foundation Light, the partner catalog is small and curated. KORA should maintain direct control over every published Eligibility Profile. Partners provide eligibility information through a structured intake; KORA reviews and publishes. This is Option B, but operationally it behaves like Option A for the Foundation Light catalog — KORA reviews everything before it is visible.

The Eligibility Profile entity must be designed to support multi-party contributions from day one, so that Option C can be introduced in Foundation or Governance tier without schema restructuring. Specifically: every profile entry must carry a `source` field, a `confidence_level` field and a `contributed_by` field (KORA, partner, advisor, company). The precedence rules for displaying the current classification are applied at query time, not stored as a flat override.

Option D — company-level override — is a Foundation or Governance tier feature. Companies at Foundation Light receive the global profile as configured by KORA. Company-specific advisor reviews are captured in the Advisor Review entity but do not yet modify the Eligibility Profile at the company level.

### What Can Be Deferred

Full partner self-service portal with direct profile submission (Option B at scale) is deferred to Partner Network / Future Ecosystem tier. At Foundation Light, partner eligibility information is collected manually and entered by KORA analysts.

Option C at full implementation — where all parties contribute directly and the system manages precedence automatically — is deferred to Governance tier.

### Risks If Decided Incorrectly

If partners can update their own Eligibility Profiles without review — or if the schema does not track who made each update — a partner can declare their service as Eligible under every perimeter without any basis. A company activates the service, takes the tax deduction, and later faces an audit. The eligibility profile that justified the activation is a self-declaration with no independent review. This is a compliance risk for the company and a credibility risk for KORA.

If the Eligibility Profile schema is designed as a flat record (one row per service per perimeter, last-write wins), adding multi-party contributions with confidence precedence later requires a complete model restructuring. Designing it as a contribution log from day one costs nothing and avoids this.

### Legal / Privacy / CTO Review Required

**Legal review recommended.** The question of who can declare fiscal eligibility — and what liability KORA takes on by publishing those declarations — has legal implications. KORA's standard disclaimer (eligibility classification is not legal or tax advice) must be enforced in the platform UX and in commercial agreements. The Eligibility Profile workflow must be consistent with that disclaimer.

### Founder Decision

**To be confirmed by Simone.**

---

## Recommended Foundation Light Decision Set

The 10 decisions above are not equally consequential for the 90-day build. Some must be locked immediately because they affect the first table in the schema. Others can be deferred slightly, with the schema designed to support the chosen direction without requiring the full implementation from day one.

The following is the recommended default configuration for KORA Foundation Light, derived from the analysis in this document.

### Privacy Architecture

**Recommendation:** Separate databases — one for the Worker Identity Layer, one for the Anonymized Worker Profile. A pseudonymization service layer, internal to KORA, manages all identity-to-pseudonym mappings with per-company key isolation. No application can directly query across both databases. Legal review required before implementation begins.

**Rationale:** Privacy is a product promise, not a policy. Architecture-enforced separation is the only credible implementation.

### Pseudonymization Keys

**Recommendation:** Per-company keys, held by KORA's internal privacy service. Key usage is logged to the audit trail. A data subject rights workflow — supporting deletion and export — must be designed before ingestion of any personal data begins.

**Rationale:** Per-company isolation limits blast radius. KORA-held keys enable KORA to fulfill data subject rights obligations without depending on the company.

### Multi-Geography

**Recommendation:** Architecture supports multiple jurisdictions via country-scoped Fiscal/Budget Perimeter configurations. At Foundation Light launch, only the Italian fiscal taxonomy is seeded. No other countries are populated or tested.

**Rationale:** The architecture cost of building for configurability now is far lower than the restructuring cost of adding geography later.

### Ingestion Pipeline

**Recommendation:** Asynchronous with a mandatory manual review step before scoring. The Ingestion Batch entity carries a full status lifecycle (Submitted → Under Review → Approved → Processing → Complete / Error). Automated ingestion is a later-tier feature.

**Rationale:** Foundation Light is a consulting-grade diagnostic. Human review before scoring protects output quality and is a feature of the service, not a limitation.

### Methodology Version Activation

**Recommendation:** Historical scores are permanently locked under the version that produced them. New ingestion batches are scored under the current active methodology version. Every scoring output carries a `methodology_version` field from the first record.

**Rationale:** Audit integrity requires that historical reports remain interpretable under the methodology that was in effect when they were produced.

### Evidence Record Storage

**Recommendation:** Evidence documents stored in a KORA-controlled external blob storage layer, separate from the operational database. The Evidence Record entity holds document identifier, metadata, and access pointer. Sensitive documents (health records, psychological support receipts) carry an elevated privacy flag that restricts access.

**Rationale:** Document storage must scale independently of the operational database. KORA-controlled storage maintains audit trail integrity. A broken external link is an audit gap.

### Report Generation

**Recommendation:** Reports are pre-computed after each approved ingestion batch and stored as Report entities. Reports carry: time period, ingestion batch reference, methodology version, computation timestamp, and stored output. On-demand refresh is a later-tier feature.

**Rationale:** A pre-computed, stored report is auditable. An on-demand calculation is not. Foundation Light operates on a batch model where pre-computation is appropriate.

### Advisor Identity

**Recommendation:** Advisors are external references at Foundation Light — name, title, organization, date, and type of review are mandatory fields on every Advisor Review record. Supporting documentation is uploaded as an Evidence Record. No advisor KORA accounts at this stage.

**Rationale:** Foundation Light is a consultant-managed service. Advisor written opinions, documented and stored, provide stronger legal weight than platform interactions at this stage.

### Audit Trail Immutability

**Recommendation:** Append-only audit trail table enforced at the application level — the application database role has insert-only permissions on the audit trail table. This is documented transparently. The near-term upgrade path (Foundation tier) is periodic export to a read-only archive. Cryptographic immutability is deferred to Governance or Certified tier.

**Rationale:** Application-level append-only is sufficient for Foundation Light's operational context, provided the capability level is stated accurately and not overstated in commercial claims.

### Partner Eligibility Profile Ownership

**Recommendation:** All Eligibility Profiles are managed by KORA analysts at Foundation Light. Partner eligibility information is collected via a structured intake; KORA reviews and publishes. The schema is designed to support multi-party contributions with confidence-level precedence from day one — so that partner self-service and advisor-confirmed company overrides can be added in later tiers without schema restructuring.

**Rationale:** Quality control is most important at the catalog-building stage. The schema design allows for expansion without the operational risk of premature self-service.

---

## Summary: Foundation Light Decision Map

| Decision | Recommended Choice | Legal/CTO Review | Deferred Feature |
|---|---|---|---|
| Privacy architecture | Separate databases, pseudonymization service layer | Legal required | Infrastructure separation upgrade at Foundation |
| Pseudonymization keys | Per-company keys, KORA-held, usage logged | Legal required | Split-key option at Governance |
| Multi-geography | Italy only seeded; configurable architecture | None | Taxonomy seeding per country at Foundation/Governance |
| Ingestion pipeline | Asynchronous, mandatory manual review | CTO recommended | Automated ingestion at Foundation |
| Methodology versioning | Preserve historical; tag all outputs with version | None | Optional restatement at Governance |
| Evidence storage | KORA-controlled blob storage, separate from DB | Legal + CTO required | External DMS option at Governance |
| Report generation | Pre-computed after approved batches | CTO recommended | On-demand refresh at Foundation |
| Advisor identity | External reference, mandatory structured fields | Legal recommended | KORA advisor accounts at Foundation |
| Audit trail | Application-level append-only | CTO required | Read-only archive at Foundation; crypto at Certified |
| Partner eligibility | KORA-managed catalog; multi-party schema ready | Legal recommended | Partner self-service at Partner Network tier |

---

## Founder Approval Checklist

| Decision # | Decision Area | Recommended Choice | Founder Status | Founder Notes |
|---|---|---|---|---|
| 1 | Privacy Architecture | Separate databases, pseudonymization service layer, per-company key isolation | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 2 | Pseudonymization Key Management | Per-company keys held by KORA's internal privacy service, usage logged to audit trail | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 3 | Multi-Geography Support Scope | Italy-only taxonomy seeded at launch; architecture configurable for additional jurisdictions without schema change | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 4 | Ingestion Pipeline Design | Asynchronous with mandatory manual review step before scoring | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 5 | Methodology Version Activation | Historical scores preserved under the version that produced them; all scoring outputs tagged with methodology version from day one | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 6 | Evidence Record Storage | KORA-controlled external blob storage, separate from the operational database; sensitive documents carry elevated privacy flag | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 7 | Report Generation Architecture | Pre-computed after each approved ingestion batch; stored as Report entities with methodology version, computation timestamp and ingestion batch reference | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 8 | Advisor Identity Management | External reference only at Foundation Light; mandatory structured fields (name, title, organization, review type, date); supporting documentation stored as Evidence Record | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 9 | Audit Trail Immutability | Application-level append-only enforced at Foundation Light; near-term upgrade to read-only archive at Foundation tier; cryptographic immutability deferred to Governance/Certified | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |
| 10 | Partner Eligibility Profile Ownership | KORA-managed catalog at Foundation Light; schema designed for multi-party contributions with confidence-level precedence from day one; partner self-service deferred to Partner Network tier | Approved by Simone for Foundation Light v0.1 | Approved as default for technical schema v0.1, subject to CTO/legal/privacy review where indicated. |

Technical schema design may now begin, using these 10 approved decisions as the Foundation Light v0.1 architectural baseline.

---

*Founder approval required before technical schema.*

*All decisions in this document are recommendations. No choice becomes final until explicitly confirmed by Simone Felicetti.*

*Once founder decisions are confirmed, the next step is the KORA Technical Data Model and Database Schema Definition.*

---

*KORA Founder Technical Decisions Before Schema — Version 0.1*
*Status: Approved Decision Set — Foundation Light v0.1*
*Aligned with: Methodological Constitution v0.1, Conceptual Data Model v0.1, Foundational Product Brief, Fiscal & Policy Eligibility Layer, Eligibility Confidence.*
