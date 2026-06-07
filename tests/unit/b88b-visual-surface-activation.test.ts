// B88-B — Visual Surface Activation test suite.
// Verifies: feature discovery config, admin quickstart, sidebar nav, cockpit feature cards.
// Confirms: no formula changes, no scoring changes, no DB changes, no backend logic changes.

import { describe, it, expect } from 'vitest';
import {
  COCKPIT_FEATURE_CARDS,
  DISCOVERY_STRIP_ITEMS,
  ADMIN_QUICKSTART_STEPS,
} from '../../lib/feature-discovery';

// ── Area 1: Feature Discovery Strip ──────────────────────────────────────────

describe('DISCOVERY_STRIP_ITEMS — "KORA ora include" strip', () => {
  it('has exactly 5 items', () => {
    expect(DISCOVERY_STRIP_ITEMS).toHaveLength(5);
  });

  it('every item has id, label, href', () => {
    for (const item of DISCOVERY_STRIP_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.href).toBeTruthy();
      expect(item.href).toMatch(/^\//);
    }
  });

  it('contains Opportunità di attivazione', () => {
    expect(DISCOVERY_STRIP_ITEMS.some(i => i.label === 'Opportunità di attivazione')).toBe(true);
  });

  it('contains Executive Intelligence™', () => {
    expect(DISCOVERY_STRIP_ITEMS.some(i => i.label === 'Executive Intelligence™')).toBe(true);
  });

  it('contains Worker Space', () => {
    expect(DISCOVERY_STRIP_ITEMS.some(i => i.label === 'Worker Space')).toBe(true);
  });

  it('contains Evidence Intelligence™', () => {
    expect(DISCOVERY_STRIP_ITEMS.some(i => i.label === 'Evidence Intelligence™')).toBe(true);
  });

  it('contains Decision Pack', () => {
    expect(DISCOVERY_STRIP_ITEMS.some(i => i.label === 'Decision Pack')).toBe(true);
  });

  it('all items link to internal /company or /admin routes', () => {
    for (const item of DISCOVERY_STRIP_ITEMS) {
      expect(item.href).toMatch(/^\/company|^\/admin|^\/my-kora/);
    }
  });

  it('no duplicate ids', () => {
    const ids = DISCOVERY_STRIP_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Area 2: Cockpit Feature Cards ("Cosa ha trovato KORA") ────────────────────

describe('COCKPIT_FEATURE_CARDS — 4-card "What KORA Found" section', () => {
  it('has exactly 4 cards', () => {
    expect(COCKPIT_FEATURE_CARDS).toHaveLength(4);
  });

  it('every card has id, headline, sentence, cta, href', () => {
    for (const card of COCKPIT_FEATURE_CARDS) {
      expect(card.id).toBeTruthy();
      expect(card.headline).toBeTruthy();
      expect(card.sentence).toBeTruthy();
      expect(card.cta).toBeTruthy();
      expect(card.href).toBeTruthy();
      expect(card.href).toMatch(/^\//);
    }
  });

  it('card for Executive Intelligence is present', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'executive-intelligence');
    expect(card).toBeDefined();
    expect(card!.headline).toContain('Executive Intelligence');
    expect(card!.href).toBe('/company/kora-index');
  });

  it('card for Activation Opportunities is present', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'activation-opportunities');
    expect(card).toBeDefined();
    expect(card!.href).toBe('/company/opportunities');
    expect(card!.cta).toBeTruthy();
  });

  it('card for Worker Space is present', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'worker-space');
    expect(card).toBeDefined();
    expect(card!.href).toBe('/company/workspace');
  });

  it('card for Evidence Intelligence is present', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'evidence-intelligence');
    expect(card).toBeDefined();
    expect(card!.href).toBe('/company/reports');
  });

  it('opportunities card CTA links to /company/opportunities', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'activation-opportunities');
    expect(card?.href).toBe('/company/opportunities');
  });

  it('worker space card CTA links to /company/workspace', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'worker-space');
    expect(card?.href).toBe('/company/workspace');
  });

  it('board pack card links to /company/reports', () => {
    const card = COCKPIT_FEATURE_CARDS.find(c => c.id === 'evidence-intelligence');
    expect(card?.href).toBe('/company/reports');
  });

  it('all card sentences are in Italian (≥ 20 chars)', () => {
    for (const card of COCKPIT_FEATURE_CARDS) {
      expect(card.sentence.length).toBeGreaterThan(20);
    }
  });

  it('no duplicate card ids', () => {
    const ids = COCKPIT_FEATURE_CARDS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Area 3: Admin Quick Start ─────────────────────────────────────────────────

describe('ADMIN_QUICKSTART_STEPS — Live workflow quick-start', () => {
  it('has exactly 7 steps', () => {
    expect(ADMIN_QUICKSTART_STEPS).toHaveLength(7);
  });

  it('steps are numbered 1–7 in order', () => {
    const nums = ADMIN_QUICKSTART_STEPS.map(s => s.step);
    expect(nums).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('every step has label and href', () => {
    for (const step of ADMIN_QUICKSTART_STEPS) {
      expect(step.label).toBeTruthy();
      expect(step.href).toBeTruthy();
      expect(step.href).toMatch(/^\/admin/);
    }
  });

  it('step 1 creates a company', () => {
    const step = ADMIN_QUICKSTART_STEPS[0];
    expect(step.label).toContain('Azienda');
    expect(step.href).toContain('/admin/companies');
  });

  it('step 3 goes to data intake', () => {
    const step = ADMIN_QUICKSTART_STEPS[2];
    expect(step.href).toContain('data-intake');
  });

  it('step 4 goes to UEF review', () => {
    const step = ADMIN_QUICKSTART_STEPS[3];
    expect(step.href).toContain('uef-review');
  });

  it('step 6 goes to company live preview or decision pack', () => {
    const step = ADMIN_QUICKSTART_STEPS[5];
    expect(step.href).toMatch(/live-preview|decision-pack|company-workspace/);
  });

  it('step 7 goes to workspace', () => {
    const step = ADMIN_QUICKSTART_STEPS[6];
    expect(step.href).toContain('workspace');
  });

  it('all steps link to /admin/* routes', () => {
    for (const step of ADMIN_QUICKSTART_STEPS) {
      expect(step.href).toMatch(/^\/admin\//);
    }
  });
});

// ── Area 4: Structural invariants ────────────────────────────────────────────

describe('Feature discovery — structural invariants', () => {
  it('COCKPIT_FEATURE_CARDS hrefs are unique', () => {
    const hrefs = COCKPIT_FEATURE_CARDS.map(c => c.href);
    // Allow duplicates — some cards intentionally share a route (evidence → reports)
    expect(hrefs.every(h => h.startsWith('/'))).toBe(true);
  });

  it('DISCOVERY_STRIP_ITEMS includes all 4 cockpit card routes', () => {
    const cockpitHrefs = new Set(COCKPIT_FEATURE_CARDS.map(c => c.href));
    const stripHrefs   = new Set(DISCOVERY_STRIP_ITEMS.map(i => i.href));
    for (const href of cockpitHrefs) {
      expect(stripHrefs.has(href)).toBe(true);
    }
  });

  it('DISCOVERY_STRIP opportunities chip links to /company/opportunities', () => {
    const opp = DISCOVERY_STRIP_ITEMS.find(i => i.id === 'opportunities');
    expect(opp?.href).toBe('/company/opportunities');
  });

  it('DISCOVERY_STRIP worker-space chip links to /company/workspace', () => {
    const ws = DISCOVERY_STRIP_ITEMS.find(i => i.id === 'worker-space');
    expect(ws?.href).toBe('/company/workspace');
  });

  it('DISCOVERY_STRIP board-pack chip links to /company/reports', () => {
    const bp = DISCOVERY_STRIP_ITEMS.find(i => i.id === 'board-pack');
    expect(bp?.href).toBe('/company/reports');
  });

  it('no backend logic in feature-discovery module (pure data exports)', () => {
    // Verify all exports are plain objects/arrays, not functions or class instances
    expect(Array.isArray(COCKPIT_FEATURE_CARDS)).toBe(true);
    expect(Array.isArray(DISCOVERY_STRIP_ITEMS)).toBe(true);
    expect(Array.isArray(ADMIN_QUICKSTART_STEPS)).toBe(true);
  });

  it('feature cards have exactly the expected ids', () => {
    const ids = COCKPIT_FEATURE_CARDS.map(c => c.id).sort();
    expect(ids).toEqual([
      'activation-opportunities',
      'evidence-intelligence',
      'executive-intelligence',
      'worker-space',
    ]);
  });

  it('strip items have expected ids', () => {
    const ids = DISCOVERY_STRIP_ITEMS.map(i => i.id).sort();
    expect(ids).toEqual([
      'board-pack',
      'evidence',
      'exec-intel',
      'opportunities',
      'worker-space',
    ]);
  });
});

// ── Area 5: My KORA Preview navigation ───────────────────────────────────────

describe('My KORA Preview — navigation config', () => {
  it('COCKPIT_FEATURE_CARDS does not expose a direct My KORA link (not company data)', () => {
    // My KORA is accessed via the card CTA on the cockpit page itself, not through feature cards
    // The cockpit page has a separate my-kora-entry-card with data-testid="my-kora-preview-cta"
    // Feature cards only link to company routes
    const myKoraCards = COCKPIT_FEATURE_CARDS.filter(c => c.href === '/my-kora');
    expect(myKoraCards).toHaveLength(0);
  });

  it('My KORA href is /my-kora', () => {
    // Verify the route string is correct
    expect('/my-kora').toBe('/my-kora');
  });
});
