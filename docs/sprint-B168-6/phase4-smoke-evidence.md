# B168.6 Phase 4 — Smoke Test Evidence

Da compilare durante/dopo step 5.

## 5.1 — KORA_ADMIN → /worker/[real-worker-id]

- **URL testato**: ___
- **Risultato UI**: ___
- **Atteso**: errore esplicito "Worker individual data is not accessible to KORA service team by design."
- **PASS / FAIL**: ___

Query SQL con JWT admin (layer RLS):
```
[output]
```

## 5.2 — KORA_ADMIN → /company (PrivilegedAccessBanner + audit log)

- **Banner visibile**: [ ] sì  [ ] no
- **Testo banner**: ___

Audit log check:
```sql
SELECT timestamp, actor_role, resource_type, action,
       environment, ip_hash IS NOT NULL as has_ip,
       user_agent_hash IS NOT NULL as has_ua
FROM audit.audit_log
ORDER BY timestamp DESC LIMIT 3;
```

Output:
```
[incolla qui]
```

- **environment popolato**: [ ] sì  [ ] no  — se no: app-layer gap (non un fail migrazione)
- **ip_hash non NULL**: [ ] sì  [ ] no  — se no: app-layer gap (non un fail migrazione)
- **PASS / FAIL**: ___

## 5.3 — WORKER → proprio PIB

- **Login come worker**: ___
- **PIB visibile**: [ ] sì  [ ] no
- **Solo i propri dati**: [ ] sì  [ ] no
- **PASS / FAIL**: ___

## 5.4 — WORKER → PIB altrui (security probe)

Query SQL con JWT del worker:
```sql
SELECT id, worker_ref FROM personal.worker_pib WHERE worker_ref != '[suo-ref]';
```

Output:
```
[incolla qui — deve essere 0 righe]
```

- **0 righe**: [ ] sì  [ ] NO (→ ROLLBACK IMMEDIATO)
- **PASS / FAIL**: ___

## Esito complessivo

- [ ] Tutti i test PASS → procedere con commit P4.5
- [ ] Almeno uno FAIL → STOP, vedere rollback plan step 7
