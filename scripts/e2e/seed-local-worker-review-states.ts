#!/usr/bin/env tsx
// scripts/e2e/seed-local-worker-review-states.ts
// KORA-WP-129 W2/W3 Founder Review fixture provisioning.
//
// Creates the minimum DETERMINISTIC SYNTHETIC review state the remaining
// Worker surfaces need in order to be meaningfully reviewable BEFORE any W2/W3
// visual migration exists. This is review/test infrastructure: nothing under
// app/, components/, lib/ or services/ imports it, and it changes no Product
// behaviour, semantics or schema.
//
// It builds ON TOP of scripts/e2e/seed-local-golden-path.ts, which must have
// run first — this script never creates the tenant or the golden-path worker,
// it reads them and attaches review state to them.
//
// WHAT IT PROVISIONS, and which surface each unblocks:
//   network.partner_profile (published)    -> /worker/opportunities
//   commons.post (published, generic)      -> /worker/commons  (post feed)
//   commons.post (published + opening_grade)-> /worker/commons  (initiatives)
//   commons.booking                        -> /worker/bookings
//   personal.worker_initiative             -> participation precursor
//   personal.worker_participation (attended)-> /worker/dynamic-cv (+ print)
//   a second, NON-ONBOARDED worker         -> /worker/onboarding
//
// WHAT IT DELIBERATELY DOES NOT PROVISION:
//   personal.worker_pib. A PIB row's iu_value must come from the canonical
//   methodology (WorkerIUComputationService.computeBaseWorkerPIBRows, which
//   requires an analytics.uef_record produced by the ingestion pipeline), not
//   from a number chosen here. Inventing iu_value would fabricate Product
//   behaviour. /worker/personal-impact-balance therefore remains BLOCKED for
//   populated review until the canonical UEF chain is seeded — see the report.
//
// SAFETY GATES — identical model to seed-local-golden-path.ts:
//   1. E2E_LOCAL_SEED_CONFIRM must be exactly 'YES'.
//   2. SUPABASE_URL must resolve to a loopback host; any hosted/staging/
//      production Supabase domain is refused outright, same denylist.
//   3. SUPABASE_SERVICE_ROLE_KEY must be the LOCAL service-role key.
//   4. Dry-run by default. --apply must be explicit.
//
// PRIVACY: every value below is synthetic and obviously so. No real person
// data. No privacy, consent, RLS or auth rule is bypassed, weakened or
// altered: rows are written through the service role exactly as the existing
// local seed scripts do, and every Worker-facing read still goes through the
// unchanged Product guards and RLS.

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const KNOWN_NON_LOCAL_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];

const APPLY = process.argv.includes('--apply');

function fail(msg: string): never {
  console.error(`FATAL: ${msg}`);
  process.exit(1);
}

function assertLocalOnly(rawUrl: string): void {
  let host: string;
  try { host = new URL(rawUrl).hostname.toLowerCase(); } catch { fail(`SUPABASE_URL is not a URL: ${rawUrl}`); }
  if (!ALLOWED_LOCAL_HOSTS.includes(host)) fail(`SUPABASE_URL host "${host}" is not local — refusing.`);
  for (const ref of KNOWN_NON_LOCAL_REFS) {
    if (rawUrl.includes(ref)) fail(`SUPABASE_URL references the non-local project "${ref}" — refusing.`);
  }
}

