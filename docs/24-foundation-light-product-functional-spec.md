# Foundation Light — Product Functional Specification v1.0
**Document:** `docs/24-foundation-light-product-functional-spec.md`
**Type:** Product Functional Specification — Build Blueprint
**Audience:** UX/UI Designers, Frontend Developers, Backend Developers
**Status:** v1.0 — Pending Founder Review
**Gate dependency:** GO FOR DEMO APP WITH SYNTHETIC DATA. SQL generation blocked until Gate 2.

---

## 1. Executive Summary

This document is the product blueprint for KORA Foundation Light. It translates the architecture, methodology, demo build cutline (doc 22A), and code readiness audit (doc 23) into an actionable specification for designers and developers.

KORA Foundation Light is a **controlled, ambitious multi-sided demo app with synthetic data**, designed to demonstrate:

- The full intelligence loop from data ingestion to KORA Index
- The company Human Impact Intelligence value proposition
- The worker adoption layer (My KORA — Personal Impact Layer)
- Partner and advisor ecosystem logic
- Privacy-first architecture in product experience
- Collective and cross-company activation
- The future platform model (clearly labeled, mockup only)

**This document is:** Product specification. Build blueprint. Behavior contract between product, UX and development.

**This document is not:** Methodology. Database schema. SQL. Pitch deck. Architecture decision record.

**Read first:** `docs/kora-canonical-product-architecture-v1.md` (v1.1) is the canonical product architecture reference. This document derives from it. In case of conflict on product scope, positioning, workspace structure, capability catalogue, language policy and demo boundaries, the canonical document takes precedence. Methodology definitions — including KORA Index component names and definitions, IU formula, algorithm sequence, PIB role and Activation Safeguard structure — remain governed by `docs/10-architecture-v3-layer-specification.md`. If this document conflicts with doc 10 on methodology, doc 10 governs and the conflict must be reported before implementation. Refer to the canonical document for: capability scope matrix, Italian-first language policy, CSR Evidence Mapping rules, HR KPI Correlation rules, certification path rules, anti-drift rules.

**Build status at time of writing:**
- GO FOR DEMO APP WITH SYNTHETIC DATA
- SQL generation: blocked until Gate 2 (CTO review)
- Live company data: blocked until Gate 3 (legal/privacy)
- Live fiscal outputs: blocked until Gate 5 (tax/fiscal)
- Production worker accounts: blocked until Gate 3

---

## WORKER ADOPTION AS COMMERCIAL DEPENDENCY

**This section is not optional.**

Worker adoption is a commercial dependency, not a secondary engagement feature.

KORA sells to companies. KORA only becomes commercially sustainable if workers trust it, use it, and perceive genuine personal value. Without worker adoption, KORA risks being perceived as a data extraction tool, an HR surveillance layer, or another corporate platform asking people to contribute without receiving anything in return.

**Worker Value Loop:**

```
Company creates / funds / enables initiatives
        ↓
Workers discover opportunities, partners, collective events
        ↓
Workers save, request, participate
        ↓
Experiences become private timeline items
        ↓
Verified experiences can feed Dynamic Impact CV (worker's choice)
        ↓
Only anonymized aggregate signals contribute to company intelligence
        ↓
Company improves initiatives, access, allocation and trust
        ↓
Workers receive better opportunities
```

**The governing principle:** KORA does not ask workers to give data for the company's dashboard. KORA gives workers a private personal impact layer. Only anonymized aggregate signals contribute to organizational intelligence.

My KORA must not be treated as a decorative demo module. It is a core adoption layer and a core commercial dependency.

---

## 2. Product Principles

| # | Principle | Operational Meaning |
|---|---|---|
| P-01 | **Intelligence before administration** | Every screen must produce insight or action, not form-filling. If it's only admin, it belongs in settings or future scope. |
| P-02 | **Organization-level measurement, personal-level value** | KORA Index measures companies. PIB gives workers private personal value. These are separate and must never be confused. |
| P-03 | **Worker adoption is a commercial dependency** | My KORA is not a nice-to-have. It is what makes KORA a platform and not a dashboard. |
| P-04 | **Privacy as product, not policy** | Privacy boundaries must be visible, understandable, and reassuring — not buried in legal text or assumed. |
| P-05 | **Explainability everywhere** | Every score, every indicator, every warning must include a plain-language explanation. No black-box outputs. |
| P-06 | **Confidence always visible** | The Confidence Score must always appear with the KORA Index. They are inseparable. A score without confidence is incomplete. |
| P-07 | **No employer visibility into individual data** | Employer roles see only anonymized aggregate data above the privacy threshold. This is enforced by grant absence, not by policy. |
| P-08 | **No ranking, no gamification, no surveillance** | Workers are never compared to each other. There is no leaderboard, no score ranking, no performance implication. |
| P-09 | **No HR performance logic** | PIB is not a performance score. KORA Index is not a workforce rating. Neither may be used for hiring, firing, promotion, or appraisal. |
| P-10 | **Partner ecosystem without marketplace drift** | Partners enable activation. KORA is not a discount platform, booking engine, or commerce layer. |
| P-11 | **Booking Light, not transactional marketplace** | Workers can request participation and track status. No checkout, no payment, no slot inventory, no voucher issuance. |
| P-12 | **KORA Contribution separate from KORA Index** | KORA Contribution measures verified external impact. It is a companion indicator, not a component of the KORA Index. |
| P-13 | **Company value and worker value must reinforce each other** | Better company programs → better worker opportunities → stronger activation → better KORA Index. The loop must be visible. |
| P-14 | **Demo credibility over feature completeness** | A convincing demo of the intelligence loop is more valuable than a half-built feature set. |
| P-15 | **Future vision clearly labeled** | Every mockup area must say "Future Vision / Not Active in Foundation Light." No ambiguity. |
| P-16 | **Ambition in experience, discipline in release scope** | Product experience should feel like an ambitious deeptech platform. Release depth must be controlled. |
| P-17 | **Collective impact without social-network drift** | Cross-company initiatives and volunteering are about verified contribution, not social feeds, likes, or visibility. |
| P-18 | **Data integration before API complexity** | File uploads and manual input come before API connectors. Foundation Light is not an integration platform. |
| P-19 | **Italian-first platform copy** | All UI text, warnings, recommendations, next best actions, report text, privacy explanations, demo copy, onboarding, microcopy, and evidence descriptions must be in Italian. Proprietary names remain in English: KORA Index, KORA Contribution, My KORA, Dynamic Impact CV, Activation Safeguard, Confidence Score, UEF, Impact Units, Activation Debt, Evidence Debt, Trust Ledger, KORA Activation Network, Board Pack, KORA Evolution, Public KORA Snapshot. |
| P-20 | **CSR Evidence Mapping is a people-evidence layer, not an ESG compliance engine** | KORA supports CSR/ESG reporting context by providing structured, verified, explainable people evidence. It does not guarantee regulatory compliance and does not replace ESG, legal, fiscal, or assurance consulting. Standard disclaimer must appear on all CSR/ESG-referencing outputs. |
| P-21 | **HR KPI Correlation and People ROI are adjacent interpretation layers** | They do not feed the KORA Index automatically. All HR KPI comparisons are aggregate-only and must explicitly state "correlazione ≠ causalità." No causal claim, no predictive analytics claim in Foundation Light. |
| P-22 | **Capability scope discipline** | Not all canonical KORA capabilities are in Foundation Light build scope. Before implementing any module, verify its status in the Capability Scope Matrix (`docs/kora-canonical-product-architecture-v1.md §25`). Public KORA Snapshot, LinkedIn sharing, KORA Value Chain, and KORA Certified are future/mock only. |

---

## 3. Platform Roles

| Role | Purpose | Visible Sections | Allowed Actions | Forbidden Access | Demo Status | Future Status |
|---|---|---|---|---|---|---|
| **KORA Admin** | KORA platform operator — manages companies, programs, ingestion, scoring, reports, partner catalog, methodology config, advisor queue. May access pseudonymized operational records where necessary for platform operations. | All operational sections | Company setup, program config, ingestion, UEF review, scoring, report generation, methodology config (read-only in demo), partner catalog, advisor queue, synthetic demo data management | Identity-linked individual worker personal layer content by default. Worker bookings, partner contacts, Dynamic Impact CV, sensitive wellbeing/health-related metadata, consent records, and individual exports require KORA Privacy Officer elevation. | Functional Core | Full platform operations |
| **KORA Privacy Officer** | Privileged audit role — exceptional, legally justified, purpose-limited access only. Used exclusively for: data subject requests, privacy incidents, correction/deletion requests, consent disputes, compliance audit. All access must be scoped, logged and reviewable. Not interchangeable with KORA Admin. | Scoped — only as required for legally justified purpose | Data subject access requests, correction/deletion, consent audit, incident response | General platform operations — this role is not a standard operator role | Demo: not active (defined for Gate 3 production) | Required before Gate 3 pilot |
| **KORA Analyst** | KORA internal review — data quality and explainability. May review pseudonymized UEF/IU/scoring records. May not access worker identity-linked personal content, Dynamic Impact CV, bookings, partner contacts, or sensitive wellbeing/health-related metadata unless escalated through Privacy Officer workflow. | Ingestion, UEF Review, Scoring, Explainability | Approve/reject/flag UEF, review explanations, view pseudonymized company outputs | Billing, user management, worker bookings, partner contacts, Dynamic Impact CV, personal plan, sensitive wellbeing/health-related metadata | Functional Core | Full operational access |
| **Founder / KORA Internal** | Strategic + validation | All sections + Founder Validation Cockpit | All | Nothing | Functional Core | Same |
| **Company Admin** | Company-level configuration and access management | All company sections (aggregate only) | Configure programs, manage users, view all company outputs, request advisor | Individual UEF/IU/PIB/worker_profiles, worker personal data | Functional Core | Full company admin |
| **Company HR / People** | Workforce activation intelligence | Cockpit, KORA Index, Activation, Pillars, Data, Warnings, Reports | View aggregate company intelligence, download reports | Individual worker data, financial governance, billing | Functional Core | Extended reporting |
| **Company ESG / Sustainability** | Contribution and social impact | Cockpit, KORA Contribution, Pillars, Partner Network, Reports, Fiscal Classification | View ESG-relevant outputs, export sustainability annex | Individual worker data, billing | Functional Core | CSRD/ESRS report |
| **Company Finance** | Financial governance and fiscal intelligence | Executive Cockpit (aggregate summary only), KORA Index (aggregate summary only), Financial Governance, Fiscal Classification, Reports (financial) | View aggregate KORA Index summary, Confidence Score, financial governance indicators, budget vs activation aggregates, cost per IU indicator, fiscal classification informational layer, export finance reports | Individual worker data, workforce drilldowns beyond aggregate/safe thresholds, individual UEF/IU/PIB, worker bookings, partner contacts, Dynamic Impact CV, personal timeline, sensitive wellbeing/health-related data | Functional Core | FUO / Welfare Statement (future) |
| **Company Viewer / Board** | Read-only executive view | Cockpit only | View, export KORA Snapshot | All admin functions | Functional Core | Board pack export |
| **Worker / My KORA User** | Personal impact layer | My KORA only | All personal actions — view PIB, manage opportunities, Dynamic CV, bookings, privacy settings | Company financials, company-level detail, other workers' data | Functional Core (demo: synthetic) | Full pilot after Gate 3 |
| **Partner Admin Light** | Partner profile and service management | Partner Workspace Light | Manage profile, services, opportunities, collective initiatives, requests, evidence | PIB, worker timelines, company confidential data | Semi-Functional Preview | Full partner portal (Ecosystem tier) |
| **Advisor External Light** | Evidence review and validation | Advisor Workspace Light | Review assigned records, assign eligibility confidence, add notes | Unassigned records, individual PIB, financial governance | Semi-Functional Preview | Advisor certification (Governance tier) |

**Absolute privacy rules (non-configurable):**
- Employer roles have no database-level access to `analytics.uef_records`, `analytics.impact_units`, `analytics.pib_records`, `analytics.worker_profiles` — enforced by grant absence, not RLS alone.
- Employer roles cannot see: worker timeline, bookings, partner contacts, saved opportunities, Dynamic Impact CV, preferences, requests, personal plan, sensitive wellbeing/health-related metadata.
- Employers see only anonymized aggregate participation above minimum group size threshold (default: 10 workers).
- Partners see only minimum data required to process a request, with explicit worker consent.
- Advisors see only records in their assigned review scope.
- Workers control their own personal layer entirely.
- **Privileged access is not standard admin access.** All exceptional access (KORA Privacy Officer) must be legally justified, scoped to purpose, logged and reviewable. Standard KORA Admin access does not extend to identity-linked individual worker personal layer content.

---

## 4. Authentication & Access Model

### A. Foundation Light Demo Mode
- Synthetic personas for all roles
- Role switcher or demo login (no real credentials required)
- No real worker production accounts
- No live HR data, no real personal data, no real partner transactions
- All data is synthetic or pseudonymized

