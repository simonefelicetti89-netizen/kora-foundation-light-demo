import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B81-B — Worker Identity Foundation: unit tests ───────────────────────────
//
// Task 1: lib/worker-identity/types.ts — branded types + session factories
// Task 2: app/my-kora/_providers/WorkerSessionProvider.tsx — context + hook
// Task 3: lib/worker-identity/worker-context.ts — getWorkerContext contract
// Task 4: services/worker-space/WorkerSpaceCapabilityService.ts — capability rules
// Task 5: docs/privacy-escalation-model.md exists + canonical principle
// Task 6: app/my-kora/layout.tsx uses WorkerSessionProvider
// Task 7: Route classification comments on /my-kora, /my-kora/dynamic-cv, /my-kora/collective
// Task 8: docs/worker-identity-architecture.md — all 8 sections exist
//
// Verification: no scoring, methodology, auth, or DB changes in this sprint.

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── Task 1: lib/worker-identity/types.ts ─────────────────────────────────────

describe('B81-B Task 1 — worker-identity/types.ts: branded types', () => {
  const src = read('lib/worker-identity/types.ts');

  it('exports WorkerKoraId branded string type', () => {
    expect(src).toContain("WorkerKoraId");
    expect(src).toContain("'WorkerKoraId'");
  });

  it('exports WorkerPseudonymId branded string type', () => {
    expect(src).toContain("WorkerPseudonymId");
    expect(src).toContain("'WorkerPseudonymId'");
  });

  it('exports WorkerMode with all 3 values', () => {
    expect(src).toContain("WorkerMode");
    expect(src).toContain("'PREVIEW'");
    expect(src).toContain("'LIVE'");
    expect(src).toContain("'DISABLED'");
  });

  it('exports WorkerSpaceStatus with all 3 values', () => {
    expect(src).toContain("WorkerSpaceStatus");
    expect(src).toContain("'NOT_ENABLED'");
    expect(src).toContain("'ENABLED'");
    expect(src).toContain("'PILOT_READY'");
  });

  it('exports WorkerSession interface with all required fields', () => {
    expect(src).toContain("workerMode");
    expect(src).toContain("workerKoraId");
    expect(src).toContain("workerDisplayName");
    expect(src).toContain("tenantId");
    expect(src).toContain("isPreview");
    expect(src).toContain("isLive");
    expect(src).toContain("sessionLoading");
  });

  it('exports WorkerSpaceCapability interface', () => {
    expect(src).toContain("WorkerSpaceCapability");
    expect(src).toContain("pibSupported");
    expect(src).toContain("dynamicCvSupported");
    expect(src).toContain("collectiveSupported");
  });

  // PRIOR HISTORY (accurate as of B81-B, preserved verbatim): "exports
  // makePreviewWorkerSession factory." B-WORKER "One Product / No Demo
  // Runtime" correction (2026-09-06): makePreviewWorkerSession() is removed
  // — its sole real caller, WorkerSessionProvider.tsx, is itself deleted
  // (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md).
  it('does not export makePreviewWorkerSession (retired with WorkerSessionProvider)', () => {
    expect(src).not.toContain("export function makePreviewWorkerSession");
  });

  it('exports makeDisabledWorkerSession factory', () => {
    expect(src).toContain("makeDisabledWorkerSession");
  });

  it('exports makeLiveWorkerSession factory', () => {
    expect(src).toContain("makeLiveWorkerSession");
  });
});

describe('B81-B Task 1 — session factory contracts (runtime)', () => {
  // Dynamic import to avoid TSC issues in the test runner
  it('makeDisabledWorkerSession returns DISABLED mode with all nulls', async () => {
    const { makeDisabledWorkerSession } = await import('../../lib/worker-identity/types');
    const s = makeDisabledWorkerSession();
    expect(s.workerMode).toBe('DISABLED');
    expect(s.isPreview).toBe(false);
    expect(s.isLive).toBe(false);
    expect(s.workerKoraId).toBeNull();
    expect(s.workerDisplayName).toBeNull();
    expect(s.tenantId).toBeNull();
  });

  it('makeLiveWorkerSession returns LIVE mode with isLive=true', async () => {
    const { makeLiveWorkerSession } = await import('../../lib/worker-identity/types');
    const id = 'KORA-LIVE-001' as unknown as import('../../lib/worker-identity/types').WorkerKoraId;
    const s = makeLiveWorkerSession({ workerKoraId: id, workerDisplayName: 'Marco T.', tenantId: 'tenant-123' });
    expect(s.workerMode).toBe('LIVE');
    expect(s.isLive).toBe(true);
    expect(s.isPreview).toBe(false);
    expect(s.workerKoraId).toBe(id);
    expect(s.workerDisplayName).toBe('Marco T.');
    expect(s.tenantId).toBe('tenant-123');
  });
});

