// tests/unit/kora-wp-063-my-access-generalization.test.ts
//
// KORA-WP-063 — My-Access Generalization + Dead Stub Removal.
//
// THE RULING THIS SUITE ENCODES — Founder, 2026-09-21: READING A, KILL-ONLY.
//
// The package's canonical contract has two halves. Only one is executable
// under the current scope-trigger state, and this suite guards both facts:
//
//   KILL (executed here) — `MYKORA-003b` / `BOOKING-002`: the
//   BookingRequestService no-op stub is classified KILL/DEAD by the canonical
//   requirement ledger (`64`), the gap matrix (`46`) and the repository's own
//   Architecture Registry. Removal was gated on KILL CHALLENGE #2 — "verify
//   importers first" — which this suite re-proves mechanically.
//
//   GENERALIZE (deferred) — `MYKORA-003`: doc `46` defines the remediation as
//   "Generalise the real Commons BookingService … FOR PARTNER ACCESS", whose
//   dependencies are `PARTNER-003` (owned by `KORA-WP-056`, scope trigger
//   "Partner delivery selected") and `BOOKING-001` (owned by `KORA-WP-050`,
//   scope trigger "Booking selected"). Both triggers are INACTIVE and neither
//   owner is COMPLETE, and no Partner capacity object exists to request access
//   to. Implementing it would require activating a Founder-controlled scope
//   trigger or inventing "new booking feature scope" — WP-063's own explicit
//   Out of Scope. The Founder therefore deferred it.
//
// The assertions below guard SEMANTIC truth, not prose formatting.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { ARCHITECTURE_REGISTRY, validateArchitectureRegistry } from '@/lib/architecture/registry';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

const STUB_PATH = 'services/booking-request/BookingRequestService.ts';

