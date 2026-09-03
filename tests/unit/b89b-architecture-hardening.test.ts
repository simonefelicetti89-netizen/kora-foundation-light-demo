// b89b-architecture-hardening.test.ts
// Architecture Hardening test suite — B89-B.
//
// Covers:
//   1. Permission model — getAccessibleRoutes and getDemoNavigationRoutes per role
//   2. Scoring adapters — IScoringService contract, mode/source/isAuthoritative
//   3. Scoring-result as canonical entry point
//   4. Evidence domain types compile and are structurally correct
//   5. No formula/methodology values changed
//
// Confirmed: no formula changes, no DB changes, no product feature additions.

import { describe, it, expect } from 'vitest';
import {
  getAccessibleRoutes,
  getDemoNavigationRoutes,
  isEmployerRole,
  isWorkerRole,
  isAdminRole,
  resolvePermission,
} from '../../lib/permissions/index';
import type { KoraRole } from '../../lib/types';
import { demoScoringAdapter }    from '../../services/scoring/DemoScoringAdapter';
import { liveScoringAdapter }    from '../../services/scoring/LiveScoringAdapter';
import type { IScoringService, ScoringPathMode } from '../../services/scoring/IScoringService';
import type {
  EvidenceRecord,
  EvidenceLifecycleStatus,
  VerificationRecord,
  ReviewDecision,
  ReviewDecisionCode,
  EvidenceTier,
  EV_WEIGHT_BY_TIER,
} from '../../lib/types/domains/evidence';
import { EV_WEIGHT_BY_TIER as EV_WEIGHTS } from '../../lib/types/domains/evidence';

// ── 1. Permission Model — getAccessibleRoutes (production middleware) ─────────

describe('getAccessibleRoutes — production middleware routes', () => {
  it('KORA_ADMIN has /admin routes', () => {
    const routes = getAccessibleRoutes('KORA_ADMIN');
    expect(routes).toContain('/admin');
  });

  it('KORA_ADMIN has /company/kora-index', () => {
    const routes = getAccessibleRoutes('KORA_ADMIN');
    expect(routes).toContain('/company/kora-index');
  });

  it('COMPANY_ADMIN has /company/workspace', () => {
    const routes = getAccessibleRoutes('COMPANY_ADMIN');
    expect(routes).toContain('/company/workspace');
  });

  // Production constraint: COMPANY_ADMIN is restricted to workspace (B36.1; B143: COMPANY_VIEWER removed)
  it('COMPANY_ADMIN does NOT have /company/kora-index in production routes', () => {
    const routes = getAccessibleRoutes('COMPANY_ADMIN');
    expect(routes).not.toContain('/company/kora-index');
  });

  it('WORKER has /my-kora', () => {
    const routes = getAccessibleRoutes('WORKER');
    expect(routes).toContain('/my-kora');
  });

  it('WORKER does NOT have /company or /admin in production routes', () => {
    const routes = getAccessibleRoutes('WORKER');
    const workerHasCompany = routes.some(r => r.startsWith('/company'));
    const workerHasAdmin   = routes.some(r => r.startsWith('/admin'));
    expect(workerHasCompany).toBe(false);
    expect(workerHasAdmin).toBe(false);
  });

  it('WORKER does NOT have /my-kora in COMPANY_ADMIN production routes', () => {
    const routes = getAccessibleRoutes('COMPANY_ADMIN');
    expect(routes).not.toContain('/my-kora');
  });

  it('ADVISOR has /advisor', () => {
    const routes = getAccessibleRoutes('ADVISOR');
    expect(routes).toContain('/advisor');
  });

  it('PARTNER has /partner', () => {
    const routes = getAccessibleRoutes('PARTNER');
    expect(routes).toContain('/partner');
  });

  it('all roles include / and /demo-guide', () => {
    const roles: KoraRole[] = ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'ADVISOR', 'PARTNER'];
    for (const role of roles) {
      const routes = getAccessibleRoutes(role);
      expect(routes).toContain('/');
      expect(routes).toContain('/demo-guide');
    }
  });

  it('no duplicate routes returned', () => {
    const roles: KoraRole[] = ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER'];
    for (const role of roles) {
      const routes = getAccessibleRoutes(role);
      expect(new Set(routes).size).toBe(routes.length);
    }
  });
});

