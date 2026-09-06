// tests/unit/component-test-foundation-01-ui-regression-guards.test.ts
// COMPONENT-TEST-FOUNDATION-01 — minimal static/string regression guards.
//
// Why static/string tests, not component render tests:
// vitest.config.ts uses environment: 'node' (no jsdom) and include: ['tests/**/*.test.ts']
// (not .test.tsx) — no @testing-library/react or equivalent is installed. Adding either
// would be a new dependency / config change beyond this sprint's "prefer static tests,
// avoid new dependencies" instruction. These tests read raw source text instead, matching
// the existing pattern used throughout tests/unit/ (e.g. b100-versioning-consistency,
// kora-space-pilot-usability, p0-hotfix-navigation-contrast).
//
// Scope: locks in the specific regressions fixed across the last several sprints
// (KORA-SPACE-NAMING-FIX-01, UX-DESIGN-SYSTEM-CONSISTENCY-01, KORA-SPACE-JOURNEY-UX-01).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';

const root = resolve(process.cwd());

function readSrc(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// Strips full-line `//` comments (lines whose trimmed content starts with `//`).
// Used so the naming guard checks visible UI/copy, not internal code comments —
// e.g. "// B128: KORA Commons — Worker view" in app/worker/commons/page.tsx is a
// legitimate internal reference to the historical sprint code, not a visible label.
function stripLineComments(src: string): string {
  return src
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

// Files that are part of the worker/my-kora KORA Space visible-UI surface.
// Technical route/file paths (/worker/commons, /commons, components/commons/*)
// are expected and allowed to remain as-is — only their rendered copy is checked here.
const KORA_SPACE_UI_FILES = [
  'app/worker/commons/page.tsx',
  'app/my-kora/kora-space/page.tsx',
  'app/my-kora/bookings/page.tsx',
  'app/worker/workspace/page.tsx',
  'app/my-kora/page.tsx',
  'app/commons/page.tsx',
  'app/commons/publish/page.tsx',
  'components/commons/WorkerBookingButton.tsx',
];

// ── 1. KORA Space naming guard ────────────────────────────────────────────────

describe('COMPONENT-TEST-FOUNDATION-01 — KORA Space naming guard', () => {
  for (const file of KORA_SPACE_UI_FILES) {
    it(`${file}: no visible "KORA Commons" label (comments excluded)`, () => {
      const visible = stripLineComments(readSrc(file));
      expect(visible).not.toContain('KORA Commons');
    });
  }

  it('app/worker/commons/page.tsx: visible UI uses "KORA Space" as the product name', () => {
    const src = readSrc('app/worker/commons/page.tsx');
    expect(src).toContain('KORA Space');
  });

  it('app/my-kora/kora-space/page.tsx: visible UI uses "KORA Space" as the product name', () => {
    const src = readSrc('app/my-kora/kora-space/page.tsx');
    expect(src).toContain('KORA Space');
  });

  it('technical "commons" route/file/import names remain unchanged (allowed, not a naming violation)', () => {
    // These are exactly the technical identifiers the naming fix explicitly preserved —
    // this test exists so a future session does not "fix" them by mistake.
    expect(readSrc('app/worker/commons/page.tsx')).toContain("'commons'"); // schema('commons')
    const button = readSrc('components/commons/WorkerBookingButton.tsx');
    expect(button).toContain('/api/worker/commons/bookings');
  });

  it('sidebar WORKER nav label for /worker/commons is "KORA Space", not "KORA Commons"', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const item = allItems.find((i) => i.href === '/worker/commons');
    expect(item?.label).toBe('KORA Space');
  });
});

// ── 2. Sidebar bookings live guard ────────────────────────────────────────────

describe('COMPONENT-TEST-FOUNDATION-01 — Sidebar /my-kora/bookings live guard', () => {
  it('/my-kora/bookings is not marked comingSoon (it is a real live feature)', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const bookings = allItems.find((i) => i.href === '/my-kora/bookings');
    expect(bookings).toBeDefined();
    expect(bookings?.comingSoon).toBeUndefined();
  });

  it('/my-kora/bookings label remains "Prenotazioni"', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const bookings = allItems.find((i) => i.href === '/my-kora/bookings');
    expect(bookings?.label).toBe('Prenotazioni');
  });

  it('/my-kora/bookings description does not say "anteprima" or "Non ancora disponibile"', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const bookings = allItems.find((i) => i.href === '/my-kora/bookings');
    expect(bookings?.description ?? '').not.toMatch(/anteprima/i);
    expect(bookings?.description ?? '').not.toContain('Non ancora disponibile');
  });

  it('/my-kora/collective remains comingSoon (it genuinely has no live mode) — contrast check', () => {
    // Not a regression target itself, but guards against accidentally flipping
    // collective and bookings back to their pre-fix (swapped) states together.
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const collective = allItems.find((i) => i.href === '/my-kora/collective');
    expect(collective?.comingSoon).toBe(true);
  });
});

