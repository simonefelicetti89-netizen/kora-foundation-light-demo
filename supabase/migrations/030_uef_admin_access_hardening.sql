-- 030_uef_admin_access_hardening.sql
-- Gate 2.3 — UEF Admin Access Hardening: rimozione kora_admin_all_uef e narrowing advisor.
--
-- OBIETTIVO:
--   Rimuovere la policy ALL `kora_admin_all_uef` su `analytics.uef_record`.
--   Rimuovere la policy SELECT `advisor_tenant_uef_read` (espone payload grezzo).
--   Sostituire entrambi gli accessi diretti con funzioni SECURITY DEFINER controllate.
--   Allineare il DB con la dichiarazione access-matrix.ts:
--     worker_individual_uef: { KORA_ADMIN: allowed: false }
--
-- POST-027 (applicata e tracked):
--   kora_admin_all_uef era rimasta per tensione architetturale (pipeline vs privacy).
--   advisor_tenant_uef_read era rimasta come policy legacy con accesso al payload grezzo.
--   Questa migrazione risolve entrambe le tensioni con SECURITY DEFINER functions.
--
-- PERCORSI POST-030:
--   1. service_role (server-side): bypassa RLS via BYPASSRLS — INVARIATO.
--      Usato da: generate-candidates, scoring engine, provisioning pipeline.
--   2. authenticated JWT, KORA_ADMIN: accesso SOLO via fn_admin_uef_review() e
--      fn_admin_uef_update_review() — payload escluso per design.
--   3. authenticated JWT, ADVISOR: accesso SOLO via fn_advisor_uef_read() —
--      payload escluso, tenant-scoped con guard cross-tenant esplicito.
--      advisor_tenant_uef_read DROPPATA — nessun accesso diretto alla tabella.
--   4. authenticated JWT, COMPANY_ADMIN/WORKER: nessun accesso — INVARIATO.
--
-- PRIVACY BOUNDARY (Gate 2.3, rivisto dopo review H-01):
--   fn_admin_uef_review() e fn_advisor_uef_read() NON espongono il campo payload.
--   Il campo payload contiene dati raw dall'upload HR/welfare (potenzialmente PII).
--   Gate 3 (DPO) deve approvare la policy di retention del campo payload
--   prima di caricare dati HR reali.
--   advisor_tenant_uef_read droppata in questa migrazione perché il payload grezzo
--   non deve essere accessibile ad alcun ruolo authenticated prima di Gate 3.
--
-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  PRECONDITIONS BEFORE APPLYING:                                             ║
-- ║                                                                              ║
-- ║  1. Gate 2.3 design review completed (docs/GATE2_3_UEF_ADMIN_ACCESS_       ║
-- ║     HARDENING_DESIGN.md v1.1 committed).                                    ║
-- ║  2. Migration 027 applied and tracked (verified via repair command).         ║
-- ║  3. App routes use getSupabaseServiceClient() consistently (commit e3e9516) ║
-- ║  4. generate-candidates service-role path confirmed working on staging.     ║
-- ║  5. review/route.ts GET Case B switched to non-payload query (commit        ║
-- ║     prepared in Gate 2.3 pre-migration sprint).                              ║
-- ║  6. Gate 3 remains OPEN — this migration does NOT close Gate 3.             ║
-- ║  7. Rollback artifact supabase/rollback/030_rollback_030_if_needed.sql     ║
-- ║     is staged and tested before applying this migration.                    ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (staging only):                                              ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/migrations/030_uef_admin_access_hardening.sql                  ║
-- ║  DO NOT use: supabase db push or supabase migration up                      ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- IDEMPOTENT: tutte le operazioni usano CREATE OR REPLACE / DROP ... IF EXISTS.

BEGIN;

