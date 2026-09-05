-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 024: Commons post — campi iniziativa partecipabile
-- Migration:   024_commons_initiative_fields
-- Created:     2026-06-16
-- Block:       B165 — KORA Space iniziative con gradi di apertura e mappa
-- Gate:        PRIOR HISTORY (as originally written, preserved verbatim):
--              "Gate 2 OPEN — written, NOT applied to any remote/production DB
--              (applied to local/CI ephemeral Postgres via the tracked
--              migration ledger and the mandatory DB-backed CI gate)."
--              CORRECTED (CC-022 Staging Reconciliation, 2026-09-06): this was
--              stale on two counts. (1) Gate 2 closed WITH CONDITIONS on
--              2026-06-22 (see docs/GATE2_STATUS.md) — the conditions concern
--              migration 027, not 024. (2) This migration WAS applied to the
--              staging remote (`haqflkurpmeaxpikozjl`) on 2026-06-21 (see
--              docs/archive/gate2/GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md
--              §1) and reconfirmed applied via a fresh `supabase migration
--              list --linked` read-only check on 2026-09-06. Production
--              remains untouched — applying there still requires Gate 3 and
--              Gate 5 to close first. See lib/architecture/registry.ts
--              svc.commons and tests/unit/cc022-btruth-closure.test.ts.
--              Applicabile insieme a 013 (commons.post) al pilot.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Estende commons.post per ospitare iniziative pubblicabili con tre gradi di
-- apertura, geolocalizzazione OSM/Nominatim (server-side), capienze, e
-- predisposizione per partecipazione esterna (familiari self-reported e
-- fornitori Value Chain future-vision).
--
-- RETROCOMPATIBILITÀ
-- ───────────────────
-- Tutte le nuove colonne sono NULLABLE. opening_grade NULL = post generico
-- senza configurazione iniziativa. I post esistenti continuano a funzionare.
--
-- TRE GRADI DI APERTURA (opening_grade)
-- ──────────────────────────────────────
--   'company_internal':  solo lavoratori dell'azienda promotrice
--   'company_extended':  lavoratori + familiari/comunità stessa azienda
--                        (self-reported, alimenta KORA Contribution con peso ridotto)
--   'cross_company':     aperta a lavoratori di altre aziende KORA
--                        (cross-tenant visibility, anonimato lavoratore — Prompt 2)
--
-- GEOLOCALIZZAZIONE
-- ─────────────────
--   location_address: testo libero fornito dall'azienda
--   location_lat/lng: geocoded server-side via Nominatim al momento della publish.
--                     Il client NON chiama mai Nominatim (fair-use + privacy).
--                     Null finché non geocodificato.
--
-- PREDISPOSIZIONE VALUE CHAIN (fornitori)
-- ────────────────────────────────────────
--   value_chain_supplier_count: colonna PREDISPOSTA per il futuro modulo
--   KORA Value Chain. DEFAULT 0. ZERO logica attiva in Foundation Light.
--   Schema ready, logica off.
--
-- ANONIMATO CROSS-COMPANY
-- ────────────────────────
--   Le prenotazioni cross_company (Prompt 2) avranno RLS separata su
--   commons.booking. Questo schema NON contiene campi che leghino post
--   a worker identificabili. Il campo contribution_impact_weight è un
--   moltiplicatore aggregato, NON un dato individuale.
--
-- RLS WORKER CROSS-COMPANY
-- ─────────────────────────
--   Nuova policy worker_cross_company_select: per opening_grade='cross_company'
--   il WORKER può vedere post di tenant DIVERSO dal proprio.
--   Garantita a livello di schema, non solo applicativo.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Nuove colonne ─────────────────────────────────────────────────────────

-- Grado di apertura: NULL = post generico (retrocompatibile), NOT NULL = iniziativa
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS opening_grade text NULL
    CONSTRAINT post_opening_grade_check
    CHECK (opening_grade IN ('company_internal', 'company_extended', 'cross_company'));

-- Geolocalizzazione: indirizzo libero + coordinate geocoded server-side
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS location_address text NULL;

ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS location_lat numeric(9,6) NULL;

ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS location_lng numeric(9,6) NULL;

-- Datetime evento
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS event_start_at timestamptz NULL;

ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS event_end_at timestamptz NULL;

