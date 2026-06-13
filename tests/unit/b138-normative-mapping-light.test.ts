// tests/unit/b138-normative-mapping-light.test.ts
// B138-B — Static Normative Mapping Light: structural validation suite
//
// Pure logic tests — no DB, no Supabase, no runtime dependencies.
// Verifies claim boundary invariants: every area is non-certificative,
// non-compliance, non-assurance; all pillars and components are canonical.

import { describe, it, expect } from 'vitest';
import {
  getNormativeMappingLight,
  NORMATIVE_MAPPING_V01,
  type KoraPillar,
  type KoraComponent,
  type MappingFramework,
  type MappingStrength,
} from '../../lib/normative-mapping/normative-mapping-light';

// ── Canonical sets ────────────────────────────────────────────────────────────

const CANONICAL_PILLARS = new Set<KoraPillar>(['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY']);
const CANONICAL_COMPONENTS = new Set<KoraComponent>(['AR', 'MAR', 'NI', 'VR', 'CO', 'WB', 'PC', 'PB', 'EQ', 'BTI']);
const CANONICAL_FRAMEWORKS = new Set<MappingFramework>(['ESRS_S1', 'GRI', 'ISO_30414', 'UNI_PdR_125', 'SDG']);
const CANONICAL_STRENGTHS = new Set<MappingStrength>(['direct', 'indirect', 'contextual']);

// Words that must never appear in allowed_use (as positive claims)
const ALLOWED_USE_FORBIDDEN_WORDS = [
  'compliant',
  'certified',
  'assurance',
  'audit-ready',
  'legally compliant',
  'scientifically validated',
];

// ── 1. Top-level claim flags ──────────────────────────────────────────────────

describe('B138 — top-level claim flags', () => {
  const mapping = getNormativeMappingLight();

  it('is_compliance_claim is exactly false', () => {
    expect(mapping.is_compliance_claim).toBe(false);
  });

  it('is_certification_claim is exactly false', () => {
    expect(mapping.is_certification_claim).toBe(false);
  });

  it('is_assurance_claim is exactly false', () => {
    expect(mapping.is_assurance_claim).toBe(false);
  });

  it('calibration_status is pre_empirical_calibration', () => {
    expect(mapping.calibration_status).toBe('pre_empirical_calibration');
  });

  it('version is present and non-empty', () => {
    expect(mapping.version).toBeTruthy();
    expect(mapping.version.length).toBeGreaterThan(0);
  });

  it('NORMATIVE_MAPPING_V01 and getNormativeMappingLight() return the same object', () => {
    expect(getNormativeMappingLight()).toBe(NORMATIVE_MAPPING_V01);
  });
});

// ── 2. Master disclaimer ──────────────────────────────────────────────────────

describe('B138 — master_disclaimer content', () => {
  const { master_disclaimer } = getNormativeMappingLight();

  it('master_disclaimer is present and non-empty', () => {
    expect(master_disclaimer).toBeTruthy();
    expect(master_disclaimer.length).toBeGreaterThan(50);
  });

  it('contains "indicative"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('indicative');
  });

  it('contains "non-certificative"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('non-certificative');
  });

  it('contains "does not constitute ESG compliance"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('does not constitute esg compliance');
  });

  it('contains "audit"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('audit');
  });

  it('contains "assurance"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('assurance');
  });

  it('contains "legal reporting"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('legal reporting');
  });

  it('contains "certification"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('certification');
  });

  it('contains "scientific validation"', () => {
    expect(master_disclaimer.toLowerCase()).toContain('scientific validation');
  });

  it('contains "Foundation Light"', () => {
    expect(master_disclaimer).toContain('Foundation Light');
  });

  it('contains "pre_empirical_calibration"', () => {
    expect(master_disclaimer).toContain('pre_empirical_calibration');
  });

  it('contains "does not replace" professional advice', () => {
    expect(master_disclaimer.toLowerCase()).toContain('does not replace');
  });
});

// ── 3. Framework coverage ─────────────────────────────────────────────────────

