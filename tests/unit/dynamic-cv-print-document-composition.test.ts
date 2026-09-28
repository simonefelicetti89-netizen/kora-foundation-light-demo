/**
 * Dynamic CV print route — document composition contract
 * (KORA-WP-129, Dynamic CV Defect B regression coverage)
 *
 * THE DEFECT THIS EXISTS FOR:
 *   app/worker/dynamic-cv/print/page.tsx declared its OWN <html>, <head> and
 *   <body> while already rendering inside the root layout's document and the
 *   Worker shell. A second document root nested inside <body> is invalid, so
 *   the browser's parser discarded it wholesale: React reported hydration error
 *   #418 naming HTML, `[data-testid="dynamic-cv-print-view"]` never existed in
 *   the DOM, every experience row the server had correctly rendered was thrown
 *   away, and — the part that broke the feature outright — the `@media print`
 *   rules inside that discarded <head> never reached the CSSOM, so Cmd+P
 *   printed the application shell over a blank sheet.
 *
 *   The server output was never the problem. It contained the full artifact
 *   both before and after. Only the browser's view of it was destroyed, which
 *   is why the defect survived every server-side check.
 *
 * WHAT THIS PROVES:
 *   The page contributes ordinary page markup — no document root of its own —
 *   and its print rules live in a stylesheet that actually ships to the
 *   browser, with the shell chrome suppressed in paged media.
 *
 * WHAT THIS DOES NOT PROVE:
 *   That the printed artifact LOOKS right — that is Founder visual review.
 *   That the data is correct — the embedded-select contract test covers the
 *   query, and RLS-07 covers the join's row visibility.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PAGE = 'app/worker/dynamic-cv/print/page.tsx';
const CSS  = 'app/worker/dynamic-cv/print/print.module.css';

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** Source with comment lines removed, so prose about <html> cannot satisfy or break a check. */
function code(rel: string): string {
  return read(rel)
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join('\n');
}

/** The body of the `@media print { ... }` block, brace-matched. */
function mediaPrintBlock(css: string): string {
  const at = css.search(/@media\s+print\s*\{/);
  if (at < 0) throw new Error('no @media print block in the print stylesheet');
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i); }
  }
  throw new Error('unbalanced braces in the print stylesheet');
}

describe('Dynamic CV print route — owns no document of its own', () => {
  it('the page declares no <html>, <head> or <body>', () => {
    const src = code(PAGE);
    for (const tag of ['html', 'head', 'body']) {
      expect(
        src,
        `${PAGE} declares <${tag}>. It renders inside the root layout's document and the ` +
        `Worker shell, so a second document root is invalid markup — the browser discards ` +
        `it together with everything inside, including the print stylesheet.`,
      ).not.toMatch(new RegExp(`<${tag}(\\s|>)`, 'i'));
    }
  });

  it('the page ships no inline <style> tag', () => {
    // An inline <style> was how the print rules came to be inside the discarded
    // <head>. Route-scoped CSS is the mechanism that actually reaches the browser.
    expect(code(PAGE)).not.toMatch(/<style[\s>]/i);
  });

  it('the printable content and its readiness selector survive', () => {
    const src = read(PAGE);
    expect(src).toMatch(/data-testid="dynamic-cv-print-view"/);
    expect(src).toMatch(/Dynamic Impact CV/);
    expect(src).toMatch(/Esperienze/);
    // KORA-WP-129 W3B — NARROWLY SUPERSEDED casing only. This pinned
    // `Profilo Pillar` because the legacy section label was uppercased by CSS
    // and written title-case in source. W3B maps section headings to the
    // canonical `section` role, where `meta` is the only uppercase role, so the
    // source now reads `Profilo pillar`. The Product truth asserted here is
    // that the pillar section exists and is named — not how it is capitalised.
    expect(src).toMatch(/Profilo pillar/i);
    // The privacy footer is non-suppressible on this surface.
    expect(src).toMatch(/Il datore di lavoro non vede questo CV/);
  });

  it('print styling is carried by a route-scoped stylesheet the page imports', () => {
    expect(existsSync(join(ROOT, CSS)), `${CSS} must exist`).toBe(true);
    const src = code(PAGE);
    expect(src).toMatch(/import\s+styles\s+from\s+'\.\/print\.module\.css'/);
    expect(src).toMatch(/className=\{styles\.page\}/);
    expect(src).toMatch(/className=\{styles\.noPrint\}/);
  });
});

describe('Dynamic CV print stylesheet — the artifact, not the application', () => {
  it('declares print rules', () => {
    expect(read(CSS)).toMatch(/@media\s+print\s*\{/);
  });

  it('suppresses the shell chrome and the on-screen controls in paged media', () => {
    const print = mediaPrintBlock(read(CSS));
    // .px-top is the Header root, .px-nav the Sidebar root (components/layout).
    expect(print, 'the Header must not print').toMatch(/:global\(\.px-top\)/);
    expect(print, 'the Sidebar must not print').toMatch(/:global\(\.px-nav\)/);
    expect(print, 'the on-screen controls must not print').toMatch(/\.noPrint/);
    expect(print).toMatch(/display:\s*none/);
  });

  it('releases the shell scrollport so the artifact is not clipped to one page', () => {
    const print = mediaPrintBlock(read(CSS));
    // .px-main is a scrollport on screen; an overflow container prints its first
    // page and drops the rest.
    expect(print).toMatch(/:global\(\.px-main\)/);
    expect(print).toMatch(/overflow:\s*visible/);
  });

  it('reaches outside its own scope ONLY inside @media print', () => {
    // A :global rule on screen would let this route restyle the whole Product.
    const css = read(CSS);
    const print = mediaPrintBlock(css);
    const total = (css.match(/:global\(/g) ?? []).length;
    const inPrint = (print.match(/:global\(/g) ?? []).length;
    expect(total, 'every :global selector in this stylesheet must sit inside @media print').toBe(inPrint);
    expect(total).toBeGreaterThan(0);
  });
});
