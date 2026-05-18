# KORA Foundation Light — Phase 0 Scaffold Plan
**Document:** `docs/phase-0-scaffold-plan.md`
**Type:** Operational Build Plan — Phase 0
**Audience:** Claude Code, Build Lead, Frontend Developer
**Status:** v1.0 — Active Build Reference
**Gate dependency:** GO FOR DEMO APP WITH SYNTHETIC DATA. SQL blocked until Gate 2.

---

## 1. Phase 0 Objective

Build the demo scaffold foundation. Nothing more.

**Goal:** A navigable, architecture-aligned shell with roles, scenarios, mock data boundaries, service interfaces, and privacy enforcement — ready for P1 feature implementation.

**Standard of success:** A developer (or a new Claude Code session) can open the app, switch roles, switch scenarios, and navigate to every top-level route — seeing correctly suppressed content, correctly labeled calibration status, and correctly stubbed service interfaces — before a single real feature is implemented.

Phase 0 is not a prototype. It is the architectural foundation of the demo. Every decision made in Phase 0 either enables or constrains everything that follows.

---

## 2. What Phase 0 Creates

### Allowed in Phase 0

```
✓ Next.js 14+ App Router structure
✓ TypeScript strict mode (strict: true in tsconfig)
✓ Tailwind CSS configuration with KORA design tokens
✓ shadcn/ui installation and base component setup
✓ Full routing structure (/admin /company /my-kora /partner /advisor /future-vision)
✓ Root layout (AppShell) with sidebar, header, navigation
✓ RoleSwitcher component (demo-only — labeled)
✓ ScenarioSwitcher component (demo-only)
✓ PersonaSwitcher component (demo-only — My KORA only)
✓ Placeholder pages for all P0 routes (not blank — architecture-aligned skeletons)
✓ /data/synthetic/ folder structure with .gitkeep (files added in separate step)
✓ /data/scenarios/ folder structure
✓ /data/methodology/methodology-config.json (weights, thresholds, version — not hardcoded)
✓ All 15 mock service interface files (TypeScript interfaces + stub implementations)
✓ /lib/types/index.ts with all core data shape definitions
✓ /lib/constants/kora.ts with pillar codes, component codes, thresholds
✓ /lib/methodology-config/v0.1.ts with weight and threshold loader
✓ /lib/demo-state/ with current role, persona, scenario state management
✓ /lib/permissions/ with permission resolution helper
✓ /lib/formatters/ with score, percentage, date formatters
✓ Privacy boundary components (PrivacyBoundaryNotice, AccessDeniedState)
✓ SafeguardBadge and CalibrationBadge components
✓ KoraIndexHero skeleton (with methodology_version_id + calibration_status + CS placeholders)
✓ ComponentBreakdown skeleton (10 components listed, values stubbed)
✓ README.md with demo-only disclosure
```

### Not Allowed in Phase 0

```
✗ Production backend of any kind
✗ SQL DDL, Prisma schema, Supabase provisioning
✗ Database migrations
✗ Live data connections or API calls to external services
✗ Production authentication (NextAuth, Auth.js, SPID, CIE)
✗ Worker production accounts or real identity records
✗ Payment, wallet, checkout, KIP execution logic
✗ Full booking engine (request/confirm state only — in P1)
✗ Partner marketplace pricing or availability logic
✗ KORA Link operational logic
✗ Live fiscal/tax outputs
✗ External LLM API calls on any HR or worker data
✗ Hardcoded methodology weights in any component or service
✗ Real company or worker data of any kind
✗ Any gov.kip_records reference (this table does not exist in Foundation Light)
```

---

## 3. Files and Folders to Create

All paths are relative to the project root (`kora-demo/`).

### Root Configuration Files

```
package.json                    ← Dependencies: next, react, typescript, tailwindcss, shadcn/ui, recharts
tsconfig.json                   ← TypeScript strict mode enabled
tailwind.config.ts              ← KORA design tokens (colors, fonts, spacing)
next.config.ts                  ← Next.js App Router config
.eslintrc.json                  ← ESLint with TypeScript rules
.gitignore                      ← node_modules, .env, .next, *.seed (no accidental seed data commits)
README.md                       ← KORA Foundation Light Demo — synthetic data disclosure
```

