# Sprint B168 — Discovery: Privacy Guard Granularization

**Data:** 2026-06-17  
**Fase:** 1 — Read-only discovery  
**Scopo:** Mappare tutti i guard esistenti prima del refactor. Non modifica nulla.

---

## 1. Mappa Guard Attuali

### 1.1 middleware.ts

**File:** `middleware.ts`  
**Matcher:** tutto tranne `_next/static`, `_next/image`, `favicon`, estensioni statiche (righe 207–212).

| Role | Comportamento nel middleware |
|---|---|
| `COMPANY_ADMIN` | Redirect a `/company/workspace` se il path non è in `COMPANY_ALLOWED_PREFIXES` |
| `WORKER` | Redirect a `/worker/workspace` se il path non è in `WORKER_ALLOWED_PREFIXES` |
| `PARTNER` | Redirect a `/partner/workspace` se il path non è in `PARTNER_ALLOWED_PREFIXES` |
| `DEMO_VIEWER` | Redirect a `/demo` se il path non è in `DEMO_VIEWER_ALLOWED_PREFIXES` |
| **`KORA_ADMIN`** | **Nessun vincolo di percorso nel middleware.** KORA_ADMIN può navigare verso qualsiasi route. Il controllo di accesso specifico è nei layout server. |

**Osservazione critica:** Il middleware NON blocca KORA_ADMIN da `/company/*` o `/worker/*`. La protezione esiste solo nei layout server (strati successivi).

---

### 1.2 Guard /company/*

#### `app/company/layout.tsx` (root layout, linee 18–26)

```typescript
const auth = await requireCompanyUser();          // richiede COMPANY_ADMIN
if (isKoraAuthError(auth)) {
  const admin = await getCurrentKoraUser();
  if (admin?.koraRole === 'KORA_ADMIN') {
    redirect('/admin');                            // ← KORA_ADMIN → redirect /admin
  }
  redirect('/login?role_hint=company');            // altri → login
}
```

**Effetto attuale:** KORA_ADMIN che accede a qualsiasi `/company/*` viene **reindirizzato a `/admin`**. Non vede nessun dato company.

#### `app/company/workspace/layout.tsx` (sub-layout workspace, linee 10–56)

```typescript
const authResult = await requireCompanyUser();
if (isKoraAuthError(authResult)) {
  const adminUser = await getCurrentKoraUser();
  isAdmin = adminUser?.koraRole === 'KORA_ADMIN';
  if (isAdmin) {
    return (/* UI block con messaggio esplicativo */);  // ← blocco UI, non redirect
  }
  return (/* UI generic error */);
}
```

**Effetto attuale:** Se KORA_ADMIN raggiunge `/company/workspace` (che viene comunque bloccato dal root layout sopra), vede un blocco UI con messaggio: *"non accessibile con una sessione KORA_ADMIN"* e link alle pagine company in demo.  
**File:linea esatto del blocco:** `app/company/workspace/layout.tsx:21–22`

---

### 1.3 Guard /worker/*

#### `app/worker/layout.tsx` (linee 19–23)

```typescript
const koraAdmin = await getCurrentKoraUser();
if (koraAdmin) {
  redirect('/my-kora');    // ← KORA_ADMIN → redirect /my-kora (synthetic preview)
}
const worker = await getCurrentWorkerUser();
if (!worker) redirect('/login');
```

**Effetto attuale:** KORA_ADMIN che accede a `/worker/*` viene reindirizzato a `/my-kora` (preview sintetica di Foundation Light). **Non è un hard block** — è un redirect verso una pagina demo.

**Gap identificato:** Il commento del layout (B141-B2) dice "KORA_ADMIN is not permitted to see live worker data" ma il comportamento è redirect→my-kora, non errore esplicito che dichiara il blocco per design. Il sprint richiede invece un errore esplicito: *"Worker individual data is not accessible to KORA service team by design."*

---

### 1.4 Guard /admin/*

#### `app/admin/layout.tsx` (linee 14–16)

```typescript
const auth = await requireKoraAdmin();
if (isKoraAuthError(auth)) {
  // 401 → redirect /login?role_hint=admin
  // 403 → UI "Accesso non autorizzato"
}
```

**Effetto attuale:** Solo KORA_ADMIN può accedere a `/admin/*`. Nessun cambiamento richiesto in questo sprint.