### B. Foundation Light Pilot Mode — after Gate 3

| Actor | Auth Method | Notes |
|---|---|---|
| Company users | Invited accounts, magic link / OTP / passwordless | MFA required for Admin and Finance roles |
| Company domain | Domain verification where appropriate | Not required for all company sizes |
| Workers | Invitation-based, magic link / OTP | Consent screen + privacy onboarding before first use; account linked to pseudonymized profile through KORA privacy service |
| Partners | Invited partner admin light accounts | Limited profile/service/request management; no payment access |
| Advisors | External advisor light access or controlled review link | Scoped review permissions only |

**Worker privacy at auth level:** Employer never sees worker login activity, requests, bookings, or personal actions at individual level. Auth logs are internal KORA only.

### C. Future Enterprise / Certified Mode
- Company SSO via SAML/OIDC (Microsoft Entra, Google Workspace)
- SCIM provisioning
- Advanced audit log integration
- Optional SPID/CIE/eIDAS for high-trust identity layers, verified credentials, Dynamic CV portability, KORA Link proof, Certified tier

**SPID/CIE note:** Not required for Foundation Light. Not the default worker auth method in v0.1. Foundation Light should avoid identity friction. Trust onboarding and privacy clarity are more important than identity verification in the first pilot cycle.

---

## 5. Data Ingestion Model

| Ingestion Type | Input Format | Who Uploads | AI Mapping Role | Human Review | Privacy Flags | UEF Output | Demo Behavior |
|---|---|---|---|---|---|---|---|
| HRIS population file | CSV/Excel | KORA Admin / KORA Analyst | Suggest worker/role/dept mappings | Required — analyst approves | Privacy level per field | Worker pseudonym records | Simulated with synthetic HR extract |
| Welfare provider export | CSV/Excel | KORA Admin | Suggest event type, pillar, evidence level | Required | High if sensitive wellbeing/health-related data present | UEF draft events | Simulated with welfare events |
| LMS export | CSV/Excel | KORA Admin | Suggest training event type, GROWTH pillar | Required | Low-medium | UEF draft training events | Simulated with training records |
| ESG/CSR initiative file | CSV/Excel | KORA Admin / ESG role | Suggest IMPACT/LEGACY pillar, event type | Required | Low | UEF draft contribution events | Simulated with CSR data |
| Training records | CSV/Excel | KORA Admin | Suggest training type, hours, pillar | Required | Low | UEF draft training events | Simulated |
| Partner files | CSV/Excel | KORA Admin / Partner | Suggest partner event type, pillar, verification | Required | Medium | UEF draft partner events | Simulated |
| Manual initiative entry | Form input | KORA Admin / Company Admin | N/A | Instant draft — review before scoring | Depends on content | UEF draft record | Functional in demo |
| Evidence documents | PDF/image upload | KORA Admin / Advisor | N/A | Advisor review | Low | Linked to existing UEF record | Functional in demo |
| Simulated upload | Pre-loaded demo file | KORA Admin (demo) | Runs full mapping simulation | Simulation shows review flow | Pre-defined | Full UEF draft set | Primary demo ingestion method |

**Ingestion rules (non-negotiable):**
- AI suggests mappings; humans approve. AI does not assign final discretionary scores.
- No external LLM processes HR or worker data in v0.1. AI is rule-based BCM taxonomy classifier.
- UEF records only become scorable after approval status = `approved`.
- Every ingestion shows: confidence per mapping, missing fields, rejected records, privacy flags.
- Sensitive wellbeing/health-related data (psychological support, therapy, prevention services, medical-adjacent content) is flagged and requires elevated privacy handling. Foundation Light must not store or display detailed medical/clinical records.
- File-based ingestion precedes API integrations. Manual input must work in demo and early pilots.

**Future ingestion (not in Foundation Light):**
- Scheduled API connectors to HRIS/LMS/welfare providers
- KORA Link real-time NFC/QR events
- Partner API push integrations

---

## 6. Information Architecture — Full Platform

| Side | Purpose | Primary User | Value Proposition | MVP Status | Critical Risk |
|---|---|---|---|---|---|
| **A. KORA Admin Workspace** | Internal operations — ingestion, scoring, governance, validation | KORA Admin, KORA Analyst, Founder | Run the platform, manage companies, produce intelligence | **Functional Core** | Over-complexity before demo readiness |
| **B. Company Intelligence Workspace** | Organizational impact intelligence — the product companies buy | Company roles | Understand, interpret, improve human activation | **Functional Core** | Becoming generic dashboard instead of intelligence layer |
| **C. My KORA — Personal Impact Layer** | Private personal impact layer for workers | Worker | Give workers real value, drive adoption, create trust | **Functional Core (demo: synthetic)** | Being perceived as surveillance or welfare-lite |
| **D. Partner Workspace Light** | Partner participation in ecosystem | Partner Admin Light | Enable verified activation through services and initiatives | **Semi-Functional Preview** | Drifting into marketplace product |
| **E. Advisor Workspace Light** | Validation and evidence review | Advisor External Light | Build trust through independent expert validation | **Semi-Functional Preview** | Scope creep into full certification workflow |
| **F. Future Vision Area** | Show platform direction | Investor, prospect, board | Demonstrate long-term platform ambition | **Static Mockup** | Being mistaken for active features |

---

## 7. KORA Admin / Internal Workspace

### Sections and Behavior

| Section | Objective | Key Widgets / Tables | Key Actions | Empty State | MVP Scope | Future Scope |
|---|---|---|---|---|---|---|
| **7.1 Admin Home** | Status overview across all companies | Company count, active runs, pending reviews, alerts, recent activity | Navigate to any company, review queue | "No companies yet. Create first company." | Functional Core | Multi-company view, analytics dashboard |
| **7.2 Company & Program Management** | Create and configure companies and programs | Company list, program list, period config, sector/headcount/territory | Create company, create program, configure reporting period, attach methodology version | "Add your first company to begin." | Functional Core | Self-service company onboarding |
| **7.3 Data Upload & AI Mapping Assistant** | Ingest and map data to UEF | Upload widget, column mapping table, confidence per field, flag list, unmapped fields | Upload file, review suggestions, override mapping, reject column, confirm mapping, create draft UEF batch | "Upload a file to begin mapping." | Functional Core | API connectors, scheduled ingestion |
| **7.4 UEF Review** | Human approval of AI-mapped events | Event table (pillar, source, evidence level, sensitivity, confidence, status), bulk approve controls | Approve / reject / flag event, bulk approve high-confidence batch, view flagged summary | "No records pending review." | Functional Core | Real-time review triggers |
| **7.5 Scoring Runs** | Execute scoring pipeline on approved UEF | Run configuration, batch selector, period, methodology version, run status, results preview | Configure run, execute, view outputs, compare runs | "No approved UEF batch ready. Complete UEF Review first." | Functional Core | Scheduled auto-runs |
| **7.6 Explainability Review** | Inspect and validate score explanations | Component breakdown, IU source breakdown, Activation Safeguard evaluation, Confidence Score detail | Review explanation, export for report, flag anomaly | "Run scoring first to see explanations." | Functional Core | Automated QA checks |
| **7.7 Report Generation** | Generate company intelligence reports | Report type selector, period, company, status, confidence | Generate report, preview, export PDF | "No score available. Complete a scoring run." | Functional Core | Automated scheduling, custom templates |
| **7.8 Partner Catalog Management** | Manage partner profiles and services | Partner list, service catalog, pillar mapping, advisor validation status | Add partner, edit profile, map services to pillars, request validation | "No partners yet." | Functional Core (demo: seeded) | Self-service partner onboarding |
| **7.9 Collective Initiative Management** | Create and manage cross-company initiatives | Initiative list, status, companies involved, partners, participation aggregate | Create initiative, define eligibility, invite companies, track aggregate participation | "No collective initiatives yet." | Functional Core (demo: seeded) | Partner-initiated proposals |
| **7.10 Advisor Review Management** | Assign and track advisor reviews | Review queue, advisor assignments, pending/completed, evidence list | Assign advisor, track review status, view completed validations | "No review requests pending." | Functional Core (demo: synthetic) | Advisor marketplace |
| **7.11 Methodology & Config** | Configure methodology parameters | Methodology version, weight config (read-only in demo), Activation Safeguard thresholds, BCM taxonomy | View methodology version, view weight config, view thresholds | N/A — always has v0.1 seeded | Functional Core | Version management, Delphi Study integration |
| **7.12 Audit & Governance Timeline** | Immutable audit log | Timestamped action log, actor, action, affected record, result | View, filter, export | "No events yet." | Functional Core (structural) | Full regulatory audit package |
| **7.13 Founder Validation Cockpit** | Track startup validation pipeline | Company/contact table (see fields below), KPI summary | Add contact, update status, log objection, mark follow-up | "Add first validation contact." | Functional Core | CRM integration |

**Founder Validation Cockpit fields:**
Company / Contact Name | Stakeholder Type | Contact Status | Pain Intensity (1–5) | Pilot Interest | Willingness to Pay | Estimated Pilot Value | Objections | Next Follow-Up | Validation KPIs (meetings / demos / pilot commitments / signed)

---

## 8. Company Intelligence Workspace

### Sidebar Navigation

| # | Section | MVP Status | Commercial Value |
|---|---|---|---|
| 1 | Executive Cockpit | Functional Core | First impression — must answer all 7 key questions in seconds |
| 2 | KORA Index | Functional Core | Core product deliverable |
| 3 | Contribution & Collective Initiatives | Semi-Functional Preview | Differentiator for ESG and CHROs |
| 4 | Activation & Participation | Functional Core | Most actionable insight |
| 5 | Pillars & Initiatives | Functional Core | Where strategy meets execution |
| 6 | Data & Evidence | Functional Core | Trust and auditability layer |
| 7 | Warnings & Next Actions | Functional Core | Product intelligence — what to do next |
| 8 | Financial Governance | Semi-Functional Preview | CFO and Finance layer |
| 9 | Fiscal Classification | Semi-Functional Preview | Tax/welfare optimization layer |
| 10 | Partner & Territory Network | Semi-Functional Preview | Ecosystem enablement |
| 11 | Advisor & Governance | Semi-Functional Preview | Trust and certification path |
| 12 | Reports | Functional Core | Board-facing output |
| 13 | Benchmark & Simulator | Semi-Functional Preview | Strategic planning tool |
| 14 | Certification Path | Static Mockup | Future commercial upsell path |
| 15 | Methodology & Settings | Functional Core | Transparency and governance |

### 8.1 Executive Cockpit

**Answers in ≤10 seconds:** How is the company doing? Can we trust the data? Where is the imbalance? What is verified? What contribution beyond the company? What to do next?

| Widget | Content | State |
|---|---|---|
| KORA Index card | Score [0–100], calibration_status, methodology_version_id | Score or "Insufficient data" |
| Confidence Score | Always displayed alongside KORA Index | Score or "Low" |
| Activation Safeguard badge | CLEAR / WARNING / FLAGGED | Required — cannot be suppressed |
| KORA Status badge | Access / Foundation Light / Foundation / Governance / Certified | Current tier |
| Trend indicator | vs prior period | % change or "First period" |
| KORA Contribution Light | Contribution indicator, cross-company initiatives count | Value or "No verified contribution" |
| Pillar distribution chart | LIFE / GROWTH / CONNECTION / IMPACT / LEGACY % | Ring or bar chart |
| Participation snapshot | Active workers %, meaningful active %, dormant % | Numbers only — no names |
| Data completeness | % complete vs expected | Bar with explanation |
| Evidence quality | Verified % vs self-declared | Bar |
| Top 3 warnings | Severity, cause, linked section | Alert cards |
| Top 3 next actions | Priority, effort, expected impact | Action cards |
| Advisor card | Name, specialty, next review | Card with CTA |
| Initiative snapshot | Active initiatives, pending, budget allocated | Summary |
| Collective initiatives snapshot | Count, participation, KORA Contribution | Summary |
| Partner snapshot | Active partners, onboarding, pending validation | Summary |
| Financial snapshot | Budget used / allocated (informational only) | Summary |
| Reports ready/missing | Report status list | Status chips |

### 8.2 KORA Index — Dedicated Score Page

| Element | Content | Rule |
|---|---|---|
| Score display | KORA Index [0–100] | calibration_status label mandatory |
| Confidence Score | Always shown | Cannot be hidden or separated |
| Period | From/to dates | Required |
| Methodology version | methodology_version_id | Required — must be visible, not buried |
| Calibration status | `pre_empirical_calibration` badge | Required — cannot be suppressed |
| Explanation summary | 3–5 sentence plain-language explanation | No jargon, no formula notation |
| 10-component breakdown | AR/MAR/NI/WB/PC/PB/EQ/VR/CO/CS with UI labels and values | All 10 required |
| Activation Safeguard impact | Status and how it affected the index | Required |
| Aggregate links | Links to Activation, Pillars, Data sections | No individual drill-down ever |

