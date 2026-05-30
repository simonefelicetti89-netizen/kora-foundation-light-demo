# KORA — Technical Backlog

Registro dei TODO tecnici differiti, deferred o condizionati a milestone future.
Aggiornato a mano al termine di ogni blocco di lavoro significativo.

---

## TODO-001 — Supabase Generated Types automatici

| Campo | Valore |
|---|---|
| **Stato** | DEFERRED |
| **Priorità** | Medium — non blocker immediato |
| **Aggiunto** | 2026-05-30 |
| **Blocco di riferimento** | Supabase Generated Types Cleanup (commit `a2be6c7`) |

### Motivo del differimento

`SUPABASE_ACCESS_TOKEN` (personal access token Supabase dashboard) non configurato nell'ambiente di sviluppo corrente. Il comando `npx supabase gen types typescript` richiede questo token per interrogare l'API Management di Supabase; non è sostituibile con `SUPABASE_SERVICE_ROLE_KEY`.

### Stato attuale

- **Pragmatic types cleanup: PASS** — `lib/supabase/types.ts` aggiornato al formato `GenericSchema` richiesto da `@supabase/supabase-js` v2 (aggiunto `Views`, `Functions`, `Enums`, `CompositeTypes`, `Relationships`, schema `kora` e `public`).
- **12 `as any` rimossi** — tutti i cast a livello di client Supabase eliminati da `lib/live/`, `app/api/admin/`, `app/api/test/`.
- **1 cast residuo** in `lib/scoring-result/index.ts` sul risultato di una join select complessa (`as unknown as { data: LiveRow | null; ... }`) — non rimuovibile senza inferenza join nativa di Supabase JS.
- `tsc --noEmit` CLEAN, lint 0 errori, build OK, tutti i test verdi.

### Non blocker per

- Auth UI minima
- Operator flow (live)
- Decision Pack read
- Gate 3B (legal/privacy)

### Da riprendere prima di

- Pre-produzione
- Onboarding dei primi dati reali cliente
- Stabilizzazione Auth UI / operator flow completo

### Azione futura

1. Ottenere `SUPABASE_ACCESS_TOKEN` dal dashboard Supabase (Profile → Access Tokens).
2. Aggiungere a `.env.local` (non committare).
3. Eseguire:
   ```bash
   npx supabase gen types typescript \
     --project-id <project-ref> \
     --schema analytics,personal,gov,audit,kora,public \
     > lib/supabase/types.generated.ts
   ```
4. Confrontare `types.generated.ts` con `lib/supabase/types.ts`.
5. Valutare sostituzione diretta o allineamento incrementale.
6. Verificare che i tipi generati includano tutti gli schemi custom.
7. Rimuovere il cast residuo su join select se Supabase JS ha migliorato il type narrowing.
8. Aggiornare questo TODO a DONE.

---

---

## TODO-002 — Rimozione fallback `x-kora-operator-secret` da operator-flow

| Campo | Valore |
|---|---|
| **Stato** | DEFERRED — mandatory before production |
| **Priorità** | High — shared secret fallback non è acceptable in produzione |
| **Aggiunto** | 2026-05-30 |
| **Blocco di riferimento** | Auth UI Minima — KORA Admin Login (commit post-auth-ui) |

### Motivo del differimento

La route `/api/admin/operator-flow` supporta temporaneamente `x-kora-operator-secret` come fallback dev-only per compatibilità con i flussi di test che esistevano prima dell'auth UI. Il fallback è marcato DEPRECATED e bloccato in production (`NODE_ENV === 'production'` → fallback ignorato), ma deve essere rimosso completamente prima del deploy in produzione.

### Stato attuale

- **Auth primaria: sessione KORA_ADMIN** — `requireKoraAdmin()` via cookie o Authorization header.
- **Fallback DEPRECATED**: `x-kora-operator-secret` — consentito solo in `NODE_ENV !== 'production'`.
- **In production**: il secret non autorizza nulla — qualsiasi richiesta senza sessione KORA_ADMIN riceve 401/403.

### Non blocker per

- Auth UI stabilization
- Operator flow con sessione reale
- Gate 3B (legal/privacy)

### Trigger per rimozione

Auth UI KORA_ADMIN stabile: login, sessione persistente, logout funzionante in ambiente reale.

### Azione futura

1. Verificare che tutti i caller di `/api/admin/operator-flow` usino sessione KORA_ADMIN.
2. Rimuovere la funzione `checkAuth()` e sostituirla con chiamata diretta a `requireKoraAdmin()`.
3. Rimuovere `KORA_OPERATOR_SECRET` da `.env.local` e da qualsiasi CI/CD env.
4. Aggiornare questo TODO a DONE.
5. Aggiornare `docs/test-routes-removal-before-production.md`.

---

---

## TODO-003 — Gate 3B Privacy Readiness Pack

| Campo | Valore |
|---|---|
| **Stato** | DEFERRED — mandatory before real data |
| **Priorità** | Bloccante per qualunque dato reale cliente |
| **Aggiunto** | 2026-05-30 |
| **Documento di riferimento** | `docs/gate-3b-privacy-readiness-pack.md` |

### Nota chiave: distinzione enforce-by-code vs enforce-by-contract

KORA garantisce tecnicamente (enforce-by-code):
- N≥10 privacy threshold su segmenti employer-visible
- nessun accesso employer a `personal.uploaded_record`
- isolamento tenant via RLS + claims JWT
- accesso operator solo con sessione KORA_ADMIN
- audit log scritto da ogni step dell'operator flow
- production guard su tutte le route test (`NODE_ENV === 'production' → 404`)
- operator flow accessibile solo con sessione KORA_ADMIN verificata server-side

**Non** garantisce tecnicamente (enforce-by-contract/process):
- pseudonimizzazione all'origine (avviene prima dell'upload, fuori da KORA)
- divieto upload PII (policy contrattuale, non validazione tecnica completa)
- retention e cancellazione (non automatizzate)
- DPA / nomina responsabile / istruzioni del titolare (documenti legali)
- gestione file sorgenti del cliente

### Reminder tecnici specifici

- **Right-to-erasure / hard delete**: `analytics.tenant` ha `deleted_at` (soft-delete) e cascade FK, ma il hard delete di `personal.uploaded_record` per singolo pseudonym non è ancora automatizzato. Processo manuale oggi.
- **Audit explorer**: audit log scritto e accessibile a KORA_ADMIN via query diretta e console (ultimi 10 eventi). Non esiste ancora un audit explorer completo con filtri, export, ricerca per range di date.

### Non blocker per

- Demo Foundation Light
- Operator flow sintetico
- Auth UI KORA_ADMIN

### Bloccante per

- Qualunque onboarding di dati reali di aziende o lavoratori
- Gate 3 operativo (legal/privacy)

### Azione richiesta

Vedere checklist completa in `docs/gate-3b-privacy-readiness-pack.md`.

---

*Nuovi TODO vanno aggiunti in coda con numerazione progressiva (TODO-004, TODO-005, ...).*
