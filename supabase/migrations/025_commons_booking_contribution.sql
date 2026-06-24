-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   025_commons_booking_contribution
-- Feature:     B166 — Prenotazioni cross-azienda + alimentazione KORA Contribution
-- Gate 2 OPEN: WRITTEN, NOT applied to any live database.
-- Author:      KORA Foundation Light · 2026-06-16
-- Revised:     2026-06-24 — Pre-Pilot hardening sprint (M025-1 through M025-6)
--   M025-1: expanded contribution_kind CHECK (adoption/sponsorship/replication/KORA-origin)
--   M025-2: expanded evidence_status CHECK (partner_verified, advisor_verified, system_verified)
--   M025-3: expanded role CHECK (adopter, sponsor, supporter, cofunder, kora_enabler, partner)
--   M025-4: N≥10 privacy threshold enforced in booking_aggregate_for_promoter()
--   M025-5: restricted grants — authenticated gets SELECT only on contribution_event
--   M025-6: added source_type, event_type, contribution_component_hint, aggregate_count,
--            privacy_threshold_met, is_cross_company, is_kora_originated, is_kora_enabled,
--            adoption_type fields to contribution_event
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Questo file crea/estende:
--   1. commons.booking           — prenotazione worker a iniziativa cross_company
--   2. commons.contribution_event — binario reale KORA Contribution da eventi live
--   3. personal.worker_pib       — colonna source_booking_id (fk → commons.booking)
--   4. Funzione SECURITY DEFINER booking_aggregate_for_promoter
--   5. RLS per booking e contribution_event
--
-- INVARIANTI PRIVACY NON NEGOZIABILI:
--   - Nessuna policy COMPANY su commons.booking che esponga righe individuali.
--   - COMPANY_ADMIN di Beta (promotrice) vede SOLO aggregati via funzione SECURITY DEFINER.
--   - COMPANY_ADMIN di Acme (provenienza worker) NON vede booking dei propri lavoratori.
--     L'impatto di Acme è visibile solo tramite commons.contribution_event del proprio tenant.
--   - WORKER: accede solo alle proprie prenotazioni (via subquery su worker_identity).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. commons.booking ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commons.booking (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- L'iniziativa prenotata — deve essere cross_company e published
  post_id             uuid          NOT NULL REFERENCES commons.post (id) ON DELETE CASCADE,

  -- Il worker che prenota — mai esposto a nessun company role
  worker_identity_id  uuid          NOT NULL REFERENCES personal.worker_identity (id) ON DELETE CASCADE,

  -- Denormalizzati per query Contribution (senza join cross-schema su ogni query)
  worker_tenant_id    uuid          NOT NULL,   -- tenant di Acme (provenienza worker)
  post_tenant_id      uuid          NOT NULL,   -- tenant di Beta (promotrice)

  -- Workflow: pending → approved/rejected; approved → attended/cancelled
  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'attended')),

  moderation_notes    text          NULL,
  moderated_by        uuid          NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  moderated_at        timestamptz   NULL,

  -- Segnato da KORA_ADMIN dopo che l'evento si è svolto e la partecipazione è confermata
  attended_at         timestamptz   NULL,

  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  -- Un worker prenota una volta per iniziativa (idempotenza a livello schema)
  CONSTRAINT uq_booking_post_worker UNIQUE (post_id, worker_identity_id)
);

