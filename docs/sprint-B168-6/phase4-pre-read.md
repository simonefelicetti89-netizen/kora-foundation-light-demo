# B168.6 Phase 4 — Pre-Read: Analisi 027 + 028

Generato da: analisi statica codebase + lettura integrale migration files.
Data: 2026-06-17

---

## FLAG CRITICO — GATE 2

Entrambi i file di migrazione contengono il commento:

```
-- Gate 2 OPEN — NON applicare a nessun DB (production o staging) prima della chiusura di Gate 2 (CTO review).
```

Questo è stato scritto dal design originale (B168 Privacy Guard). Se stai procedendo
con l'applicazione, **conferma esplicita che stai consapevolmente applicando queste
migrazioni con Gate 2 open**, e annota il razionale qui prima di procedere.

Razionale: _[da completare manualmente prima di eseguire]_

---

## 027 — worker_individual_rls_refactor

### Tabelle toccate

| Tabella | Operazione | Policy rimossa |
|---|---|---|
| `personal.worker_identity` | DROP POLICY IF EXISTS | `worker_identity_kora_admin_all` |
| `personal.worker_pib` | DROP POLICY IF EXISTS | `worker_pib_kora_admin_all` |
| `personal.worker_pseudonym_map` | DROP POLICY IF EXISTS | `worker_pseudonym_map_kora_admin_all` |
| `personal.worker_profile_private` | DROP POLICY IF EXISTS | `worker_profile_kora_admin_all` |
| `analytics.impact_unit` | DROP POLICY IF EXISTS | `kora_admin_impact_unit_read` |
| `analytics.impact_unit` | DROP POLICY IF EXISTS | `kora_admin_impact_unit_insert` |

### Tabella NON toccata (intenzionale)

`analytics.uef_record` — la policy `kora_admin_all_uef` non viene rimossa.
La migrazione annota: "tensione architetturale — copre sia UEF individuali (da
restringere) sia pipeline monitoring (necessario per KORA_ADMIN). Separazione
richiede SECURITY DEFINER views — da fare in migrazione successiva."

### Idempotenza

Tutti DROP POLICY IF EXISTS — **completamente idempotente** ✓

### BLOCCO CRITICO: provisioning worker si rompe

`app/api/admin/workers/provision/route.ts` linea 89:

```typescript
const { data: wiRow, error: wiErr } = await db.schema('personal').from('worker_identity')
  .insert({ tenant_id, auth_user_id, worker_ref, status: 'invited' })
```

`db` è il client RLS-context (auth normale). Dopo 027 rimuove
`worker_identity_kora_admin_all`, questo INSERT fallirà con RLS violation.

La migrazione stessa lo riconosce:
> "le operazioni di provisioning worker che usavano RLS admin devono transitare
> al path service-role isolato: lib/supabase/worker-provisioning-service-key.ts
> **(da creare)**"

**`worker-provisioning-service-key.ts` NON ESISTE nel repo.** Il pattern
identico a `storage-service-key.ts` va creato prima di applicare 027, oppure
accetti che il provisioning worker sia temporaneamente bloccato.

### BLOCCO CRITICO: impact-units route si rompe

`app/api/admin/impact-units/route.ts` righe 110 e 134 fanno SELECT su
`analytics.impact_unit` come KORA_ADMIN. Dopo 027 rimuove
`kora_admin_impact_unit_read`, questi query restituiranno 0 righe (RLS deny
silenzioso) — non un errore esplicito, ma una route che risponde vuota.

Ruote effettuate impacted:
- `GET /api/admin/impact-units` — risponderà vuoto

### Riassunto effetti applicativi post-027

| Route | Effetto |
|---|---|
| `POST /api/admin/workers/provision` | **ROMPE** — INSERT worker_identity → RLS deny |
| `GET /api/admin/impact-units` | **Svuota** — SELECT impact_unit → RLS deny silenzioso |
| `GET /api/admin/workers/list` | Da verificare: usa worker_identity? |
| `GET /api/admin/worker-diagnostics` | Da verificare: usa personal.*? |
| Tutto il resto | Non cambia (uef_record non toccato) |

**Decisione obbligatoria prima di applicare:**
Accetti il blocco temporaneo provisioning + impact-units oppure crei prima
`worker-provisioning-service-key.ts` e aggiorna la route?

---

## 028 — audit_log_enrichment

### Cosa aggiunge

