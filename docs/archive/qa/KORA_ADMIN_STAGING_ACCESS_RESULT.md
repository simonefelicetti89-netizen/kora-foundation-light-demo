# KORA_ADMIN Staging Access — Result (QA-04)

**Data:** 2026-07-01
**Branch:** `qa/provision-kora-admin-staging`
**Base:** `main` @ `37805dd` (QA-03 merged, PR #12)
**Tipo:** Audit + verifica read-only — nessuna write su Supabase Auth eseguita, nessuna credenziale generata, nessun secret stampato.

---

## Account target

| Campo | Valore |
|---|---|
| Email | `kora-admin@staging.kora.internal` |
| Ruolo | `KORA_ADMIN` |
| Esisteva già in staging | **No** — verificato |

---

## Verifica esistenza account (read-only)

Eseguita una query read-only a `GET /auth/v1/admin/users` sul progetto Supabase di staging (stesso progetto già usato da `company-admin`/`worker-a/b/c`, confermato non essere il progetto di produzione). Il parametro `email` non filtra lato server in questa versione dell'API — la risposta ha restituito la lista completa degli utenti esistenti, i cui indirizzi email (non sensibili) sono stati confrontati con il target:

```
worker-c@staging.kora.internal
worker-b@staging.kora.internal
worker-a@staging.kora.internal
company-admin@staging.kora.internal
```

`kora-admin@staging.kora.internal` **non è presente** tra i 4 account esistenti. Nessun user id, token o altro dato è stato stampato oltre agli indirizzi email (non sensibili).

---

## Verifica deliverability email (read-only, nessuna interazione Supabase)

```
$ dig +short MX staging.kora.internal
(vuoto)
$ dig +short A staging.kora.internal
(vuoto)
$ host staging.kora.internal
Host staging.kora.internal not found: 3(NXDOMAIN)
```

`staging.kora.internal` è **NXDOMAIN** — non esiste come dominio risolvibile, nessun record MX, nessun record A. **Nessuna email può essere consegnata** a nessun indirizzo su questo dominio, incluso `kora-admin@staging.kora.internal`. Questo è coerente con il fatto che anche gli altri account staging esistenti (`company-admin`, `worker-a/b/c`) usano lo stesso dominio non deliverable — erano quindi stati creati senza flusso email (creazione diretta con password impostata manualmente), non tramite invito.

---

## Esito

**Provisioning automatico bloccato da password delivery.** Il flusso `inviteUserByEmail()` / reset-password-via-email non è utilizzabile con l'email target, perché il dominio non può ricevere posta. Non è stata generata alcuna password random irrecuperabile, né eseguita alcuna write su Supabase Auth.

### Procedura scelta: creazione manuale da Supabase Dashboard

Decisione esplicita: l'account va creato manualmente dall'operatore (owner dell'ambiente staging), non da Claude in questa sessione.

| Passo | Azione | Chi la esegue |
|---|---|---|
| 1 | Supabase Dashboard → Authentication → Users → **Add user** | Operatore |
| 2 | Email: `kora-admin@staging.kora.internal` | Operatore |
| 3 | Spuntare **Auto Confirm User** — necessario, perché l'email di conferma non arriverebbe mai (dominio NXDOMAIN) | Operatore |
| 4 | Password impostata direttamente nel form dal Dashboard | Operatore — **mai condivisa con Claude, mai in chat, mai nel repo** |
| 5 | Aprire l'utente creato → **Raw App Meta Data** → impostare `{ "kora_role": "KORA_ADMIN" }` | Operatore |
| 6 | Salvare | Operatore |

**`app_metadata` richiesto:** `{ "kora_role": "KORA_ADMIN" }`
**`kora_tenant_id`:** nessuno (non impostare)
**`kora_worker_id`:** nessuno (non impostare)

### Write eseguite da Claude in questa sessione

**Nessuna.** Nessuna chiamata di scrittura a Supabase Auth Admin API è stata effettuata. Nessuna password è stata generata. Nessun secret è stato stampato. Nessuna credenziale è stata committata in questo repo.

### Nessuna modifica a SQL / migration / env / produzione

Confermato: nessun file `.env` toccato, nessuna migration creata, nessun SQL applicato, `034/035/036` non modificati, ambiente di produzione non toccato, nessun deploy Vercel.

---

## Cosa resta bloccato

- **QA browser reale di `/admin/kora-link` e `/admin/kora-link-lab`** — resta bloccata finché l'operatore non completa la procedura manuale sopra.
- **Test fisico NFC** — bloccato dallo stesso prerequisito (richiede accesso al Lab).
- **Provisioning PARTNER** — bloccato in catena (richiede una sessione KORA_ADMIN per chiamare `/api/admin/partners/[id]/invite-user`).
- **DB lookup e activation reali** — bloccati indipendentemente da Gate 2/3/4/5/7, non correlato a questo step.

Una volta completata la procedura manuale, il prossimo step naturale è eseguire la checklist QA post-provisioning già definita in `docs/KORA_ADMIN_STAGING_ACCESS_RUNBOOK.md §14`.

---

## Go / No-Go

| Flag | Valore |
|---|---|
| `KORA_ADMIN_ACCESS_READY` | **No** — account non ancora creato |
| `KORA_ADMIN_MANUAL_PROVISIONING_READY` | **Sì** — procedura completa, chiara, pronta per l'esecuzione manuale dall'operatore |
| `NFC_MANUAL_TEST_READY` | **No** |
| `PARTNER_ACCESS_READY` | **No** |
| `DB_LOOKUP_ENABLEMENT_READY` | **No** |
| `ACTIVATION_ENABLEMENT_READY` | **No** |
| `PRODUCTION_READY` | **No** |
