// tests/unit/kora-wp-064-full-advisor-portal.test.ts
//
// KORA-WP-064 — Full Advisor Portal Completion.
//
// THE RULING THIS SUITE ENCODES — Founder, 2026-09-21: READING 1 — DECOMPOSE.
//
// The Advisor could already do all six jobs; what they could not do was
// NAVIGATE. Messages, appointments, notes, cases, review assessments and KORAL
// Review were collapsed into one ~950-line page as nested accordions, with no
// sub-routes, no deep links and no explicit Company context. This package owns
// information architecture, navigation and Product Experience — NOT new
// backend capability. Reading 3 (a cross-Company aggregation dashboard) was
// explicitly NOT selected.
//
// Every assertion below guards that boundary in both directions: the six
// capabilities must survive intact, and nothing new may appear.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { buildNavGroups } from '@/components/layout/Sidebar';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

// Executable source only — comments document, they do not behave.
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const CTX = 'app/advisor/companies/[assignmentId]';
const PORTFOLIO = 'app/advisor/companies/page.tsx';

/** The six capability groups the pre-decomposition monolith carried, each
 *  pinned to the endpoint it must keep calling and the file that now owns it. */
const CAPABILITIES = [
  { name: 'messages',     file: `${CTX}/_components/MessagesClient.tsx`,     route: `${CTX}/messaggi/page.tsx`,      endpoint: '/messages' },
  { name: 'appointments', file: `${CTX}/_components/AppointmentsClient.tsx`, route: `${CTX}/appuntamenti/page.tsx`,  endpoint: '/appointments' },
  { name: 'content',      file: `${CTX}/_components/ContentClient.tsx`,      route: `${CTX}/note/page.tsx`,          endpoint: '/content' },
  { name: 'cases',        file: `${CTX}/_components/CasesClient.tsx`,        route: `${CTX}/case/page.tsx`,          endpoint: '/cases' },
  { name: 'assessments',  file: `${CTX}/_components/AssessmentsClient.tsx`,  route: `${CTX}/valutazioni/page.tsx`,   endpoint: '/review-assessments' },
  { name: 'koral review', file: `${CTX}/_components/KoralReviewClient.tsx`,  route: `${CTX}/koral-review/page.tsx`,  endpoint: '/koral-review' },
] as const;

// ── A / N — one portal, and the monolith does not survive beside it ───────

