# KORA_ADMIN app_metadata — Result (QA-04B)

**Data:** 2026-07-01
**Branch:** `qa/set-kora-admin-app-metadata`
**Base:** `main` @ `be41898` (QA-04 merged, PR #13)
**Tipo:** Write operativa singola (Supabase Auth Admin API, staging only) — eseguita dopo conferma esplicita `YES_SET_KORA_ADMIN_APP_METADATA`. Nessun SQL, nessuna migration, nessun codice runtime toccato.

---

## Account target

| Campo | Valore |
|---|---|
| Email | `kora-admin@staging.kora.internal` |
| Account esiste | **Sì** — creato manualmente da Dashboard (QA-04) |
| Email confirmed | **Sì** — `2026-07-01T16:35:37Z` |

---

## Stato app_metadata — prima

`app_metadata` conteneva solo i campi gestiti automaticamente da Supabase (nessun claim KORA):

```json
{ "provider": "email", "providers": ["email"] }
```

`kora_role`: **assente**.

**Conferma:** l'interfaccia Supabase Dashboard non espone un editor diretto per `app_metadata` per questo progetto/versione — coerente con quanto riportato nella richiesta. Da qui la necessità di usare l'Auth Admin API.

---

## Metodo usato

**Supabase Auth Admin API — `PUT /auth/v1/admin/users/{id}` (equivalente a `updateUserById`).** Nessun SQL. Nessuna migration. Nessuna modifica a tabelle `personal.*`/`analytics.*`/`network.*`. Nessuna modifica a `034/035/036`. Nessuna modifica a codice runtime dell'applicazione.

Payload inviato:

```json
{ "app_metadata": { "kora_role": "KORA_ADMIN" } }
```

Solo il claim `kora_role` è stato inviato — non `provider`/`providers` (già presenti), non `password`, non `user_metadata`, non `kora_tenant_id`, non `kora_worker_id`. L'Auth Admin API di Supabase esegue un **merge** su `app_metadata` (non una sostituzione completa) — comportamento confermato empiricamente dal risultato post-update.

---

## Stato app_metadata — dopo (verificato con una rilettura indipendente, non solo dalla risposta della write)

```json
{ "kora_role": "KORA_ADMIN", "provider": "email", "providers": ["email"] }
```

- `kora_role`: **`"KORA_ADMIN"`** — impostato correttamente
- `provider` / `providers`: **preservati**, non sovrascritti
- `password`: non toccata, non letta, non stampata in nessun momento
- `user_metadata`: non toccato
- `kora_tenant_id` / `kora_worker_id`: non impostati (corretto — non richiesti per KORA_ADMIN)

---

## Verifica browser (Fase 4)

**Non eseguita da Claude.** L'account è stato creato manualmente in Dashboard con una password impostata direttamente dall'operatore (QA-04) — Claude non conosce e non può conoscere quella password, quindi non può eseguire un login reale senza violare la regola "non stampare/richiedere password".

**Verifica browser resta manuale**, da eseguire dall'operatore che detiene la password:

1. Login su `/login?role_hint=admin` con `kora-admin@staging.kora.internal`.
2. Verificare redirect a `/admin`.
3. Verificare `SessionBar` in cima alla pagina: email corretta + badge "KORA Admin".
4. Aprire `/admin/kora-link` → atteso status 200, Control Tower carica.
5. Aprire `/admin/kora-link-lab` → atteso status 200, Lab carica.

Checklist dettagliata già disponibile in `docs/KORA_ADMIN_STAGING_ACCESS_RUNBOOK.md §14`.

---

## Sicurezza

- Nessuna password letta, generata, modificata o stampata in questo step.
- Nessun token stampato — solo l'esito booleano/JSON di `app_metadata` (non sensibile: contiene solo un nome di ruolo e provider auth).
- Nessuna credenziale committata in questo repo.
- Nessun file `.env` toccato.
- Nessun SQL applicato, nessuna migration creata.
- `034/035/036` non modificati.
- Nessun codice runtime dell'applicazione modificato — operazione interamente lato Supabase Auth Admin API, eseguita manualmente in questa sessione con chiave già presente in `.env.local` (mai stampata).
- Nessuna modifica a produzione — confermato stesso progetto Supabase già usato per `company-admin`/`worker-a/b/c` (staging).

---

## Cosa resta da fare

1. **Verifica browser manuale** (§ sopra) — richiede la password, nota solo all'operatore.
2. Una volta confermato l'accesso, eseguire il test plan NFC (`docs/KORA_LINK_STAGING_READINESS_QA.md §6`), a partire dallo step 2 (apertura `/admin/kora-link-lab`).
3. Provisioning PARTNER (`docs/KORA_LINK_STAGING_QA_ACCESS_RUNBOOK.md §7`) — ora sbloccabile in linea di principio, poiché una sessione KORA_ADMIN valida esiste (previa verifica browser).
4. Gate 2 (CTO review 034/035/036) e Gate 3 (DPO/legal) restano aperti, indipendenti da questo step.
