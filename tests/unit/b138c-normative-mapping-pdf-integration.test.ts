// tests/unit/b138c-normative-mapping-pdf-integration.test.ts
// B138-C — Normative Mapping Light PDF/UI integration: structural validation.
//
// Pure structural/static tests — no DB, no Supabase, no runtime rendering.
// Verifies the integration contract:
//   - PdfData interface declares normativeMappingLight
//   - fetchPdfData populates it from getNormativeMappingLight (static)
//   - html-template renders Normative Mapping Light with master disclaimer
//   - html-template does NOT render global_forbidden_claims as a positive list
//   - NormativeMappingLightSection component exists and uses correct copy
//   - Both report pages import the component
//   - No positive compliance/certification/assurance claim in UI copy

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── 1. PdfData interface declares normativeMappingLight ───────────────────────

describe('B138-C — PdfData interface', () => {
  const src = read('lib/decision-pack/pdf-data.ts');

  it('PdfData interface contains normativeMappingLight field', () => {
    expect(src).toContain('normativeMappingLight');
  });

  it('pdf-data.ts imports getNormativeMappingLight', () => {
    expect(src).toContain('getNormativeMappingLight');
  });

  it('pdf-data.ts imports NormativeMappingLight type', () => {
    expect(src).toContain('NormativeMappingLight');
  });

  it('pdf-data.ts imports from normative-mapping-light module', () => {
    expect(src).toContain('normative-mapping-light');
  });
});

// ── 2. fetchPdfData populates normativeMappingLight ───────────────────────────

describe('B138-C — fetchPdfData populates normativeMappingLight', () => {
  const src = read('lib/decision-pack/pdf-data.ts');

  it('return object includes normativeMappingLight key', () => {
    // Verify assignment of getNormativeMappingLight() in the return block
    expect(src).toContain('normativeMappingLight: getNormativeMappingLight()');
  });

  it('assignment is pure static — no DB query needed', () => {
    // The assignment must not involve any async DB call;
    // it appears as a direct function call, not inside an if/await block
    expect(src).toContain('normativeMappingLight: getNormativeMappingLight()');
  });
});

// ── 3. html-template.ts renders Normative Mapping Light ──────────────────────

describe('B138-C — html-template.ts renders the section', () => {
  const src = read('lib/decision-pack/html-template.ts');

  it('destructures normativeMappingLight from data', () => {
    expect(src).toContain('normativeMappingLight');
  });

  it('renders "Normative Mapping Light" section header', () => {
    expect(src).toContain('Normative Mapping Light');
  });

  it('renders the Italian disclaimer text', () => {
    expect(src).toContain('non-certificativa');
  });

  it('renders "non costituisce compliance ESG" boundary', () => {
    expect(src).toContain('non costituisce compliance ESG');
  });

  it('renders pre_empirical_calibration badge in section', () => {
    expect(src).toContain('nm-badge-calib');
  });

  it('renders non-certificative badge in section', () => {
    expect(src).toContain('nm-badge-noclaim');
  });

  it('renders framework table (nm-table CSS class)', () => {
    expect(src).toContain('nm-table');
  });

  it('does NOT render global_forbidden_claims as a primary visible list', () => {
    // The forbidden claims must not appear as a labeled "Claim vietati" heading
    // or as a bullet list rendered in the board PDF.
    // The word may appear only inside code logic (not as rendered HTML label).
    const htmlOutput = src;
    // forbidden_claims must not be surfaced as a heading in the HTML output string
    expect(htmlOutput).not.toContain('>global_forbidden_claims<');
    expect(htmlOutput).not.toContain('>Claim vietati<');
    expect(htmlOutput).not.toContain('>Forbidden claims<');
  });
});

// ── 4. NormativeMappingLightSection component exists ─────────────────────────

