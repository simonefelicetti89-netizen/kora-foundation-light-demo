import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── B85-B — Worker Attribution Explainability Layer ───────────────────────────
//
// Goal: workers can understand why an activity counts or does not count,
//       what can feed PIB, what can feed Dynamic CV, and what requires
//       verification — without Pilot+ infrastructure.
//
// Invariants:
//   - No PIB implementation
//   - No worker auth changes
//   - No ingestion changes
//   - No IU computation changes
//   - No DB changes
//   - No auth/RLS changes
//   - No scoring changes

function read(rel: string) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string) {
  return fs.existsSync(path.resolve(__dirname, '../..', rel));
}

// ── T1: WorkerAttributionService — file exists and exports ────────────────────

describe('B85-B T1 — WorkerAttributionService created', () => {
  const src = read('services/worker-attribution/WorkerAttributionService.ts');

  it('file exists', () => {
    expect(exists('services/worker-attribution/WorkerAttributionService.ts')).toBe(true);
  });

  it('exports WorkerAttributionService class', () => {
    expect(src).toContain('export class WorkerAttributionService');
  });

  it('exports workerAttributionService singleton', () => {
    expect(src).toContain('export const workerAttributionService');
  });

  it('exports AttributionCode type with A–F', () => {
    expect(src).toContain("AttributionCode");
    expect(src).toContain("'A'");
    expect(src).toContain("'B'");
    expect(src).toContain("'C'");
    expect(src).toContain("'D'");
    expect(src).toContain("'E'");
    expect(src).toContain("'F'");
  });

  it('exports AttributionInput interface', () => {
    expect(src).toContain('AttributionInput');
    expect(src).toContain('verification_status');
    expect(src).toContain('source_type');
  });

  it('exports AttributionClass interface with required fields', () => {
    expect(src).toContain('AttributionClass');
    expect(src).toContain('workerPibEligible');
    expect(src).toContain('dynamicCvEligible');
    expect(src).toContain('requiresVerification');
  });

  it('has classify method', () => {
    expect(src).toContain('classify(');
  });

  it('has getPibEligibilityLabel method', () => {
    expect(src).toContain('getPibEligibilityLabel');
  });

  it('has getDynamicCvEligibilityLabel method', () => {
    expect(src).toContain('getDynamicCvEligibilityLabel');
  });
});

// ── T1: Attribution class logic ───────────────────────────────────────────────

import { workerAttributionService } from '../../services/worker-attribution/WorkerAttributionService';
import type { AttributionInput } from '../../services/worker-attribution/WorkerAttributionService';

describe('B85-B T1 — Attribution class A (Verified Individual)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'lms_training',
  };

  it('classifies as A', () => {
    expect(workerAttributionService.classify(input).code).toBe('A');
  });

  it('label is Verified Individual', () => {
    expect(workerAttributionService.classify(input).label).toBe('Verified Individual');
  });

  it('workerPibEligible is true', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(true);
  });

  it('dynamicCvEligible is true', () => {
    expect(workerAttributionService.classify(input).dynamicCvEligible).toBe(true);
  });

  it('requiresVerification is false', () => {
    expect(workerAttributionService.classify(input).requiresVerification).toBe(false);
  });
});

describe('B85-B T1 — Attribution class A (welfare_provider verified)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'welfare_provider',
  };

  it('classifies as A', () => {
    expect(workerAttributionService.classify(input).code).toBe('A');
  });

  it('workerPibEligible is true', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(true);
  });
});

describe('B85-B T1 — Attribution class B (Partially Verified)', () => {
  const input: AttributionInput = {
    verification_status: 'partial',
    source_type: 'welfare_provider',
  };

  it('classifies as B', () => {
    expect(workerAttributionService.classify(input).code).toBe('B');
  });

  it('label is Partially Verified', () => {
    expect(workerAttributionService.classify(input).label).toBe('Partially Verified');
  });

  it('workerPibEligible is false', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(false);
  });

  it('dynamicCvEligible is false', () => {
    expect(workerAttributionService.classify(input).dynamicCvEligible).toBe(false);
  });

  it('requiresVerification is true', () => {
    expect(workerAttributionService.classify(input).requiresVerification).toBe(true);
  });
});

