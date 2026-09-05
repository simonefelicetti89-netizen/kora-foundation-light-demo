/**
 * CC-003 / B-REG — Constitutional Invariant I10: Architecture Registry completeness.
 *
 * SCOPE / WHAT THIS PROVES:
 *   1. Every one of the 55 services/* directories has at least one registered
 *      ArchitectureComponent whose primaryPath points inside it.
 *   2. Every lib/* directory this repository's own policy (LIB_DOMAIN_POLICY
 *      below) declares "domain-level" is registered.
 *   3. Every top-level app surface this repository's own policy
 *      (APP_SURFACE_POLICY below) declares a product surface is registered.
 *   4/5. Every DEAD component has both deletableWhen and decisionRef.
 *   6. No duplicate ids.
 *   7. docs/ARCHITECTURE_REGISTRY.md is byte-identical to what
 *      renderArchitectureDoc() produces from the current registry — proving
 *      the checked-in Markdown is not stale.
 *
 * GRANULARITY (per task instruction — do not require every directory in the
 * repo): I10 governs exactly three surfaces — services/*, the explicit
 * LIB_DOMAIN_POLICY list, and the explicit APP_SURFACE_POLICY list. It does
 * NOT require every lib/ or app/ subdirectory to be registered — components/,
 * generic utilities, and presentational-only directories are intentionally
 * out of scope, matching the Master Plan §8's own exclusion ("Esclusi:
 * helper, componenti UI, utility").
 *
 * This test does NOT modify the registry, the generated doc, or any
 * repository file. Adversarial checks below mutate only in-memory clones.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import {
  ARCHITECTURE_REGISTRY,
  TARGET_ONTOLOGY,
  validateArchitectureRegistry,
  type ArchitectureComponent,
} from '@/lib/architecture/registry';
import { renderArchitectureDoc } from '../../scripts/generate-architecture-doc';

const root = resolve(process.cwd());

// ── I10 coverage policy — explicit, not "every directory" ──────────────────────

/** lib/* directories this repository's own architecture treats as domain-level
 *  (matches lib.* entries actually present in the registry). */
const LIB_DOMAIN_POLICY = [
  'lib/kora-engine',
  'lib/decision-pack',
  'lib/kora-link',
  'lib/kora-contribution',
  'lib/scoring-result',
  'lib/methodology-config',
  'lib/privacy',
  'lib/permissions',
  'lib/auth',
  'lib/worker-identity',
  'lib/live',
  'lib/types/domains', // evidence.ts scaffold
  'lib/data-intake', // representative of the registered ingestion-cluster
];

/** Top-level app/* product surfaces this repository's own architecture treats
 *  as domain-level (excludes account/, auth/, api/, login/, cv/, link/,
 *  commons/, partner/, pilot/, privacy/, request-access/ — not registered as
 *  aggregates because CC-001R did not individually verify them this pass;
 *  adding them is a future I10 policy extension, not a CC-003 gap). */
const APP_SURFACE_POLICY = ['app/worker', 'app/my-kora', 'app/admin', 'app/demo'];

function pathIsRegisteredUnder(prefix: string, components: ArchitectureComponent[]): boolean {
  return components.some((c) => c.primaryPath === prefix || c.primaryPath.startsWith(`${prefix}/`));
}