**UI labels for 10 components:**

| Code | UI Label | Code | UI Label |
|---|---|---|---|
| AR | Participation Reach | PC | Pillar Coverage |
| MAR | Meaningful Activation | PB | Pillar Balance |
| NI | Activation Depth | EQ | Equity — Equità di attivazione |
| WB | Worker Balance | VR | Verified Impact Quality |
| CO | Continuity & Recurrence | CS | Data Confidence |

**Strictly prohibited on this screen:** Partner & Ecosystem Quality, Strategic Coherence, Governance Maturity — these are not KORA Index components.

**EQ canonical definition:** EQ = Equity — misura l'equità distributiva dell'attivazione tra segmenti della workforce (dipartimenti, fasce di seniority, tipi di contratto, siti) aggregati sopra soglia privacy. Alta Equity significa che l'attivazione non è sistematicamente concentrata in segmenti privilegiati o già ad alta partecipazione. In UI, EQ can be rendered as "Equity — Equità di attivazione" or "Equità di accesso e attivazione." Do not render EQ as Evidence Quality or Event Quality — those are not KORA Index components. Evidence quality is reflected through VR (Verification Rate), CS (Confidence Score), Evidence Debt, Trust Ledger, and the Data & Evidence section. The Access Equity & Inclusion Evidence Layer (Module H) is the advanced detailed analysis layer; EQ in the KORA Index is the summary equity component. They are complementary, not substitutes.

### 8.3 KORA Contribution & Collective Initiatives

KORA Contribution is a companion indicator, not a KORA Index component.

| Element | Content | MVP Status |
|---|---|---|
| KORA Contribution Light indicator | Verified collective contribution signal | Semi-Functional Preview |
| Contribution timeline | Events, partners, verification status | Semi-Functional Preview |
| Initiative list | Name, pillar, territory, companies, aggregate participation, evidence status, advisor validation | Semi-Functional Preview |
| Create initiative CTA | Define name, pillar, territory, eligibility, partner, verification requirement | Functional in demo |
| Aggregate participation view | Participation count, anonymized — no individual workers | Always aggregate |

Microcopy: *"KORA Contribution measures verified collective contribution beyond the company perimeter. It complements the KORA Index; it does not replace it."*

### 8.4 Activation & Participation

All views: **aggregate only**, privacy threshold applied (default: groups ≥ 10).

| KPI | Display | Warning threshold |
|---|---|---|
| Workforce reached | % | < 30% → warning |
| Active workers | % | Feeds AR |
| Meaningful active workers | % | Feeds MAR |
| Returning workers | % | Feeds CO |
| Dormant share | % | > 50% → warning |
| Multi-pillar activation | % workers with ≥2 pillars | < 20% → warning |
| Recurrence rate | % returning vs prior period | Low → warning |
| Top 10% concentration | Share of IU from top decile | > 60% → warning |
| Bottom 50% participation | Share from bottom half | Very low → warning |
| Dept/site breakdown | Aggregate above threshold only | Below threshold → suppressed |

Mandatory microcopy: *"Aggregate only. No individual visibility. Privacy-safe thresholds applied."*

### 8.5 Pillars & Initiatives

| Pillar view widgets | Initiative Portfolio fields |
|---|---|
| Pillar distribution chart | Name, pillar, owner, partner, status |
| Budget vs activation by pillar | Budget (€), fiscal perimeter, aggregate reach |
| IU generated per pillar | Events count, IU generated |
| Continuity per pillar | KORA Contribution relevance, confidence |
| Over/under-exposure flags | Advisor status, warning, next action |

### 8.6 Data & Evidence

| Element | Content |
|---|---|
| Source inventory | Available sources, missing sources, integration type |
| Completeness table | Source, records, completeness %, mapping confidence, evidence attached, pending review |
| Advisor/partner verification | Status per source |
| Excluded data | Records rejected, reason |

### 8.7 Warnings & Next Actions

| Action field | Content |
|---|---|
| Priority | Critical / High / Medium / Low |
| Effort | Low / Medium / High |
| Expected impact on KORA Index | Directional estimate |
| Expected impact on KORA Contribution | Where relevant |
| Expected impact on Confidence | Directional estimate |
| Expected impact on Activation Safeguard | Status change expected? |
| Pillar involved | Pillar chip |
| Owner suggested | HR / Finance / ESG / IT / KORA |
| Timeline | Estimated weeks |

**Warnings catalog:** Activation Safeguard not passed · Pillar imbalance · Participation concentration · Insufficient data · Fiscal classification incomplete · Partner not validated · Low continuity · Budget allocated but not activated · Too much manual data · Low confidence · Collective initiative has insufficient verification · Contribution data below confidence threshold

### 8.8 Financial Governance Light

Not ERP. Not payments. Informational governance layer only.

| Widget | Content | Excluded |
|---|---|---|
| Budget overview | Allocated / used / committed / residual | Fund custody |
| Pillar budget breakdown | Budget per pillar | Payment execution |
| Initiative budget detail | Budget per initiative | FUO movement through KORA |
| Partner budget | Budget committed to partners | Wallet |
| Cost per IU | Dashboard-only indicator (€/IU) | Financial settlement |
| KORA billing section | Subscription / setup / advisory (separate ledger) | Cashback, top-up |

### 8.9 Fiscal Classification Map

Informational only. No tax advice. No live enforcement.

| Column | Content |
|---|---|
| Initiative/service | Name |
| Pillar | LIFE/GROWTH/CONNECTION/IMPACT/LEGACY |
| Possible fiscal category | Welfare / Fringe Benefit / Training / HSE / ESG / People & Culture / Non-incentivized |
| Advisor review status | Pending / Reviewed / Validated / Not reviewed |
| Required documents | List |
| Risk indicator | Low / Medium / High |

Disclaimer: *"KORA provides an informational classification layer. Final tax/legal validation remains under company/advisor responsibility."*

### 8.10 Partner & Territory Network

Show: partner map (territory), partner by pillar, active/suggested/certified, service types, advisor validation, verification level, expected activation impact, fiscal compatibility, collective initiative capability.

Do not use: cart, checkout, pricing, buy, discount, cashback.

### 8.11 Advisor & Governance

Show: advisor card, validation status, pending reviews, completed validations, next review, advisor recommendations. CTA: request validation / book review / request improvement plan.

### 8.12 Reports

| Report Type | Period | Export | Advisor Required? | MVP Status |
|---|---|---|---|---|
| Executive Report | Configurable | PDF | Recommended | Functional Core |
| HR / People Report | Configurable | PDF | No | Functional Core |
| ESG / Sustainability Report | Configurable | PDF | Recommended | Functional Core |
| Financial Governance Report | Configurable | PDF | No | Functional Core |
| Partner & Ecosystem Report | Configurable | PDF | No | Semi-Functional Preview |
| Advisor Validation Report | Configurable | PDF | Yes | Semi-Functional Preview |
| KORA Snapshot | Configurable | PDF | No | Functional Core |
| KORA Contribution Report | Configurable | PDF | Recommended | Semi-Functional Preview |

Every report must display: methodology_version_id, calibration_status = pre_empirical_calibration, Confidence Score, period, report generation date.

### 8.13 Benchmark & Simulator

**Benchmark (MVP label: Preview based on limited synthetic dataset):**

Show: sector average, size cluster, territory cluster, prior period comparison. Label: *"Benchmark Preview — based on pilot dataset. Not a statistically representative market benchmark."*

**Strategy Simulator — inputs and outputs:**

| Simulator Input | Estimated Output |
|---|---|
| Shift budget between pillars | Directional KORA Index impact |
| Add/activate partner | Directional activation impact |
| Add data source | Confidence improvement |
| Improve continuity | CO component estimate |
| Launch recurring program | MAR / CO impact |
| Launch collective initiative | KORA Contribution estimate |
| Improve evidence quality | VR / CS estimate |
| Reduce imbalance | PB / EQ estimate |
| Improve worker adoption via My KORA | AR / MAR / WB estimate |

Disclaimer: *"Estimated directional impact based on Foundation Light methodology. Not a certified forecast. Actual results depend on implementation quality and data availability."*

### 8.14 Certification Path

| Level | Status display | Permitted claims | Prohibited claims |
|---|---|---|---|
| Access | Badge: Access | None | Any impact claim |
| Foundation Light | Badge + calibration_status | "Pilot-grade diagnostic intelligence" | Certified, empirically validated |
| Foundation | Future | Recurring intelligence | Certified |
| Governance | Future | Audited governance | Certified |
| Certified | Future | Externally validated | Custom claims beyond cert scope |

### 8.15 Methodology & Settings

Company profile: sector, size, sites, territory, fiscal year, methodology version (read-only), privacy thresholds, connected data sources, user roles, advisor assignment, report settings.

---

## 9. My KORA — Worker Personal Impact Layer

**Foundation Light Demo Mode:** Synthetic/pseudonymized profiles. No production worker accounts.
**Future Pilot/Production Mode:** Real worker accounts only after Gate 3 legal/privacy review.

### Sidebar Navigation

| # | Section | MVP Status | Worker Value |
|---|---|---|---|
| 1 | My KORA Home | Functional Core | Personal impact overview |
| 2 | Personal Impact Balance | Functional Core | Private PIB Light |
| 3 | Opportunities | Semi-Functional Preview | Discovery |
| 4 | Collective Impact Events | Semi-Functional Preview | Volunteering and community |
| 5 | Partner Map | Semi-Functional Preview | Access to services |
| 6 | My Bookings & Requests | Semi-Functional Preview | Status tracking |
| 7 | My Personal Plan | Semi-Functional Preview | Planning and goals |
| 8 | Impact Timeline | Functional Core | Full activity record |
| 9 | Dynamic Impact CV | Functional Core (Light) | Career and identity asset |
| 10 | Milestones & Credentials | Semi-Functional Preview | Serious credentials |
| 11 | My Data Control | Functional Core | Trust and transparency |
| 12 | Privacy & Sharing | Functional Core | Explicit privacy promise |
| 13 | Company KORA Snapshot | Functional Core | Context |
| 14 | KORA Link Preview | Static Mockup | Future vision |
| 15 | Settings | Functional Core | Account and preferences |

### 9.1 My KORA Home

**Widgets:** PIB Light card · Pillar ring chart · Recent experiences (last 3) · Suggested opportunities (3 tiles) · Active collective events · Partner suggestions · Milestones earned · Dynamic CV preview tile · Privacy reminder banner · Next personal steps · Missing/pending data prompt · Company KORA Snapshot teaser

Mandatory microcopy: *"Your private space to understand, build and control your personal impact across LIFE, GROWTH, CONNECTION, IMPACT and LEGACY."*

Mandatory microcopy: *"Your employer cannot see your individual PIB, timeline, partner interactions, bookings, saved opportunities or Dynamic Impact CV."*

### 9.2 Personal Impact Balance

**Widgets:** PIB Light score with pillar breakdown · Trend chart · Continuity/recurrence indicator · Verified vs pending vs private experience counts · Data availability indicator · Plain-language explanation card

Mandatory microcopy: *"This is not a performance score. It is a private personal balance based on your available KORA-eligible experiences."*

**Employer access:** DENIED. No path from any employer role to this screen.

### 9.3 Opportunities

| Field | Content |
|---|---|
| Category | Training / Wellbeing / Prevention / Mentoring / Volunteering / Territorial / Community / Company / Legacy / Partner / Multi-pillar / Cross-company |
| Opportunity fields | Title, description, pillar(s), partner, format, duration, location, date, eligibility, company coverage, verification level, expected pillar impact, Dynamic CV eligibility |
| CTAs | View · Save · Add to Plan · Request info · Contact partner · Request participation · Join waitlist · Upload evidence |

**Worker evidence upload rules (Foundation Light):** Evidence upload in My KORA is voluntary, worker-initiated, and private by default. Worker-uploaded evidence must not automatically feed employer dashboards, be used for performance evaluation, or bypass review. It may only become externally visible through explicit worker action and, where required, review by a partner or advisor. Foundation Light does not accept highly sensitive medical/clinical health documents as worker-uploaded evidence. Uploaded evidence does not become a verified credential unless explicitly validated.

### 9.4 Collective Impact Events

| Status | Meaning |
|---|---|
| Available | Open for requests |
| Requested | Worker has applied |
| Confirmed | Participation confirmed |
| Waitlisted | Position in queue |
| Completed | Experience happened |
| Verified | Evidence confirmed |
| Pending Evidence | Completion claimed, evidence needed |
| Cancelled | Event or request cancelled |

Privacy microcopy: *"Your employer will not see your individual participation. The company may only see aggregated participation if privacy thresholds are met."*

### 9.5 Partner Map and Partner Profiles

**Partner Map:** Nearby partners · Online partners · Certified partners · Company-covered partners · Territorial partners · Suggested based on pillar gaps · Filter by pillar / territory / verification level

