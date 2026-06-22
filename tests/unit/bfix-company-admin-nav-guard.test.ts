// tests/unit/bfix-company-admin-nav-guard.test.ts
// Fix: COMPANY_ADMIN sidebar derivation guard
//
// Due invarianti verificate:
//
// 1. buildNavGroups('COMPANY_ADMIN') → sempre 5 gruppi company, mai ADMIN_NAV_GROUPS.
//
// 2. resolveNavRole — tre sotto-casi distinti:
//    a) realRole confermato (COMPANY_ADMIN, WORKER...) → sessione vince su activeRole stale
//    b) realRole pending (undefined) → activeRole admin NON produce nav admin (anti-flash)
//    c) realRole null (no sessione) → demo mode, activeRole usato as-is
//
// Il mismatch di hydration (activeRole='KORA_ADMIN' stale + sessione='COMPANY_ADMIN')
// non deve mai produrre ADMIN_NAV_GROUPS, nemmeno durante il pending iniziale.

import { describe, it, expect } from 'vitest';
import { buildNavGroups, resolveNavRole } from '../../components/layout/Sidebar';
import { ADMIN_NAV_GROUPS } from '../../lib/navigation/admin-nav-groups';

const EXPECTED_COMPANY_HEADINGS = ['Command', 'Intelligence', 'Evidence & Report', 'Network', 'Governance'];
const ADMIN_HEADINGS = ADMIN_NAV_GROUPS.map((g) => g.label);
const ADMIN_HREFS    = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

// ── 1. buildNavGroups — contratto COMPANY_ADMIN ───────────────────────────────

describe('COMPANY_ADMIN nav guard — buildNavGroups', () => {

  it('COMPANY_ADMIN returns exactly 5 groups', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    expect(groups).toHaveLength(5);
  });

  it('COMPANY_ADMIN group headings match canonical company structure', () => {
    const headings = buildNavGroups('COMPANY_ADMIN').map((g) => g.heading);
    expect(headings).toEqual(EXPECTED_COMPANY_HEADINGS);
  });

  it('COMPANY_ADMIN groups contain no admin headings', () => {
    const headings = buildNavGroups('COMPANY_ADMIN').map((g) => g.heading);
    for (const adminHeading of ADMIN_HEADINGS) {
      expect(headings).not.toContain(adminHeading);
    }
  });

  it('COMPANY_ADMIN items contain no /admin/ hrefs', () => {
    const allHrefs = buildNavGroups('COMPANY_ADMIN').flatMap((g) => g.items.map((i) => i.href));
    for (const href of allHrefs) {
      expect(href).not.toMatch(/^\/admin/);
    }
  });

  it('COMPANY_ADMIN items contain no admin nav hrefs', () => {
    const allHrefs = buildNavGroups('COMPANY_ADMIN').flatMap((g) => g.items.map((i) => i.href));
    for (const adminHref of ADMIN_HREFS) {
      expect(allHrefs).not.toContain(adminHref);
    }
  });

  it('KORA_ADMIN returns admin groups (control: guard deve essere role-specific)', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const headings = groups.map((g) => g.heading);
    expect(headings.some((h) => ADMIN_HEADINGS.includes(h))).toBe(true);
  });

  it('COMPANY_ADMIN with companyId still returns 5 company groups (not admin)', () => {
    const groups = buildNavGroups('COMPANY_ADMIN', 'meridiana-group');
    expect(groups).toHaveLength(5);
    const headings = groups.map((g) => g.heading);
    expect(headings).toEqual(EXPECTED_COMPANY_HEADINGS);
  });

  it('COMPANY_ADMIN Command group contains Executive Cockpit', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    const cmd = groups.find((g) => g.heading === 'Command');
    expect(cmd?.items.find((i) => i.href === '/company')).toBeDefined();
  });

  it('COMPANY_ADMIN all hrefs start with /company', () => {
    const allHrefs = buildNavGroups('COMPANY_ADMIN').flatMap((g) => g.items.map((i) => i.href));
    for (const href of allHrefs) {
      expect(href).toMatch(/^\/company/);
    }
  });
});

// ── 2a. resolveNavRole — sessione confermata (realRole non-null, non-undefined) ─

describe('resolveNavRole — sessione confermata', () => {

  it('BUG SCENARIO: stale activeRole=KORA_ADMIN + sessione confermata COMPANY_ADMIN → COMPANY_ADMIN', () => {
    expect(resolveNavRole('COMPANY_ADMIN', 'KORA_ADMIN')).toBe('COMPANY_ADMIN');
  });

  it('sessione COMPANY_ADMIN + activeRole corretto → COMPANY_ADMIN', () => {
    expect(resolveNavRole('COMPANY_ADMIN', 'COMPANY_ADMIN')).toBe('COMPANY_ADMIN');
  });

  it('sessione WORKER + stale activeRole=COMPANY_ADMIN → WORKER', () => {
    expect(resolveNavRole('WORKER', 'COMPANY_ADMIN')).toBe('WORKER');
  });

  it('sessione PARTNER + qualsiasi activeRole → PARTNER', () => {
    expect(resolveNavRole('PARTNER', 'COMPANY_ADMIN')).toBe('PARTNER');
    expect(resolveNavRole('PARTNER', 'KORA_ADMIN')).toBe('PARTNER');
  });

  it('sessione KORA_ADMIN → usa activeRole (demo-state guida per role-switching)', () => {
    expect(resolveNavRole('KORA_ADMIN', 'COMPANY_ADMIN')).toBe('COMPANY_ADMIN');
    expect(resolveNavRole('KORA_ADMIN', 'KORA_ADMIN')).toBe('KORA_ADMIN');
    expect(resolveNavRole('KORA_ADMIN', 'WORKER')).toBe('WORKER');
  });

  it('AUTHENTICATED (provisioning gap) → usa activeRole', () => {
    expect(resolveNavRole('AUTHENTICATED', 'COMPANY_ADMIN')).toBe('COMPANY_ADMIN');
  });
});

