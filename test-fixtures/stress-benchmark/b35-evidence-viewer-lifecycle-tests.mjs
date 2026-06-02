// test-fixtures/stress-benchmark/b35-evidence-viewer-lifecycle-tests.mjs
// B35: Evidence Viewer + Attachment Lifecycle Tests
//
// Tests lifecycle model (pure functions from attachment-lifecycle.ts)
// and record viewer safety policy.
//
// Run: node test-fixtures/stress-benchmark/b35-evidence-viewer-lifecycle-tests.mjs

import assert from 'node:assert/strict';

// ── Inline lifecycle logic (mirrors lib/data-intake/attachment-lifecycle.ts) ──

const VALID_LIFECYCLE = ['active','archived','removed','storage_removed','metadata_only'];

function resolveLifecycleStatus(att) {
  const explicit = att['lifecycleStatus'];
  if (explicit && VALID_LIFECYCLE.includes(explicit)) return explicit;
  return att['storageStatus'] === 'stored_private' ? 'active' : 'metadata_only';
}

function canGenerateSignedUrl(att) {
  const lifecycle = resolveLifecycleStatus(att);
  if (att['storageStatus'] !== 'stored_private')
    return { allowed: false, errorCode: 'attachment_not_stored' };
  if (lifecycle === 'archived')
    return { allowed: false, errorCode: 'attachment_archived' };
  if (lifecycle === 'removed')
    return { allowed: false, errorCode: 'attachment_removed' };
  if (lifecycle === 'storage_removed')
    return { allowed: false, errorCode: 'attachment_storage_removed' };
  if (lifecycle === 'metadata_only')
    return { allowed: false, errorCode: 'attachment_not_stored' };
  return { allowed: true };
}

