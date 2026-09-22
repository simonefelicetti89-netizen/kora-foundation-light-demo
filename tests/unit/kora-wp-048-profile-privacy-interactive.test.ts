// tests/unit/kora-wp-048-profile-privacy-interactive.test.ts
//
// KORA-WP-048 — Profile & Privacy Interactive (requirement `MYKORA-009`).
//
// THE RULING THIS SUITE ENFORCES — Founder, 2026-09-21, Reading A:
//   "the worker can interactively inspect, understand and navigate their
//    canonical profile/privacy state and the real sharing capabilities that
//    already exist, while privacy policy controls themselves remain
//    read-only."
//
// It resolved a real conflict this package's precheck surfaced: Registry 219
// accepts `048` on "worker can interactively manage profile/privacy settings",
// while `46_GLOBAL_GAP_MATRIX` pins the same requirement row `MYKORA-009` with
// "Privacy controls stay read-only" — and the registry simultaneously declares
// Data/Migration NONE, Service/API N/A and Auth/RLS N/A, so no persistence
// path for a managed setting exists or may be created.
//
// The tests below therefore prove BOTH halves: that nothing became writable,
// and that the surface nevertheless stopped being a static document.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const CLIENT = 'app/worker/privacy/_components/PrivacySettingsClient.tsx';
const PAGE   = 'app/worker/privacy/page.tsx';
const API    = 'app/api/worker/privacy-settings/route.ts';

const client = read(CLIENT);
const page   = read(PAGE);
const api    = read(API);

/** Executable code only — a comment naming a retired concept must never fail
 *  a guard about what the page DOES. Strips block comments (including the
 *  JSX `{/* … *\/}` form, whose continuation lines are plain prose) and then
 *  line comments. */
const code = (src: string) =>
  src
    .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

// ── 1 — Privacy controls remain read-only ─────────────────────────────────