### App Router Pages

```
app/layout.tsx                                  ← Root layout wrapping AppShell
app/page.tsx                                    ← Root — redirects to role-based home
app/globals.css                                 ← Tailwind base + KORA custom CSS

app/admin/layout.tsx                            ← Admin layout (access check: KORA Admin + Founder)
app/admin/page.tsx                              ← A-01: Admin Dashboard (skeleton)

app/company/layout.tsx                          ← Company layout (access check: Company roles only)
app/company/page.tsx                            ← C-01: Executive Cockpit (skeleton)
app/company/kora-index/page.tsx                 ← C-02: KORA Index Detail (skeleton)
app/company/ingestion/page.tsx                  ← C-03: AI Upload Studio (skeleton)
app/company/ingestion/mapping-review/page.tsx   ← C-04: AI Mapping Review (skeleton)
app/company/uef-review/page.tsx                 ← C-05: UEF Review Table (skeleton)
app/company/scoring/page.tsx                    ← C-06: Scoring Run (skeleton)
app/company/reports/page.tsx                    ← C-07: Reports (skeleton)
app/company/activation/page.tsx                 ← C-08: Activation & Participation (skeleton)
app/company/data/page.tsx                       ← C-09: Data & Evidence (skeleton)
app/company/financial/page.tsx                  ← C-10: Financial Governance Light (skeleton)

app/my-kora/layout.tsx                          ← My KORA layout (access: Worker only; employer suppressed)
app/my-kora/page.tsx                            ← W-01: My KORA Home (skeleton)
app/my-kora/privacy/page.tsx                    ← W-02: Privacy & Sharing (skeleton)
app/my-kora/dynamic-cv/page.tsx                 ← W-03: Dynamic CV Light (skeleton)
app/my-kora/opportunities/page.tsx              ← W-04: Opportunities (skeleton)
app/my-kora/bookings/page.tsx                   ← W-05: Booking Requests (skeleton)
app/my-kora/collective/page.tsx                 ← W-06: Collective Impact Events (skeleton)

app/partner/layout.tsx                          ← Partner layout (access: Partner Admin Light)
app/partner/page.tsx                            ← P-01: Partner Dashboard (skeleton)

app/advisor/layout.tsx                          ← Advisor layout (access: Advisor External Light)
app/advisor/page.tsx                            ← AD-01: Advisor Dashboard (skeleton)

app/future-vision/layout.tsx                    ← Future Vision layout (accessible by all — labeled inactive)
app/future-vision/page.tsx                      ← FV-01: Future Vision Overview (mockup)
```

### Component Files

```
components/layout/AppShell.tsx                  ← Root layout wrapper (DemoStateProvider, role-aware)
components/layout/Sidebar.tsx                   ← Role-aware navigation sidebar
components/layout/Header.tsx                    ← Header with scenario indicator + calibration banner

components/demo/RoleSwitcher.tsx                ← Role switcher (labeled: DEMO ONLY)
components/demo/ScenarioSwitcher.tsx            ← Scenario switcher (S1/S2 toggle)
components/demo/PersonaSwitcher.tsx             ← Persona switcher (My KORA only)
components/demo/SyntheticDataBanner.tsx         ← Global banner: SYNTHETIC DEMO DATA

components/kora-index/KoraIndexHero.tsx         ← KORA Index hero card (value + CS + safeguard + calibration)
components/kora-index/ComponentBreakdown.tsx    ← 10-component grid (AR MAR NI WB PC PB EQ VR CO CS)
components/kora-index/ExplainabilityPanel.tsx   ← Plain-language explanation panel
components/kora-index/MethodologyLabel.tsx      ← methodology_version_id + calibration_status label

components/privacy/PrivacyBoundaryNotice.tsx    ← Suppression overlay with reason message
components/privacy/AccessDeniedState.tsx        ← Full-page access denied for role violations

components/badges/SafeguardBadge.tsx            ← CLEAR / WARNING / FLAGGED badge
components/badges/CalibrationBadge.tsx          ← pre_empirical_calibration label

components/charts/PillarChart.tsx               ← 5-pillar distribution chart (Recharts)
components/charts/ComponentBreakdownChart.tsx   ← 10-component radar or bar chart
```

