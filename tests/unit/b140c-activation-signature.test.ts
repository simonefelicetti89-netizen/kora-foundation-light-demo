// tests/unit/b140c-activation-signature.test.ts
// B140-C — KORA Activation Signature / STRATO visual integration.
//
// Pure structural/static tests — no DB, no Supabase, no runtime rendering.
// Verifies architectural invariants for:
//   - KoraActivationSignature component (worker STRATO)
//   - KoraStratoMark component (brand STRATO)
//   - MyKoraPreviewService (period_iu_total + activation_profile)
//   - app/my-kora/page.tsx (copy, KORA Link card, forbidden strings)

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

const signatureSrc = read('components/my-kora/KoraActivationSignature.tsx');
const stratoSrc    = read('components/brand/KoraStratoMark.tsx');
const svcSrc       = read('services/my-kora-preview/MyKoraPreviewService.ts');
const tokenSrc     = read('lib/design/kora-design-tokens.ts');
// B141-B: PIB content moved from home page to dedicated PIB page.
// Tests 4–11 use pibPageSrc (new page) for PIB-specific content.
const pibPageSrc   = read('app/my-kora/personal-impact-balance/page.tsx');
// pageSrc alias kept for all existing test references.
const pageSrc      = pibPageSrc;
// B141-F: pillar breakdown and Composizione copy moved inside WorkerActivationSignatureCard.
const cardSrc      = read('components/my-kora/WorkerActivationSignatureCard.tsx');

// ── 1–3: STRATO normalization invariant ──────────────────────────────────────

describe('B140-C — KoraActivationSignature normalization invariant', () => {
  it('1. width is driven by percentage (/ total * 100), never by absolute IU value', () => {
    // Checks the normalization formula is present — iu_total / total * 100
    expect(signatureSrc).toContain('/ total) * 100');
  });

  it('2. component does not render iu_total value directly in markup', () => {
    // No {p.iu_total} rendered as text — only used for computing width/opacity
    expect(signatureSrc).not.toContain('{p.iu_total}');
  });

  it('3. component does not render percentage values as text', () => {
    // pct% must not appear as rendered text — only in style={{ width }}
    expect(signatureSrc).not.toContain('>{pct}%<');
    expect(signatureSrc).not.toContain('{pct}%<');
  });
});

// ── 4–6: IU values outside the STRATO emblema ────────────────────────────────

describe('B140-C — IU absolute value outside the emblema', () => {
  it('4. period-iu-total testid exists in page', () => {
    expect(pageSrc).toContain('data-testid="period-iu-total"');
  });

  it('5. IU total uses Italian decimal separator', () => {
    // The format is .toFixed(1).replace('.', ',')
    expect(pageSrc).toContain(".replace('.',");
  });

  it('6. page contains "Impact Units attivate" copy', () => {
    expect(pageSrc).toContain('Impact Units attivate');
  });
});

// ── 7–9: Mandatory copy strings ───────────────────────────────────────────────

describe('B140-C — Mandatory copy in page', () => {
  it('7. "Composizione del periodo, non una classifica." is present in the card component', () => {
    // B141-F: copy moved inside WorkerActivationSignatureCard (pillar breakdown footer).
    expect(cardSrc).toContain('Composizione del periodo, non una classifica.');
  });

  it('8. page contains "Profilo del periodo:" label', () => {
    expect(pageSrc).toContain('Profilo del periodo:');
  });

  it('9. page contains "Descrive il mix delle tue esperienze, non te."', () => {
    expect(pageSrc).toContain('Descrive il mix delle tue esperienze, non te.');
  });
});

// ── 10–11: KORA Link card ────────────────────────────────────────────────────

describe('B140-C — KORA Link card', () => {
  it('10. page imports KoraLogo', () => {
    expect(pageSrc).toContain('KoraLogo');
  });

  it('11. KORA Link card uses #211F1A background', () => {
    expect(pageSrc).toContain('#211F1A');
  });
});

// ── 12–13: No avatar, no comparison, no gallery ──────────────────────────────

describe('B140-C — Forbidden UI patterns', () => {
  it('12. KoraActivationSignature does not import avatar or trophy elements', () => {
    expect(signatureSrc).not.toContain('avatar');
    expect(signatureSrc).not.toContain('trophy');
    expect(signatureSrc).not.toContain('badge');
  });

  it('13. page does not compare workers (no "vs", no ranking table in pib-section)', () => {
    const pibStart = pageSrc.indexOf('data-testid="pib-section"');
    const pibEnd   = pageSrc.indexOf('data-testid="iu-educational-panel"', pibStart);
    const pibSection = pibStart > -1 && pibEnd > -1
      ? pageSrc.substring(pibStart, pibEnd)
      : '';
    expect(pibSection).not.toContain(' vs ');
    expect(pibSection).not.toContain('classifica lavoratori');
  });
});

// ── 14–15: Profile name correctness ──────────────────────────────────────────

describe('B140-C — Profile name correctness', () => {
  it('14. "Wellbeing Pioneer" is absent from all B140-C files', () => {
    expect(signatureSrc).not.toContain('Wellbeing Pioneer');
    expect(stratoSrc).not.toContain('Wellbeing Pioneer');
    expect(svcSrc).not.toContain('Wellbeing Pioneer');
    expect(pageSrc).not.toContain('Wellbeing Pioneer');
  });

  it('15. "Life Anchor" is present in service (correct profile name)', () => {
    expect(svcSrc).toContain('Life Anchor');
  });
});

// ── 16–17: ACTIVATION_SIGNATURE tokens ───────────────────────────────────────

describe('B140-C — Design token correctness', () => {
  it('16. ACTIVATION_SIGNATURE token group is exported from design tokens', () => {
    expect(tokenSrc).toContain('ACTIVATION_SIGNATURE');
    expect(tokenSrc).toContain('#B5512E');
    expect(tokenSrc).toContain('#211F1A');
  });

  it('17. KoraStratoMark brand comment clarifies it is not a benchmark', () => {
    expect(stratoSrc).toContain('benchmark');
    expect(stratoSrc).toContain('GEOMETRIA DI BRAND');
  });
});
