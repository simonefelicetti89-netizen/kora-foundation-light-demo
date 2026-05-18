# KORA AI Ingestion Engine — Placement, Scope and Governance

*Status: v0.2 — Pending Founder Review*
*Date: 2026-05-17*
*Canonical references: docs 12, 16, 18, CLAUDE.md*
*Does not generate: SQL, migrations, Prisma models, Supabase tables, React components, API endpoints, or application code*
*Gate condition: No code generation until doc 13 gate conditions are met*

---

## 1. AI Engine Placement

### 1.1 Where the AI Engine sits

The AI Ingestion Engine sits between raw data upload and approved UEF records. It is a pre-pipeline classification accelerator — not a scoring component, not a methodology authority, not a final decision-maker.

The AI Engine operates exclusively in the onboarding zone: the space between an uploaded file and the moment a KORA Analyst confirms that a set of normalized records is accurate, complete, and ready to enter the Impact Calculation Engine.

Nothing produced by the AI Engine advances to scoring without human confirmation.

### 1.2 Full pipeline flow

The complete sequence from raw upload to KORA Index is:

```
Raw Dataset Upload
  → File validation (format, schema, size)
  → AI-assisted column mapping
  → AI source type classification
  → AI event type suggestion (per row)
  → AI pillar suggestion (per row, with confidence)
  → AI sensitivity detection (flags elevated-risk records)
  → AI duplicate detection
  → AI missing-field detection
  → AI UEF draft generation (proposed normalized records)
  → AI confidence scoring (record-level + batch-level Data Readiness Score)
  → AI onboarding guidance (structured next-action notes)
  → AI Data Readiness Summary presented to KORA Analyst
  → KORA Analyst review (AI Mapping Review screen)
  → KORA Analyst confirmation, override, or rejection per record
  → UEF Draft Preview (pre-commit verification)
  → Human approval gate — mandatory, no bypass
  ↓
  Approved UEF Records (review_status = 'confirmed')
  ↓
  Stage 1–2: UEF normalization
  Stage 3: BCM Entry assignment
  Stage 4: NM (Normalization Multiplier)
  Stage 5: BC (Benefit-Cohort coefficient)
  Stage 6: CQ (Category Quality)
  Stage 7: EV (Event Verification — declared / evidenced / certified)
  Stage 8: CF (Category Factor)
  Stage 9: AGF (Aggregated Governance Factor = DF + EXF)
  Stage 10: IU calculation (full formula)
  Stage 11: PIB assembly (mandatory; never surfaced to employers)
  Stage 12: Company aggregation
  Stage 13: Activation Safeguard (mandatory; cannot be bypassed)
  Stage 14: KORA Index calculation
```

### 1.3 Architectural position summary

The AI Engine is positioned before Stage 1 of the 14-stage algorithm. It does not touch the scoring formula. It does not assign final IU values. It does not determine the KORA Index. Its outputs are proposals — not records — until a human approves them.

The boundary is absolute: UEF records with `review_status = 'pending'` cannot enter the scoring pipeline. This is enforced architecturally, not by convention.

---

## 2. What AI Is Allowed To Do

The AI Engine has a defined, bounded set of permitted functions. These are enablers, not authorities.

### 2.1 Column recognition

Given an uploaded file, the AI identifies which columns map to which KORA data fields — date, participant identifier, event type, duration, provider name, category label, budget amount, cohort identifier, and others — even when the company's column naming is non-standard, inconsistent, or in Italian.

This reduces the analyst burden of manual column mapping and handles the reality that companies export data in dozens of different formats across HR, LMS, welfare, and ESG systems.

### 2.2 Source-type recognition

The AI identifies the source type of an uploaded file based on its column structure, sample values, and data patterns. A welfare usage export, a training LMS completion log, an ESG initiative declaration, a volunteering coordination record, and an HR workforce segment export each have structural signatures the AI can detect without requiring the user to manually label every file.

Source type recognition is the first classification layer. It determines which BCM category family to apply and which KORA pillars are most likely candidates for the rows in that file.

### 2.3 Event-type suggestion

For each row in an uploaded file, the AI suggests the most likely KORA event type from the defined BCM taxonomy based on the category label, provider name, activity description, and source type already determined in the previous step.

