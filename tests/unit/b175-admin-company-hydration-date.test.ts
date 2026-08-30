// tests/unit/b175-admin-company-hydration-date.test.ts
// B175: anti-regression guard for the hydration-mismatch risk identified by
// DEMO-DEP-RO — app/admin/companies/[companyId]/page.tsx used to render
// `new Date().toLocaleDateString('it-IT')` directly in JSX, in a 'use client'
// component with no mount gate. That value can differ between the server's
// ICU build and the browser's Intl implementation (and across the render/
// hydration wall-clock gap), producing a React hydration mismatch.
//
// B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): the page this
// guarded was retired outright — it is now a server-only redirect
// (requireKoraAdmin → redirect to the Gen 3 workspace tab), with no client
// component, no JSX render, and therefore no hydration surface at all. The
// original risk (client-only date formatting racing server/browser ICU) is
// structurally impossible now, not just fixed — there is nothing left to
// mount-gate. This file is updated, not deleted, to keep the historical
// record and to re-fail loudly if a future change reintroduces client-side
// date rendering on this route.
//
// Pure fs.readFileSync — no runtime, no DOM, no Supabase.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PAGE = 'app/admin/companies/[companyId]/page.tsx';

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('B175 — retired route has no client-side date rendering at all (Wave 3 Hardening)', () => {
  const src = read(PAGE);

  it('is a server component (no "use client")', () => {
    expect(src).not.toContain("'use client'");
  });

  it('does not render new Date().toLocaleDateString(...) anywhere', () => {
    expect(src).not.toMatch(/new Date\(\)\.toLocaleDateString/);
  });

  it('no longer uses useState/useEffect for a mounted-date pattern (nothing to mount-gate)', () => {
    expect(src).not.toContain('useState');
    expect(src).not.toContain('useEffect');
    expect(src).not.toContain('todayLabel');
  });

  it('is a thin redirect: requireKoraAdmin then redirect to the Gen 3 workspace tab', () => {
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('redirect(`/admin/companies/${companyId}/workspace`)');
  });
});

describe('B175 — no other new-Date/random/browser-only patterns present', () => {
  const src = read(PAGE);

  it('Date.now() is not used', () => {
    expect(src).not.toContain('Date.now(');
  });

  it('Math.random() is not used', () => {
    expect(src).not.toContain('Math.random(');
  });

  it('localStorage/sessionStorage are not used', () => {
    expect(src).not.toContain('localStorage');
    expect(src).not.toContain('sessionStorage');
  });

  it('window/navigator are not referenced', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('navigator.');
  });
});