describe('B85-B T1 — Attribution class C (Self-Declared)', () => {
  const input: AttributionInput = {
    verification_status: 'self_declared',
    source_type: 'partner_events',
  };

  it('classifies as C', () => {
    expect(workerAttributionService.classify(input).code).toBe('C');
  });

  it('workerPibEligible is false', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(false);
  });

  it('requiresVerification is true', () => {
    expect(workerAttributionService.classify(input).requiresVerification).toBe(true);
  });
});

describe('B85-B T1 — Attribution class C (manual_upload)', () => {
  const input: AttributionInput = {
    verification_status: 'partial',
    source_type: 'manual_upload',
  };

  it('classifies manual_upload as C regardless of verification_status', () => {
    expect(workerAttributionService.classify(input).code).toBe('C');
  });

  it('workerPibEligible is false', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(false);
  });
});

describe('B85-B T1 — Attribution class D (Structural Policy)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'hr_policy',
    event_nature: 'structural_policy',
  };

  it('classifies as D', () => {
    expect(workerAttributionService.classify(input).code).toBe('D');
  });

  it('workerPibEligible is false', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(false);
  });

  it('requiresVerification is false', () => {
    expect(workerAttributionService.classify(input).requiresVerification).toBe(false);
  });
});

describe('B85-B T1 — Attribution class D (trust_and_flexibility_policy)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'hr_policy',
    action_family: 'trust_and_flexibility_policy',
  };

  it('classifies as D', () => {
    expect(workerAttributionService.classify(input).code).toBe('D');
  });
});

describe('B85-B T1 — Attribution class E (Economic Relief)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'welfare_provider',
    kora_eligibility: 'limited',
  };

  it('classifies as E', () => {
    expect(workerAttributionService.classify(input).code).toBe('E');
  });

  it('workerPibEligible is false', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(false);
  });

  it('requiresVerification is false', () => {
    expect(workerAttributionService.classify(input).requiresVerification).toBe(false);
  });
});

describe('B85-B T1 — Attribution class E (economic_relief action family)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'welfare_provider',
    action_family: 'economic_relief',
  };

  it('classifies as E', () => {
    expect(workerAttributionService.classify(input).code).toBe('E');
  });
});

describe('B85-B T1 — Attribution class F (Blocked Compliance)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'lms_training',
    kora_eligibility: 'blocked',
  };

  it('classifies as F', () => {
    expect(workerAttributionService.classify(input).code).toBe('F');
  });

  it('workerPibEligible is false', () => {
    expect(workerAttributionService.classify(input).workerPibEligible).toBe(false);
  });

  it('dynamicCvEligible is false', () => {
    expect(workerAttributionService.classify(input).dynamicCvEligible).toBe(false);
  });

  it('requiresVerification is false', () => {
    expect(workerAttributionService.classify(input).requiresVerification).toBe(false);
  });
});

describe('B85-B T1 — Attribution class F (blocked_compliance family)', () => {
  const input: AttributionInput = {
    verification_status: 'verified',
    source_type: 'lms_training',
    action_family: 'blocked_compliance',
  };

  it('classifies as F', () => {
    expect(workerAttributionService.classify(input).code).toBe('F');
  });
});

// ── T5: PIB eligibility labels ────────────────────────────────────────────────

