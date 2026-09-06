// tests/unit/b141b-my-kora-pib-ia-and-admin-access.test.ts
// B141-B — My KORA PIB IA correction + KORA_ADMIN access fix.
// B141-B2 — Founder-safe worker preview navigation polish.
// B141-C/D/F — PIB visual layout correction, WorkerActivationSignatureCard.
//
// PRIOR HISTORY (accurate as of B141-B/C/D/F, preserved as a record, not
// verbatim given the volume): sections 1–16 and 27–49 of this file tested
// app/my-kora/personal-impact-balance/page.tsx's content (PIB heading,
// KoraActivationSignature, KORA Link card, WorkerActivationSignatureCard
// premium card, unified signature object), app/my-kora/page.tsx's lightened
// home content, and app/my-kora/layout.tsx's real-session admission table
// (via app/my-kora/_providers/MyKoraDemoGate.tsx for the demo-visitor path).
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// app/my-kora/personal-impact-balance/page.tsx and app/my-kora/page.tsx are
// now pure, unconditional redirect()s to their canonical /worker/**
// equivalents. app/my-kora/layout.tsx performs no admission decision at
// all. MyKoraDemoGate.tsx, KoraActivationSignature.tsx, and
// WorkerActivationSignatureCard.tsx are all deleted (zero real callers,
// verified fresh before deletion). Sections 17–18, 19–22, and 23–26 below
// test genuinely unrelated surfaces (middleware.ts, kora-session.ts,
// Sidebar.tsx nav links to canonical /worker routes, /worker/layout.tsx's
// KORA_ADMIN hard block) and are preserved unchanged. See
// lib/architecture/registry.ts svc.my-kora-preview and
// tests/unit/bworker-preview-runtime-retirement.test.ts for the regression
// guard proving the retirement.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

const layoutSrc     = read('app/my-kora/layout.tsx');
const middlewareSrc = read('middleware.ts');
const sessionSrc    = read('lib/auth/kora-session.ts');
const sidebarSrc    = read('components/layout/Sidebar.tsx');
const workerLayout  = read('app/worker/layout.tsx');

describe('B141-B/B-WORKER — retired PIB/home/layout admission content', () => {
  it('my-kora personal-impact-balance and home pages are now pure canonical redirects', () => {
    expect(read('app/my-kora/personal-impact-balance/page.tsx')).toContain("redirect('/worker/personal-impact-balance')");
    expect(read('app/my-kora/page.tsx')).toContain("redirect('/worker/workspace')");
  });

  it('layout.tsx performs no admission decision; MyKoraDemoGate and WorkerActivationSignatureCard no longer exist', () => {
    expect(layoutSrc).not.toContain('getSessionKoraRole');
    expect(layoutSrc).not.toContain('realRole');
    expect(layoutSrc).not.toContain('MyKoraDemoGate');
    expect(() => read('app/my-kora/_providers/MyKoraDemoGate.tsx')).toThrow();
    expect(() => read('components/my-kora/WorkerActivationSignatureCard.tsx')).toThrow();
    expect(() => read('components/my-kora/KoraActivationSignature.tsx')).toThrow();
  });
});

// ── 17–18: middleware unchanged / existing WORKER guard preserved (unaffected) ──
// MYKORA-01 added getSessionKoraRole() to kora-session.ts (additive only) —
// these assertions confirm the pre-existing requireWorkerUser() guard logic
// was not weakened or removed by that addition. Unaffected by the B-WORKER
// preview-runtime retirement above.

describe('B141-B — middleware.ts unchanged, kora-session.ts WORKER guard preserved', () => {
  it('17. middleware.ts has no KORA_ADMIN redirect rule (unchanged)', () => {
    expect(middlewareSrc).not.toContain("'KORA_ADMIN' redirect");
  });

  it('18. kora-session.ts requireWorkerUser() still blocks non-WORKER roles', () => {
    expect(sessionSrc).toContain('requireWorkerUser');
    expect(sessionSrc).toContain("!== 'WORKER'");
  });
});

// ── 19–22: B141-B2 — Sidebar KORA_ADMIN nav polish (unaffected) ─────────────

describe('B141-B2 — Sidebar KORA_ADMIN has Worker Preview links', () => {
  const adminNavStart = sidebarSrc.indexOf("if (isAdminRole(role");
  const adminNavSection = adminNavStart > -1
    ? sidebarSrc.substring(adminNavStart, adminNavStart + 3500)
    : sidebarSrc;

  it('19. KORA_ADMIN sidebar Worker Preview no longer links to /my-kora — repointed to the admin preview hub', () => {
    expect(adminNavSection).toContain("isAdminPreview ? '/admin/preview/worker' : '/worker/workspace'");
  });

  it('20. KORA_ADMIN sidebar contains link to canonical /worker/personal-impact-balance', () => {
    expect(adminNavSection).toContain('/worker/personal-impact-balance');
    expect(adminNavSection).not.toContain('/my-kora/personal-impact-balance');
  });

  it('21. COMPANY_ADMIN sidebar nav does not contain Personal Impact Balance link', () => {
    const companyNavStart = sidebarSrc.indexOf("role === 'COMPANY_ADMIN'");
    const workerNavStart  = sidebarSrc.indexOf('if (isWorkerRole(role');
    const companyNavEnd   = workerNavStart > companyNavStart ? workerNavStart : companyNavStart + 1500;
    const companyNavSection = companyNavStart > -1
      ? sidebarSrc.substring(companyNavStart, companyNavEnd)
      : '';
    expect(companyNavSection).not.toContain('Personal Impact Balance');
  });

  it('22. PARTNER sidebar nav does not contain Personal Impact Balance link', () => {
    const partnerNavStart = sidebarSrc.indexOf("role === 'PARTNER'");
    const partnerNavSection = partnerNavStart > -1
      ? sidebarSrc.substring(partnerNavStart, partnerNavStart + 800)
      : '';
    expect(partnerNavSection).not.toContain('Personal Impact Balance');
  });
});

// ── 23–26: B141-B2 — /worker/* safe redirect for KORA_ADMIN (unaffected) ────

describe('B141-B2 — /worker/layout.tsx KORA_ADMIN hard block (B168-P3)', () => {
  it('23. worker layout imports getCurrentKoraUser for admin detection', () => {
    expect(workerLayout).toContain('getCurrentKoraUser');
  });

  it('24. worker layout hard-blocks KORA_ADMIN with explicit error (not redirect to /my-kora)', () => {
    expect(workerLayout).toContain('Worker individual data is not accessible to KORA service team by design');
    expect(workerLayout).not.toContain("redirect('/my-kora')");
  });

  it('25. worker layout still calls getCurrentWorkerUser (WORKER gate unchanged)', () => {
    expect(workerLayout).toContain('getCurrentWorkerUser');
  });

  it('26. requireWorkerUser() in kora-session.ts not modified (still blocks non-WORKER)', () => {
    expect(sessionSrc).toContain('requireWorkerUser');
    expect(sessionSrc).toContain("koraRole !== 'WORKER'");
    expect(sessionSrc).toContain('Forbidden — WORKER role required');
  });
});