// PRIOR HISTORY (accurate as of B81-B, preserved as a record, not verbatim
// given the volume): Task 2 tested app/my-kora/_providers/WorkerSessionProvider.tsx's
// source (client component, WorkerSessionContext, useWorkerSession hook,
// useMemo-based synchronous PREVIEW resolution, getWorkerContext call,
// demo-state role reading). Task 3 tested lib/worker-identity/worker-context.ts's
// getWorkerContext/workerSessionLabel/isWorkerDataAccessible contract and
// runtime behavior (DISABLED/LIVE/PREVIEW dispatch).
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): both
// files are deleted — WorkerSessionProvider.tsx and worker-context.ts had
// zero real callers once the anonymous/persona demo-visitor path
// (MyKoraDemoGate.tsx, itself also deleted) was retired along with every
// other /my-kora/** page becoming a pure canonical redirect
// (docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md). See
// tests/unit/bworker-preview-runtime-retirement.test.ts for the regression
// guard proving zero callers before deletion.

// ── Task 4: WorkerSpaceCapabilityService ─────────────────────────────────────

describe('B81-B Task 4 — WorkerSpaceCapabilityService source', () => {
  const src = read('services/worker-space/WorkerSpaceCapabilityService.ts');

  it('exports workerSpaceCapabilityService singleton', () => {
    expect(src).toContain("workerSpaceCapabilityService");
  });

  it('has getCapability method', () => {
    expect(src).toContain("getCapability");
  });

  it('has getCapabilityByCompanyId method', () => {
    expect(src).toContain("getCapabilityByCompanyId");
  });

  it('has isWorkerSpaceEnabled boolean guard', () => {
    expect(src).toContain("isWorkerSpaceEnabled");
  });

  it('never returns pibSupported: true in Foundation Light (Pilot+ constraint)', () => {
    // pibSupported: false is the invariant in Foundation Light
    expect(src).toContain("pibSupported:         false");
  });

  it('returns dynamicCvSupported: true in preview mode', () => {
    expect(src).toContain("dynamicCvSupported:   true");
  });

  it('returns collectiveSupported: true in preview mode', () => {
    expect(src).toContain("collectiveSupported:  true");
  });

  it('documents KORA Foundation Light constraint in comments', () => {
    expect(src).toContain("Foundation Light");
  });
});

describe('B81-B Task 4 — WorkerSpaceCapabilityService runtime', () => {
  it('getCapabilityByCompanyId returns not_enabled for unknown company', async () => {
    const { workerSpaceCapabilityService } = await import('../../services/worker-space/WorkerSpaceCapabilityService');
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('UNKNOWN-COMPANY-99999');
    expect(cap.status).toBe('NOT_ENABLED');
    expect(cap.enabled).toBe(false);
    expect(cap.pibSupported).toBe(false);
  });

  it('getCapabilityByCompanyId returns mode=preview (never pilot_ready) for known companies', async () => {
    const { workerSpaceCapabilityService } = await import('../../services/worker-space/WorkerSpaceCapabilityService');
    // Meridiana is a known synthetic company (S1 — company_id: 'meridiana-group')
    const cap = workerSpaceCapabilityService.getCapabilityByCompanyId('meridiana-group');
    expect(cap.mode).toBe('preview');
    expect(cap.mode).not.toBe('pilot_ready');
  });

  it('pibSupported is never true (per-worker PIB blocked in Foundation Light)', async () => {
    const { workerSpaceCapabilityService } = await import('../../services/worker-space/WorkerSpaceCapabilityService');
    for (const companyId of ['meridiana-spa', 'acme-demo', 'UNKNOWN-X']) {
      const cap = workerSpaceCapabilityService.getCapabilityByCompanyId(companyId);
      expect(cap.pibSupported).toBe(false);
    }
  });
});

// ── Task 5: docs/privacy-escalation-model.md ─────────────────────────────────

describe('B81-B Task 5 — privacy-escalation-model.md', () => {
  it('document exists', () => {
    expect(exists('docs/privacy-escalation-model.md')).toBe(true);
  });

  const src = read('docs/privacy-escalation-model.md');

  it('states canonical principle: KORA_ADMIN ≠ automatic access to worker PIB', () => {
    expect(src).toContain("KORA_ADMIN");
    expect(src).toContain("PIB");
  });

  it('covers COMPANY_ADMIN role', () => {
    expect(src).toContain("COMPANY_ADMIN");
  });

  it('covers KORA_ADMIN role', () => {
    expect(src).toContain("KORA_ADMIN");
  });

  it('covers Worker ownership section', () => {
    expect(src).toContain("WORKER");
    expect(src).toContain("worker_kora_id");
  });

  it('covers Privacy Escalation Role', () => {
    expect(src).toContain("Privacy Escalation");
  });

  it('lists escalation requirements', () => {
    expect(src).toContain("Audit");
    expect(src).toContain("audit");
  });

  it('covers pseudonymization boundary', () => {
    expect(src).toContain("pseudonym");
  });

  it('includes summary table', () => {
    expect(src).toContain("Individual PIB");
    expect(src).toContain("Dynamic CV");
  });

  it('states this is not implemented in Foundation Light', () => {
    expect(src).toContain("Foundation Light");
    expect(src).toContain("not implemented");
  });
});

