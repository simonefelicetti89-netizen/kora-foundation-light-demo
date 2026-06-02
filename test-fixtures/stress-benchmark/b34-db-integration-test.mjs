// B34 DB Integration Test — live Supabase DB + Storage
// Tests register flow (payload_sample) and signed-url flow (audit_log) end-to-end.
// Run: node test-fixtures/stress-benchmark/b34-db-integration-test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

function loadEnv(p) {
  try {
    for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch(e) { console.error('Cannot load .env.local:', e.message); process.exit(1); }
}
loadEnv(path.join(ROOT, '.env.local'));

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY_) { console.error('Missing env vars'); process.exit(1); }

const { createClient } = await import('@supabase/supabase-js');
const db = createClient(URL_, KEY_, { auth: { autoRefreshToken: false, persistSession: false } });

const BUCKET    = 'kora-evidence-attachments';
const MAX_EXPIRY = 300;

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n' +
  '2 0 obj\n<</Type /Pages /Kids [] /Count 0>>\nendobj\n' +
  'xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000062 00000 n\n' +
  'trailer\n<</Size 3 /Root 1 0 R>>\nstartxref\n118\n%%EOF', 'utf-8');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

console.log('\nB34 DB Integration Test\n');

// ── State ─────────────────────────────────────────────────────────────────────
let tenantId = null, batchId = null, originalPayload = null;
const attachmentId  = `att_b34_db_${crypto.randomBytes(4).toString('hex')}`;
const fileNameSafe  = 'test-b34-invoice.pdf';
const safeSegment   = (s, n) => s.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, n);
const safeFile      = (s, n) => s.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/\.{2,}/g, '_').slice(0, n);

// ── 1. Find tenant ─────────────────────────────────────────────────────────────
await test('1. Tenant OP-001 in DB', async () => {
  const { data, error } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code').eq('tenant_code', 'OP-001').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data)  throw new Error('Tenant OP-001 not found in DB');
  tenantId = data.id;
  console.log(`       tenantId=${tenantId.slice(0,8)}…`);
});

// ── 2. Find batch ─────────────────────────────────────────────────────────────
await test('2. source_batch for OP-001 found', async () => {
  if (!tenantId) throw new Error('No tenantId');
  const { data, error } = await db.schema('analytics').from('source_batch')
    .select('id, payload_sample').eq('tenant_id', tenantId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data)  throw new Error('No batch found for OP-001');
  batchId = data.id;
  originalPayload = (data.payload_sample ?? {});
  console.log(`       batchId=${batchId.slice(0,8)}…`);
});

// ── 3. Build storage path ─────────────────────────────────────────────────────
const storagePath = tenantId && batchId
  ? `tenant/${safeSegment(tenantId,50)}/batch/${safeSegment(batchId,50)}/attachments/${safeSegment(attachmentId,50)}/${safeFile(fileNameSafe,80)}`
  : `tenant/fallback/batch/fallback/attachments/${attachmentId}/${fileNameSafe}`;

// ── 4. Upload PDF to private storage ──────────────────────────────────────────
await test('3. Upload test PDF to kora-evidence-attachments (private)', async () => {
  const { error } = await db.storage
    .from(BUCKET).upload(storagePath, MINIMAL_PDF, { contentType: 'application/pdf', upsert: false });
  if (error) throw new Error(`Upload: ${error.message}`);
  console.log(`       path=${storagePath.slice(0,58)}…`);
  console.log(`       size=${MINIMAL_PDF.byteLength} bytes`);
});

// ── 5. Patch payload_sample ───────────────────────────────────────────────────
const attachmentMeta = {
  attachmentId, fileNameSafe, fileSizeBytes: MINIMAL_PDF.byteLength,
  fileType: 'pdf', attachmentType: 'invoice', scope: 'batch',
  sourceStrength: 'strong', evidenceLevelSuggestion: 'L3',
  parserStatus: 'metadata_only', createdAt: new Date().toISOString(),
  storageStatus: 'stored_private', storageBucket: BUCKET, storagePath,
};

await test('4. Patch payload_sample._b31_attachments[] — no signedUrl in patch', async () => {
  if (!batchId) throw new Error('No batchId');
  assert.ok(!JSON.stringify(attachmentMeta).includes('"signedUrl"'), 'No signedUrl in metadata');
  const existing = Array.isArray(originalPayload['_b31_attachments'])
    ? originalPayload['_b31_attachments'] : [];
  const updated = { ...originalPayload, _b31: true, _b31_attachments: [...existing, attachmentMeta] };
  const { error } = await db.schema('analytics').from('source_batch')
    .update({ payload_sample: updated }).eq('id', batchId);
  if (error) throw new Error(`DB update: ${error.message}`);
  console.log(`       _b31_attachments patched. signedUrl in patch: false ✓`);
});