Event-type suggestion is row-level. It does not produce a final BCM assignment — it proposes one. The KORA Analyst confirms or overrides.

### 2.4 Pillar suggestion

For each row, the AI suggests which KORA pillar — LIFE, GROWTH, CONNECTION, IMPACT, LEGACY — the event most likely maps to, with a confidence level per suggestion. Where an event may span multiple pillars (for example, a mentoring program that touches both GROWTH and CONNECTION), the AI proposes a primary and optional secondary pillar suggestion and explains the rationale.

### 2.5 Sensitivity detection

The AI flags records that may contain health-adjacent, psychological, or personally sensitive information based on category keywords, provider names, and event-type descriptions. Flagged records are elevated for heightened privacy review before any UEF record is created.

Examples of sensitivity triggers: mental health support, psychological counseling, burnout assistance, addiction support, medical specialist referrals, chronic condition management programs. The AI does not read or store the personal content — it flags the record type and requires the analyst to make an explicit review decision before the record advances.

### 2.6 Duplicate detection

The AI identifies potential duplicate records across multiple uploaded files or within the same file — same event, same date range, same cohort appearing in two different source exports. Duplicates are flagged with a proposed resolution and require human judgment before any deduplication action is applied.

### 2.7 Missing-field detection

For each row, the AI identifies required fields that are absent and provides structured guidance on what is missing and how the absence affects the record's classification confidence and IU calculation potential. Missing-field detection produces a structured gap map that becomes part of the Data Readiness Summary (Section 6).

### 2.8 Confidence scoring

The AI assigns a preliminary confidence estimate at two levels:
- **Record-level:** how confident the AI is in its event-type and pillar suggestions for a specific row, based on the completeness and clarity of the available data
- **Batch-level:** a Data Readiness Score [0–100] reflecting how complete, consistent, verifiable, and classifiable the uploaded batch is overall

Both confidence levels are visible to the analyst. Neither is the final CQ value — CQ is assigned as part of the methodology pipeline after human confirmation.

### 2.9 Onboarding guidance

The AI generates structured guidance for the KORA Analyst and, where relevant, for the company uploading the data. This guidance is not generic. It is specific to the batch just processed:

"This dataset covers GROWTH events well across 91% of records. LIFE and IMPACT pillars have minimal representation — fewer than 5% of rows. The welfare usage data declared in the program overview has not been uploaded. Adding welfare usage records from your benefits provider would significantly increase pillar coverage and confidence score."

This guidance becomes the basis for the company's next data request, reducing back-and-forth between the KORA Analyst and the company's HR or ESG team.

### 2.10 Rationale explanation per suggestion

For every suggestion the AI makes — column mapping, source type, event type, pillar — it provides a plain-language explanation of why it made that suggestion. This explanation is visible to the analyst in the AI Mapping Review screen and is stored in the audit log.

No AI suggestion is silent. Every proposal comes with its basis.

---

## 3. What AI Is Not Allowed To Do

These are hard constraints. They are not configurable. They are not adjustable by future product versions without explicit founder and methodology team approval.

### 3.1 Approve UEF records without human review

AI suggestions carry `review_status = 'pending'`. A record with `review_status = 'pending'` cannot advance to Stage 1 of the scoring pipeline. The AI cannot change a record's status to `confirmed` — only a KORA Analyst or KORA Admin can do that.

There is no auto-approve mode. There is no low-volume exception. There is no threshold above which AI confidence becomes sufficient for autonomous approval.

### 3.2 Create final Impact Units

The AI operates before UEF records are created. It does not calculate Impact Units. It does not assign NM values. It does not apply BC coefficients. It does not set EV levels. IU calculation is a pipeline function that runs only on approved UEF records. The AI is not part of the pipeline — it feeds the pipeline.

### 3.3 Alter the IU formula or methodology parameters

The IU formula `IU_{e,p} = NM × BC_{e,p} × CQ × EV × CF × AGF [× DF] [× EXF] [× SF]` is fixed. Its parameters are fixed by the methodology version. The AI cannot modify any factor, override any coefficient, or adjust any weight — even when it detects that a dataset is unusual or incomplete.

### 3.4 Bypass the 14-stage algorithm