DO $$
BEGIN
  RAISE NOTICE
    '030_uef_admin_access_hardening: PRECONDITION REMINDER — '
    'Apply ONLY after: Gate 2.3 design review complete, 027 tracked, '
    'app routes use getSupabaseServiceClient(), '
    'rollback artifact supabase/rollback/030_rollback_030_if_needed.sql staged. '
    'Gate 3 remains OPEN — this migration does NOT close Gate 3.';
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 1: analytics.fn_admin_uef_review
-- ════════════════════════════════════════════════════════════════════════════════
-- UEF candidate review list for a batch — KORA_ADMIN only (or service_role).
--
-- PRIVACY: payload field intentionally excluded.
--   Safe payload sub-fields are returned as named typed columns.
--   This prevents raw JSONB from leaking HR/welfare raw ingestion data.
--
-- AUTH:
--   Called via authenticated JWT: kora.kora_role() must be 'KORA_ADMIN'.
--   Called via service_role: always allowed (trusted server context).
--   Called via postgres: always allowed (superuser context).
--
-- SECURITY DEFINER: runs as function owner, bypasses RLS on uef_record.
--   Safe because auth check is enforced in WHERE clause.

CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_review(p_batch_id uuid)
RETURNS TABLE (
  id                          uuid,
  tenant_id                   uuid,
  batch_id                    uuid,
  reporting_period            text,
  raw_name                    text,
  eligibility                 text,
  primary_pillar              text,
  action_family               text,
  event_nature                text,
  approved_for_scoring        boolean,
  approved_for_bti_governance boolean,
  approved_for_impact_units   boolean,
  data_completeness_score     numeric,
  missing_fields              text[],
  review_status               text,
  reviewer_notes              text,
  reviewed_by                 text,
  reviewed_at                 timestamptz,
  created_at                  timestamptz,
  -- Safe payload sub-fields (interpreter-derived, not raw HR data):
  event_type                  text,
  reason_codes                jsonb,
  budget_amount               numeric,
  participants                integer,
  evidence_level              text,
  source_tier                 text,
  amount_parsing_status       text,
  participants_approximate    boolean,
  raw_amount_value            numeric,
  initiative_domain           text,
  budget_class                text,
  needs_enrichment            boolean,
  financial_confidence        text,
  enrichment_missing_fields   jsonb,
  interpreter_version         text,
  scoring_locked              boolean,
  enriched_by                 text,
  enriched_at                 text,
  b11_enriched                boolean
  -- payload JSONB intentionally absent — privacy boundary (Gate 2.3)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
  SELECT
    u.id,
    u.tenant_id,
    u.batch_id,
    u.reporting_period,
    u.raw_name,
    u.eligibility,
    u.primary_pillar,
    u.action_family,
    u.event_nature,
    u.approved_for_scoring,
    u.approved_for_bti_governance,
    u.approved_for_impact_units,
    u.data_completeness_score,
    u.missing_fields,
    u.review_status,
    u.reviewer_notes,
    u.reviewed_by,
    u.reviewed_at,
    u.created_at,
    -- Extract safe interpreter-derived sub-fields from payload:
    (u.payload ->> 'event_type'),
    (u.payload -> 'reason_codes'),
    (u.payload ->> 'budget_amount')::numeric,
    (u.payload ->> 'participants')::integer,
    (u.payload ->> 'evidence_level'),
    (u.payload ->> 'source_tier'),
    (u.payload ->> 'amount_parsing_status'),
    (u.payload ->> 'participants_approximate')::boolean,
    (u.payload ->> 'raw_amount_value')::numeric,
    (u.payload ->> 'initiative_domain'),
    (u.payload ->> 'budget_class'),
    (u.payload ->> 'needs_enrichment')::boolean,
    (u.payload ->> 'financial_confidence'),
    (u.payload -> 'enrichment_missing_fields'),
    (u.payload ->> 'interpreter_version'),
    (u.payload ->> 'scoring_locked')::boolean,
    (u.payload ->> 'enriched_by'),
    (u.payload ->> 'enriched_at'),
    (u.payload ->> 'b11_enriched')::boolean
  FROM analytics.uef_record u
  WHERE u.batch_id = p_batch_id
    AND (
      current_role IN ('service_role', 'postgres')
      OR kora.kora_role() = 'KORA_ADMIN'
    )
  ORDER BY u.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid) FROM anon;

