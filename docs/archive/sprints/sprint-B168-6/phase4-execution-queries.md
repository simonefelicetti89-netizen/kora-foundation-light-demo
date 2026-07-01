# B168.6 Phase 4 — Query di Esecuzione (copy-paste ready)

Ambiente: **Production** `azdnepfmwrmacruykskm.supabase.co`
Canale: **Supabase Dashboard → SQL Editor**
Data: 2026-06-19

---

## PF.1 — Verifica schema audit (prima di tutto)

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'audit';
```

Atteso: 1 riga. Se 0 righe → aggiungere `CREATE SCHEMA IF NOT EXISTS audit;`
come primo statement dentro 028 (prima dell'ALTER TABLE).

---

## STEP 2 — Snapshot stato attuale (copiare output in phase4-state-before.md)

```sql
-- Policy su personal.*
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'personal'
ORDER BY tablename, policyname;
```

```sql
-- Policy su analytics.impact_unit
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'analytics' AND tablename = 'impact_unit'
ORDER BY policyname;
```

```sql
-- Policy su audit.audit_log (pre-028)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'audit'
ORDER BY tablename, policyname;
```

```sql
-- Colonne audit.audit_log attuali
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'audit' AND table_name = 'audit_log'
ORDER BY ordinal_position;
```

```sql
-- Ruoli rilevanti
SELECT rolname FROM pg_roles
WHERE rolname IN ('audit_reader','kora_admin','authenticated','anon')
ORDER BY rolname;
```

```sql
-- Grant su audit.audit_log
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'audit' AND table_name = 'audit_log'
ORDER BY grantee, privilege_type;
```

---

## STEP 3 — Applica 027 (dentro BEGIN/COMMIT)

```sql
BEGIN;

-- ── personal.worker_identity ────────────────────────────────────────────────
DROP POLICY IF EXISTS worker_identity_kora_admin_all ON personal.worker_identity;

-- ── personal.worker_pib ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS worker_pib_kora_admin_all ON personal.worker_pib;

-- ── personal.worker_pseudonym_map ───────────────────────────────────────────
DROP POLICY IF EXISTS worker_pseudonym_map_kora_admin_all ON personal.worker_pseudonym_map;

-- ── personal.worker_profile_private ─────────────────────────────────────────
DROP POLICY IF EXISTS worker_profile_kora_admin_all ON personal.worker_profile_private;

-- ── analytics.impact_unit — narrowed ────────────────────────────────────────
DROP POLICY IF EXISTS kora_admin_impact_unit_read   ON analytics.impact_unit;
DROP POLICY IF EXISTS kora_admin_impact_unit_insert ON analytics.impact_unit;

-- ── Verifica intermedia PRIMA del COMMIT ────────────────────────────────────

-- Check 1: zero policy kora_admin su personal.* (atteso: 0)
SELECT count(*) AS residual
FROM pg_policies
WHERE schemaname = 'personal'
  AND policyname ILIKE '%kora_admin%';

-- Check 2: policy worker-only presenti su personal.* (atteso: >0)
SELECT count(*) AS worker_policies
FROM pg_policies
WHERE schemaname = 'personal'
  AND tablename IN ('worker_pib','worker_identity',
                    'worker_pseudonym_map','worker_profile_private');

COMMIT;
-- Se check 1 ≠ 0 o check 2 = 0: ROLLBACK invece di COMMIT
```

**Post-COMMIT — ri-esegui i check fuori transazione:**

```sql
SELECT count(*) AS residual_post
FROM pg_policies
WHERE schemaname = 'personal'
  AND policyname ILIKE '%kora_admin%';
-- Atteso: 0

SELECT count(*) AS worker_policies_post
FROM pg_policies
WHERE schemaname = 'personal'
  AND tablename IN ('worker_pib','worker_identity',
                    'worker_pseudonym_map','worker_profile_private');
-- Atteso: >0
```

---

## STEP 4 — Applica 028 (dentro BEGIN/COMMIT)

```sql
BEGIN;

-- ── Aggiungi i campi mancanti ────────────────────────────────────────────────
ALTER TABLE audit.audit_log
  ADD COLUMN IF NOT EXISTS environment      text
    CHECK (environment IN ('demo', 'live', 'future')),
  ADD COLUMN IF NOT EXISTS ip_hash          text,
  ADD COLUMN IF NOT EXISTS user_agent_hash  text;