// Deterministic marker so re-runs are idempotent and every row is identifiable
// as review fixture rather than mistaken for real content.
const MARK = 'W129-REVIEW-FIXTURE';

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? '';
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (process.env.E2E_LOCAL_SEED_CONFIRM !== 'YES') fail("E2E_LOCAL_SEED_CONFIRM must be exactly 'YES'.");
  if (!url || !srk) fail('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  assertLocalOnly(url);

  // The golden-path seed writes this file; it identifies the tenant and worker
  // this script attaches review state to.
  const envPath = join(process.cwd(), '.env.e2e-local-golden-path.local');
  let goldenEnv: Record<string, string>;
  try {
    goldenEnv = Object.fromEntries(
      readFileSync(envPath, 'utf8').split('\n').filter(Boolean)
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
    );
  } catch { fail(`${envPath} not found — run scripts/e2e/seed-local-golden-path.ts first.`); }

  const tenantCode = goldenEnv.E2E_COMPANY_A_TENANT_CODE;
  if (!tenantCode) fail('E2E_COMPANY_A_TENANT_CODE missing from the golden-path env file.');

  const pgUrl = process.env.LOCAL_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
  const pg = new Client({ connectionString: pgUrl });
  await pg.connect();

  const t = await pg.query('select id from analytics.tenant where tenant_code = $1', [tenantCode]);
  if (t.rowCount !== 1) fail(`tenant ${tenantCode} not found — run the golden-path seed first.`);
  const tenantId: string = t.rows[0].id;

  const w = await pg.query('select id from personal.worker_identity where tenant_id = $1 order by created_at limit 1', [tenantId]);
  if (w.rowCount !== 1) fail('no worker_identity for that tenant — run the golden-path seed first.');
  const workerIdentityId: string = w.rows[0].id;

  console.log(`Target tenant ${tenantCode} (${tenantId.slice(0, 8)}…), worker_identity ${workerIdentityId.slice(0, 8)}…`);
  if (!APPLY) console.log('DRY RUN — no writes. Re-run with --apply to write.');

  // ── 1. Partner profiles — /worker/opportunities reads status='published' ──
  const partners = [
    { name: `[${MARK}] Centro Prevenzione Sintetico`, pillar: 'LIFE',       category: 'prevenzione',  city: 'Milano', delivery_mode: 'onsite',
      description: 'Partner sintetico di review: screening e prevenzione. Nessun dato reale.' },
    { name: `[${MARK}] Accademia Digitale Sintetica`, pillar: 'GROWTH',     category: 'formazione',   city: 'Torino', delivery_mode: 'online',
      description: 'Partner sintetico di review: percorsi di upskilling digitale. Nessun dato reale.' },
    { name: `[${MARK}] Rete Volontariato Sintetica`,  pillar: 'IMPACT',     category: 'volontariato', city: 'Bologna', delivery_mode: 'onsite',
      description: 'Partner sintetico di review: progetti di volontariato territoriale. Nessun dato reale.' },
  ];

  // ── 2. commons.post — generic feed posts (no opening_grade) ──
  const genericPosts = [
    { title: `[${MARK}] Benvenuto in KORA Space`, category: 'announcement', pillar: 'CONNECTION',
      body: 'Post sintetico di review. KORA Space raccoglie le iniziative collettive della tua azienda.' },
    { title: `[${MARK}] Come funzionano le iniziative`, category: 'announcement', pillar: 'GROWTH',
      body: 'Post sintetico di review. Le iniziative pubblicate possono prevedere una richiesta di partecipazione.' },
  ];

  // ── 3. commons.post — initiatives (opening_grade NOT NULL is the filter) ──
  const initiativePosts = [
    { title: `[${MARK}] Giornata di prevenzione`, category: 'event', pillar: 'LIFE', opening_grade: 'company_internal',
      body: 'Iniziativa sintetica di review: giornata di screening interna.', capacity_internal: 40, capacity_cross: null,
      location_address: 'Sede sintetica, Milano', days: 21 },
    { title: `[${MARK}] Laboratorio digitale cross-company`, category: 'event', pillar: 'GROWTH', opening_grade: 'cross_company',
      body: 'Iniziativa sintetica di review: laboratorio aperto ad altre aziende del network.', capacity_internal: 25, capacity_cross: 10,
      location_address: 'Hub sintetico, Torino', days: 35 },
  ];

  // ── 4. worker_initiative + attended participation -> Dynamic CV ──
  const workerInitiatives = [
    { title: `[${MARK}] Corso sicurezza e benessere`, pillar: 'LIFE',   provider: 'Centro Prevenzione Sintetico' },
    { title: `[${MARK}] Percorso dati e digitale`,    pillar: 'GROWTH', provider: 'Accademia Digitale Sintetica' },
  ];

  if (!APPLY) {
    console.log(`Would create: ${partners.length} partner_profile, ${genericPosts.length} generic post, ` +
      `${initiativePosts.length} initiative post, 1 booking, ${workerInitiatives.length} worker_initiative, ` +
      `${workerInitiatives.length} attended participation, 1 non-onboarded worker.`);
    console.log('Would NOT create: personal.worker_pib (requires the canonical UEF chain — see the script header).');
    await pg.end();
    return;
  }

  // Idempotency: remove any prior fixture rows carrying the marker, so a re-run
  // converges instead of accumulating. Only marked rows are ever touched.
  await pg.query(`delete from commons.booking where post_id in (select id from commons.post where title like $1)`, [`[${MARK}]%`]);
  await pg.query(`delete from personal.worker_participation where initiative_id in (select id from personal.worker_initiative where title like $1)`, [`[${MARK}]%`]);
  await pg.query(`delete from personal.worker_initiative where title like $1`, [`[${MARK}]%`]);
  await pg.query(`delete from commons.post where title like $1`, [`[${MARK}]%`]);
  await pg.query(`delete from network.partner_profile where name like $1`, [`[${MARK}]%`]);

  for (const p of partners) {
    await pg.query(
      `insert into network.partner_profile (name, description, pillar, category, website_url, city, country, delivery_mode, status)
       values ($1,$2,$3,$4,$5,$6,'IT',$7,'published')`,
      [p.name, p.description, p.pillar, p.category, 'https://example.invalid/partner', p.city, p.delivery_mode],
    );
  }
  console.log(`  network.partner_profile        +${partners.length} (published)`);

  for (const p of genericPosts) {
    await pg.query(
      `insert into commons.post (tenant_id, author_role, title, body, category, pillar, status, published_at)
       values ($1,'COMPANY_ADMIN',$2,$3,$4,$5,'published', now())`,
      [tenantId, p.title, p.body, p.category, p.pillar],
    );
  }
  console.log(`  commons.post (generic)         +${genericPosts.length} (published)`);

  const initiativeIds: string[] = [];
  for (const p of initiativePosts) {
    const r = await pg.query(
      `insert into commons.post
         (tenant_id, author_role, title, body, category, pillar, status, published_at,
          opening_grade, location_address, capacity_internal, capacity_cross, event_start_at, event_end_at)
       values ($1,'COMPANY_ADMIN',$2,$3,$4,$5,'published', now(), $6, $7, $8, $9,
               now() + ($10 || ' days')::interval, now() + ($10 || ' days')::interval + interval '3 hours')
       returning id`,
      [tenantId, p.title, p.body, p.category, p.pillar, p.opening_grade, p.location_address, p.capacity_internal, p.capacity_cross, String(p.days)],
    );
    initiativeIds.push(r.rows[0].id);
  }
  console.log(`  commons.post (initiatives)    +${initiativePosts.length} (published, opening_grade set)`);

  // One confirmed booking by the golden-path worker on the first initiative, so
  // /worker/bookings has a populated state rather than only its empty state.
  await pg.query(
    `insert into commons.booking (post_id, worker_identity_id, worker_tenant_id, post_tenant_id, status)
     values ($1,$2,$3,$4,'approved')`,
    [initiativeIds[0], workerIdentityId, tenantId, tenantId],
  );
  console.log('  commons.booking                +1 (approved)');

  for (const wi of workerInitiatives) {
    const r = await pg.query(
      `insert into personal.worker_initiative (tenant_id, title, description, pillar, eligibility_class, status, provider, source_kind, start_date, end_date)
       values ($1,$2,$3,$4,'eligible','published',$5,'company_sourced', current_date - 60, current_date - 55)
       returning id`,
      [tenantId, wi.title, 'Iniziativa sintetica di review.', wi.pillar, wi.provider],
    );
    await pg.query(
      `insert into personal.worker_participation (tenant_id, worker_id, initiative_id, status)
       values ($1,$2,$3,'attended')`,
      [tenantId, workerIdentityId, r.rows[0].id],
    );
  }
  console.log(`  personal.worker_initiative     +${workerInitiatives.length}`);
  console.log(`  personal.worker_participation  +${workerInitiatives.length} (attended)`);

  // ── 5. A second worker who has NOT completed onboarding ──
  // /worker/onboarding redirects to the workspace when onboarding_done is true,
  // so reviewing it needs a worker for whom it is false.
  const admin = createClient(url, srk, { auth: { autoRefreshToken: false, persistSession: false } });
  const suffix = randomBytes(4).toString('hex');
  const email = `e2e-worker-onboarding-${suffix}@e2e-local.test`;
  const password = randomBytes(18).toString('base64url');
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    app_metadata: { kora_role: 'WORKER' },
  });
  if (created.error) fail(`failed to create the non-onboarded worker: ${created.error.message}`);
  const authUserId = created.data.user!.id;

  const wi2 = await pg.query(
    `insert into personal.worker_identity (tenant_id, auth_user_id, worker_ref, status)
     values ($1,$2,$3,'active') returning id`,
    [tenantId, authUserId, `${MARK}-ONBOARDING-${suffix}`],
  );

  // The WORKER guard reads kora_tenant_id / kora_worker_id / kora_status from
  // app_metadata ONLY, and kora_worker_id is only known after the identity row
  // exists — exactly the two-step the golden-path seed performs. Without this
  // the worker authenticates but every /worker route bounces to /login.
  const meta2 = await admin.auth.admin.updateUserById(authUserId, {
    app_metadata: { kora_role: 'WORKER', kora_tenant_id: tenantId, kora_worker_id: wi2.rows[0].id, kora_status: 'active' },
  });
  if (meta2.error) fail(`failed to set the non-onboarded worker app_metadata: ${meta2.error.message}`);
  await pg.query(
    `insert into personal.worker_profile_private (worker_id, display_name, onboarding_done)
     values ($1,$2,false)`,
    [wi2.rows[0].id, 'Worker Onboarding Sintetico'],
  );
  console.log('  non-onboarded worker           +1 (onboarding_done = false)');

  // Credentials go to a gitignored local file, never to stdout.
  const out = join(process.cwd(), '.env.e2e-local-worker-review.local');
  writeFileSync(out,
    [`E2E_WORKER_ONBOARDING_EMAIL=${email}`,
     `E2E_WORKER_ONBOARDING_PASSWORD=${password}`,
     `E2E_W129_REVIEW_FIXTURE_MARK=${MARK}`,
     ''].join('\n'), { mode: 0o600 });

  console.log(`\nReview fixture applied. Credentials written to ${out} (gitignored, never printed).`);
  console.log('NOT provisioned: personal.worker_pib — requires the canonical UEF chain.');
  await pg.end();
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
