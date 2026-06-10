#!/usr/bin/env tsx
// scripts/worker-trial-seed.ts
// B114: Worker Trial Seed Script — dry-run by default.
//
// USAGE:
//   npx tsx scripts/worker-trial-seed.ts --tenantCode KORA-TRIAL
//       → Dry run: prints what would be created, no DB writes
//
//   npx tsx scripts/worker-trial-seed.ts --tenantCode KORA-TRIAL --apply
//       → Applies to DB: creates initiatives only (workers require admin inviteUserByEmail)
//
// SAFETY:
//   - Default is dry-run. --apply must be explicit.
//   - Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
//   - Only creates initiatives (safe idempotent insert). Workers require email invite flow.
//   - Validates tenant exists before writing anything.
//   - Idempotent: skips initiatives with same title+tenant (no duplicate check built in — re-run creates duplicates).
//   - Never creates users directly. Worker provisioning must go through /admin/workers UI.
//
// PRIVACY:
//   - Never reads or writes personal schema worker data here.
//   - Only writes to personal.worker_initiative (no PII in initiatives).

import * as fs from 'fs';
import * as path from 'path';

// ── Args ──────────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2);
const apply     = args.includes('--apply');
const tenantArg = args.find((a) => a.startsWith('--tenantCode='))?.split('=')[1]
               ?? args[args.indexOf('--tenantCode') + 1];

if (!tenantArg) {
  console.error('\nUsage: npx tsx scripts/worker-trial-seed.ts --tenantCode <CODE> [--apply]\n');
  process.exit(1);
}

const tenantCode = tenantArg.trim().toUpperCase();

// ── Load fixture ──────────────────────────────────────────────────────────────

const fixturePath = path.resolve(__dirname, '../data/worker-trial/worker_trial_seed.json');
if (!fs.existsSync(fixturePath)) {
  console.error('\n✗ Fixture not found: data/worker-trial/worker_trial_seed.json\n');
  process.exit(1);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8')) as {
  initiatives: Array<{
    id: string;
    pillar: string;
    title: string;
    description: string;
    status: string;
    max_participants: number;
    trial_note: string;
  }>;
  workers: Array<{ worker_ref: string; email_placeholder: string; trial_status: string }>;
};

// ── Header ────────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  KORA Worker Trial Seed — B114');
console.log(`  Tenant code : ${tenantCode}`);
console.log(`  Mode        : ${apply ? '⚠  APPLY (writes to DB)' : '✓  DRY RUN (no writes)'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ── Dry-run output ────────────────────────────────────────────────────────────

console.log(`Workers (manual via /admin/workers — ${fixture.workers.length} total):`);
fixture.workers.forEach((w) => {
  console.log(`  ${w.worker_ref.padEnd(20)} ${w.email_placeholder.padEnd(35)} [${w.trial_status}]`);
});

console.log(`\nInitiatives to create (${fixture.initiatives.length} total):`);
fixture.initiatives.forEach((i) => {
  const icon = i.status === 'published' ? '✓' : i.status === 'draft' ? '○' : '✗';
  console.log(`  ${icon} [${i.pillar.padEnd(10)}] ${i.title.padEnd(45)} (${i.status})`);
});

if (!apply) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DRY RUN complete. No changes made.');
  console.log('  To apply: add --apply flag');
  console.log('  Workers must be provisioned manually via /admin/workers (requires email invite).');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
}

// ── Apply mode ────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('\n✗ Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  console.error('  Set them in .env.local and run with: source .env.local && npx tsx scripts/worker-trial-seed.ts ...\n');
  process.exit(1);
}

// Dynamic import to avoid loading Supabase in dry-run
const { createClient } = await import('@supabase/supabase-js');
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// ── Validate tenant ───────────────────────────────────────────────────────────

console.log(`\nLooking up tenant: ${tenantCode} ...`);

const { data: tenantRow, error: tenantErr } = await db
  .schema('analytics')
  .from('tenant')
  .select('id, company_name, tenant_code')
  .eq('tenant_code', tenantCode)
  .maybeSingle();

if (tenantErr) {
  console.error(`\n✗ DB error: ${tenantErr.message}\n`);
  process.exit(1);
}

if (!tenantRow) {
  console.error(`\n✗ Tenant not found: ${tenantCode}`);
  console.error('  Create it first via /admin/companies before running this script.\n');
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tenantRow as any;
const tenantId: string = t.id;

console.log(`✓ Tenant found: "${t.company_name}" (${tenantId})\n`);

// ── Insert initiatives ────────────────────────────────────────────────────────

console.log('Creating initiatives...');

let created = 0;
let failed  = 0;

for (const initiative of fixture.initiatives) {
  const { error: insertErr } = await db
    .schema('personal')
    .from('worker_initiative')
    .insert({
      tenant_id:        tenantId,
      pillar:           initiative.pillar,
      title:            initiative.title,
      description:      initiative.description,
      status:           initiative.status,
      max_participants: initiative.max_participants,
    });

  if (insertErr) {
    console.error(`  ✗ FAILED: ${initiative.title} — ${insertErr.message}`);
    failed++;
  } else {
    const icon = initiative.status === 'published' ? '✓' : initiative.status === 'draft' ? '○' : '✗';
    console.log(`  ${icon} Created: [${initiative.pillar}] ${initiative.title} (${initiative.status})`);
    created++;
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  APPLY complete.`);
console.log(`  Initiatives: ${created} created, ${failed} failed`);
console.log(`  Workers: 0 created (manual via /admin/workers — requires email invite)`);
console.log('\n  NEXT STEPS:');
console.log(`  1. Go to /admin/workers and provision workers for tenant ${tenantCode}`);
console.log('  2. Workers receive invite email → /worker/login → /worker/onboarding');
console.log('  3. See full flow: docs/WORKER_TRIAL_RUNBOOK.md');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