**Partner Profile:** Description · Pillars covered · Services · Active opportunities · Access mode · KORA verification level · Advisor validation status · Territory served · Contact options · Privacy note · Dynamic CV eligibility for experiences

**CTAs:** Contact partner · Request info · Save · Add to plan · Request participation · Ask company activation · Report issue

No buy, no cart, no checkout, no discounts, no cashback, no rewards.

### 9.6 My Bookings & Requests (Booking Light)

**Tabs:** Upcoming · Pending · Completed · Needs Review · Archived

**Booking Light means:** Request participation · Join waitlist · Confirm/cancel · Track status · Add verified experience to timeline

**Booking Light does NOT mean:** Calendar sync · Slot inventory · Payments · Checkout · Vouchers · Cancellation policy engine · Provider scheduling system · Real-time booking API

### 9.7 My Personal Plan

Private. Shows: saved opportunities, saved partners, personal goals, pillars to develop, upcoming/ongoing/completed activities, desired milestones, non-invasive suggestions.

Microcopy: *"Your personal plan is private. It helps you organize opportunities that matter to you."*

### 9.8 Impact Timeline

Each event shows: date · title · pillar · source · verification status · visibility (Private/Verified/Pending/Shareable/Excluded/Imported/Needs review) · enters PIB (yes/no) · enters Dynamic CV (yes/no) · actions

**Upload rule:** Worker-uploaded evidence is private by default. It may enter the Dynamic Impact CV or become externally visible only through explicit worker action. Evidence does not become a verified credential unless explicitly validated by a partner or advisor. Employer never sees worker-uploaded evidence at individual level.

### 9.9 Dynamic Impact CV — Light v0.1

**This is a real light product, not a placeholder.**

| Section | Foundation Light v0.1 | Future |
|---|---|---|
| Impact Summary | Pillar summary, experience count, verified count | Career narrative AI |
| Verified Experiences | Filtered timeline — verified items | Blockchain attestation |
| Skills & Signals | Pillar-based skill signals | Endorsed skills |
| Contribution & Community | Verified collective events | Territorial impact proof |
| Credentials & Milestones | Earned milestones | Verifiable credentials |
| Sharing & Export Control | Include/exclude, PDF export, consent management | Public share link, LinkedIn, KORA Link proof |

Mandatory microcopy: *"Only you decide what becomes part of your Dynamic Impact CV."*
Mandatory microcopy: *"Your Dynamic Impact CV is private by default. You can choose what to export or share."*
Mandatory microcopy: *"Dynamic Impact CV export is generated from worker-selected My KORA items. It is not a certified credential unless an item is explicitly marked as verified or advisor/partner validated."*

**CV export rules:**
- Each item in the Dynamic Impact CV must display its status: `verified` / `pending review` / `self-declared` / `worker-selected`
- Export preserves all status labels — no item may be exported without its status
- Export does not imply KORA certification unless a future Certified credential layer is active
- Worker controls which items to include or exclude
- Employer never receives the export automatically — there is no auto-share to employer path

### 9.10 Milestones & Credentials

No ranking. No leaderboard. No comparison. No points.

**Example milestones:** Growth Path Completed · First Verified Contribution · Community Contributor · Wellbeing Continuity · Verified Mentor · Cross-Pillar Explorer · Local Impact Participant · Legacy Builder · Learning Continuity · Partner Experience Verified

Each milestone: name · criterion · pillar · evidence required · status · privacy setting · shareability · Dynamic CV eligibility · verification level

### 9.11 My Data Control

Show: data inventory by source → what feeds PIB → what feeds Dynamic CV → what is private → what is shareable → what is pending → what employer sees only in aggregate → what employer never sees

Actions: Request correction · Hide from CV · Include in CV · Exclude from export · Request deletion (where applicable) · Manage consent · Download data (where applicable)

### 9.12 Privacy & Sharing

| Visibility layer | What the company can see | What the company cannot see |
|---|---|---|
| Worker data | Aggregate activation, anonymous pillar distribution, privacy-thresholded participation, aggregated partner/program usage, aggregated collective initiative participation | Individual PIB, timeline, bookings, partner contacts, opportunities saved, Dynamic CV, badges, preferences, sensitive wellbeing/health-related metadata, personal requests, exports, partner interactions |

What partners can see: Only minimum data to process a request, with explicit worker consent.
What can be shared externally: Only items selected by the worker, for each export.

### 9.13 Company KORA Snapshot (Worker-facing)

Show: Company KORA Index · KORA Contribution · Confidence Score · Activation Safeguard status · KORA tier · Aggregate pillar distribution · Available company initiatives · Collective opportunities

Do not show: Company financials · Detailed departmental data · Internal governance warnings · Founder Validation KPIs · Sensitive fiscal data

Microcopy: *"This is your company's aggregate KORA snapshot. It does not include or reveal your individual data."*

### 9.14 KORA Link Preview (Future Only)

Static mockup: Device render · NFC tap simulation · Future partner check-in · Verified action proof · Dynamic CV connection · Privacy note

Microcopy: *"KORA Link is the future physical bridge between real-world actions, partner verification and your private impact identity."*

---

## 10. Partner Workspace Light

| Section | Objective | Key Capability | Cannot see |
|---|---|---|---|
| Partner Home | Status overview | Pending requests, validation status | Worker PIB, company details |
| Partner Profile | Profile management | Edit description, pillars, territory, verification docs | Any individual worker data |
| Services & Opportunities | Service catalog | Add/edit services, map to pillars, list opportunities | Company confidential dashboards |
| Collective Initiative Builder | Propose cross-company events | Define initiative, pillar, territory, eligibility, invite companies | Individual participants |
| Requests & Participants Light | Process worker requests | Confirm/decline participation, track status | Worker PIB, timeline, Dynamic CV |
| Evidence Upload | Submit verification | Upload evidence per event/initiative | Unrelated records |
| Advisor Validation Status | Track validation | View pending/completed reviews | Advisor methodology details |
| Reports Light | Aggregate output | Participation count, verification status | Individual worker data |
| Settings | Profile administration | Edit contact, territory, fiscal info | Company accounts |

No payouts. No marketplace checkout. No payment management. No full booking engine. No financial settlement.

---

## 11. Advisor Workspace Light

| Section | Objective | Key Capability |
|---|---|---|
| Advisor Home | Queue overview | Pending reviews, completed, alerts |
| Review Queue | Prioritized review list | Filter by company, type, urgency |
| Review Detail | Review individual record | View evidence, company context, pillar, initiative |
| Evidence Review | Inspect attached documents | View, annotate, request more |
| Eligibility Confidence Assignment | Assign outcome | Set eligibility confidence level, add rationale |
| Methodology Notes | Internal annotation | Add notes for audit |
| Advisor Recommendations | Produce improvement suggestions | Free text + structured recommendation fields |
| Completed Reviews | History | Filter, export summary |

No advisor academy. No LMS. No public advisor marketplace. No certification workflow beyond light status.

---

## 12. Future Vision Area

**All items in this area must be labeled:** *"Future Vision / Not Active in Foundation Light."*

No active runtime logic. No activated SQL-backed features unless already explicitly defined in doc 12 and kept inactive.

**Future Vision contents:** KORA Certified · KORA Link · KORA Impact Pledge · KORA Value Chain active calculation · Advanced KORA Contribution methodology · Territorial activation maps · Advisor Academy · Partner Marketplace · Public Certified Profile · Verifiable Credential Wallet · SPID/CIE/eIDAS portable identity · LinkedIn / credential integrations · Full API integrations · Outcome correlation layer · Full partner booking engine · Production worker accounts (before Gate 3) · Enterprise SSO

---

## 13. Screen Inventory

| Screen ID | Side | Screen Name | Purpose | MVP Status | Primary Widgets | Key Actions | Data Required | Privacy Constraints | Priority |
|---|---|---|---|---|---|---|---|---|---|
| A-01 | Admin | Admin Home | Platform status | Functional Core | Company list, alerts, activity | Navigate | Company, run status | Internal only | P1 |
| A-02 | Admin | Company Setup | Create company | Functional Core | Company form, program form | Create, configure | gov.companies, programs | Internal | P1 |
| A-03 | Admin | Upload Studio | File ingestion | Functional Core | Upload widget, column mapper | Upload, map, confirm | Raw file, UEF draft | Privacy flags visible | P1 |
| A-04 | Admin | AI Mapping Review | Review AI suggestions | Functional Core | Mapping table, confidence scores | Approve, override, reject | UEF draft batch | Sensitivity flags | P1 |
| A-05 | Admin | UEF Review | Approve events | Functional Core | Event table, bulk controls | Approve/reject/flag | analytics.uef_records | No employer access | P1 |
| A-06 | Admin | Scoring Run | Execute scoring | Functional Core | Run config, batch selector, results | Configure, run | UEF approved batch | Internal | P1 |
| A-07 | Admin | Explainability Review | Inspect explanations | Functional Core | Component breakdown, IU trace | Review, flag | KORA Index outputs | Aggregate only | P1 |
| A-08 | Admin | Report Generation | Produce reports | Functional Core | Report type, period, preview | Generate, export PDF | Scoring outputs | Aggregate | P1 |
| A-09 | Admin | Partner Catalog | Manage partners | Functional Core | Partner list, service catalog | Add, edit, map pillars | gov.partners, services | Internal | P2 |
| A-10 | Admin | Collective Initiatives | Manage initiatives | Functional Core | Initiative list, participation | Create, track | gov.initiatives | Aggregate participation | P2 |
| A-11 | Admin | Advisor Queue | Manage reviews | Functional Core | Review queue, assignments | Assign, track | gov.advisor_reviews | Scoped | P2 |
| A-12 | Admin | Methodology Config | View methodology | Functional Core | Version, weights, thresholds | View (read-only in demo) | gov.methodology_versions | Internal | P2 |
| A-13 | Admin | Audit Timeline | Governance log | Functional Core | Log table | View, filter, export | audit.audit_trail | Internal | P2 |
| A-14 | Admin | Founder Validation Cockpit | Startup validation | Functional Core | Contact table, KPI summary | Add, update, log | gov.stakeholder_contacts | Internal | P1 |
| C-01 | Company | Executive Cockpit | Company overview | Functional Core | KORA Index, Confidence, Safeguard, all snapshots | Navigate | Company aggregates | Aggregate only, no individual | P1 |
| C-02 | Company | KORA Index Detail | Score explanation | Functional Core | 10-component breakdown, explanation | View, compare periods | analytics.kora_indices | Aggregate | P1 |
| C-03 | Company | KORA Contribution | External impact | Semi-Functional | Contribution indicator, initiative list | View, create initiative | Contribution data | Aggregate, no individual | P2 |
| C-04 | Company | Activation & Participation | Workforce activation | Functional Core | Activation metrics, heatmaps | View, filter by dept/site | Company aggregates | ≥10 group threshold | P1 |
| C-05 | Company | Pillars & Initiatives | Pillar intelligence | Functional Core | Pillar chart, initiative table | View, drill pillar | Pillar aggregates | Aggregate | P1 |
| C-06 | Company | Data & Evidence | Source quality | Functional Core | Source table, completeness | View, request upload | Ingestion metadata | Internal | P1 |
| C-07 | Company | Warnings & Next Actions | Action center | Functional Core | Warning cards, action cards | View, act, dismiss | Scoring outputs, thresholds | Aggregate | P1 |
| C-08 | Company | Financial Governance | Budget view | Semi-Functional | Budget tables, cost per IU | View, filter | gov.financial data | Finance role only | P2 |
| C-09 | Company | Fiscal Classification | Tax info | Semi-Functional | Classification table | View, request review | gov.eligibility | Finance + ESG | P3 |
| C-10 | Company | Partner & Territory | Ecosystem view | Semi-Functional | Partner map, catalog | View, contact | gov.partners | No worker data | P2 |
| C-11 | Company | Advisor & Governance | Advisor view | Semi-Functional | Advisor card, review status | Request review | gov.advisor_reviews | Scoped | P3 |
| C-12 | Company | Reports | Report center | Functional Core | Report list, status | Generate, export | Scoring outputs | Aggregate | P1 |
| C-13 | Company | Benchmark & Simulator | Planning tool | Semi-Functional | Benchmark view, simulator inputs | Simulate | Synthetic reference | Aggregate | P3 |
| C-14 | Company | Certification Path | Tier progress | Static Mockup | Level ladder, requirements | View | Tier config | Internal | P4 |
| C-15 | Company | Methodology & Settings | Configuration | Functional Core | Profile, methodology, privacy thresholds | Configure | gov.companies | Admin only | P2 |
| W-01 | My KORA | My KORA Home | Personal overview | Functional Core | PIB card, pillar ring, suggestions | Navigate | Worker synthetic profile | No employer access | P1 |
| W-02 | My KORA | Personal Impact Balance | PIB Light | Functional Core | PIB score, pillar breakdown, trend | View | PIB computed data | No employer access | P1 |
| W-03 | My KORA | Opportunities | Discovery | Semi-Functional | Opportunity tiles, filters | Save, request, plan | Partner services, initiatives | Worker-only | P2 |
| W-04 | My KORA | Collective Impact Events | Events | Semi-Functional | Event cards, status | Request, waitlist | Collective initiatives | Aggregate to employer | P2 |
| W-05 | My KORA | Partner Map | Partner discovery | Semi-Functional | Map, partner cards | Contact, save | gov.partners | Consent for data share | P2 |
| W-06 | My KORA | My Bookings & Requests | Status tracking | Semi-Functional | Tabs, request list | Cancel, upload evidence | Worker requests | No employer access | P2 |
| W-07 | My KORA | My Personal Plan | Private planning | Semi-Functional | Saved items, goals | Add, edit, remove | Worker prefs | Private | P3 |
| W-08 | My KORA | Impact Timeline | Full history | Functional Core | Timeline, event cards | Include/exclude CV | Worker PIB events | No employer access | P1 |
| W-09 | My KORA | Dynamic Impact CV | Personal CV | Functional Core (Light) | CV sections, items | Include/exclude, export PDF | Worker PIB, milestones | Worker-controlled | P1 |
| W-10 | My KORA | Milestones & Credentials | Credentials | Semi-Functional | Milestone cards | View, share settings | Worker milestones | Worker-controlled | P3 |
| W-11 | My KORA | My Data Control | Data transparency | Functional Core | Data inventory table | Request correction, consent | Worker data sources | No employer access | P1 |
| W-12 | My KORA | Privacy & Sharing | Privacy promise | Functional Core | Visibility tables, consent | Manage consent | Consent records | Mandatory screen | P1 |
| W-13 | My KORA | Company KORA Snapshot | Company context | Functional Core | KORA Index, Safeguard, initiatives | View | Company aggregates | No confidential data | P2 |
| W-14 | My KORA | KORA Link Preview | Future vision | Static Mockup | Device render | View | N/A | Future | P5 |
| P-01 | Partner | Partner Home | Status | Semi-Functional | Request count, validation | Navigate | Partner data | No worker individual data | P3 |
| P-02 | Partner | Partner Profile | Profile | Semi-Functional | Edit form | Edit, save | gov.partners | No worker data | P3 |
| P-03 | Partner | Services & Opportunities | Catalog | Semi-Functional | Service list | Add, edit, map | gov.partner_services | No worker data | P3 |
| P-04 | Partner | Collective Initiative Builder | Initiatives | Semi-Functional | Initiative form | Create, invite | gov.initiatives | Aggregate only | P3 |
| P-05 | Partner | Requests & Participants Light | Requests | Semi-Functional | Request list | Confirm, decline | Request records | No individual PIB | P3 |
| P-06 | Partner | Evidence Upload | Evidence | Semi-Functional | Upload widget | Upload, link | Evidence files | No unrelated records | P3 |
| P-07 | Partner | Advisor Validation Status | Validation | Semi-Functional | Status view | View | gov.advisor_reviews | Scoped | P3 |
| AD-01 | Advisor | Advisor Home | Queue overview | Semi-Functional | Pending list, completed count | Navigate | Review queue | Scoped to advisor | P3 |
| AD-02 | Advisor | Review Queue | Prioritized list | Semi-Functional | Review table | Select, filter | Assigned reviews | Scoped | P3 |
| AD-03 | Advisor | Review Detail | Record review | Semi-Functional | Evidence, context | Inspect, annotate | Evidence files | Scoped | P3 |
| AD-04 | Advisor | Eligibility Confidence Assignment | Assign outcome | Semi-Functional | Outcome form | Assign, confirm | Review record | Scoped | P3 |
| AD-05 | Advisor | Recommendations | Improvement output | Semi-Functional | Recommendation form | Write, submit | Review notes | Company + advisor | P3 |
| FV-01 | Future Vision | KORA Certified | Certification | Static Mockup | Level badge, requirements | View only | N/A | Future | P5 |
| FV-02 | Future Vision | KORA Link | Hardware device | Static Mockup | Device render, animation | View only | N/A | Future | P5 |
| FV-03 | Future Vision | Territorial Maps | Territory | Static Mockup | Map render | View only | N/A | Future | P5 |
| FV-04 | Future Vision | Partner Marketplace | Marketplace | Static Mockup | Marketplace UI | View only | N/A | Future | P5 |
| FV-05 | Future Vision | Credential Wallet | Digital identity | Static Mockup | Wallet UI | View only | N/A | Future | P5 |

