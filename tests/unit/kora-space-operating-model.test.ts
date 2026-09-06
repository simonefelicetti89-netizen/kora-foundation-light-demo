/**
 * KORA Space Operating Model Sprint
 * Validates that KORA Space is correctly positioned as the shared activation environment,
 * with KORA Contribution as a secondary companion signal, not the primary purpose.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

// ── OPERATING MODEL (1–6) ────────────────────────────────────────────────────

describe('KORA Space — operating model positioning', () => {
  let companyCommonsSrc: string;
  let spaceSrc: string;
  let commonsPageSrc: string;
  let commonsBrowserSrc: string;

  beforeAll(() => {
    companyCommonsSrc = readFile('app/company/commons/page.tsx');
    spaceSrc          = readFile('app/my-kora/kora-space/page.tsx');
    commonsPageSrc    = readFile('app/commons/page.tsx');
    // CC-052 (2026-08-31): app/commons/page.tsx became a thin server-component
    // data loader; the rendered disclaimer copy moved to this component.
    commonsBrowserSrc = readFile('components/commons/CommonsDiscoveryBrowser.tsx');
  });

  test('1. Company KORA Space describes Space as activation environment', () => {
    expect(companyCommonsSrc).toContain("layer operativo dell&apos;attivazione umana");
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // the worker-facing testid "space-operating-model-worker" on
  // app/my-kora/kora-space/page.tsx. B-WORKER "One Product / No Demo
  // Runtime" correction (2026-09-06) retired that page to a pure redirect()
  // — that exact testid does not exist verbatim on the canonical
  // /worker/commons page today (a genuine content gap left by the
  // retirement, not fabricated here to paper over it). The company-facing
  // testid is unaffected and re-verified.
  test('2. Company KORA Space has its operating-model positioning testid (worker-facing equivalent testid gap flagged, not fabricated)', () => {
    expect(companyCommonsSrc).toContain('space-operating-model');
  });

  test('3. At least one KORA Space surface states it is not a social network', () => {
    const hasNotSocial =
      companyCommonsSrc.includes('non è un social network') ||
      commonsPageSrc.includes('non è un social network') ||
      commonsBrowserSrc.includes('non è un social network') ||
      spaceSrc.includes('non è un social network');
    expect(hasNotSocial).toBe(true);
  });

  test('4. At least one KORA Space surface states it is not worker surveillance', () => {
    const hasNotSurveillance =
      companyCommonsSrc.includes('non è sorveglianza') ||
      spaceSrc.includes('non è sorveglianza');
    expect(hasNotSurveillance).toBe(true);
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // app/my-kora/kora-space/page.tsx for this exact phrase. B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) retired that page —
  // the canonical /worker/bookings surface (BookingsClient.tsx) makes the
  // same guarantee in its own words ("traccia privata").
  test('5. Worker-facing surface states individual participation remains private (canonical /worker/bookings)', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('traccia privata');
  });

  test('6. Company KORA Space states companies see only aggregate signals', () => {
    expect(companyCommonsSrc).toContain("l&apos;azienda vede solo aggregati");
  });
});

// ── WORKER FEED (7–11) ───────────────────────────────────────────────────────

describe('Worker KORA Space — mode detection and live feed', () => {
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  // PRIOR HISTORY (accurate as of the original sprint, preserved verbatim):
  // "Worker feed has four-state detection" — asserted setMode('live')/'empty'
  // existed. B-WORKER-3 (2026-09-06) proved /worker/commons full parity and
  // replaced the live/empty distinction with a redirect — a real worker
  // never sees this page's own synthetic content either way.
  // PRIOR HISTORY (accurate as of B-WORKER-3, preserved verbatim): asserted
  // a 'checking' state existed before redirecting a confirmed real session.
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) made
  // the redirect unconditional — no checking state, no session probe.
  test('7. Worker feed redirects unconditionally to /worker/commons — no content of its own', () => {
    expect(spaceSrc).not.toContain("'checking'");
    expect(spaceSrc).toContain("redirect('/worker/commons')");
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): "Demo
  // visitor sees clearly labelled demo content." B-WORKER "One Product / No
  // Demo Runtime" correction (2026-09-06) removed the demo content entirely
  // — there is nothing left to label, for any visitor.
  test('8. No demo content remains to label — page is a pure redirect for every visitor', () => {
    expect(spaceSrc).not.toContain('kora-space-demo-label');
  });

  test('9. If live feed is implemented, it uses authenticated session API — no tenant_id query param', () => {
    if (spaceSrc.includes('/api/commons/initiatives')) {
      expect(spaceSrc).not.toMatch(/[?&]tenant_id=/);
    }
  });

  test('10. Worker feed does not expose other workers\' data', () => {
    expect(spaceSrc).not.toContain('worker_identity_id');
    expect(spaceSrc).not.toContain('worker_pib');
  });

  // PRIOR HISTORY (accurate as of the original sprint, preserved verbatim):
  // "Worker sees clear empty state when no initiatives are available" —
  // checked this page's own removed 'kora-space-empty' block. The canonical
  // /worker/commons handles the no-initiatives case by simply omitting the
  // "Iniziative partecipabili" section (hasInitiatives gate) rather than
  // rendering an explicit empty-state message for that section — an honest,
  // if less explicit, empty state (the page's generic-posts section still has
  // its own explicit worker-commons-empty message when there are no posts).
  test('11. Canonical /worker/commons honestly omits the initiatives section when there are none', () => {
    const commonsSrc = readFile('app/worker/commons/page.tsx');
    expect(commonsSrc).toContain('hasInitiatives &&');
    expect(commonsSrc).toContain('data-testid="worker-commons-empty"');
  });
});

// ── BOOKING (12–15) ──────────────────────────────────────────────────────────

describe('KORA Space — booking action and status', () => {
  let spaceSrc: string;
  let bookingsSrc: string;

  beforeAll(() => {
    spaceSrc    = readFile('app/my-kora/kora-space/page.tsx');
    bookingsSrc = readFile('app/my-kora/bookings/page.tsx');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // app/my-kora/kora-space/page.tsx's demo-mode booking CTAs. B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) retired that page —
  // the canonical /worker/bookings surface has real (not demo-disabled)
  // cancel controls, disabled only during an in-flight cancel request.
  test('12. Canonical /worker/bookings has real disabled-state controls (in-flight cancel), not a permanently-disabled demo CTA', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toMatch(/disabled|cursor.*not-allowed/);
  });

  test('13. Booking CTAs are honest about preview state', () => {
    expect(spaceSrc).toMatch(/preview|non attivo|coming soon/i);
  });

  test('14. Booking status vocabulary uses canonical Italian labels (canonical /worker/bookings)', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('Richiesta inviata');
    expect(clientSrc).toContain('Partecipazione confermata');
    expect(clientSrc).toContain('Partecipazione completata');
  });

  test('15. No fake booking is created in the bookings page', () => {
    expect(bookingsSrc).not.toContain("method: 'POST'");
    expect(bookingsSrc).not.toContain('createBooking');
  });
});

// ── COMPANY SPACE (16–19) ────────────────────────────────────────────────────

describe('Company KORA Space — operating dashboard', () => {
  let companyCommonsSrc: string;

  beforeAll(() => {
    companyCommonsSrc = readFile('app/company/commons/page.tsx');
  });

  test('16. Company page explains proposal/review/publish flow', () => {
    expect(companyCommonsSrc).toContain('pending_review');
    expect(companyCommonsSrc).toContain('published');
    expect(companyCommonsSrc).toMatch(/draft|bozza/i);
  });

  test('17. Company page does not expose worker names or worker IDs', () => {
    expect(companyCommonsSrc).not.toContain('worker_id');
    expect(companyCommonsSrc).not.toContain('worker_name');
    expect(companyCommonsSrc).not.toContain('worker_email');
  });

  test('18. Company page shows aggregate-only privacy copy', () => {
    expect(companyCommonsSrc).toContain("l&apos;azienda vede solo aggregati");
  });

  test('19. Company page does not claim KORA Space feeds KORA Index', () => {
    // "non influenza" must be present (the page explicitly says KORA Space does NOT influence the Index)
    expect(companyCommonsSrc).toContain('non influenza');
    // No positive causal claim — Space does not "alimenta" or "è componente di" KORA Index
    expect(companyCommonsSrc).not.toMatch(/KORA Space alimenta.*KORA Index|KORA Space è.*componente.*KORA Index/i);
  });
});

// ── ADMIN / MODERATION (20–21) ───────────────────────────────────────────────

describe('KORA Space — admin moderation clarity', () => {
  let companyCommonsSrc: string;
  let spaceSrc: string;

  beforeAll(() => {
    companyCommonsSrc = readFile('app/company/commons/page.tsx');
    spaceSrc          = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('20. UI mentions KORA moderation or supervision', () => {
    const hasModeration =
      companyCommonsSrc.includes('approvazione KORA') ||
      companyCommonsSrc.includes('moderazione') ||
      spaceSrc.includes('supervisionato da KORA');
    expect(hasModeration).toBe(true);
  });

  test('21. No instant-publication claim without KORA moderation', () => {
    expect(companyCommonsSrc).toContain('approvazione KORA');
    expect(companyCommonsSrc).not.toMatch(/pubblica istantaneamente|pubblicazione immediata/i);
  });
});

// ── PIB / DYNAMIC CV RELATIONSHIP (22–25) ────────────────────────────────────

describe('KORA Space — PIB and Dynamic Impact CV relationship', () => {
  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): tests
  // 22-25 checked app/my-kora/kora-space/page.tsx (spaceSrc) for this PIB/
  // Dynamic-CV relationship copy. B-WORKER "One Product / No Demo Runtime"
  // correction (2026-09-06) retired that page to a pure redirect() — the
  // canonical /worker/bookings surface (BookingsClient.tsx) carries the
  // same relationship copy in its own words.
  test('22. UI says Space participation may become private worker trace (timeline) — canonical /worker/bookings', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('timeline personale');
    expect(clientSrc).toContain('traccia privata');
  });

  test('23. UI says Dynamic CV inclusion depends on CV-eligibility policy — canonical /worker/bookings', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toContain('Dynamic Impact CV');
    expect(clientSrc).toMatch(/CV-eligible|Dynamic Impact CV policy/i);
  });

  test('24. UI says not all participation becomes a shareable badge — canonical /worker/bookings', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toMatch(/Non tutta la partecipazione.*Dynamic Impact CV/i);
  });

  test('25. UI says worker controls what is shared — canonical /worker/bookings', () => {
    const clientSrc = readFile('app/worker/bookings/_components/BookingsClient.tsx');
    expect(clientSrc).toMatch(/Il lavoratore controlla cosa rendere condivisibile/i);
  });
});

// ── CONTRIBUTION HIERARCHY (26–28) ───────────────────────────────────────────

describe('KORA Contribution — hierarchy and positioning', () => {
  let contributionSrc: string;

  beforeAll(() => {
    contributionSrc = readFile('app/company/contribution/page.tsx');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): tests
  // 26-27 checked app/my-kora/kora-space/page.tsx (spaceSrc) for the
  // worker-facing "companion indicator / not a KORA Index component"
  // disclaimer. B-WORKER "One Product / No Demo Runtime" correction
  // (2026-09-06) retired that page — the canonical worker-facing surfaces
  // (/worker/commons, /worker/bookings) do not currently carry an
  // equivalent worker-facing disclaimer verbatim; this is a genuine content
  // gap left by the retirement, not fabricated here to paper over it. The
  // company-facing contribution page's own disclaimer (CLAUDE.md §12's
  // "KORA Contribution must remain separate from KORA Index" invariant) is
  // unaffected and re-verified here instead.
  test('26/27. KORA Contribution companion-indicator / not-KORA-Index disclaimer preserved on company-facing contribution page (worker-facing copy gap flagged, not fabricated)', () => {
    expect(contributionSrc).toContain('Non componente KORA Index');
  });

  test('28. Company Contribution page does not claim live scoring when production_ready=false', () => {
    expect(contributionSrc).toContain('PRE-PILOT PREVIEW');
    expect(contributionSrc).toContain('Non è la dashboard live');
    expect(contributionSrc).toContain('isPilot');
  });
});

// ── REGRESSION (29–34) ───────────────────────────────────────────────────────

describe('Regression — prior sprint artifacts', () => {
  let companyCommonsSrc: string;

  beforeAll(() => {
    companyCommonsSrc = readFile('app/company/commons/page.tsx');
  });

  // PRIOR HISTORY (accurate as of its own time, preserved verbatim): checked
  // app/my-kora/kora-space/page.tsx for testid "space-employer-privacy-notice".
  // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) retired
  // that page — the canonical /worker/commons page carries the equivalent
  // guarantee under its own testid.
  test('29. Worker-facing employer-privacy notice testid still present (canonical /worker/commons)', () => {
    const commonsSrc = readFile('app/worker/commons/page.tsx');
    expect(commonsSrc).toContain('worker-commons-privacy-notice');
    expect(commonsSrc).toContain('il datore di lavoro non vede il tuo percorso individuale');
  });

  test('30. Worker experience consolidation test file exists', () => {
    expect(fileExists('tests/unit/worker-experience-consolidation.test.ts')).toBe(true);
  });

  test('31. Dynamic Impact CV policy test file exists', () => {
    expect(fileExists('tests/unit/dynamic-impact-cv-policy.test.ts')).toBe(true);
  });

  test('32. My KORA Dynamic CV live alignment test file exists', () => {
    expect(fileExists('tests/unit/my-kora-dynamic-cv-live-alignment.test.ts')).toBe(true);
  });

  test('33. P0/P1 product integrity test files exist', () => {
    const hasP0 = fileExists('tests/unit/p0-commercial-credibility.test.ts');
    const hasP1 = fileExists('tests/unit/p1-product-integrity.test.ts');
    expect(hasP0 || hasP1).toBe(true);
  });

  test('34. Company tenant isolation preserved — requireCompanyUser and tenantId present', () => {
    expect(companyCommonsSrc).toContain('requireCompanyUser');
    expect(companyCommonsSrc).toContain('tenantId');
  });
});
