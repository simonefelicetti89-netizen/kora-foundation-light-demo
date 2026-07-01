# KORA_ADMIN Staging Access Runbook (QA-03)

**Data:** 2026-07-01
**Branch:** `qa/kora-admin-staging-access`
**Base:** `main` @ `53f3832` (QA-02 merged, PR #11)
**Tipo:** Audit + runbook operativo — nessun account creato, nessun write su Supabase, nessuna credenziale generata o stampata in questo step.

---

## 1. Executive Summary

Nessun account `KORA_ADMIN` esiste oggi in staging. È il primo blocker da rimuovere: sblocca `/admin/kora-link`, `/admin/kora-link-lab`, la generazione di URL demo NFC, e — a catena — il provisioning PARTNER (che richiede una sessione KORA_ADMIN per essere invocato). Questo documento definisce claim richieste, un profilo account staging proposto (senza password reale), e due procedure alternative di provisioning (Supabase Dashboard e Auth Admin API), entrambe **non eseguite** in questo step. Nessuna scrittura su Supabase è stata effettuata. Se si desidera procedere con il provisioning reale, serve una conferma esplicita separata da questo step, come da regola del task.

---

## 2. Why KORA_ADMIN Is Needed

| Capacità sbloccata | Dipendenza |
|---|---|
| QA browser reale di `/admin/kora-link` (Control Tower) | Richiede `requireKoraAdmin()` |
| QA browser reale di `/admin/kora-link-lab` (generazione URL demo) | Richiede `requireKoraAdmin()` |
| Generazione URL demo per test fisico NFC | Il Lab è raggiungibile solo da KORA_ADMIN |
| Provisioning PARTNER via `/api/admin/partners/[id]/invite-user` | L'API stessa richiede `requireKoraAdmin(request)` |
| Verifica stato worker via `/api/admin/workers/list` | Richiede `requireKoraAdmin(request)` |

---

## 3. Required Claims

Verificato in `lib/auth/kora-session.ts`, funzione `requireKoraAdmin()`:

```ts
const koraRole = appMeta?.kora_role as string | undefined;
if (koraRole !== 'KORA_ADMIN') { /* 403 */ }
```

| Claim | Richiesta | Note |
|---|---|---|
| `kora_role` | ✅ **Sì** — deve essere esattamente la stringa `'KORA_ADMIN'` | Unica claim controllata da `requireKoraAdmin()` |
| `kora_tenant_id` | ❌ No | KORA_ADMIN non è scoped a un tenant |
| `kora_worker_id` | ❌ No | Non applicabile al ruolo admin |
| `kora_status` | ❌ No | Non letto da `requireKoraAdmin()` (a differenza di COMPANY_ADMIN/WORKER) |

Tutte le claim vivono **esclusivamente** in `app_metadata` (mai `user_metadata`, scrivibile lato client) — coerente con `docs/ACCESS_PROVISIONING_DOCTRINE.md`.

**Login route:** `/login?role_hint=admin`
**Redirect atteso post-login:** `/admin` (`lib/auth/role-home.ts` → `getRoleHome('KORA_ADMIN')` restituisce `/admin`)
**Route da verificare dopo login:** `/admin`, `/admin/kora-link`, `/admin/kora-link-lab`

**Provisioning API applicativa:** **Non esiste.** `docs/ACCESS_PROVISIONING_DOCTRINE.md` dichiara esplicitamente KORA_ADMIN come "Manual / Supabase Dashboard" — a differenza di COMPANY_ADMIN (`/api/admin/companies/provision`) e WORKER (`/api/admin/workers/provision`), non c'è un endpoint applicativo self-service (ragione strutturale: chi altro potrebbe chiamare un'API che richiede già una sessione KORA_ADMIN per creare il primo KORA_ADMIN?). Confermato: nessuna route `app/api/admin/provision/*` esiste nel repo.

---

## 4. Recommended Staging Account

Profilo proposto, coerente con la convenzione di naming già in uso (`company-admin@staging.kora.internal`, `worker-a@staging.kora.internal`):

| Campo | Valore proposto |
|---|---|
| Email | `kora-admin@staging.kora.internal` |
| Ruolo | `KORA_ADMIN` |
| `kora_tenant_id` | `null` (non impostare — non richiesto) |
| `kora_worker_id` | `null` (non impostare — non richiesto) |
| `kora_status` | Non impostare (non letto per questo ruolo) |
| Password | **Non generata qui.** Da impostare da chi esegue il provisioning, tramite Supabase Dashboard, mai in questa sessione/chat/repo |

