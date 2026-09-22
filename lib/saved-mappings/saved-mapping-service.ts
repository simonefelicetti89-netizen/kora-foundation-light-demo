// lib/saved-mappings/saved-mapping-service.ts
// KORA-WP-066 — Saved Mappings (COMPANY-011).
//
// FOUNDER SEMANTIC RULING (2026-09-21) — READING 1, TENANT-SCOPED SESSION REUSE.
// The historical registry wording "reusable mapping across Companies" is NOT
// the intended Product semantics. The corrected canonical acceptance is:
// "a saved mapping is reusable across upload/mapping sessions for the same
// Company." Ownership = Company/tenant. Operational actor = KORA_ADMIN.
// Reuse boundary = same Company only.
//
// WHAT THIS MODULE OWNS
//   Persistence and later reuse of the NORMAL ingestion column mapping — the
//   existing B27 object Record<sourceHeader, CanonicalIntakeField> from
//   lib/data-intake/column-mapping.ts.
//
// WHAT IT DOES NOT TOUCH
//   KORA-WP-029's one-off manual-remap Case governance
//   (lib/mapping-governance/manual-remap-service.ts) is a different concept and
//   is neither imported, wrapped nor modified here. Nor are the BCM classifier
//   (COMPANY-010 KEEP), normative mapping, pillar mapping or care-economy
//   mapping. No cross-Company template, catalogue, promotion or learning.
//
// TENANT IDENTITY IS NEVER TAKEN FROM THE CLIENT.
//   Callers pass a tenant CODE; this module resolves it against
//   analytics.tenant server-side, exactly as the existing accept route already
//   does. A raw tenant_id is never accepted from request input.

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { CANONICAL_FIELDS, type CanonicalIntakeField } from '@/lib/data-intake/column-mapping';

/** The persisted object: source header -> canonical intake field. */
export type SavedMappingPayload = Record<string, CanonicalIntakeField>;

export interface SavedMapping {
  id: string;
  mappingName: string;
  mapping: SavedMappingPayload;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

const CANONICAL_SET = new Set<string>(CANONICAL_FIELDS);

/**
 * Accepts only { header: canonicalField } pairs. Anything else — a row value, a
 * sample, a nested object — is dropped rather than persisted. This mirrors the
 * migration-090 CHECK constraint in application space so a bad payload fails
 * fast and legibly instead of as a database error.
 */
export function sanitizeMappingPayload(raw: unknown): SavedMappingPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: SavedMappingPayload = {};
  for (const [header, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof header !== 'string' || header.trim() === '') continue;
    if (typeof value !== 'string') continue;
    if (!CANONICAL_SET.has(value)) continue;
    out[header] = value as CanonicalIntakeField;
  }
  return out;
}

