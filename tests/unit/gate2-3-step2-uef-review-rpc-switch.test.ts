/**
 * Gate 2.3 Step 2 — UEF Review Route RPC Switch.
 *
 * Verifies that app/api/admin/uef/review/route.ts GET Case B has been switched
 * from a direct analytics.uef_record table SELECT to a call to the safe
 * SECURITY DEFINER function analytics.fn_admin_uef_review().
 *
 * Guarantees:
 * - RPC call to fn_admin_uef_review replaces direct table SELECT
 * - raw payload is not selected, not mapped, not returned in response
 * - payload sub-fields are now provided as named typed columns by the function
 * - auth-before-service-role ordering preserved
 * - service-role client remains server-only
 * - local UEFReviewRow type defined (no broad `any` on mapped result)
 * - response shape preserved (same camelCase fields as before)
 * - null-default workaround removed
 * - Gate 3 remains OPEN in doc context
 * - no formula/methodology changes
 *
 * No SQL executed. No DB touched. Code structure verification only.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function src(rel: string): string { return readFileSync(resolve(root, rel), 'utf-8'); }

const ROUTE   = src('app/api/admin/uef/review/route.ts');
const SERVICE = src('lib/supabase/uef-service-key.ts');
const DOC     = src('docs/GATE2_3_UEF_ADMIN_ACCESS_HARDENING_DESIGN.md');

// ── 1. RPC call to fn_admin_uef_review ────────────────────────────────────────

describe('gate2-3-step2 — review route calls fn_admin_uef_review', () => {
  it('review route calls rpc(fn_admin_uef_review)', () => {
    expect(ROUTE).toMatch(/\.rpc\(['"]fn_admin_uef_review['"]/);
  });

  it('review route passes p_batch_id parameter to fn_admin_uef_review', () => {
    expect(ROUTE).toMatch(/fn_admin_uef_review.*p_batch_id|p_batch_id.*fn_admin_uef_review/i);
  });

  it('review route uses schema analytics for RPC call', () => {
    expect(ROUTE).toMatch(/schema\(['"]analytics['"]\)[\s\S]{0,50}fn_admin_uef_review/);
  });

  it('review route uses established (db.schema as any).rpc pattern', () => {
    expect(ROUTE).toMatch(/schema\(['"]analytics['"]\)\s+as\s+any\)[\s\S]{0,30}\.rpc/);
  });
});

// ── 2. Direct table SELECT removed from GET Case B ────────────────────────────

describe('gate2-3-step2 — direct table SELECT removed', () => {
  it('GET Case B no longer selects from uef_record directly for candidates', () => {
    // The old direct table SELECT included raw_name, review_status etc in a long string.
    // It should be replaced by the RPC. The route still accesses uef_record via COUNT
    // in Case A (batch list) — but Case B direct SELECT is gone.
    expect(ROUTE).not.toMatch(/from\('uef_record'\)\s*\.select\(['"]\s*id,\s*raw_name.*review_status/i);
  });

  it('GET Case B no longer chains .eq(batch_id) directly on uef_record table', () => {
    // Case A uses uef_record for COUNT (head: true) — that's still present.
    // Case B used uef_record for SELECT with eq(batch_id, batchId) — now replaced by RPC.
    // Verify the multi-column SELECT pattern from Case B is gone.
    expect(ROUTE).not.toMatch(/from\('uef_record'\)[\s\S]{0,200}raw_name.*eligibility.*primary_pillar/);
  });

  it('review route GET Case B no longer uses .order on uef_record for candidates', () => {
    // The old Case B chain ended with .order('created_at', { ascending: true })
    // on the uef_record SELECT. fn_admin_uef_review orders internally.
    // Verify the old multi-column SELECT + order pattern is absent.
    expect(ROUTE).not.toMatch(/from\('uef_record'\)[\s\S]{0,300}ascending.*true/);
  });
});

// ── 3. Raw payload not selected, not mapped, not returned ─────────────────────

describe('gate2-3-step2 — raw payload excluded', () => {
  it('review route GET Case B does not select raw payload column', () => {
    // The RPC function excludes payload — verify route does not try to add it back
    expect(ROUTE).not.toMatch(/\.select\([^)]*\bpayload\b/i);
  });

  it('review route GET Case B does not map r.payload in the safe object', () => {
    // After switch to UEFReviewRow type, r.payload would be a type error — confirm absent
    expect(ROUTE).not.toMatch(/r\.payload\b/);
  });

  it('review route response object does not include a payload key', () => {
    // The response maps to camelCase fields; no 'payload:' key should appear
    const caseB = ROUTE.substring(ROUTE.indexOf('Case B'));
    const mapBlock = caseB.substring(caseB.indexOf('.map('));
    expect(mapBlock).not.toMatch(/^\s+payload:/m);
  });

  it('UEFReviewRow interface explicitly notes payload as absent', () => {
    expect(ROUTE).toMatch(/payload.*intentionally absent|payload.*JSONB.*absent/i);
  });
});

// ── 4. Payload sub-fields are now real values (null-defaults removed) ──────────

describe('gate2-3-step2 — payload sub-fields are real values', () => {
  it('eventType is now r.event_type (not hardcoded null)', () => {
    expect(ROUTE).toMatch(/eventType:\s*r\.event_type/);
  });

  it('evidenceLevel is now r.evidence_level (not hardcoded null)', () => {
    expect(ROUTE).toMatch(/evidenceLevel:\s*r\.evidence_level/);
  });

  it('budgetAmount is now r.budget_amount (not hardcoded null)', () => {
    expect(ROUTE).toMatch(/budgetAmount:\s*r\.budget_amount/);
  });

  it('scoringLocked is now r.scoring_locked (not hardcoded true)', () => {
    expect(ROUTE).toMatch(/scoringLocked:\s*r\.scoring_locked/);
  });

  it('amountParsingStatus is now r.amount_parsing_status (not hardcoded missing)', () => {
    expect(ROUTE).toMatch(/amountParsingStatus:\s*r\.amount_parsing_status/);
  });

  it('initiativeDomain is now r.initiative_domain (not hardcoded null)', () => {
    expect(ROUTE).toMatch(/initiativeDomain:\s*r\.initiative_domain/);
  });

  it('reasonCodes uses Array.isArray guard (safe jsonb handling)', () => {
    expect(ROUTE).toMatch(/Array\.isArray.*reason_codes/);
  });

  it('enrichmentMissingFields uses Array.isArray guard (safe jsonb handling)', () => {
    expect(ROUTE).toMatch(/Array\.isArray.*enrichment_missing_fields/);
  });

  it('null-default workaround comment is removed', () => {
    expect(ROUTE).not.toMatch(/Payload-derived fields.*null.*defaults until post-030/i);
    expect(ROUTE).not.toMatch(/Restore these by switching to.*fn_admin_uef_review/i);
  });
});

// ── 5. Local UEFReviewRow type defined ────────────────────────────────────────

describe('gate2-3-step2 — UEFReviewRow type', () => {
  it('review route defines UEFReviewRow interface', () => {
    expect(ROUTE).toMatch(/interface UEFReviewRow/);
  });

  it('UEFReviewRow includes event_type field', () => {
    expect(ROUTE).toMatch(/event_type.*string.*null|UEFReviewRow[\s\S]{0,500}event_type/);
  });

  it('UEFReviewRow includes approved_for_scoring field', () => {
    expect(ROUTE).toMatch(/approved_for_scoring.*boolean/);
  });

  it('UEFReviewRow does NOT include payload field', () => {
    // The interface explicitly notes payload is absent — no payload: JSONB type line
    const interfaceStart = ROUTE.indexOf('interface UEFReviewRow');
    const interfaceEnd = ROUTE.indexOf('}', interfaceStart) + 1;
    const interfaceBlock = ROUTE.substring(interfaceStart, interfaceEnd);
    expect(interfaceBlock).not.toMatch(/^\s+payload\s*:/m);
  });

  it('UEFReviewRow is used to type the RPC result (no broad any on safe mapping)', () => {
    expect(ROUTE).toMatch(/records as UEFReviewRow\[\]/);
  });
});

// ── 6. Auth-before-service-role preserved ────────────────────────────────────

describe('gate2-3-step2 — auth-before-service-role preserved', () => {
  it('GET handler still calls requireKoraAdmin before getSupabaseServiceClient', () => {
    const getBlock = ROUTE.substring(ROUTE.indexOf('async function GET'));
    const adminIdx = getBlock.indexOf('requireKoraAdmin');
    const clientIdx = getBlock.indexOf('getSupabaseServiceClient()');
    expect(adminIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeLessThan(clientIdx);
  });

  it('GET handler still calls isKoraAuthError for early return on auth failure', () => {
    const getBlock = ROUTE.substring(ROUTE.indexOf('async function GET'));
    expect(getBlock).toMatch(/isKoraAuthError/);
  });

  it('RPC call happens after auth check (getSupabaseServiceClient before rpc)', () => {
    const getBlock = ROUTE.substring(ROUTE.indexOf('async function GET'));
    const clientIdx = getBlock.indexOf('getSupabaseServiceClient()');
    const rpcIdx = getBlock.indexOf('.rpc(');
    expect(clientIdx).toBeGreaterThan(-1);
    expect(rpcIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeLessThan(rpcIdx);
  });
});

// ── 7. Service-role client server-only ────────────────────────────────────────

describe('gate2-3-step2 — service-role client server-only', () => {
  it('review route uses getSupabaseServiceClient (not inline createClient)', () => {
    expect(ROUTE).toMatch(/getSupabaseServiceClient/);
    expect(ROUTE).not.toMatch(/createClient.*SUPABASE_SERVICE_ROLE/i);
  });

  it('review route does not reference SUPABASE_SERVICE_ROLE_KEY directly', () => {
    expect(ROUTE).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('review route is server-only (runtime nodejs)', () => {
    expect(ROUTE).toMatch(/runtime.*nodejs|export const runtime/);
  });
});

// ── 8. Response shape preserved ───────────────────────────────────────────────

describe('gate2-3-step2 — response shape preserved', () => {
  it('response still includes id field', () => {
    expect(ROUTE).toMatch(/id:\s*r\.id/);
  });

  it('response still includes rawName field', () => {
    expect(ROUTE).toMatch(/rawName:\s*r\.raw_name/);
  });

  it('response still includes reviewStatus field', () => {
    expect(ROUTE).toMatch(/reviewStatus:\s*r\.review_status/);
  });

  it('response still includes approvedForScoring field', () => {
    expect(ROUTE).toMatch(/approvedForScoring:\s*r\.approved_for_scoring/);
  });

  it('response still includes mappingConfidence field', () => {
    expect(ROUTE).toMatch(/mappingConfidence:\s*r\.data_completeness_score/);
  });

  it('response still includes summary block with total, approved, rejected', () => {
    expect(ROUTE).toMatch(/total.*safe\.length/);
    expect(ROUTE).toMatch(/approved.*reviewStatus.*approved/);
    expect(ROUTE).toMatch(/rejected.*reviewStatus.*rejected/);
  });

  it('response still returns ok, batchId, candidates, summary', () => {
    expect(ROUTE).toMatch(/ok.*true.*batchId.*candidates.*summary/i);
  });
});

// ── 9. Sanitized error handling ───────────────────────────────────────────────

describe('gate2-3-step2 — sanitized error handling', () => {
  it('review route checks rErr after RPC call', () => {
    expect(ROUTE).toMatch(/rErr.*return NextResponse\.json.*error.*status.*500/);
  });

  it('review route returns empty candidates for empty result (not error)', () => {
    expect(ROUTE).toMatch(/candidates.*\[\].*total.*0/);
  });

  it('review route does not expose raw RPC error stack to response', () => {
    // Error message is sanitized — only rErr.message, no stack
    expect(ROUTE).not.toMatch(/rErr\.stack|error\.stack/);
  });
});

// ── 10. Gate 2.3 Step 2 documented ───────────────────────────────────────────

describe('gate2-3-step2 — documentation updated', () => {
  it('design doc has Step 2 App Route Switch section', () => {
    expect(DOC).toMatch(/Step 2 App Route Switch|Step 2.*fn_admin_uef_review/i);
  });

  it('design doc notes previous direct SELECT removed or replaced', () => {
    expect(DOC).toMatch(/direct.*SELECT.*replaced|direct.*uef_record.*SELECT|previous.*SELECT.*remov/i);
  });

  it('design doc notes RPC now used or route switch complete', () => {
    expect(DOC).toMatch(/RPC.*now.*used|fn_admin_uef_review.*now.*call|GET Case B.*fn_admin_uef_review|Step 2.*complete/i);
  });

  it('design doc notes payload exclusion at DB object level', () => {
    expect(DOC).toMatch(/payload.*DB.*level|payload.*database.*level|payload.*excluded.*DB/i);
  });

  it('design doc notes response shape preserved', () => {
    expect(DOC).toMatch(/response shape.*preserved|shape.*preserved/i);
  });

  it('design doc notes Gate 3 production still blocked', () => {
    expect(DOC).toMatch(/production.*blocked.*Gate 3|Gate 3.*production/i);
  });
});

// ── 11. No formula / methodology changes ─────────────────────────────────────

describe('gate2-3-step2 — no formula or methodology changes', () => {
  it('review route still does not trigger scoring (approved_for_scoring flag only)', () => {
    expect(ROUTE).toMatch(/approved_for_scoring.*flag|flag.*not.*scoring|scoring.*B6/i);
  });

  it('review route does not import any methodology module', () => {
    expect(ROUTE).not.toMatch(/import.*methodology-config|import.*kora-index/i);
  });

  it('uef-service-key still enforces payload exclusion in whitelist', () => {
    expect(SERVICE).toMatch(/payload.*escluso|payload.*ESCLUSO|payload.*intentionally.*absent/i);
  });

  it('uef-service-key Step 2 noted as complete', () => {
    expect(SERVICE).toMatch(/Step 2.*complet|step 2.*compl/i);
  });
});

// ── 12. Gate 3 remains OPEN ───────────────────────────────────────────────────

describe('gate2-3-step2 — Gate 3 remains OPEN', () => {
  it('design doc final footer confirms Gate 3 OPEN — NOT CLOSED', () => {
    expect(DOC).toMatch(/Gate 3.*OPEN — NOT CLOSED/i);
  });
});

// ── 13. No secrets in route ───────────────────────────────────────────────────

describe('gate2-3-step2 — secrets hygiene', () => {
  it('review route contains no JWT token literals', () => {
    expect(ROUTE).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it('review route contains no connection string literals', () => {
    expect(ROUTE).not.toMatch(/postgresql:\/\/[^\s]+:[^\s]+@/i);
  });

  it('review route does not commit SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(ROUTE).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