describe('B85-B T5 — PIB eligibility labels', () => {
  it('returns positive label for class A', () => {
    const label = workerAttributionService.getPibEligibilityLabel({
      verification_status: 'verified',
      source_type: 'lms_training',
    });
    expect(label).toBe('Può contribuire al tuo PIB');
  });

  it('returns conditional label for class B', () => {
    const label = workerAttributionService.getPibEligibilityLabel({
      verification_status: 'partial',
      source_type: 'lms_training',
    });
    expect(label).toContain('Verifica in corso');
  });

  it('returns negative label for class C (self_declared)', () => {
    const label = workerAttributionService.getPibEligibilityLabel({
      verification_status: 'self_declared',
      source_type: 'partner_events',
    });
    expect(label).toBe('Non contribuisce al tuo PIB');
  });

  it('returns negative label for class F (blocked)', () => {
    const label = workerAttributionService.getPibEligibilityLabel({
      verification_status: 'verified',
      source_type: 'lms_training',
      kora_eligibility: 'blocked',
    });
    expect(label).toBe('Non contribuisce al tuo PIB');
  });
});

// ── T6: Dynamic CV eligibility labels ────────────────────────────────────────

describe('B85-B T6 — Dynamic CV eligibility labels', () => {
  it('returns positive label for class A', () => {
    const label = workerAttributionService.getDynamicCvEligibilityLabel({
      verification_status: 'verified',
      source_type: 'welfare_provider',
    });
    expect(label).toBe('Può comparire nel Dynamic CV');
  });

  it('returns conditional label for class B', () => {
    const label = workerAttributionService.getDynamicCvEligibilityLabel({
      verification_status: 'partial',
      source_type: 'partner_events',
    });
    expect(label).toContain('Verifica in corso');
  });

  it('returns negative label for class E (limited)', () => {
    const label = workerAttributionService.getDynamicCvEligibilityLabel({
      verification_status: 'verified',
      source_type: 'welfare_provider',
      kora_eligibility: 'limited',
    });
    expect(label).toBe('Non idoneo al Dynamic CV');
  });
});

// ── T9: Attribution Matrix component ─────────────────────────────────────────

describe('B85-B T9 — AttributionMatrix component', () => {
  const src = read('components/my-kora/AttributionMatrix.tsx');

  it('file exists', () => {
    expect(exists('components/my-kora/AttributionMatrix.tsx')).toBe(true);
  });

  it('exports AttributionMatrix', () => {
    expect(src).toContain('export function AttributionMatrix');
  });

  it('has data-testid attribution-matrix', () => {
    expect(src).toContain('data-testid="attribution-matrix"');
  });

  it('shows all 6 attribution classes A–F', () => {
    expect(src).toContain("'A'");
    expect(src).toContain("'B'");
    expect(src).toContain("'C'");
    expect(src).toContain("'D'");
    expect(src).toContain("'E'");
    expect(src).toContain("'F'");
  });

  it('shows PIB column', () => {
    expect(src).toContain('PIB');
  });

  it('shows Dynamic CV column', () => {
    expect(src).toContain('Dynamic CV');
  });

  it('shows Sì for class A PIB', () => {
    expect(src).toContain('Sì');
  });

  it('shows Condizionale for class B', () => {
    expect(src).toContain('Condizionale');
  });

  it('shows No for blocked classes', () => {
    expect(src).toContain('No');
  });

  it('has Verified Individual label', () => {
    expect(src).toContain('Verified Individual');
  });

  it('has Partially Verified label', () => {
    expect(src).toContain('Partially Verified');
  });

  it('has Blocked Compliance label', () => {
    expect(src).toContain('Blocked Compliance');
  });
});