### Service Files

Each service file must export: (1) a TypeScript interface defining the service contract, (2) a stub class implementing the interface that returns synthetic data or placeholder values.

```
services/demo-data/DemoDataService.ts
services/scenario/ScenarioService.ts
services/role-permission/RolePermissionService.ts
services/privacy-visibility/PrivacyVisibilityService.ts
services/ingestion-simulator/IngestionSimulatorService.ts
services/mapping-confidence/MappingConfidenceService.ts
services/uef-review/UEFReviewService.ts
services/scoring-simulator/ScoringSimulatorService.ts
services/activation-safeguard/ActivationSafeguardService.ts
services/explainability/ExplainabilityService.ts
services/kora-contribution/KoraContributionService.ts
services/report-generator/ReportGeneratorService.ts
services/booking-request/BookingRequestService.ts
services/dynamic-cv/DynamicCVService.ts
services/founder-validation/FounderValidationService.ts
```

### Library Files

```
lib/types/index.ts              ← All TypeScript type definitions:
                                  KoraRole, PillarCode, ComponentCode, KoraIndexOutput,
                                  UEFRecord, ImpactUnit, PIBRecord, CompanyAggregate,
                                  SafeguardStatus, ScenarioConfig, WorkerPersona,
                                  PartnerProfile, AdvisorReview, ReportData, BookingRequest,
                                  DynamicCVProfile, FounderValidationContact

lib/constants/kora.ts           ← All constants:
                                  PILLAR_CODES: ['LIFE','GROWTH','CONNECTION','IMPACT','LEGACY']
                                  KORA_INDEX_COMPONENTS: ['AR','MAR','NI','WB','PC','PB','EQ','VR','CO','CS']
                                  SAFEGUARD_THRESHOLDS: { CLEAR: {AR:0.40,MAR:0.30}, WARNING: {...}, FLAGGED: {...} }
                                  SAFE_AGGREGATION_THRESHOLD: 10
                                  KORA_ROLES: all 11 roles
                                  CALIBRATION_STATUS: 'pre_empirical_calibration'
                                  METHODOLOGY_VERSION: 'KORA Methodology v0.1'

lib/methodology-config/v0.1.ts  ← Methodology config loader:
                                  reads /data/methodology/methodology-config.json
                                  exports: getWeights(), getThresholds(), getMethodologyVersion()
                                  NO hardcoded values — all from config file

lib/demo-state/index.ts         ← Demo state management:
                                  React Context for: activeRole, activeScenario, activePersona
                                  Setters and hooks: useRole(), useScenario(), usePersona()
                                  Persistent across navigation (Context or localStorage)

lib/permissions/index.ts        ← Permission helpers:
                                  resolvePermission(role, resource): boolean
                                  getAccessibleRoutes(role): string[]
                                  isEmployerRole(role): boolean
                                  isWorkerRole(role): boolean

lib/formatters/index.ts         ← Formatting utilities:
                                  formatKoraIndex(value): string
                                  formatPercentage(value): string
                                  formatConfidenceScore(value): string
                                  formatPillarCode(code): string
                                  formatComponentCode(code): string
                                  formatCalibrationStatus(status): string
```

### Data Folders

```
data/synthetic/.gitkeep         ← Seed files added in a separate step (29 JSON files from doc 25)
data/scenarios/.gitkeep         ← Scenario configs added in a separate step
data/methodology/
  methodology-config.json       ← Created in Phase 0:
                                  { "version": "KORA Methodology v0.1",
                                    "calibration_status": "pre_empirical_calibration",
                                    "weights": { "AR":0.10,"MAR":0.10,"NI":0.10,"WB":0.10,
                                                  "PC":0.10,"PB":0.10,"EQ":0.10,"VR":0.10,
                                                  "CO":0.10,"CS":0.10 },
                                    "safeguard_thresholds": {
                                      "CLEAR":{"AR":0.40,"MAR":0.30},
                                      "WARNING":{"AR_min":0.20,"AR_max":0.40,"MAR_min":0.15,"MAR_max":0.30},
                                      "FLAGGED":{"AR_max":0.20,"MAR_max":0.15}
                                    } }
```