| Operazione | Idempotente |
|---|---|
| `ALTER TABLE audit.audit_log ADD COLUMN IF NOT EXISTS environment text CHECK (IN 'demo','live','future')` | ✓ |
| `ALTER TABLE audit.audit_log ADD COLUMN IF NOT EXISTS ip_hash text` | ✓ |
| `ALTER TABLE audit.audit_log ADD COLUMN IF NOT EXISTS user_agent_hash text` | ✓ |
| `COMMENT ON COLUMN` × 3 | ✓ |
| `CREATE INDEX IF NOT EXISTS idx_audit_log_environment` | ✓ |
| `DO $$ IF NOT EXISTS CREATE ROLE audit_reader END IF $$` | ✓ |
| `CREATE POLICY "audit_reader_select" ON audit.audit_log` | **NON IDEMPOTENTE** |

### NON idempotente: CREATE POLICY

```sql
CREATE POLICY "audit_reader_select" ON audit.audit_log
  FOR SELECT
  USING (pg_has_role(current_user, 'audit_reader', 'USAGE'));
```

Nessuna guardia `IF NOT EXISTS`. Se eseguita una seconda volta: errore
`policy "audit_reader_select" already exists for table "audit_log"`.

Il BEGIN/COMMIT protegge da applicazione parziale, ma non da una seconda
esecuzione. Prima di applicare, verificare se la policy esiste già:

```sql
SELECT policyname FROM pg_policies
WHERE schemaname = 'audit' AND tablename = 'audit_log' AND policyname = 'audit_reader_select';
```

### Coesistenza con policy esistente

028 non rimuove la policy `kora_admin_read_audit` (da mig 001). Le due
coesistono: KORA_ADMIN può ancora leggere audit log, E audit_reader può
farlo. La rimozione di `kora_admin_read_audit` è esplicita future work — da
fare quando audit_reader è provisionato agli operatori che ne hanno bisogno.

### No GRANT automatico

028 crea il ruolo `audit_reader` ma non lo assegna a nessuno. Per assegnarlo:

```sql
GRANT audit_reader TO <username>;
```

Da fare manualmente dopo la migrazione.

### Gap applicativo: ip_hash/user_agent_hash non scritti da quasi nessuna route

Dopo analisi codebase: quasi nessuna route scrive ip_hash o user_agent_hash.
Solo `app/api/admin/decision-pack/pdf/route.ts` fa riferimento a
`environment`. Tutte le altre route `logAudit()` non passano i nuovi campi.

**Conseguenza smoke test**: step 5.2 (verifica audit_log con ip_hash non NULL)
vedrà NULL perché il logger applicativo non popola ancora quei campi. Questo
**non è un fallimento della migrazione** — è un gap applicativo separato.
La migrazione aggiunge le colonne, ma le route devono essere aggiornate per
scriverci.

---

## Riepilogo statement non idempotenti (028)

```sql
-- SOLO QUESTO è non idempotente in entrambe le migrazioni:
CREATE POLICY "audit_reader_select" ON audit.audit_log ...
```

Tutti gli altri statement in 027 e 028 sono idempotenti.

---

## Checklist pre-esecuzione

- [ ] Conferma Gate 2 decision documentata sopra
- [ ] Backup eseguito e verificato (step 1 sprint spec)
- [ ] Decisione su provisioning route: blocco temporaneo accettato OPPURE
      `worker-provisioning-service-key.ts` creato prima di 027
- [ ] Verificato che `audit_reader_select` policy non esiste già
- [ ] Snapshot stato attuale eseguito (step 2 sprint spec)

---

## Query di pre-verifica (eseguire in SQL Editor PRIMA delle migrazioni)

```sql
-- 1. Policy admin attuali su tabelle personal.*
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'personal'
  AND policyname ILIKE '%kora_admin%'
ORDER BY tablename, policyname;

-- 2. Policy kora_admin su analytics.impact_unit
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'analytics' AND tablename = 'impact_unit'
ORDER BY policyname;

-- 3. Colonne attuali audit.audit_log
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'audit' AND table_name = 'audit_log'
ORDER BY ordinal_position;

-- 4. audit_reader_select policy già esiste?
SELECT policyname FROM pg_policies
WHERE schemaname = 'audit' AND tablename = 'audit_log'
  AND policyname = 'audit_reader_select';
-- Deve restituire 0 righe. Se 1 riga: 028 non idempotente su quella policy.

-- 5. Ruolo audit_reader già esiste?
SELECT rolname FROM pg_roles WHERE rolname = 'audit_reader';
-- 0 righe = non esiste (028 lo crea). 1 riga = già esiste (DO block gestisce OK).
```
