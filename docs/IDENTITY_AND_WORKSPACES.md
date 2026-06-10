# KORA — Identity, Roles & Workspaces

**Versione:** 1.0 · B106-B
**Gate status:** Gate 1 CLOSED · Gate 2 OPEN · Gate 3 OPEN

---

## 1. Ruoli

| Ruolo | Codice | Descrizione |
|---|---|---|
| Operatore KORA | `KORA_ADMIN` | Operatore interno KORA. Accesso completo a `/admin/*`. Crea tenant e referenti. |
| Referente aziendale | `COMPANY_ADMIN` | Accesso al workspace del proprio tenant. Tenant-bound. |
| Viewer aziendale | `COMPANY_VIEWER` | Accesso read-only al workspace del proprio tenant. Tenant-bound. |
| Lavoratore | `WORKER` | Accesso al proprio spazio privato `/worker/*`. Tenant-bound e worker-bound. |

---

## 2. App metadata canonici (Supabase)

Tutti i metadati di autorizzazione vivono in `app_metadata` (server-controlled, Admin API only).
**Mai `user_metadata`.**

| Campo | Ruoli | Descrizione |
|---|---|---|
| `kora_role` | Tutti | `KORA_ADMIN` / `COMPANY_ADMIN` / `COMPANY_VIEWER` / `WORKER` |
| `kora_tenant_id` | COMPANY_ADMIN, COMPANY_VIEWER, WORKER | UUID del tenant assegnato |
| `kora_worker_id` | WORKER | UUID dell'identità worker in `personal.worker_identity` |
| `kora_status` | Tutti | `active` / `invited` / `pending` / `disabled` / `suspended` |

---

## 3. Landing path per ruolo

| Ruolo | Landing dopo login/invite |
|---|---|
| `KORA_ADMIN` | `/admin` |
| `COMPANY_ADMIN` | `/company/workspace` |
| `COMPANY_VIEWER` | `/company/workspace` |
| `WORKER` | `/worker/workspace` |

---

## 4. Aree consentite per ruolo

### KORA_ADMIN
- `/admin/*` — area admin completa
- Demo company pages (`/company/*`) — solo per review demo
- **Bloccato da:** `/company/workspace` (richiede sessione COMPANY_ADMIN/VIEWER)

### COMPANY_ADMIN / COMPANY_VIEWER
- `/company/workspace` — workspace live tenant-bound
- `/company/kora-index` — KORA Index live
- `/company/activation` — Activation intelligence live
- `/company/pillars` — Pillar distribution live
- `/company/financial` — Budget-to-Human-Impact live
- `/company/reports` — Decision Pack e report live
- `/company/status` — Status center live
- `/company/login` — pagina login aziendale
- `/company/setup-password` — flusso invite
- `/api/*` — tutte le API (con `requireCompanyUser()`)
- **Bloccato da:** `/admin/*`, `/worker/*`, tutte le altre route `/company/*` → redirect a `/company/workspace`

### WORKER
- `/worker/*` — spazio privato worker
- `/worker/setup-password` — flusso invite worker
- `/company/login` — re-autenticazione
- `/api/*` — API (con `requireWorkerUser()`)
- **Bloccato da:** `/admin/*`, `/company/*` → redirect a `/worker/workspace`

---

## 5. Login pages

| Pagina | Ruolo | Redirect |
|---|---|---|
| `/admin/login` | `KORA_ADMIN` | `/admin` |
| `/company/login` | `COMPANY_ADMIN`, `COMPANY_VIEWER`, `WORKER` | `/company/workspace` o `/worker/workspace` |

`/company/login` gestisce tutti i ruoli non-admin:
- `COMPANY_ADMIN` / `COMPANY_VIEWER` → `/company/workspace`
- `WORKER` → `/worker/workspace`
- `KORA_ADMIN` → signOut + errore (usa `/admin/login`)

---

## 6. Flusso invite

### Company Admin/Viewer
1. KORA_ADMIN invita via `/api/admin/companies/provision`
2. Supabase invia email con magic link
3. Click → `/auth/callback` → code exchange → session con `kora_role = COMPANY_ADMIN`
4. Callback legge `kora_role` → redirect a `/company/setup-password`
5. Form imposta password → redirect a `/company/workspace`
6. Future login: `/company/login` con email/password

### Worker
1. KORA_ADMIN invita via `/api/admin/workers/provision`
2. Supabase invia email con magic link
3. Click → `/auth/callback` → code exchange → session con `kora_role = WORKER`
4. Callback legge `kora_role === 'WORKER'` → redirect a `/worker/setup-password`
5. Form imposta password → redirect a `/worker/workspace`
6. Future login: `/company/login` (gestisce WORKER → `/worker/workspace`)

---

## 7. Tenant binding

Il `tenantId` è SEMPRE derivato dalla sessione autenticata (`app_metadata.kora_tenant_id`).