---

### 1.5 `lib/auth/kora-session.ts` — Helper di role check

| Funzione | Uso | Nota |
|---|---|---|
| `requireKoraAdmin()` | Admin layout, admin API routes | Role da `app_metadata.kora_role` |
| `requireCompanyUser()` | Company layout, company API routes | Role + tenantId da `app_metadata` |
| `requireWorkerUser()` | Worker API routes | Role + workerId da `app_metadata` |
| `getCurrentKoraUser()` | Company layout (check admin redirect), worker layout | Null-safe, non throw |
| `getCurrentWorkerUser()` | Worker layout | Null-safe |
| `requireDemoAccess()` | Demo pages | Ammette DEMO_VIEWER e KORA_ADMIN |

**Osservazione:** `requireCompanyUser()` blocca KORA_ADMIN con 403 perché controlla `koraRole !== 'COMPANY_ADMIN'`. Non esiste un path che ammetta KORA_ADMIN nella company view con audit. Questo deve essere creato nel sprint.

---

## 2. Localizzazione del blocco specifico richiesto

Il messaggio letterale "per privacy non è possibile accedere con account admin alla sezione company" **non esiste nel codebase**. Il comportamento corrispondente è distribuito su:

| Location | Comportamento | File:linea |
|---|---|---|
| Root layout company | `redirect('/admin')` per KORA_ADMIN | `app/company/layout.tsx:24` |
| Workspace sub-layout | UI block: "non accessibile con una sessione KORA_ADMIN" | `app/company/workspace/layout.tsx:21–39` |
| Worker layout | `redirect('/my-kora')` per KORA_ADMIN | `app/worker/layout.tsx:21–23` |

---

## 3. RLS Migrations — Policies rilevanti

### 3.1 Tabelle company-aggregate (accesso admin)

| Tabella | Policy admin | Comportamento |
|---|---|---|
| `analytics.tenant` | `kora_admin_all_tenants` (FOR ALL) — mig 001:81 | KORA_ADMIN: SELECT/INSERT/UPDATE/DELETE |
| `analytics.source_batch` | `kora_admin_all_batches` (FOR ALL) — mig 001:159 | KORA_ADMIN: SELECT/INSERT/UPDATE/DELETE |
| `analytics.uef_record` | `kora_admin_all_uef` (FOR ALL) — mig 001:240 | KORA_ADMIN: accesso completo |
| `analytics.kora_index_result` | `kora_admin_all_kora_index` (FOR ALL) — mig 001:401 | KORA_ADMIN: accesso completo |
| `analytics.decision_pack_version` | `kora_admin_all_dp` (FOR ALL) — mig 001:443 | KORA_ADMIN: accesso completo |
| `analytics.activation_result` | `kora_admin_all_activation` (FOR ALL) — mig 001:282 | KORA_ADMIN: accesso completo |

**Osservazione:** Nessun `audit_log_insert` per accessi KORA_ADMIN a queste tabelle. L'accesso avviene via API route che usa `getSupabaseServiceClient` (bypass RLS) — gli audit eventi attuali sono scritti esplicitamente dalle route, non via trigger.

---

### 3.2 Tabelle worker-individual (blocco atteso)

| Tabella | Policy admin attuale | Conformità con sprint |
|---|---|---|
| `personal.worker_identity` | `worker_identity_kora_admin_all` (FOR ALL) — mig 007:41 | ❌ Sprint: DENY admin |
| `personal.worker_pib` | `worker_pib_kora_admin_all` (FOR ALL) — mig 018:121 | ❌ Sprint: DENY admin |
| `personal.worker_pseudonym_map` | `worker_pseudonym_map_kora_admin_all` (FOR ALL) — mig 017:55 | ❌ Sprint: DENY admin |
| `analytics.uef_record` (per-worker) | `kora_admin_all_uef` (FOR ALL) — mig 001:240 | ⚠️ Aggregato + individuale stesso policy |
| `personal.worker_profile_private` | `worker_profile_kora_admin_all` (FOR ALL) — mig 007:72 | ❌ Sprint: DENY admin |
| `analytics.impact_unit` | `kora_admin_impact_unit_read/insert` — mig 005:61,65 | ❌ Sprint: DENY admin su individuale |

