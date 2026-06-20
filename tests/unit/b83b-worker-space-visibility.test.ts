import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B83-B — Worker Space Product Visibility ───────────────────────────────────
//
// Task 1: WorkerSpaceCapabilityService consumed in company cockpit
// Task 2: WorkerAdoptionPanel created and rendered in workspace
// Task 3: WorkerPillarAdoptionService created with N≥10 suppression
// Task 4: Profile page points to workspace (no detailed duplicate stats)
// Task 5: PREVIEW BoundaryBadge on workspace
// Task 6: Educational block in WorkerAdoptionPanel
// Task 7: This test file
//
// Invariants:
// - no worker auth, no invitations, no onboarding, no PIB, no KORA Link
// - no DB changes, no auth changes
// - employer_can_view_individual_pib = false enforced

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── Task 1: WorkerSpaceCapabilityService in cockpit ───────────────────────────
// B133: app/company/page.tsx was converted from demo cockpit to live nav hub.
// WorkerAdoptionPanel and workerSpaceCapabilityService remain as standalone
// components/services but are no longer wired into the live cockpit page.

describe('B83-B Task 1 — WorkerSpaceCapabilityService (B133: cockpit is now live nav hub)', () => {
  const cockpit = read('app/company/page.tsx');

  it('B133: cockpit no longer imports workerSpaceCapabilityService (demo content removed)', () => {
    expect(cockpit).not.toContain('workerSpaceCapabilityService');
  });

  it('B133: cockpit no longer calls getCapabilityByCompanyId (demo content removed)', () => {
    expect(cockpit).not.toContain('getCapabilityByCompanyId');
  });

  it('B133: cockpit no longer renders WorkerAdoptionPanel (demo content removed)', () => {
    expect(cockpit).not.toContain('WorkerAdoptionPanel');
  });

  it('B133: cockpit no longer has scenarioId demo binding', () => {
    expect(cockpit).not.toContain('scenarioId={activeScenario}');
  });

  it('B133: cockpit uses useCompanySession for live session guard', () => {
    expect(cockpit).toContain('useCompanySession');
  });

  it('cockpit has /company/workspace as nav item', () => {
    expect(cockpit).toContain('/company/workspace');
  });
});

// ── Task 2: WorkerAdoptionPanel exists and is complete ────────────────────────

describe('B83-B Task 2 — WorkerAdoptionPanel created', () => {
  const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');

  it('panel file exists', () => {
    expect(exists('components/company/cockpit/WorkerAdoptionPanel.tsx')).toBe(true);
  });

  it('imports workerSpaceCapabilityService', () => {
    expect(panel).toContain('workerSpaceCapabilityService');
  });

  it('imports workerProvisioningService', () => {
    expect(panel).toContain('workerProvisioningService');
  });

  it('imports workerPillarAdoptionService', () => {
    expect(panel).toContain('workerPillarAdoptionService');
  });

  it('shows roster count tile', () => {
    expect(panel).toContain('Lavoratori nel roster');
  });

  it('shows My KORA enabled count tile', () => {
    expect(panel).toContain('My KORA abilitati');
  });

  it('shows active accounts tile', () => {
    expect(panel).toContain('Account attivi');
  });

  it('shows worker space status tile', () => {
    expect(panel).toContain('Stato Worker Space');
  });
});

// B105 update: WorkerAdoptionPanel and FL_COMPANY_ID removed from live workspace.
// B133 update: WorkerAdoptionPanel also removed from demo cockpit (company/page.tsx).
// company/page.tsx is now a live nav hub — WorkerAdoptionPanel exists as standalone component.
describe('B83-B Task 2 — WorkerAdoptionPanel rendered in workspace', () => {
  const workspace = read('app/company/workspace/_components/CompanyWorkspaceView.tsx');

  it('workspace live binding uses tenant from session (not FL_COMPANY_ID)', () => {
    // B105: FL_COMPANY_ID removed — live workspace must not have demo hardcoded company
    expect(workspace).not.toContain('FL_COMPANY_ID');
    expect(workspace).not.toContain('meridiana-group');
  });

  it('B133: cockpit (company/page.tsx) no longer has WorkerAdoptionPanel (demo cockpit removed)', () => {
    const cockpit = read('app/company/page.tsx');
    expect(cockpit).not.toContain('WorkerAdoptionPanel');
    expect(cockpit).not.toContain('companyId={companyId}');
  });
});

// ── Task 3: WorkerPillarAdoptionService with N≥10 suppression ─────────────────

describe('B83-B Task 3 — WorkerPillarAdoptionService', () => {
  const svc = read('services/worker-pillar-adoption/WorkerPillarAdoptionService.ts');

  it('service file exists', () => {
    expect(exists('services/worker-pillar-adoption/WorkerPillarAdoptionService.ts')).toBe(true);
  });

  it('reads from company-aggregates.json', () => {
    expect(svc).toContain('company-aggregates.json');
  });

  it('defines N≥10 safe threshold', () => {
    expect(svc).toContain('SAFE_THRESHOLD');
    expect(svc).toContain('10');
  });

  it('checks privacy_threshold_met', () => {
    expect(svc).toContain('privacy_threshold_met');
  });

  it('returns suppressed result when threshold not met', () => {
    expect(svc).toContain('suppressed: true');
  });

  it('returns data when threshold met', () => {
    expect(svc).toContain('suppressed: false');
  });

  it('exports workerPillarAdoptionService singleton', () => {
    expect(svc).toContain('export const workerPillarAdoptionService');
  });

  it('covers all 5 pillars', () => {
    expect(svc).toContain('LIFE');
    expect(svc).toContain('GROWTH');
    expect(svc).toContain('CONNECTION');
    expect(svc).toContain('IMPACT');
    expect(svc).toContain('LEGACY');
  });

  it('does not resolve individual workers', () => {
    expect(svc).not.toContain('worker_id');
    expect(svc).not.toContain('display_name');
    expect(svc).not.toContain('PIB');
  });
});

