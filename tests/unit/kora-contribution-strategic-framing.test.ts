/**
 * KORA Contribution™ — Strategic Framing & No-DB Hardening
 *
 * 21 static source-analysis tests verifying:
 *   1. Companion indicator framing (not KORA Index component)
 *   2. No ranking / surveillance / rewards
 *   3. No CSRD/ESRS/compliance overclaim
 *   4. No value-chain/filiera overclaim; explicit KORA Value Chain separation
 *   5. production_ready gate preserved on all live paths
 *   6. Roadmap doc existence and correct future-phase language
 *   7. Architecture invariants (family count, calibration status)
 *
 * Static analysis only — no DB, no migration, no runtime calls.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(ROOT, rel));
}

const CONTRIBUTION_SERVICE = 'services/kora-contribution/KoraContributionService.ts';
const CONTRIBUTION_PAGE    = 'app/company/contribution/page.tsx';
const CONTRIBUTION_VIEWS   = 'lib/commons/contribution-views.ts';
const FAMILY_DETECTOR      = 'lib/kora-engine/contribution-family-detector.ts';
const ROADMAP_DOC          = 'docs/KORA_CONTRIBUTION_ROADMAP.md';

// ── Section 1: Companion indicator framing (1–5) ──────────────────────────────

describe('KORA Contribution — companion indicator framing', () => {
  let page: string;
  let service: string;

  beforeAll(() => {
    page    = read(CONTRIBUTION_PAGE);
    service = read(CONTRIBUTION_SERVICE);
  });

  test('1. Contribution page header declares "Indicatore Companion" label', () => {
    expect(page).toContain('Indicatore Companion');
  });

  test('2. Contribution page methodology notice says non è componente del KORA Index', () => {
    expect(page).toContain('non è una componente del KORA Index');
  });

  test('3. KoraContributionService has is_kora_index_component: false literal', () => {
    expect(service).toContain('is_kora_index_component: false');
  });

  test('4. ContributionSummary interface has notKoraIndexComponent: true', () => {
    expect(service).toContain('notKoraIndexComponent: true');
    expect(service).toContain('notKoraIndexComponent:  true');
  });

  test('5. KoraContributionService comment confirms companion indicator doctrine', () => {
    expect(service).toContain('companion indicator');
    expect(service).toContain('NON componente KORA Index');
  });
});

// ── Section 2: No ranking / surveillance / rewards (6–8) ──────────────────────

describe('KORA Contribution — no ranking, no rewards, no leaderboard', () => {
  let service: string;

  beforeAll(() => { service = read(CONTRIBUTION_SERVICE); });

  test('6. ContributionSummary type has noRanking: true', () => {
    expect(service).toContain('noRanking: true');
    expect(service).toContain('noRanking:              true');
  });

  test('7. ContributionSummary type has noRewards: true', () => {
    expect(service).toContain('noRewards: true');
    expect(service).toContain('noRewards:              true');
  });

  test('8. ContributionSummary type has noLeaderboard: true', () => {
    expect(service).toContain('noLeaderboard: true');
    expect(service).toContain('noLeaderboard:          true');
  });
});

// ── Section 3: No CSRD/ESRS/compliance overclaim (9–11) ──────────────────────

describe('KORA Contribution — no CSRD/ESRS/compliance overclaim', () => {
  let service: string;
  let page: string;

  beforeAll(() => {
    service = read(CONTRIBUTION_SERVICE);
    page    = read(CONTRIBUTION_PAGE);
  });

  test('9. KoraContributionService source does not claim CSRD or ESRS compliance', () => {
    // The service must never assert CSRD/ESRS compliance — only the standard disclaimer is allowed
    expect(service).not.toMatch(/certif[ia]\w*.*CSRD/i);
    expect(service).not.toMatch(/CSRD.*certif[ia]/i);
    expect(service).not.toMatch(/ESRS.*compli/i);
    expect(service).not.toMatch(/compli.*ESRS/i);
  });

  test('10. Contribution page does not claim CSRD/ESRS compliance', () => {
    // Page must not claim CSRD/ESRS certification or mandatory compliance
    expect(page).not.toMatch(/certif[ia]\w*.*CSRD/i);
    expect(page).not.toMatch(/certif[ia]\w*.*ESRS/i);
    expect(page).not.toMatch(/CSRD.*garantisce/i);
    expect(page).not.toMatch(/ESRS.*obbligatori/i);
  });

  test('11. Contribution page has canonical ESG disclaimer (supporta, non garantisce)', () => {
    // Canonical disclaimer required by CLAUDE.md §17
    expect(page).toContain('KORA supporta la rendicontazione CSR/ESG');
    expect(page).toContain('Non garantisce conformità normativa');
    expect(page).toContain('non sostituisce consulenza ESG');
  });
});

// ── Section 4: No value-chain/filiera overclaim; explicit separation (12–14) ──

describe('KORA Contribution — no value-chain overclaim; KORA Value Chain is separate', () => {
  let service: string;
  let page: string;

  beforeAll(() => {
    service = read(CONTRIBUTION_SERVICE);
    page    = read(CONTRIBUTION_PAGE);
  });

  test('12. KoraContributionService does not import or use value_chain_supplier_count', () => {
    expect(service).not.toContain('value_chain_supplier_count');
  });

  test('13. Contribution page has explicit KORA Value Chain separation block', () => {
    expect(page).toContain('contribution-value-chain-separation');
  });

  test('14. Contribution page separation block frames KORA Value Chain as future/separate product', () => {
    // The separation block must say KORA Contribution ≠ KORA Value Chain and position it as future
    const sepBlock = page.match(/contribution-value-chain-separation[\s\S]{0,2000}/)?.[0] ?? '';
    expect(sepBlock).toContain('KORA Value Chain');
    expect(sepBlock).toMatch(/post-pilot|roadmap|future vision|non attivo/i);
    expect(sepBlock).toMatch(/separato|separate/i);
  });
});

// ── Section 5: production_ready gate preserved (15–17) ────────────────────────

describe('KORA Contribution — production_ready gate on all live paths', () => {
  let service: string;

  beforeAll(() => { service = read(CONTRIBUTION_SERVICE); });

  test('15. getContributionLive is gated on production_ready', () => {
    const liveBlock = service.match(/async function getContributionLive[\s\S]{0,800}/)?.[0] ?? '';
    expect(liveBlock).toContain('production_ready');
    expect(liveBlock).toMatch(/if \(!tenant.*production_ready\)/);
  });

  test('16. getContributionPromoterView is gated on production_ready', () => {
    const promoterBlock = service.match(/async function getContributionPromoterView[\s\S]{0,800}/)?.[0] ?? '';
    expect(promoterBlock).toContain('production_ready');
    expect(promoterBlock).toMatch(/if \(!tenant.*production_ready\)/);
  });

  test('17. getContributionOriginEmployerView is gated on production_ready', () => {
    const originBlock = service.match(/async function getContributionOriginEmployerView[\s\S]{0,800}/)?.[0] ?? '';
    expect(originBlock).toContain('production_ready');
    expect(originBlock).toMatch(/if \(!tenant.*production_ready\)/);
  });
});

// ── Section 6: Roadmap doc existence and content (18–20) ─────────────────────

describe('KORA Contribution — roadmap doc existence and strategic language', () => {
  let roadmap: string;

  beforeAll(() => { roadmap = exists(ROADMAP_DOC) ? read(ROADMAP_DOC) : ''; });

  test('18. docs/KORA_CONTRIBUTION_ROADMAP.md exists', () => {
    expect(exists(ROADMAP_DOC)).toBe(true);
  });

  test('19. Roadmap doc defines KORA Value Chain as a SEPARATE future product', () => {
    expect(roadmap).toContain('KORA Value Chain');
    expect(roadmap).toMatch(/separato|separate/i);
    expect(roadmap).toMatch(/future vision|roadmap|post-pilot/i);
  });

  test('20. Roadmap doc mentions Foundation Light and pre_empirical_calibration', () => {
    expect(roadmap).toContain('Foundation Light');
    expect(roadmap).toContain('pre_empirical_calibration');
  });
});

// ── Section 7: Architecture invariants (21) ───────────────────────────────────

describe('KORA Contribution — architecture invariants', () => {
  test('21. Family detector exports exactly 3 CONTRIBUTION_ACTION_FAMILIES (not more, not less)', () => {
    const src = read(FAMILY_DETECTOR);
    // Extract the array literal content
    const match = src.match(/CONTRIBUTION_ACTION_FAMILIES.*?=\s*\[([\s\S]*?)\]/);
    expect(match).not.toBeNull();
    const items = (match?.[1] ?? '')
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter((s) => s.length > 0 && !s.startsWith('//'));
    expect(items).toHaveLength(3);
    expect(items).toContain('territorial_impact');
    expect(items).toContain('inclusion_and_connection');
    expect(items).toContain('future_and_legacy');
  });
});

// ── Section 8: UI labeling consistency (22–26) ────────────────────────────────

const SIDEBAR = 'components/layout/Sidebar.tsx';

describe('KORA Contribution — UI labeling consistency (micro-fix smoke)', () => {
  let sidebar: string;
  let page: string;
  let service: string;

  beforeAll(() => {
    sidebar  = read(SIDEBAR);
    page     = read(CONTRIBUTION_PAGE);
    service  = read(CONTRIBUTION_SERVICE);
  });

  test('22. Sidebar nav entry for /company/contribution uses full label "KORA Contribution™"', () => {
    // The nav label must include the full canonical name, not bare "Contribution"
    expect(sidebar).toContain("href: '/company/contribution', label: 'KORA Contribution™'");
    expect(sidebar).not.toContain("href: '/company/contribution', label: 'Contribution'");
  });

  test('23. Contribution page FL preview score section has data-testid="contribution-score-presentation-mode"', () => {
    expect(page).toContain('data-testid="contribution-score-presentation-mode"');
  });

  test('24. Score presentation mode data-value is wired to flPreview.scorePresentationMode', () => {
    // The data-value attribute must read from the service output, not a hardcoded literal
    expect(page).toContain('data-value={flPreview.scorePresentationMode}');
  });

  test('25. KoraContributionService scorePresentationMode resolves to "provisional_demo_only"', () => {
    // The service must output this exact string (read from getContributionConfig)
    expect(service).toContain("scorePresentationMode:  'provisional_demo_only'");
  });

  test('26. Contribution page synthetic/demo-only framing visible via PRE-PILOT PREVIEW badge', () => {
    expect(page).toContain('PRE-PILOT PREVIEW');
    expect(page).toContain('Dati sintetici dimostrativi');
    expect(page).toContain('Non rappresentano dati reali');
  });
});