describe('KORA-WP-064 (A/N) — exactly ONE Advisor portal', () => {
  it('the Advisor route tree has one root and one guard', () => {
    expect(exists('app/advisor/layout.tsx')).toBe(true);
    expect(read('app/advisor/layout.tsx')).toContain('requireAdvisorUser');
    expect(exists('app/advisor/page.tsx')).toBe(true);
  });

  it('no second Advisor portal was created', () => {
    for (const forbidden of ['app/advisor-v2', 'app/advisor-portal', 'app/demo/advisor', 'app/advisor/portal']) {
      expect(exists(forbidden), `${forbidden} would be a second portal`).toBe(false);
    }
    const advisorDirs = readdirSync(join(ROOT, 'app')).filter((d) => /advisor/i.test(d));
    expect(advisorDirs).toEqual(['advisor']);
  });

  it('the monolith does not survive as a parallel surface: the portfolio page no longer carries the six workflows', () => {
    const src = code(PORTFOLIO);
    for (const c of CAPABILITIES) {
      expect(src, `${c.name} still lives on the portfolio page`).not.toContain(c.endpoint);
    }
    // It keeps exactly one read — the portfolio question itself.
    expect(src.match(/fetch\(/g) ?? []).toHaveLength(1);
    expect(src).toContain("fetch('/api/advisor/companies'");
  });
});

// ── B / C — portfolio and deep-linkable Company context ───────────────────

describe('KORA-WP-064 (B/C) — portfolio and deep-linkable Company context', () => {
  it('the portfolio route exists and links into each Company context', () => {
    expect(exists(PORTFOLIO)).toBe(true);
    expect(code(PORTFOLIO)).toContain('href={`/advisor/companies/${c.assignmentId}`}');
  });

  it('the per-Company context is a real route, not an accordion', () => {
    expect(exists(`${CTX}/page.tsx`)).toBe(true);
    expect(exists(`${CTX}/_components/CompanyContextShell.tsx`)).toBe(true);
    // KORA-WP-064 second pass: the defect was whole CAPABILITIES collapsing
    // per Company (`expanded === assignmentId`), not disclosure inside a
    // capability — inline forms and a selected-appointment detail are the
    // requested interaction pattern. The precise assertion is that no
    // capability is gated behind a per-assignment accordion any more.
    for (const c of CAPABILITIES) {
      expect(code(c.file), `${c.name} still accordions per assignment`).not.toMatch(/=== assignmentId/);
      expect(code(c.file), `${c.name} still toggles a whole capability`).not.toMatch(/toggle(Appointments|Content|Cases|Assessments|Review|Thread)/);
    }
  });

  it('every capability is its own deep-linkable route', () => {
    for (const c of CAPABILITIES) {
      expect(exists(c.route), `${c.name} has no route`).toBe(true);
      expect(code(c.route)).toContain('CompanyContextShell');
      expect(code(c.route)).toContain('assignmentId');
    }
  });
});

// ── D — capability preservation ───────────────────────────────────────────

describe('KORA-WP-064 (D) — all six pre-existing capabilities remain reachable and intact', () => {
  for (const c of CAPABILITIES) {
    it(`${c.name}: still calls its canonical assignment-scoped endpoint`, () => {
      const src = code(c.file);
      expect(src).toContain(`/api/advisor/companies/\${assignmentId}${c.endpoint}`);
    });
  }

  it('every write path the monolith had is preserved', () => {
    const writes: Array<[string, string]> = [
      ['messages', 'MessagesClient'], ['appointments', 'AppointmentsClient'],
      ['content', 'ContentClient'], ['cases', 'CasesClient'],
      ['assessments', 'AssessmentsClient'], ['koral review', 'KoralReviewClient'],
    ];
    for (const [name, comp] of writes) {
      expect(code(`${CTX}/_components/${comp}.tsx`), `${name} lost its write path`).toMatch(/method: 'POST'/);
    }
  });

  it('the canonical action verbs and lifecycle transitions survive unchanged', () => {
    const appts = code(`${CTX}/_components/AppointmentsClient.tsx`);
    for (const verb of ['confirm', 'cancel', 'reschedule']) expect(appts).toContain(`'${verb}'`);
    const cases = code(`${CTX}/_components/CasesClient.tsx`);
    expect(cases).toContain("'in-progress'");
    expect(cases).toContain("'resolved'");
    expect(cases).toContain('resolutionNote');
    const content = code(`${CTX}/_components/ContentClient.tsx`);
    expect(content).toContain('CONFIDENTIAL_REFERENCE');
    expect(content).toContain('COMMUNICATION_FOLLOWUP');
    const koral = code(`${CTX}/_components/KoralReviewClient.tsx`);
    expect(koral).toContain('koral-review/confirm');
    expect(koral).toContain('materialChangeId');
  });

  it('the five-class content taxonomy is carried over verbatim', () => {
    const lib = read(`${CTX}/_lib.ts`);
    for (const k of ['ORGANISATION_SHAREABLE_NOTE', 'ADVISOR_INTERNAL_NOTE', 'CONFIDENTIAL_REFERENCE', 'COMMUNICATION_FOLLOWUP']) {
      expect(lib).toContain(k);
    }
    expect(lib).toContain('AUDIT_PROVENANCE_RECORD');
  });
});

// ── E / F / G — assignment scope, multi-Company, explicit context ─────────

describe('KORA-WP-064 (E/F/G) — assignment-scoped, multi-Company, context always explicit', () => {
  it('access is resolved from the assignment-scoped endpoint, never inferred from the route parameter', () => {
    const lib = read(`${CTX}/_lib.ts`);
    expect(lib).toContain("fetch('/api/advisor/companies'");
    expect(lib).toContain('c.assignmentId === assignmentId');
    const shell = code(`${CTX}/_components/CompanyContextShell.tsx`);
    expect(shell).toContain('fetchAssignment');
    // An unresolved assignment is a boundary state, not an error and not access.
    expect(shell).toContain('Company non assegnata');
  });

  it('no client-side filtering replaced a server check', () => {
    for (const c of CAPABILITIES) {
      const src = code(c.file);
      expect(src, `${c.name} must not filter by advisor client-side`).not.toMatch(/advisorId|callerAdvisor/);
    }
  });

  it('the portfolio lists every assignment — multi-Company is the normal case', () => {
    const src = code(PORTFOLIO);
    expect(src).toContain('list.map');
    expect(src).toMatch(/assegnazion/i);
    // Final pass: master/detail preselects the first row so the detail pane is
    // never empty on arrival. The invariant is that EVERY assignment is listed
    // and the selection is explicit — not that no index is ever read.
    expect(src).toContain('setSelectedId');
    expect(src).toContain('c.assignmentId === selectedId');
    expect(src).not.toMatch(/companies\[0\]\.assignmentId\s*\}/);
  });

  it('Company context is explicit on every per-Company route', () => {
    const shell = code(`${CTX}/_components/CompanyContextShell.tsx`);
    // Second pass: the tall PageHead masthead became a compact context bar —
    // the guarantee is that the Company is named and its relationship stated
    // on every route, not that one particular primitive renders it.
    expect(shell).toContain('company.companyName');
    expect(shell).toContain('company.role');
    expect(shell).toMatch(/<h1/);
    expect(shell).toContain('Relazione attiva');
    for (const c of CAPABILITIES) {
      expect(code(c.route), `${c.name} renders outside the Company context`).toContain('CompanyContextShell');
    }
  });

  it('the server contract behind every route is unchanged', () => {
    const api = read('app/api/advisor/companies/[assignmentId]/messages/route.ts');
    expect(api).toContain('requireAdvisorUser');
    expect(api).toContain('callerAdvisorId');
  });
});

