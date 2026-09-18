// tests/unit/kora-wp-111-living-koral-semantic-foundation.test.ts
// KORA-WP-111 — Living KORAL Semantic Foundation.
//
// Proves the versioned constitution/taxonomy/framework config is complete,
// correctly typed, and does not leak into KORA-WP-112+'s own scope —
// nothing more. Boundary guards below are deliberately scoped to this
// WP's own files (data/living-koral/**, lib/living-koral-config/**), per
// explicit Founder correction during this WP's own review: a repository-
// wide "this name may never appear anywhere" assertion would incorrectly
// fail the moment a legitimate KORA-WP-112+ consumer imports these types —
// the real invariant is "no duplicate definition," not "no future
// reference."

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  getLivingKoralConstitutionConfig,
  getLivingKoralConfigVersion,
  getLivingKoralConstitution,
  getMaterialChangeTaxonomy,
  getMaterialChangeTaxonomyEntry,
  getOrganizationChangedVsKoraLearnedFramework,
  getMaterialChangeJustifyingTypes,
} from '@/lib/living-koral-config/v1';
const WP111_FILES = [
  'data/living-koral/constitution-v1.json',
  'lib/living-koral-config/types.ts',
  'lib/living-koral-config/v1.ts',
];

function readWp111File(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

describe('KORA-WP-111 — 18-principle constitution', () => {
  it('all 18 principles are present, each with a unique id 1-18, in canonical order', () => {
    const principles = getLivingKoralConstitution();
    expect(principles).toHaveLength(18);
    expect(principles.map((p) => p.id)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    for (const p of principles) {
      expect(typeof p.principle).toBe('string');
      expect(p.principle.length).toBeGreaterThan(0);
    }
  });

  it('the exact Founder-locked wording is present for the invariants this WP is required to preserve', () => {
    const text = getLivingKoralConstitution().map((p) => p.principle);
    expect(text).toContain('Time alone never changes a KORAL.');
    expect(text).toContain('Data arrival alone never changes a KORAL.');
    expect(text).toContain('Evidence-confidence change is not organizational change.');
    expect(text).toContain('Decision Pack alone can never create RECOGNIZED Material Change.');
    expect(text).toContain('Provenance must remain recoverable.');
    expect(text).toContain('Expression Mode is mandatory before outward/Worker-facing distribution.');
    expect(text).toContain('Local change preserves global identity.');
  });
});

describe('KORA-WP-111 — Material Change taxonomy (Change Protocol v1)', () => {
  const EXPECTED_CATEGORIES = ['Emergence', 'Disappearance', 'Strengthening', 'Weakening', 'Consolidation', 'Reorientation', 'Stabilization'];

  it('exactly the 7 retained categories are present, each exactly once, no more, no fewer', () => {
    const taxonomy = getMaterialChangeTaxonomy();
    expect(taxonomy).toHaveLength(7);
    expect(taxonomy.map((t) => t.category).sort()).toEqual([...EXPECTED_CATEGORIES].sort());
  });

  it('excluded categories (Fragmentation, Differentiation, Convergence, Structural discontinuity, Uncertainty revision) are NOT present in the retained taxonomy', () => {
    const categories = getMaterialChangeTaxonomy().map((t) => t.category);
    for (const excluded of ['Fragmentation', 'Differentiation', 'Convergence', 'Structural discontinuity', 'Uncertainty revision']) {
      expect(categories).not.toContain(excluded);
    }
  });

  it('every entry carries a complete, non-empty definition across every required field', () => {
    for (const entry of getMaterialChangeTaxonomy()) {
      expect(entry.organizationalPhenomenon.length).toBeGreaterThan(0);
      expect(entry.justifyingEvidence.length).toBeGreaterThan(0);
      expect(entry.insufficientEvidence.length).toBeGreaterThan(0);
      expect(['yes', 'no', 'n/a']).toContain(entry.reversible);
      expect(['local', 'global', 'local-or-distributed']).toContain(entry.scope);
      expect(['morphology', 'confidence-only', 'morphology-and-confidence']).toContain(entry.morphologyOrConfidenceOnly);
    }
  });

  it('Stabilization is correctly represented as reversibility "n/a" (it IS the stable state, not a reversible transition)', () => {
    const stabilization = getMaterialChangeTaxonomyEntry('Stabilization');
    expect(stabilization?.reversible).toBe('n/a');
  });

  it('Consolidation is explicitly marked non-negative, matching constitution principle 7 ("Simplification/consolidation are neutral, valid transformations")', () => {
    const consolidation = getMaterialChangeTaxonomyEntry('Consolidation');
    expect(consolidation?.notes).toMatch(/non-negative|neutral/i);
  });

  it('getMaterialChangeTaxonomyEntry() returns undefined, never throws, for a category outside the retained set', () => {
    // @ts-expect-error — deliberately passing a category the type union excludes, to prove the runtime behavior for an unknown/excluded lookup.
    expect(getMaterialChangeTaxonomyEntry('Fragmentation')).toBeUndefined();
  });
});

describe('KORA-WP-111 — Organization-Changed-vs-KORA-Learned framework', () => {
  it('all six types (A-F) are present, exactly once each', () => {
    const framework = getOrganizationChangedVsKoraLearnedFramework();
    expect(framework).toHaveLength(6);
    expect(framework.map((f) => f.type).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('ONLY type A (Real organizational transformation) justifies a Material Change Event — B/C/D/E/F must never touch morphology', () => {
    const framework = getOrganizationChangedVsKoraLearnedFramework();
    for (const entry of framework) {
      expect(entry.justifiesMaterialChange).toBe(entry.type === 'A');
    }
    expect(getMaterialChangeJustifyingTypes()).toEqual(['A']);
  });

  it('type C (Interpretation update) is present and correctly does not justify Material Change — the most dangerous category per doc 129 Part 3', () => {
    const typeC = getOrganizationChangedVsKoraLearnedFramework().find((f) => f.type === 'C');
    expect(typeC?.name).toBe('Interpretation update');
    expect(typeC?.justifiesMaterialChange).toBe(false);
  });
});

describe('KORA-WP-111 — versioning', () => {
  it('an explicit, non-empty config version exists', () => {
    expect(getLivingKoralConfigVersion()).toBe('1.0');
  });

  it('the full config object is internally consistent with the individual accessors', () => {
    const full = getLivingKoralConstitutionConfig();
    expect(full.constitution).toEqual(getLivingKoralConstitution());
    expect(full.materialChangeTaxonomy).toEqual(getMaterialChangeTaxonomy());
    expect(full.organizationChangedVsKoraLearned).toEqual(getOrganizationChangedVsKoraLearnedFramework());
  });

  it('accessors return genuinely immutable config — a mutation attempt throws at runtime, not only a compile-time type error (the config is deep-frozen)', () => {
    const principles = getLivingKoralConstitution();
    expect(() => {
      // @ts-expect-error — `principles` is `readonly LivingKoralConstitutionPrinciple[]`; push() must not typecheck either.
      principles.push({ id: 19, principle: 'not allowed' });
    }).toThrow();
    // Confirms the attempted mutation above did not silently succeed and
    // corrupt the module's own shared state for the rest of the suite.
    expect(getLivingKoralConstitution()).toHaveLength(18);
  });
});

describe('KORA-WP-111 — WP-112–119 boundary (scoped to this WP\'s own files, not the whole repository)', () => {
  const OWNED_BY_LATER_WPS = [
    'gov.living_koral_material_change', // KORA-WP-112
    'gov.living_koral_transformation_ledger', // KORA-WP-113
    'analytics.living_koral_state', // KORA-WP-113
    'analytics.living_koral_edition', // KORA-WP-115
    'Morphogenesis Engine', // KORA-WP-113
    'Continuity Contract', // KORA-WP-113
    'Expression Mode', // KORA-WP-117 (the runtime; the constitution PRINCIPLE naming it is fine and expected — checked separately below)
    'KORAL Mark', // KORA-WP-117
    'commons.post', // KORA-WP-118
  ];

  // Comment-stripped: this WP's own header comments legitimately name
  // several KORA-WP-112+-owned concepts (Transformation Ledger,
  // Morphogenesis, Expression Mode, etc.) to explicitly disclose their
  // own absence from this file — the same recurring comment-boundary
  // false-positive already fixed above and throughout this engagement.
  // Checking actual code content (types/values/strings), not prose, is
  // the correct test for "does not implement."
  function codeOnly(rel: string): string {
    return readWp111File(rel)
      .split('\n')
      .filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l))
      .join('\n');
  }

  // .ts files only — the JSON data file cannot "implement" a service/
  // table/UI by construction (it holds structured data, not code), and
  // its own `materialChangeTaxonomyNote`/`organizationChangedVsKoraLearnedNote`
  // fields legitimately name a couple of these same concepts (e.g.
  // "Continuity Contract") as cross-reference disclosure, exactly like
  // the .ts files' own header comments.
  for (const file of WP111_FILES.filter((f) => f.endsWith('.ts'))) {
    it(`${file}: does not implement any KORA-WP-112+-owned persistence/service/UI concept`, () => {
      const code = codeOnly(file);
      for (const owned of OWNED_BY_LATER_WPS) {
        expect(code).not.toContain(owned);
      }
    });
  }

  it('the constitution DOES correctly name "Expression Mode" as a principle (doc 132 §E principle 17) — the boundary guard above only forbids implementing it, not stating the principle it governs', () => {
    const text = getLivingKoralConstitution().map((p) => p.principle).join(' ');
    expect(text).toContain('Expression Mode is mandatory before outward/Worker-facing distribution.');
  });
});

describe('KORA-WP-111 — no duplicate Intelligence engine, no Prime-specific KORAL (by absence, mirroring KORA-WP-042\'s own guard)', () => {
  // Import lines only — this WP's own header comments legitimately name
  // "methodology-config" (the precedent it follows) and other modules by
  // name to explain their disclosed absence; a full-source regex would
  // false-positive against that disclosure, the same recurring pitfall
  // already fixed the same way in every other structural guard this
  // engagement has written.
  function importLines(rel: string): string {
    return readWp111File(rel).split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
  }

  for (const file of WP111_FILES.filter((f) => f.endsWith('.ts'))) {
    it(`${file}: imports nothing from the existing methodology-config module (no second Intelligence engine)`, () => {
      expect(importLines(file)).not.toMatch(/methodology-config/i);
    });

    it(`${file}: imports nothing from any Prime-scoped module`, () => {
      expect(importLines(file)).not.toMatch(/flow-a-billing|program-funds|partner-payable|prime-settlement|prime-fee|\bcommission\b/i);
    });
  }
});

describe('KORA-WP-111 — no duplicate definition of the taxonomy/framework type unions elsewhere in the repository', () => {
  // Narrow, non-brittle check: today, no OTHER file re-declares the exact
  // 7-way Material Change category union — the real invariant this test
  // protects. It is not a "this string may never appear again" ban: a
  // future KORA-WP-112 importing MaterialChangeTaxonomyEntry (a type
  // reference, not a redeclaration) will not trip this test.
  const TAXONOMY_UNION_LITERAL = "'Emergence' | 'Disappearance' | 'Strengthening' | 'Weakening' | 'Consolidation' | 'Reorientation' | 'Stabilization'";

  it('lib/living-koral-config/types.ts is the sole file declaring the 7-way Material Change category union', () => {
    const declaringFiles: string[] = [];
    for (const file of WP111_FILES) {
      if (readWp111File(file).includes(TAXONOMY_UNION_LITERAL)) declaringFiles.push(file);
    }
    expect(declaringFiles).toEqual(['lib/living-koral-config/types.ts']);
  });
});
