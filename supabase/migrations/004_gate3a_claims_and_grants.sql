-- =============================================================================
-- KORA Foundation Light — Gate 3A
-- Migration:   004_gate3a_claims_and_grants
-- Created:     2026-05-30
-- Replaces:    003_claim_functions_app_metadata  (re-applies and supersedes it)
-- =============================================================================
--
-- PURPOSE
-- -------
-- 1. Fix kora.kora_role() and kora.tenant_id() to read JWT claims from
--    app_metadata (standard Supabase JWT path) as fallback to top-level claims.
--    Without this fix every authenticated user gets kora_role = 'anonymous'
--    and RLS blocks all rows.
--
-- 2. GRANT SELECT on personal.uploaded_record to authenticated.
--    Without this GRANT PostgreSQL rejects the query before RLS can evaluate it,
--    preventing KORA_ADMIN from reading rows even though the RLS policy allows it.
--    After this GRANT, RLS remains the sole enforcement layer:
--    company roles see 0 rows; KORA_ADMIN sees its rows.
--
-- 3. Confirm the RLS policy on personal.uploaded_record is intact
--    (policy defined in migration 001 — no change needed here; confirmed below).
--
-- 4. Notify PostgREST to reload its schema cache.
--
-- 5. Verify the updated function bodies.
--
-- SECURITY NOTES
-- --------------
-- kora_role and tenant_id are stored in app_metadata (auth.users.raw_app_meta_data).
-- app_metadata is writable only via the Supabase Admin API (service_role key).
-- supabase.auth.updateUser() from the client can only write user_metadata — never
-- app_metadata. These claims are therefore server-controlled and user-non-editable.
--
-- FORCE ROW LEVEL SECURITY remains active on personal.uploaded_record (set in
-- migration 002). The GRANT below adds query access without weakening RLS.
-- =============================================================================


-- =============================================================================
-- STEP 1 — Fix kora.kora_role()
-- Reads: top-level claim first, then app_metadata fallback, then 'anonymous'.
-- =============================================================================

CREATE OR REPLACE FUNCTION kora.kora_role()
  RETURNS text
  LANGUAGE sql
  STABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      current_setting('request.jwt.claims', true)::jsonb ->> 'kora_role',
      ''
    ),
    NULLIF(
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'kora_role',
      ''
    ),
    'anonymous'
  );
$$;


-- =============================================================================
-- STEP 2 — Fix kora.tenant_id()
-- Reads: top-level claim first, then app_metadata fallback, then NULL.
-- =============================================================================

CREATE OR REPLACE FUNCTION kora.tenant_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      NULLIF(
        current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
        ''
      ),
      NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
        ''
      )
    ),
    ''
  )::uuid;
$$;


-- =============================================================================
-- STEP 3 — GRANT SELECT on personal.uploaded_record to authenticated
-- Allows RLS to evaluate for all authenticated users.
-- The existing policy "kora_admin_only_uploaded_records" (migration 001)
-- already restricts rows to kora.kora_role() = 'KORA_ADMIN'.
-- Company roles get 0 rows via RLS. KORA_ADMIN gets its rows.
-- =============================================================================

GRANT SELECT ON personal.uploaded_record TO authenticated;


-- =============================================================================
-- STEP 4 — Confirm RLS policy on personal.uploaded_record is intact
-- (SELECT only — this does not modify the policy)
-- =============================================================================

DO $$
DECLARE
  policy_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'personal'
      AND tablename  = 'uploaded_record'
      AND policyname = 'kora_admin_only_uploaded_records'
  ) INTO policy_exists;

  IF NOT policy_exists THEN
    RAISE EXCEPTION
      'ABORT: RLS policy kora_admin_only_uploaded_records not found on personal.uploaded_record. Do not proceed.';
  END IF;

  RAISE NOTICE 'OK: RLS policy kora_admin_only_uploaded_records is present on personal.uploaded_record.';
END;
$$;


-- =============================================================================
-- STEP 5 — Reload PostgREST schema cache
-- =============================================================================

NOTIFY pgrst, 'reload schema';


-- =============================================================================
-- STEP 6 — Verify updated function bodies
-- Expected output: both definitions must contain the string 'app_metadata'.
-- =============================================================================

SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'kora'
  AND routine_name IN ('kora_role', 'tenant_id')
ORDER BY routine_name;