// ── H / I / J — Partner, demo and booking boundaries ──────────────────────

describe('KORA-WP-064 (H/I/J) — Partner, demo-runtime and booking boundaries', () => {
  it('no Partner surface, capacity or terminology is introduced', () => {
    const all = [PORTFOLIO, `${CTX}/page.tsx`, `${CTX}/_lib.ts`, ...CAPABILITIES.map((c) => c.file)].map(code).join('\n');
    for (const forbidden of ['Partner Validator', 'partner_capacity', 'partnerCapacity', 'PARTNER-003', 'app/partner']) {
      expect(all, `${forbidden} must not appear`).not.toContain(forbidden);
    }
    // 'Partner Advisor' survives ONLY as a pre-existing assignment role value.
    expect(read(`${CTX}/_lib.ts`)).toContain("'Company Advisor' | 'Partner Advisor'");
  });

  it('no demo route, demo runtime or role switching is referenced', () => {
    const all = [PORTFOLIO, `${CTX}/page.tsx`, ...CAPABILITIES.map((c) => c.file)].map(code).join('\n');
    for (const forbidden of ['/demo', 'tenant_kind', 'tenantKind', 'persona', 'demo-state']) {
      expect(all, `${forbidden} must not appear`).not.toContain(forbidden);
    }
  });

  it('appointments keep their own canonical path — no KORA Space booking dependency', () => {
    const appts = code(`${CTX}/_components/AppointmentsClient.tsx`);
    expect(appts).toContain('/appointments');
    for (const forbidden of ['commons/bookings', 'BookingService', 'Booking selected', 'booking-request']) {
      expect(appts, `${forbidden} would import KORA-WP-050 scope`).not.toContain(forbidden);
    }
  });
});