The 14-stage algorithm is mandatory in full. The AI Engine does not sit inside the algorithm — it sits before it. The algorithm runs on human-confirmed UEF records. There is no shortcut, no fast path, no exception for high-confidence AI suggestions.

### 3.5 Invent data that is not present in the source

If a required field is absent, the AI flags the absence. It does not fill in a default value, estimate a missing date, or assume a participant count. Missing data is missing data — it produces a confidence penalty in the methodology, not an AI-supplied substitute.

### 3.6 Override privacy rules

The AI Engine cannot suppress sensitivity flags, reduce the severity of a sensitivity detection, or reclassify a flagged record as non-sensitive. If the AI detects a potential sensitivity issue, the flag is permanent until an authorized human reviewer explicitly resolves it with a documented decision.

The AI cannot access pseudonymized identifiers in a way that enables re-identification. It cannot produce outputs that name individual workers. It cannot surface any individual-level data to employer-facing views.

### 3.7 Determine fiscal eligibility

Fiscal eligibility is a separate, parallel dimension from impact measurement. The AI may note that a service category is typically associated with welfare fiscal frameworks, but it cannot make a binding fiscal eligibility determination. Fiscal classification at the record level is marked `kora_inferred` and carries an explicit informational disclaimer. Final eligibility determination requires human review and, in live production contexts, the tax/fiscal advisor review completed in Gate 5.

### 3.8 Produce a final KORA Index

The KORA Index is produced by Stage 14 of the algorithm, on methodology-versioned, human-approved data, after a mandatory Activation Safeguard check. The AI cannot produce, simulate, or estimate a KORA Index from its onboarding outputs. Any number that resembles a KORA Index before the full pipeline has run is not a KORA Index — and must not be displayed as one.

### 3.9 Hide uncertainty

When the AI is not confident, it says so. When data is incomplete, the confidence score reflects it. When a suggestion is ambiguous between two pillars, both are shown. When a batch has severe missing-field issues, the Data Readiness Score reflects it honestly — it does not smooth over gaps to make the output look more complete than it is.

KORA does not fabricate precision from low-quality data. This principle applies equally to the AI Engine as to the KORA Index itself.

---

## 4. Human Review Layer

### 4.1 The mandatory review gate

Every batch processed by the AI Ingestion Engine must pass through a human review gate before any record advances to scoring. This gate is not optional. It is not bypassable. It is not conditioned on AI confidence.

The KORA Analyst is the authorized reviewer for all ingestion batches. The KORA Admin may also perform reviews. Company HR/ESG viewers can see the AI Mapping Review output in read-only mode — they cannot approve.

### 4.2 KORA Analyst responsibilities in review

The KORA Analyst reviews the AI Data Readiness Summary to understand the batch quality before inspecting individual records.

In the AI Mapping Review screen, the analyst works through the AI suggestions at the row level. For each record, the analyst can:
- **Confirm** — accept the AI suggestion as proposed. Classification method becomes `ai_suggested → human_confirmed`
- **Override** — change one or more AI suggestions (event type, pillar, confidence band). Classification method becomes `ai_suggested → human_override` with the analyst's values
- **Reject** — remove the record from the batch. A rejection requires an annotation: why was this record excluded?

Bulk-confirm is available for high-confidence, low-sensitivity records where the analyst has reviewed a sufficient sample and is satisfied with the AI quality. Bulk-confirm does not remove the analyst's responsibility — it is a workflow efficiency tool, not an autonomy bypass.

### 4.3 Low-confidence mappings require manual attention

Records where the AI's confidence is below the defined threshold are flagged in the AI Mapping Review screen and cannot be bulk-confirmed. The analyst must individually inspect and explicitly confirm or override each low-confidence record.

Low-confidence flags mean: the AI is uncertain. The analyst must apply judgment.

### 4.4 Sensitive fields require explicit review

Records flagged by sensitivity detection are isolated from the main review queue. They require explicit individual review — they cannot be bulk-confirmed and cannot be processed before a human makes a deliberate decision about each flagged record.

For each sensitivity-flagged record, the analyst must decide: include (with justification and elevated privacy handling), exclude (with annotation), or escalate to a KORA Admin or privacy advisor.