// ── 2b. resolveNavRole — stato PENDING (realRole === undefined) ───────────────
//
// undefined ≠ null. undefined = "non so ancora" (getSession non ha ancora risposto).
// In questo stato NON si può mostrare nav admin perché non c'è certezza del ruolo.
// Se activeRole è admin (possibilmente stale), si usa un fallback sicuro non-admin.

describe('resolveNavRole — stato pending (realRole === undefined)', () => {

  it('pending + activeRole=KORA_ADMIN → COMPANY_ADMIN (anti-flash: non si produce nav admin senza certezza)', () => {
    const role = resolveNavRole(undefined, 'KORA_ADMIN');
    expect(role).toBe('COMPANY_ADMIN');
  });

  it('pending + activeRole=KORA_ADMIN → buildNavGroups produce 5 gruppi company, mai ADMIN_NAV_GROUPS', () => {
    const navRole = resolveNavRole(undefined, 'KORA_ADMIN');
    const groups  = buildNavGroups(navRole);
    expect(groups).toHaveLength(5);
    expect(groups.map((g) => g.heading)).toEqual(EXPECTED_COMPANY_HEADINGS);
    for (const adminHeading of ADMIN_HEADINGS) {
      expect(groups.map((g) => g.heading)).not.toContain(adminHeading);
    }
    const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    for (const adminHref of ADMIN_HREFS) {
      expect(allHrefs).not.toContain(adminHref);
    }
  });

  it('pending + activeRole non-admin → usa activeRole as-is (sicuro: nav non privilegiata)', () => {
    expect(resolveNavRole(undefined, 'COMPANY_ADMIN')).toBe('COMPANY_ADMIN');
    expect(resolveNavRole(undefined, 'WORKER')).toBe('WORKER');
    expect(resolveNavRole(undefined, 'PARTNER')).toBe('PARTNER');
  });

  it('pending + activeRole=KORA_ADMIN → navRole non è mai KORA_ADMIN', () => {
    expect(resolveNavRole(undefined, 'KORA_ADMIN')).not.toBe('KORA_ADMIN');
  });
});

// ── 2c. resolveNavRole — no sessione (realRole === null) ─────────────────────
//
// null = "risolto: nessuna sessione". Distinto da undefined (non ancora risolto).
// In demo mode senza sessione, activeRole guida il nav (visitatore demo).

describe('resolveNavRole — no sessione (realRole === null)', () => {

  it('null + activeRole=COMPANY_ADMIN → COMPANY_ADMIN (demo mode)', () => {
    expect(resolveNavRole(null, 'COMPANY_ADMIN')).toBe('COMPANY_ADMIN');
  });

  it('null + activeRole=KORA_ADMIN → KORA_ADMIN (demo mode, visitatore non autenticato)', () => {
    // null è diverso da undefined: la sessione è risolta (assente), non pending.
    // In demo mode puro, un visitatore può vedere nav admin via demo state.
    expect(resolveNavRole(null, 'KORA_ADMIN')).toBe('KORA_ADMIN');
  });

  it('null + activeRole=WORKER → WORKER', () => {
    expect(resolveNavRole(null, 'WORKER')).toBe('WORKER');
  });
});

// ── 3. End-to-end: mismatch hydration scenario completo ──────────────────────

describe('resolveNavRole — scenario mismatch hydration end-to-end', () => {

  it('stale KORA_ADMIN activeRole non produce mai ADMIN_NAV_GROUPS in nessuno stato', () => {
    const scenarios: Array<[string | null | undefined, string]> = [
      ['COMPANY_ADMIN', 'KORA_ADMIN'], // sessione confermata
      [undefined,       'KORA_ADMIN'], // pending
      // null + 'KORA_ADMIN' è demo mode puro — il visitatore può vedere admin nav (by design)
    ];
    for (const [realRole, activeRole] of scenarios) {
      const navRole = resolveNavRole(realRole, activeRole);
      const groups  = buildNavGroups(navRole);
      const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
      for (const adminHref of ADMIN_HREFS) {
        expect(allHrefs).not.toContain(adminHref);
      }
      for (const adminHeading of ADMIN_HEADINGS) {
        expect(groups.map((g) => g.heading)).not.toContain(adminHeading);
      }
    }
  });
});