describe('B138 — framework coverage', () => {
  const { areas } = getNormativeMappingLight();
  const frameworks = new Set(areas.map((a) => a.framework));

  for (const fw of CANONICAL_FRAMEWORKS) {
    it(`framework ${fw} is represented`, () => {
      expect(frameworks.has(fw)).toBe(true);
    });
  }

  it('has at least 12 areas', () => {
    expect(areas.length).toBeGreaterThanOrEqual(12);
  });

  it('ESRS_S1 has at least 4 areas', () => {
    expect(areas.filter((a) => a.framework === 'ESRS_S1').length).toBeGreaterThanOrEqual(4);
  });

  it('GRI has at least 4 areas', () => {
    expect(areas.filter((a) => a.framework === 'GRI').length).toBeGreaterThanOrEqual(4);
  });

  it('ISO_30414 has at least 3 areas', () => {
    expect(areas.filter((a) => a.framework === 'ISO_30414').length).toBeGreaterThanOrEqual(3);
  });

  it('UNI_PdR_125 has at least 1 area', () => {
    expect(areas.filter((a) => a.framework === 'UNI_PdR_125').length).toBeGreaterThanOrEqual(1);
  });

  it('SDG has at least 5 areas', () => {
    expect(areas.filter((a) => a.framework === 'SDG').length).toBeGreaterThanOrEqual(5);
  });
});

// ── 4. Per-area non-empty field invariants ────────────────────────────────────

describe('B138 — per-area non-empty fields', () => {
  const { areas } = getNormativeMappingLight();

  for (const area of areas) {
    describe(`area: ${area.area_code}`, () => {
      it('has non-empty disclaimer', () => {
        expect(area.disclaimer).toBeTruthy();
        expect(area.disclaimer.length).toBeGreaterThan(20);
      });

      it('has non-empty forbidden_claims', () => {
        expect(area.forbidden_claims.length).toBeGreaterThan(0);
      });

      it('has non-empty allowed_use', () => {
        expect(area.allowed_use.length).toBeGreaterThan(0);
      });

      it('has non-empty kora_pillars', () => {
        expect(area.kora_pillars.length).toBeGreaterThan(0);
      });

      it('has non-empty kora_components', () => {
        expect(area.kora_components.length).toBeGreaterThan(0);
      });

      it('has non-empty evidence_examples', () => {
        expect(area.evidence_examples.length).toBeGreaterThan(0);
      });

      it('has non-empty framework_label', () => {
        expect(area.framework_label).toBeTruthy();
      });

      it('has non-empty area_label', () => {
        expect(area.area_label).toBeTruthy();
      });
    });
  }
});

// ── 5. Canonical pillar validation ───────────────────────────────────────────

describe('B138 — all kora_pillars are canonical', () => {
  const { areas } = getNormativeMappingLight();

  for (const area of areas) {
    it(`${area.area_code}: all pillars canonical`, () => {
      for (const pillar of area.kora_pillars) {
        expect(CANONICAL_PILLARS.has(pillar as KoraPillar)).toBe(true);
      }
    });
  }
});

// ── 6. Canonical component validation ────────────────────────────────────────

describe('B138 — all kora_components are canonical', () => {
  const { areas } = getNormativeMappingLight();

  for (const area of areas) {
    it(`${area.area_code}: all components canonical`, () => {
      for (const comp of area.kora_components) {
        expect(CANONICAL_COMPONENTS.has(comp as KoraComponent)).toBe(true);
      }
    });
  }
});

// ── 7. No forbidden words in allowed_use ─────────────────────────────────────

describe('B138 — no forbidden words in allowed_use (per area)', () => {
  const { areas } = getNormativeMappingLight();

  for (const area of areas) {
    it(`${area.area_code}: allowed_use contains no forbidden claims`, () => {
      const joined = area.allowed_use.join(' ').toLowerCase();
      for (const word of ALLOWED_USE_FORBIDDEN_WORDS) {
        expect(joined).not.toContain(word.toLowerCase());
      }
    });
  }
});

describe('B138 — no forbidden words in global_allowed_use', () => {
  const { global_allowed_use } = getNormativeMappingLight();

  it('global_allowed_use has no forbidden claim words', () => {
    const joined = global_allowed_use.join(' ').toLowerCase();
    for (const word of ALLOWED_USE_FORBIDDEN_WORDS) {
      expect(joined).not.toContain(word.toLowerCase());
    }
  });

  it('global_allowed_use is non-empty', () => {
    expect(global_allowed_use.length).toBeGreaterThan(0);
  });
});

// ── 8. Strength values valid ──────────────────────────────────────────────────