### 4.5 Rejected AI suggestions are logged

Every AI suggestion that a human analyst overrides or rejects is logged with: the original AI suggestion, the human's decision, the reasoning annotation (required for rejections), and the analyst's identifier. This log is part of the immutable audit trail.

This log serves two purposes: audit integrity (any downstream score is traceable back to the human decisions that shaped it) and future improvement (systematic override patterns inform AI recalibration outside the production pipeline).

### 4.6 Approved mappings create auditable UEF records

When the analyst approves a batch through the UEF Draft Preview, the following happens:
- UEF records are created with `review_status = 'confirmed'`
- Each record carries: `methodology_version_id`, `classification_method` (`ai_suggested → human_confirmed` or `ai_suggested → human_override`), `batch_id`, `analyst_id`, `confirmed_at` timestamp
- The batch status moves to `approved`
- The audit trail records the approval event

No record enters the scoring pipeline without these fields populated. They are NOT NULL at the database level.

---

## 5. Onboarding Simplification

### 5.1 The problem the AI Engine solves

Without the AI Engine, onboarding a new company to KORA requires an analyst to manually inspect every uploaded file, identify column meanings, map rows to BCM categories, assign pillar labels, check for duplicates, and identify gaps — for potentially thousands of records across four to six data sources per company.

This process is slow, error-prone, and dependent on analyst availability. It creates a bottleneck between data upload and first insight. For pilot companies with non-standardized exports from multiple HR, welfare, and ESG systems, manual mapping is the primary onboarding friction.

The AI Engine eliminates the bulk of this friction while keeping humans in control of every consequential decision.

### 5.2 How AI reduces friction

**Companies upload messy exports.** The reality of HR, welfare, and ESG data at mid-market Italian companies is: exports are inconsistent, column names are non-standard, multiple files cover overlapping periods, and different systems use different category labels for the same activity type. The AI Engine handles this variation without requiring the company to reformat their data before uploading.

**AI explains what fields are usable.** Instead of a raw validation error list, the company and analyst receive a structured explanation of which uploaded fields can be mapped to KORA data fields, which cannot, and why. This is actionable, not just diagnostic.

**AI tells what is missing.** The missing-field detection and gap analysis produces a precise inventory of what KORA needs but did not receive. "Participant identifiers are missing on 23% of training records. Without identifiers, these rows cannot contribute to individual PIB calculation or activation rate analysis." This is specific guidance, not a generic data quality warning.

**AI proposes mapping.** Instead of the analyst starting from a blank mapping template, they start from an AI-proposed classification that covers 80–90% of the records accurately on realistic datasets. The analyst's job is review and correction — not origination.

**AI creates a Data Readiness Score.** The batch-level [0–100] Data Readiness Score gives the analyst and the company a single legible signal of how prepared this data is for KORA analysis. A score of 85 means: most required fields are present, sources are well-classified, sensitivity flags are minimal. A score of 40 means: significant gaps, low coverage of multiple pillars, many rows require manual review. The score sets expectations before anyone looks at individual records.

**AI produces a clear next data request list.** The onboarding guidance output is structured as a numbered list of recommended actions: "1. Upload welfare usage records from your benefits provider. 2. Add training completions from your LMS with participant identifiers. 3. Confirm the budget allocation for the ESG program declared in your initiative list." This list goes directly to the company's HR or ESG team to prepare the next upload.

**AI reduces back-and-forth cycles.** A typical onboarding without AI support requires three to five rounds of back-and-forth between KORA and the company to clarify what data is needed, what format is expected, and what is already available. The AI Engine compresses this to a first-upload analysis followed by a structured, specific data request — reducing the cycle count and reducing the company's onboarding friction perception.

---

## 6. Data Readiness Output

At the end of AI processing for each batch, the system produces a Data Readiness Output — the structured summary of what the AI found, what it could classify, what it could not, and what should happen next.

### 6.1 Data Readiness Score

A single [0–100] score representing the overall readiness of the uploaded dataset for KORA analysis.

