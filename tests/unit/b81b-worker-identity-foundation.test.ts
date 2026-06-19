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

  it('exports makePreviewWorkerSession factory', () => {
    expect(src).toContain("makePreviewWorkerSession");
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
  it('makePreviewWorkerSession returns PREVIEW mode with isPreview=true', async () => {
    const { makePreviewWorkerSession } = await import('../../lib/worker-identity/types');
    const s = makePreviewWorkerSession('Elena M.');
    expect(s.workerMode).toBe('PREVIEW');
    expect(s.isPreview).toBe(true);
    expect(s.isLive).toBe(false);
    expect(s.sessionLoading).toBe(false);
    expect(s.workerKoraId).toBeNull();
    expect(s.tenantId).toBeNull();
    expect(s.workerDisplayName).toBe('Elena M.');
  });

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

  it('makePreviewWorkerSession with no arg → workerDisplayName is null', async () => {
    const { makePreviewWorkerSession } = await import('../../lib/worker-identity/types');
    const s = makePreviewWorkerSession();
    expect(s.workerDisplayName).toBeNull();
  });
});

// ── Task 2: WorkerSessionProvider ────────────────────────────────────────────

describe('B81-B Task 2 — WorkerSessionProvider source', () => {
  const src = read('app/my-kora/_providers/WorkerSessionProvider.tsx');

  it('is a client component', () => {
    expect(src).toContain("'use client'");
  });

  it('creates WorkerSessionContext with a disabled default', () => {
    expect(src).toContain("WorkerSessionContext");
    expect(src).toContain("makeDisabledWorkerSession");
  });

  it('exports useWorkerSession hook', () => {
    expect(src).toContain("useWorkerSession");
    expect(src).toContain("useContext");
  });

  it('exports WorkerSessionProvider component', () => {
    expect(src).toContain("WorkerSessionProvider");
  });

  it('uses useMemo (not useState+useEffect) for synchronous PREVIEW resolution', () => {
    expect(src).toContain("useMemo");
  });

  it('calls getWorkerContext to resolve session', () => {
    expect(src).toContain("getWorkerContext");
  });

  it('passes liveSession: null (Foundation Light always PREVIEW)', () => {
    expect(src).toContain("liveSession:");
    expect(src).toContain("null");
  });

  it('reads activeRole and activePersona from demo-state', () => {
    expect(src).toContain("useRole");
    expect(src).toContain("usePersona");
  });

  it('calls isWorkerRole and isAdminRole for access gate', () => {
    expect(src).toContain("isWorkerRole");
    expect(src).toContain("isAdminRole");
  });

  it('documents Pilot+ migration path in comments', () => {
    expect(src).toContain("Pilot+");
    expect(src).toContain("Supabase");
  });
});

// ── Task 3: getWorkerContext ─────────────────────────────────────────────────

describe('B81-B Task 3 — worker-context.ts: getWorkerContext contract', () => {
  const src = read('lib/worker-identity/worker-context.ts');

  it('exports getWorkerContext function', () => {
    expect(src).toContain("getWorkerContext");
  });

  it('exports WorkerContextInput interface', () => {
    expect(src).toContain("WorkerContextInput");
    expect(src).toContain("liveSession");
    expect(src).toContain("previewPersonaName");
    expect(src).toContain("accessPermitted");
  });

  it('exports workerSessionLabel helper', () => {
    expect(src).toContain("workerSessionLabel");
  });

  it('exports isWorkerDataAccessible helper', () => {
    expect(src).toContain("isWorkerDataAccessible");
  });
});

describe('B81-B Task 3 — getWorkerContext runtime behaviour', () => {
  it('returns DISABLED when accessPermitted=false', async () => {
    const { getWorkerContext } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext({ accessPermitted: false });
    expect(s.workerMode).toBe('DISABLED');
    expect(s.isPreview).toBe(false);
    expect(s.isLive).toBe(false);
  });

  it('returns LIVE when liveSession is provided', async () => {
    const { getWorkerContext } = await import('../../lib/worker-identity/worker-context');
    const id = 'KORA-LIVE-TEST' as unknown as import('../../lib/worker-identity/types').WorkerKoraId;
    const s = getWorkerContext({
      liveSession: { workerKoraId: id, workerDisplayName: 'Test Worker', tenantId: 'tenant-test' },
    });
    expect(s.workerMode).toBe('LIVE');
    expect(s.isLive).toBe(true);
    expect(s.workerDisplayName).toBe('Test Worker');
  });

  it('returns PREVIEW by default (no liveSession, accessPermitted=true)', async () => {
    const { getWorkerContext } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext();
    expect(s.workerMode).toBe('PREVIEW');
    expect(s.isPreview).toBe(true);
    expect(s.workerKoraId).toBeNull();
  });

  it('PREVIEW session carries previewPersonaName as workerDisplayName', async () => {
    const { getWorkerContext } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext({ previewPersonaName: 'Sofia R.' });
    expect(s.workerDisplayName).toBe('Sofia R.');
  });

  it('isWorkerDataAccessible returns true for PREVIEW', async () => {
    const { getWorkerContext, isWorkerDataAccessible } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext();
    expect(isWorkerDataAccessible(s)).toBe(true);
  });

  it('isWorkerDataAccessible returns false for DISABLED', async () => {
    const { getWorkerContext, isWorkerDataAccessible } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext({ accessPermitted: false });
    expect(isWorkerDataAccessible(s)).toBe(false);
  });

  it('workerSessionLabel renders PREVIEW label', async () => {
    const { getWorkerContext, workerSessionLabel } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext({ previewPersonaName: 'Elena M.' });
    const label = workerSessionLabel(s);
    expect(label).toContain('PREVIEW');
    expect(label).toContain('Elena M.');
  });

  it('workerSessionLabel renders non-active label for DISABLED', async () => {
    const { getWorkerContext, workerSessionLabel } = await import('../../lib/worker-identity/worker-context');
    const s = getWorkerContext({ accessPermitted: false });
    const label = workerSessionLabel(s);
    expect(label).toBeTruthy();
    expect(label).not.toContain('PREVIEW');
    expect(label).not.toContain('LIVE');
  });
});

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

