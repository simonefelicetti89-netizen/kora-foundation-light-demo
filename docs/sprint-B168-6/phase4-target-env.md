# B168.6 Phase 4 — Target Environment

Da compilare PRIMA di eseguire qualsiasi statement SQL.

## Ambiente DB target

- [ ] **Production** (kora.io / Supabase project principale)
- [ ] **Staging** (applicare PRIMA qui, poi replicare in production)
- [ ] **Dev locale** (verifica setup, non sufficiente da solo)

**Ambiente scelto:** ___

**Supabase project URL:** `azdnepfmwrmacruykskm.supabase.co` (trovato in repo — confermare che sia l'ambiente target)

## Canale di esecuzione scelto

- [ ] Supabase Dashboard → SQL Editor (raccomandato: review prima del run, logga le query)
- [ ] psql diretto (`DATABASE_URL` completo)
- [ ] Supabase CLI (`supabase db push`)

**Canale scelto:** ___

## Nota se applichi su staging prima

1. Esegui 027 + 028 su staging
2. Esegui smoke test completo (step 5) su staging
3. Solo se TUTTO passa su staging: replica in production
4. Documenta entrambe le esecuzioni separatamente

## Verifica schema audit (PF.3)

```sql
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name = 'audit';
```

Output: ___

- [ ] Schema `audit` esiste → procedere
- [ ] Schema `audit` assente → premettere `CREATE SCHEMA IF NOT EXISTS audit;` al contenuto di 028

## Timestamp inizio sessione

___