-- Capienze
-- capacity_internal: posti per lavoratori dell'azienda promotrice
-- capacity_cross:    posti per lavoratori cross-azienda (solo cross_company)
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS capacity_internal int NULL;

ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS capacity_cross int NULL;

-- Partecipanti esterni self-reported (familiari/comunità — company_extended)
-- Alimenta KORA Contribution con peso ridotto (pattern B161 Nodo A).
-- evidence type: 'self_declared' (default) o 'verified' (se documentato)
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS external_participants_count int NULL DEFAULT 0;

ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS external_participants_evidence text NULL DEFAULT 'self_declared'
    CONSTRAINT post_ext_evidence_check
    CHECK (external_participants_evidence IN ('self_declared', 'verified'));

-- Predisposizione Value Chain fornitori — ZERO logica attiva in Foundation Light.
-- Schema ready per il modulo KORA Value Chain (future-vision).
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS value_chain_supplier_count int NULL DEFAULT 0;

-- Moltiplicatore Contribution (calcolato dal trigger nel Prompt 2)
ALTER TABLE commons.post
  ADD COLUMN IF NOT EXISTS contribution_impact_weight numeric(5,3) NULL;

-- ── 2. CHECK: cross_company richiede capacity_cross ──────────────────────────
-- Quando opening_grade='cross_company', capacity_cross deve essere NOT NULL
-- (non si può aprire un'iniziativa cross-azienda senza definire la capienza).

ALTER TABLE commons.post
  ADD CONSTRAINT post_cross_company_capacity_required
  CHECK (
    opening_grade IS NULL
    OR opening_grade != 'cross_company'
    OR capacity_cross IS NOT NULL
  );

-- ── 3. Indice geografico — query "iniziative entro N km" ─────────────────────
-- BRIN su (lat, lng): efficiente per dati con correlazione spaziale naturale
-- (non richiede PostGIS). Per query "box" in SQL semplice.

CREATE INDEX IF NOT EXISTS idx_commons_post_geo
  ON commons.post (location_lat, location_lng)
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Indice su opening_grade per filtri iniziativa (opzionale, selettivo)
CREATE INDEX IF NOT EXISTS idx_commons_post_opening_grade
  ON commons.post (opening_grade, status)
  WHERE opening_grade IS NOT NULL;

-- ── 4. RLS — nuova policy per cross-company worker ───────────────────────────
-- Le policy esistenti (013) NON vengono toccate — idempotenza via DROP IF EXISTS.
-- La nuova policy aggiuntiva gestisce la visibilità cross-tenant.

-- WORKER: può vedere published cross_company di QUALSIASI tenant
-- Questo è il punto chiave: apertura cross-tenant garantita da schema, non da codice.
-- Si aggiunge alla policy esistente "commons_post_worker_published_select" (mig 013).
-- Le due policy si combinano con OR implicito (Supabase: PERMISSIVE per default).

DROP POLICY IF EXISTS "commons_post_worker_cross_company_select" ON commons.post;

CREATE POLICY "commons_post_worker_cross_company_select"
  ON commons.post
  FOR SELECT
  USING (
    kora.kora_role() = 'WORKER'
    AND status = 'published'
    AND opening_grade = 'cross_company'
  );

-- ── 5. Commenti sulle nuove colonne ──────────────────────────────────────────

COMMENT ON COLUMN commons.post.opening_grade IS
  'NULL = post generico. company_internal | company_extended | cross_company. '
  'cross_company richiede capacity_cross NOT NULL (CHECK constraint).';

COMMENT ON COLUMN commons.post.location_lat IS
  'Geocoded server-side via Nominatim. MAI geocoding lato client (fair-use + privacy).';

COMMENT ON COLUMN commons.post.value_chain_supplier_count IS
  'PREDISPOSIZIONE KORA Value Chain — zero logica attiva in Foundation Light. '
  'Schema ready per il futuro modulo fornitori.';

COMMENT ON COLUMN commons.post.contribution_impact_weight IS
  'Moltiplicatore Contribution. Calcolato dal trigger nel Prompt 2 (B166). '
  'NULL = non ancora calcolato.';

-- ── 6. PostgREST reload ───────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