COMMENT ON FUNCTION analytics.fn_admin_uef_review(uuid) IS
  'Gate 2.3: UEF review list — payload excluded, named safe columns returned. '
  'KORA_ADMIN or service_role only. Replaces direct kora_admin_all_uef SELECT path.';


-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 2: analytics.fn_admin_uef_update_review
-- ════════════════════════════════════════════════════════════════════════════════
-- Controlled approve / reject / needs_info on a UEF record — KORA_ADMIN only.
--
-- AUTH: KORA_ADMIN or service_role.
-- ACTION: 'approve' | 'reject' | 'needs_info' — validated, no other values accepted.
-- PAYLOAD: not exposed or modified by this function.
-- SECURITY DEFINER: bypasses RLS for UPDATE after auth check.

CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_update_review(
  p_uef_id    uuid,
  p_action    text,
  p_notes     text,
  p_reviewer  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
DECLARE
  v_eligibility text;
BEGIN
  -- Auth check: KORA_ADMIN via JWT, or trusted server roles
  IF current_role NOT IN ('service_role', 'postgres')
     AND kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: access denied — KORA_ADMIN required (role: %)',
      COALESCE(kora.kora_role(), 'NULL');
  END IF;

  -- Action whitelist
  IF p_action NOT IN ('approve', 'reject', 'needs_info') THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: invalid action ''%''. '
      'Must be: approve | reject | needs_info', p_action;
  END IF;

  -- Resolve eligibility for approved_for_impact_units logic
  SELECT eligibility INTO v_eligibility
  FROM analytics.uef_record
  WHERE id = p_uef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: UEF record not found: %', p_uef_id;
  END IF;

  -- Apply review action
  UPDATE analytics.uef_record SET
    review_status               = p_action,
    reviewer_notes              = p_notes,
    reviewed_by                 = p_reviewer,
    reviewed_at                 = now(),
    approved_for_scoring        = (p_action = 'approve'),
    approved_for_bti_governance = (p_action = 'approve'),
    -- Only eligible records generate Impact Units (matches app-layer logic in review/route.ts)
    approved_for_impact_units   = (p_action = 'approve' AND v_eligibility = 'eligible'),
    updated_at                  = now()
  WHERE id = p_uef_id;
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text) FROM anon;

COMMENT ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text) IS
  'Gate 2.3: Controlled UEF review action (approve/reject/needs_info). '
  'Validates action, sets approval flags. KORA_ADMIN or service_role only. '
  'Does not expose or modify payload.';


-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 3: analytics.fn_admin_uef_enrich
-- ════════════════════════════════════════════════════════════════════════════════
-- Controlled enrichment of UEF payload classification fields — KORA_ADMIN only.
--
-- AUTH: KORA_ADMIN or service_role.
-- FIELD WHITELIST: only whitelisted keys accepted in p_enrichment_fields.
--   Prevents arbitrary payload mutation that could overwrite scoring data.
-- SECURITY DEFINER: bypasses RLS for UPDATE after auth check.
--
-- NOTE: The app-layer enrich route (enrich/route.ts) has additional logic:
--   - recompute needsEnrichment and financialConfidence (TypeScript)
--   - update primary_pillar and eligibility columns if provided
--   - audit log write
--   The fn_admin_uef_enrich function provides DB-layer whitelisting
--   for direct SQL operations (ops team, future route migration).

CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_enrich(
  p_uef_id            uuid,
  p_enrichment_fields jsonb,
  p_reviewer          text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
DECLARE
  v_key   text;
  v_allowed_keys text[] := ARRAY[
    'initiative_domain',
    'event_type',
    'eligibility_class',
    'budget_class',
    'budget_amount',
    'budget_source',
    'evidence_level',
    'enrichment_notes'
  ];
BEGIN
  -- Auth check
  IF current_role NOT IN ('service_role', 'postgres')
     AND kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_enrich: access denied — KORA_ADMIN required (role: %)',
      COALESCE(kora.kora_role(), 'NULL');
  END IF;

  -- Validate: only whitelisted keys allowed
  FOR v_key IN SELECT jsonb_object_keys(p_enrichment_fields) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'fn_admin_uef_enrich: enrichment field not allowed: ''%''. '
        'Whitelisted fields: initiative_domain, event_type, eligibility_class, '
        'budget_class, budget_amount, budget_source, evidence_level, enrichment_notes',
        v_key;
    END IF;
  END LOOP;

  -- Guard: rejected records cannot be enriched
  IF NOT EXISTS (
    SELECT 1 FROM analytics.uef_record
    WHERE id = p_uef_id AND review_status <> 'rejected'
  ) THEN
    RAISE EXCEPTION 'fn_admin_uef_enrich: record % is rejected or not found. '
      'Cannot enrich a rejected record.', p_uef_id;
  END IF;

  -- Merge enrichment into payload (whitelisted fields only) + provenance metadata
  UPDATE analytics.uef_record SET
    payload = payload
      || p_enrichment_fields
      || jsonb_build_object(
           'enriched_by',  p_reviewer,
           'enriched_at',  now()::text,
           'b11_enriched', true
         ),
    updated_at = now()
  WHERE id = p_uef_id;
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text) FROM anon;

COMMENT ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text) IS
  'Gate 2.3: Controlled UEF payload enrichment with field whitelist. '
  'KORA_ADMIN or service_role only. '
  'For full enrichment with recomputed financialConfidence, use app-layer enrich/route.ts.';


-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 4: analytics.fn_advisor_uef_read
-- ════════════════════════════════════════════════════════════════════════════════
-- UEF review list for ADVISOR — tenant-scoped, payload excluded.
--
-- Sostituisce advisor_tenant_uef_read (droppata in questa migrazione).
-- ADVISOR mantiene visibilità sui campi di classificazione interpreter-derived,
-- ma NON può leggere il campo payload grezzo (dati HR/welfare raw).
--
-- PRIVACY: payload field intentionally excluded.
--   Solo sub-campi interpreter-derived (classificazione, eligibilità, budget class)
--   sono restituiti come colonne named e typed.
--   Il campo payload non viene mai restituito nemmeno parzialmente.
--
-- AUTH:
--   Chiamato via authenticated JWT: kora.kora_role() DEVE essere 'ADVISOR'.
--   Tenant guard esplicito: kora.tenant_id() DEVE corrispondere a p_tenant_id.
--     → Cross-tenant RAISE EXCEPTION (non silenzioso) per auditability.
--   Chiamato via service_role: sempre consentito (trusted server context).
--
-- SECURITY DEFINER: esegue come function owner, bypassa RLS su uef_record.
--   Safe perché auth check e tenant check sono enforced prima del RETURN QUERY.