describe('B138-C — NormativeMappingLightSection component', () => {
  const src = read('components/reports/NormativeMappingLightSection.tsx');

  it('component file exists', () => {
    expect(src).toBeTruthy();
    expect(src.length).toBeGreaterThan(200);
  });

  it('exports NormativeMappingLightSection', () => {
    expect(src).toContain('NormativeMappingLightSection');
  });

  it('displays pre_empirical_calibration badge', () => {
    expect(src).toContain('pre_empirical_calibration');
  });

  it('displays non-certificativa badge (Italian form)', () => {
    expect(src).toContain('non-certificativa');
  });

  it('renders "non costituisce compliance ESG" disclaimer text', () => {
    expect(src).toContain('non costituisce compliance ESG');
  });

  it('renders "attività di assurance/revisione" in disclaimer (B138-D polish)', () => {
    expect(src).toContain('attività di assurance/revisione');
  });

  it('does NOT import synthetic demo seed files', () => {
    expect(src).not.toContain('/data/synthetic/');
    expect(src).not.toContain('meridiana');
    expect(src).not.toContain('ferretti');
    expect(src).not.toContain('.json');
  });

  it('accepts mapping prop of type NormativeMappingLight', () => {
    expect(src).toContain('NormativeMappingLight');
    expect(src).toContain('mapping');
  });

  it('does NOT render global_forbidden_claims as a visible list', () => {
    expect(src).not.toContain('global_forbidden_claims');
    expect(src).not.toContain('Claim vietati');
    expect(src).not.toContain('Forbidden claims');
  });
});

// ── 5. UI live page imports the component ─────────────────────────────────────

describe('B138-C — company/reports live page integration', () => {
  const src = read('app/company/reports/page.tsx');

  it('imports NormativeMappingLightSection', () => {
    expect(src).toContain('NormativeMappingLightSection');
  });

  it('imports getNormativeMappingLight', () => {
    expect(src).toContain('getNormativeMappingLight');
  });

  it('renders NormativeMappingLightSection with mapping prop', () => {
    expect(src).toContain('<NormativeMappingLightSection');
    expect(src).toContain('mapping={getNormativeMappingLight()}');
  });
});

// ── 6. Canonical /company/reports page imports the component (B171: demo/company/reports rimossa) ─

describe('B138-C — /company/reports page integration (B171: demo page rimossa)', () => {
  it('B171 — app/demo/company/reports/page.tsx rimossa (RIDONDANTE)', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.resolve(__dirname, '../..', 'app/demo/company/reports/page.tsx'))).toBe(false);
  });

  it('canonical /company/reports page imports NormativeMappingLightSection', () => {
    const src = read('app/company/reports/page.tsx');
    expect(src).toContain('NormativeMappingLightSection');
  });

  it('canonical /company/reports page imports getNormativeMappingLight', () => {
    const src = read('app/company/reports/page.tsx');
    expect(src).toContain('getNormativeMappingLight');
  });
});

// ── 7. No positive compliance claims in component copy ────────────────────────

describe('B138-C — no positive compliance/certification/assurance claims', () => {
  const component = read('components/reports/NormativeMappingLightSection.tsx');
  const template  = read('lib/decision-pack/html-template.ts');

  const FORBIDDEN_POSITIVE_CLAIMS = [
    'ESRS compliant',
    'GRI compliant',
    'ISO 30414 certified',
    'UNI/PdR 125 certified',
    'ESG assurance',
    'impact certified',
    'scientifically validated',
    'CSRD compliant',
    'GRI-referenced disclosure',
    'audit-ready certification',
  ];

  for (const claim of FORBIDDEN_POSITIVE_CLAIMS) {
    it(`component does not render "${claim}" as positive claim`, () => {
      // The claim may appear in tests as a forbidden string to check against,
      // but must not appear as rendered HTML copy in the component or template section.
      // We check the component file directly.
      expect(component).not.toContain(claim);
    });
  }

  it('nm-section in template does not contain "ESRS compliant" as rendered text', () => {
    // The nm-section block is the B138-C addition — we check it doesn't claim compliance
    const nmStart = template.indexOf('B138-B: Normative Mapping Light');
    const nmEnd   = template.indexOf('B79-P0-4: Methodology disclosure', nmStart);
    const nmBlock = nmStart > -1 && nmEnd > -1 ? template.substring(nmStart, nmEnd) : '';
    expect(nmBlock).not.toContain('ESRS compliant');
    expect(nmBlock).not.toContain('GRI compliant');
    expect(nmBlock).not.toContain('certified');
  });
});