Score interpretation:
- **80–100:** High readiness. Most required fields present. Sources well-classified. Pillar coverage adequate for a meaningful first analysis. Proceed to AI Mapping Review.
- **60–79:** Moderate readiness. Some gaps. Likely adequate for initial analysis with noted limitations. Analyst review is important. Consider requesting supplementary data before scoring.
- **40–59:** Low readiness. Significant gaps in required fields or pillar coverage. Analysis possible but will produce high pre-calibration uncertainty. Analyst must make a deliberate decision about whether to proceed or request additional data first.
- **0–39:** Insufficient readiness. Critical gaps prevent meaningful classification across one or more pillars. Proceeding to scoring will produce very low confidence scores and likely trigger Activation Safeguard warnings. A new data request is strongly recommended before scoring.

The Data Readiness Score is not a judgment of the company's program quality. It is a measurement of data completeness and classifiability. A company with a strong welfare program and disorganized data exports will have a low Data Readiness Score — not a low KORA Index.

### 6.2 Missing required fields

A structured list of fields that KORA expects but did not find in the uploaded data, organized by source type. For each missing field: the field name, why it matters, and what type of source document typically contains it.

### 6.3 Usable fields

A list of uploaded fields that the AI successfully mapped to KORA data model fields, with the mapping shown and the confidence of each mapping. The analyst can inspect and override any mapping in the AI Mapping Review screen.

### 6.4 Sensitive fields detected

A count and category list of sensitivity-flagged records. Each flagged category is listed with: the keyword or pattern that triggered the flag, the number of affected records, and the required action (individual review, analyst decision, optional privacy advisor escalation).

### 6.5 Confidence level

The overall AI classification confidence for the batch — distinct from the Data Readiness Score. The Data Readiness Score reflects data completeness. The classification confidence reflects how certain the AI is about the event-type and pillar suggestions it has made for classifiable records.

High data readiness + low classification confidence means: the data is present but the content is ambiguous or novel. High classification confidence + low data readiness means: the AI is confident about what it sees, but it does not see enough.

### 6.6 Source type recognition results

For each uploaded file, the AI's identified source type (welfare usage, training LMS, ESG initiative, volunteering, HR workforce segment, other), the confidence of that identification, and the pillar family that source type maps to. If a file cannot be source-typed with adequate confidence, it is flagged for manual classification.

### 6.7 Recommended next action

A structured, prioritized list of recommended actions for the analyst and, where appropriate, for the company:
- Proceed to AI Mapping Review (if readiness is adequate)
- Request specific additional data before proceeding (if readiness is low)
- Resolve sensitivity flags before proceeding (if sensitivity flags are present)
- Clarify source type for files the AI could not classify
- Review the specific missing fields flagged and determine if supplementary exports are available

The recommended next action list is the primary handoff document from AI processing to human review.

---

## 7. UX Placement

The AI Engine's functions are surfaced through four dedicated screens in the KORA internal interface (Group B of the MVP screen architecture, doc 18 Section 7).

### 7.1 Upload Studio (Screen I-B1)

The entry point for data ingestion. The company HR/ESG user or KORA Analyst uploads one or more files. The Upload Studio handles format validation, file size limits, and initial schema checks. When files are submitted, the AI Engine begins processing.

This screen also includes the AI-enhanced column mapping interface — after AI processes the uploaded file, the analyst sees the AI's proposed column mappings pre-populated in the interface. The analyst reviews and adjusts before the batch proceeds. Column mapping is the first visible output of the AI Engine — arriving before the full Data Readiness Summary is ready.

State label: **Live** (Upload Studio base function) / **Innovation Preview** (AI column mapping pre-population).

### 7.2 AI Data Readiness Summary (Screen I-B2)

The batch-level overview after the AI Engine has processed a submitted upload. Shows:
- Data Readiness Score [0–100] — prominent, visually encoded
- Source type recognition results per file
- Missing field map (required fields absent)
- Duplicate alert count and categories
- Sensitivity flag count by category
- Classification confidence band for the batch
- Recommended next action list

This screen is the KORA Analyst's first stop after a company uploads data. It tells the analyst whether to proceed to mapping review or return to the company with a data request.

State label: **Innovation Preview**.

### 7.3 AI Mapping Review (Screen I-B3)

