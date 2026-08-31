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

  test('2. Both KORA Space surfaces have operating-model positioning testids', () => {
    expect(companyCommonsSrc).toContain('space-operating-model');
    expect(spaceSrc).toContain('space-operating-model-worker');
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

  test('5. Worker KORA Space states individual participation remains private', () => {
    expect(spaceSrc).toContain('La partecipazione individuale resta privata');
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

  test('7. Worker feed has four-state detection — does not show synthetic data to real workers', () => {
    expect(spaceSrc).toContain("'checking'");
    expect(spaceSrc).toMatch(/setMode\(.*'live'|setMode\(.*'empty'/);
    expect(spaceSrc).not.toMatch(/isSynthetic.*demo.*setMode\('live'\)/);
  });

  test('8. Demo visitor sees clearly labelled demo content', () => {
    expect(spaceSrc).toContain('kora-space-demo-label');
    expect(spaceSrc).toMatch(/Demo preview|Dati dimostrativi/i);
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

  test('11. Worker sees clear empty state when no initiatives are available', () => {
    expect(spaceSrc).toContain('kora-space-empty');
    expect(spaceSrc).toMatch(/Nessuna iniziativa|no_data/i);
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

  test('12. Booking CTAs in kora-space demo mode are disabled', () => {
    expect(spaceSrc).toMatch(/disabled|cursor.*not-allowed/);
  });

  test('13. Booking CTAs are honest about preview state', () => {
    expect(spaceSrc).toMatch(/preview|non attivo|coming soon/i);
  });

  test('14. Booking status vocabulary uses canonical Italian labels', () => {
    expect(bookingsSrc).toContain('Richiesta inviata');
    expect(bookingsSrc).toContain('Partecipazione confermata');
    expect(bookingsSrc).toContain('Partecipazione completata');
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
  let spaceSrc: string;

  beforeAll(() => {
    spaceSrc = readFile('app/my-kora/kora-space/page.tsx');
  });

  test('22. UI says Space participation may become private worker trace (timeline)', () => {
    expect(spaceSrc).toContain('timeline personale');
    expect(spaceSrc).toContain('traccia privata');
  });

  test('23. UI says Dynamic CV inclusion depends on CV-eligibility policy', () => {
    expect(spaceSrc).toContain('Dynamic Impact CV');
    expect(spaceSrc).toMatch(/CV-eligible|Dynamic Impact CV policy/i);
  });

  test('24. UI says not all participation becomes a shareable badge', () => {
    expect(spaceSrc).toMatch(/Non tutta la partecipazione.*badge|non tutta.*diventa badge/i);
  });

  test('25. UI says worker controls what is shared', () => {
    expect(spaceSrc).toMatch(/Sei tu a decidere|il lavoratore decide/i);
  });
});

// ── CONTRIBUTION HIERARCHY (26–28) ───────────────────────────────────────────

describe('KORA Contribution — hierarchy and positioning', () => {
  let spaceSrc: string;
  let contributionSrc: string;

  beforeAll(() => {
    spaceSrc       = readFile('app/my-kora/kora-space/page.tsx');
    contributionSrc = readFile('app/company/contribution/page.tsx');
  });

  test('26. Worker KORA Space identifies Contribution as companion indicator', () => {
    expect(spaceSrc).toMatch(/indicatore companion/i);
  });

  test('27. Worker KORA Space states Contribution is not a KORA Index component', () => {
    expect(spaceSrc).toMatch(/non è una componente del KORA Index|non è il KORA Index/i);
  });

  test('28. Company Contribution page does not claim live scoring when production_ready=false', () => {
    expect(contributionSrc).toContain('PRE-PILOT PREVIEW');
    expect(contributionSrc).toContain('Non è la dashboard live');
    expect(contributionSrc).toContain('isPilot');
  });
});

// ── REGRESSION (29–34) ───────────────────────────────────────────────────────

describe('Regression — prior sprint artifacts', () => {
  let spaceSrc: string;
  let companyCommonsSrc: string;

  beforeAll(() => {
    spaceSrc          = readFile('app/my-kora/kora-space/page.tsx');
    companyCommonsSrc = readFile('app/company/commons/page.tsx');
  });

  test('29. Prior sprint testid space-employer-privacy-notice still present', () => {
    expect(spaceSrc).toContain('space-employer-privacy-notice');
    expect(spaceSrc).toContain('Il datore di lavoro non vede il tuo percorso individuale');
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