**Tensione architetturale identificata:** Le policy `kora_admin_all` su `personal.*` esistono per abilitare il provisioning worker (onboarding, setup) e la diagnostica pipeline. Rimuoverle impatta il workflow operativo KORA. Il sprint richiede di sostituirle con policy più granulari o di spostare le operazioni di provisioning su path service-role isolati (come il pattern `auth-admin-update-user.ts` in B163).

---

### 3.3 `personal.worker_pseudonym_map` — Tabella più sensibile

**Stato attuale:** `worker_pseudonym_map_kora_admin_all` (FOR ALL) — mig 017:55  
**Sprint spec:** "DENY tutti tranne system. Zero accessi applicativi."  
**Implicazione:** KORA_ADMIN deve perdere l'accesso diretto. Il provisioning (inserimento del link pseudonym→identity) deve avvenire solo tramite funzioni SECURITY DEFINER dedicate, non via RLS.

---

## 4. Verifica audit_log

**Stato:** La tabella `audit.audit_log` esiste (mig 001:492).

**Schema attuale:**

```sql
id          uuid        PK
tenant_id   uuid        nullable
actor_role  text        NOT NULL
actor_id    text        NOT NULL
action      text        NOT NULL
resource_type text      NOT NULL
resource_id text        nullable
payload     jsonb       NOT NULL DEFAULT '{}'
ip_address  inet        nullable
created_at  timestamptz NOT NULL DEFAULT now()
```

**Delta vs spec Phase 4:**

| Campo richiesto da spec | Stato attuale | Azione necessaria |
|---|---|---|
| `environment` (demo/live/future) | **assente** | Da aggiungere in mig 027 |
| `ip_hash` | `ip_address` raw (inet) | Da sostituire/affiancare con hash |
| `user_agent_hash` | **assente** | Da aggiungere in mig 027 |

**RLS audit_log attuale:**
- SELECT: `kora_admin_read_audit` (mig 001:516) — TUTTI i KORA_ADMIN possono leggere
- INSERT: `kora_admin_insert_audit` (mig 021:88) — KORA_ADMIN può inserire
- INSERT: `audit_log_company_insert` (mig 026:69) — COMPANY_ADMIN può inserire
- Phase 4.4 richiede un sub-role `audit_reader` separato da KORA_ADMIN standard

---

## 5. Sintesi: Cosa cambia nel sprint vs stato attuale

| Aspetto | Stato attuale | Dopo sprint |
|---|---|---|
| KORA_ADMIN → /company/* | Bloccato, redirect /admin | **Ammesso con audit log + banner** |
| KORA_ADMIN → /worker/* | Redirect /my-kora (soft) | **Bloccato hard** con errore esplicito |
| RLS worker_individual per KORA_ADMIN | `kora_admin_all` (full access) | **DENY** → provisioning via service-role isolato |
| RLS pseudonym_map per KORA_ADMIN | `kora_admin_all` | **DENY** → solo funzioni SECURITY DEFINER |
| audit_log schema | Manca environment, ip_hash, user_agent_hash | Aggiornato con mig 027 |
| audit_log RLS reader | Tutti KORA_ADMIN | Solo `audit_reader` sub-role |
| Banner UI in /company per admin | Nessuno | amber (demo) / navy (live) / blueprint (future) |

---

## 6. File da modificare in Fase 3–5

| File | Tipo modifica |
|---|---|
| `middleware.ts` | Refactor: chiama `canAccess()` invece di check hardcoded |
| `app/company/layout.tsx` | Ammette KORA_ADMIN + audit log + banner |
| `app/company/workspace/layout.tsx` | Ammette KORA_ADMIN + audit log + banner (secondo livello) |
| `app/worker/layout.tsx` | Hard block per KORA_ADMIN (messaggio esplicito, non redirect) |
| `lib/auth/kora-session.ts` | Aggiungere helper per company access con audit |
| `lib/auth/access-matrix.ts` | **NUOVO** — matrice e funzione `canAccess()` |
| `lib/audit/log-access.ts` | **NUOVO** — helper audit log non bloccante |
| `supabase/migrations/027_*.sql` | **NUOVO** — schema audit_log aggiornato + RLS worker_individual refactor |
| `components/auth/PrivilegedAccessBanner.tsx` | **NUOVO** — banner amber/navy/blueprint |

---

*Discovery completata. Nessuna modifica al codice in questa fase.*