The row-level classification review interface. Displays:
- Each uploaded row with AI suggestions: event type, pillar (primary + optional secondary), confidence level, rationale note
- Visual confidence indicators per suggestion (high / medium / low)
- Sensitivity flags inline for flagged records
- Bulk-confirm action for high-confidence, non-sensitive records
- Individual override interface for specific rows
- Rejection action with required annotation
- Batch approval trigger (advances to UEF Draft Preview)

The analyst works through this screen — reviewing, overriding, rejecting — until satisfied that the entire batch is accurately classified. Only then does the batch proceed to the pre-commit preview.

State label: **Innovation Preview**.

### 7.4 UEF Draft Preview (Screen I-B4)

The pre-commit verification view. Shows the exact UEF records that would be written to the database if the current AI mapping is confirmed — with all fields populated, all metadata attached, and all flags resolved.

This is the analyst's last chance to inspect the proposed records before they become permanent database entries. The UEF Draft Preview is not the scoring output — it is the input to scoring. Approving this screen creates the approved UEF records that enter Stage 1.

State label: **Innovation Preview**.

### 7.5 Data Quality Issues (inline)

Data quality issues — duplicates, missing fields, inconsistent values — are surfaced inline throughout the AI Mapping Review screen rather than in a separate dedicated view. Each issue type has a distinct visual treatment and a specific action the analyst must take to resolve it before the batch can proceed.

Unresolved data quality issues block batch approval. The system will not allow a batch to advance to scoring if flagged issues remain unreviewed.

### 7.6 Approval Queue (batch status tracking)

Batch status is visible in the Company Profile (Screen I-A3) and in the KORA Analyst home. Statuses:
- `submitted` — file uploaded, awaiting AI processing
- `ai_reviewed` — AI processing complete, Data Readiness Summary available
- `under_analyst_review` — analyst has opened the AI Mapping Review
- `approved` — batch confirmed, UEF records written to database, ready for scoring
- `rejected` — batch rejected with annotation; company notified if applicable

---

## 8. Governance

### 8.1 Every AI suggestion is logged

When the AI Engine processes a batch, every suggestion it makes — column mapping, source type, event type, pillar, confidence score, sensitivity flag, duplicate flag — is written to the audit trail as an AI-produced record with:
- Timestamp
- Batch ID
- AI model version or pipeline version
- Suggestion content
- Confidence level
- Rationale (plain text)
- Suggestion status: pending (initial state)

This log is INSERT-only. It cannot be modified or deleted.

### 8.2 Every approval and rejection is logged

When the KORA Analyst reviews AI suggestions, every decision is written to the audit trail:
- Confirmed: original AI suggestion + analyst confirmation + analyst ID + timestamp
- Override: original AI suggestion + analyst's replacement values + analyst ID + timestamp + reason annotation (optional for overrides, required for rejections)
- Rejected: original AI suggestion + rejection annotation + analyst ID + timestamp

The full review record — AI proposal → human decision — is permanently traceable for every UEF record created through the AI-assisted pipeline.

### 8.3 Confidence score attached to every classification

Every UEF record created through the AI-assisted pipeline carries:
- `ai_confidence_band` — high / medium / low — the AI's confidence at the time of suggestion
- `classification_method` — `ai_suggested → human_confirmed` or `ai_suggested → human_override`
- `analyst_id` — the human who confirmed or overrode

These fields are NOT NULL. A UEF record from the AI-assisted pipeline that does not carry these fields has not completed the required review process.

### 8.4 Methodology version attached to all outputs

All downstream outputs — UEF records, IU records, PIB records, KORA Index records — carry `methodology_version_id` NOT NULL. This is set at record creation and is immutable. Formula changes produce a new methodology version; they do not retroactively change records created under a prior version.

Historical scores retain their original methodology version label. Any future presentation of a historical score must show its methodology version.

### 8.5 No silent AI decisions

The principle is: if the AI did something, it is visible. There is no background processing path where AI suggestions are applied without being shown to the analyst. There is no implicit AI default that takes effect unless the analyst objects. Every AI action is explicit, visible, logged, and awaiting human confirmation.

### 8.6 No black-box transformation

The AI Engine does not transform data in ways that are opaque to the analyst. The AI's proposed column mappings, event type suggestions, and pillar suggestions are all transparent — the analyst can see exactly what the AI proposed and why. The AI does not perform opaque feature engineering, embedding compression, or intermediate transformations on raw data before presenting its suggestions.