// PRIOR HISTORY (accurate as of B81-B/MYKORA-01/B-WORKER-final-cleanup,
// preserved as a record, not verbatim given the volume): Task 6 asserted
// app/my-kora/layout.tsx delegated WorkerSessionProvider rendering to the
// anonymous/persona demo-visitor path (MyKoraDemoGate.tsx) after real
// sessions were redirected out at the layout level. Task 7 asserted
// app/my-kora/page.tsx, dynamic-cv/page.tsx, and collective/page.tsx each
// carried a "B81-B route classification" comment documenting their PREVIEW
// mode and Pilot+ migration path.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// MyKoraDemoGate.tsx, WorkerSessionProvider.tsx, and worker-context.ts are
// all deleted. app/my-kora/layout.tsx is now a trivial pass-through (no
// session check, no role branching, no provider of any kind — see its own
// header comment). Every /my-kora/** page, including the three named above,
// is now a one-line unconditional redirect() to its canonical /worker/**
// equivalent — there is no PREVIEW-mode route classification left to
// document on these files. See tests/unit/bworker-preview-runtime-retirement.test.ts
// for the regression guard proving this for all 9 routes.
describe('B81-B Task 6/7 — My KORA layout and pages are now unconditional redirects', () => {
  it('layout.tsx no longer imports or renders WorkerSessionProvider, MyKoraDemoGate, or any session logic', () => {
    const src = read('app/my-kora/layout.tsx');
    expect(src).not.toContain("WorkerSessionProvider");
    expect(src).not.toContain("MyKoraDemoGate");
    expect(src).not.toContain("PrivacyBoundaryNotice");
  });

  it('/my-kora, /my-kora/dynamic-cv, and /my-kora/collective are pure redirect() calls', () => {
    for (const rel of ['app/my-kora/page.tsx', 'app/my-kora/dynamic-cv/page.tsx', 'app/my-kora/collective/page.tsx']) {
      const src = read(rel);
      expect(src).toContain("redirect(");
      expect(src).not.toContain("B81-B route classification");
      expect(src).not.toContain("WorkerSessionProvider");
    }
  });
});

// ── Task 8: docs/worker-identity-architecture.md ─────────────────────────────

describe('B81-B Task 8 — worker-identity-architecture.md', () => {
  it('document exists', () => {
    expect(exists('docs/worker-identity-architecture.md')).toBe(true);
  });

  const src = read('docs/worker-identity-architecture.md');

  it('states Foundation Light implements preview mode only', () => {
    expect(src.toLowerCase()).toContain("preview mode only");
  });

  it('section 1 — Worker Space', () => {
    expect(src).toContain("Worker Space");
    expect(src).toContain("NOT_ENABLED");
    expect(src).toContain("ENABLED");
    expect(src).toContain("PILOT_READY");
  });

  it('section 2 — Worker KORA ID', () => {
    expect(src).toContain("Worker KORA ID");
    expect(src).toContain("WorkerKoraId");
    expect(src).toContain("portable");
  });

  it('section 3 — Worker Pseudonym ID', () => {
    expect(src).toContain("Pseudonym ID");
    expect(src).toContain("WorkerPseudonymId");
    expect(src).toContain("one-way");
  });

  it('section 4 — Worker Context', () => {
    expect(src).toContain("Worker Context");
    expect(src).toContain("getWorkerContext");
  });

  it('section 5 — Worker Session', () => {
    expect(src).toContain("Worker Session");
    expect(src).toContain("WorkerSession");
    expect(src).toContain("useWorkerSession");
  });

  it('section 6 — Preview Mode', () => {
    expect(src).toContain("Preview Mode");
    expect(src).toContain("MyKoraPreviewService");
  });

  it('section 7 — Future Live Mode', () => {
    expect(src).toContain("Future Live Mode");
    expect(src).toContain("Gate 2");
    expect(src).toContain("Gate 3");
  });

  it('section 8 — Privacy Boundary', () => {
    expect(src).toContain("Privacy Boundary");
    expect(src).toContain("privacy-escalation-model");
  });

  it('includes architecture diagram with key layers', () => {
    expect(src).toContain("Worker Space");
    expect(src).toContain("Worker Identity");
    expect(src).toContain("Worker PIB");
    expect(src).toContain("Dynamic CV");
    expect(src).toContain("My KORA");
  });

  it('includes file index', () => {
    expect(src).toContain("lib/worker-identity/types.ts");
    expect(src).toContain("worker-context.ts");
    expect(src).toContain("WorkerSessionProvider.tsx");
    expect(src).toContain("WorkerSpaceCapabilityService.ts");
  });
});

