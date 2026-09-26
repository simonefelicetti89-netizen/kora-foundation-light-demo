// lib/px-acceptance/evidence-protocol.ts
// KORA-WP-126 — the deterministic evidence protocol.
//
// Registry 219's WP126 Acceptance requires "one screenshot evidence protocol
// producing reproducible authenticated captures of the REAL Product" and "an
// explicit, enforced distinction between a Product screenshot and a design
// mockup". Both are encoded here as types plus fail-closed validation, so a
// mockup can never be filed as Product evidence by accident.
//
// Privacy (WP126's own Privacy/Trust field): evidence may only be captured
// against synthetic/local fixtures. assertCaptureAllowed enforces the same
// local-only rule the established local-session mechanism already applies.

import { assertCanonicalViewport, type ViewportId } from './viewport-matrix';

/**
 * PRODUCT is a capture of the running application. MOCKUP is a design artefact.
 * They are never interchangeable: only PRODUCT evidence can support a Founder
 * visual acceptance, and the discriminator is carried in the filename itself so
 * the distinction survives being copied out of the repository.
 */
export type EvidenceKind = 'product' | 'mockup';

export interface EvidenceDescriptor {
  /** Owning package, e.g. 'KORA-WP-126'. Evidence is archived with the WP that produced it. */
  readonly wp: string;
  readonly kind: EvidenceKind;
  /** Product route captured, e.g. '/company/kora-index'. Required for 'product'. */
  readonly route: string;
  readonly viewport: ViewportId;
  /** Optional discriminator, e.g. a persona or scenario. Must be slug-safe. */
  readonly variant?: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WP_ID = /^KORA-WP-\d{3}$/;

function routeSlug(route: string): string {
  const s = route.replace(/^\//, '').replace(/\[|\]/g, '').replace(/\//g, '-') || 'root';
  return s.toLowerCase();
}

/**
 * Deterministic evidence name. Same descriptor in, same name out — no
 * timestamp, no run id, no random suffix, because a name that changes per run
 * can never be compared against a baseline.
 */
export function evidenceName(d: EvidenceDescriptor): string {
  if (!WP_ID.test(d.wp)) throw new Error(`[KORA-WP-126] evidence wp must look like KORA-WP-NNN, got "${d.wp}"`);
  if (d.variant !== undefined && !SLUG.test(d.variant)) {
    throw new Error(`[KORA-WP-126] evidence variant must be a lowercase slug, got "${d.variant}"`);
  }
  if (d.kind === 'product' && !d.route.startsWith('/')) {
    throw new Error(`[KORA-WP-126] product evidence requires an absolute route, got "${d.route}"`);
  }
  const parts = [d.wp.toLowerCase(), d.kind, routeSlug(d.route), d.viewport];
  if (d.variant) parts.push(d.variant);
  return `${parts.join('__')}.png`;
}

/** Evidence lives under the owning WP, never in a shared undifferentiated pool. */
export function evidenceDir(wp: string): string {
  if (!WP_ID.test(wp)) throw new Error(`[KORA-WP-126] evidence wp must look like KORA-WP-NNN, got "${wp}"`);
  return `docs/product/visual-evidence/${wp.toLowerCase()}`;
}

export function evidencePath(d: EvidenceDescriptor): string {
  return `${evidenceDir(d.wp)}/${evidenceName(d)}`;
}

/**
 * The nondeterminism this protocol is required to suppress before a capture.
 * Declared as data so the capture spec and the self-test assert the SAME list —
 * a checklist in a comment is not an enforceable contract.
 */
export const SUPPRESSED_NONDETERMINISM = [
  'animations',        // CSS animations/transitions finished or disabled
  'caret',             // text caret hidden
  'fonts',             // document.fonts.ready awaited — Plus Jakarta Sans loaded
  'network-idle',      // no in-flight requests
  'loading-states',    // no skeleton/spinner surface remains
  'surface-ready',     // the surface's own declared readiness marker is present
  'dynamic-timestamps' // relative/live timestamps frozen or absent
] as const;
export type SuppressedNondeterminism = (typeof SUPPRESSED_NONDETERMINISM)[number];

export interface CapturePrerequisites {
  readonly baseUrl?: string;
  readonly authenticated: boolean;
  readonly width: number;
  readonly height: number;
  readonly suppressed: readonly SuppressedNondeterminism[];
}

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

export interface PrerequisiteResult {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/**
 * Fail-closed prerequisite validation. Returns every problem rather than the
 * first, because a capture run that is wrong in three ways should say so once.
 */
export function checkCapturePrerequisites(p: CapturePrerequisites): PrerequisiteResult {
  const problems: string[] = [];

  if (!p.baseUrl) {
    problems.push('no base URL — evidence must be captured against a running local Product');
  } else {
    let host: string | null = null;
    try {
      host = new URL(p.baseUrl).hostname.toLowerCase();
    } catch {
      problems.push(`base URL "${p.baseUrl}" is not a valid URL`);
    }
    if (host && !ALLOWED_LOCAL_HOSTS.includes(host)) {
      // Privacy/Trust: captures may not contain real Worker or Company data.
      problems.push(`base URL host "${host}" is not local — evidence may only be captured against synthetic local fixtures`);
    }
  }

  if (!p.authenticated) problems.push('capture is unauthenticated — the acceptance protocol captures the authenticated Product');

  try {
    assertCanonicalViewport(p.width, p.height);
  } catch (err) {
    problems.push(err instanceof Error ? err.message : String(err));
  }

  for (const required of SUPPRESSED_NONDETERMINISM) {
    if (!p.suppressed.includes(required)) problems.push(`nondeterminism not suppressed: ${required}`);
  }

  return { ok: problems.length === 0, problems };
}

export function assertCaptureAllowed(p: CapturePrerequisites): void {
  const r = checkCapturePrerequisites(p);
  if (!r.ok) {
    throw new Error(`[KORA-WP-126] capture refused — not canonical acceptance evidence:\n  - ${r.problems.join('\n  - ')}`);
  }
}

// ── readiness declaration ───────────────────────────────────────────────────
//
// ALSO FOUND BY THIS INSTRUMENT, AGAINST ITSELF (2026-09-27): after the
// redirect defect below was fixed, the protocol captured `/company/kora-index`
// while its main region still read "Caricamento in corso…". `network-idle` and
// `document.fonts.ready` were both satisfied — the surface fetches after
// hydration — and the generic `[aria-busy]`/`[data-loading]` probe matched
// nothing, because this surface renders neither.
//
// A generic probe cannot know when an arbitrary surface is finished. So the
// surface declares its own readiness marker, and a capture without one is not
// admissible: guessing is what produced a screenshot of a loading state.

export interface SurfaceReadiness {
  /** Selector that exists only once the real surface has rendered. */
  readonly selector: string;
  /** Where the marker comes from, so it is not invented at the call site. */
  readonly source: string;
}

export function assertReadinessDeclared(r: SurfaceReadiness | undefined, route: string): SurfaceReadiness {
  if (!r || !r.selector.trim()) {
    throw new Error(
      `[KORA-WP-126] "${route}" declares no readiness marker — a capture cannot prove the surface finished rendering, and a loading state is not the Product.`,
    );
  }
  return r;
}

// ── landing verification ────────────────────────────────────────────────────
//
// FOUND BY THIS INSTRUMENT, AGAINST ITSELF (2026-09-27): the first real run of
// the capture protocol produced three admissible-looking PNGs of
// `/login?role_hint=company`, because the session was not accepted and the app
// redirected. Every prerequisite passed — the viewport was canonical, the base
// URL local, the session installed — and the protocol reported success while
// measuring the login page as if it were the Product.
//
// Prerequisites describe the INTENT of a capture. They cannot describe its
// RESULT. A capture must therefore also prove it landed where it meant to,
// before a single byte is written to evidence.

/** Paths that are never a Product surface for acceptance purposes. */
const AUTH_PATHS = ['/login', '/signin', '/company/login', '/worker/login', '/partner/login', '/advisor/login'];

export interface LandingObservation {
  readonly intendedRoute: string;
  /** The URL the browser actually ended on. */
  readonly finalUrl: string;
  readonly documentHeightPx: number;
  readonly viewportHeightPx: number;
}

export function checkLanding(o: LandingObservation): PrerequisiteResult {
  const problems: string[] = [];
  let pathname: string | null = null;
  try {
    pathname = new URL(o.finalUrl, 'http://127.0.0.1').pathname;
  } catch {
    problems.push(`final URL "${o.finalUrl}" is not parseable`);
  }

  if (pathname !== null) {
    if (AUTH_PATHS.includes(pathname)) {
      problems.push(
        `capture landed on the authentication surface "${pathname}" — the session was not accepted, so this is NOT a capture of the authenticated Product`,
      );
    } else if (pathname !== o.intendedRoute) {
      problems.push(`capture was redirected from "${o.intendedRoute}" to "${pathname}" — it is evidence of a different surface`);
    }
  }

  if (o.documentHeightPx <= 0) problems.push('captured document has no height');

  return { ok: problems.length === 0, problems };
}

export function assertLanded(o: LandingObservation): void {
  const r = checkLanding(o);
  if (!r.ok) {
    throw new Error(`[KORA-WP-126] capture refused after navigation — not evidence of the intended Product surface:\n  - ${r.problems.join('\n  - ')}`);
  }
}
