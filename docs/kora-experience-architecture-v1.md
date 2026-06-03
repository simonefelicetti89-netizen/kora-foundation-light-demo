# KORA Experience Architecture v1

**Status:** Canonical design reference for B47+  
**Principle:** Design decisions, not dashboards. Meaning before numbers.

---

## 1. Executive Cockpit — `/company`

**Purpose:** First reading of organizational human impact for CEO/HR/Finance.  
**Primary user:** Executive who needs to understand the current state in 2 minutes.  
**Primary decision:** Is activation healthy? Where must I act first?

**What user sees first:**  
Full-width dark intelligence hero — score, diagnosis sentence, safeguard, confidence.

**Information hierarchy:**  
1. KORA Index™ + diagnosis sentence (what is happening)  
2. Three narrative signals (why it is happening)  
3. Activation metrics strip (AR, MAR, VR — how deep it goes)  
4. Macroblock architecture (what components drive it)  
5. Priority action (what to do first)  
6. Navigation to deeper intelligence  

**What to remove:**  
- CockpitMasthead → replaced by KoraIntelligenceHero  
- Raw methodology strip → move to bottom only  
- Generic "provenance footer" on every section → single footer  

---

## 2. KORA Index™ — `/company/kora-index`

**Purpose:** Understand the score, its drivers, and the action.  
**Primary user:** HR director, methodology reviewer, advisor.  
**Primary decision:** What is constraining the score and what changes it?

**What user sees first:**  
Score with diagnosis. One sentence. Not a ring gauge floating alone.

**Information hierarchy:**  
1. Hero Diagnosis — score + one sentence verdict + Safeguard™ + CS™  
2. Score Drivers — 3 named constraints in business language (NOT technical codes)  
3. Business Interpretation — what this means for budget, workforce, trust  
4. Board Actions — 3 specific recommended decisions  
5. Technical Breakdown — macroblocks, components, eligibility, pipeline (LAST)  
6. Methodology Reference — glossary, confidence detail  

**What to remove:**  
- Opening scenario comparison strip (moves to technical section)  
- IndexRingCard at top → replaced by HeroDiagnosis  
- Equal-weight panel stack → replaced by narrative hierarchy  
- All panels visible at once → narrative gates technical  

---

## 3. Budget-to-Human-Impact™ — `/company/financial`

**Purpose:** Connect welfare spend to real activation signal.  
**Primary user:** CFO, HR, Finance.  
**Primary decision:** Where is budget converting and where is it wasted?

**Information hierarchy:**  
1. Spend headline — total budget, deep activation %, economic relief %  
2. Activation Debt™ — how much is not converting (€ and %)  
3. Pillar investment view — ranked by effectiveness  
4. Reallocation opportunity — where to move budget  
5. BTI macroblock score  
6. HR KPI correlation (directional, not causal)  

---

## 4. Activation Intelligence™ — `/company/activation`

**Purpose:** Who is not being reached and why.  
**Primary user:** HR Ops, Program Manager.  
**Primary decision:** Where is the silent majority and which segments need action?

**Information hierarchy:**  
1. Safeguard™ status — prominent, first — CLEAR/WARNING/FLAGGED  
2. Activation Debt™ hero — unactivated workers as a meaningful number  
3. Concentration — top 12% vs bottom 50% (who is doing all the activating)  
4. Site/department view — where is it worst  
5. Partner gap suggestions  

---

## 5. Data Intake Studio™ — `/company/data`

**Purpose:** Show data readiness and ingestion health.  
**Primary user:** HR data team, KORA operator reviewing intake.  
**Primary decision:** Are data sources complete enough to score?

**Information hierarchy:**  
1. Overall readiness gauge — is data ready to score?  
2. Source grid — each source with status + completeness + action  
3. Evidence gaps — what is missing  
4. Next action — exactly what to do  

---

## 6. Decision Pack / Reports — `/company/reports`

**Purpose:** Board-ready output library.  
**Primary user:** CEO, ESG lead, Board member.  
**Primary decision:** Which report to share with which audience?

**Information hierarchy:**  
1. Report collection header — what's available, status  
2. Report cards — document-like, with audience + purpose + status  
3. Primary CTA — download / view / prepare  
4. Methodology note — what this does and does not certify  

---

## 7. KORA Admin Control Tower™ — `/admin`

**Purpose:** Operational brain of KORA — see everything, act on priorities.  
**Primary user:** KORA operator / founder.  
**Primary decision:** What needs my attention right now?