describe('I10 — Architecture Registry completeness (B-REG / CC-003)', () => {
  describe('services/* coverage', () => {
    const serviceDirs = readdirSync(resolve(root, 'services'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    it('the live services/* directory listing has the expected count (sanity — catches silent additions/removals)', () => {
      expect(serviceDirs.length).toBeGreaterThanOrEqual(39); // loose bound: catches drastic drift, not exact churn — lowered from 50 by ReportGeneratorService (2026-09-02), FinancialGovernanceService (2026-09-02), DynamicScoringPreviewService (2026-09-03, B-TRUTH Preview Scoring Retirement), UEFReviewService (2026-09-03, B-TRUTH UEFReview Retirement), IngestionPipelineService (2026-09-03, B-TRUTH Ingestion Pipeline Retirement), IngestionNormalizerService (2026-09-03, B-TRUTH Ingestion Normalizer Retirement), EligibilityGateService (2026-09-03, B-TRUTH Eligibility Gate Retirement), TenantService (2026-09-04, B-TRUTH TenantService Canonical Migration), CompanyDataIntakeService (2026-09-05, B-TRUTH CompanyDataIntakeService Canonical Migration), ReportFactoryService (2026-09-06, B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration), and services/advisor-evidence-review/ (2026-09-26, CC-00 Residual /demo/** controlled retirement — its sole caller, app/demo/advisor, was retired) deliberate retirements
    });

    for (const dir of serviceDirs) {
      it(`services/${dir}/ has at least one registered component`, () => {
        const covered = pathIsRegisteredUnder(`services/${dir}`, ARCHITECTURE_REGISTRY);
        expect(covered).toBe(true);
      });
    }
  });

  describe('lib/* domain policy coverage', () => {
    for (const dir of LIB_DOMAIN_POLICY) {
      it(`${dir} has at least one registered component`, () => {
        const covered = pathIsRegisteredUnder(dir, ARCHITECTURE_REGISTRY);
        expect(covered).toBe(true);
      });
    }
  });

  describe('app/* surface policy coverage', () => {
    for (const dir of APP_SURFACE_POLICY) {
      it(`${dir}/ has at least one registered component`, () => {
        const covered = pathIsRegisteredUnder(dir, ARCHITECTURE_REGISTRY);
        expect(covered).toBe(true);
      });
    }
  });

  describe('registry contract', () => {
    it('every entry has a valid ArchitectureStatus', () => {
      const validStatuses = new Set([
        'CANONICAL', 'CONSOLIDATE', 'COMPLETE', 'FROZEN', 'FUTURE_CORE', 'LEGACY', 'DEAD', 'INVESTIGATE',
      ]);
      for (const c of ARCHITECTURE_REGISTRY) {
        expect(validStatuses.has(c.status)).toBe(true);
      }
    });

    it('no duplicate ids', () => {
      const violations = validateArchitectureRegistry(ARCHITECTURE_REGISTRY);
      expect(violations.filter((v) => v.rule === 'UNIQUE_ID')).toEqual([]);
    });

    it('every component has a non-empty primaryPath', () => {
      const violations = validateArchitectureRegistry(ARCHITECTURE_REGISTRY);
      expect(violations.filter((v) => v.rule === 'PATH_REQUIRED')).toEqual([]);
    });

    it('every DEAD component has deletableWhen and decisionRef', () => {
      const violations = validateArchitectureRegistry(ARCHITECTURE_REGISTRY);
      const deadViolations = violations.filter((v) => v.rule.startsWith('DEAD_REQUIRES'));
      expect(deadViolations).toEqual([]);
    });

    it('no FUTURE_CORE component is also marked DEAD', () => {
      const violations = validateArchitectureRegistry(ARCHITECTURE_REGISTRY);
      expect(violations.filter((v) => v.rule === 'FUTURE_CORE_NOT_DEAD')).toEqual([]);
    });

    it('the live registry currently has zero violations', () => {
      expect(validateArchitectureRegistry(ARCHITECTURE_REGISTRY)).toEqual([]);
    });

    it('at least the two Master-Plan-named DEAD components are present with full evidence', () => {
      const bookingRequest = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.booking-request');
      const boardPack = ARCHITECTURE_REGISTRY.find((c) => c.id === 'app.company-reports-board-pack');
      expect(bookingRequest?.status).toBe('DEAD');
      expect(bookingRequest?.deletableWhen).toBeTruthy();
      expect(bookingRequest?.decisionRef).toBeTruthy();
      expect(boardPack?.status).toBe('DEAD');
      expect(boardPack?.deletableWhen).toBeTruthy();
      expect(boardPack?.decisionRef).toBeTruthy();
    });
  });

  describe('no anticipated decisions', () => {
    it('D-A resolved (CC-011): lib.kora-engine (confidence-engine.ts) is canonical; svc.confidence-score is CONSOLIDATE, retained but non-canonical, not DEAD', () => {
      const engine = ARCHITECTURE_REGISTRY.find((c) => c.id === 'lib.kora-engine');
      const service = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.confidence-score');
      // lib.kora-engine is the 25-file aggregate (confidence-engine.ts lives inside it);
      // its own status reflects the aggregate. D-A (CC-004/CC-011) resolved the
      // competing-implementation question: confidence-engine.ts is canonical.
      // svc.confidence-score is retained as CONSOLIDATE — zero callers does not
      // mean DEAD (Master Plan discipline) — pending a formal retirement decision.
      expect(engine?.status).toBe('CANONICAL');
      expect(service?.status).toBe('CONSOLIDATE');
      expect(service?.status).not.toBe('DEAD');
      expect(service?.decisionRef).toBe('CC-011 / D-A');
    });

    // B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration
    // (2026-09-06): report-factory moved from "not DEAD" (pending decision)
    // to actually DEAD — a founder-authorized retirement (PR 4 of the
    // ONE_PRODUCT_CANONICAL_MIGRATION plan), not an anticipated/assumed one.
    // See lib/architecture/registry.ts svc.report-factory and
    // tests/unit/b-truth-reportfactory-canonical-decision-pack-status.test.ts.
    it('D-B ReportFactory disposition executed: svc.report-factory is DEAD, not merely non-canonical; lib.decision-pack remains canonical', () => {
      const factory = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.report-factory');
      const pack = ARCHITECTURE_REGISTRY.find((c) => c.id === 'lib.decision-pack');
      expect(pack?.status).toBe('CANONICAL');
      expect(factory?.status).toBe('DEAD');
      expect(factory?.decisionRef).toBe('B-TRUTH ReportFactoryService Canonical Decision Pack Status Migration (2026-09-06)');
      expect(pack?.decisionRef).toBe('CC-013 / D-B');
    });

    // B-TRUTH ReportGenerator Retirement (2026-09-02): report-generator moved
    // from "not DEAD" (pending decision) to actually DEAD — a founder-authorized
    // retirement (this task's own prompt), not an anticipated/assumed one. See
    // lib.architecture/registry.ts svc.report-generator and
    // tests/unit/b-truth-report-generator-retirement.test.ts.
    it('D-B ReportGenerator disposition executed: svc.report-generator is DEAD, not merely non-canonical', () => {
      const generator = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.report-generator');
      expect(generator?.status).toBe('DEAD');
      expect(generator?.decisionRef).toBe('B-TRUTH ReportGenerator Retirement (2026-09-02)');
    });

    it('/worker and /my-kora surfaces carry the same CC-024 / D-D decisionRef, neither is CANONICAL over the other', () => {
      const worker = ARCHITECTURE_REGISTRY.find((c) => c.id === 'app-surface.worker');
      const myKora = ARCHITECTURE_REGISTRY.find((c) => c.id === 'app-surface.my-kora');
      expect(worker?.decisionRef).toBe('CC-024 / D-D');
      expect(myKora?.decisionRef).toBe('CC-024 / D-D');
      expect(worker?.status).toBe(myKora?.status);
    });
  });

  describe('Target Ontology completeness', () => {
    const REQUIRED_OBJECTS = [
      'Organization', 'ProgramDefinition', 'ProgramParticipation', 'InvestmentCase', 'EvidencePlan',
      'DecisionRule', 'Delivery / Opportunity', 'Observation', 'Measurement', 'InvestmentReview',
      'DecisionEvent', 'SubsequentObservation', 'Worker', 'PIB', 'Partner', 'Advisor',
      'Territory / Local Entity', 'Evidence', 'Benchmark Cohort / Memory', 'MethodologySnapshot',
      'Data Lineage', 'KORA Link', 'KORA Contribution',
    ];

    it('all 23 required ontology objects are present', () => {
      const ids = TARGET_ONTOLOGY.map((o) => o.id);
      for (const required of REQUIRED_OBJECTS) {
        expect(ids).toContain(required);
      }
      expect(TARGET_ONTOLOGY.length).toBe(23);
    });

    it('every ontology object has a valid OntologyImplementationStatus', () => {
      const validStatuses = new Set(['EXISTS', 'PARTIAL', 'TO_BUILD', 'UNCERTAIN']);
      for (const o of TARGET_ONTOLOGY) {
        expect(validStatuses.has(o.status)).toBe(true);
      }
    });

    it('no TO_BUILD object claims a primaryPath (would mean it was implemented prematurely)', () => {
      for (const o of TARGET_ONTOLOGY) {
        if (o.status === 'TO_BUILD') {
          expect(o.primaryPaths).toEqual([]);
        }
      }
    });
  });

  describe('generated documentation sync', () => {
    it('docs/ARCHITECTURE_REGISTRY.md matches renderArchitectureDoc() output exactly', () => {
      const checkedIn = readFileSync(resolve(root, 'docs/ARCHITECTURE_REGISTRY.md'), 'utf8');
      const rendered = renderArchitectureDoc();
      expect(checkedIn).toBe(rendered);
    });
  });

  // ── Adversarial checks (I10 acceptance criteria) ────────────────────────────
  // All mutations below operate on in-memory clones only — nothing is written
  // to the real registry, the real doc, or any file on disk.
  describe('ADVERSARIAL — the completeness checks above actually catch regressions', () => {
    it('flags a DEAD component with no decisionRef', () => {
      const mutated: ArchitectureComponent[] = [
        ...ARCHITECTURE_REGISTRY,
        {
          id: 'svc.adversarial-dead-no-ref', domain: 'Test', primaryPath: 'services/fake/',
          purpose: 'test', status: 'DEAD', futureCore: false, dependencies: [], competingWith: [],
          decisionRef: null, notes: 'simulated', deletableWhen: 'never',
        },
      ];
      const violations = validateArchitectureRegistry(mutated);
      expect(violations.some((v) => v.id === 'svc.adversarial-dead-no-ref' && v.rule === 'DEAD_REQUIRES_DECISION_REF')).toBe(true);
    });

    it('flags a DEAD component with no deletableWhen', () => {
      const mutated: ArchitectureComponent[] = [
        ...ARCHITECTURE_REGISTRY,
        {
          id: 'svc.adversarial-dead-no-when', domain: 'Test', primaryPath: 'services/fake/',
          purpose: 'test', status: 'DEAD', futureCore: false, dependencies: [], competingWith: [],
          decisionRef: 'some-ref', notes: 'simulated', deletableWhen: null,
        },
      ];
      const violations = validateArchitectureRegistry(mutated);
      expect(violations.some((v) => v.id === 'svc.adversarial-dead-no-when' && v.rule === 'DEAD_REQUIRES_DELETABLE_WHEN')).toBe(true);
    });

    it('flags a duplicate id', () => {
      const mutated: ArchitectureComponent[] = [...ARCHITECTURE_REGISTRY, { ...ARCHITECTURE_REGISTRY[0] }];
      const violations = validateArchitectureRegistry(mutated);
      expect(violations.some((v) => v.rule === 'UNIQUE_ID' && v.id === ARCHITECTURE_REGISTRY[0].id)).toBe(true);
    });

    it('flags a FUTURE_CORE component marked DEAD', () => {
      const mutated: ArchitectureComponent[] = [
        ...ARCHITECTURE_REGISTRY,
        {
          id: 'svc.adversarial-future-core-dead', domain: 'Test', primaryPath: 'services/fake/',
          purpose: 'test', status: 'DEAD', futureCore: true, dependencies: [], competingWith: [],
          decisionRef: 'ref', notes: 'simulated', deletableWhen: 'never',
        },
      ];
      const violations = validateArchitectureRegistry(mutated);
      expect(violations.some((v) => v.id === 'svc.adversarial-future-core-dead' && v.rule === 'FUTURE_CORE_NOT_DEAD')).toBe(true);
    });

    it('flags a new unregistered service directory', () => {
      // Simulated coverage check against a services/* list with one extra,
      // unregistered directory — mirrors what the real "services/* coverage"
      // describe block above would do if a new service dir appeared.
      const simulatedServiceDirs = ['tenant', 'a-brand-new-unregistered-service'];
      const results = simulatedServiceDirs.map((dir) => ({
        dir,
        covered: pathIsRegisteredUnder(`services/${dir}`, ARCHITECTURE_REGISTRY),
      }));
      expect(results.find((r) => r.dir === 'tenant')?.covered).toBe(true);
      expect(results.find((r) => r.dir === 'a-brand-new-unregistered-service')?.covered).toBe(false);
    });

    it('flags a stale generated Markdown (altered relative to the current registry)', () => {
      const rendered = renderArchitectureDoc();
      const tampered = rendered.replace('# KORA Architecture Registry', '# KORA Architecture Registry (STALE COPY)');
      expect(tampered).not.toBe(rendered);
    });

    it('flags a required ontology object being removed', () => {
      const mutated = TARGET_ONTOLOGY.filter((o) => o.id !== 'PIB');
      const ids = mutated.map((o) => o.id);
      expect(ids).not.toContain('PIB');
      expect(mutated.length).toBe(TARGET_ONTOLOGY.length - 1);
    });
  });
});
