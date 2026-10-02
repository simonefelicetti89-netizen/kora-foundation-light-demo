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
//   Nothing. PIB is provisioned, but ONLY through the real methodology:
//   scripts/koratest-canonical-seed.ts is invoked with a generated fixture
//   carrying THIS tenant's own tenant_code, which makes the canonical ingestion
//   pipeline produce real analytics.uef_record rows (that script reuses an
//   existing tenant by code and never updates it, so the golden-path tenant row
//   is untouched). Every personal.worker_pib row is then computed by
//   WorkerIUComputationService.computeBaseWorkerPIBRows — no iu_value is ever
//   chosen here. If the pipeline yields no approved UEF record, PIB is skipped
//   and reported, never faked.
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
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { computeBaseWorkerPIBRows } from '@/services/worker-iu-computation/WorkerIUComputationService';

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
    console.log('Would also run the canonical seed for this tenant to produce real UEF records, then compute personal.worker_pib via computeBaseWorkerPIBRows.');
    await pg.end();
    return;
  }

  const suffixSeed = randomBytes(4).toString('hex');

  // Idempotency: remove any prior fixture rows carrying the marker, so a re-run
  // converges instead of accumulating. Only marked rows are ever touched.
  await pg.query(`delete from personal.worker_pib where source_participation_id in (select p.id from personal.worker_participation p join personal.worker_initiative i on i.id = p.initiative_id where i.title like $1)`, [`[${MARK}]%`]);
  await pg.query(`delete from commons.booking where post_id in (select id from commons.post where title like $1)`, [`[${MARK}]%`]);
  await pg.query(`delete from personal.worker_participation where initiative_id in (select id from personal.worker_initiative where title like $1)`, [`[${MARK}]%`]);
  await pg.query(`delete from personal.worker_initiative where title like $1`, [`[${MARK}]%`]);
  await pg.query(`delete from commons.post where title like $1`, [`[${MARK}]%`]);
  await pg.query(`delete from network.partner_profile where name like $1`, [`[${MARK}]%`]);

  // The non-onboarded worker created in step 5 carries a random suffix, so it is
  // NOT covered by the marked-row deletes above, and every run used to leave one
  // behind — measured: three runs, three residual workers. Cleanup is therefore
  // by worker_ref prefix, and the auth user goes too: an orphaned auth user with
  // no identity row is still residue.
  const stale = await pg.query(
    `select id, auth_user_id from personal.worker_identity where worker_ref like $1`,
    [`${MARK}-ONBOARDING-%`],
  );
  if (stale.rowCount) {
    await pg.query(
      `delete from personal.worker_profile_private where worker_id in
         (select id from personal.worker_identity where worker_ref like $1)`,
      [`${MARK}-ONBOARDING-%`],
    );
    await pg.query(`delete from personal.worker_identity where worker_ref like $1`, [`${MARK}-ONBOARDING-%`]);
    const cleanupAdmin = createClient(url, srk, { auth: { autoRefreshToken: false, persistSession: false } });
    for (const row of stale.rows) {
      if (!row.auth_user_id) continue;
      const del = await cleanupAdmin.auth.admin.deleteUser(row.auth_user_id as string);
      if (del.error) fail(`failed to remove a prior fixture auth user: ${del.error.message}`);
    }
    console.log(`  prior non-onboarded workers    -${stale.rowCount} (identity + profile + auth user)`);
  }

  // ORPHANED AUTH USERS. The sweep above is keyed on worker_identity, so an auth
  // user whose identity row was already removed by some other path is
  // unreachable through it and simply accumulates — 13 were found this way. The
  // fixture owns every account matching its own generated email shape, so it
  // sweeps them by that shape too and the cleanup stops depending on which row
  // happened to be deleted first.
  {
    const orphans = await pg.query(
      `select u.id from auth.users u
        where u.email like 'e2e-worker-onboarding-%@e2e-local.test'
          and not exists (select 1 from personal.worker_identity i where i.auth_user_id = u.id)`,
    );
    if (orphans.rowCount) {
      const sweepAdmin = createClient(url, srk, { auth: { autoRefreshToken: false, persistSession: false } });
      for (const row of orphans.rows) {
        const del = await sweepAdmin.auth.admin.deleteUser(row.id as string);
        if (del.error) fail(`failed to remove an orphaned fixture auth user: ${del.error.message}`);
      }
      console.log(`  orphaned fixture auth users    -${orphans.rowCount}`);
    }
  }

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

  // ── 4b. PIB — computed by the canonical methodology, never invented ──
  // Step 1: make the real ingestion pipeline produce UEF records for THIS
  // tenant, by handing the governed canonical seed a fixture with its code.
  const tmpFixture = join(process.cwd(), `.w129-review-fixture-${suffixSeed}.json`);
  writeFileSync(tmpFixture, JSON.stringify({
    _comment: 'KORA-WP-129 review fixture input — generated, disposable, synthetic.',
    company_name:         'E2E Local Golden Path Synthetic Tenant',
    tenant_code:          tenantCode,
    reporting_period:     '2026-Q1',
    workforce_population: 120,
    segment_breakdown:    { Operations: 60, Engineering: 40, Sales: 20 },
    rows: [
      { row_id: 'W129-R1', initiative_name: 'Screening prevenzione sintetico', category: 'salute',     type: 'servizio',  amount: 9000,  participants: 60, department_group: 'Operations' },
      { row_id: 'W129-R2', initiative_name: 'Percorso digitale sintetico',     category: 'formazione', type: 'formazione', amount: 12000, participants: 40, department_group: 'Engineering' },
    ],
  }, null, 2), { mode: 0o600 });

  try {
    execFileSync('npx', ['tsx', 'scripts/koratest-canonical-seed.ts', `--fixture=${tmpFixture}`, '--apply'], {
      stdio: 'pipe', encoding: 'utf8',
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: srk },
    });
    console.log('  analytics.uef_record            via canonical pipeline (tenant reused, not modified)');
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const detail = `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message || String(e);

    // KNOWN AND CLASSIFIED, not tolerated generically. Migration 049 creates
    // analytics.methodology_snapshot, grants SELECT to `authenticated` and
    // grants NOTHING to `service_role`, while its own comment states that
    // "only KORA_ADMIN (via service_role in application code) ever inserts".
    // service_role bypasses RLS but NOT table grants, so the snapshot insert in
    // lib/live/persistence.ts fails. Verified against the local database:
    // service_role holds full DML on analytics.uef_record and no grant at all on
    // analytics.methodology_snapshot. It is a Product authorization defect,
    // reported and NOT fixed here, and it strictly follows the UEF commit — so
    // the evidence state this fixture needs already exists when it fires.
    // Any OTHER failure is unexplained and must stop the run.
    const KNOWN_SNAPSHOT_GRANT_DEFECT =
      /methodology_snapshot: permission denied for table methodology_snapshot/;
    if (!KNOWN_SNAPSHOT_GRANT_DEFECT.test(detail)) {
      fail(`canonical seed failed with an unexpected error:\n${detail.slice(0, 1200)}`);
    }
    console.log('  analytics.uef_record            committed; the snapshot persist hit the KNOWN migration-049');
    console.log('                                 service_role grant defect. Classified, not suppressed.');
  } finally {
    rmSync(tmpFixture, { force: true });
  }

  // Step 2: compute PIB from a real approved UEF record + the real attended
  // participations. Every value below comes out of the Product methodology.
  // personal.worker_pib carries a UNIQUE (source_uef_record_id, pillar)
  // invariant, so each participation must be paired with its OWN UEF record.
  // Whatever the pipeline produced is what gets used — never more.
  const uef = await pg.query(
    `select id, eligibility, action_family, event_nature, primary_pillar, missing_fields,
            approved_for_impact_units, payload
       from analytics.uef_record
      where tenant_id = $1 and approved_for_impact_units = true and primary_pillar is not null
      order by created_at`,
    [tenantId],
  );

  if (uef.rowCount === 0) {
    console.log('  personal.worker_pib            SKIPPED — no approved UEF record; PIB is never fabricated.');
  } else {
    const parts = await pg.query(
      `select p.id from personal.worker_participation p
         join personal.worker_initiative i on i.id = p.initiative_id
        where p.worker_id = $1 and p.status = 'attended' and i.title like $2
        order by p.created_at`,
      [workerIdentityId, `[${MARK}]%`],
    );
    let inserted = 0;
    const pairs = Math.min(parts.rows.length, uef.rows.length);
    for (let i = 0; i < pairs; i += 1) {
      const part = parts.rows[i];
      const rec  = uef.rows[i];
      const pibRows = computeBaseWorkerPIBRows({
        workerIdentityId,
        reportingPeriod: '2026-Q1',
        sourceKind:      'company_sourced',
        participationId: part.id,
        uefRecord: {
          id:                        rec.id,
          eligibility:               rec.eligibility,
          action_family:             rec.action_family,
          event_nature:              rec.event_nature,
          primary_pillar:            rec.primary_pillar,
          missing_fields:            (rec.missing_fields ?? []) as string[],
          approved_for_impact_units: rec.approved_for_impact_units,
          payload:                   (rec.payload ?? {}) as Record<string, unknown>,
        },
      });
      for (const r of pibRows) {
        await pg.query(
          `insert into personal.worker_pib
             (worker_identity_id, reporting_period, pillar, iu_value, verification_status,
              is_exportable, source_kind, source_uef_record_id, source_participation_id, computed_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
           on conflict do nothing`,
          [r.worker_identity_id, r.reporting_period, r.pillar, r.iu_value, r.verification_status,
           r.is_exportable, r.source_kind, r.source_uef_record_id, r.source_participation_id],
        );
        inserted += 1;
      }
    }
    console.log(`  personal.worker_pib            +${inserted} (computed by computeBaseWorkerPIBRows, ${pairs} participation/UEF pair(s))`);
  }

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

  await pg.end();
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