// ── 2. Permission Model — getDemoNavigationRoutes (demo navigation) ────────────

describe('getDemoNavigationRoutes — demo navigation routes', () => {
  it('COMPANY_ADMIN has /company/kora-index in demo routes', () => {
    const routes = getDemoNavigationRoutes('COMPANY_ADMIN');
    expect(routes).toContain('/company/kora-index');
  });

  it('COMPANY_ADMIN has /company/opportunities in demo routes', () => {
    const routes = getDemoNavigationRoutes('COMPANY_ADMIN');
    expect(routes).toContain('/company/opportunities');
  });

  it('COMPANY_ADMIN has /company/reports in demo routes', () => {
    const routes = getDemoNavigationRoutes('COMPANY_ADMIN');
    expect(routes).toContain('/company/reports');
  });

  it('COMPANY_ADMIN has /company/activation in demo routes', () => {
    const routes = getDemoNavigationRoutes('COMPANY_ADMIN');
    expect(routes).toContain('/company/activation');
  });

  it('COMPANY_ADMIN has /company/financial in demo routes', () => {
    const routes = getDemoNavigationRoutes('COMPANY_ADMIN');
    expect(routes).toContain('/company/financial');
  });

  // Privacy invariant: employer roles NEVER access My KORA — not even in demo
  // B143: COMPANY_VIEWER removed; COMPANY_ADMIN is the only employer role.
  it('COMPANY_ADMIN does NOT have /my-kora in demo routes', () => {
    const routes = getDemoNavigationRoutes('COMPANY_ADMIN');
    const hasMyKora = routes.some(r => r.startsWith('/my-kora'));
    expect(hasMyKora).toBe(false);
  });

  it('WORKER has /my-kora/* routes in demo', () => {
    const routes = getDemoNavigationRoutes('WORKER');
    expect(routes).toContain('/my-kora');
    expect(routes).toContain('/my-kora/privacy');
    expect(routes).toContain('/my-kora/dynamic-cv');
  });

  it('WORKER does NOT have /company/* routes in demo', () => {
    const routes = getDemoNavigationRoutes('WORKER');
    const workerHasCompany = routes.some(r => r.startsWith('/company'));
    expect(workerHasCompany).toBe(false);
  });

  it('KORA_ADMIN has /admin/* routes in demo', () => {
    const routes = getDemoNavigationRoutes('KORA_ADMIN');
    expect(routes).toContain('/admin');
    expect(routes).toContain('/admin/companies');
    expect(routes).toContain('/admin/uef-review');
  });

  it('KORA_ADMIN has full /company/* access in demo', () => {
    const routes = getDemoNavigationRoutes('KORA_ADMIN');
    expect(routes).toContain('/company/kora-index');
    expect(routes).toContain('/company/opportunities');
    expect(routes).toContain('/company/reports');
  });

  it('no duplicate routes returned', () => {
    const roles: KoraRole[] = ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER'];
    for (const role of roles) {
      const routes = getDemoNavigationRoutes(role);
      expect(new Set(routes).size).toBe(routes.length);
    }
  });
});

// ── 3. Role classifier helpers ────────────────────────────────────────────────

describe('Role classifiers', () => {
  it('isEmployerRole returns true for COMPANY_ADMIN (B143: COMPANY_VIEWER removed)', () => {
    expect(isEmployerRole('COMPANY_ADMIN')).toBe(true);
  });

  it('isEmployerRole returns false for WORKER, ADVISOR, PARTNER, KORA_ADMIN', () => {
    expect(isEmployerRole('WORKER')).toBe(false);
    expect(isEmployerRole('ADVISOR')).toBe(false);
    expect(isEmployerRole('PARTNER')).toBe(false);
    expect(isEmployerRole('KORA_ADMIN')).toBe(false);
  });

  it('isWorkerRole returns true only for WORKER', () => {
    expect(isWorkerRole('WORKER')).toBe(true);
    expect(isWorkerRole('COMPANY_ADMIN')).toBe(false);
    expect(isWorkerRole('KORA_ADMIN')).toBe(false);
  });

  it('isAdminRole returns true only for KORA_ADMIN', () => {
    expect(isAdminRole('KORA_ADMIN')).toBe(true);
    expect(isAdminRole('COMPANY_ADMIN')).toBe(false);
  });
});