If the AI cannot explain a suggestion in plain language, the suggestion must not be surfaced.

---

## 9. Foundation Light MVP Scope

### 9.1 What is functional now (Foundation Light v0.1)

**AI-assisted column mapping:** Operational. The AI reads an uploaded file and proposes column-to-KORA field mappings. The analyst reviews and adjusts before the batch proceeds.

**Source-type recognition:** Operational. The AI identifies the source type of each uploaded file. Low-confidence identifications are flagged for manual classification.

**Event-type suggestion:** Operational on well-structured data. The AI proposes event types from the BCM taxonomy based on category labels and provider names available in the source file. Suggestions carry confidence levels.

**Pillar suggestion:** Operational. Primary and optional secondary pillar suggestions per row. Confidence level shown. Multi-pillar ambiguity is surfaced, not suppressed.

**Sensitivity detection:** Operational. Keyword and pattern-based sensitivity flagging. Flagged records require individual analyst review before proceeding.

**Duplicate detection:** Operational within and across files in the same batch. Cross-batch deduplication (comparing against previously approved batches) is limited at v0.1 — the analyst is notified to check manually when duplicate patterns are suspected.

**Missing-field detection:** Operational. Required fields are checked per row. Gap map produced per batch.

**Confidence scoring:** Operational at both record level and batch level (Data Readiness Score [0–100]).

**Onboarding guidance:** Operational. Structured plain-language guidance produced per batch, specific to the data provided.

**AI Data Readiness Summary (Screen I-B2):** Functional. All components described in Section 6 are present.

**AI Mapping Review (Screen I-B3):** Functional. Bulk-confirm, individual override, rejection with annotation, sensitivity flag isolation.

**UEF Draft Preview (Screen I-B4):** Functional. Pre-commit record review before database write.

**Review audit log:** Functional. Every AI suggestion and human decision is recorded in the immutable audit trail.

### 9.2 Foundation Light v0.1 AI model type — confirmed decision

**Model type:** Rule-based / taxonomy-based classifier grounded in the BCM taxonomy.

**What this means:** The AI Ingestion Assistant classifies events by matching category labels, provider names, activity descriptions, and source patterns against a structured BCM keyword and category index. There are no external LLM API calls. No company HR data is transmitted to any external AI service. Processing is entirely internal.

**Why this approach was chosen:**
- Full explainability: every suggestion states which BCM keyword matched and why — there is no black-box inference
- GDPR data residency: company HR data never leaves the KORA platform — eliminates the data residency risk entirely
- Processing speed: rule-based keyword matching at BCM taxonomy scale is near-instantaneous — the 60-second processing target for 10,000-row batches is achievable with headroom
- No external cost or latency dependency: suggestion quality does not depend on a third-party API's availability, pricing, or model changes
- Consistency: identical event descriptions always produce identical suggestions — behavior is predictable and auditable

**Accuracy profile:** The rule-based approach achieves high accuracy on well-structured BCM-aligned event descriptions. Accuracy decreases on novel, hybrid, or sector-specific event types not covered by the BCM keyword index. The confidence scoring system (Section 2.8) surfaces uncertainty honestly in these cases — low-BCM-match records receive low confidence bands and cannot be bulk-confirmed.

**Forward path:** Analyst overrides of rule-based suggestions are logged with the original AI suggestion and the human's replacement values. These override logs are the primary data asset for a future ML-based classifier in Foundation tier — where training data from v0.1 pilot engagements can inform a more adaptive suggestion model.

**What this does not change:** All governance constraints in Sections 3 and 4 apply identically to a rule-based classifier. The AI still cannot approve UEF records. The audit trail still records every suggestion. The human review gate is still mandatory. The rule-based nature of the classifier does not relax any governance rule.

---

### 9.3 What is future (deferred beyond Foundation Light v0.1)

**Fully automated ingestion:** No path exists in Foundation Light v0.1 where data flows from upload to scoring without human review. Automated ingestion — where approved templates allow records to skip the review queue — is a Foundation (Tier 2) feature, conditional on demonstrated reliability at Foundation Light v0.1 scale.

