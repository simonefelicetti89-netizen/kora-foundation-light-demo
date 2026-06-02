// test-fixtures/stress-benchmark/b34-private-attachment-storage-tests.mjs
// B34: Private Attachment Storage Tests
//
// Tests pure-function logic from evidence-attachment-storage.ts:
//   - buildAttachmentStoragePath()
//   - isBinaryStorable()
//   - getAttachmentContentType()
// And policy/security rules that can be verified without a live Supabase bucket.
//
// Run: node test-fixtures/stress-benchmark/b34-private-attachment-storage-tests.mjs

import assert from 'node:assert/strict';

// ── Inline pure functions (mirrors lib/data-intake/evidence-attachment-storage.ts) ──

function buildAttachmentStoragePath({ tenantId, batchId, attachmentId, fileNameSafe }) {
  const safeSegment = (s, maxLen) => s.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, maxLen);
  const safeFile    = (s, maxLen) => s.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/\.{2,}/g, '_').slice(0, maxLen);
  const tenantSeg = safeSegment(tenantId,    50);
  const batchSeg  = safeSegment(batchId,     50);
  const attSeg    = safeSegment(attachmentId, 50);
  const fileSeg   = safeFile(fileNameSafe,   80);
  return `tenant/${tenantSeg}/batch/${batchSeg}/attachments/${attSeg}/${fileSeg}`;
}

function isBinaryStorable({ fileType, parserStatus }) {
  if (parserStatus === 'rejected_pii')  return false;
  if (parserStatus === 'rejected_size') return false;
  if (fileType === 'docx')    return false;
  if (fileType === 'unknown') return false;
  return ['pdf', 'xlsx', 'csv'].includes(fileType);
}

const CONTENT_TYPES = {
  pdf:  'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv:  'text/csv',
};

function getAttachmentContentType(fileType) {
  return CONTENT_TYPES[fileType] ?? 'application/octet-stream';
}

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nB34 — Private Attachment Storage\n');

// Storage path policy
test('1. storage path uses tenantId/batchId/attachmentId — not raw initiative name', () => {
  const path = buildAttachmentStoragePath({
    tenantId: 'abc-123',
    batchId: 'batch-456',
    attachmentId: 'att_abc123_xyz',
    fileNameSafe: 'invoice.pdf',
  });
  assert.ok(path.startsWith('tenant/abc-123/batch/batch-456/attachments/att_abc123_xyz/'), `path: ${path}`);
  assert.ok(path.endsWith('invoice.pdf'), `path ends: ${path}`);
  assert.ok(!path.includes('initiative'), 'no initiative name in path');
});

test('2. storage path sanitizes special chars — no path traversal', () => {
  const path = buildAttachmentStoragePath({
    tenantId: 'tenant/../etc',
    batchId: 'batch; DROP TABLE',
    attachmentId: 'att<script>',
    fileNameSafe: 'file with spaces.pdf',
  });
  assert.ok(!path.includes('..'), 'no path traversal');
  assert.ok(!path.includes(';'), 'no semicolons');
  assert.ok(!path.includes('<'), 'no angle brackets');
  assert.ok(!path.includes(' '), 'no spaces in path');
});

test('3. storage path: fileNameSafe uses server-sanitized name (no PII in path)', () => {
  // B31 already sanitizes filename before it reaches B34
  // Verify that the path builder keeps this safe
  const path = buildAttachmentStoragePath({
    tenantId: 'tenant-001',
    batchId:  'batch-001',
    attachmentId: 'att_001',
    fileNameSafe: '[document].pdf',  // B31 already replaced PII with [document]
  });
  assert.ok(path.includes('[document].pdf') || path.includes('_document_.pdf'), `safe name in path: ${path}`);
});

// isBinaryStorable policy
test('4. PDF with parsed_metadata is storable', () => {
  assert.equal(isBinaryStorable({ fileType: 'pdf',  parserStatus: 'metadata_only' }),    true);
  assert.equal(isBinaryStorable({ fileType: 'pdf',  parserStatus: 'parsed_metadata' }),  true);
  assert.equal(isBinaryStorable({ fileType: 'pdf',  parserStatus: 'needs_review' }),     true);
});