---

## 14. Core User Flows

| # | Flow | Trigger | Steps | Actors | Data Touched | Output | Privacy | MVP |
|---|---|---|---|---|---|---|---|---|
| F-01 | Company views Executive Cockpit | Login as Company Admin | 1. Login → 2. Dashboard loads → 3. View KORA Index, Confidence, Safeguard → 4. Review warnings → 5. Navigate to detail | Company Admin | analytics.kora_indices (aggregated), warnings | Organizational intelligence overview | Aggregate only | Functional Core |
| F-02 | Company reviews KORA Index | Click KORA Index in sidebar | 1. View score → 2. Read explanation → 3. Review 10 components → 4. Check Activation Safeguard → 5. Navigate to aggregate views | Company HR | analytics.kora_indices | Score understanding | No individual drill-down | Functional Core |
| F-03 | Company creates Collective Initiative | Click "New Initiative" | 1. Define name/pillar/territory → 2. Set eligibility → 3. Invite partner → 4. Set verification → 5. Publish | Company Admin | gov.initiatives, gov.partners | Initiative created and visible | No individual participants | Semi-Functional |
| F-04 | KORA Admin uploads dataset | Click "Upload Data" | 1. Select file → 2. Upload → 3. AI mapping runs → 4. Review suggestions → 5. Override/confirm → 6. Submit for UEF review | KORA Admin | Raw file, UEF draft | UEF draft batch created | Privacy flags shown | Functional Core |
| F-05 | KORA Admin maps uploaded data | After upload | 1. Review column mapping table → 2. Confirm/override each mapping → 3. Set confidence → 4. Flag sensitive fields → 5. Confirm | KORA Analyst | UEF draft batch | Approved mapping, UEF draft | Sensitivity flags | Functional Core |
| F-06 | KORA Admin approves UEF | After mapping | 1. Review event table → 2. Inspect flagged records → 3. Bulk approve high-confidence → 4. Individual review for flagged → 5. Confirm batch | KORA Analyst | analytics.uef_records | UEF approved batch | Employer cannot access | Functional Core |
| F-07 | KORA Admin runs scoring | After UEF approval | 1. Configure run (company, period, methodology version) → 2. Execute → 3. Monitor status → 4. View outputs → 5. Review explainability | KORA Admin | All analytics tables | KORA Index + Confidence + Safeguard | Internal only | Functional Core |
| F-08 | Worker opens My KORA | First login (demo: role switch) | 1. Login → 2. Privacy onboarding screen → 3. Accept → 4. My KORA Home loads | Worker | Worker synthetic profile | Personalized home view | No employer access | Functional Core |
| F-09 | Worker reviews privacy promise | Navigate to Privacy & Sharing | 1. Open section → 2. View what employer sees/cannot see → 3. View what partners see → 4. View sharing controls | Worker | Consent records | Trust established | Explicit display | Functional Core |
| F-10 | Worker requests participation in collective event | Find event in Collective Impact Events | 1. View event → 2. Check eligibility → 3. Click "Request Participation" → 4. Confirm intent → 5. Status: Requested | Worker | Worker requests, event records | Request submitted | Individual not visible to employer | Semi-Functional |
| F-11 | Worker contacts partner | Find partner in Partner Map | 1. View partner profile → 2. Select service → 3. Click "Contact Partner" / "Request Info" → 4. Confirm consent → 5. Request submitted | Worker | Worker request, partner service | Partner receives request | Minimum data, with consent | Semi-Functional |
| F-12 | Worker adds item to Dynamic Impact CV | View Impact Timeline | 1. Find event → 2. Click "Include in Dynamic CV" → 3. Preview CV section → 4. Confirm | Worker | Worker PIB data, CV items | CV item added | Worker-controlled only | Functional Core (Light) |
| F-13 | Partner confirms participation | Receive worker request | 1. View Requests → 2. Review request → 3. Confirm/decline → 4. Worker status updated | Partner Admin | Worker request record | Request confirmed | No worker PIB | Semi-Functional |
| F-14 | Partner uploads evidence | After event completes | 1. Select event → 2. Upload evidence file → 3. Link to initiative → 4. Submit | Partner Admin | Evidence files, UEF record | Evidence attached, awaiting advisor | No worker individual data | Semi-Functional |
| F-15 | Advisor validates evidence | Receive review assignment | 1. Open review queue → 2. Select review → 3. Inspect evidence → 4. Assign eligibility confidence → 5. Add notes → 6. Submit | Advisor External | gov.advisor_reviews, evidence | Validation completed | Scoped to review only | Semi-Functional |
| F-16 | Company reviews KORA Contribution | Click Contribution in sidebar | 1. View Contribution indicator → 2. Review initiative list → 3. Check aggregate participation → 4. View evidence status | Company Admin | Contribution data | Contribution overview | No individual participants | Semi-Functional |
| F-17 | Company exports report | Click Reports in sidebar | 1. Select report type → 2. Select period → 3. Generate → 4. Preview → 5. Export PDF | Company HR | Report data (aggregate) | PDF report | Aggregate only | Functional Core |
| F-18 | Worker views Company KORA Snapshot | Navigate to Company KORA Snapshot | 1. Open section → 2. View KORA Index, Contribution, Safeguard, pillar distribution, available initiatives | Worker | Company aggregate outputs | Context and opportunities | No confidential company data | Functional Core |

---

## 15. Role Permission Matrix

| Permission | KORA Admin | KORA Analyst | Cmp Admin | Cmp HR | Cmp ESG | Cmp Finance | Cmp Viewer | Worker | Partner | Advisor |
|---|---|---|---|---|---|---|---|---|---|---|
| View company aggregate KORA Index | allowed | allowed | allowed | allowed | allowed | allowed | allowed | future | denied | denied |
| View KORA Contribution | allowed | allowed | allowed | allowed | allowed | denied | allowed | aggregate | denied | denied |
| View ingestion batches | allowed | allowed | denied | denied | denied | denied | denied | denied | denied | denied |
| Upload files | allowed | allowed | denied | denied | denied | denied | denied | denied | denied | denied |
| Approve UEF records | allowed | allowed | denied | denied | denied | denied | denied | denied | denied | denied |
| Run scoring | allowed | denied | denied | denied | denied | denied | denied | denied | denied | denied |
| View individual UEF | allowed | allowed | **denied** | **denied** | **denied** | **denied** | **denied** | denied | denied | denied |
| View individual IU | allowed | allowed | **denied** | **denied** | **denied** | **denied** | **denied** | denied | denied | denied |
| View individual PIB | elevated only | allowed | **denied** | **denied** | **denied** | **denied** | **denied** | self only | denied | denied |
| View worker_profiles | elevated only | allowed | **denied** | **denied** | **denied** | **denied** | **denied** | self only | denied | denied |
| View worker bookings | elevated only | denied | **denied** | **denied** | **denied** | **denied** | **denied** | self only | scoped | denied |
| View worker partner contacts | elevated only | denied | **denied** | **denied** | **denied** | **denied** | **denied** | self only | scoped | denied |
| View worker Dynamic Impact CV | elevated only | denied | **denied** | **denied** | **denied** | **denied** | **denied** | self only | with consent | denied |
| Create collective initiative | allowed | allowed | allowed | denied | allowed | denied | denied | denied | allowed | denied |
| Request participation (events) | denied | denied | denied | denied | denied | denied | denied | allowed | denied | denied |
| Contact partner | denied | denied | denied | denied | denied | denied | denied | allowed | N/A | denied |
| Confirm participation | allowed | allowed | denied | denied | denied | denied | denied | denied | allowed | denied |
| Upload evidence | allowed | allowed | denied | denied | allowed | denied | denied | allowed | allowed | denied |
| Assign advisor validation | allowed | allowed | denied | denied | denied | denied | denied | denied | denied | allowed |
| Export reports | allowed | allowed | allowed | allowed | allowed | allowed | denied | self only | scoped | scoped |
| Manage methodology config | allowed | denied | denied | denied | denied | denied | denied | denied | denied | denied |
| Manage fiscal classification | allowed | denied | allowed | denied | allowed | allowed | denied | denied | denied | allowed |
| Manage billing information | allowed | denied | allowed | denied | denied | allowed | denied | denied | denied | denied |

**Bolded denied = enforced by grant absence, not policy.**

**elevated only = KORA Privacy Officer / Privileged Audit access. Not default KORA Admin access. All access must be legally justified, scoped to purpose, logged and reviewable.**

---

## 16. Data Visibility Matrix