-- set_updated_at() is defined in migration 001 (public/default schema).
-- All other migrations reference it unqualified. kora.set_updated_at() does NOT exist.
CREATE TRIGGER trg_booking_updated_at
  BEFORE UPDATE ON commons.booking
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indici operativi
CREATE INDEX IF NOT EXISTS idx_booking_post_id           ON commons.booking (post_id);
CREATE INDEX IF NOT EXISTS idx_booking_worker_identity   ON commons.booking (worker_identity_id);
CREATE INDEX IF NOT EXISTS idx_booking_status            ON commons.booking (status);
CREATE INDEX IF NOT EXISTS idx_booking_post_tenant       ON commons.booking (post_tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_worker_tenant     ON commons.booking (worker_tenant_id);

COMMENT ON TABLE commons.booking IS
  'B166 — Prenotazioni worker a iniziative cross_company. '
  'PRIVACY: nessuna policy company espone righe individuali. '
  'Aggregati per la promotrice solo via booking_aggregate_for_promoter() SECURITY DEFINER. '
  'Gate 2 OPEN: NOT applied.';

-- ── 2. RLS commons.booking ─────────────────────────────────────────────────────

ALTER TABLE commons.booking ENABLE ROW LEVEL SECURITY;

-- KORA_ADMIN: accesso completo (moderation, oversight)
DROP POLICY IF EXISTS "booking_kora_admin_all" ON commons.booking;
CREATE POLICY "booking_kora_admin_all"
  ON commons.booking FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: solo le proprie prenotazioni (subquery canonical — uguale a worker_pib mig 018)
DROP POLICY IF EXISTS "booking_worker_own_all" ON commons.booking;
CREATE POLICY "booking_worker_own_all"
  ON commons.booking FOR ALL
  USING (
    kora.kora_role() = 'WORKER'
    AND worker_identity_id IN (
      SELECT id FROM personal.worker_identity
      WHERE auth_user_id = auth.uid()
    )
  );
-- NESSUNA policy per COMPANY_ADMIN / COMPANY_VIEWER — intenzionale e non negoziabile.
-- La promotrice (Beta) vede solo aggregati via booking_aggregate_for_promoter().
-- L'azienda di provenienza (Acme) non ha visibilità diretta: il suo impatto
-- è tracciato esclusivamente tramite commons.contribution_event.

GRANT SELECT, INSERT, UPDATE ON commons.booking TO authenticated;

-- ── 3. Funzione SECURITY DEFINER — aggregato per promotrice ──────────────────
-- Restituisce il count delle prenotazioni per stato per un'iniziativa specifica.
-- Validazione ruolo: solo COMPANY_ADMIN del tenant della promotrice o KORA_ADMIN.
-- La funzione bypassa RLS internamente ma verifica il ruolo JWT prima di restituire dati.
-- MAI righe individuali — solo {status, count}.

DROP FUNCTION IF EXISTS commons.booking_aggregate_for_promoter(uuid);
CREATE OR REPLACE FUNCTION commons.booking_aggregate_for_promoter(p_post_id uuid)
RETURNS TABLE (booking_status text, booking_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = commons, personal, public AS $$
DECLARE
  v_post_tenant_id     uuid;
  v_caller_role        text;
  v_caller_tenant      uuid;  -- canonical helper returns uuid directly (kora.tenant_id(), mig 006)
  v_total_count        bigint;
  -- M025-4: KORA safe_aggregation_threshold = 10 (aligned with PrivacyVisibilityService)
  v_privacy_threshold  constant int := 10;
BEGIN
  v_caller_role   := kora.kora_role();
  v_caller_tenant := kora.tenant_id();

  -- Solo KORA_ADMIN e COMPANY_ADMIN possono accedere
  IF v_caller_role NOT IN ('KORA_ADMIN', 'COMPANY_ADMIN') THEN
    RAISE EXCEPTION 'booking_aggregate_for_promoter: accesso negato — ruolo: %', v_caller_role;
  END IF;

  -- Recupera il tenant della post
  SELECT tenant_id INTO v_post_tenant_id
  FROM commons.post WHERE id = p_post_id;

  IF v_post_tenant_id IS NULL THEN
    RAISE EXCEPTION 'booking_aggregate_for_promoter: iniziativa non trovata — id: %', p_post_id;
  END IF;

  -- COMPANY_ADMIN: solo del tenant della propria iniziativa
  IF v_caller_role = 'COMPANY_ADMIN' AND v_caller_tenant <> v_post_tenant_id THEN
    RAISE EXCEPTION 'booking_aggregate_for_promoter: accesso negato — tenant non corrisponde';
  END IF;

  -- M025-4: N≥10 privacy threshold (safe_aggregation_threshold = 10).
  -- Se il totale prenotazioni è sotto la soglia, non restituire breakdown per status —
  -- potrebbe permettere all'azienda promotrice di identificare partecipanti singoli.
  -- Restituisce invece un bucket anonimizzato ('below_threshold', total_count).
  -- KORA_ADMIN bypassa il threshold per esigenze di moderazione e oversight.
  SELECT COUNT(*) INTO v_total_count
  FROM commons.booking
  WHERE post_id = p_post_id;

  IF v_caller_role = 'COMPANY_ADMIN' AND v_total_count < v_privacy_threshold THEN
    RETURN QUERY SELECT 'below_threshold'::text, v_total_count;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.status::text, COUNT(*)::bigint
  FROM commons.booking b
  WHERE b.post_id = p_post_id
  GROUP BY b.status;
END;
$$;

COMMENT ON FUNCTION commons.booking_aggregate_for_promoter(uuid) IS
  'B166 — Ritorna count prenotazioni per status per una singola iniziativa. '
  'SECURITY DEFINER per bypassare RLS sulla tabella booking. '
  'Verifica ruolo JWT internamente. MAI righe individuali. '
  'M025-4: N<10 → restituisce below_threshold (safe_aggregation_threshold=10). '
  'KORA_ADMIN bypassa il threshold per oversight/moderation.';

-- ── 4. commons.contribution_event ────────────────────────────────────────────
-- Binario reale che alimenta KORA Contribution per i tenant production_ready.
-- Una partecipazione cross_company crea DUE righe: promoter (Beta) + origin_employer (Acme).
-- Companion indicator — NON componente del KORA Index (CLAUDE.md §12.7).

CREATE TABLE IF NOT EXISTS commons.contribution_event (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Il tenant a cui appartiene questo Contribution (promotrice o azienda di provenienza)
  tenant_id           uuid          NOT NULL,

  -- Tracciabilità — FK nullable per idempotenza selettiva
  source_booking_id   uuid          NULL REFERENCES commons.booking (id) ON DELETE SET NULL,
  source_post_id      uuid          NOT NULL REFERENCES commons.post (id) ON DELETE CASCADE,

  -- Ruolo dell'azienda in questo evento di Contribution
  -- M025-3: expanded from (promoter, origin_employer) to support adoption/sponsorship/ecosystem
  role                text          NOT NULL
                                    CHECK (role IN (
                                      'promoter',         -- azienda che ha promosso l'iniziativa
                                      'origin_employer',  -- azienda da cui proviene il worker partecipante
                                      'adopter',          -- azienda che adotta un'iniziativa già esistente
                                      'sponsor',          -- azienda che sponsorizza un'iniziativa esterna
                                      'supporter',        -- azienda che supporta senza sponsorizzare
                                      'cofunder',         -- azienda che cofinanzia
                                      'kora_enabler',     -- azienda che ha reso possibile un'iniziativa KORA-originated
                                      'partner'           -- partner esterno che co-progetta l'iniziativa
                                    )),

  -- Tipo di evento: M025-1: expanded to support full contribution taxonomy A-F
  contribution_kind   text          NOT NULL
                                    CHECK (contribution_kind IN (
                                      -- A. Booking/Participation (Gate 3 — mig 025 source)
                                      'cross_company_participation',
                                      'external_participants_event',
                                      -- B. Adoption/Sponsorship
                                      'company_adoption',
                                      'company_sponsorship',
                                      'company_support',
                                      'company_cofunding',
                                      -- C. KORA-Originated/Enabled
                                      'kora_originated_adoption',
                                      'kora_enabled_adoption',
                                      -- E. Replication/Scale
                                      'initiative_replication',
                                      -- D. Feedback/Value (aggregate only, N≥10)
                                      'aggregate_feedback',
                                      'aggregate_follow_up'
                                    )),

  -- Peso di impatto che alimenta il companion indicator (0.0000 – 9.9999)
  impact_weight       numeric(8,4)  NOT NULL,

  -- Qualità evidenza: M025-2: expanded to support partner/advisor/system verification
  evidence_status     text          NOT NULL
                                    CHECK (evidence_status IN (
                                      'verified',          -- admin-confirmed (attendance_marked)
                                      'self_declared',     -- company self-reports (external_participants)
                                      'partner_verified',  -- partner confirms participation
                                      'advisor_verified',  -- KORA Advisor confirms
                                      'system_verified'    -- automatic system verification (e.g. LMS API)
                                    )),

  -- Periodo di rendicontazione (es. '2026-Q2')
  reporting_period    text          NOT NULL,

  -- ── M025-6: Source / Event classification fields ──────────────────────────
  -- These fields classify the signal source and component hint for V2 computation.
  -- All nullable with safe defaults — new kinds default to NULL until set by source RPC.

  -- Sorgente del segnale: 'booking', 'external_participants', 'adoption', 'sponsorship', 'replication'
  source_type              text          NULL,

  -- Evento specifico: 'attendance_marked', 'company_adopted', 'initiative_replicated', etc.
  event_type               text          NULL,

  -- Suggerimento al motore V2 su quale componente alimentare primarily
  -- Values: 'activation_depth', 'adoption_reach', 'ecosystem_contribution', 'evidence_quality', 'strategic_breadth'
  contribution_component_hint text        NULL,

  -- N per segnali aggregati (feedback, follow-up). NULL per segnali per-evento (booking).
  aggregate_count          integer       NULL CHECK (aggregate_count IS NULL OR aggregate_count >= 0),

  -- true quando aggregate_count (o booking total per l'iniziativa) ha raggiunto N≥10 (privacy safe).
  -- Enforcement primario avviene in booking_aggregate_for_promoter() e nel service layer.
  privacy_threshold_met    boolean       NOT NULL DEFAULT false,

  -- true se coinvolge due tenant distinti (worker tenant ≠ post tenant)
  is_cross_company         boolean       NOT NULL DEFAULT false,

  -- KORA-originated: l'iniziativa è stata creata/originata da KORA (non da un tenant).
  -- Config declares kora_originated_if_adopted=true — implementation per Pre-Pilot plan G-3.
  is_kora_originated       boolean       NOT NULL DEFAULT false,

  -- KORA-enabled: KORA ha reso possibile il collegamento anche se non è l'iniziativa originale.
  is_kora_enabled          boolean       NOT NULL DEFAULT false,

  -- Tipo adozione per kind in (company_adoption, company_sponsorship, kora_originated_adoption, ...)
  -- Values: 'sponsored', 'cofunded', 'promoted', 'made_available', 'formal_adoption'
  adoption_type            text          NULL,

  created_at          timestamptz   NOT NULL DEFAULT now(),

  -- Idempotenza per booking: (tenant_id, role, source_booking_id) è univoco
  CONSTRAINT uq_contribution_booking UNIQUE (tenant_id, role, source_booking_id)
    DEFERRABLE INITIALLY DEFERRED, -- partial workaround: NULL source_booking_id escluso implicitamente da UNIQUE

  -- Idempotenza per familiari: (tenant_id, source_post_id, contribution_kind) per eventi external
  CONSTRAINT uq_contribution_external UNIQUE (tenant_id, source_post_id, contribution_kind)
    DEFERRABLE INITIALLY DEFERRED
);

-- Nota: i vincoli UNIQUE standard in Postgres NON si applicano a righe con NULL in qualsiasi
-- colonna vincolata. Quindi uq_contribution_booking non copre source_booking_id NULL.
-- L'applicazione garantisce l'idempotenza anche per source_booking_id NULL tramite ON CONFLICT.

CREATE INDEX IF NOT EXISTS idx_contribution_tenant       ON commons.contribution_event (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contribution_post         ON commons.contribution_event (source_post_id);
CREATE INDEX IF NOT EXISTS idx_contribution_kind         ON commons.contribution_event (contribution_kind);
CREATE INDEX IF NOT EXISTS idx_contribution_period       ON commons.contribution_event (tenant_id, reporting_period);

COMMENT ON TABLE commons.contribution_event IS
  'B166 — Binario reale KORA Contribution (companion indicator — NON KORA Index). '
  'Una partecipazione cross_company genera due righe: role=promoter + role=origin_employer. '
  'External participants generano una riga role=promoter contribution_kind=external_participants_event. '
  'M025-1/2/3/6 revised 2026-06-24: expanded CHECKs, new source/event/privacy fields. '
  'Gate 2 OPEN: NOT applied to any live database.';

-- ── 5. RLS commons.contribution_event ────────────────────────────────────────

ALTER TABLE commons.contribution_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contribution_event_kora_admin_all" ON commons.contribution_event;
CREATE POLICY "contribution_event_kora_admin_all"
  ON commons.contribution_event FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- COMPANY_ADMIN: solo del proprio tenant (vedono il proprio Contribution, non quello degli altri)
-- kora.tenant_id() = canonical helper (mig 006): reads app_metadata.kora_tenant_id
DROP POLICY IF EXISTS "contribution_event_company_own_select" ON commons.contribution_event;
CREATE POLICY "contribution_event_company_own_select"
  ON commons.contribution_event FOR SELECT
  USING (
    kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = kora.tenant_id()
  );

-- WORKER: nessuna policy — i worker non vedono il Contribution aziendale.
-- La deny-by-default di RLS blocca qualsiasi SELECT da parte dei worker.
-- Il GRANT tabella-livello è in sezione 7 (Grants) per chiarezza.

-- ── 6. Estensione personal.worker_pib — source_booking_id ───────────────────
-- Aggiunge FK a commons.booking per il PIB attribuito da partecipazione cross_company.
-- Idempotenza: (worker_identity_id, source_booking_id, pillar) UNIQUE WHERE source_booking_id IS NOT NULL.

ALTER TABLE personal.worker_pib
  ADD COLUMN IF NOT EXISTS source_booking_id uuid REFERENCES commons.booking (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_pib_booking_pillar
  ON personal.worker_pib (worker_identity_id, source_booking_id, pillar)
  WHERE source_booking_id IS NOT NULL;

COMMENT ON COLUMN personal.worker_pib.source_booking_id IS
  'B166 — FK a commons.booking per PIB derivato da partecipazione cross_company (attended). '
  'Mutual-exclusive con source_uef_record_id e source_participation_id.';

-- ── 7. Grants ─────────────────────────────────────────────────────────────────
-- M025-5: Restrict contribution_event grants.
-- authenticated (company/worker) may only SELECT — enforced by company_own_select RLS policy.
-- All INSERTs and UPDATEs to contribution_event must go through SECURITY DEFINER functions
-- called by service_role (e.g. attribute_contribution_for_booking_atomic in mig 032).
-- This enforces the invariant that contribution signals are not self-reported by tenants.

GRANT SELECT ON commons.contribution_event TO authenticated;
REVOKE INSERT, UPDATE ON commons.contribution_event FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON commons.contribution_event FROM anon;

-- booking: authenticated may INSERT/UPDATE (worker books, KORA_ADMIN moderates).
-- See section 2 for the canonical booking grant — here for explicitness.
-- GRANT SELECT, INSERT, UPDATE ON commons.booking TO authenticated; (already in section 2)

GRANT EXECUTE ON FUNCTION commons.booking_aggregate_for_promoter(uuid) TO authenticated;

-- ── 8. NOTIFY PostgREST ──────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