// ── K / L — no new backend, no entitlement architecture ───────────────────

describe('KORA-WP-064 (K/L) — no new API, service, schema, migration or feature-flag system', () => {
  it('no new Advisor API route was added', () => {
    const routes = readdirSync(join(ROOT, 'app/api/advisor/companies/[assignmentId]'));
    expect(routes.sort()).toEqual(['appointments', 'cases', 'content', 'koral-review', 'messages', 'review-assessments'].sort());
  });

  it('no new service or lib module was created for this package', () => {
    expect(exists('services/advisor-portal')).toBe(false);
    expect(exists('lib/advisor-navigation')).toBe(false);
  });

  it('no migration was added: 089 is still the highest', () => {
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
    expect(files.some((f) => /wp[-_]?064|advisor[-_]?portal/i.test(f))).toBe(false);
  });

  it('no per-tenant feature flag or entitlement architecture was introduced', () => {
    const all = [PORTFOLIO, `${CTX}/page.tsx`, `${CTX}/_lib.ts`, `${CTX}/_components/CompanyContextShell.tsx`, ...CAPABILITIES.map((c) => c.file)].map(code).join('\n');
    for (const forbidden of ['featureFlag', 'isFeatureFlagEnabled', 'entitlement', 'production_ready', 'contractTier', 'commercial']) {
      expect(all, `${forbidden} belongs to the deferred commercial architecture`).not.toContain(forbidden);
    }
    // The generic mechanism stays untouched and unregistered.
    expect(read('lib/feature-flags/feature-flags.ts')).toContain('FEATURE_FLAG_NAMES = [] as const');
  });

  it('no Advisor SLA, compensation, pricing, packaging or payable surface appears', () => {
    const all = [PORTFOLIO, `${CTX}/page.tsx`, ...CAPABILITIES.map((c) => c.file)].map(code).join('\n');
    for (const forbidden of ['SLA', 'compenso', 'payable', 'pricing', 'fattur', 'packaging']) {
      expect(all, `${forbidden} is KORA-WP-074 / commercial territory`).not.toContain(forbidden);
    }
  });

  it('no governance or prerequisite administration is reproduced — that is KORA-WP-039', () => {
    const all = [PORTFOLIO, `${CTX}/page.tsx`, ...CAPABILITIES.map((c) => c.file)].map(code).join('\n');
    for (const forbidden of ['prerequisite', 'advisor-governance', 'qualification-grant', 'grantQualification']) {
      expect(all, `${forbidden} belongs to the Admin governance surface`).not.toContain(forbidden);
    }
  });

  it('no cross-Company aggregation dashboard was built — Reading 3 was not selected', () => {
    const overview = code(`${CTX}/page.tsx`);
    // The overview orients and navigates; it fetches nothing of its own.
    expect(overview).not.toContain('fetch(');
    const portfolio = code(PORTFOLIO);
    for (const forbidden of ['allAppointments', 'allCases', 'inbox', 'across', 'globale']) {
      expect(portfolio, `${forbidden} suggests cross-Company aggregation`).not.toContain(forbidden);
    }
  });
});

// ── M — global navigation vs local IA ─────────────────────────────────────