| Data Type | Worker | Employer | KORA Admin | Advisor | Partner | External | Never Visible |
|---|---|---|---|---|---|---|---|
| Individual PIB | self only | **not visible** | elevated only | not visible | not visible | not visible | — |
| Individual pillar distribution | self only | **not visible** | elevated only | not visible | not visible | not visible | — |
| Impact Timeline | self only | **not visible** | elevated only | not visible | not visible | not visible | — |
| Bookings/requests | self only | **not visible** | elevated only | not visible | scoped | not visible | — |
| Partner contacts | self only | **not visible** | elevated only | not visible | scoped | not visible | — |
| Opportunities saved | self only | **not visible** | not visible | not visible | not visible | not visible | ✓ (except worker) |
| Dynamic Impact CV | self only | **not visible** | not visible | not visible | with consent | with consent | — |
| Milestones | self only | **not visible** | elevated only | not visible | with consent | with consent | — |
| Sensitive wellbeing / health-related metadata | self only | **not visible** | elevated only | not visible | not visible | not visible | — |
| Training data | self only | aggregate only | visible | scoped | not visible | not visible | — |
| Volunteering | self only | aggregate only | visible | scoped | scoped | not visible | — |
| Partner events | self only | aggregate only | visible | scoped | scoped | not visible | — |
| Info requests | self only | **not visible** | elevated only | not visible | scoped | not visible | — |
| Exports | self only | **not visible** | elevated only | not visible | not visible | not visible | — |
| Consents | self only | **not visible** | elevated only | not visible | not visible | not visible | — |
| Aggregate company activation | not visible | aggregate only | visible | not visible | not visible | not visible | — |
| Aggregate pillar distribution | aggregate (snapshot) | aggregate only | visible | not visible | not visible | not visible | — |
| Aggregate partner usage | aggregate (snapshot) | aggregate only | visible | not visible | not visible | not visible | — |
| Aggregate collective initiative participation | aggregate (snapshot) | aggregate only | visible | not visible | aggregate | not visible | — |
| KORA Index (company) | aggregate (snapshot) | visible | visible | not visible | not visible | future | — |
| KORA Contribution (company) | aggregate (snapshot) | visible | visible | not visible | not visible | future | — |
| Financial governance | not visible | Finance role only | visible | not visible | not visible | not visible | — |
| Fiscal classification | not visible | Finance + ESG | visible | scoped | not visible | not visible | — |

**elevated only** = KORA Privacy Officer / Privileged Audit access. Not default admin access. Legally justified, scoped, logged and reviewable only.

**Health data note:** Foundation Light must not process, display or store detailed medical records or clinical health data. Where wellbeing or health-related services exist in source data, KORA must minimize the data, classify at category level where legally permitted, and apply elevated privacy handling. Sensitive wellbeing / health-related metadata must never be visible to employer roles, partners, or advisors.

---

## 17. Demo Story — First 3 Minutes

### A. Company Demo

| Step | Screen | What to show | Message |
|---|---|---|---|
| 1 | Executive Cockpit | Full cockpit — KORA Index, Confidence, Safeguard | "This is how your organization performs as a human activation system." |
| 2 | KORA Index | Score + 10 components + explanation | "The score is explained. Every component is visible. Nothing is a black box." |
| 3 | Activation Safeguard | Status badge + what it means | "If activation is too low, the index is qualified. You cannot hide a weak program with high IUs from a few people." |
| 4 | Activation & Participation | Participation distribution, concentration warning | "64% of your IU came from 12% of your workforce. That's a risk, not a strength." |
| 5 | KORA Contribution | Contribution indicator + initiatives | "And this is what your company generates beyond its own perimeter — verified community impact." |
| 6 | Warnings & Next Actions | Top 3 warnings + actions | "The platform tells you exactly what to do next and why." |
| 7 | Reports | Report ready | "Here's your board-ready report — period, confidence, calibration status, everything." |

### B. Worker Demo

| Step | Screen | What to show | Message |
|---|---|---|---|
| 1 | My KORA Home | Personalized home | "This is your private space." |
| 2 | Privacy & Sharing | What company can/cannot see | "Your employer cannot see any of this." |
| 3 | PIB Light | Personal balance by pillar | "This is not a performance score. It's your personal impact balance." |
| 4 | Opportunities | Suggested opportunities | "Here are opportunities matched to where you want to grow." |
| 5 | Collective Impact Event | Volunteering event | "This is a cross-company initiative — click to request participation." |
| 6 | Partner Map | Nearby partner | "KORA connects you to verified partners." |
| 7 | My Bookings | Request status | "Track your participation and status." |
| 8 | Dynamic Impact CV | CV with verified items | "Only you decide what goes in your Dynamic Impact CV." |
| 9 | Company KORA Snapshot | Company context | "And here is what your company is doing — aggregate only. Your data is never part of this." |

**Closing:** *"KORA creates value for me too, not only for the company."*

### C. Partner Demo

1. Partner Profile → 2. Services catalog → 3. Collective Initiative Builder → 4. Worker requests → 5. Evidence upload

### D. Advisor Demo

1. Review queue → 2. Review detail + evidence → 3. Assign eligibility confidence → 4. Submit recommendation

### E. KORA Admin Demo

1. Company setup → 2. Upload & AI Mapping → 3. UEF Review → 4. Scoring run → 5. Explainability → 6. Report generation → 7. Founder Validation Cockpit

---

## 18. Empty States, Partial States and Error States

| State | Context | Microcopy |
|---|---|---|
| No data uploaded | KORA Admin / Company | *"No data sources connected yet. Upload the first dataset to begin."* |
| Data still mapping | AI Mapping | *"AI mapping in progress. Review suggestions when ready."* |
| Low confidence | KORA Index display | *"Confidence is low. This score should be treated with caution until more verified data is available."* |
| Insufficient activation | Activation Safeguard FLAGGED | *"Activation levels are below the minimum threshold. The KORA Index is qualified. See Warnings for next actions."* |
| Pillar has limited information | Pillar view | *"Limited data for this pillar. Score reflects available evidence only."* |
| No verified experiences yet | Worker Timeline | *"No verified experiences yet. Participate in initiatives or upload evidence to build your timeline."* |
| No partner nearby | Partner Map | *"No partners available in your area. Check online partners or ask your company to activate new coverage."* |
| Opportunity not eligible | Opportunity detail | *"This opportunity is not covered by your company's current program. You can request company activation."* |
| Booking pending | My Bookings | *"Your request is pending. You'll be notified when the partner responds."* |
| Evidence missing | Requests / Needs Review | *"Evidence needed to verify this experience. Upload documentation to confirm completion."* |
| Below privacy threshold | Dept/site view | *"This group is below the minimum privacy threshold. Aggregate data is not shown to protect worker privacy."* |
| Report not ready | Reports | *"Report not ready. Complete a scoring run first."* |
| Benchmark unavailable | Benchmark & Simulator | *"Benchmark preview unavailable. Sector data is limited at this stage. Check back after pilot data accumulates."* |
| Fiscal classification pending | Fiscal Classification | *"Fiscal classification pending advisor review. No tax conclusions until review is complete."* |
| Advisor review pending | Advisor card | *"Advisor review in progress. Results will appear when the review is complete."* |
| Worker has no timeline yet | Impact Timeline | *"Your impact timeline is empty. It will grow as you participate in company initiatives, partner experiences and collective events."* |
| Worker has no Dynamic CV items | Dynamic Impact CV | *"Your Dynamic Impact CV is empty. Add verified experiences from your timeline to get started."* |
| Worker has not accepted privacy onboarding | Any My KORA screen | *"Review and accept our privacy promise before accessing your personal space."* |
| Partner request pending | Partner Requests & Participants | *"Request pending. Confirm or decline within [X] days."* |
| Collective event full / waitlist | Collective event | *"This event is full. You've been added to the waitlist. You'll be notified if a space opens."* |
| Company snapshot unavailable | Company KORA Snapshot (worker) | *"Your company's KORA snapshot is not yet available for this period."* |
| KORA Contribution unavailable | Contribution indicator | *"No verified contribution data for this period. Launch a collective initiative or involve a partner to begin."* |
| Simulator unavailable | Benchmark & Simulator | *"Simulator requires a completed scoring run. Run scoring first."* |
| Report export unavailable | Export button | *"Export requires a completed and approved report. Generate the report first."* |

---

## 19. Microcopy Library

| Context | Copy |
|---|---|
| **Privacy assurance (global)** | *"Your employer cannot see your individual data. All company-level views are anonymized and aggregated."* |
| **Methodology status** | *"Methodology version: [v0.1] — Pre-empirical calibration. This score reflects organizational activation patterns, not a certified assessment."* |
| **Confidence Score** | *"Data Confidence: [X]%. A higher confidence score means more verified data from diverse sources. A lower score means the result should be interpreted with caution."* |
| **Activation Safeguard** | *"Activation Safeguard: [CLEAR / WARNING / FLAGGED]. This indicator protects against high individual scores masking low collective activation."* |
| **PIB explanation** | *"Your Personal Impact Balance is not a performance score. It is a private personal measure of your participation across KORA pillars, visible only to you."* |
| **Dynamic CV sharing** | *"Only you control what appears in your Dynamic Impact CV. Nothing is shared without your explicit choice."* |
| **Dynamic CV export status** | *"Your Dynamic Impact CV is generated from items you selected. Each item shows its status: verified, pending review, or self-declared. This is not a certified KORA credential."* |
| **Partner request consent** | *"By contacting this partner, you agree to share minimum necessary data (name, request context) with them to process your request."* |
| **KORA Contribution** | *"KORA Contribution measures verified collective contribution beyond the company perimeter. It complements the KORA Index; it does not replace it."* |
| **Collective initiatives** | *"Collective initiatives connect companies, workers, partners and communities through verified shared action."* |
| **Booking Light** | *"Request participation and track status. KORA is not a booking platform — partner contact details are provided to coordinate directly."* |
| **Benchmark preview** | *"Benchmark Preview — based on pilot dataset only. Not a statistically representative market benchmark."* |
| **Simulator disclaimer** | *"Estimated directional impact based on Foundation Light methodology. Not a certified forecast. Actual results depend on implementation quality and data availability."* |
| **Fiscal classification disclaimer** | *"KORA provides an informational classification layer. Final tax/legal validation remains under company/advisor responsibility."* |
| **Employer visibility limits** | *"Aggregate only. No individual visibility. Privacy-safe thresholds applied. Groups below 10 workers are suppressed."* |
| **Worker adoption value** | *"KORA gives workers a private personal impact layer. Only anonymized aggregate signals contribute to organizational intelligence."* |
| **Company snapshot (worker)** | *"This is your company's aggregate KORA snapshot. It does not include or reveal your individual data."* |
| **Below privacy threshold** | *"This group is below the minimum privacy threshold (10 workers). Aggregate data is not shown to protect worker privacy."* |
| **pre_empirical_calibration** | *"Foundation Light v0.1 — Pre-empirical calibration. This score is suitable for pilot intelligence and organizational analysis. It is not empirically validated, certified, or regulatory-grade."* |

---

## 20. MVP / Foundation Light Scope Classification