CREATE OR REPLACE FUNCTION analytics.fn_advisor_uef_read(p_tenant_id uuid)
RETURNS TABLE (
  id                          uuid,
  tenant_id                   uuid,
  batch_id                    uuid,
  reporting_period            text,
  raw_name                    text,
  eligibility                 text,
  primary_pillar              text,
  action_family               text,
  event_nature                text,
  approved_for_scoring        boolean,
  approved_for_bti_governance boolean,
  approved_for_impact_units   boolean,
  data_completeness_score     numeric,
  missing_fields              text[],
  review_status               text,
  reviewer_notes              text,
  reviewed_by                 text,
  reviewed_at                 timestamptz,
  created_at                  timestamptz,
  -- Safe interpreter-derived sub-fields (non-raw, non-PII):
  event_type                  text,
  reason_codes                jsonb,
  budget_amount               numeric,
  evidence_level              text,
  initiative_domain           text,
  budget_class                text,
  needs_enrichment            boolean,
  financial_confidence        text,
  b11_enriched                boolean
  -- payload JSONB intentionally absent — Gate 2.3 H-01 revision / Gate 3 privacy boundary
  -- participants intentionally absent — small-team re-identification risk (Gate 3)
  -- raw_amount_value intentionally absent — potential PII in small datasets (Gate 3)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
BEGIN
  -- Auth check: only ADVISOR role or trusted server roles may call this function.
  -- service_role and postgres bypass this check (trusted server context).
  IF current_role NOT IN ('service_role', 'postgres') THEN
    IF kora.kora_role() <> 'ADVISOR' THEN
      RAISE EXCEPTION
        'fn_advisor_uef_read: access denied — ADVISOR role required (role: %)',
        COALESCE(kora.kora_role(), 'NULL');
    END IF;

    -- Tenant guard: ADVISOR can only query their own tenant.
    -- Explicit exception (not silent 0-rows) to surface cross-tenant attempts in logs.
    IF kora.tenant_id() IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION
        'fn_advisor_uef_read: cross-tenant access denied — '
        'requested tenant: %, authorized tenant: %',
        p_tenant_id, kora.tenant_id();
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.tenant_id,
    u.batch_id,
    u.reporting_period,
    u.raw_name,
    u.eligibility,
    u.primary_pillar,
    u.action_family,
    u.event_nature,
    u.approved_for_scoring,
    u.approved_for_bti_governance,
    u.approved_for_impact_units,
    u.data_completeness_score,
    u.missing_fields,
    u.review_status,
    u.reviewer_notes,
    u.reviewed_by,
    u.reviewed_at,
    u.created_at,
    -- Interpreter-derived classification fields (not raw HR data):
    (u.payload ->> 'event_type'),
    (u.payload -> 'reason_codes'),
    (u.payload ->> 'budget_amount')::numeric,
    (u.payload ->> 'evidence_level'),
    (u.payload ->> 'initiative_domain'),
    (u.payload ->> 'budget_class'),
    (u.payload ->> 'needs_enrichment')::boolean,
    (u.payload ->> 'financial_confidence'),
    (u.payload ->> 'b11_enriched')::boolean
  FROM analytics.uef_record u
  WHERE u.tenant_id = p_tenant_id
  ORDER BY u.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid) FROM anon;

COMMENT ON FUNCTION analytics.fn_advisor_uef_read(uuid) IS
  'Gate 2.3 H-01 revision: ADVISOR UEF read — payload excluded, tenant-scoped. '
  'Replaces advisor_tenant_uef_read (dropped in this migration). '
  'ADVISOR or service_role only. Cross-tenant access raises exception.';


-- ════════════════════════════════════════════════════════════════════════════════
-- DROP: kora_admin_all_uef
-- ════════════════════════════════════════════════════════════════════════════════
-- Rimuove l'accesso diretto ALL su analytics.uef_record per KORA_ADMIN JWT.
-- Accesso service_role rimane via BYPASSRLS (invariato).
-- Accesso KORA_ADMIN JWT: ora solo via fn_admin_uef_review / fn_admin_uef_update_review.
-- Allinea il DB con access-matrix.ts: worker_individual_uef → KORA_ADMIN: allowed: false.

DROP POLICY IF EXISTS kora_admin_all_uef ON analytics.uef_record;

-- ════════════════════════════════════════════════════════════════════════════════
-- DROP: advisor_tenant_uef_read  (H-01 revision — Gate 2.3 pre-apply security review)
-- ════════════════════════════════════════════════════════════════════════════════
-- Rimuove la policy SELECT che dava ad ADVISOR accesso diretto a uef_record
-- incluso il campo payload grezzo (dati HR/welfare raw, potenzialmente PII).
--
-- MOTIVO DELLA RIMOZIONE:
--   Pre-apply security review (2026-06-23) ha classificato advisor_tenant_uef_read
--   come finding H-01 HIGH: ADVISOR non deve avere accesso al payload grezzo
--   prima di Gate 3 (DPO review) e prima che dati reali siano caricati.
--   Nessuna route app ADVISOR dipende attualmente da questo accesso.
--
-- SOSTITUZIONE: fn_advisor_uef_read (OBJECT 4) — payload escluso, tenant-scoped,
--   cross-tenant guard esplicito (RAISE EXCEPTION).
--
-- POST-030: ADVISOR ha accesso a uef_record SOLO via fn_advisor_uef_read().
--   SELECT diretto su uef_record da ADVISOR JWT → 0 rows (nessuna policy applicabile).