// ── Verification: no forbidden changes ───────────────────────────────────────

describe('B81-B Verification — no scoring, methodology, auth, or DB changes', () => {
  it('methodology-config/v0.1.ts is not modified (no hardcoded weights added)', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    // File exists and still exports getMacroblockWeights
    expect(src).toContain("getMacroblockWeights");
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "ScoringSimulatorService is unchanged (reads from methodology-config)."
  // CC-00 Final Scoring Canonicalization (2026-09-05) deleted this file —
  // zero real callers repo-wide, the last B-TRUTH-owned synthetic scoring
  // dependency. No methodology change: run-kora-pipeline.ts (the sole
  // authoritative scoring engine) still reads lib/methodology-config/v0.1.ts,
  // unaffected by this deletion.
  it('ScoringSimulatorService no longer exists; the live pipeline still reads methodology-config, unchanged', () => {
    expect(exists('services/scoring-simulator/ScoringSimulatorService.ts')).toBe(false);
    const src = read('lib/kora-engine/run-kora-pipeline.ts');
    expect(src).toContain('methodology');
  });

  it('ActivationSafeguardService is unchanged (no threshold changes)', () => {
    const src = read('services/activation-safeguard/ActivationSafeguardService.ts');
    expect(src).toContain("CLEAR");
    expect(src).toContain("WARNING");
    expect(src).toContain("FLAGGED");
  });

  it('no SQL DDL created by B81-B (Gate 2 still open)', () => {
    const workerIdentitySrc = read('lib/worker-identity/types.ts');
    expect(workerIdentitySrc).not.toContain("CREATE TABLE");
    expect(workerIdentitySrc).not.toContain("prisma");
    expect(workerIdentitySrc).not.toContain("supabase");
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "WorkerSessionProvider does not call Supabase (Foundation Light gate)."
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
  // WorkerSessionProvider.tsx is deleted (zero real callers) — there is no
  // longer a synthetic liveSession:null gate to check; app/worker/** routes
  // use real Supabase sessions directly, which is the correct, non-demo
  // behavior this test previously guarded against for a demo-only surface.
  it('WorkerSessionProvider.tsx no longer exists (retired with the demo runtime)', () => {
    expect(exists('app/my-kora/_providers/WorkerSessionProvider.tsx')).toBe(false);
  });

  it('no new KORA Index components added (10-component structure fixed)', () => {
    // Component codes are canonical in lib/constants/kora.ts
    const src = read('lib/constants/kora.ts');
    // Sprint 1 v2.0 component codes: NI→EVQ, VR→INT, CO→CONT, WB→EQW, EQ→EQS
    const hasCanonical10 = ['AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB', 'CS']
      .every((code) => src.includes(`'${code}'`));
    expect(hasCanonical10).toBe(true);
  });

  it('no PIB employer visibility added (worker identity files do not export employer PIB views)', () => {
    const src = read('lib/worker-identity/types.ts');
    // Types file must not contain employer_pib or expose PIB to employer
    expect(src).not.toContain("employer_pib");
    expect(src).not.toContain("employer_can_view_pib");
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim):
  // "worker-identity files do not contain live authentication logic" —
  // checked lib/worker-identity/types.ts and worker-context.ts. B-WORKER
  // "One Product / No Demo Runtime" correction (2026-09-06):
  // worker-context.ts is deleted (zero real callers). types.ts survives
  // (still used by lib/workforce/workforce-rules.ts and
  // WorkerSpaceCapabilityService.ts) and is re-checked alone.
  it('lib/worker-identity/types.ts does not contain live authentication logic', () => {
    const typesSrc = read('lib/worker-identity/types.ts');
    expect(typesSrc).not.toContain("nextauth");
    expect(typesSrc).not.toContain("auth.signIn");
    expect(typesSrc).not.toContain("createClient");
  });

  it('docs/privacy-escalation-model.md explicitly states not implemented in Foundation Light', () => {
    const src = read('docs/privacy-escalation-model.md');
    expect(src).toContain("not implemented");
    expect(src).toContain("Foundation Light");
  });

  it('worker-identity-architecture.md does not claim live workers exist', () => {
    const src = read('docs/worker-identity-architecture.md');
    // Must state preview only, not that real workers are active
    expect(src.toLowerCase()).toContain("preview mode only");
    expect(src).not.toContain("live workers are active");
    expect(src).not.toContain("production workers");
  });
});
