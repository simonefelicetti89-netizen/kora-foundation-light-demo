import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// KORA-WP-139 — typography lint contract, staged.
//
// PHASE: WARN. `npm run lint` passes no --max-warnings, so this reports without
// failing. That is deliberate and is the acceptance level WP-139 contracts for:
// the Product carries ~2,600 inline typography decisions, and turning that into
// a wall of errors on day one would force either a flag-day rewrite (which the
// package is explicitly forbidden to contract) or a giant allowlist. Escalation
// to BLOCK is programme Definition of Done, owned by KORA-WP-126.
//
// WHY A `Property` SELECTOR AND NOT A REGEX ON px STRINGS: the real population
// is 1,882 bare numbers, 557 quoted px, 150 quoted rem and a dozen expressions.
// A rule matching only quoted px literals would miss 72% of it. Matching the
// PROPERTY catches every value form there is, including ones nobody has written
// yet.
const TYPOGRAPHY_LINT = {
  name: 'kora/typography-scale',
  rules: {
    'no-restricted-syntax': ['warn', {
      selector: "Property[key.name='fontSize']",
      message:
        'KORA-WP-139: use a canonical type role, not an inline fontSize. ' +
        'Import typeStyle(role) from lib/design/kora-design-tokens, or one of the ' +
        'primitives in components/ui/px (Title, Section, Body, Secondary, Label, ' +
        'Caption, Meta). 11px is reserved for the `meta` role; nothing renders below it.',
    }],
  },
};

// The canonical sources are where the scale is DEFINED. They are the one place
// an explicit size is not drift.
const TYPOGRAPHY_LINT_SOURCES = {
  name: 'kora/typography-scale-sources',
  files: ['lib/design/kora-design-tokens.ts', 'components/ui/px/Text.tsx'],
  rules: { 'no-restricted-syntax': 'off' },
};

// KORA-WP-141 — spacing lint, staged, at WARN.
//
// It targets a LITERAL spacing value, not the property. `padding: SPACE.md` is a
// MemberExpression and is legal; `padding: 20` and `padding: '20px'` are
// Literals and are the drift. That distinction is why this rule needs no
// allowlist: adopting the scale silences it by construction.
//
// WHAT IT CANNOT SEE, stated rather than hidden: Tailwind spacing utilities
// live inside className strings and are not reachable from an AST selector.
// They are the LARGER population — ~3,325 against ~2,282 inline — so this rule
// alone does not describe the Product's spacing debt. The demonstrator-scoped
// half is asserted by the KORA-WP-141 suite instead, which checks that no
// non-step Tailwind spacing survives on a touched surface.
//
// ZERO IS EXEMPT BY SELECTOR, not by allowlist: `margin: 0` is a reset, not a
// spacing decision, and a rule that cannot tell the difference would train
// people to ignore it.
//
// WARN, never BLOCK. Legacy debt warns; KORA-WP-126 owns hard enforcement.
const SPACING_LINT = {
  name: 'kora/spacing-scale',
  rules: {
    'no-restricted-syntax': ['warn',
      {
        selector: "Property[key.name='fontSize']",
        message:
          'KORA-WP-139: use a canonical type role, not an inline fontSize. ' +
          'Import typeStyle(role) from lib/design/kora-design-tokens, or one of the ' +
          'primitives in components/ui/px (Title, Section, Body, Secondary, Label, ' +
          'Caption, Meta). 11px is reserved for the `meta` role; nothing renders below it.',
      },
      {
        selector: "Property[key.name=/^(padding|margin|gap|rowGap|columnGap)/][value.type='Literal'][value.value!=0]",
        message:
          'KORA-WP-141: resolve spacing to the canonical SPACE scale (4/8/16/24/32/48) ' +
          'from lib/design/kora-design-tokens — a literal spacing value is drift. ' +
          'A Tailwind utility is legal only where it resolves to a step (p-1/2/4/6/8/12).',
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  SPACING_LINT,
  TYPOGRAPHY_LINT_SOURCES,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Architecture docs contain JSX for diagram tooling — not app code
    "docs/**",
  ]),
]);

export default eslintConfig;