**Continuous integrations (HRIS API connections):** Foundation Light v0.1 accepts file uploads only. API-based connections to HRIS, LMS, welfare provider platforms, and ESG systems are deferred. Real-time or scheduled automatic data pulls are not present at v0.1.

**Autonomous anomaly detection:** The AI Engine detects patterns in the uploaded batch — duplicates, gaps, sensitivity signals. It does not continuously monitor the company's data environment for anomalies over time. Continuous monitoring is a future Foundation or Governance tier feature.

**AI recommendation engine:** The AI Engine in Foundation Light v0.1 assists ingestion and onboarding. It does not produce strategic recommendations: "You should invest more in IMPACT." "Increasing LEGACY programs would improve your Pillar Balance score." These are outputs of the Pillar Strategy module (Foundation and Governance tiers).

**Conversational onboarding assistant:** A natural-language interface where a company HR user can ask the AI "What data do I need to provide?" or "Why is my confidence score low?" is a future interface layer. Foundation Light v0.1 uses structured screens and readable output — not a conversational interface.

**Adaptive learning from analyst overrides:** At v0.1, analyst override patterns are logged but not fed back into AI suggestion generation. Systematic feedback loops — where repeated analyst overrides of a specific AI suggestion type cause the AI to adjust its future behavior — are a future AI improvement cycle, not a v0.1 feature.

---

## 10. Final Summary

### 10.1 Where AI sits

The AI Ingestion Engine sits between raw data upload and approved UEF records. It is a pre-pipeline onboarding accelerator. It operates in the classification and quality assessment zone. It does not sit inside the 14-stage Impact Calculation Engine. It does not touch the IU formula. It does not produce a KORA Index.

Its architectural position is: after file upload, before Stage 1.

### 10.2 What it does

The AI Engine performs nine bounded functions: column recognition, source-type recognition, event-type suggestion, pillar suggestion, sensitivity detection, duplicate detection, missing-field detection, confidence scoring, and onboarding guidance. It produces a Data Readiness Score and a structured Data Readiness Output for every processed batch.

All outputs are proposals. All proposals are visible, annotated with confidence levels, and explained in plain language.

### 10.3 What it cannot do

The AI cannot approve UEF records autonomously. It cannot create Impact Units. It cannot alter the IU formula or methodology parameters. It cannot bypass the 14-stage algorithm. It cannot invent missing data. It cannot override privacy rules. It cannot determine fiscal eligibility. It cannot produce a KORA Index. It cannot hide uncertainty.

These constraints are hard architectural rules, not behavioral conventions. They are enforced by the data model, the pipeline structure, and the review gate — not by the AI itself.

### 10.4 How it improves onboarding

The AI Engine eliminates the largest friction points in company onboarding:
- Companies no longer need to reformat their exports to match a rigid template
- Analysts no longer start from a blank mapping interface for every upload
- Data gaps are surfaced specifically and immediately — not discovered after manual inspection
- The company receives a precise next data request rather than vague feedback
- The Data Readiness Score sets accurate expectations about first-analysis confidence before scoring begins
- Back-and-forth cycles between KORA and the company are reduced from five to two

The AI does not make onboarding faster by cutting corners. It makes it faster by making the analyst's review work more efficient and the company's data preparation more targeted.

### 10.5 What remains human-reviewed

Everything consequential. Every UEF record confirmation or override. Every sensitivity flag resolution. Every batch approval. Every rejection and its annotation.

The human reviewer — the KORA Analyst — retains full decision authority over all classification decisions that feed the scoring pipeline. The AI is a capable, transparent, logged assistant. The analyst is the authority.

This division — AI accelerates, humans govern — is not a limitation of Foundation Light v0.1. It is a constitutional principle of KORA that applies at every tier and every scale of the platform.

---

*Document authored: 2026-05-17*
*Version: v0.2 — AI model type confirmed (rule-based BCM taxonomy classifier, no external LLM API calls)*
*Status: Pending Founder Review*
*Canonical references: docs 12, 16, 18, CLAUDE.md*
*Does not generate: SQL, migrations, API design, or application code*
*Gate authority: doc 13 Section 9 (five gate conditions — all apply before implementation)*
