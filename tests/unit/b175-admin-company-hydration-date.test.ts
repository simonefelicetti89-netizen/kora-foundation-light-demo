// tests/unit/b175-admin-company-hydration-date.test.ts
// B175: anti-regression guard for the hydration-mismatch risk identified by
// DEMO-DEP-RO — app/admin/companies/[companyId]/page.tsx used to render
// `new Date().toLocaleDateString('it-IT')` directly in JSX, in a 'use client'
// component with no mount gate. That value can differ between the server's
// ICU build and the browser's Intl implementation (and across the render/
// hydration wall-clock gap), producing a React hydration mismatch.
//
// Pure fs.readFileSync — no runtime, no DOM, no Supabase. Consistent with
// this codebase's existing convention for static boundary/regression guards
// (see tests/unit/b133-company-live-residual-cleanup.test.ts,
// tests/unit/demo-guard-01-kora-index-evidence-fallback.test.ts).

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const PAGE = 'app/admin/companies/[companyId]/page.tsx';

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('B175 — no direct new Date() rendered in JSX render path', () => {
  const src = read(PAGE);

  it('does not render new Date().toLocaleDateString(...) directly', () => {
    expect(src).not.toMatch(/\{\s*new Date\(\)\.toLocaleDateString/);
  });

  it('does not contain the bare unguarded expression anywhere in the file', () => {
    // The only date-formatting call in the file must be inside the useEffect
    // callback (mount-gated), never spliced straight into JSX.
    const occurrences = src.match(/new Date\(\)\.toLocaleDateString\('it-IT'\)/g) ?? [];
    expect(occurrences.length).toBe(1);
  });
});

describe('B175 — safe mounted-date state pattern is present', () => {
  const src = read(PAGE);

  it('imports useEffect', () => {
    expect(src).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*'react'/);
  });

  it('declares a todayLabel state initialized to null', () => {
    expect(src).toContain("const [todayLabel, setTodayLabel] = useState<string | null>(null);");
  });

  it('sets todayLabel inside a mount-only useEffect (empty dependency array)', () => {
    expect(src).toMatch(/useEffect\(\(\) => \{\s*setTodayLabel\(new Date\(\)\.toLocaleDateString\('it-IT'\)\);\s*\}, \[\]\);/);
  });

  it('renders todayLabel with a stable pre-mount placeholder', () => {
    expect(src).toContain("{todayLabel ?? '—'}");
  });
});

describe('B175 — no other new-Date/random/browser-only patterns introduced in this file', () => {
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

  it('window/navigator are not referenced during render', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('navigator.');
  });
});