**Information hierarchy:**  
1. Operational Command Hero — dark, with real-time operational KPIs  
2. Priority Queue — what requires KORA operator action TODAY  
3. Company Readiness Matrix — each company's pipeline stage  
4. Evidence & Pipeline — ingestion → UEF → scoring → decision pack  
5. GTM Founder Cockpit — pipeline, probabilities, revenue signals  
6. Network Intelligence — advisor/partner coverage  
7. Methodology Governance — version, confidence policy, gate status  

---

## 8. Company Workspace — `/company/workspace`

**Purpose:** Authenticated live workspace for real company session.  
**Primary user:** Real Company Admin with live Supabase session.  
**Primary decision:** Is my data ready? What is my KORA Index?

**What it shows:**  
KORA Index (if scored) + reporting readiness + evidence archive + methodology.  
Blocked for KORA_ADMIN — explains why, links to demo area.

---

## 9. Worker / My KORA — `/my-kora`

**Purpose:** Personal impact dashboard. Private. Sovereign. Trustworthy.  
**Primary user:** Individual worker.  
**Primary decision:** What is my activation and how can I deepen it?

**Information hierarchy:**  
1. Privacy statement — prominent, non-suppressible  
2. Personal impact summary — pillar by pillar, trend  
3. My timeline — verified activities  
4. Opportunities — what I can do next  
5. Privacy controls — what employer sees (never PIB)  

**What to remove:**  
- Any employer-facing language  
- Any gamification (scores, ranking, leaderboard)  
- Technical jargon without explanation  

---

## 10. Partner Portal — `/partner`

**Purpose:** Operational workspace for activation partners.  
**Primary user:** Partner organization representative.  
**Primary decision:** What requests are active, what evidence is needed?

**Information hierarchy:**  
1. Active requests — what companies need from this partner  
2. Evidence protocol — what format, what level  
3. Services offered — what the partner provides  
4. Advisor audit status — validation state  

---

## 11. Advisor Portal — `/advisor`

**Purpose:** Governance and review workspace.  
**Primary user:** Certified KORA Advisor.  
**Primary decision:** What needs review, what evidence is weak, what recommendation to issue?

**Information hierarchy:**  
1. Review queue — what needs attention (alta/media priority)  
2. Evidence review panel — document checklist per review  
3. Portfolio assignments — companies/partners in scope  
4. Methodology boundary — what advisor can and cannot certify  

---

## 12. Future Vision — `/future-vision`

**Purpose:** Roadmap communication.  
**Primary user:** Investor, pilot prospect, strategic stakeholder.  
**Primary decision:** Where is KORA going and when?

**Information hierarchy:**  
1. Phase timeline (already improved)  
2. Cluster modules by phase  
3. Dependency logic  
4. Boundary note — what is not yet available  

---

## 13. Demo Guide — `/demo-guide`

**Purpose:** Navigator for demo sessions.  
**Primary user:** KORA team during investor/pilot demo.  
**Primary decision:** Which section to visit first for this audience?

**Information hierarchy:**  
1. Audience selector — CEO, CFO, HR, ESG, Investor  
2. Recommended path per audience  
3. What to say / what KORA is not  
4. Privacy principles  

---

## 14. Access Denied / Empty States

**Principle:** Never a lonely card. Always explain + provide a path.  
- Access denied: why + what role is needed + what they CAN access  
- Empty state: why no data + what action fills it + timeline  
- Error state: what happened + what to do  

---

## Key Components Required (B47)

New components to build:
- `KoraIndexHeroDiagnosis` — narrative hero for KORA Index page
- `ScoreDrivers` — 3 business-language score drivers
- `BusinessInterpretation` — what the score means in operations
- `PriorityQueue` — admin action items requiring immediate attention
- `CompanyReadinessMatrix` — company by company pipeline
- `NarrativeSection` — wrapper enforcing meaning-before-numbers structure
- `DiagnosisSentence` — generates 1-sentence score verdict

---

## Implementation Order (B47 Slices)

Slice A: Architecture document + new primitive components  
Slice B: KORA Index page rebuild (narrative-first)  
Slice C: Admin Control Tower (Priority Queue + Readiness Matrix)  
Slice D: Executive Cockpit validation + Financial restructure  
Slice E: Activation + Reports + Data  
Slice F: Worker + Partner + Advisor  
Slice G: QA + build  