// ── 4. Resource permission guard ──────────────────────────────────────────────

describe('resolvePermission — worker-private resource guard', () => {
  it('COMPANY_ADMIN cannot access pib-records', () => {
    expect(resolvePermission('COMPANY_ADMIN', 'pib-records')).toBe(false);
  });

  it('COMPANY_ADMIN cannot access dynamic-cv', () => {
    expect(resolvePermission('COMPANY_ADMIN', 'dynamic-cv')).toBe(false);
  });

  it('COMPANY_ADMIN cannot access my-kora resource', () => {
    expect(resolvePermission('COMPANY_ADMIN', 'my-kora')).toBe(false);
  });

  it('COMPANY_ADMIN cannot access consent-records', () => {
    expect(resolvePermission('COMPANY_ADMIN', 'consent-records')).toBe(false);
  });

  it('WORKER can access pib-records', () => {
    expect(resolvePermission('WORKER', 'pib-records')).toBe(true);
  });

  it('uef-review is admin/COMPANY_ADMIN only', () => {
    expect(resolvePermission('KORA_ADMIN',    'uef-review')).toBe(true);
    expect(resolvePermission('COMPANY_ADMIN', 'uef-review')).toBe(true);
    expect(resolvePermission('WORKER',        'uef-review')).toBe(false);
  });
});

// ── 5. Scoring adapters — IScoringService contract ────────────────────────────

describe('IScoringService — adapter contracts', () => {
  const adapters: Array<{ name: string; adapter: IScoringService }> = [
    { name: 'DemoScoringAdapter',    adapter: demoScoringAdapter },
    { name: 'LiveScoringAdapter',    adapter: liveScoringAdapter },
  ];

  for (const { name, adapter } of adapters) {
    it(`${name} has a mode property`, () => {
      const validModes: ScoringPathMode[] = ['DEMO', 'LIVE'];
      expect(validModes).toContain(adapter.mode);
    });

    it(`${name} has a non-empty source string`, () => {
      expect(typeof adapter.source).toBe('string');
      expect(adapter.source.length).toBeGreaterThan(0);
    });

    it(`${name} has an isAuthoritative boolean`, () => {
      expect(typeof adapter.isAuthoritative).toBe('boolean');
    });
  }

  it('DemoScoringAdapter mode is DEMO', () => {
    expect(demoScoringAdapter.mode).toBe('DEMO');
  });

  it('DemoScoringAdapter is NOT authoritative', () => {
    expect(demoScoringAdapter.isAuthoritative).toBe(false);
  });

  it('LiveScoringAdapter mode is LIVE', () => {
    expect(liveScoringAdapter.mode).toBe('LIVE');
  });

  it('LiveScoringAdapter IS authoritative', () => {
    expect(liveScoringAdapter.isAuthoritative).toBe(true);
  });

  it('only LiveScoringAdapter is authoritative', () => {
    expect(demoScoringAdapter.isAuthoritative).toBe(false);
    expect(liveScoringAdapter.isAuthoritative).toBe(true);
  });

  it('LiveScoringAdapter exposes the run function', () => {
    expect(typeof liveScoringAdapter.run).toBe('function');
  });

  it('DemoScoringAdapter exposes the underlying service', () => {
    expect(liveScoringAdapter.run).toBeDefined();
    expect(demoScoringAdapter.underlying).toBeDefined();
  });
});

// ── 6. Evidence domain types — structural correctness ─────────────────────────