// ── Task 4: Profile page cleanup ─────────────────────────────────────────────

describe('B83-B Task 4 — Profile page cleaned up', () => {
  const profile = read('app/company/profile/page.tsx');

  it('no longer has 3 big stat tiles in Worker & My KORA section', () => {
    // Old 3-tile grid with My KORA abilitati, PIB privato, Lavoratori in roster as big numbers
    expect(profile).not.toContain("label: 'My KORA abilitati'");
    expect(profile).not.toContain("label: 'PIB privato'");
  });

  it('has a link to /company/workspace', () => {
    expect(profile).toContain('/company/workspace');
  });

  it('B133: profile shows live tenant data from session (not synthetic worker counts)', () => {
    // B133 removed synthetic demo data — profile now shows companyName/tenantId/koraRole from session
    expect(profile).not.toContain('my_kora_enabled_count');
    expect(profile).not.toContain('total_workers');
    expect(profile).toContain('useCompanySession');
  });
});

// ── Task 5: PREVIEW BoundaryBadge ────────────────────────────────────────────

describe('B83-B Task 5 — PREVIEW BoundaryBadge on Worker Space surfaces', () => {
  const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');

  it('panel imports BoundaryBadge', () => {
    expect(panel).toContain('BoundaryBadge');
  });

  it('panel renders PREVIEW mode badge', () => {
    expect(panel).toContain('mode="PREVIEW"');
  });

  it('panel explains Foundation Light preview context', () => {
    expect(panel).toContain('Foundation Light');
    expect(panel).toContain('preview');
  });
});

// ── Task 6: Educational block ─────────────────────────────────────────────────

describe('B83-B Task 6 — Educational block in WorkerAdoptionPanel', () => {
  const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');

  it('has "Che cos\'è My KORA?" heading', () => {
    expect(panel).toContain('Che cos');
    expect(panel).toContain('My KORA');
  });

  it('explains company → worker space → PIB chain', () => {
    expect(panel).toContain('PIB');
    expect(panel).toContain('KORA Index');
  });

  it('mentions privacy (PIB is private to worker)', () => {
    expect(panel).toContain('privato');
  });

  it('explains Dynamic CV', () => {
    expect(panel).toContain('Dynamic');
  });
});

// ── Privacy invariants ────────────────────────────────────────────────────────

describe('B83-B privacy invariants — employer cannot see individual data', () => {
  it('WorkerAdoptionPanel never imports workers.json directly', () => {
    const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');
    expect(panel).not.toContain('workers.json');
    expect(panel).not.toContain('pib-records');
    expect(panel).not.toContain('dynamic-cv-items');
  });

  it('WorkerPillarAdoptionService never exposes worker_id', () => {
    const svc = read('services/worker-pillar-adoption/WorkerPillarAdoptionService.ts');
    expect(svc).not.toContain('worker_id');
  });

  it('WorkerAdoptionPanel does not surface individual PIB', () => {
    const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');
    expect(panel).not.toContain('pibSupported: true');
    // employer_can_view_individual_pib appears only in the privacy constraint comment — not as a data accessor
    expect(panel).not.toContain('.pib_private_enabled_count');
  });
});

// ── Invariants: no forbidden changes ─────────────────────────────────────────

describe('B83-B invariants — no auth, no onboarding, no DB, no invitations', () => {
  it('WorkerAdoptionPanel contains no auth logic', () => {
    const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');
    expect(panel).not.toContain('supabase');
    expect(panel).not.toContain('createClient');
    expect(panel).not.toContain('signIn');
    // 'sessioni' (Italian for sessions) is allowed as descriptive copy; 'workerSession' or 'authSession' would not be
    expect(panel).not.toContain('authSession');
    expect(panel).not.toContain('workerSession');
    expect(panel).not.toContain('requireCompanyUser');
  });

  it('WorkerPillarAdoptionService contains no DB calls', () => {
    const svc = read('services/worker-pillar-adoption/WorkerPillarAdoptionService.ts');
    expect(svc).not.toContain('supabase');
    expect(svc).not.toContain('prisma');
    expect(svc).not.toContain('CREATE TABLE');
  });

  it('cockpit does not hardcode methodology weights', () => {
    const cockpit = read('app/company/page.tsx');
    expect(cockpit).not.toContain('0.10 *');
    expect(cockpit).not.toContain('weight: 0.1');
  });

  it('no KORA Link or NFC in any new file', () => {
    const panel = read('components/company/cockpit/WorkerAdoptionPanel.tsx');
    expect(panel).not.toContain('NFC');
    expect(panel).not.toContain('KoraLink');
    expect(panel).not.toContain('kora-link');
  });

  it('methodology config unchanged', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain('getMacroblockWeights');
  });

  it('KORA Index still has 10 components', () => {
    const src = read('lib/constants/kora.ts');
    // Sprint 1 v2.0: NI→EVQ, VR→INT, CO→CONT, WB→EQW, EQ→EQS
    expect(src).toContain("KORA_INDEX_COMPONENTS = ['AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB', 'CS']");
  });
});