// ── 3. Worker booking success next-step guard ─────────────────────────────────

describe('COMPONENT-TEST-FOUNDATION-01 — WorkerBookingButton success next-step guard', () => {
  const buttonSrc = readSrc('components/commons/WorkerBookingButton.tsx');

  it('success state links to /my-kora/bookings', () => {
    expect(buttonSrc).toContain('/my-kora/bookings');
  });

  it('success state includes "Vedi le tue prenotazioni" next-step copy', () => {
    expect(buttonSrc).toContain('Vedi le tue prenotazioni');
  });

  it('the next-step link appears inside the booked (success) branch specifically', () => {
    const bookedBranchStart = buttonSrc.indexOf("if (state === 'booked')");
    const duplicateBranchStart = buttonSrc.indexOf("if (state === 'duplicate')");
    const linkIndex = buttonSrc.indexOf('/my-kora/bookings');
    expect(bookedBranchStart).toBeGreaterThan(-1);
    expect(duplicateBranchStart).toBeGreaterThan(bookedBranchStart);
    expect(linkIndex).toBeGreaterThan(bookedBranchStart);
    expect(linkIndex).toBeLessThan(duplicateBranchStart);
  });

  it('success state clarifies individual booking activity is not shown to the employer, only aggregate signals', () => {
    // KORA-SPACE-ACTIVATION-FEEDBACK-UX-01: the booked state previously only
    // reassured about the initiative organizer, not the employer specifically.
    expect(buttonSrc).toContain('né al tuo datore di lavoro');
    expect(buttonSrc).toMatch(/segnali aggregati/i);
  });
});

// ── 4. KORA Space journey copy guard ──────────────────────────────────────────

describe('COMPONENT-TEST-FOUNDATION-01 — KORA Space journey copy guard', () => {
  const workerCommonsSrc = readSrc('app/worker/commons/page.tsx');

  it('contains voluntary-participation language', () => {
    expect(workerCommonsSrc).toContain('volontaria');
  });

  it('contains no-individual-ranking language', () => {
    expect(workerCommonsSrc).toContain('non genera classifiche individuali');
  });

  it('contains aggregate-only employer-visibility language', () => {
    expect(workerCommonsSrc).toContain(
      'La tua visualizzazione non viene mostrata al datore di lavoro come dato individuale',
    );
    expect(workerCommonsSrc).toContain('segnali aggregati');
  });

  it('does not claim GDPR compliance or legal certification', () => {
    expect(workerCommonsSrc).not.toMatch(/GDPR|conforme|certificaz/i);
  });
});

// ── 5. BoundaryBadge LIVE guard ────────────────────────────────────────────────