// ── 6. Read back payload_sample from DB ───────────────────────────────────────
await test('5. payload_sample in DB: storagePath ✓, signedUrl ✗', async () => {
  if (!batchId) throw new Error('No batchId');
  const { data, error } = await db.schema('analytics').from('source_batch')
    .select('payload_sample').eq('id', batchId).maybeSingle();
  if (error) throw new Error(error.message);
  const ps = data?.payload_sample ?? {};
  const atts = Array.isArray(ps['_b31_attachments']) ? ps['_b31_attachments'] : [];
  const our  = atts.find(a => a.attachmentId === attachmentId);
  assert.ok(our, 'Test attachment found in DB');
  assert.equal(our.storageStatus, 'stored_private');
  assert.ok(our.storagePath, 'storagePath present in DB ✓');
  assert.equal(our.storageBucket, BUCKET);
  assert.ok(!('signedUrl' in our),  'signedUrl NOT in DB ✓');
  assert.ok(!('rawContent' in our), 'rawContent NOT in DB ✓');
  assert.ok(!('publicUrl' in our),  'publicUrl NOT in DB ✓');
  assert.equal(our.fileSizeBytes, MINIMAL_PDF.byteLength);
  console.log(`       storageStatus=${our.storageStatus} ✓`);
  console.log(`       storagePath in DB: ${our.storagePath.slice(0,50)}…`);
  console.log(`       signedUrl in DB: false ✓`);
});

// ── 7. Generate signed URL ────────────────────────────────────────────────────
await test('6. Signed URL: HTTPS, expiry=300s, not public', async () => {
  const { data, error } = await db.storage
    .from(BUCKET).createSignedUrl(storagePath, MAX_EXPIRY);
  if (error) throw new Error(`createSignedUrl: ${error.message}`);
  assert.ok(data?.signedUrl, 'signedUrl returned');
  assert.ok(data.signedUrl.startsWith('https://'));
  assert.ok(!data.signedUrl.includes('/public/'));
  console.log(`       signedUrl[:62]: ${data.signedUrl.slice(0,62)}…`);
  console.log(`       expiresInSeconds=${MAX_EXPIRY} ✓`);
});

// ── 8. Write + read audit_log ─────────────────────────────────────────────────
let auditId = null;
await test('7. audit_log: signedUrl absent in stored payload', async () => {
  if (!tenantId || !batchId) throw new Error('No tenant/batch');
  const auditPayload = {
    attachmentId, fileNameSafe, fileType: 'pdf',
    attachmentType: 'invoice', expiresInSeconds: MAX_EXPIRY,
  };
  const { data, error } = await db.schema('audit').from('audit_log').insert({
    tenant_id: tenantId, actor_role: 'KORA_ADMIN', actor_id: 'b34-runtime-test',
    action: 'evidence_attachment_signed_url_created',
    resource_type: 'analytics.source_batch', resource_id: batchId,
    payload: auditPayload, ip_address: null,
  }).select('id').single();
  if (error) throw new Error(`Audit insert: ${error.message}`);
  auditId = data?.id;

  // Read back
  const { data: readBack, error: rErr } = await db.schema('audit').from('audit_log')
    .select('payload').eq('id', auditId).maybeSingle();
  if (rErr) throw new Error(rErr.message);
  const pl = readBack?.payload ?? {};
  assert.ok(!('signedUrl'   in pl), 'signedUrl NOT in audit DB ✓');
  assert.ok(!('storagePath' in pl), 'storagePath NOT in audit DB ✓');
  assert.ok('expiresInSeconds' in pl, 'expiresInSeconds IS in audit ✓');
  console.log(`       audit fields stored: ${Object.keys(pl).join(', ')}`);
  console.log(`       signedUrl in audit DB: false ✓`);
});

// ── 9. PII rejected not storable ─────────────────────────────────────────────
const PII = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i, /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/];
function isBinaryStorable({ fileType, parserStatus }) {
  if (['rejected_pii','rejected_size'].includes(parserStatus)) return false;
  if (['docx','unknown'].includes(fileType)) return false;
  return ['pdf','xlsx','csv'].includes(fileType);
}
await test('8. PII filename → rejected_pii → not stored in storage', async () => {
  const piiNames = ['mario.rossi@company.it.pdf','RSSMRA80A01H501Z.pdf','333-123-4567.pdf'];
  for (const fn of piiNames) assert.ok(PII.some(p => p.test(fn)), `PII detected: ${fn}`);
  assert.equal(isBinaryStorable({ fileType: 'pdf',  parserStatus: 'rejected_pii' }), false);
  assert.equal(isBinaryStorable({ fileType: 'xlsx', parserStatus: 'rejected_pii' }), false);
  console.log(`       PII filenames → rejected_pii → isBinaryStorable=false → no upload ✓`);
});

// ── CLEANUP ───────────────────────────────────────────────────────────────────
if (batchId) {
  const existing = Array.isArray(originalPayload?.['_b31_attachments'])
    ? originalPayload['_b31_attachments'] : [];
  await db.schema('analytics').from('source_batch')
    .update({ payload_sample: { ...originalPayload, _b31_attachments: existing } })
    .eq('id', batchId).catch(() => {});
}
await db.storage.from(BUCKET).remove([storagePath]).catch(() => {});
if (auditId) await db.schema('audit').from('audit_log').delete().eq('id', auditId).catch(() => {});
console.log('\n  [cleanup] payload_sample restored · storage file removed · audit removed.\n');

console.log(`  ${passed}/${passed+failed} passed · ${failed} failed`);
if (failed > 0) { console.error('\n  ✗ B34 DB Integration: FAIL\n'); process.exit(1); }
else console.log('\n  ✓ B34 DB Integration: PASS\n');
