// tests/unit/kora-wp-047-design-system-a11y.test.ts
// KORA-WP-047 — Design System / A11y / IA — Pilot Slice.
//
// Contract: pre-check `.kora-audit/output/192_KORA_WP047_CANONICAL_PRECHECK.md`,
// `docs/EXPERIENCE_LAYER.md` §6 (Accessibilità Baseline) and §8 (anti-
// regression rules), `docs/30-kora-brand-visual-product-experience-
// constitution.md` §21 (Accessibility and Readability Rules).
//
// This repository has no DOM-rendering test environment (vitest.config.ts
// runs `environment: 'node'`, no testing-library/jsdom installed, no
// existing precedent anywhere in tests/ for rendering a React component)
// — per this task's own explicit instruction to avoid introducing heavy
// new tooling, this suite uses the SAME structural source-code assertion
// pattern already established pervasively across this codebase's own
// test suite (readFileSync + string/regex assertions on component
// source), not a new testing-library dependency.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

function readSource(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

const REMEDIATED_TOKEN_FILES = [
  'components/ui/PageMasthead.tsx',
  'components/ui/Tabs.tsx',
  'components/ui/Field.tsx',
  'components/ui/Explainer.tsx',
  'components/ui/Tooltip.tsx',
  'components/ui/Button.tsx',
  'components/layout/Header.tsx',
];

// ── TASK 7 — hex/token anti-regression guard ────────────────────────────────
// Scoped to exactly the files WP-047's own pre-check (192) found in
// violation — not a repository-wide ban (EXPERIENCE_LAYER.md §8 rule 2
// governs "components," and `lib/design/kora-design-tokens.ts` itself is
// the legitimate, intended source of literal hex values; banning hex
// everywhere would be incorrect and would break the token file itself).

describe('KORA-WP-047 — design-token anti-regression guard (EXPERIENCE_LAYER.md §8 rule 2)', () => {
  const HEX_LITERAL = /#[0-9A-Fa-f]{6}\b/;

  for (const file of REMEDIATED_TOKEN_FILES) {
    it(`${file}: contains no literal hex color in actual style values (comments excluded)`, () => {
      const codeOnly = readSource(file)
        .split('\n')
        .filter((l) => !/^\s*\/\//.test(l))
        .map((l) => l.replace(/\/\/.*$/, '')) // strip trailing line comments too (e.g. "// was '#C76F3D' — now token")
        .join('\n');
      expect(codeOnly).not.toMatch(HEX_LITERAL);
    });
  }
});

// ── TASK 4/3 — component-level accessibility structural guards ─────────────

describe('KORA-WP-047 — Tabs.tsx accessibility (WAI-ARIA Tabs pattern)', () => {
  const src = readSource('components/ui/Tabs.tsx');

  it('uses the correct ARIA roles: tablist, tab, tabpanel', () => {
    expect(src).toMatch(/role="tablist"/);
    expect(src).toMatch(/role="tab"/);
    expect(src).toMatch(/role="tabpanel"/);
  });

  it('wires aria-selected, aria-controls, and roving tabIndex', () => {
    expect(src).toMatch(/aria-selected=\{isActive\}/);
    expect(src).toMatch(/aria-controls=\{`panel-\$\{tab\.id\}`\}/);
    expect(src).toMatch(/tabIndex=\{isActive \? 0 : -1\}/);
  });

  it('links the tabpanel back to its own tab via aria-labelledby', () => {
    expect(src).toMatch(/aria-labelledby=\{`tab-\$\{current\.id\}`\}/);
  });

  it('moves DOM focus (not merely selection) on ArrowLeft/ArrowRight — the roving-tabindex pattern requires both', () => {
    expect(src).toMatch(/tabRefs\.current\[next\]\?\.focus\(\)/);
    expect(src).toMatch(/tabRefs\.current\[prev\]\?\.focus\(\)/);
  });

  it('meets the 44px minimum touch target for each tab button', () => {
    expect(src).toMatch(/minHeight:\s*44/);
  });
});

describe('KORA-WP-047 — Tooltip.tsx accessibility (content exposed to screen readers, not hover-only)', () => {
  const src = readSource('components/ui/Tooltip.tsx');

  it('has role="tooltip" on the floating content', () => {
    expect(src).toMatch(/role="tooltip"/);
  });

  it('links the trigger to the tooltip content via aria-describedby + a matching id (not merely visible on hover)', () => {
    expect(src).toMatch(/aria-describedby['"]?:\s*tooltipId/);
    expect(src).toMatch(/id=\{tooltipId\}/);
  });

  it('remains keyboard accessible: shows on focus, hides on blur', () => {
    expect(src).toMatch(/onFocus=\{.*setVisible\(true\)/);
    expect(src).toMatch(/onBlur=\{.*setVisible\(false\)/);
  });
});

describe('KORA-WP-047 — Explainer.tsx accessibility (compact info-icon)', () => {
  const src = readSource('components/ui/Explainer.tsx');

  it('the compact trigger button has an accessible name', () => {
    expect(src).toMatch(/aria-label="Informazioni su questa metrica"/);
  });

  it('links the trigger to its own tooltip content via aria-describedby when open', () => {
    expect(src).toMatch(/aria-describedby=\{open \? tooltipId : undefined\}/);
    expect(src).toMatch(/id=\{tooltipId\}/);
  });

  it('meets the 44x44 minimum touch target (WCAG 2.5.5 / EXPERIENCE_LAYER.md §6 / docs/30 §21.2 named example: "Confidence Score info icons") — the visible dot stays 16px, only the hit area expands', () => {
    expect(src).toMatch(/width:\s*44,/);
    expect(src).toMatch(/height:\s*44,/);
    expect(src).toMatch(/width:\s*16,/); // the inner visual dot is unchanged, preserving brand appearance
  });

  it('marks the decorative inner glyph aria-hidden (the outer button already carries the accessible name)', () => {
    expect(src).toMatch(/aria-hidden="true"[\s\S]{0,300}width:\s*16/);
  });
});

describe('KORA-WP-047 — Field.tsx accessibility (labels, unique IDs, error announcement)', () => {
  const src = readSource('components/ui/Field.tsx');

  it('uses React useId() for the fallback field id — never a label-derived slug that can collide across the page', () => {
    expect(src).toMatch(/useId\(\)/);
    expect(src).not.toMatch(/label\.toLowerCase\(\)\.replace/);
  });

  it('every input/select/textarea links its own error message via aria-describedby + role="alert"', () => {
    const occurrences = (src.match(/aria-describedby=\{error \? errorId : undefined\}/g) ?? []).length;
    expect(occurrences).toBe(3); // FieldInput, FieldSelect, FieldTextarea
    const alertOccurrences = (src.match(/role="alert"/g) ?? []).length;
    expect(alertOccurrences).toBe(3);
  });

  it('the label element uses htmlFor, never a bare unassociated <p>/<span>', () => {
    expect(src).toMatch(/<label[\s\S]{0,40}htmlFor=\{htmlFor\}/);
  });
});

describe('KORA-WP-047 — EmptyState.tsx accessibility', () => {
  const src = readSource('components/ui/EmptyState.tsx');

  it('the decorative icon is aria-hidden (its meaning is already conveyed by the adjacent title/body text)', () => {
    expect(src).toMatch(/aria-hidden="true"[\s\S]{0,60}\{icon\}/);
  });

  it('the access-denied variant uses role="alert" so it is announced without user action', () => {
    expect(src).toMatch(/role=\{variant === 'access-denied' \? 'alert' : undefined\}/);
  });
});

describe('KORA-WP-047 — DataBar.tsx accessibility (quantitative meaning, not color/width-only)', () => {
  const src = readSource('components/ui/DataBar.tsx');

  it('exposes role="progressbar" with aria-valuenow/min/max — a screen reader user gets the same quantity a sighted user reads from the bar width', () => {
    expect(src).toMatch(/role="progressbar"/);
    expect(src).toMatch(/aria-valuenow=\{Math\.round\(value\)\}/);
    expect(src).toMatch(/aria-valuemin=\{0\}/);
    expect(src).toMatch(/aria-valuemax=\{100\}/);
  });

  it('always carries an aria-label, even when no visible label/suffix text is passed', () => {
    expect(src).toMatch(/aria-label=\{label \?\? '.+'\}/);
  });
});

describe('KORA-WP-047 — Button.tsx accessibility (disabled state, focus)', () => {
  const src = readSource('components/ui/Button.tsx');

  it('forwards the native disabled attribute (never a purely visual/style-only disabled look)', () => {
    expect(src).toMatch(/disabled=\{disabled\}/);
  });

  it('every size meets the 44px minimum touch target except the explicitly smaller "sm" size used only for dense inline contexts', () => {
    expect(src).toMatch(/md:\s*\{[^}]*minHeight:\s*'44px'/);
    expect(src).toMatch(/lg:\s*\{[^}]*minHeight:\s*'48px'/);
  });
});

// ── TASK 3/5 — chrome-level landmark structure (already correct; guarded
// here as a PERMANENT regression test, since none existed before) ──────────

describe('KORA-WP-047 — layout landmark structure (permanent regression guard, EXPERIENCE_LAYER.md §6 "Riduzione motion"/landmark discipline)', () => {
  it('Header.tsx renders a native <header> element (implicit banner landmark — no redundant explicit role needed)', () => {
    const src = readSource('components/layout/Header.tsx');
    expect(src).toMatch(/<header/);
  });

  it('AppShell.tsx renders a labeled <main> landmark', () => {
    const src = readSource('components/layout/AppShell.tsx');
    expect(src).toMatch(/<main[\s\S]{0,80}aria-label="Contenuto principale"/);
  });

  it('Sidebar.tsx renders a labeled <nav> landmark for every render path', () => {
    const src = readSource('components/layout/Sidebar.tsx');
    const navCount = (src.match(/<nav[\s\S]{0,120}aria-label="Navigazione principale"/g) ?? []).length;
    expect(navCount).toBeGreaterThanOrEqual(2); // both the desktop and mobile/collapsed render paths
  });
});

// ── TASK 8 — reduced-motion discipline (structural guard) ───────────────────

describe('KORA-WP-047 — reduced-motion is honored by the shared motion hooks (EXPERIENCE_LAYER.md §5)', () => {
  it('useReveal.ts respects prefers-reduced-motion', () => {
    const src = readSource('components/hooks/useReveal.ts');
    expect(src).toMatch(/prefers-reduced-motion/);
  });

  it('useCountUp.ts respects prefers-reduced-motion', () => {
    const src = readSource('components/hooks/useCountUp.ts');
    expect(src).toMatch(/prefers-reduced-motion/);
  });
});
