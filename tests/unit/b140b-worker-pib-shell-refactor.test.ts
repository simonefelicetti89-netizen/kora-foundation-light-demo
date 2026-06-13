// tests/unit/b140b-worker-pib-shell-refactor.test.ts
// B140-B — Worker PIB shell refactor: anti-score boundary + qualitative activation level.
//
// Pure structural/static tests — no DB, no Supabase, no runtime rendering.
// Verifies:
//   - PIB section does not render overall_index or "PIB / 100" as headline metric
//   - PIB section does not contain score/rating/ranking/benchmark/percentile as UI labels
//   - PIB section heading is "Bilancio personale di attivazione"
//   - Privacy and anti-performance copy is non-suppressible
//   - Dynamic CV connection is present
//   - MyKoraPreviewService exports activation_level fields

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

// ── Extract PIB section from page source ──────────────────────────────────────

const pageSrc = read('app/my-kora/page.tsx');

// Isolate the pib-section block for targeted checks
const pibStart = pageSrc.indexOf('data-testid="pib-section"');
const pibEnd   = pageSrc.indexOf('data-testid="iu-educational-panel"', pibStart);
const pibSection = pibStart > -1 && pibEnd > -1
  ? pageSrc.substring(pibStart, pibEnd)
  : pageSrc;

// ── 1–7: Forbidden strings — must NOT appear in PIB section ──────────────────

describe('B140-B — PIB section forbidden strings', () => {
  it('1. does not render "PIB / 100" label', () => {
    expect(pibSection).not.toContain('PIB / 100');
  });

  it('2. does not render "/ 100" as a metric label', () => {
    // Checks the exact old label "PIB / 100" is absent; "/5" for pillar count is acceptable
    expect(pibSection).not.toContain('"PIB / 100"');
    expect(pibSection).not.toContain('>PIB / 100<');
  });

  it('3. does not render overall_index as headline metric', () => {
    // The old pattern {preview.pib_light.overall_index} as rendered JSX must be absent
    expect(pibSection).not.toContain('pib_light.overall_index}');
  });

  it('4. does not render "rating" as a visible label', () => {
    expect(pibSection.toLowerCase()).not.toContain('rating');
  });

  it('5. does not render "ranking" as a visible label', () => {
    expect(pibSection.toLowerCase()).not.toContain('ranking');
  });

  it('6. does not render "benchmark" as a visible label', () => {
    expect(pibSection.toLowerCase()).not.toContain('benchmark');
  });

  it('7. does not render "percentile" as a visible label', () => {
    expect(pibSection.toLowerCase()).not.toContain('percentile');
  });
});

// ── 8–18: Required strings — must appear in PIB section ──────────────────────

describe('B140-B — PIB section required copy', () => {
  it('8. heading is "Bilancio personale di attivazione"', () => {
    expect(pibSection).toContain('Bilancio personale di attivazione');
  });

  it('9. badge contains "privato"', () => {
    expect(pibSection).toContain('privato');
  });

  it('10. badge contains "solo per te"', () => {
    expect(pibSection).toContain('solo per te');
  });

  it('11. contains employer visibility disclaimer', () => {
    expect(pibSection).toContain('Il tuo datore di lavoro non vede');
  });

  it('12. contains "Non è un voto di performance"', () => {
    expect(pibSection).toContain('Non è un voto di performance');
  });

  it('13. contains "Non è una classifica"', () => {
    expect(pibSection).toContain('Non è una classifica');
  });

  it('14. contains "produttività"', () => {
    expect(pibSection).toContain('produttività');
  });

  it('15. contains "loyalty"', () => {
    expect(pibSection).toContain('loyalty');
  });

  it('16. contains "benessere individuale"', () => {
    expect(pibSection).toContain('benessere individuale');
  });

  it('17. contains "Dynamic Impact CV"', () => {
    expect(pibSection).toContain('Dynamic Impact CV');
  });

  it('18. contains "aggregati anonimi"', () => {
    expect(pibSection).toContain('aggregati anonimi');
  });
});

// ── 19–20: MyKoraPreviewService activation_level ─────────────────────────────

describe('B140-B — MyKoraPreviewService activation_level', () => {
  const svcSrc = read('services/my-kora-preview/MyKoraPreviewService.ts');

  it('19. service exports activation_level field on PibLightPreview', () => {
    expect(svcSrc).toContain('activation_level');
    expect(svcSrc).toContain('activation_level_label');
    expect(svcSrc).toContain('activation_level_description');
  });

  it('20. deriveActivationLevel covers all four phases', () => {
    expect(svcSrc).toContain("'initial'");
    expect(svcSrc).toContain("'developing'");
    expect(svcSrc).toContain("'established'");
    expect(svcSrc).toContain("'advanced'");
  });
});

// ── 21–24: B140-B2+C extension ────────────────────────────────────────────────

describe('B140-B2+C — service and page extensions', () => {
  const svcSrc  = read('services/my-kora-preview/MyKoraPreviewService.ts');
  const pageSrc2 = read('app/my-kora/page.tsx');

  it('21. service source contains period_iu_total field', () => {
    expect(svcSrc).toContain('period_iu_total');
  });

  it('22. service source contains activation_profile field', () => {
    expect(svcSrc).toContain('activation_profile');
    expect(svcSrc).toContain('activation_profile_description');
  });

  it('23. service source contains deriveActivationProfile function', () => {
    expect(svcSrc).toContain('deriveActivationProfile');
    expect(svcSrc).toContain('Life Anchor');
  });

  it('24. pib-section in page.tsx contains KORA Activation Signature reference', () => {
    expect(pageSrc2).toContain('KoraActivationSignature');
    expect(pageSrc2).toContain('activation-signature-block');
  });
});