| Section | Side | Foundation Light Status | Data Type | Must Build? | Future Depth |
|---|---|---|---|---|---|
| Admin Home | Admin | Functional Core | Synthetic | Yes | Multi-company analytics |
| Company Setup | Admin | Functional Core | Synthetic | Yes | Self-service onboarding |
| Upload Studio + AI Mapping | Admin | Functional Core | Synthetic | Yes | API connectors, real-time |
| UEF Review | Admin | Functional Core | Synthetic | Yes | Automated quality rules |
| Scoring Runs | Admin | Functional Core | Synthetic | Yes | Scheduled, automated |
| Explainability Review | Admin | Functional Core | Synthetic | Yes | QA automation |
| Report Generation | Admin | Functional Core | Synthetic | Yes | Scheduled, custom templates |
| Partner Catalog | Admin | Functional Core (demo seeded) | Synthetic | Yes | Self-service partner onboarding |
| Collective Initiative Management | Admin | Functional Core (demo seeded) | Synthetic | Yes | Partner-initiated proposals |
| Advisor Queue | Admin | Functional Core (demo synthetic) | Synthetic | Yes | Advisor marketplace |
| Methodology Config | Admin | Functional Core (read-only) | Config | Yes | Version management |
| Audit Timeline | Admin | Functional Core (structural) | Audit | Yes | Regulatory audit package |
| Founder Validation Cockpit | Admin | Functional Core | Internal | Yes | CRM integration |
| Executive Cockpit | Company | Functional Core | Synthetic aggregate | Yes | Real-time, multi-period |
| KORA Index Detail | Company | Functional Core | Synthetic aggregate | Yes | Comparative, certified |
| KORA Contribution | Company | Semi-Functional Preview | Synthetic aggregate | Yes (light) | Full contribution methodology |
| Activation & Participation | Company | Functional Core | Synthetic aggregate | Yes | Real-time, advanced segments |
| Pillars & Initiatives | Company | Functional Core | Synthetic aggregate | Yes | Initiative AI recommendations |
| Data & Evidence | Company | Functional Core | Synthetic | Yes | Automated data quality |
| Warnings & Next Actions | Company | Functional Core | Computed | Yes | AI-driven next actions |
| Financial Governance | Company | Semi-Functional Preview | Synthetic | Yes (light) | FUO, Welfare Statement (future) |
| Fiscal Classification | Company | Semi-Functional Preview | Synthetic | Yes (informational) | Live enforcement (Gate 5) |
| Partner & Territory | Company | Semi-Functional Preview | Synthetic | Yes (view only) | Full ecosystem |
| Advisor & Governance | Company | Semi-Functional Preview | Synthetic | Yes (view only) | Full certification workflow |
| Reports | Company | Functional Core | Synthetic aggregate | Yes | Certified, regulatory |
| Benchmark & Simulator | Company | Semi-Functional Preview | Limited synthetic | Yes (labeled preview) | Full market benchmark |
| Certification Path | Company | Static Mockup | N/A | No (mockup only) | Full certification tier |
| Methodology & Settings | Company | Functional Core | Config | Yes | Enterprise settings |
| My KORA Home | My KORA | Functional Core | Synthetic/pseudonymized | Yes | Real pilot after Gate 3 |
| Personal Impact Balance (PIB Light) | My KORA | Functional Core | Synthetic/pseudonymized | Yes | Full production PIB |
| Opportunities | My KORA | Semi-Functional Preview | Synthetic | Yes (limited catalog) | Full discovery engine |
| Collective Impact Events | My KORA | Semi-Functional Preview | Synthetic | Yes (limited events) | Full event ecosystem |
| Partner Map | My KORA | Semi-Functional Preview | Synthetic | Yes (seeded catalog) | Full partner network |
| My Bookings & Requests | My KORA | Semi-Functional Preview | Synthetic | Yes (Booking Light) | Full booking engine (future) |
| My Personal Plan | My KORA | Semi-Functional Preview | Synthetic | Yes (basic) | AI-personalized plan |
| Impact Timeline | My KORA | Functional Core | Synthetic | Yes | Full verified timeline |
| Dynamic Impact CV | My KORA | Functional Core (Light) | Synthetic | Yes (PDF export) | Verifiable credentials, LinkedIn |
| Milestones & Credentials | My KORA | Semi-Functional Preview | Synthetic | Yes (seeded) | Verifiable, portable |
| My Data Control | My KORA | Functional Core | Synthetic | Yes | Full GDPR consent center |
| Privacy & Sharing | My KORA | Functional Core | Static | Yes — mandatory | Advanced consent management |
| Company KORA Snapshot (worker) | My KORA | Functional Core / Semi-Functional | Synthetic aggregate | Yes | Real-time |
| KORA Link Preview | My KORA | Static Mockup | N/A | No (mockup only) | Full KORA Link product |
| Partner Workspace Light | Partner | Semi-Functional Preview | Synthetic | Yes (all sections) | Full partner portal |
| Advisor Workspace Light | Advisor | Semi-Functional Preview | Synthetic | Yes (all sections) | Full advisor platform |
| Future Vision Area | All | Static Mockup | N/A | Mockup only | Per tier roadmap |

**Explicitly excluded at Foundation Light:**
Real payments · Wallet · Top-up · Cashback · Rewards · Full marketplace · Full booking engine · Production worker accounts (before Gate 3) · Live HR data (before Gate 3) · SQL before Gate 2 · Fiscal/tax live outputs (before Gate 5) · KORA Link operational integration · KORA Impact Pledge execution · SPID/CIE required auth in v0.1

---

## 21. Post-MVP / Governance / Certified Scope

| Feature | Target Tier | Prerequisite |
|---|---|---|
| Production worker accounts | Foundation Pilot | Gate 3 |
| API integrations (HRIS/LMS/welfare) | Foundation | Gate 3 + technical integration plan |
| Enterprise SSO (SAML/OIDC, SCIM) | Foundation / Governance | Gate 3 |
| SPID/CIE/eIDAS identity | Certified / KORA Link | Gate 3 + legal review |
| KORA Link hardware | Ecosystem | KORA Link product release |
| Full partner booking engine | Ecosystem | Booking tier design + legal review |
| Advanced marketplace | Ecosystem | Ecosystem tier release |
| Wallet / top-up | Ecosystem | PSD2 + legal + tax |
| Advanced advisor certification | Governance | Advisor academy design |
| Verifiable credentials | Certified | DID/VC framework |
| Certified evidence package | Certified | External methodology validation |
| Public KORA certified profile | Certified | Certified tier release |
| Full benchmark layer | Foundation / Governance | Market data accumulation |
| Outcome correlation layer | Governance / Certified | Pilot data + statistical model |
| Portable Dynamic Impact CV | Ecosystem | Verifiable credential infrastructure |
| LinkedIn / credential integrations | Ecosystem | Partner agreements |
| Advanced consent center | Foundation / Governance | Legal framework |
| Advanced KORA Contribution methodology | Foundation | Methodology document + Delphi calibration |
| Territorial activation intelligence | Ecosystem | Territorial data model |
| CSRD/ESRS certified annex | Governance / Certified | CSRD compliance design |

---

## 22. Risks and Mitigations

| # | Risk | Severity | Product Mitigation | UX Copy Mitigation | Technical Boundary |
|---|---|---|---|---|---|
| R-01 | Looking like welfare platform | High | Lead with intelligence, not benefit access. First screen is KORA Index, not opportunity catalog. | "Impact Intelligence Platform" — not "welfare platform" or "benefit hub" | Architecture enforces separation of scoring and service access |
| R-02 | Looking like HR performance tool | Critical | No individual ranking. No manager access to individual PIB. PIB is explicitly worker-private. | *"This is not a performance score."* — mandatory on every PIB surface | Grant absence on individual PIB from employer roles |
| R-03 | Looking like surveillance | Critical | Privacy screen is mandatory in worker onboarding. Explicit employer-cannot-see table. | *"Your employer cannot see your individual data."* — repeated prominently | Grant absence enforced at DB level, not policy |
| R-04 | Looking like social network | Medium | No feeds. No likes. No comments. No follower count. No visible profiles between workers. | No social language. No "share your achievement" defaults. | No social graph tables |
| R-05 | Looking like discount marketplace | High | No pricing, no checkout, no discounts, no buy button on partner/opportunity screens. | "Request participation" not "book now". "Contact partner" not "buy". | No payment tables, no price fields |
| R-06 | Looking like gamification | High | No leaderboards. No points. No streaks. No badges that rank users. Milestones are serious credentials, not trophies. | No point language. No emoji rewards. No "level up" copy. | No ranking tables, no points fields |
| R-07 | Mishandling sensitive wellbeing/health-related data | Critical | Sensitivity flags in UEF Review. Privacy escalation for sensitive wellbeing/health-related data. Clear visual indicators. Foundation Light must not process detailed medical/clinical health records. Minimize and categorize at source. | Sensitivity badge on flagged records. | High-sensitivity suppression rules in analytics.uef_records. No detailed medical record storage. |
| R-08 | Employer seeing individual data | Critical | Grant absence enforced at DB level. Role-based routing. Employer role cannot navigate to worker screens. | Every employer-facing view says "Aggregate only." | Grant absence — not RLS alone |
| R-09 | PIB perceived as individual score by employer | High | PIB visible only in My KORA. No PIB in company workspace. Architectural separation. | *"Individual data is not visible to employers."* | No employer-role DB access to analytics.pib_records |
| R-10 | Overbuilding wallet/payments | Critical | No financial transaction tables. No checkout flow. Financial Governance is informational only. | No "pay", "buy", "wallet", "cashback" language anywhere | No payment tables, no FUO transit |
| R-11 | Partner side becoming marketplace | Medium | Partner pages show verification, pillar coverage, and request-based contact — not pricing or checkout | "Explore and connect" not "shop and buy" | No cart, no price, no payment fields |
| R-12 | Simulator overpromising outcomes | Medium | Directional label on all estimates. Confidence caveat mandatory. | *"Estimated directional impact. Not a certified forecast."* — mandatory disclaimer | Simulator output clearly labeled non-binding |
| R-13 | Benchmark mistaken for real market data | Medium | Benchmark labeled as "Preview — limited pilot dataset" | *"Not a statistically representative market benchmark"* | Benchmark data flagged as synthetic |
| R-14 | KORA Contribution confused with KORA Index | Medium | Contribution always labeled as companion indicator, separate card, separate page. Never merged with KORA Index | *"KORA Contribution complements the KORA Index; it does not replace it."* | Separate data table, separate computation |
| R-15 | Worker side too weak for adoption | Critical | My KORA must be ambitious — PIB, Opportunities, Collective Events, Partner Map, Dynamic CV, Timeline, Data Control, Privacy. Not a PIB screen with a menu. | Strong worker-facing copy about personal value and control | Worker side fully functional with synthetic profiles in demo |
| R-16 | Worker contact creating privacy leakage | High | Worker requests partner with minimum data + consent. Partner receives only request context, not PIB. | Consent confirmation on partner contact flow. | Minimum data principle enforced in request records |
| R-17 | Cross-company initiatives creating identification risk | Medium | Aggregate participation only visible to employer. Below threshold: suppressed. | *"Your employer will not see your individual participation."* | Privacy threshold enforced on all aggregate views |
| R-18 | SPID/CIE creating onboarding friction | Medium | SPID/CIE not required in Foundation Light. Magic link / OTP first. | Simple auth language. No identity complexity in v0.1. | No SPID/CIE integration in v0.1 |
| R-19 | Data ingestion creating false confidence | High | Confidence Score always shown. Low-confidence outputs visually distinct. Warnings for insufficient data. | *"Confidence is low. This score should be treated with caution."* | calibration_status = pre_empirical_calibration NOT NULL on all scoring outputs |
| R-20 | Company KORA Snapshot perceived as employer propaganda | Medium | Snapshot for workers shows no confidential company data, no governance warnings, no financial detail | *"This is your company's aggregate KORA snapshot. It does not include or reveal your individual data."* | Snapshot uses only company aggregate outputs — no internal admin data |
| R-21 | Dynamic Impact CV mistaken for a certified credential | High | Each CV item must display status: verified / pending review / self-declared. Export must not imply KORA Certified status unless a future Certified credential layer is active. No auto-export to employer. | *"Each item shows its status. This is not a certified credential."* — mandatory on every export surface | No auto-certification flag in CV export. Certified credential layer is future scope only. |

---

## 23. Dev-Ready Summary

**Screens to build (Functional Core):** A-01 through A-14, C-01/02/04/05/06/07/12/15, W-01/02/08/09/11/12/13

**Screens to preview (Semi-Functional):** C-03/08/09/10/11/13, W-03/04/05/06/07/10, P-01 through P-07, AD-01 through AD-05

**Screens to mock (Static):** C-14, W-14, FV-01 through FV-05

**Flows to build:** F-01 through F-18 (all 18 core flows)

**Data objects required (synthetic seed):** Company (1 baseline + 3 comparison profiles) · Program records · Workers (200–300 pseudonymized) · UEF events (8–12 types, 5 pillars, 4 source types) · Collective initiatives (3–5 seeded) · Partners (10–15 seeded) · Advisor reviews (3–5 seeded) · Scoring output (2 scenarios: CLEAR + WARNING)

**Forbidden queries (all employer roles):** SELECT on analytics.uef_records · analytics.impact_units · analytics.pib_records · analytics.worker_profiles — enforced by grant absence

**Event statuses:** draft → under_review → approved → rejected → flagged

**Booking/request statuses:** Available → Requested → Confirmed → Waitlisted → Completed → Verified → Pending Evidence → Cancelled

**Report statuses:** not_started → generating → ready → exported → archived

**Methodology display requirements (every scoring surface):**
- `methodology_version_id` visible
- `calibration_status = pre_empirical_calibration` badge — NOT NULL, cannot be hidden
- Confidence Score — always with KORA Index, cannot be separated
- Data completeness indicator
- Plain-language explanation

**Authentication assumptions (demo):** Role switcher with named synthetic personas. No real auth credentials required for demo.

**Ingestion assumptions (demo):** Pre-loaded synthetic CSV files. AI mapping runs on synthetic data. UEF review shows pre-populated suggestions. Scoring simulation produces KORA Index from synthetic UEF batch.

**Privacy constraints:** Grant absence on employer role for individual analytics tables. Privacy threshold (≥10) on all department/site segment views. Worker personal layer not accessible by any employer role. Consent required before partner data share. KORA Admin standard access does not extend to identity-linked worker personal layer content (bookings, Dynamic CV, partner contacts, sensitive wellbeing/health-related metadata, consents, exports) — requires KORA Privacy Officer elevation. Worker-uploaded evidence is private by default and may not be auto-shared with employer.

**Score display requirements:** KORA Index + Confidence Score always together. 10-component breakdown always available on KORA Index screen. Activation Safeguard status always shown.

