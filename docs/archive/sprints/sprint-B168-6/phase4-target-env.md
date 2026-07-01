# B168.6 Phase 4 — Target Environment

## Ambiente DB target

- [x] **Production** (kora.io / Supabase project principale)
- [ ] **Staging** (applicare PRIMA qui, poi replicare in production)
- [ ] **Dev locale** (verifica setup, non sufficiente da solo)

**Ambiente scelto:** Production

**Supabase project URL:** `azdnepfmwrmacruykskm.supabase.co`

## Canale di esecuzione scelto

- [x] Supabase Dashboard → SQL Editor
- [ ] psql diretto (`DATABASE_URL` completo)
- [ ] Supabase CLI (`supabase db push`)

**Canale scelto:** Supabase Dashboard → SQL Editor

## Gate 2 — Rationale per applicazione con Gate 2 open

Le migration 027 e 028 sono security hardening (rimozione di policy RLS
eccessivamente permissive + aggiunta colonne di audit). Non creano schema
di produzione, Prisma models, o artefatti bloccati da Gate 2. Sono applicabili
come misura di privacy defense-in-depth indipendente dalla CTO review.

**Decisione:** founder applica con piena consapevolezza del Gate 2 status.
Razionale: B168 Privacy Guard è requirement DPIA, non wait CTO approval.

## Verifica schema audit (PF.3)

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'audit';
```

Output: ___ (compilare dopo esecuzione in SQL Editor)

- [ ] Schema `audit` esiste → procedere
- [ ] Schema `audit` assente → premettere `CREATE SCHEMA IF NOT EXISTS audit;` al contenuto di 028

## Timestamp inizio sessione

___