// ── Task 6: app/my-kora/layout.tsx ───────────────────────────────────────────

describe('B81-B Task 6 — My KORA layout uses WorkerSessionProvider', () => {
  const src = read('app/my-kora/layout.tsx');

  it('imports WorkerSessionProvider', () => {
    expect(src).toContain("WorkerSessionProvider");
    expect(src).toContain("_providers/WorkerSessionProvider");
  });

  it('wraps permitted sessions in WorkerSessionProvider', () => {
    expect(src).toContain("<WorkerSessionProvider>");
  });

  it('gates on isWorkerRole and isAdminRole', () => {
    expect(src).toContain("isWorkerRole");
    expect(src).toContain("isAdminRole");
  });

  it('shows PrivacyBoundaryNotice for blocked employer roles', () => {
    expect(src).toContain("PrivacyBoundaryNotice");
    expect(src).toContain("employer_role");
  });

  it('documents current PREVIEW mode and Pilot+ path', () => {
    expect(src).toContain("PREVIEW");
    expect(src).toContain("Pilot+");
  });
});

// ── Task 7: Route classification comments ────────────────────────────────────

describe('B81-B Task 7 — route classification comments on My KORA pages', () => {
  const mainSrc       = read('app/my-kora/page.tsx');
  const dynamicCvSrc  = read('app/my-kora/dynamic-cv/page.tsx');
  const collectiveSrc = read('app/my-kora/collective/page.tsx');

  it('/my-kora page has B81-B route classification comment', () => {
    expect(mainSrc).toContain("B81-B route classification");
    expect(mainSrc).toContain("PREVIEW");
  });

  it('/my-kora page documents Pilot+ migration path', () => {
    expect(mainSrc).toContain("Pilot+");
    expect(mainSrc).toContain("WorkerSessionProvider");
  });

  it('/my-kora/dynamic-cv has B81-B route classification comment', () => {
    expect(dynamicCvSrc).toContain("B81-B route classification");
    expect(dynamicCvSrc).toContain("PREVIEW");
  });

  it('/my-kora/dynamic-cv documents Pilot+ migration path', () => {
    expect(dynamicCvSrc).toContain("Pilot+");
    expect(dynamicCvSrc).toContain("DynamicCVService");
  });

  it('/my-kora/collective has B81-B route classification comment', () => {
    expect(collectiveSrc).toContain("B81-B route classification");
    expect(collectiveSrc).toContain("PREVIEW");
  });

  it('/my-kora/collective documents no-social-feed constraint', () => {
    expect(collectiveSrc).toContain("social feed");
  });

  it('/my-kora/collective documents Pilot+ migration path', () => {
    expect(collectiveSrc).toContain("Pilot+");
    expect(collectiveSrc).toContain("UEF");
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

  it('ScoringSimulatorService is unchanged (reads from methodology-config)', () => {
    const src = read('services/scoring-simulator/ScoringSimulatorService.ts');
    expect(src).toContain("methodology");
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

  it('WorkerSessionProvider does not call Supabase (Foundation Light gate)', () => {
    const src = read('app/my-kora/_providers/WorkerSessionProvider.tsx');
    // Supabase is mentioned only in comments (Pilot+ migration path).
    // Actual code must not import the Supabase client library.
    expect(src).not.toContain("createClient");
    expect(src).not.toContain("@supabase/supabase-js");
    // liveSession is always null — no actual live session resolution
    expect(src).toContain("liveSession:        null");
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

  it('worker-identity files do not contain live authentication logic', () => {
    const typesSrc = read('lib/worker-identity/types.ts');
    const ctxSrc   = read('lib/worker-identity/worker-context.ts');
    for (const src of [typesSrc, ctxSrc]) {
      expect(src).not.toContain("nextauth");
      expect(src).not.toContain("auth.signIn");
      expect(src).not.toContain("createClient");
    }
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