**Future features not to activate:** gov.kip_records (do not create) · KORA Link · KORA Impact Pledge execution · KORA Value Chain active calculation · External LLM on worker data · CEF · Sector Friction Index · Advanced KORA Contribution mechanics beyond basic companion indicator

---

## 24. Explicit Do-Not-Build List

The following must not be built, activated, or scaffolded in Foundation Light. No exceptions without a formal doc 22A amendment.

**Gate-blocked (technical pre-conditions not met):**
- SQL DDL generation before Gate 2 (CTO review)
- Production database provisioning before Gate 2
- Live HR/company data processing before Gate 3 (legal/privacy)
- Production worker accounts before Gate 3
- Live fiscal/tax outputs before Gate 5 (tax/fiscal)

**Payment and financial execution:**
- Payment flows of any kind
- Wallet (worker or company)
- Top-up
- Cashback
- Reward redemption
- Checkout
- Voucher issuance
- Full marketplace
- Full booking engine with slot inventory, calendar sync, or pricing
- KORA Impact Pledge execution
- FUO movement through KORA
- PSP integration

**Privacy violations:**
- Employer visibility into individual UEF, IU, PIB, or worker_profiles
- Employer visibility into worker bookings, partner contacts, Dynamic Impact CV, or timeline
- Any individual-level scoring visible to employer roles
- KORA Admin standard-access paths to identity-linked individual worker personal layer content without Privacy Officer elevation
- Detailed medical records or clinical health data processing, display or storage in Foundation Light
- Auto-export or auto-share of worker Dynamic Impact CV to employer

**AI restrictions (v0.1):**
- External LLM API calls on worker or HR data

**Social and gamification:**
- Ranking workers against each other
- Comparing workers against each other
- Social feeds
- Likes, comments, public internal profiles
- Leaderboards
- Points as currency
- Worker-to-worker visibility of personal data

**Live integrations:**
- KORA Link hardware operational integration
- Real-time NFC/QR verification
- Production API integrations with HRIS/LMS/welfare providers
- SPID/CIE as required authentication in v0.1

**Prohibited claims (copy and UI):**
- Certified methodology claims
- Empirically calibrated score claims
- Regulatory-grade or actuarially validated claims
- Individual worker performance claims based on PIB
- Business outcome predictions as certain (retention, absenteeism, productivity)

---

## 24B. New Intelligence Modules — Phase 1M Alignment

The following canonical KORA modules are defined in `docs/kora-canonical-product-architecture-v1.md §12`. Each module has a status in Foundation Light. This section defines the product behavior specification for modules that are active in the demo.

### Activation Debt — Debito di attivazione
**Status:** Demo (sintetico). Parte dell'Activation & Participation screen e dell'Executive Cockpit.
**Cosa mostra:** quota di popolazione eleggibile inattiva, dipartimenti sotto-attivati, siti sotto-attivati, pillar debt, silent majority, budget speso senza attivazione, iniziative con reach basso.
**Regole:** aggregate-only; nessun dato individuale; nessuna soglia inferiore a 10 lavoratori; sempre con Activation Safeguard.

### Evidence Debt — Debito di evidenza
**Status:** Demo (sintetico). Parte del Data & Evidence screen.
**Cosa mostra:** fonti mancanti, record auto-dichiarati, iniziative a bassa verifica, advisor review pending, potenziale di uplift della confidenza, CSR evidence gaps.
**Regole:** batch-level only; collega Evidence Debt al Confidence Score; non mostra UEF individuali.

### No-Surveillance Proof
**Status:** Demo (Foundation Light, privacy boundary components attivi).
**Cosa mostra:** dimostrazione visiva che il datore di lavoro non può accedere ai dati individuali del lavoratore. Include: nessun PIB individuale, nessuna worker timeline, nessun Dynamic CV, nessun booking, soglia aggregazione, separazione Identity Store, worker-owned layer.
**Regole:** deve essere visibile e comprensibile; non basta nascondere dati — deve mostrare esplicitamente cosa il datore di lavoro NON vede.

### Additionality Lens
**Status:** Demo (Foundation Light, Initiative Studio / Pillars & Initiatives).
**Cosa mostra:** classificazione additionality su 7 livelli (da `mandatory_legal_minimum` a `collective_verified_initiative`). Ogni iniziativa mostra il proprio livello.
**Regole:** il valore KORA di un'iniziativa dipende dal livello di additionality; mandatory legal minimum = valore nullo o minimo; collective verified initiative = massima rilevanza KORA Contribution.

### Silent Majority Detector
**Status:** Demo (Foundation Light, Activation & Participation screen).
**Cosa mostra:** segnale su quanta parte dell'organizzazione rimane esclusa dai programmi people.
**Regole:** aggregate-only; mai individuale; complementare all'Activation Debt.

### Access Equity & Inclusion Evidence Layer
**Status:** Demo (aggregazione sintetica). Parte dell'Activation & Participation screen.
**Cosa mostra:** vista aggregata dell'accesso alle iniziative per dipartimento, sito, job family, workforce operativa vs ufficio, remoto vs plant, tipo contratto.
**Regole:** sempre sopra la privacy threshold (min 10 lavoratori); nessun profiling individuale; nessun ranking; dati di genere e diversità solo aggregati e con cautela legale.

### Activation Intervention Simulator
**Status:** Demo (simulazione sintetica). Parte del Benchmark & Simulator screen.
**Cosa mostra:** simulazione dell'impatto di un intervento sulle componenti KORA, sui pillar, sulla confidenza e sulla qualità dell'evidenza.
**Regole:** output indica se l'effetto è su KORA Index o KORA Contribution; mostra livello di additionality; mostra requisiti di evidenza; non è un motore predittivo causale.

### CSR Evidence Mapping Layer
**Status:** Demo/mockup. Parte del Company ESG/Sustainability role screen e dei Reports.
**Cosa mostra:** collegamento tra evidenze KORA e framework CSR/ESG rilevanti (CSRD, ESRS 2, ESRS S1, D.Lgs. 125/2024, GRI 401/403/404/405/413, ISO 26000, OECD Guidelines, UNGP, UN Global Compact).
**Regole:**
- Il CSR Evidence Mapping Layer non modifica il KORA Index.
- Non produce compliance automatica.
- Disclaimer obbligatorio su ogni output CSR/ESG: "KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio."
- ESRS S2 è scope futuro (Value Chain — non in Foundation Light).

### HR KPI Correlation Layer
**Status:** Demo/interpretazione sintetica. Parte del Company Intelligence Workspace (sezione Benchmark & Analysis).
**Cosa mostra:** confronto aggregato tra segnali KORA e indicatori HR (assenteismo, turnover, retention, engagement survey, eNPS, fasce età, tipo contratto).
**Regole:**
- Layer adiacente di interpretazione — non alimenta il KORA Index.
- Correlazione ≠ causalità. Ogni output HR KPI deve includere questa dichiarazione esplicitamente.
- Aggregate-only; sopra la privacy threshold.
- Dati di genere e diversità solo aggregati e con cautela.
- Nessuna decisione lavorativa basata su output KORA.
- Claim consentito: "I reparti con maggiore attivazione KORA mostrano, nello stesso periodo, un tasso di assenteismo inferiore."
- Claim vietato: "KORA riduce l'assenteismo."

### People ROI & Outcome Correlation Layer
**Status:** Demo (indicatori direzionali sintetici). Parte del Financial Governance screen.
**Cosa mostra:** efficienza del budget people vs attivazione prodotta (costo per meaningful activation, spend without activation, activation uplift).
**Regole:**
- ROI è interpretazione adiacente, non componente metodologica.
- Cost per IU e cost per meaningful activation sono indicatori direzionali, non metriche assolute.
- Foundation Light non può rivendicare causalità ROI.
- Ogni output ROI mostra confidenza e limitazioni.
- Claim vietato: "KORA ha generato un ROI del X% riducendo il turnover."

### KORA Evolution & Temporal Intelligence
**Status:** Demo (longitudinale su dati sintetici). Parte del Executive Cockpit e KORA Index screens (trend view).
**Cosa mostra:** evoluzione KORA Index, pillar, Activation Debt, Evidence Debt, confidenza nel tempo; stabilità score; traiettoria trimestrale.

### Board Pack
**Status:** Mockup demo / futuro operativo. Parte del Reports screen.
**Cosa mostra:** pack di reporting executive con KORA Index, Activation Debt, Evidence Debt, top 3 rischi, top 3 decisioni, CSR evidence mapping, HR KPI correlation, ROI interpretation, limitazioni.
**Regole:** mockup visivo in Foundation Light; include disclaimer CSR e limitation statement; non è certificato.

### Public KORA Snapshot & Social Trust Layer
**Status:** Mockup/future-vision only in Foundation Light. Nessuna condivisione pubblica reale.
**Cosa mostra:** segnali aggregati di fiducia futuri verso stakeholder, mercato e talenti.
**Regole:** nessun dato individuale; nessun ranking pubblico; nessun claim "certified" senza tier Certified; Confidence Score e calibration_status sempre visibili; advisor-reviewed ≠ certified.

### Worker Consent & Data Portability
**Status:** Demo (privacy controls). Parte del My KORA / Privacy & Sharing screen.
**Cosa mostra:** cosa il lavoratore può controllare, vedere, esportare e revocare.
**Regole:** solo sintetico in Foundation Light; nessun consent action reale; data portability è feature futura.

---

## 25. Final Product Decision

KORA Foundation Light should proceed as an **ambitious multi-sided demo app with synthetic data** — not as a minimal dashboard, not as a generic welfare tool, and not as an HR engagement platform.

The platform must demonstrate:
- A complete intelligence loop from data to KORA Index
- Worker adoption as a genuine value proposition, not a decorative module
- Privacy-first architecture as a visible product feature, not a legal checkbox
- Partner and advisor ecosystem as verified trust infrastructure, not a marketplace
- The full future platform as a labeled direction, not an active build

**What proceeds now:** Demo app with synthetic data, product functional specification, UX design, UI component system, scoring simulation with versioned config, Dynamic Impact CV light, worker privacy experience, Founder Validation Cockpit.

**What waits for Gate 2:** SQL DDL, schema provisioning, Supabase project setup, Prisma models.

**What waits for Gate 3:** Live company data, production worker accounts, real pilot ingestion.

**What waits for Gate 5:** Live fiscal classification outputs, Welfare Statement generation.

**What never happens at Foundation Light:** Payments, wallet, KIP execution, KORA Link, employer access to individual worker data.

The goal is not platform completeness. The goal is **demo credibility, product ambition, worker adoption, privacy trust, and commercial clarity**.

---

## v1.0 Patch Notes

- **KORA Admin access refined:** Standard KORA Admin is a platform operator role. Access to identity-linked individual worker personal layer content (bookings, partner contacts, Dynamic Impact CV, sensitive wellbeing/health-related metadata, consents, exports) requires KORA Privacy Officer elevation. KORA Privacy Officer is a distinct privileged audit role for legally justified, scoped, logged exceptional access only.
- **KORA Analyst scope clarified:** KORA Analyst may review pseudonymized UEF/IU/scoring records but may not access worker identity-linked personal content, Dynamic Impact CV, bookings, partner contacts, or sensitive wellbeing/health-related metadata without escalation through Privacy Officer workflow.
- **Company Finance aggregate visibility clarified:** Finance may view aggregate KORA Index summary, Confidence Score, financial governance indicators, budget vs activation aggregates, cost per IU indicator, fiscal classification informational layer, and relevant report exports. Finance may not access individual worker data, workforce drilldowns, or sensitive personal data.
- **Worker evidence upload restricted and privacy-protected:** Worker-uploaded evidence is private by default. It may only become shareable or externally visible through explicit worker action and, where required, review. Foundation Light does not accept highly sensitive medical/clinical health documents as worker-uploaded evidence. Evidence does not become a verified credential unless explicitly validated.
- **Health data wording replaced:** "health data" replaced with "sensitive wellbeing / health-related metadata" throughout. Foundation Light must not process, display or store detailed medical records or clinical health data. Where wellbeing or health-related services exist in source data, KORA must minimize the data, classify at category level where legally permitted, and apply elevated privacy handling.
- **Dynamic Impact CV export clarified:** Each item must display its status (verified / pending review / self-declared / worker-selected). Export preserves all status labels and does not imply KORA certification unless a future Certified credential layer is active. Employer never receives the export automatically.

---

**Document version:** v1.1 — Phase 1M-B Aligned
**Date:** 2026-05-19
**Canonical inputs:** docs 10, 12, 18, 19, 20, 21, 21b, 22A, 23, Appendix A, `docs/kora-canonical-product-architecture-v1.md` (v1.1)
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL) · Gate 3 OPEN (blocks live data) · Gate 4 Provisional · Gate 5 OPEN (blocks live fiscal)
**Canonical reference:** `docs/kora-canonical-product-architecture-v1.md` (v1.1) — supersedes this document on positioning, scope, and capability boundary questions.