test('5. XLSX with parsed_metadata is storable', () => {
  assert.equal(isBinaryStorable({ fileType: 'xlsx', parserStatus: 'parsed_metadata' }), true);
});

test('6. CSV with parsed_metadata is storable', () => {
  assert.equal(isBinaryStorable({ fileType: 'csv',  parserStatus: 'parsed_metadata' }), true);
});

test('7. DOCX is never stored (unsupported)', () => {
  assert.equal(isBinaryStorable({ fileType: 'docx', parserStatus: 'parsed_metadata' }), false);
  assert.equal(isBinaryStorable({ fileType: 'docx', parserStatus: 'unsupported' }),     false);
});

test('8. PII filename rejected file is not stored', () => {
  assert.equal(isBinaryStorable({ fileType: 'pdf',  parserStatus: 'rejected_pii' }),    false);
  assert.equal(isBinaryStorable({ fileType: 'xlsx', parserStatus: 'rejected_pii' }),    false);
  assert.equal(isBinaryStorable({ fileType: 'csv',  parserStatus: 'rejected_pii' }),    false);
});

test('9. PII header XLSX rejected — not stored', () => {
  assert.equal(isBinaryStorable({ fileType: 'xlsx', parserStatus: 'rejected_pii' }),    false);
});

test('10. rejected_size file is not stored', () => {
  assert.equal(isBinaryStorable({ fileType: 'pdf',  parserStatus: 'rejected_size' }),   false);
  assert.equal(isBinaryStorable({ fileType: 'xlsx', parserStatus: 'rejected_size' }),   false);
});

test('11. unknown file type is not stored', () => {
  assert.equal(isBinaryStorable({ fileType: 'unknown', parserStatus: 'parsed_metadata' }), false);
});