**Nessuna password è stata creata, generata o suggerita in questo documento.**

---

## 5. Supabase Dashboard Procedure (raccomandata)

Da eseguire da un operatore con accesso al progetto Supabase di staging — **non eseguita in QA-03**:

1. Supabase Dashboard → Authentication → Users → **Add user** (o **Invite user** se si preferisce il flusso email).
2. Email: `kora-admin@staging.kora.internal` (o valore concordato).
3. Se "Add user" diretto: impostare una password scelta dall'operatore, mai condivisa in chat/chat-log/repo.
4. Aprire l'utente creato → **Raw App Meta Data** (o equivalente sezione `app_metadata` nella UI) → impostare:
   ```json
   { "kora_role": "KORA_ADMIN" }
   ```
5. Salvare.
6. Comunicare la password all'operatore che eseguirà la QA tramite un canale sicuro **fuori da questa sessione** (password manager condiviso, canale cifrato) — mai in testo semplice in chat, issue, PR o commit.

---

## 6. Supabase Auth Admin API Procedure (alternativa documentata)

Solo come alternativa se il Dashboard non è praticabile (es. automazione). Comandi da eseguire da un operatore con accesso al `service_role` key di staging — **non eseguiti in QA-03**, il valore del `service_role` key non è mai stato letto né stampato in questa sessione.

```
POST {SUPABASE_URL}/auth/v1/admin/users
apikey: <service_role_key>
Authorization: Bearer <service_role_key>
Content-Type: application/json

{ "email": "kora-admin@staging.kora.internal", "email_confirm": true }
```

Poi, con l'`id` utente restituito:

```
PUT {SUPABASE_URL}/auth/v1/admin/users/{user_id}
apikey: <service_role_key>
Authorization: Bearer <service_role_key>
Content-Type: application/json

{ "app_metadata": { "kora_role": "KORA_ADMIN" } }
```