/** Resolves a tenant CODE to its canonical id. Returns null when unknown. */
async function resolveTenantId(tenantCode: string): Promise<string | null> {
  const code = tenantCode.trim();
  if (!code) return null;
  const db = getSupabaseServiceClient();
  const { data, error } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', code).maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/**
 * Every saved mapping belonging to ONE Company, newest first.
 *
 * The tenant filter is applied here, server-side, on an id the caller could not
 * supply — it is never a UI-level filter over a broader result set. Under RLS
 * (migration 090) there is additionally no cross-tenant read policy at all.
 */
export async function listSavedMappingsForTenant(tenantCode: string): Promise<SavedMapping[]> {
  const tenantId = await resolveTenantId(tenantCode);
  if (!tenantId) return [];

  const db = getSupabaseServiceClient();
  const { data, error } = await db.schema('analytics').from('saved_column_mapping')
    .select('id, mapping_name, mapping, created_at, updated_at, created_by')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map((r) => ({
    id:          String(r.id),
    mappingName: String(r.mapping_name),
    mapping:     sanitizeMappingPayload(r.mapping),
    createdAt:   String(r.created_at),
    updatedAt:   String(r.updated_at),
    createdBy:   r.created_by === null || r.created_by === undefined ? null : String(r.created_by),
  }));
}

export interface SaveMappingParams {
  tenantCode: string;
  mappingName: string;
  /**
   * The mapping the server itself reconstructed — never the raw client value.
   *
   * Deliberately typed loosely: the live intake mapping also carries the two
   * UI sentinels 'ignore' and 'keep_original', which are NOT canonical intake
   * fields. Per the Founder ruling (WP-066 §8) a saved mapping contains only
   * `sourceHeader -> CanonicalIntakeField`, so sanitizeMappingPayload drops
   * them here rather than widening the persisted contract. 'keep_original' is
   * the no-op default and loses nothing; 'ignore' is re-stated per session,
   * which keeps every column the Operator discards a conscious, current
   * decision instead of one silently inherited from an earlier upload.
   */
  mapping: Record<string, string>;
  actorId: string;
}

export type SaveMappingResult =
  | { ok: true; id: string; mappingName: string; fieldCount: number }
  | { ok: false; reason: 'unknown_tenant' | 'empty_mapping' | 'blank_name' | 'duplicate_name' | 'write_failed' };

/**
 * Saves one new mapping for one Company.
 *
 * Saving is OPTIONAL and explicit: nothing here is invoked unless the Operator
 * asked for it.
 *
 * DUPLICATE NAME IS A CONFLICT, NEVER AN OVERWRITE (Founder ruling, 2026-09-22).
 * A name already used by this Company is rejected with `duplicate_name` and the
 * existing row is left exactly as it was — not overwritten, not updated, not
 * merged, not auto-versioned, not suffixed, and never duplicated. Updating an
 * existing Saved Mapping is deliberately not a WP-066 capability, so this is a
 * plain INSERT: the (tenant_id, mapping_name) unique constraint is the
 * authority, and its violation is surfaced as Product meaning rather than
 * absorbed. A different Company may freely use the same name — the constraint
 * is per tenant.
 */
export async function saveMappingForTenant(params: SaveMappingParams): Promise<SaveMappingResult> {
  const mappingName = params.mappingName.trim();
  if (!mappingName) return { ok: false, reason: 'blank_name' };

  const mapping = sanitizeMappingPayload(params.mapping);
  if (Object.keys(mapping).length === 0) return { ok: false, reason: 'empty_mapping' };

  const tenantId = await resolveTenantId(params.tenantCode);
  if (!tenantId) return { ok: false, reason: 'unknown_tenant' };

  const db = getSupabaseServiceClient();
  const { data, error } = await db.schema('analytics').from('saved_column_mapping')
    .insert({
      tenant_id:    tenantId,
      mapping_name: mappingName,
      mapping,
      created_by:   params.actorId,
    })
    .select('id')
    .maybeSingle();

  // 23505 = unique_violation. The only unique constraint on this table is
  // (tenant_id, mapping_name), so this is precisely the duplicate-name case.
  if (error && (error as { code?: string }).code === '23505') {
    return { ok: false, reason: 'duplicate_name' };
  }
  if (error || !data) return { ok: false, reason: 'write_failed' };
  return { ok: true, id: String((data as { id: string }).id), mappingName, fieldCount: Object.keys(mapping).length };
}

export interface AppliedMapping {
  /** Header -> field, restricted to headers actually present in this upload. */
  applied: SavedMappingPayload;
  /** Saved headers absent from the current file — informational, never fatal. */
  missingHeaders: string[];
  /** Current headers the saved mapping says nothing about — map them normally. */
  unmappedHeaders: string[];
}

/**
 * COPY-ON-USE.
 *
 * Returns a NEW object derived from the saved mapping, restricted to headers
 * that actually exist in the current upload. The caller merges this into its
 * own session state; the persisted row is never handed out by reference and is
 * never mutated by anything the Operator does afterwards. Persisting an updated
 * mapping always requires another explicit saveMappingForTenant call.
 *
 * NO SCHEMA FINGERPRINT, NO COMPATIBILITY INFERENCE. A saved mapping is never
 * judged "compatible" or "incompatible": headers that match are prefilled,
 * headers that do not are simply reported so the Operator maps them normally.
 * A difference between the saved mapping and the current file is never an error
 * and never blocks the upload.
 */
export function applySavedMappingToHeaders(
  saved: SavedMappingPayload,
  currentHeaders: string[],
): AppliedMapping {
  const present = new Set(currentHeaders);
  const applied: SavedMappingPayload = {};
  const missingHeaders: string[] = [];

  for (const [header, field] of Object.entries(saved)) {
    if (present.has(header)) applied[header] = field;
    else missingHeaders.push(header);
  }

  const unmappedHeaders = currentHeaders.filter((h) => !(h in applied));

  return { applied, missingHeaders, unmappedHeaders };
}