DROP POLICY IF EXISTS advisor_tenant_uef_read ON analytics.uef_record;

-- ════════════════════════════════════════════════════════════════════════════════
-- GRANTS: uef_record SELECT per authenticated (già in migration 002, invariato)
-- ════════════════════════════════════════════════════════════════════════════════
-- analytics.uef_record ha già: GRANT SELECT ON analytics.uef_record TO authenticated
-- (migration 002). RLS policies determinano quali righe sono visibili.
-- Post-030: KORA_ADMIN JWT ha 0 rows via SELECT diretto (nessuna policy applicabile).
--           ADVISOR JWT ha 0 rows via SELECT diretto (nessuna policy applicabile).
-- Il SELECT diretto via service_role bypassa RLS → continua a funzionare.
-- Tutti i ruoli authenticated accedono via SECURITY DEFINER functions (OBJECT 1–4).

-- ════════════════════════════════════════════════════════════════════════════════
-- VERIFICA POST-APPLICAZIONE (run after apply, check-only queries)
-- ════════════════════════════════════════════════════════════════════════════════
/*
-- 1. Conferma ENTRAMBE le policies sono state rimosse:
SELECT policyname, tablename, cmd, qual
FROM pg_policies
WHERE tablename = 'uef_record'
  AND schemaname = 'analytics'
ORDER BY policyname;
-- Atteso: 0 righe. kora_admin_all_uef ASSENTE. advisor_tenant_uef_read ASSENTE.
-- (nessuna policy RLS su uef_record post-030 — accesso solo via BYPASSRLS o SECURITY DEFINER functions)

-- 2. Conferma tutte e 4 le SECURITY DEFINER functions esistono:
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'analytics'
  AND routine_name IN (
    'fn_admin_uef_review',
    'fn_admin_uef_update_review',
    'fn_admin_uef_enrich',
    'fn_advisor_uef_read'
  );
-- Atteso: 4 righe, security_type = 'DEFINER'.

-- 3. Conferma GRANT EXECUTE su authenticated per tutte le functions:
SELECT grantee, routine_name, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'analytics'
  AND routine_name IN (
    'fn_admin_uef_review',
    'fn_admin_uef_update_review',
    'fn_admin_uef_enrich',
    'fn_advisor_uef_read'
  )
ORDER BY routine_name, grantee;
-- Atteso: authenticated ha EXECUTE per tutte e 4. anon non ha EXECUTE.

-- 4. Smoke test fn_admin_uef_review (service_role context):
-- SELECT COUNT(*) FROM analytics.fn_admin_uef_review('<some-batch-id>');
-- Atteso: ritorna count senza errori. payload NON tra le colonne.

-- 5. Smoke test fn_advisor_uef_read (service_role context):
-- SELECT COUNT(*) FROM analytics.fn_advisor_uef_read('<some-tenant-id>');
-- Atteso: ritorna count senza errori. payload NON tra le colonne.
-- Verifica che participants, raw_amount_value NON siano tra le colonne.

-- 6. Conferma che ADVISOR JWT con p_tenant_id sbagliato riceve EXCEPTION:
-- (richiede contesto JWT con kora_role=ADVISOR e tenant_id diverso da p_tenant_id)
-- SELECT * FROM analytics.fn_advisor_uef_read('<wrong-tenant-id>');
-- Atteso: EXCEPTION 'fn_advisor_uef_read: cross-tenant access denied'.

-- 7. Conferma che SELECT diretto su uef_record da ADVISOR JWT → 0 rows:
-- (richiede contesto JWT con kora_role=ADVISOR)
-- SET request.jwt.claims = '{"kora_role":"ADVISOR","tenant_id":"<uuid>"}';
-- SELECT COUNT(*) FROM analytics.uef_record; -- Atteso: 0 (nessuna policy applicabile)
*/

COMMIT;