**Mai:**
- Da query params (`?tenantId=...`)
- Da request body
- Da localStorage / cookie custom
- Hardcoded in componenti

**Enforcement:**
- `requireCompanyUser()` → restituisce `{ tenantId }` solo se valido in `app_metadata` E il tenant è `is_active = true` in `analytics.tenant`
- Tutti gli endpoint `/api/company/*` derivano `tenantId` solo da `authResult.tenantId`
- `assertTenantAccess()` per verifiche cross-tenant aggiuntive

---

## 8. Worker binding

Simile al tenant binding. `workerId` è SEMPRE da `app_metadata.kora_worker_id`.

`requireWorkerUser()` restituisce `{ tenantId, workerId }` — entrambi verificati.

Tutti gli endpoint `/api/worker/*` filtrano per entrambi: `.eq('id', auth.workerId).eq('auth_user_id', auth.id)`.

---

## 9. Demo / Live boundary

### Company workspace (`/company/workspace`)
- **LIVE:** dati reali Supabase, tenant dalla sessione
- Nessun dato Meridiana/sintetico
- Empty state onesto se nessun dato disponibile

### Demo pages (`/company/*` non in allowed list)
- Accessibili solo in demo mode (nessuna sessione reale)
- Banner "SYNTHETIC DEMO — Stai visualizzando dati sintetici di Meridiana Group S.r.l."
- COMPANY_ADMIN con sessione reale NON raggiunge queste pagine (middleware redirect)

### Dual-path pages (kora-index, activation, pillars, financial, reports, status)
- `isLive=true` → dati reali Supabase
- `isLive=false` → dati sintetici Meridiana con label `synthetic_demo_data: true`
- Badge LIVE/DEMO sempre visibile

---

## 10. Come creare una company (checklist KORA_ADMIN)

1. Login → `/admin/login`
2. Vai a `/admin/companies` → Nuova azienda
3. Inserisci nome e tenant_code → crea via `/api/admin/companies/provision`
4. Vai a `/admin/company-users` → Invita referente
5. Inserisci email referente → sistema invia invite Supabase
6. Il referente riceve email → click link → `/auth/callback` → `/company/setup-password`
7. Il referente imposta password → entra in `/company/workspace` con dati del proprio tenant

---

## 11. Cosa vede COMPANY_ADMIN

In `/company/workspace`:
- Nome azienda reale (da `analytics.tenant.company_name`)
- `tenantCode` reale (da `analytics.tenant.tenant_code`)
- KORA Index (se calcolato): valore, Confidence Score, Activation Safeguard, metodologia
- Decision Pack (se disponibile): link diretto con status
- Stato workspace: readiness, batch count, baseline
- Empty state onesto se nessun dato

In `/company/kora-index`, `/company/activation`, etc.:
- Dati live del proprio tenant quando `isLive=true`
- Badge LIVE visibile

**Non vede mai:**
- Dati di altri tenant
- PIB o dati individuali dei worker
- Area admin
- Worker private space

---

## 12. Cosa vede KORA_ADMIN

In `/admin`:
- Tutti i tenant registrati
- Stato di ciascun tenant
- Link a provisioning, data intake, scoring, diagnostics
- Worker provisioning e diagnostics
- Decision Pack per tenant
- **NON** worker private data aggregati per individuo

---

## 13. Cosa vedrà WORKER (Foundation Light)

In `/worker/workspace`:
- Notifica privacy: "Il tuo datore di lavoro non può vedere questi dati individuali"
- Stato identità (status: invited/active/pending)
- Sezioni placeholder "Prossimamente" (Dynamic CV, opportunities, etc.)

**Non vedrà mai:**
- Dati company/admin
- PIB di altri worker
- KORA Index aziendale completo

---

## 14. Invarianti da non rompere

1. **`kora_role` SOLO da `app_metadata`** — mai da `user_metadata`, cookie custom, o client input.
2. **`tenantId` SOLO dalla sessione** — mai da query params o body.
3. **Worker private data mai visibili al datore di lavoro** — nessun employer-facing route accede a dati individuali.
4. **Nessun fallback a Meridiana/OP-001 in live paths** — se nessun dato, empty state onesto.
5. **Demo pages inaccessibili a COMPANY_ADMIN reale** — middleware redirect a `/company/workspace`.
6. **`requireKoraAdmin()`, `requireCompanyUser()`, `requireWorkerUser()`** — in ogni route API della rispettiva area.
7. **PIB mai employer-visible** — nessun route `/company/*` espone PIB individuale.
8. **`kora_status = disabled/suspended` blocca accesso** — verificato in `requireCompanyUser()` e `requireWorkerUser()`.
9. **Tenant `is_active = false` blocca accesso** — verificato in `requireCompanyUser()` via Supabase query.
10. **Auth callback role-aware** — WORKER va a `/worker/setup-password`, non a `/company/setup-password`.