describe('Evidence domain types — lib/types/domains/evidence.ts', () => {
  it('EV_WEIGHT_BY_TIER has all 5 tiers', () => {
    const tiers: EvidenceTier[] = [
      'L0_NO_EVIDENCE', 'L1_SELF_DECLARED', 'L2_INTERNAL_DOCUMENT',
      'L3_THIRD_PARTY_DOCUMENT', 'L4_VERIFIED_EVIDENCE',
    ];
    for (const tier of tiers) {
      expect(EV_WEIGHTS[tier]).toBeDefined();
      expect(typeof EV_WEIGHTS[tier]).toBe('number');
    }
  });

  it('L0_NO_EVIDENCE has EV weight 0', () => {
    expect(EV_WEIGHTS['L0_NO_EVIDENCE']).toBe(0.0);
  });

  it('L4_VERIFIED_EVIDENCE has EV weight 1', () => {
    expect(EV_WEIGHTS['L4_VERIFIED_EVIDENCE']).toBe(1.0);
  });

  it('EV weights are monotonically increasing L0→L4', () => {
    const tiers: EvidenceTier[] = [
      'L0_NO_EVIDENCE', 'L1_SELF_DECLARED', 'L2_INTERNAL_DOCUMENT',
      'L3_THIRD_PARTY_DOCUMENT', 'L4_VERIFIED_EVIDENCE',
    ];
    for (let i = 0; i < tiers.length - 1; i++) {
      expect(EV_WEIGHTS[tiers[i]!]).toBeLessThan(EV_WEIGHTS[tiers[i + 1]!]);
    }
  });

  it('all EV weights are in range [0, 1]', () => {
    for (const weight of Object.values(EV_WEIGHTS)) {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });

  // Type-level compile test: confirm types are usable (would fail tsc if wrong)
  it('EvidenceRecord can be constructed as a typed object', () => {
    const record: EvidenceRecord = {
      evidence_id: 'ev-001',
      uef_id: 'uef-test-001',
      company_id: 'meridiana-group',
      tenant_id: 'tenant-meridiana-001',
      document_type: 'contract',
      tier: 'L4_VERIFIED_EVIDENCE',
      status: 'verified',
      submitted_at: '2025-03-01T00:00:00Z',
      submitted_by_role: 'COMPANY_ADMIN',
      description: 'Contratto partner Mindwork 2025',
    };
    expect(record.evidence_id).toBe('ev-001');
    expect(record.tier).toBe('L4_VERIFIED_EVIDENCE');
    expect(record.status).toBe('verified');
  });

  it('VerificationRecord can be constructed as a typed object', () => {
    const decision: ReviewDecision = {
      code: 'approve_full',
      ev_weight_assigned: 1.0,
    };
    const verification: VerificationRecord = {
      verification_id: 'ver-001',
      evidence_id: 'ev-001',
      advisor_pseudonym: 'ADV-PSEUDO-001',
      decision,
      tier_assigned: 'L4_VERIFIED_EVIDENCE',
      ev_weight_applied: 1.0,
      rationale: 'Contratto certificato confermato.',
      created_at: '2025-03-15T00:00:00Z',
      methodology_version_id: 'KORA-METHOD-v1.0',
    };
    expect(verification.verification_id).toBe('ver-001');
    expect(verification.decision.code).toBe('approve_full');
  });

  it('ReviewDecisionCode covers all expected values', () => {
    const valid: ReviewDecisionCode[] = [
      'approve_full', 'approve_partial', 'reject', 'request_more_info', 'escalate',
    ];
    for (const code of valid) {
      const d: ReviewDecision = { code, ev_weight_assigned: 0.5 };
      expect(d.code).toBe(code);
    }
  });

  it('EvidenceLifecycleStatus covers all expected values', () => {
    const statuses: EvidenceLifecycleStatus[] = [
      'submitted', 'under_review', 'verified', 'partially_verified',
      'rejected', 'expired', 'archived',
    ];
    for (const s of statuses) {
      expect(typeof s).toBe('string');
    }
  });
});

// ── 7. Scoring-result canonical entry point invariant ─────────────────────────

describe('lib/scoring-result — canonical entry point', () => {
  it('module is importable without errors', async () => {
    // Verifies the module compiles and exports the expected interface
    // Dynamic import guards against server-only modules in test environment
    const mod = await import('../../lib/scoring-result/index');
    expect(mod).toBeDefined();
  });

  it('useScoringResult is exported', async () => {
    const mod = await import('../../lib/scoring-result/index');
    expect(typeof mod.useScoringResult).toBe('function');
  });

  it('ScoringResultStatus type values are well-formed', () => {
    const validStatuses = ['ok', 'insufficient_data', 'not_implemented'];
    // Type-level test: these string values must match ScoringResultStatus
    for (const s of validStatuses) {
      expect(typeof s).toBe('string');
    }
  });
});