describe('B138 — all areas have valid strength', () => {
  const { areas } = getNormativeMappingLight();

  for (const area of areas) {
    it(`${area.area_code}: strength is direct | indirect | contextual`, () => {
      expect(CANONICAL_STRENGTHS.has(area.strength)).toBe(true);
    });
  }
});

// ── 9. Global forbidden claims non-empty ─────────────────────────────────────

describe('B138 — global_forbidden_claims', () => {
  const { global_forbidden_claims } = getNormativeMappingLight();

  it('global_forbidden_claims is non-empty', () => {
    expect(global_forbidden_claims.length).toBeGreaterThan(5);
  });

  it('contains "ESRS compliant"', () => {
    expect(global_forbidden_claims).toContain('ESRS compliant');
  });

  it('contains "GRI compliant"', () => {
    expect(global_forbidden_claims).toContain('GRI compliant');
  });

  it('contains "ISO 30414 certified"', () => {
    expect(global_forbidden_claims).toContain('ISO 30414 certified');
  });

  it('contains "ESG assurance"', () => {
    expect(global_forbidden_claims).toContain('ESG assurance');
  });

  it('contains "scientifically validated"', () => {
    expect(global_forbidden_claims).toContain('scientifically validated');
  });
});

// ── 10. Area unique area_codes ────────────────────────────────────────────────

describe('B138 — unique area_codes', () => {
  const { areas } = getNormativeMappingLight();

  it('all area_codes are unique', () => {
    const codes = areas.map((a) => a.area_code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });
});

// ── 11. SDG areas are aspirational (strength indirect or contextual) ──────────

describe('B138 — SDG areas are not direct (aspirational only)', () => {
  const { areas } = getNormativeMappingLight();
  const sdgAreas = areas.filter((a) => a.framework === 'SDG');

  for (const area of sdgAreas) {
    it(`${area.area_code}: strength is indirect or contextual (not direct)`, () => {
      expect(area.strength === 'indirect' || area.strength === 'contextual').toBe(true);
    });
  }
});

// ── 12. UNI/PdR 125 area is contextual and non-certificative ─────────────────

describe('B138 — UNI/PdR 125 area invariants', () => {
  const { areas } = getNormativeMappingLight();
  const uniAreas = areas.filter((a) => a.framework === 'UNI_PdR_125');

  it('UNI_PdR_125 has at least one area', () => {
    expect(uniAreas.length).toBeGreaterThanOrEqual(1);
  });

  for (const area of uniAreas) {
    it(`${area.area_code}: strength is contextual (never direct)`, () => {
      expect(area.strength).toBe('contextual');
    });

    it(`${area.area_code}: forbidden_claims includes UNI/PdR 125 certified`, () => {
      expect(area.forbidden_claims.join(' ')).toContain('UNI/PdR 125 certified');
    });

    it(`${area.area_code}: disclaimer mentions accredited third-party`, () => {
      expect(area.disclaimer.toLowerCase()).toContain('accredited');
    });
  }
});

// ── 13. GRI 403 is contextual (mandatory H&S excluded from KORA) ──────────────

describe('B138 — GRI 403 is contextual (extra-compliance only)', () => {
  const { areas } = getNormativeMappingLight();
  const gri403 = areas.find((a) => a.area_code === 'GRI_403');

  it('GRI_403 area exists', () => {
    expect(gri403).toBeDefined();
  });

  it('GRI_403 strength is contextual', () => {
    expect(gri403?.strength).toBe('contextual');
  });

  it('GRI_403 forbidden_claims includes mandatory H&S replacement', () => {
    const joined = gri403?.forbidden_claims.join(' ') ?? '';
    expect(joined.toLowerCase()).toContain('mandatory');
  });
});

// ── 14. ESRS training area has direct strength ───────────────────────────────

describe('B138 — ESRS S1 training area strength', () => {
  const { areas } = getNormativeMappingLight();
  const trainingArea = areas.find((a) => a.area_code === 'ESRS_S1_TRAINING');

  it('ESRS_S1_TRAINING area exists', () => {
    expect(trainingArea).toBeDefined();
  });

  it('ESRS_S1_TRAINING strength is direct', () => {
    expect(trainingArea?.strength).toBe('direct');
  });

  it('ESRS_S1_TRAINING includes GROWTH and LEGACY pillars', () => {
    expect(trainingArea?.kora_pillars).toContain('GROWTH');
    expect(trainingArea?.kora_pillars).toContain('LEGACY');
  });
});