---

## 4. Phase 0 Acceptance Criteria

Phase 0 is complete and acceptable only when ALL of the following are true:

```
✓ App runs without errors: npm run dev starts successfully
✓ TypeScript compiles without errors: tsc --noEmit passes
✓ ESLint passes: npm run lint passes
✓ All top-level routes exist and return valid pages (no 404 for defined routes)
✓ Role switcher works — switching role changes navigation items and access rules
✓ Scenario switcher works — switching scenario changes the active scenario context
✓ RolePermissionService is wired — employer roles cannot access /my-kora routes
✓ PrivacyVisibilityService is wired — suppression renders PrivacyBoundaryNotice, not empty screen
✓ All 15 mock services are defined with TypeScript interfaces (stub implementations acceptable)
✓ No SQL, Prisma, Supabase, or real auth exists in any file
✓ No production database connection string appears in any file
✓ No external LLM API key or SDK import appears in any file
✓ Employer-facing routes (/company) cannot render worker-private data (tested by role switch)
✓ /my-kora routes are suppressed for Company role (PrivacyBoundaryNotice shown)
✓ Future Vision screens are labeled "Future Vision / Not Active in Foundation Light"
✓ KoraIndexHero component renders: KORA Index placeholder, CS label, SafeguardBadge, CalibrationBadge
✓ ComponentBreakdown renders all 10 components by code (values may be placeholder)
✓ methodology-config.json exists and lib/methodology-config/v0.1.ts reads from it
✓ No hardcoded weight values (0.10 per component) in any component or service file
✓ KORA_INDEX_COMPONENTS constant in lib/constants/kora.ts contains exactly 10 entries
✓ SAFE_AGGREGATION_THRESHOLD constant is 10
✓ README.md states demo-only status and synthetic data disclosure
✓ SyntheticDataBanner component is visible in the app shell
```

---

## 5. Commands to Run Later

Do not execute these commands now. They are listed here for the build step that follows scaffold approval.

**Initialization:**
```bash
npx create-next-app@latest kora-demo --typescript --tailwind --eslint --app --src-dir=false
cd kora-demo
```

**Component library:**
```bash
npx shadcn@latest init
npx shadcn@latest add button card badge table dialog alert separator
```

**Charts:**
```bash
npm install recharts
npm install @types/recharts
```

**Development:**
```bash
npm run dev          ← Start development server (localhost:3000)
npm run build        ← Production build check
npm run lint         ← ESLint check
npx tsc --noEmit     ← TypeScript check without compilation
```

**Do NOT run:**
```bash
# npx prisma init          ← Blocked until Gate 2
# npx prisma generate      ← Blocked until Gate 2
# supabase init            ← Blocked until Gate 2
# npm install @supabase/supabase-js  ← Blocked until Gate 2 (production mode)
# npm install openai       ← Forbidden (no LLM on HR/worker data)
# npm install anthropic    ← Forbidden (no LLM on HR/worker data)
# npm install next-auth    ← Blocked until Gate 2
```

---

## 6. Build Sequence

Execute in this order. Do not skip steps. Do not reorder.

**Step 1: Project initialization**
- Create Next.js project with TypeScript, Tailwind, ESLint, App Router
- Set up `tsconfig.json` with `strict: true`
- Configure `tailwind.config.ts` with KORA design tokens

**Step 2: Constants and types**
- Create `lib/constants/kora.ts` — all pillar codes, component codes, roles, thresholds
- Create `lib/types/index.ts` — all TypeScript data shapes
- Verify: `KORA_INDEX_COMPONENTS.length === 10`

**Step 3: Methodology config**
- Create `data/methodology/methodology-config.json` — weights, thresholds, version
- Create `lib/methodology-config/v0.1.ts` — reads and exports from JSON
- Verify: no hardcoded values in v0.1.ts

