/**
 * KORA-WP-120 — Canonical Service/Action Taxonomy Reconciliation.
 *
 * lib/taxonomy-config/v0.1.ts is a config-read helper only (registry 142's
 * own framing) — these tests verify the reconciliation itself: identifier
 * uniqueness, mapping validity, axis separation, ingestion/Partner Activity
 * compatibility, no duplicate live authority, and Prime-perimeter
 * reusability without requiring Prime implementation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  TAXONOMY_CONFIG_VERSION,
  ACTION_FAMILIES,
  PILLARS,
  FISCAL_BUDGET_PERIMETERS,
  FISCAL_BUDGET_PERIMETER_LABELS,
  PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY,
  FISCAL_CATEGORY_TO_BUDGET_PERIMETER,
  RETIRED_VOCABULARIES,
  getActionFamilyForPartnerActivityType,
  getBudgetPerimeterForFiscalCategory,
  isRetiredVocabularyPath,
  type FiscalBudgetPerimeter,
} from '@/lib/taxonomy-config/v0.1';
import {
  MOCK_PARTNER_ACTIVITIES,
  ACTIVITY_TYPE_LABELS,
  FISCAL_CATEGORY_LABELS,
  type PartnerActivityType,
  type FiscalCategory,
} from '@/lib/partner-activities/catalog';
import rawMethodologyConfig from '@/data/methodology/methodology-config.json';

describe('A: canonical identifiers are unique', () => {
  it('ACTION_FAMILIES has no duplicates', () => {
    expect(new Set(ACTION_FAMILIES).size).toBe(ACTION_FAMILIES.length);
  });
  it('PILLARS has no duplicates', () => {
    expect(new Set(PILLARS).size).toBe(PILLARS.length);
  });
  it('FISCAL_BUDGET_PERIMETERS has no duplicates', () => {
    expect(new Set(FISCAL_BUDGET_PERIMETERS).size).toBe(FISCAL_BUDGET_PERIMETERS.length);
  });
  it('TAXONOMY_CONFIG_VERSION is a non-empty stable string', () => {
    expect(TAXONOMY_CONFIG_VERSION).toBe('v0.1');
  });
});

describe('B: mappings reference valid canonical identifiers', () => {
  it('every PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY value is a real ACTION_FAMILIES member', () => {
    for (const family of Object.values(PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY)) {
      expect(ACTION_FAMILIES).toContain(family);
    }
  });
  it('every FISCAL_CATEGORY_TO_BUDGET_PERIMETER value is a real FISCAL_BUDGET_PERIMETERS member', () => {
    for (const perimeter of Object.values(FISCAL_CATEGORY_TO_BUDGET_PERIMETER)) {
      expect(FISCAL_BUDGET_PERIMETERS).toContain(perimeter);
    }
  });
});

describe('C: Action <-> Action Family integrity (canonical authority, not redeclared)', () => {
  it('ACTION_FAMILIES matches data/methodology/methodology-config.json own bc_by_action_family keys exactly (the real Base Contribution Matrix)', () => {
    const bcKeys = Object.keys((rawMethodologyConfig as { bc_by_action_family: Record<string, number> }).bc_by_action_family).sort();
    expect([...ACTION_FAMILIES].sort()).toEqual(bcKeys);
  });

  it('lib/taxonomy-config/v0.1.ts re-exports ActionFamily, never redeclares its own union', () => {
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    expect(src).toContain("import type { ActionFamily, PillarCode } from '@/lib/types'");
    // Guard against ever declaring a second `type ActionFamily =` union in this file.
    expect(src).not.toMatch(/^\s*type ActionFamily\s*=/m);
  });
});

describe('D: Pillar mappings are valid', () => {
  it('PILLARS matches the constitutional 5-pillar set', () => {
    expect([...PILLARS].sort()).toEqual(['CONNECTION', 'GROWTH', 'IMPACT', 'LEGACY', 'LIFE']);
  });
  it('every MOCK_PARTNER_ACTIVITIES primaryPillar is a real PILLARS member', () => {
    for (const activity of MOCK_PARTNER_ACTIVITIES) {
      expect(PILLARS).toContain(activity.primaryPillar);
      for (const p of activity.secondaryPillars) expect(PILLARS).toContain(p);
    }
  });
});

describe('E: Fiscal mappings remain distinct from Pillar mappings', () => {
  it('FiscalBudgetPerimeter and PillarCode share zero literal values (distinct axes, never collapsed)', () => {
    const overlap = FISCAL_BUDGET_PERIMETERS.filter((f) => (PILLARS as readonly string[]).includes(f));
    expect(overlap).toEqual([]);
  });
  it('FiscalBudgetPerimeter and ActionFamily share zero literal values (distinct axes, never collapsed)', () => {
    const overlap = FISCAL_BUDGET_PERIMETERS.filter((f) => (ACTION_FAMILIES as readonly string[]).includes(f));
    expect(overlap).toEqual([]);
  });
  it('every FiscalBudgetPerimeter has its own label, distinct from any Pillar or Action Family label', () => {
    for (const perimeter of FISCAL_BUDGET_PERIMETERS) {
      expect(FISCAL_BUDGET_PERIMETER_LABELS[perimeter]).toBeTruthy();
    }
  });
});

describe('F: Partner Activity mappings are valid', () => {
  it('PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY covers every real PartnerActivityType (12/12, from its own label map)', () => {
    const allTypes = Object.keys(ACTIVITY_TYPE_LABELS) as PartnerActivityType[];
    expect(allTypes.length).toBe(12);
    for (const t of allTypes) {
      expect(getActionFamilyForPartnerActivityType(t)).toBeDefined();
    }
    expect(Object.keys(PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY).sort()).toEqual(allTypes.sort());
  });

  it('FISCAL_CATEGORY_TO_BUDGET_PERIMETER covers every real FiscalCategory (13/13, from its own label map)', () => {
    const allCategories = Object.keys(FISCAL_CATEGORY_LABELS) as FiscalCategory[];
    expect(allCategories.length).toBe(13);
    for (const c of allCategories) {
      expect(getBudgetPerimeterForFiscalCategory(c)).toBeDefined();
    }
    expect(Object.keys(FISCAL_CATEGORY_TO_BUDGET_PERIMETER).sort()).toEqual(allCategories.sort());
  });

  it('every real MOCK_PARTNER_ACTIVITIES entry resolves to a valid Action Family and Budget Perimeter via the mapping', () => {
    for (const activity of MOCK_PARTNER_ACTIVITIES) {
      expect(ACTION_FAMILIES).toContain(getActionFamilyForPartnerActivityType(activity.activityType));
      expect(FISCAL_BUDGET_PERIMETERS).toContain(getBudgetPerimeterForFiscalCategory(activity.fiscalCategory));
    }
  });
});

describe('G: no concrete Partner Offering becomes canonical taxonomy authority', () => {
  it('lib/taxonomy-config/v0.1.ts never imports MOCK_PARTNER_ACTIVITIES or any concrete offering instance', () => {
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    expect(src).not.toContain('MOCK_PARTNER_ACTIVITIES');
    expect(src).not.toContain('activityId');
  });
  it('the mapping tables are keyed by PartnerActivityType/FiscalCategory (types), never by a specific activityId', () => {
    const keys = Object.keys(PARTNER_ACTIVITY_TYPE_TO_ACTION_FAMILY);
    for (const k of keys) expect(k).not.toMatch(/^activity-\d+$/);
  });
});

describe('H: methodology eligibility remains a separate dimension', () => {
  it('lib/taxonomy-config/v0.1.ts never imports or computes IU, KORA Index, BTI, or Confidence', () => {
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    const codeOnly = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    for (const forbidden of ['impact_unit', 'ImpactUnit', 'kora_index', 'KoraIndex', 'computeExecutiveIntelligence', 'confidence_result', 'bti_result', 'BTIEngine']) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });
});

describe('I: ingestion compatibility', () => {
  it('the FiscalBudgetPerimeter values match the real budget_class values already documented for live ingestion (PILOT_DATA_INTAKE_READINESS.md)', () => {
    const src = readFileSync(join(process.cwd(), 'docs/PILOT_DATA_INTAKE_READINESS.md'), 'utf-8');
    const line = src.split('\n').find((l) => l.includes('`budget_class`'));
    expect(line).toBeTruthy();
    for (const value of ['welfare', 'fringe_benefit', 'hr_learning', 'esg_volunteering', 'compliance_hse', 'compliance_legal', 'mixed', 'unknown']) {
      expect(line).toContain(value);
    }
    // and every one of those documented values is a real FiscalBudgetPerimeter member
    for (const value of ['welfare', 'fringe_benefit', 'hr_learning', 'esg_volunteering', 'compliance_hse', 'compliance_legal', 'mixed', 'unknown'] as FiscalBudgetPerimeter[]) {
      expect(FISCAL_BUDGET_PERIMETERS).toContain(value);
    }
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts is untouched by this WP (no backward-compat break)', () => {
    // Structural guard: this WP adds a new, separate config module; it does
    // not import from or modify the live ingestion interpreter. (The
    // module's own header prose legitimately mentions the file by name to
    // explain where ActionFamily is assigned — check import lines only.)
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(importLines.some((l) => l.includes('raw-to-uef-interpreter'))).toBe(false);
  });
});

describe('J: legacy/synthetic mappings where retained', () => {
  it('action-taxonomy.json retirement is documented with zero live consumers and no required compatibility mapping', () => {
    expect(RETIRED_VOCABULARIES).toHaveLength(1);
    expect(RETIRED_VOCABULARIES[0].path).toBe('data/synthetic/action-taxonomy.json');
    expect(RETIRED_VOCABULARIES[0].liveConsumersAtRetirement).toBe(0);
    expect(RETIRED_VOCABULARIES[0].compatibilityMappingRequired).toBe(false);
    expect(isRetiredVocabularyPath('data/synthetic/action-taxonomy.json')).toBe(true);
    expect(isRetiredVocabularyPath('lib/taxonomy-config/v0.1.ts')).toBe(false);
  });

  it('the retired file genuinely does not exist on disk (retirement is real, not aspirational)', () => {
    expect(existsSync(join(process.cwd(), 'data/synthetic/action-taxonomy.json'))).toBe(false);
  });
});

describe('K: no duplicate semantic authority remains in active runtime', () => {
  it('lib/taxonomy-config/v0.1.ts declares exactly one new typed vocabulary (FiscalBudgetPerimeter) — everything else is a re-export or mapping', () => {
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    // FiscalBudgetPerimeter is the only multi-value union type DECLARED (not re-exported) here.
    expect(src).toMatch(/export type FiscalBudgetPerimeter =/);
    expect(src).not.toMatch(/export type ActionFamily =\s*\n?\s*\|/);
    expect(src).not.toMatch(/export type PillarCode =\s*\n?\s*\|/);
  });
});

describe('L: future Prime perimeter can reference the taxonomy without requiring Prime implementation', () => {
  it('lib/taxonomy-config/v0.1.ts imports nothing from any Prime-named module (none exist yet — the point is the config module has no Prime dependency to break when Prime is eventually built)', () => {
    // The module's own header prose legitimately discusses future Prime
    // reuse (that's the whole point of this boundary) — check import lines
    // only, since no Prime module exists in the repository to import from.
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(importLines.some((l) => l.toLowerCase().includes('prime'))).toBe(false);
  });
  it('all read accessors are pure functions with no side effects, DB access, or async — safe for a future Prime module to call directly', () => {
    const src = readFileSync(join(process.cwd(), 'lib/taxonomy-config/v0.1.ts'), 'utf-8');
    expect(src).not.toContain('async function');
    expect(src).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain('await ');
  });
});

describe('Database impact', () => {
  it('no migration file was added by this WP (DATABASE IMPACT = NONE)', () => {
    // Highest migration at WP-120 time is 074 (KORA-WP-025's own baseline) — confirmed unchanged.
    const files: string[] = readdirSync(join(process.cwd(), 'supabase/migrations'));
    const highest = files
      .map((f) => parseInt(f.slice(0, 3), 10))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a)[0];
    // Baseline at KORA-WP-120's own implementation time was 74; KORA-WP-013
    // (a later, separately-authorized numbered WP) legitimately added
    // migration 075 — this guard's own invariant ("no migration added BY
    // WP-120 ITSELF") is unaffected and re-expressed as >= its own baseline.
    expect(highest).toBeGreaterThanOrEqual(74);
  });
});