describe('KORA-WP-064 (M) — global Advisor navigation and local Company IA stay coherent', () => {
  it('the global sidebar still carries exactly the two canonical Advisor destinations', () => {
    const groups = buildNavGroups('ADVISOR');
    expect(groups).toHaveLength(1);
    const hrefs = groups[0].items.map((i) => i.href);
    expect(hrefs).toEqual(['/advisor', '/advisor/companies']);
  });

  it('no individual Company is hardcoded into the Product shell', () => {
    const sidebar = read('components/layout/Sidebar.tsx');
    expect(sidebar).not.toMatch(/\/advisor\/companies\/[0-9a-f]{8}/i);
    expect(sidebar).not.toContain('/advisor/companies/${');
  });

  it('the local section navigation is complete and derived from one declaration', () => {
    const lib = read(`${CTX}/_lib.ts`);
    expect(lib).toContain('COMPANY_SECTIONS');
    for (const slug of ['messaggi', 'appuntamenti', 'note', 'case', 'valutazioni', 'koral-review']) {
      expect(lib, `${slug} missing from the section declaration`).toContain(`'${slug}'`);
    }
    const shell = code(`${CTX}/_components/CompanyContextShell.tsx`);
    expect(shell).toContain('COMPANY_SECTIONS.map');
    expect(shell).toContain("aria-current={active ? 'page' : undefined}");
  });
});

// ── WP-125 foundation ─────────────────────────────────────────────────────

describe('KORA-WP-064 — the portal consumes the WP-125 Product Experience', () => {
  const surfaces = [PORTFOLIO, `${CTX}/_components/OverviewClient.tsx`, `${CTX}/_components/CompanyContextShell.tsx`, ...CAPABILITIES.map((c) => c.file)];

  it('every surface uses the PX tokens and no legacy or local visual system', () => {
    for (const f of surfaces) {
      const src = code(f);
      expect(src, `${f} does not use the PX tokens`).toContain("from '@/lib/design/kora-design-tokens'");
      expect(src, `${f} still uses the legacy token register`).not.toContain('TOKENS.');
      expect(src, `${f} still uses legacy warm-paper styling`).not.toContain('kora-paper');
      expect(src, `${f} declares its own breakpoint`).not.toMatch(/@media/);
    }
  });

  it('every surface that renders its own chrome consumes the shared primitives', () => {
    // The overview delegates all chrome to the shell, so it legitimately
    // imports none — every OTHER surface renders a Region/state of its own.
    for (const f of surfaces) {
      expect(code(f), `${f} does not consume the shared primitives`).toContain("from '@/components/ui/px'");
    }
  });

  it('the rail is contextual, never repeated chrome', () => {
    // Second pass: the same Assegnazione / Limite di accesso / Percorsi
    // collegati rail appeared on every route regardless of the job. The rail
    // is now opt-in through the shell's `secondary` slot, and the access rule
    // is stated ONCE, in the shell.
    const shell = code(`${CTX}/_components/CompanyContextShell.tsx`);
    expect(shell).toContain('secondary?:');
    expect(shell).toMatch(/Accesso limitato all’assegnazione/);
    for (const c of CAPABILITIES) {
      expect(code(c.file), `${c.name} re-declares the access rule`).not.toMatch(/Limite di accesso/);
      expect(code(c.file), `${c.name} re-declares the assignment panel`).not.toMatch(/label="Assegnazione"/);
    }
    // The portfolio gives its full width to the work.
    expect(code(PORTFOLIO)).not.toContain('<Col span="rail">');
  });

  it('no Foundation Light label is introduced on any Advisor surface', () => {
    for (const f of surfaces) expect(read(f)).not.toMatch(/Foundation Light/i);
  });
});


// ── SECOND PASS — Product Experience upgrade over the same backend ────────
//
// Founder withheld Visual Acceptance on the first pass: the decomposition was
// architecturally right but read as CRUD. These guards pin the upgraded
// interactions AND the honesty boundary — every new affordance must come from
// data the existing APIs already return.

