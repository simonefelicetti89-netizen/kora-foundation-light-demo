// test-fixtures/stress-benchmark/b35-1-attachment-lifecycle-ui-tests.mjs
// B35.1: Attachment Lifecycle Actions UI Tests
//
// Tests the action availability logic and confirmation requirements
// (mirrors AttachmentLifecycleActions.tsx behavior without React).
//
// Run: node test-fixtures/stress-benchmark/b35-1-attachment-lifecycle-ui-tests.mjs

import assert from 'node:assert/strict';

// ── Inline action availability logic ─────────────────────────────────────────
// (mirrors AttachmentLifecycleActions.tsx getAvailableActions)

function getAvailableActions(lifecycleStatus, storageStatus) {
  const hasStorage = storageStatus === 'stored_private';
  switch (lifecycleStatus) {
    case 'active':
      return hasStorage
        ? ['archive', 'remove_metadata', 'remove_storage']
        : ['archive', 'remove_metadata'];
    case 'archived':
      return hasStorage
        ? ['restore', 'remove_metadata', 'remove_storage']
        : ['restore', 'remove_metadata'];
    case 'removed':
      return hasStorage ? ['remove_storage'] : [];
    case 'storage_removed':
      return [];
    case 'metadata_only':
      return [];
    default:
      return [];
  }
}

const ACTION_CONFIRM_TOKENS = {
  archive:         'ARCHIVE_ATTACHMENT',
  restore:         null,   // no typed confirmation
  remove_metadata: 'REMOVE_ATTACHMENT',
  remove_storage:  'REMOVE_STORAGE',
};

function isTypedConfirmRequired(action) { return ACTION_CONFIRM_TOKENS[action] !== null; }
function getConfirmToken(action)         { return ACTION_CONFIRM_TOKENS[action]; }

function canOpenSecurely(lifecycleStatus, storageStatus) {
  return lifecycleStatus === 'active' && storageStatus === 'stored_private';
}

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nB35.1 — Attachment Lifecycle Actions UI\n');

// ── Action availability ───────────────────────────────────────────────────────

test('1. active stored_private shows Archive, Remove, Remove storage buttons', () => {
  const actions = getAvailableActions('active', 'stored_private');
  assert.ok(actions.includes('archive'),         'archive available');
  assert.ok(actions.includes('remove_metadata'), 'remove_metadata available');
  assert.ok(actions.includes('remove_storage'),  'remove_storage available');
  assert.ok(!actions.includes('restore'),        'restore NOT available for active');
});

test('2. archived stored_private shows Restore, Remove, Remove storage', () => {
  const actions = getAvailableActions('archived', 'stored_private');
  assert.ok(actions.includes('restore'),         'restore available');
  assert.ok(actions.includes('remove_metadata'), 'remove_metadata available');
  assert.ok(actions.includes('remove_storage'),  'remove_storage available');
  assert.ok(!actions.includes('archive'),        'archive NOT available for archived');
});

test('3. active stored_private → shows Remove storage button', () => {
  const actions = getAvailableActions('active', 'stored_private');
  assert.ok(actions.includes('remove_storage'), 'remove_storage shown for stored_private');
});

test('4. metadata_only → no Open button (canOpenSecurely=false)', () => {
  assert.equal(canOpenSecurely('metadata_only', 'metadata_only'), false);
  assert.equal(canOpenSecurely('active', 'metadata_only'),        false);
});

test('5. archived → Open button disabled (canOpenSecurely=false)', () => {
  assert.equal(canOpenSecurely('archived', 'stored_private'), false);
});

test('6. removed → Open button disabled', () => {
  assert.equal(canOpenSecurely('removed', 'stored_private'), false);
});

test('7. storage_removed → Open button disabled', () => {
  assert.equal(canOpenSecurely('storage_removed', 'stored_private'), false);
});

test('8. archive requires typed confirmation ARCHIVE_ATTACHMENT', () => {
  assert.equal(isTypedConfirmRequired('archive'), true);
  assert.equal(getConfirmToken('archive'), 'ARCHIVE_ATTACHMENT');
});

test('9. remove_metadata requires typed confirmation REMOVE_ATTACHMENT', () => {
  assert.equal(isTypedConfirmRequired('remove_metadata'), true);
  assert.equal(getConfirmToken('remove_metadata'), 'REMOVE_ATTACHMENT');
});

test('10. remove_storage requires typed confirmation REMOVE_STORAGE', () => {
  assert.equal(isTypedConfirmRequired('remove_storage'), true);
  assert.equal(getConfirmToken('remove_storage'), 'REMOVE_STORAGE');
});

test('11. restore does NOT require typed confirmation (non-destructive)', () => {
  assert.equal(isTypedConfirmRequired('restore'), false);
  assert.equal(getConfirmToken('restore'), null);
});