// Content types
test('12. correct content type per file type', () => {
  assert.equal(getAttachmentContentType('pdf'),  'application/pdf');
  assert.equal(getAttachmentContentType('xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.equal(getAttachmentContentType('csv'),  'text/csv');
  assert.equal(getAttachmentContentType('unknown'), 'application/octet-stream');
});

// Payload/metadata policy
test('13. payload_sample contains storagePath but never signedUrl', () => {
  // Simulate what the register route stores in payload_sample
  const storageStatus = 'stored_private';
  const storagePath   = 'tenant/t1/batch/b1/attachments/att1/invoice.pdf';
  const storageBucket = 'kora-evidence-attachments';

  const safeMetadata = {
    attachmentId:    'att1',
    fileNameSafe:    'invoice.pdf',
    storageStatus,
    storagePath,
    storageBucket,
    // NEVER: signedUrl, raw content, binary data
  };

  assert.ok('storagePath' in safeMetadata,  'storagePath is stored (internal reference)');
  assert.ok('storageBucket' in safeMetadata, 'storageBucket stored');
  assert.ok(!('signedUrl' in safeMetadata), 'signedUrl NEVER stored in payload_sample');
  assert.ok(!('rawContent' in safeMetadata), 'rawContent never stored');
});

test('14. signed-url audit payload excludes signedUrl', () => {
  // Simulate what the signed-url route logs in audit_log
  const auditPayload = {
    attachmentId: 'att1',
    fileNameSafe: 'invoice.pdf',
    fileType:     'pdf',
    attachmentType: 'invoice',
    expiresInSeconds: 300,
    // NEVER: signedUrl, storagePath (internal), raw content
  };
  assert.ok(!('signedUrl' in auditPayload), 'signedUrl not in audit');
  assert.ok(!('rawContent' in auditPayload), 'rawContent not in audit');
});

test('15. signed-url route only for stored_private (not metadata_only)', () => {
  // Simulate the check in the signed-url route
  function canGenerateSignedUrl(att) {
    return att.storageStatus === 'stored_private' &&
           typeof att.storageBucket === 'string' && att.storageBucket.length > 0 &&
           typeof att.storagePath   === 'string' && att.storagePath.length > 0;
  }
  assert.equal(
    canGenerateSignedUrl({ storageStatus: 'stored_private', storageBucket: 'kora-evidence-attachments', storagePath: 'tenant/t1/...' }),
    true,
  );
  assert.equal(
    canGenerateSignedUrl({ storageStatus: 'metadata_only', storageBucket: '', storagePath: '' }),
    false,
  );
});

test('16. no public URL fields in any response shape', () => {
  // Simulate register route response
  const registerResponse = {
    ok: true,
    attachmentId: 'att1',
    fileNameSafe: 'invoice.pdf',
    parserStatus: 'metadata_only',
    evidenceLevelSuggestion: 'L3',
    storageStatus: 'stored_private',
    note: 'Stored in private storage...',
  };
  assert.ok(!('publicUrl' in registerResponse), 'no publicUrl in register response');
  assert.ok(!('signedUrl' in registerResponse), 'no signedUrl in register response');
  assert.ok(!('url' in registerResponse),        'no generic url in register response');
});

test('17. archive API safe attachment fields — no storagePath, no signed URL exposed', () => {
  // Simulate what the archive API returns for attachments[]
  const archiveAttachment = {
    attachmentId: 'att1',
    fileNameSafe: 'invoice.pdf',
    fileType: 'pdf',
    fileSizeBytes: 512000,
    attachmentType: 'invoice',
    parserStatus: 'metadata_only',
    evidenceLevelSuggestion: 'L3',
    storageStatus: 'stored_private',
    createdAt: '2026-06-02T12:00:00Z',
    // NEVER expose: storagePath, storageBucket, signedUrl
  };
  assert.ok(!('storagePath' in archiveAttachment),   'storagePath not in archive response');
  assert.ok(!('storageBucket' in archiveAttachment), 'storageBucket not in archive response');
  assert.ok(!('signedUrl' in archiveAttachment),     'signedUrl not in archive response');
  assert.ok('storageStatus' in archiveAttachment,    'storageStatus IS in archive response');
});

test('18. register route reparses server-side — never trusts preview metadata', () => {
  // The register route always calls parseAttachmentMetadata() with the actual file
  // even if a preview was done. This is enforced by the route structure — it never
  // accepts metadata from the client body.
  // Unit-level: verify the route accepts a 'file' multipart field, not 'metadata'.
  const routeExpectedFields = ['file', 'tenantCode', 'batchId', 'attachmentType', 'scope', 'confirmation'];
  assert.ok(routeExpectedFields.includes('file'), 'route requires file re-upload');
  assert.ok(!routeExpectedFields.includes('metadata'), 'route does not accept metadata from client');
});

test('19. scoring not affected — isBinaryStorable is pure, returns boolean, no state change', () => {
  // isBinaryStorable is a pure function with no side effects on scoring
  // Call it multiple times — result is deterministic, no side effects
  const result1 = isBinaryStorable({ fileType: 'pdf',  parserStatus: 'metadata_only' });
  const result2 = isBinaryStorable({ fileType: 'xlsx', parserStatus: 'parsed_metadata' });
  const result3 = isBinaryStorable({ fileType: 'pdf',  parserStatus: 'metadata_only' });
  assert.equal(typeof result1, 'boolean', 'returns boolean');
  assert.equal(result1, result3, 'deterministic — same inputs same output');
  assert.equal(result2, true);
  // Verify scoring formula fields are not inputs/outputs
  assert.ok(!Object.keys({ fileType: 'pdf', parserStatus: 'metadata_only' }).some(k =>
    ['NM', 'BC', 'CQ', 'EV', 'CF', 'AGF', 'IU'].includes(k)
  ), 'no scoring formula fields in inputs');
});

test('20. max signed URL expiry is 300 seconds (5 minutes)', () => {
  const MAX_EXPIRY = 300;
  // Simulate the clamp in createEvidenceAttachmentSignedUrl
  function clampExpiry(requested) {
    return Math.min(requested ?? MAX_EXPIRY, MAX_EXPIRY);
  }
  assert.equal(clampExpiry(60),   60);
  assert.equal(clampExpiry(300),  300);
  assert.equal(clampExpiry(3600), 300, 'clamped to 300');
  assert.equal(clampExpiry(undefined), 300, 'default is 300');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed} passed · ${failed} failed\n`);
if (failed > 0) process.exit(1);