describe('KORA-WP-064 (second pass) — appointments are a scheduling workspace', () => {
  const appts = () => code(`${CTX}/_components/AppointmentsClient.tsx`);

  it('offers both a calendar and an agenda over the SAME canonical set', () => {
    const src = appts();
    expect(src).toContain("useState<'calendar' | 'agenda'>");
    // One fetch, one source of truth; both views render from `list`.
    expect(src.match(/fetch\(/g) ?? []).toHaveLength(2); // GET list + POST action
    expect(src).toContain('const list = useMemo');
    expect(src).toContain('const byDay = useMemo');
  });

  it('the calendar is derived from real appointments only — no invented events', () => {
    const src = appts();
    expect(src).toContain('byDay.get(cell.key)');
    for (const forbidden of ['Math.random', 'sampleEvents', 'placeholderEvent', 'fakeAppointment']) {
      expect(src, `${forbidden} would fabricate schedule data`).not.toContain(forbidden);
    }
    // A month with nothing in it says so rather than pretending.
    expect(src).toMatch(/Nessun appuntamento in/);
  });

  it('is agenda-first on a phone using the foundation\'s own breakpoint', () => {
    const src = appts();
    expect(src).toContain("matchMedia('(max-width: 1200px)')");
    const globals = read('app/globals.css');
    expect(globals, 'the 1200px collapse is WP-125\'s own rule').toContain('@media (max-width: 1200px)');
  });

  it('RESCHEDULE NO LONGER USES window.prompt — and still posts the same canonical write', () => {
    const src = appts();
    expect(src).not.toContain('window.prompt');
    expect(src).not.toContain('window.alert');
    expect(src).toContain('DateField');                    // WP-125 primitive
    // Final pass (§12): the native time control renders AM/PM from the BROWSER
    // locale, which put "09:57 PM" beside a "21:57" thread. The fields are now
    // semantic inputs pinned to 24h HH:MM; the composed instant is unchanged.
    expect(src).toContain('const HHMM =');
    expect(src).toContain('placeholder="HH:MM"');
    expect(src).toContain('hour12: false');
    expect(src).not.toContain('type="time"');
    expect(src).toContain("action: 'reschedule'");
    expect(src).toContain('startsAt');
    expect(src).toContain('endsAt');
    expect(src).toContain('reason');
    // Only fields the existing API accepts are edited.
    const api = read('app/api/advisor/companies/[assignmentId]/appointments/[appointmentId]/route.ts');
    expect(api).toContain('newSubject: body.subject');
  });

  it('cancel also captures its required reason inline, never through a prompt', () => {
    const src = appts();
    expect(src).toContain("action: 'cancel'");
    expect(src).toMatch(/Motivo dell’annullamento/);
  });

  it('no prompt or alert survives anywhere in the Advisor portal', () => {
    for (const f of [PORTFOLIO, `${CTX}/page.tsx`, ...CAPABILITIES.map((c) => c.file)]) {
      expect(code(f), `${f} still uses a browser dialog`).not.toMatch(/window\.(prompt|alert|confirm)/);
    }
  });
});

describe('KORA-WP-064 (second pass) — the other surfaces earn their space', () => {
  it('messages read as a conversation and preserve authorship', () => {
    const src = code(`${CTX}/_components/MessagesClient.tsx`);
    expect(src).toContain("m.senderRole === 'ADVISOR'");
    expect(src).toMatch(/Tu · Advisor/);
    expect(src).toContain('Company');
    // No invented messaging affordances.
    for (const forbidden of ['unread', 'letto', 'typing', 'readReceipt', 'online']) {
      expect(src, `${forbidden} does not exist in the message model`).not.toContain(forbidden);
    }
  });

  it('notes render as a timeline and keep the visibility classification', () => {
    const src = code(`${CTX}/_components/ContentClient.tsx`);
    expect(src).toContain('function visibility');
    expect(src).toMatch(/Visibile alla Company/);
    expect(src).toMatch(/Riservato/);
    expect(src).toContain('CLASS_LABEL');           // taxonomy unchanged
    expect(src).toContain('c.shared');              // shared flag drives visibility, not a guess
  });

  it('cases group by the EXISTING lifecycle and keep both transitions', () => {
    const src = code(`${CTX}/_components/CasesClient.tsx`);
    expect(src).toContain("c.status === 'open'");
    expect(src).toContain("c.status === 'in-progress'");
    expect(src).toContain("transition(c.id, 'in-progress')");
    expect(src).toContain("'resolved'");
    expect(src).toContain('resolutionNote');
    // No fabricated lifecycle.
    for (const forbidden of ['kanban', 'drag', 'assignee', 'sla', 'dueDate']) {
      expect(src, `${forbidden} is not in the case model`).not.toContain(forbidden);
    }
  });

  it('review assessments do NOT invent Review discovery', () => {
    const src = code(`${CTX}/_components/AssessmentsClient.tsx`);
    expect(src).toContain('reviewId');
    // No listing endpoint is called or faked.
    expect(src).not.toMatch(/\/reviews\b/);
    expect(src).not.toContain('listReviews');
    expect(src).not.toMatch(/<option/);
    // The limitation is stated honestly to the Advisor.
    expect(src).toMatch(/non espone ancora un elenco delle Review/);
    // And the endpoint still requires the id, proving the constraint is real.
    expect(read(`app/api/advisor/companies/[assignmentId]/review-assessments/route.ts`)).toContain('reviewId?.trim()');
  });

  it('KORAL Review stays within its current scope', () => {
    const src = code(`${CTX}/_components/KoralReviewClient.tsx`);
    expect(src).toContain('eligibleForConfirmation');
    expect(src).toContain('recognizedForInterpretation');
    expect(src).toContain('koral-review/confirm');
    for (const forbidden of ['WP-117', 'generateInterpretation', 'AI', 'edition', 'morphology']) {
      expect(src, `${forbidden} would expand Living KORAL`).not.toContain(forbidden);
    }
  });

  it('the overview orients from real per-assignment state, inventing no metric', () => {
    const src = code(`${CTX}/_components/OverviewClient.tsx`);
    expect(src).toContain('COMPANY_SECTIONS');
    // Final pass: inside ONE assignment the existing endpoints may be read.
    // Exactly four, each backing a visible signal — and all scoped to this
    // assignment, never across Companies.
    const calls = [...src.matchAll(/get\('([a-z-]+)'\)/g)].map((m) => m[1]).sort();
    expect(calls).toEqual(['appointments', 'cases', 'koral-review', 'messages']);
    expect(src).toContain('/api/advisor/companies/${assignmentId}/');
    for (const forbidden of ['score', 'urgenza', 'priorit', 'health', 'unread', 'KPI']) {
      expect(src, `${forbidden} is not derivable from current data`).not.toContain(forbidden);
    }
  });

  it('the portfolio leads with entering the workspace, shortcuts subordinate', () => {
    const src = code(PORTFOLIO);
    expect(src).toContain('href={`/advisor/companies/${c.assignmentId}`}');
    expect(src).toContain('ChevronRight');
    expect(src).toContain('COMPANY_SECTIONS.filter');
    // No invented Company KPI on the portfolio either.
    for (const forbidden of ['score', 'health', 'unread', 'workload']) {
      expect(src, `${forbidden} is not available per Company`).not.toContain(forbidden);
    }
  });
});

describe('KORA-WP-064 (second pass) — global aggregates were NOT simulated', () => {
  it('no cross-Company fan-out fetch exists anywhere in the portal', () => {
    for (const f of [PORTFOLIO, `${CTX}/page.tsx`, ...CAPABILITIES.map((c) => c.file)]) {
      const src = code(f);
      // An N+1 across assignments would look like a map over companies that fetches.
      // No `s` flag: the compile target predates it — a newline-tolerant
      // character class does the same job.
      expect(src, `${f} fans out across assignments`).not.toMatch(/companies\.map\([\s\S]*?fetch/);
      expect(src, `${f} awaits a batch of per-Company requests`).not.toContain('Promise.all(');
    }
  });

  it('the assignment endpoint still returns assignments only — no aggregate source exists', () => {
    const api = read('app/api/advisor/companies/route.ts');
    expect(api).toContain('getAdvisorAssignedCompanies');
    for (const absent of ['appointments', 'cases', 'assessments', 'counts']) {
      expect(api, `${absent} would make a global view feasible`).not.toContain(absent);
    }
  });
});


// ── FINAL PASS — targeted Product quality remediation ─────────────────────

describe('KORA-WP-064 (final pass) — portfolio master/detail without fan-out', () => {
  it('the detail is built from the assignment row, never from capability endpoints', () => {
    const src = code(PORTFOLIO);
    // Exactly one request on this page: the assignment list itself.
    expect(src.match(/fetch\(/g) ?? []).toHaveLength(1);
    expect(src).toContain("fetch('/api/advisor/companies'");
    for (const cap of ['/messages', '/appointments', '/content', '/cases', '/review-assessments', '/koral-review']) {
      expect(src, `${cap} would be an N+1 across assignments`).not.toContain(cap);
    }
  });

  it('entering the workspace stays the primary action', () => {
    const src = code(PORTFOLIO);
    expect(src).toMatch(/Entra nel workspace/);
    expect(src).toContain('href={`/advisor/companies/${c.assignmentId}`}');
  });

  it('the second pane is not forced at phone width', () => {
    const src = code(PORTFOLIO);
    expect(src).toContain("matchMedia('(max-width: 1200px)')");
    expect(src).toContain('narrow');
  });
});

describe('KORA-WP-064 (final pass) — workflow structure stays visible', () => {
  it('cases render all three lifecycle groups, with honest zero states', () => {
    const src = code(`${CTX}/_components/CasesClient.tsx`);
    expect(src).toContain('Da lavorare');
    expect(src).toContain('Bloccati o escalati');
    expect(src).toContain('Risolti');
    expect(src).toContain('empty:');
    // Groups derive from the real status values only.
    for (const st of ["'open'", "'in-progress'", "'blocked'", "'escalated'", "'resolved'"]) {
      expect(src, `${st} must come from the real model`).toContain(st);
    }
    for (const invented of ['triage', 'backlog', 'wontfix', 'sla']) {
      expect(src, `${invented} is not a KORA case state`).not.toContain(invented);
    }
  });

  it('KORAL shows both stages with counts and explains what will arrive', () => {
    const src = code(`${CTX}/_components/KoralReviewClient.tsx`);
    expect(src).toContain('Da confermare');
    expect(src).toContain('Riconosciute');
    expect(src).toContain('eligibleForConfirmation');
    expect(src).toContain('recognizedForInterpretation');
    expect(src).toMatch(/Quando una trasformazione materiale resta ambigua/);
    // Interpretation appears only for a selected item.
    expect(src).toContain('{targetId && (');
  });

  it('the message thread is a conversation workspace, and its minimum height serves that', () => {
    const src = code(`${CTX}/_components/MessagesClient.tsx`);
    expect(src).toContain('minHeight');
    expect(src).toContain("overflowY: 'auto'");
    expect(src).toContain("alignContent: 'end'");
    // The canonical set and write path are untouched.
    expect(src).toContain('/messages');
    expect(src).toContain("method: 'POST'");
  });
});

describe('KORA-WP-064 (final pass) — assessments stay honest about the gap', () => {
  it('existing assessments lead, the reference action is secondary and calm', () => {
    const src = code(`${CTX}/_components/AssessmentsClient.tsx`);
    expect(src).toMatch(/Riferimento della Review/);
    expect(src).toMatch(/non espone ancora un elenco delle Review/);
    // No developer language, no fabricated selector.
    for (const bad of ['UUID', 'endpoint', 'API', 'TODO', '<option']) {
      expect(src, `${bad} would read as a debug tool`).not.toContain(bad);
    }
  });
});