**Step 4: Demo state and permissions**
- Create `lib/demo-state/index.ts` — role, scenario, persona context
- Create `lib/permissions/index.ts` — permission resolution helpers
- Create `lib/formatters/index.ts` — formatting utilities

**Step 5: Service interface stubs**
- Create all 15 service files with TypeScript interfaces and stub implementations
- Verify: `RolePermissionService.canAccess('COMPANY_ADMIN', 'pib-records')` returns `false`
- Verify: `ActivationSafeguardService.evaluate(0.38, 0.22)` returns `'WARNING'`
- Verify: `ActivationSafeguardService.evaluate(0.52, 0.38)` returns `'CLEAR'`

**Step 6: App shell and layout**
- Create `components/layout/AppShell.tsx` — root layout with DemoStateProvider
- Create `components/layout/Sidebar.tsx` — role-aware navigation
- Create `components/layout/Header.tsx` — with scenario indicator and calibration banner
- Create `app/layout.tsx` — root layout using AppShell

**Step 7: Demo control components**
- Create `components/demo/RoleSwitcher.tsx`
- Create `components/demo/ScenarioSwitcher.tsx`
- Create `components/demo/PersonaSwitcher.tsx`
- Create `components/demo/SyntheticDataBanner.tsx`

**Step 8: Privacy components**
- Create `components/privacy/PrivacyBoundaryNotice.tsx`
- Create `components/privacy/AccessDeniedState.tsx`
- Create `components/badges/SafeguardBadge.tsx`
- Create `components/badges/CalibrationBadge.tsx`

**Step 9: KORA Index components**
- Create `components/kora-index/MethodologyLabel.tsx`
- Create `components/kora-index/KoraIndexHero.tsx` — includes MethodologyLabel, CalibrationBadge, SafeguardBadge
- Create `components/kora-index/ComponentBreakdown.tsx` — 10 components (AR MAR NI WB PC PB EQ VR CO CS)
- Create `components/kora-index/ExplainabilityPanel.tsx`

**Step 10: All routes (skeleton pages)**
- Create all pages listed in Section 3 as navigable skeletons
- Apply role access checks in each layout.tsx
- Apply PrivacyBoundaryNotice for suppressed routes
- Verify: Company role → /my-kora → PrivacyBoundaryNotice renders

**Step 11: Data folder structure**
- Create `data/synthetic/.gitkeep`
- Create `data/scenarios/.gitkeep`
- Create `data/methodology/methodology-config.json`

**Step 12: README and disclosure**
- Create `README.md` with synthetic data disclosure
- Verify: SyntheticDataBanner is visible in app

**Step 13: Acceptance criteria check**
- Run `npm run dev` — verify app starts
- Run `npx tsc --noEmit` — verify TypeScript passes
- Run `npm run lint` — verify ESLint passes
- Manually verify all 20 acceptance criteria in Section 4

---

## 7. Architecture Invariants for Every Future Phase

These must hold true in every subsequent build phase, not just Phase 0:

1. **Services are the only data access layer.** Components never import seed files directly.
2. **Role checks happen before data is passed to any component.** Permission is not checked in the component — it is checked in the service or layout that feeds the component.
3. **Employer roles are actively excluded from worker-private routes.** The layout.tsx for `/my-kora` must call `RolePermissionService` and render `AccessDeniedState` for employer roles — not simply navigate away.
4. **Every KORA Index render must include all mandatory labels.** `KoraIndexHero` enforces this by design — it is not optional for consuming pages to omit CS, calibration_status, or methodology_version.
5. **Methodology config is immutable during a session.** Services read it once and cache it. No component may mutate it.
6. **Scenario switching is the only way to change scoring state in the demo.** Components do not manipulate score values directly.
7. **Future Vision screens are always inactive.** Any future-vision page that receives a data prop or makes a service call has violated this rule.

---

**Document version:** v1.0
**Date:** 2026-05-17
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN (blocks SQL) · Gate 3 OPEN · Gate 5 OPEN
**Next step:** Approve this plan, then prompt: "Execute Phase 0 scaffold — follow docs/phase-0-scaffold-plan.md exactly."