describe('COMPONENT-TEST-FOUNDATION-01 — BoundaryBadge LIVE state guard', () => {
  it('BoundaryBadge supports a LIVE mode', () => {
    const boundaries = readSrc('lib/platform-boundaries.ts');
    expect(boundaries).toContain("LIVE:");
    expect(boundaries).toMatch(/BoundaryMode\s*=\s*'LIVE'/);
  });

  it('app/worker/commons/page.tsx renders a LIVE boundary badge', () => {
    const src = readSrc('app/worker/commons/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain('mode="LIVE"');
  });

  it('app/my-kora/kora-space/page.tsx renders a LIVE boundary badge in its live branch', () => {
    const src = readSrc('app/my-kora/kora-space/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain('mode="LIVE"');
  });

  it('app/my-kora/bookings/page.tsx renders a LIVE boundary badge in its live branch', () => {
    const src = readSrc('app/my-kora/bookings/page.tsx');
    expect(src).toContain('BoundaryBadge');
    expect(src).toContain('mode="LIVE"');
  });
});

// ── 6. Dynamic CV underclaiming/connection guard ──────────────────────────────
// PRIOR HISTORY (accurate as of WORKER-DYNAMIC-CV-UX-01, preserved verbatim):
// app/my-kora/dynamic-cv/page.tsx's live branch listed "Link di verifica
// pubblica" and "Esporta PDF" as "In arrivo" (not yet available), even though
// the real /worker/dynamic-cv page already had a working share-link and
// print/PDF-export feature — this guard locked in a pointer from the preview
// page's live branch to the real one ("già disponibili oggi... apri il CV
// completo"). B-WORKER-2 (2026-09-06) proved /worker/dynamic-cv is a full
// CANONICAL_SUPERSET and removed the preview page's own live branch entirely
// (it was always a lighter subset of the same real data) — a confirmed real
// WORKER session now redirects straight to /worker/dynamic-cv instead of
// rendering a pointer to it.

describe('WORKER-DYNAMIC-CV-UX-01 — Dynamic CV underclaiming/connection guard', () => {
  it('app/my-kora/dynamic-cv/page.tsx redirects a confirmed real session to the canonical /worker/dynamic-cv page', () => {
    const src = readSrc('app/my-kora/dynamic-cv/page.tsx');
    expect(src).toContain("router.replace('/worker/dynamic-cv')");
  });

  it('app/worker/dynamic-cv/_components/DynamicCVClient.tsx explicitly connects CV experiences to KORA Space', () => {
    const src = readSrc('app/worker/dynamic-cv/_components/DynamicCVClient.tsx');
    expect(src).toContain('KORA Space');
    expect(src).toContain('/worker/commons');
  });

  it('does not introduce a visible "KORA Commons" label in either file', () => {
    expect(readSrc('app/my-kora/dynamic-cv/page.tsx')).not.toContain('KORA Commons');
    expect(readSrc('app/worker/dynamic-cv/_components/DynamicCVClient.tsx')).not.toContain('KORA Commons');
  });
});

// ── 7. Dynamic CV employer visibility / ranking guard ─────────────────────────
// WORKER-DYNAMIC-CV-REGRESSION-GUARDS-01: neither Dynamic CV surface may ever
// claim the employer can see the individual worker's CV, or that the CV is a
// ranking/individual assessment. Not covered by the 3 guards added in
// WORKER-DYNAMIC-CV-UX-01 (naming/connection-focused, not privacy-focused).

describe('WORKER-DYNAMIC-CV-REGRESSION-GUARDS-01 — Dynamic CV employer visibility / ranking guard', () => {
  const realCvSrc = readSrc('app/worker/dynamic-cv/_components/DynamicCVClient.tsx');
  const previewCvSrc = readSrc('app/my-kora/dynamic-cv/page.tsx');

  it('the real Dynamic CV page denies employer visibility', () => {
    expect(realCvSrc).toContain('Il tuo datore di lavoro non vede questo CV');
  });

  it('the real Dynamic CV page denies ranking/individual assessment', () => {
    expect(realCvSrc).toMatch(/non è una valutazione individuale/);
    expect(realCvSrc).toContain('Non contiene ranking o confronto con colleghi');
  });

  it('the preview Dynamic CV page denies employer visibility', () => {
    expect(previewCvSrc).toMatch(/datore di lavoro non (può|possono|ha)/);
  });

  it('neither page introduces a positive claim that the employer can see/access the individual CV', () => {
    // Targeted: "datore di lavoro" directly followed by a positive-access verb,
    // with no negation in between — e.g. "datore di lavoro vede questo CV" would
    // match; "datore di lavoro non vede questo CV" (the correct, existing
    // wording) does not, since "non" sits between "lavoro" and "vede".
    const forbidden = /datore di lavoro (vede|accede|può vedere|può accedere)\b/i;
    expect(realCvSrc).not.toMatch(forbidden);
    expect(previewCvSrc).not.toMatch(forbidden);
  });
});