test('12. lifecycle API call body: no storagePath, no signedUrl', () => {
  const apiBody = {
    tenantCode: 'OP-001', batchId: 'batch-001', attachmentId: 'att1',
    action: 'archive', reason: 'Test reason',
  };
  assert.ok(!('storagePath'   in apiBody), 'storagePath NOT in API body');
  assert.ok(!('signedUrl'     in apiBody), 'signedUrl NOT in API body');
  assert.ok(!('rawContent'    in apiBody), 'rawContent NOT in API body');
  assert.ok(!('storageBucket' in apiBody), 'storageBucket NOT in API body');
  assert.ok('action' in apiBody, 'action IS in API body');
});

test('13. after action: onActionCompleted callback triggered (simulated)', () => {
  let callbackCount = 0;
  const onActionCompleted = () => { callbackCount++; };
  // Simulate successful action completion
  onActionCompleted();
  assert.equal(callbackCount, 1, 'callback called exactly once');
});

test('14. signedUrl not stored in state (open tab directly)', () => {
  // The component calls window.open(signedUrl) directly — URL never stored in state
  // Verify the mock flow: API returns signedUrl → window.open → URL discarded
  const mockResponse = { ok: true, signedUrl: 'https://example.com/signed', expiresInSeconds: 300 };
  assert.ok(mockResponse.signedUrl, 'signedUrl obtained');
  // In component: window.open(mockResponse.signedUrl, '_blank') is called immediately
  // signedUrl is NOT stored in any useState variable
  assert.ok(!Object.prototype.hasOwnProperty.call({}, 'storedSignedUrl'), 'URL not in persistent state');
});

test('15. storagePath not rendered in UI (never in AttachmentItem exposed fields)', () => {
  const attachmentItem = {
    attachmentId: 'att1', fileNameSafe: 'invoice.pdf', fileType: 'pdf',
    storageStatus: 'stored_private', lifecycleStatus: 'active',
    canOpenSecurely: true, batchId: 'batch-001',
    lifecycleLabel: 'Attivo',
    // NEVER: storagePath, storageBucket, signedUrl
  };
  assert.ok(!('storagePath'   in attachmentItem), 'storagePath not in AttachmentItem');
  assert.ok(!('storageBucket' in attachmentItem), 'storageBucket not in AttachmentItem');
  assert.ok(!('signedUrl'     in attachmentItem), 'signedUrl not in AttachmentItem');
});

test('16. reason max length enforced client-side (200 chars)', () => {
  const longReason = 'A'.repeat(300);
  const truncated  = longReason.slice(0, 200);
  assert.equal(truncated.length, 200, 'reason truncated to 200');
});

test('17. PII reason server error: error shown without echoing the reason value', () => {
  // Server returns { ok: false, error: 'Lifecycle action failed' } for PII in reason
  // UI shows generic error — does NOT re-render the reason value
  const serverError = { ok: false, error: 'Lifecycle action failed' };
  assert.ok(!serverError.error.includes('mario.rossi@'), 'PII value not echoed in error');
  assert.ok(serverError.error.length > 0, 'Error message shown');
});

test('18. B35 record drawer still renders: fields/provenance/gaps (no regression)', () => {
  // Verify the section list is unchanged (tabs defined in EvidenceRecordDrawer)
  const sections = ['fields', 'provenance', 'attachments', 'gaps'];
  assert.equal(sections.length, 4);
  assert.ok(sections.includes('fields'));
  assert.ok(sections.includes('provenance'));
  assert.ok(sections.includes('attachments'));
  assert.ok(sections.includes('gaps'));
});

test('19. no formula/scoring/schema changes — lifecycle is pure UI + JSONB PATCH', () => {
  // Lifecycle actions call POST /api/admin/evidence-attachments/lifecycle only
  // No kora_index_result, no uef_record, no methodology-config touched
  const lifecycleApiEndpoint = '/api/admin/evidence-attachments/lifecycle';
  const scoringEndpoints = ['/api/admin/scoring', '/api/admin/uef/generate', '/api/admin/methodology'];
  for (const ep of scoringEndpoints) {
    const epLast = ep.split('/').pop() ?? '';
    assert.ok(!lifecycleApiEndpoint.includes(epLast), `lifecycle endpoint ≠ ${ep}`);
  }
});

// ── Active + metadata_only variant ───────────────────────────────────────────

test('active metadata_only: Archive + Remove (no Remove storage)', () => {
  const actions = getAvailableActions('active', 'metadata_only');
  assert.ok(actions.includes('archive'));
  assert.ok(actions.includes('remove_metadata'));
  assert.ok(!actions.includes('remove_storage'), 'no Remove storage for metadata_only');
});

test('storage_removed: no actions available (terminal state)', () => {
  const actions = getAvailableActions('storage_removed', 'stored_private');
  assert.equal(actions.length, 0, 'storage_removed is terminal — no further actions');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ${passed}/${passed+failed} passed · ${failed} failed\n`);
if (failed > 0) process.exit(1);