-- ── Commenti sui nuovi campi ─────────────────────────────────────────────────
COMMENT ON COLUMN audit.audit_log.environment     IS 'Ambiente operativo al momento dell''evento: demo | live | future';
COMMENT ON COLUMN audit.audit_log.ip_hash         IS 'SHA-256(ip_address) — hash one-way per analisi senza conservare IP raw';
COMMENT ON COLUMN audit.audit_log.user_agent_hash IS 'SHA-256(user_agent) — hash one-way per fingerprint senza conservare UA raw';

-- ── Indice su environment ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_log_environment ON audit.audit_log (environment);

-- ── Sub-role audit_reader ────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'audit_reader'
  ) THEN
    CREATE ROLE audit_reader;
  END IF;
END $$;

-- ── Policy SELECT per audit_reader (idempotente via DO $$) ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit'
      AND tablename  = 'audit_log'
      AND policyname = 'audit_reader_select'
  ) THEN
    CREATE POLICY "audit_reader_select" ON audit.audit_log
      FOR SELECT
      USING (pg_has_role(current_user, 'audit_reader', 'USAGE'));
  END IF;
END $$;

-- ── Verifica intermedia PRIMA del COMMIT ────────────────────────────────────

-- Check 1: colonne enrichment presenti (atteso: 3 righe)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'audit'
  AND table_name = 'audit_log'
  AND column_name IN ('environment','ip_hash','user_agent_hash');

-- Check 2: ruolo audit_reader esiste (atteso: 1 riga)
SELECT rolname FROM pg_roles WHERE rolname = 'audit_reader';

-- Check 3: policy audit_reader_select presente (atteso: 1)
SELECT count(*) AS policy_count FROM pg_policies
WHERE schemaname = 'audit'
  AND tablename = 'audit_log'
  AND policyname = 'audit_reader_select';

COMMIT;
-- Se check 1 < 3 o check 2 = 0 o check 3 ≠ 1: ROLLBACK
```

**Post-COMMIT — verifica critica: audit_reader NON auto-grant a kora_admin:**

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'audit'
  AND table_name = 'audit_log'
  AND privilege_type = 'SELECT'
ORDER BY grantee;
-- audit_reader: SELECT presente ✓
-- kora_admin: SELECT ASSENTE ✓
-- Se kora_admin ha SELECT → REVOKE SELECT ON audit.audit_log FROM kora_admin;
```

---

## STEP 5 — Smoke Test: query SQL

### 5.2 — RLS deny su personal.* per KORA_ADMIN (sostituisci [admin-user-id])

```sql
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claim.sub" = '[admin-user-id]';

SELECT count(*) AS pib_count FROM personal.worker_pib;
-- Atteso: 0 (RLS deny)

SELECT count(*) AS pseudonym_count FROM personal.worker_pseudonym_map;
-- Atteso: 0 (RLS deny)

RESET ROLE;
```

### 5.3 — Audit log dopo accesso /company

```sql
SELECT timestamp, actor_role, resource_type, action,
       environment,
       ip_hash IS NOT NULL AS has_ip,
       user_agent_hash IS NOT NULL AS has_ua
FROM audit.audit_log
ORDER BY timestamp DESC LIMIT 5;
-- Atteso: riga con actor_role = 'kora_admin', action = accesso /company
-- environment: dipende da B168.7 deployment
-- ip_hash/user_agent_hash: NULL = app-layer gap, non fail migrazione
```

### 5.4 — Security probe cross-worker (CRITICO — sostituisci [worker-user-id] e [suo-ref])

```sql
SET LOCAL role authenticated;
SET LOCAL "request.jwt.claim.sub" = '[worker-user-id]';

SELECT count(*) AS cross_worker_leak
FROM personal.worker_pib
WHERE worker_ref != '[suo-ref]';
-- ATTESO: 0
-- Se > 0 → ROLLBACK IMMEDIATO + stop sessione

RESET ROLE;
```

---

## Rollback rapido (se necessario)

```sql
-- Ripristina policy kora_admin su personal.* (da phase4-state-before.md)
-- Eseguire solo le policy che esistevano prima di 027 (non aggiungere nuove)

-- Per analytics.impact_unit (se serviva per monitoring):
-- CREATE POLICY kora_admin_impact_unit_read ON analytics.impact_unit
--   FOR SELECT USING (current_setting('request.jwt.claims', true)::json->>'role' = 'kora_admin');

-- Per audit.audit_log (rimozione colonne non necessaria — le ADD COLUMN IF NOT EXISTS sono safe)
-- DROP POLICY IF EXISTS audit_reader_select ON audit.audit_log;
-- DROP ROLE IF EXISTS audit_reader;
```

---

*Documento generato: 2026-06-19 — B168.6 Phase 4 execution support*