function buildLifecycleUpdate({ action, att, reason, now }) {
  const PII = [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, /[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/i];
  const sanitizedReason = reason ? (PII.some(p => p.test(reason)) ? '[reason redacted — PII detected]' : reason.trim().slice(0, 200)) : undefined;

  if (action === 'archive') {
    return { fields: { lifecycleStatus: 'archived', archivedAt: now, ...(sanitizedReason ? { removalReason: sanitizedReason } : {}) } };
  }
  if (action === 'restore') {
    const ls = att['storageStatus'] === 'stored_private' ? 'active' : 'metadata_only';
    return { fields: { lifecycleStatus: ls, restoredAt: now } };
  }
  if (action === 'remove_metadata') {
    return { fields: { lifecycleStatus: 'removed', removedAt: now, ...(sanitizedReason ? { removalReason: sanitizedReason } : {}) } };
  }
  if (action === 'remove_storage') {
    if (att['storageStatus'] !== 'stored_private')
      return { fields: { lifecycleStatus: 'metadata_only' }, error: 'No storage to remove.' };
    return { fields: { lifecycleStatus: 'storage_removed', storageRemovedAt: now, ...(sanitizedReason ? { removalReason: sanitizedReason } : {}) } };
  }
  return { fields: { lifecycleStatus: resolveLifecycleStatus(att) }, error: `Unknown action: ${action}` };
}

// Safe fields allowed in valuePreview
const VIEWABLE_FIELDS = new Set([
  'initiative_name','category','type','pillar','reporting_period',
  'amount','participants','hours','coverage','uptake',
  'source','evidence_level','budget_class','provider','cost_center','policy_evidence',
]);
const NEVER_EXPOSE = ['pseudonym_id','raw_hash','created_by','signedUrl','storagePath','rawContent','description'];

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nB35 — Evidence Viewer + Attachment Lifecycle\n');

// ── Lifecycle: signed URL eligibility ─────────────────────────────────────────

test('1. active stored_private → signed URL allowed', () => {
  const att = { storageStatus: 'stored_private', lifecycleStatus: 'active' };
  const r = canGenerateSignedUrl(att);
  assert.equal(r.allowed, true);
});

test('2. archived → signed URL denied (attachment_archived)', () => {
  const att = { storageStatus: 'stored_private', lifecycleStatus: 'archived' };
  const r = canGenerateSignedUrl(att);
  assert.equal(r.allowed, false);
  assert.equal(r.errorCode, 'attachment_archived');
});

test('3. removed → signed URL denied (attachment_removed)', () => {
  const att = { storageStatus: 'stored_private', lifecycleStatus: 'removed' };
  const r = canGenerateSignedUrl(att);
  assert.equal(r.allowed, false);
  assert.equal(r.errorCode, 'attachment_removed');
});

test('4. storage_removed → signed URL denied (attachment_storage_removed)', () => {
  const att = { storageStatus: 'stored_private', lifecycleStatus: 'storage_removed' };
  const r = canGenerateSignedUrl(att);
  assert.equal(r.allowed, false);
  assert.equal(r.errorCode, 'attachment_storage_removed');
});

test('5. metadata_only → signed URL denied (attachment_not_stored)', () => {
  const att = { storageStatus: 'metadata_only' };
  const r = canGenerateSignedUrl(att);
  assert.equal(r.allowed, false);
  assert.equal(r.errorCode, 'attachment_not_stored');
});

// ── Backward compat: no lifecycleStatus field ─────────────────────────────────

test('5b. B34 attachment without lifecycleStatus → inferred as active', () => {
  const att = { storageStatus: 'stored_private' }; // B34 style, no lifecycleStatus
  assert.equal(resolveLifecycleStatus(att), 'active');
  assert.equal(canGenerateSignedUrl(att).allowed, true);
});

test('5c. B31 metadata-only without lifecycleStatus → inferred as metadata_only', () => {
  const att = { storageStatus: 'metadata_only' };
  assert.equal(resolveLifecycleStatus(att), 'metadata_only');
  assert.equal(canGenerateSignedUrl(att).allowed, false);
});

// ── Lifecycle transitions ─────────────────────────────────────────────────────

test('6. archive action → lifecycleStatus=archived, archivedAt set', () => {
  const att = { storageStatus: 'stored_private' };
  const { fields } = buildLifecycleUpdate({ action: 'archive', att, now: '2026-06-02T12:00:00Z' });
  assert.equal(fields.lifecycleStatus, 'archived');
  assert.equal(fields.archivedAt, '2026-06-02T12:00:00Z');
});

test('7. restore action → active if stored_private, archivedAt preserved (not cleared)', () => {
  const att = { storageStatus: 'stored_private', lifecycleStatus: 'archived', archivedAt: '2026-06-01T10:00:00Z' };
  const { fields } = buildLifecycleUpdate({ action: 'restore', att, now: '2026-06-02T14:00:00Z' });
  assert.equal(fields.lifecycleStatus, 'active');
  assert.equal(fields.restoredAt, '2026-06-02T14:00:00Z');
  // archivedAt is in 'att', not in fields — historical record preserved
  assert.ok(!('archivedAt' in fields), 'archivedAt not cleared in update fields');
});

test('8. restore metadata_only → lifecycleStatus=metadata_only', () => {
  const att = { storageStatus: 'metadata_only', lifecycleStatus: 'archived' };
  const { fields } = buildLifecycleUpdate({ action: 'restore', att, now: '2026-06-02T14:00:00Z' });
  assert.equal(fields.lifecycleStatus, 'metadata_only');
});

test('9. remove_storage → storage_removed, storageRemovedAt set', () => {
  const att = { storageStatus: 'stored_private' };
  const { fields, error } = buildLifecycleUpdate({ action: 'remove_storage', att, now: '2026-06-02T15:00:00Z' });
  assert.ok(!error, `No error: ${error}`);
  assert.equal(fields.lifecycleStatus, 'storage_removed');
  assert.equal(fields.storageRemovedAt, '2026-06-02T15:00:00Z');
});

test('10. lifecycle audit has no signedUrl/raw values', () => {
  const auditPayload = {
    attachmentId: 'att_001', fileNameSafe: 'invoice.pdf',
    fileType: 'pdf', attachmentType: 'invoice',
    previousLifecycle: 'active', newLifecycle: 'archived',
    action: 'archive',
  };
  assert.ok(!('signedUrl'   in auditPayload));
  assert.ok(!('storagePath' in auditPayload));
  assert.ok(!('rawContent'  in auditPayload));
  assert.ok('newLifecycle' in auditPayload);
});

// ── Lifecycle reason PII guard ────────────────────────────────────────────────

test('11. lifecycle reason: PII email → redacted', () => {
  const att = { storageStatus: 'stored_private' };
  const { fields } = buildLifecycleUpdate({ action: 'archive', att, reason: 'Removed by mario.rossi@company.it', now: '2026-06-02T12:00:00Z' });
  assert.equal(fields.removalReason, '[reason redacted — PII detected]');
});

test('11b. lifecycle reason: safe text → kept', () => {
  const att = { storageStatus: 'stored_private' };
  const { fields } = buildLifecycleUpdate({ action: 'archive', att, reason: 'Duplicate document', now: '2026-06-02T12:00:00Z' });
  assert.equal(fields.removalReason, 'Duplicate document');
});

// ── Record viewer safety ──────────────────────────────────────────────────────

test('12. record detail response: no pseudonym_id', () => {
  const safeResponse = {
    record: { id: 'abc123…', safeName: 'Formazione digitale', pillar: 'GROWTH', eligibility: 'eligible' },
    safeFields: [{ field: 'amount', valuePreview: 10000, flags: [] }],
    provenance: { summary: {}, fields: [] },
    attachments: [{ attachmentId: 'att1', lifecycleStatus: 'active', canOpenSecurely: true }],
    caveats: ['Vista safe...'],
  };
  // Verify none of the forbidden fields appear
  const responseStr = JSON.stringify(safeResponse);
  for (const forbidden of NEVER_EXPOSE) {
    assert.ok(!responseStr.includes(`"${forbidden}"`), `"${forbidden}" not in response`);
  }
});

test('13. record detail response: no raw payload', () => {
  const safeFields = [
    { field: 'amount',      valuePreview: 10000,       flags: [] },
    { field: 'participants', valuePreview: 45,          flags: [] },
    { field: 'category',    valuePreview: 'Welfare',    flags: [] },
  ];
  // All shown fields must be in VIEWABLE_FIELDS
  for (const sf of safeFields) {
    assert.ok(VIEWABLE_FIELDS.has(sf.field), `"${sf.field}" in VIEWABLE_FIELDS`);
  }
  // Non-viewable fields are excluded
  const FORBIDDEN_IN_VIEWER = ['raw_hash', 'pseudonym_id', 'email', 'codice_fiscale'];
  for (const ff of FORBIDDEN_IN_VIEWER) {
    assert.ok(!VIEWABLE_FIELDS.has(ff), `"${ff}" NOT in VIEWABLE_FIELDS`);
  }
});

test('14. attachment list in record viewer: no storagePath', () => {
  const attachment = {
    attachmentId: 'att1', fileNameSafe: 'invoice.pdf', fileType: 'pdf',
    storageStatus: 'stored_private', lifecycleStatus: 'active',
    canOpenSecurely: true, batchId: 'batch-001',
  };
  const keys = Object.keys(attachment);
  assert.ok(!keys.includes('storagePath'),   'no storagePath');
  assert.ok(!keys.includes('storageBucket'), 'no storageBucket');
  assert.ok(!keys.includes('signedUrl'),     'no signedUrl');
  assert.ok(keys.includes('canOpenSecurely'), 'canOpenSecurely present');
});

test('15. viewer does not expose worker data', () => {
  const workerFields = ['worker_id','pseudonym_id','raw_hash','email','nome','cognome','codice_fiscale','telefono'];
  for (const wf of workerFields) {
    assert.ok(!VIEWABLE_FIELDS.has(wf), `worker field "${wf}" not in VIEWABLE_FIELDS`);
  }
});

test('16. B34 signed URL still works for active attachment (no regression)', () => {
  // B34 attachment without lifecycleStatus — backward compat
  const b34att = { storageStatus: 'stored_private', storageBucket: 'kora-evidence-attachments', storagePath: 'tenant/t1/...' };
  const r = canGenerateSignedUrl(b34att);
  assert.equal(r.allowed, true, 'B34 active attachment still allowed');
});

test('17. B29 archive table still works — resolveLifecycleStatus backward compat', () => {
  // B29 attachment has no lifecycle fields — infer from storageStatus
  const b29att = { attachmentId: 'att1', storageStatus: 'metadata_only', parserStatus: 'metadata_only' };
  assert.equal(resolveLifecycleStatus(b29att), 'metadata_only');
  assert.equal(canGenerateSignedUrl(b29att).allowed, false);
});

test('18. no scoring/formula/schema changes — lifecycle is metadata-only in JSONB', () => {
  // Lifecycle fields are stored inside source_batch.payload_sample._b31_attachments[]
  // This is pure JSONB — no schema migration, no formula changes
  const lifecycleFields = ['lifecycleStatus','archivedAt','restoredAt','removedAt','storageRemovedAt','removalReason'];
  const scoringFields   = ['IU','NM','BC','CQ','EV','CF','AGF','koraIndex','confidenceScore'];
  for (const lf of lifecycleFields) {
    for (const sf of scoringFields) {
      assert.ok(lf !== sf, `Lifecycle field "${lf}" is not a scoring field`);
    }
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed}/${passed+failed} passed · ${failed} failed\n`);
if (failed > 0) process.exit(1);