// ── T2/T3/T4/T5/T6: worker-facing attribution-explainability UI ─────────────
//
// PRIOR HISTORY (accurate as of B85-B/B141-B, preserved as a record, not
// verbatim given the volume): T4's educational panel ("Quando un Impact
// Unit diventa tuo?"), T2's per-timeline-item attribution badges ("Classe
// {code}"), T5's PIB-eligible/not-eligible badges, T6's Dynamic-CV-eligible/
// not-eligible badges, and T3's per-CV-item attribution reason text all
// lived on app/my-kora/personal-impact-balance/page.tsx and
// app/my-kora/dynamic-cv/page.tsx, each calling workerAttributionService.classify()
// per item to explain why an activity did or didn't count.
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06): both
// pages are now pure, unconditional redirect()s — none of this
// explainability UI exists on them anymore. CONTENT GAP, flagged not
// papered over: the canonical /worker/personal-impact-balance and
// /worker/dynamic-cv pages do NOT currently render an equivalent
// per-item attribution-explainability UI (no educational panel, no
// per-item classify() call, no attribution/PIB-eligible/CV-eligible
// badges) — verified fresh, zero matches for workerAttributionService or
// any of these testids on either canonical page. workerAttributionService.classify()
// itself (the real, canonical classification engine — T1, T7-T10 below) is
// unaffected and still fully tested; only its worker-facing UI consumers
// were retired without a replacement being built, which this fork does not
// invent (out of scope — no new worker-facing feature).

describe('B-WORKER preview retirement — attribution-explainability UI retired, canonical replacement gap flagged', () => {
  it('/my-kora/personal-impact-balance and /my-kora/dynamic-cv are pure redirects with none of the former explainability UI', () => {
    const pib = read('app/my-kora/personal-impact-balance/page.tsx');
    const cv  = read('app/my-kora/dynamic-cv/page.tsx');
    expect(pib).toContain("redirect('/worker/personal-impact-balance')");
    expect(cv).toContain("redirect('/worker/dynamic-cv')");
    for (const src of [pib, cv]) {
      expect(src).not.toContain('workerAttributionService');
      expect(src).not.toContain('iu-educational-panel');
    }
  });

  it('the canonical /worker pages do not (yet) render an equivalent attribution-explainability UI — genuine gap, not fabricated here', () => {
    const canonicalPib = read('app/worker/personal-impact-balance/page.tsx');
    const canonicalCv  = read('app/worker/dynamic-cv/_components/DynamicCVClient.tsx');
    expect(canonicalPib).not.toContain('workerAttributionService');
    expect(canonicalCv).not.toContain('workerAttributionService');
  });
});

// ── T7 + T8: BCM review worker_pib_allowed — ingestion is now a boundary shell ─
//
// B147 P2: /company/ingestion was converted from a demo pipeline UI to a live-only
// boundary notice. The Worker PIB FlagBadge and Field were part of the DetailPanel
// in the demo branch, which has been removed. The company area should never show
// the operator-level classification detail — that belongs in /admin/companies/data-intake.

describe('B85-B T7+T8 — ingestion is a live-only boundary shell (B147 P2)', () => {
  const src = read('app/company/ingestion/page.tsx');

  it('ingestion has no Worker PIB UI (demo DetailPanel removed)', () => {
    // The Worker PIB flag and Field were in the demo classification DetailPanel,
    // which is an operator-level tool. Correctly absent from the company boundary notice.
    expect(src).not.toContain('Worker PIB consentito');
    expect(src).not.toContain('worker_pib_allowed');
    expect(src).not.toContain('DetailPanel');
  });

  it('ingestion has no ingestionPipelineService (live-only shell)', () => {
    expect(src).not.toContain('ingestionPipelineService');
    expect(src).not.toContain('DemoFlowBanner');
  });

  it('ingestion renders live boundary with workspace link', () => {
    expect(src).toContain('KORA Intake Engine™');
    expect(src).toContain('/company/workspace');
    expect(src).toContain('useCompanySession');
  });
});

// ── T10: Trust copy ───────────────────────────────────────────────────────────
// B141-B: trust copy moved with IU educational panel to /my-kora/personal-impact-balance.