describe('KORA-WP-048 (1) — privacy controls remain read-only', () => {
  it('the client issues no write request of any kind', () => {
    expect(client).not.toMatch(/method:\s*'(POST|PATCH|PUT|DELETE)'/);
    expect(client).not.toMatch(/method:\s*"(POST|PATCH|PUT|DELETE)"/);
  });

  it('no privacy value is ever sent back to the server', () => {
    // Every fetch in this client is a bare GET with no request body.
    expect(client).not.toMatch(/body:\s*JSON\.stringify/);
  });

  it('the surface exposes no form control that could change a privacy policy', () => {
    const c = code(client);
    expect(c).not.toMatch(/<input\b/);
    expect(c).not.toMatch(/<select\b/);
    expect(c).not.toMatch(/<textarea\b/);
    expect(c).not.toMatch(/type="checkbox"/);
    expect(c).not.toMatch(/role="switch"/);
  });

  it('the only buttons are the read-side refresh and its retry — never a setting', () => {
    const handlers = [...client.matchAll(/onClick=\{\(?\)? *=> *([a-zA-Z]+)\(/g)].map((m) => m[1]);
    expect(handlers.length).toBeGreaterThan(0);
    for (const h of handlers) expect(h).toBe('load');
  });
});

// ── 2 — No write API, no schema, no auth expansion ────────────────────────

describe('KORA-WP-048 (2) — no DB / API / auth expansion', () => {
  it('the privacy-settings route still exposes GET only', () => {
    const verbs = api.match(/export async function (GET|POST|PATCH|PUT|DELETE)/g) ?? [];
    expect(verbs).toEqual(['export async function GET']);
  });

  it('the privacy-settings route contract is unchanged — still session-scoped, still no database', () => {
    expect(api).toContain('requireWorkerUser');
    expect(api).toContain('const { workerId, tenantId } = auth');
    expect(api).not.toMatch(/getSupabase(Server|Service)Client/);
    expect(api).not.toMatch(/\.schema\(/);
  });

  it('WP-048 added no migration: 089 is still the highest', () => {
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    const highest = Math.max(...files.map((f) => Number.parseInt(f.slice(0, 3), 10)).filter(Number.isFinite));
    // INTEGRATION SUPERSESSION (canonical Product integration, 2026-09-22):
    // converted from equality to >=. This guard's intent is "THIS WP added no
    // migration of its own" — asserted independently by the filename-ownership
    // check, which still passes. 089 was the ceiling at this WP's own completion;
    // KORA-WP-066 legitimately raised it to 090 on the integrated line. Equality
    // is the brittle form the repository already documented a remedy for (see
    // tests/unit/kora-wp-029-manual-remap-governance.test.ts: "never equality,
    // same disclosed pattern already fixed for WP-011/WP-120/WP-013/WP-046").
    expect(highest).toBeGreaterThanOrEqual(89);
    expect(files.some((f) => /wp[-_]?048|privacy[-_]?preference/i.test(f))).toBe(false);
  });

  it('no worker privacy-preference table is referenced anywhere in the surface', () => {
    for (const src of [client, page, api]) {
      expect(src).not.toMatch(/privacy_preference|worker_privacy_setting|privacy_settings_table/);
    }
  });

  it('the page keeps its existing auth gate and adds no new one', () => {
    expect(page).toContain('requireWorkerUser');
    expect(page).toContain("redirect('/login')");
  });
});

// ── 3 — Employer boundary and aggregation semantics preserved verbatim ────

describe('KORA-WP-048 (3) — privacy semantics preserved verbatim', () => {
  it('the constitutional employer boundary is stated, unchanged', () => {
    expect(client).toContain('Il tuo datore di lavoro non vede questi dati.');
    expect(client).toContain('KORA misura le organizzazioni, non valuta i singoli lavoratori.');
    expect(client).toContain('data-testid="privacy-employer-not-visible"');
  });

  it('the N≥10 aggregation and suppression language is preserved', () => {
    expect(client).toContain('almeno 10 lavoratori attivi');
    expect(client).toContain('i dati vengono soppressi per tutelare la tua privacy');
  });

  it('the private and aggregated lists are rendered from the canonical API, not hardcoded', () => {
    expect(client).toContain('settings.privateData.map');
    expect(client).toContain('settings.aggregatedData.map');
    // The old silent fallback that re-declared the guarantees in the client is
    // gone: a failed read must show a failed read, never stale certainties.
    expect(client).not.toContain('settings?.privateData ?? [');
    expect(client).not.toContain('settings?.aggregatedData ?? [');
  });

  it('the four canonical CV-share properties are preserved', () => {
    expect(client).toContain('Solo se creato da te — nessun link automatico');
    expect(client).toContain('Revocabile in qualsiasi momento');
    expect(client).toContain('Scadenza automatica 30 giorni');
    expect(client).toContain('Non visibile al datore di lavoro');
  });
});

// ── 4 — Future capabilities stay unavailable, and stay honest ─────────────

describe('KORA-WP-048 (4) — Public Snapshot and LinkedIn remain unavailable', () => {
  it('both are stated as unavailable Product state', () => {
    expect(client).toContain('Snapshot pubblico anonimo');
    expect(client).toContain('Condivisione LinkedIn');
    expect(client).toContain('Non disponibile');
    expect(client).toContain('Employer access: non consentito');
  });

  it('neither is offered as a control the worker could believe is merely off', () => {
    const block = client.slice(client.indexOf('FUTURE_CAPABILITIES'), client.indexOf('function formatDate'));
    expect(block).not.toMatch(/<button\b/);
    expect(block).not.toMatch(/onClick=/);
  });

  it('no public link is ever generated or rendered', () => {
    expect(client).not.toContain('window.open(');
    expect(client).not.toContain('href={publicLink}');
    expect(client).not.toContain('href={shareUrl}');
    // The shares API returns a placeholder shareUrl; this surface must not
    // present it as if it were a real, openable link.
    expect(client).not.toMatch(/\.shareUrl/);
  });
});

// ── 5 — Dynamic CV ownership stays external to WP-048 ─────────────────────

describe('KORA-WP-048 (5) — Dynamic CV remains the owner of the share lifecycle', () => {
  it('the page reads share state through the existing canonical GET only', () => {
    expect(client).toContain("fetch('/api/worker/dynamic-cv/shares')");
    expect(client).not.toMatch(/fetch\('\/api\/worker\/dynamic-cv\/share'/);
  });

  it('it neither creates nor revokes a share', () => {
    const c = code(client);
    expect(c).not.toMatch(/\brevoke\b/i);
    expect(c).not.toMatch(/createShare|generateShare|newShare/i);
  });

  it('it navigates to the surface that owns the lifecycle', () => {
    expect(client).toContain('href="/worker/dynamic-cv"');
    expect(client).toContain('Gestisci i tuoi link');
  });

  it('the Dynamic CV implementation itself is untouched by this package', () => {
    // WP-048 owns no file under the Dynamic CV route or its API.
    expect(existsSync(join(ROOT, 'app/worker/dynamic-cv'))).toBe(true);
    expect(existsSync(join(ROOT, 'app/api/worker/dynamic-cv/shares/route.ts'))).toBe(true);
  });
});

// ── 6 — The surface consumes the WP-125 shared foundation ─────────────────

describe('KORA-WP-048 (6) — canonical Product Experience, no local design system', () => {
  it('it consumes the shared WP-125 primitives', () => {
    expect(client).toContain("from '@/components/ui/px'");
    for (const primitive of ['PageHead', 'Workspace', 'Col', 'Region', 'Notice', 'Status', 'Facts', 'StateBlock', 'SkeletonRows']) {
      expect(client, `${primitive} not consumed`).toContain(primitive);
    }
    expect(client).toContain("from '@/components/ui/Button'");
  });

  it('it declares no page-local token architecture', () => {
    expect(client).not.toMatch(/BADGE_TOKENS/);
    expect(client).not.toMatch(/\bTOKENS\./);
    expect(client).not.toMatch(/const FONT\s*=/);
    // Colour comes from the canonical register only — no page-local palette.
    expect(code(client)).not.toMatch(/rgba\(/);
    expect(code(client)).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });

  it('it declares no page-local responsive model', () => {
    // The shell owns the measure; the old fixed 720px centred column is gone.
    expect(client).not.toMatch(/maxWidth:\s*720/);
    expect(client).not.toMatch(/margin:\s*'0 auto'/);
    expect(client).not.toMatch(/@media/);
  });

  it('it renders no demo or Foundation Light Product chrome', () => {
    // Executable code only: the header comment records WHY the retired
    // footer's "KORA Foundation Light" was dropped, and naming a retired
    // term in a comment must never fail a guard about what is rendered.
    expect(code(client)).not.toMatch(/Foundation Light/);
    expect(code(client)).not.toMatch(/DATI SIMULATI|dati sintetici|Demo Lab|ScenarioSwitcher|PersonaSwitcher/i);
  });

  it('the page-local back navigation made redundant by the shell is gone', () => {
    expect(client).not.toContain('← Il tuo spazio');
  });
});

// ── 7 — It is genuinely interactive, in the ways the ruling allows ────────

describe('KORA-WP-048 (7) — legitimate interaction exists', () => {
  it('a real loading state replaces the static "Caricamento..." text', () => {
    expect(client).toContain('SkeletonRows');
    expect(client).not.toContain('Caricamento...');
  });

  it('a failed read is stated, with a working retry', () => {
    expect(client).toMatch(/setError\(/);
    expect(client).toContain('Riprova');
    expect(client).toMatch(/<Notice tone="risk">/);
  });

  it('the worker can refresh the whole surface', () => {
    expect(client).toContain('Aggiorna');
    expect(client).toMatch(/onClick=\{\(\) => load\(\)\}/);
  });

  it('share state is live, not asserted', () => {
    expect(client).toContain('activeShares');
    expect(client).toMatch(/s\.status === 'active' && !s\.isExpired/);
    expect(client).toContain('Nessun link di condivisione attivo');
  });

  it('a degraded share read never blanks the privacy guarantees', () => {
    expect(client).toContain('shareNotice');
    expect(client).toContain('Stato dei link di condivisione non disponibile in questo momento.');
  });

  it('the canonical privacy-settings read is unchanged in form', () => {
    // B-WORKER-2 pins this exact call; WP-048 must not alter it.
    expect(client).toContain("fetch('/api/worker/privacy-settings')");
  });
});

// ── 8 — Every pinned surface identity survives ────────────────────────────

describe('KORA-WP-048 (8) — pinned test identities preserved', () => {
  it('keeps every data-testid earlier packages depend on', () => {
    for (const id of [
      'worker-privacy-page',
      'privacy-employer-not-visible',
      'privacy-private-data',
      'privacy-aggregated-data',
      'privacy-sharing-controls',
      'privacy-links-section',
      'privacy-interpretation-note',
      'privacy-sharing-cv-toggle',
    ]) {
      expect(client, `missing data-testid="${id}"`).toContain(`data-testid="${id}"`);
    }
  });

  it('the sharing section still precedes the links section, as B122 slices them', () => {
    expect(client.indexOf('privacy-sharing-controls')).toBeLessThan(client.indexOf('privacy-links-section'));
  });
});