/** Every source file that could hold a runtime reference. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try { entries = readdirSync(join(ROOT, dir)); } catch { return; }
    for (const e of entries) {
      if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue;
      const rel = `${dir}/${e}`;
      if (/\.(ts|tsx|mjs|js)$/.test(e)) out.push(rel);
      else if (!e.includes('.')) walk(rel);
    }
  };
  for (const d of ['app', 'services', 'lib', 'components', 'scripts', 'tests']) walk(d);
  return out;
}

// ── A — the dead implementation is gone ───────────────────────────────────

describe('KORA-WP-063 (A) — the BookingRequestService implementation no longer exists', () => {
  it('the stub file is deleted', () => {
    expect(exists(STUB_PATH)).toBe(false);
  });

  it('its directory is gone too — no empty shell left behind', () => {
    expect(exists('services/booking-request')).toBe(false);
  });
});

// ── B — KILL CHALLENGE #2: zero runtime consumers ─────────────────────────

describe('KORA-WP-063 (B) — zero runtime consumers reference it', () => {
  it('no file imports or requires the service or its directory', () => {
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      const src = readFileSync(join(ROOT, f), 'utf8');
      // An import/require naming the module, in any form.
      if (/(^|\n)\s*import[^;\n]*from\s*['"][^'"]*booking-request[^'"]*['"]/.test(src)) offenders.push(`${f} (import)`);
      if (/require\(\s*['"][^'"]*booking-request[^'"]*['"]\s*\)/.test(src)) offenders.push(`${f} (require)`);
      if (/import\(\s*['"][^'"]*booking-request[^'"]*['"]\s*\)/.test(src)) offenders.push(`${f} (dynamic import)`);
    }
    expect(offenders, `runtime consumers still reference the retired service: ${offenders.join(', ')}`).toEqual([]);
  });

  it('no executable code expects the singleton or the class to exist', () => {
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      if (f.startsWith('tests/')) continue; // tests may name it to prove its absence
      const code = readFileSync(join(ROOT, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      if (/\bbookingRequestService\b|\bBookingRequestService\b/.test(code)) offenders.push(f);
    }
    expect(offenders, `executable references remain: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── C — the architecture registry keeps the retirement record ─────────────

describe('KORA-WP-063 (C) — the registry preserves a historical retirement record', () => {
  const entry = () => ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.booking-request');

  it('the entry still exists — deletion of code is not deletion of history', () => {
    expect(entry()).toBeTruthy();
  });

  it('it follows the repository\'s established historical-record form', () => {
    const e = entry()!;
    expect(e.status).toBe('DEAD');
    expect(e.primaryPath).toBe(STUB_PATH);
    expect(e.purpose).toMatch(/HISTORICAL/i);
    expect(e.deletableWhen).toMatch(/already deleted/i);
    expect(e.decisionRef).toBeTruthy();
    expect(e.notes).toMatch(/DELETED/);
  });

  it('it records the surviving implementation rather than claiming one is on disk', () => {
    const e = entry()!;
    expect(e.competingWith).toContain('svc.commons.booking');
    expect(e.futureCore).toBe(false);
  });

  it('the registry as a whole still validates', () => {
    expect(validateArchitectureRegistry(ARCHITECTURE_REGISTRY)).toEqual([]);
  });

  it('the registry documentation agrees with the code registry', () => {
    const doc = read('docs/ARCHITECTURE_REGISTRY.md');
    const rows = doc.split('\n').filter((l) => l.includes('`svc.booking-request`'));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) expect(r).toMatch(/KORA-WP-063/);
    // The DEAD table carries the deletable-when column: it must state the
    // deletion as done. The original gate condition survives only as a quoted
    // historical clause inside the notes, which is the record, not a claim.
    const deadRow = rows.find((r) => r.includes('`svc.commons.booking`'))!;
    expect(deadRow).toMatch(/Already deleted — this entry is the historical record of that deletion\./);
  });
});

// ── D/E — no schema, no migration, no RLS ─────────────────────────────────

describe('KORA-WP-063 (D/E) — no database, schema or RLS change', () => {
  it('no migration was added: 089 is still the highest', () => {
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    const highest = Math.max(...files.map((f) => Number.parseInt(f.slice(0, 3), 10)).filter(Number.isFinite));
    expect(highest).toBe(89);
    expect(files.some((f) => /wp[-_]?063|booking[-_]?request/i.test(f))).toBe(false);
  });

  it('the retired stub had no backing table, so none was dropped', () => {
    const sql = readdirSync(join(ROOT, 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(ROOT, 'supabase/migrations', f), 'utf8'))
      .join('\n');
    expect(sql).not.toMatch(/booking_request/i);
    // The live table the surviving service uses is untouched and still created.
    expect(sql).toMatch(/commons\.booking/);
  });
});

// ── F/G — the active Product is untouched ─────────────────────────────────

describe('KORA-WP-063 (F/G) — the live Commons booking path is untouched', () => {
  it('the functional Commons BookingService is still present with its full surface', () => {
    expect(exists('services/commons/BookingService.ts')).toBe(true);
    const svc = read('services/commons/BookingService.ts');
    for (const fn of [
      'createBooking', 'listMyBookings', 'cancelBooking', 'listPendingForModeration',
      'listBookingsForModeration', 'moderate', 'markAttended', 'getAggregateForPromoter',
    ]) {
      expect(svc, `${fn} missing from the surviving service`).toContain(`export async function ${fn}`);
    }
  });

  it('the Worker My Access route and its APIs still exist', () => {
    expect(exists('app/worker/bookings/page.tsx')).toBe(true);
    expect(exists('app/worker/bookings/_components/BookingsClient.tsx')).toBe(true);
    expect(exists('app/api/worker/commons/bookings/route.ts')).toBe(true);
    expect(exists('app/api/worker/commons/bookings/[id]/route.ts')).toBe(true);
  });

  it('the route keeps its session guard', () => {
    const page = read('app/worker/bookings/page.tsx');
    expect(page).toContain('requireWorkerUser');
    expect(page).toContain("redirect('/login')");
    expect(page).toContain('BookingsClient');
  });

  it('Worker navigation still reaches My Access', () => {
    expect(read('components/layout/Sidebar.tsx')).toContain("'/worker/bookings'");
  });
});

// ── H/J — nothing was invented, and no UI changed ─────────────────────────

describe('KORA-WP-063 (H/J) — no Partner-access capability invented, no UI changed', () => {
  it('no Partner-access booking capability was created', () => {
    expect(exists('services/partner-access')).toBe(false);
    expect(exists('app/api/worker/partner-access')).toBe(false);
    const svc = read('services/commons/BookingService.ts');
    // The surviving service was not extended toward Partner capacity.
    expect(svc).not.toMatch(/partner_capacity|partnerCapacity|capacity_node/i);
  });

  it('no user-facing Product surface was modified by this package', () => {
    // WP-063 (KILL-only) touches no route, component, navigation or copy.
    // The Bookings UI deliberately keeps its pre-existing presentation: its
    // WP-125 migration is NOT part of this Founder-selected scope.
    const client = read('app/worker/bookings/_components/BookingsClient.tsx');
    expect(client).toContain('BookingsClient');
    expect(exists('app/worker/bookings/_components/BookingsClient.tsx')).toBe(true);
  });
});

// ── I/K — scope triggers untouched, generalization explicitly deferred ────

describe('KORA-WP-063 (I/K) — scope triggers inactive, MYKORA-003 deferred', () => {
  it('no scope trigger was activated by this package', () => {
    // Activating "Booking selected" or "Partner delivery selected" is a
    // Founder pilot-scope decision recorded in the canonical registry, never
    // an implementation side effect. Nothing here may imply one.
    for (const f of ['services/commons/BookingService.ts', 'app/worker/bookings/page.tsx']) {
      const src = read(f);
      expect(src).not.toMatch(/Booking selected|Partner delivery selected/i);
    }
  });

  it('KORA-WP-050 and KORA-WP-056 code paths were not entered', () => {
    // 050 is a race-condition fix inside the Commons service; 056 is the
    // Partner capacity model. Neither exists here, and neither was started.
    expect(exists('services/partner-capacity')).toBe(false);
    const svc = read('services/commons/BookingService.ts');
    expect(svc).not.toMatch(/RESIL-003|race[- ]condition fix/i);
  });

  it('the deferral of the MYKORA-003 Partner-access generalization is recorded, not silently dropped', () => {
    const entry = ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.booking-request')!;
    expect(entry.notes).toMatch(/MYKORA-003/);
    expect(entry.notes).toMatch(/PARTNER-003/);
    expect(entry.notes).toMatch(/deferred|Partner delivery selected/i);
  });
});