// PRIOR HISTORY (accurate as of B85-B, preserved verbatim): checked
// app/my-kora/personal-impact-balance/page.tsx for this trust copy.
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) retired
// that page — see the attribution-explainability UI retirement/content-gap
// note above; this trust copy is part of the same retired content and has
// no canonical replacement built here.
describe('B85-B T10 — Trust copy in attribution area (retired with the explainability UI, gap flagged above)', () => {
  it('the retired page no longer carries this trust copy', () => {
    const src = read('app/my-kora/personal-impact-balance/page.tsx');
    expect(src).not.toContain('Non tutte le attività diventano parte del tuo percorso personale.');
  });
});

// ── Invariant checks ──────────────────────────────────────────────────────────

describe('B85-B invariants — no forbidden changes', () => {
  it('WorkerAttributionService has no DB connection', () => {
    const src = read('services/worker-attribution/WorkerAttributionService.ts');
    expect(src).not.toContain('supabase');
    expect(src).not.toContain('prisma');
    expect(src).not.toContain('createClient');
    expect(src).not.toContain('sql`');
    expect(src).not.toContain('SELECT ');
  });

  it('WorkerAttributionService has no IU computation', () => {
    const src = read('services/worker-attribution/WorkerAttributionService.ts');
    expect(src).not.toContain('NM ×');
    expect(src).not.toContain('AGF');
    expect(src).not.toContain('iu_value');
    expect(src).not.toContain('computeIU');
    expect(src).not.toContain('calculateIU');
  });

  it('WorkerAttributionService has no auth', () => {
    const src = read('services/worker-attribution/WorkerAttributionService.ts');
    expect(src).not.toContain('auth');
    expect(src).not.toContain('session');
    expect(src).not.toContain('jwt');
    expect(src).not.toContain('token');
  });

  it('no new SQL or Prisma files created', () => {
    expect(exists('prisma/schema.prisma')).toBe(false);
    expect(exists('schema.sql')).toBe(false);
  });

  it('/my-kora page does not import raw seed files directly', () => {
    const src = read('app/my-kora/page.tsx');
    expect(src).not.toContain("from '@/data/synthetic/workers.json'");
    expect(src).not.toContain("from '@/data/synthetic/pib-records.json'");
    expect(src).not.toContain("from '@/data/synthetic/impact-units.json'");
  });

  it('methodology weights are not hardcoded in attribution service', () => {
    const src = read('services/worker-attribution/WorkerAttributionService.ts');
    expect(src).not.toContain('0.10 *');
    expect(src).not.toContain('weights.AR');
    expect(src).not.toContain('KORA_INDEX_WEIGHTS');
  });

  it('AttributionMatrix does not implement PIB', () => {
    const src = read('components/my-kora/AttributionMatrix.tsx');
    expect(src).not.toContain('computePIB');
    expect(src).not.toContain('pib_score');
    expect(src).not.toContain('iu_total');
  });
});

// ── Classification priority order ─────────────────────────────────────────────

describe('B85-B — Classification priority: F > E > D > C > B > A', () => {
  it('blocked overrides verified status → F', () => {
    expect(workerAttributionService.classify({
      verification_status: 'verified',
      source_type: 'lms_training',
      kora_eligibility: 'blocked',
    }).code).toBe('F');
  });

  it('limited overrides verified status → E', () => {
    expect(workerAttributionService.classify({
      verification_status: 'verified',
      source_type: 'welfare_provider',
      kora_eligibility: 'limited',
    }).code).toBe('E');
  });

  it('structural_policy overrides verified → D', () => {
    expect(workerAttributionService.classify({
      verification_status: 'verified',
      source_type: 'partner_events',
      event_nature: 'structural_policy',
    }).code).toBe('D');
  });

  it('manual_upload overrides partial → C', () => {
    expect(workerAttributionService.classify({
      verification_status: 'partial',
      source_type: 'manual_upload',
    }).code).toBe('C');
  });

  it('verified esg_initiatives → A', () => {
    expect(workerAttributionService.classify({
      verification_status: 'verified',
      source_type: 'esg_initiatives',
    }).code).toBe('A');
  });
});
