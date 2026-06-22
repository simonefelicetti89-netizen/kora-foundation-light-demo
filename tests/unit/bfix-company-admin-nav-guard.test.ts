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
import { buildNavGroups, resolveNavRole, NAV_PENDING } from '../../components/layout/Sidebar';
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
// Qualunque activeRole sia in demo-state, il navRole è PENDING — nessun ruolo viene
// indovinato. La Sidebar renderizza uno skeleton con ZERO href nel DOM.

describe('resolveNavRole — stato pending (realRole === undefined)', () => {

  it('pending + activeRole=KORA_ADMIN → NAV_PENDING (nessun ruolo indovinato)', () => {
    expect(resolveNavRole(undefined, 'KORA_ADMIN')).toBe(NAV_PENDING);
  });

  it('pending + activeRole=COMPANY_ADMIN → NAV_PENDING', () => {
    expect(resolveNavRole(undefined, 'COMPANY_ADMIN')).toBe(NAV_PENDING);
  });

  it('pending + activeRole=WORKER → NAV_PENDING', () => {
    expect(resolveNavRole(undefined, 'WORKER')).toBe(NAV_PENDING);
  });

  it('pending + activeRole=PARTNER → NAV_PENDING', () => {
    expect(resolveNavRole(undefined, 'PARTNER')).toBe(NAV_PENDING);
  });

  it('buildNavGroups(NAV_PENDING) restituisce [] — zero gruppi, zero href nel DOM', () => {
    const groups = buildNavGroups(NAV_PENDING);
    expect(groups).toHaveLength(0);
    expect(groups.flatMap((g) => g.items)).toHaveLength(0);
  });

  it('buildNavGroups(NAV_PENDING) non contiene nessun href admin', () => {
    const allHrefs = buildNavGroups(NAV_PENDING).flatMap((g) => g.items.map((i) => i.href));
    for (const adminHref of ADMIN_HREFS) {
      expect(allHrefs).not.toContain(adminHref);
    }
  });

  it('buildNavGroups(NAV_PENDING) non contiene nessun href /company', () => {
    const allHrefs = buildNavGroups(NAV_PENDING).flatMap((g) => g.items.map((i) => i.href));
    for (const href of allHrefs) {
      expect(href).not.toMatch(/^\/company/);
      expect(href).not.toMatch(/^\/admin/);
    }
  });

  it('pending: navRole non è mai KORA_ADMIN, indipendentemente da activeRole', () => {
    for (const role of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      expect(resolveNavRole(undefined, role)).not.toBe('KORA_ADMIN');
      expect(resolveNavRole(undefined, role)).not.toBe('COMPANY_ADMIN');
      expect(resolveNavRole(undefined, role)).toBe(NAV_PENDING);
    }
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

  it('sessione confermata COMPANY_ADMIN con stale activeRole=KORA_ADMIN → nav company, zero href admin', () => {
    const navRole  = resolveNavRole('COMPANY_ADMIN', 'KORA_ADMIN');
    expect(navRole).toBe('COMPANY_ADMIN');
    const groups   = buildNavGroups(navRole);
    const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    for (const adminHref of ADMIN_HREFS) {
      expect(allHrefs).not.toContain(adminHref);
    }
  });

  it('pending con qualsiasi activeRole → navRole=PENDING → buildNavGroups restituisce [] → zero href nel DOM', () => {
    for (const activeRole of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER']) {
      const navRole  = resolveNavRole(undefined, activeRole);
      expect(navRole).toBe(NAV_PENDING);
      const groups   = buildNavGroups(navRole);
      expect(groups).toHaveLength(0);
      const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
      expect(allHrefs).toHaveLength(0);
    }
  });

  it('ciclo completo pending→risolto: la nav corretta appare solo una volta (nessun ruolo intermedio)', () => {
    // Stato 1 — pending: nessun href
    const pendingNav = buildNavGroups(resolveNavRole(undefined, 'KORA_ADMIN'));
    expect(pendingNav).toHaveLength(0);

    // Stato 2 — risolto KORA_ADMIN (usa activeRole=KORA_ADMIN per role preview)
    const resolvedNavAdmin = buildNavGroups(resolveNavRole('KORA_ADMIN', 'KORA_ADMIN'));
    expect(resolvedNavAdmin.some((g) => ADMIN_HEADINGS.includes(g.heading))).toBe(true);

    // Stato 2 alternativo — risolto COMPANY_ADMIN (sessione reale, activeRole stale)
    const resolvedNavCompany = buildNavGroups(resolveNavRole('COMPANY_ADMIN', 'KORA_ADMIN'));
    expect(resolvedNavCompany.map((g) => g.heading)).toEqual(EXPECTED_COMPANY_HEADINGS);
  });
});
