# B168.6 Phase 4 — Stato DB Pre-Migration

Da compilare con l'output delle query di snapshot prima di eseguire 027.

## Query 1 — Policy attuali su personal.*

```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'personal'
ORDER BY tablename, policyname;
```

Output:

```
[incolla qui]
```

## Query 2 — Colonne audit.audit_log

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'audit' AND table_name = 'audit_log'
ORDER BY ordinal_position;
```

Output:

```
[incolla qui]
```

## Query 3 — Ruoli esistenti

```sql
SELECT rolname FROM pg_roles
WHERE rolname IN ('audit_reader', 'kora_admin', 'authenticated', 'anon')
ORDER BY rolname;
```

Output:

```
[incolla qui]
```

## Query 4 — Grant su audit.audit_log

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'audit' AND table_name = 'audit_log'
ORDER BY grantee, privilege_type;
```

Output:

```
[incolla qui]
```

## Policy kora_admin su analytics.impact_unit (pre-027)

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'analytics' AND tablename = 'impact_unit'
ORDER BY policyname;
```

Output:

```
[incolla qui]
```

---

*Questo file è il riferimento per confronto post-migrazione e per eventuale rollback manuale.*