Impostare la password separatamente via Dashboard (Auth Admin API supporta anche `password` nel body della `POST` iniziale, ma va valorizzata solo dall'operatore, mai scritta in un file o in output di comandi condivisi).

---

## 7. Password / Secret Handling Rules

- Nessuna password va mai scritta in questo repo, in nessun file, in nessun commit.
- Nessuna password va mai stampata in output di comandi condivisi in una sessione AI/chat.
- Nessun `service_role` key va mai letto, stampato o incollato in questa sessione.
- Le credenziali risultanti vanno condivise con l'operatore QA solo tramite canale sicuro fuori-banda (password manager condiviso, non email/chat in chiaro).
- Se serve verificare che una credenziale sia stata impostata correttamente, farlo tramite login applicativo (redirect corretto = successo), mai stampando il valore.

---

## 8. Post-Provision Browser QA

Verifica read-only già esistente, **nessuna nuova pagina o API necessaria**: `SessionBar` (`components/auth/SessionBar.tsx`), già montato in `app/admin/layout.tsx`, mostra email e badge di ruolo ("KORA Admin") in cima a ogni pagina `/admin/*` una volta autenticati — sufficiente per confermare identità/ruolo senza stampare secret.

1. Login su `/login?role_hint=admin` con le credenziali provisionate.
2. Verificare redirect a `/admin`.
3. Verificare che `SessionBar` mostri l'email corretta e il badge "KORA Admin".

---

## 9. KORA Link Admin Routes to Verify

| Route | Expected |
|---|---|
| `/admin/kora-link` | Status 200, Control Tower carica: runtime readiness, feature flag, lifecycle overview, capability matrix, gate status, confini privacy, prossime azioni operative |
| `/admin/kora-link-lab` | Status 200, Lab carica: stato runtime, generazione URL demo, safety boundaries, checklist NFC |

Entrambe già verificate a livello di codice/build/test (KL-20→24, QA-01, QA-02) — mancava solo la verifica browser con sessione reale.

---

## 10. NFC Lab Test Unlock

Una volta ottenuto l'accesso KORA_ADMIN, lo step 1 del test plan NFC (`docs/KORA_LINK_STAGING_READINESS_QA.md §6`) diventa eseguibile:

1. Login KORA_ADMIN → `/admin/kora-link-lab`.
2. Generare URL demo (richiede solo `KORA_LINK_PUBLIC_BASE_URL` configurato — nessun DB, nessuna scrittura).
3. Copiare l'URL, scriverlo su chip NFC fisico con app esterna.
4. Procedere con gli step 6-12 del test plan già definito in QA-01.

`NFC_MANUAL_TEST_READY` può passare da `no` a `yes` solo dopo il completamento fisico del test (fuori dal perimetro di questo step).

---

## 11. What Not to Enable

- `KORA_LINK_DB_LOOKUP_ENABLED=true` — resta bloccato da Gate 2/4/5, indipendentemente dall'accesso KORA_ADMIN.
- `KORA_LINK_ACTIVATION_ENABLED=true` — resta bloccato da Gate 2/3/4/5/7.
- Nessuna modifica a `034_kora_link_schema.sql` / `035_kora_link_rls.sql` / `036_kora_link_rpc_functions.sql`.
- Nessuna variabile d'ambiente Vercel (staging o produzione) va modificata come parte di questa procedura — il provisioning KORA_ADMIN è puramente un'operazione Supabase Auth, indipendente dalle env application.
- Nessun deploy manuale Vercel.

---

## 12. Rollback / Disable Account Procedure

Se l'account KORA_ADMIN di staging deve essere disattivato:

**Opzione preferita — disabilitare senza cancellare (reversibile):**
1. Supabase Dashboard → Authentication → Users → selezionare l'utente → **Ban user** (o rimuovere temporaneamente `kora_role` da `app_metadata`, impostandolo a un valore vuoto/non riconosciuto — `requireKoraAdmin()` restituirà `403` per qualunque valore diverso da `'KORA_ADMIN'`).

**Opzione distruttiva — cancellazione (solo se necessario):**
2. Supabase Dashboard → Authentication → Users → **Delete user**. Azione irreversibile — da eseguire solo con conferma esplicita, mai come parte di una pulizia automatica.

Nessuna delle due opzioni richiede modifiche a `034/035/036`, a migration, o a codice applicativo — è un'operazione Supabase Auth pura.

---

## 13. Go / No-Go

| Flag | Valore | Motivazione |
|---|---|---|
| `KORA_ADMIN_ACCESS_READY` | **No** | Procedura completa e pronta (§5/§6), ma nessun account creato in questo step — richiede conferma esplicita ed esecuzione fuori da QA-03 |
| `NFC_MANUAL_TEST_READY` | **No** | Bloccato dall'assenza dell'account KORA_ADMIN — procedura sbloccata solo dopo §5/§6 |
| `PARTNER_ACCESS_READY` | **No** | Bloccato in catena dallo stesso prerequisito (§2) |
| `DB_LOOKUP_ENABLEMENT_READY` | **No** | Gate 2/4/5 aperti — indipendente da questo step |
| `ACTIVATION_ENABLEMENT_READY` | **No** | Gate 2/3/4/5/7 aperti — indipendente da questo step |
| `PRODUCTION_READY` | **No** | Gate 9 e tutti i precedenti aperti |

---

## 14. Manual QA Checklist Post-Provisioning

Da eseguire solo dopo che l'account KORA_ADMIN di staging è stato effettivamente creato (fuori da QA-03):

| # | Step | Expected | Pass/Fail |
|---|---|---|---|
| 1 | Aprire l'app di staging | Pagina di login raggiungibile | ☐ Pending |
| 2 | Login con KORA_ADMIN | Redirect a `/admin`, `SessionBar` mostra email + badge "KORA Admin" | ☐ Pending |
| 3 | Verificare redirect admin | `/admin` carica correttamente | ☐ Pending |
| 4 | Aprire `/admin/kora-link` | Status 200, Control Tower completo | ☐ Pending |
| 5 | Aprire `/admin/kora-link-lab` | Status 200, Lab completo | ☐ Pending |
| 6 | Generare link demo | URL `/link/kl1_...` generato, token con nota "demo only, not persisted" | ☐ Pending |
| 7 | Aprire il link generato | Comportamento coerente con `KORA_LINK_ENABLED` corrente (404 se off, skeleton/ready se on) | ☐ Pending |
| 8 | Verificare che nessun DB write avvenga | Nessuna chiamata Supabase di scrittura nel percorso Lab (verificato staticamente in KL-20/21 — 55 test dedicati) | ☐ Pending |
| 9 | Verificare che non venga stampato alcun secret | Pannello "Stato runtime" mostra solo booleani/enum, mai `KORA_LINK_TOKEN_SECRET` (verificato staticamente in KL-20/21/23) | ☐ Pending |
| 10 | Test fisico NFC completo (chip reale) | `NFC_DEMO_READY` può passare a `yes` solo dopo questo step | ☐ Pending |
