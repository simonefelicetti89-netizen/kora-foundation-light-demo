# KORA Commons Foundation — B128

**Sprint:** B128  
**Status:** Foundation Light v0.1 — spazio condiviso moderato tenant-scoped attivo

---

## Cos'è KORA Commons

KORA Commons è uno spazio informativo condiviso, tenant-scoped e moderato, dove le aziende possono
pubblicare contenuti rilevanti ai propri worker — iniziative, annunci, aggiornamenti, risorse, eventi.

Ogni contenuto è visibile ai worker dello stesso tenant solo dopo approvazione esplicita di KORA_ADMIN.

---

## Cosa NON è KORA Commons

| Non è... | Perché |
|---|---|
| Un social network | Nessun like, follower, feed algoritmico, commento |
| Una chat o sistema di messaggistica | Nessun DM, nessuna risposta diretta |
| Un forum libero | Il worker non può creare post in v0 |
| Un comment system | Nessun commento in v0 |
| Uno strumento disciplinare | KORA Commons non traccia comportamenti individuali |
| Uno strumento HR surveillance | Nessun analytics di lettura individuale |
| Un marketplace | Nessun prodotto, nessun prezzo, nessuna transazione |
| Una bacheca anonima | Solo content approvato da KORA |
| Uno strumento di ranking | Nessun ranking contenuti, nessun ranking worker |
| Una piattaforma di welfare | Vedi doc KORA identity — KORA misura attivazione, non welfare |

---

## Ruoli e workflow

### COMPANY_ADMIN

- Può creare post in stato `draft` (bozza) o `pending_review` (inviato a revisione KORA).
- Non può pubblicare direttamente — la pubblicazione richiede approvazione KORA_ADMIN.
- Vede tutti i propri post del tenant (tutti gli stati).
- Non vede post di altri tenant.
- Non ha analytics di lettura individuale dei worker.

### KORA_ADMIN

- Può approvare (`published`), rifiutare (`rejected`), archiviare (`archived`) qualsiasi post.
- Può creare post direttamente per qualsiasi tenant.
- Ha accesso alla Moderation Console (`/admin/commons`).
- Non pubblica dati individuali worker tramite Commons.

### WORKER

- Vede solo post con `status = 'published'` del proprio tenant.
- Non può creare post in v0.
- Non può commentare, reagire, o inviare read receipt.
- La lettura non viene tracciata come dato individuale visibile al datore di lavoro.
- Privacy notice non sopprimibile.

### PARTNER

- Non incluso in B128. Nessuna policy su `commons.post`.

---

## Tipi di contenuto

| Categoria | Descrizione |
|---|---|
| `announcement` | Annuncio aziendale generico |
| `initiative_update` | Aggiornamento su un'iniziativa in corso |
| `opportunity` | Opportunità di attivazione (formazione, volontariato, ecc.) |
| `event` | Evento (data, luogo, partecipazione) |
| `request` | Richiesta ai worker (raccolta disponibilità, feedback aggregato) |
| `resource` | Risorsa utile (link, documento, guida) |

---

## Stati post

| Status | Chi può impostarlo | Visibile a worker? |
|---|---|---|
| `draft` | COMPANY_ADMIN, KORA_ADMIN | No |
| `pending_review` | COMPANY_ADMIN, KORA_ADMIN | No |
| `published` | KORA_ADMIN only | Sì |
| `archived` | KORA_ADMIN | No |
| `rejected` | KORA_ADMIN | No |

---

## Workflow moderazione

```
COMPANY_ADMIN crea post (draft)
  → COMPANY_ADMIN invia a revisione (pending_review)
  → KORA_ADMIN vede il post in /admin/commons → coda pending_review
  → KORA_ADMIN approva → published (visibile ai worker)
         oppure rifiuta → rejected
         oppure archivia → archived

KORA_ADMIN può anche creare post direttamente e pubblicarli.
```

---

## Privacy boundary

### Il worker NON è tracciato individualmente

- Nessun `read_receipt` — non esiste in v0 e non è previsto per il futuro senza consenso esplicito.
- Nessun analytics di lettura individuale visibile al datore di lavoro.
- La nota privacy è non sopprimibile in `/worker/commons`.

### L'azienda NON vede dati individuali

- `commons.post` non contiene né espone worker_id, email worker, PIB, Dynamic CV.
- Le azioni dei worker su Commons non sono visibili in nessuna vista Company.

### Tenant isolation

- Ogni post è scoped a un `tenant_id`.
- RLS con FORCE ROW LEVEL SECURITY garantisce che company A non possa leggere post di company B.
- Worker vede solo `published` del proprio tenant.

---

## Data model

### `commons.post` (migration 013)

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK → analytics.tenant, ON DELETE CASCADE |
| `author_user_id` | uuid | nullable — Supabase auth user ID |
| `author_role` | text | KORA_ADMIN o COMPANY_ADMIN |
| `title` | text | max 200 caratteri, sanitizzato |
| `body` | text | max 4000 caratteri, nessun HTML |
| `category` | text | announcement / initiative_update / opportunity / event / request / resource |
| `status` | text | draft / pending_review / published / archived / rejected |
| `pillar` | text | LIFE / GROWTH / CONNECTION / IMPACT / LEGACY — nullable |
| `published_at` | timestamptz | impostato da KORA_ADMIN al publish |
| `reviewed_by` | uuid | KORA_ADMIN che ha revisionato |
| `reviewed_at` | timestamptz | timestamp revisione |
| `created_at` | timestamptz | immutabile |
| `updated_at` | timestamptz | trigger set_updated_at() |

---

## Route

| Route | Ruolo | Scopo |
|---|---|---|
| `/company/commons` | COMPANY_ADMIN | Crea, gestisce, vede stato dei propri post |
| `/worker/commons` | WORKER | Feed published del proprio tenant |
| `/admin/commons` | KORA_ADMIN | Moderation console — tutti i tenant |
| `/api/commons/posts` | GET: tutti i ruoli auth, POST: COMPANY_ADMIN + KORA_ADMIN | Endpoint dati |
| `/api/commons/posts/[id]` | PATCH: COMPANY_ADMIN (draft/pending) + KORA_ADMIN | Aggiorna post |

---

## No comments, no reactions, no read receipts in v0

Queste funzionalità sono deliberatamente escluse da v0:

- **Commenti:** richiederebbero moderazione individuale e creerebbero rischi surveillance.
- **Reactions/like:** metriche aggregate di engagement potrebbero essere usate per inferire comportamenti individuali.
- **Read receipts:** tracking individuale di lettura è una forma di surveillance. Mai in Foundation Light.

---

## Future (post-B128, non attive)

- Reactions aggregate (no dati individuali) — future
- Post da PARTNER — future
- Request form anonima (feedback aggregato) — future
- Filtri avanzati worker — future

---

## Copy obbligatoria

**Company:**
> "KORA Commons è uno spazio moderato. I contenuti diventano visibili ai worker solo dopo approvazione KORA."

**Worker:**
> "KORA Commons mostra contenuti pubblicati per il tuo tenant. La tua lettura non viene mostrata al datore di lavoro come dato individuale."

**Admin:**
> "KORA Commons è moderation-first. Non pubblicare dati personali, sanitari o valutazioni individuali."

---

## Definition of done — B128

- [x] Migration 013: `commons.post` con RLS FORCE, KORA_ADMIN all, COMPANY_ADMIN tenant-scoped, WORKER published only
- [x] `GET /api/commons/posts` — ruolo-aware, tenant isolation
- [x] `POST /api/commons/posts` — COMPANY_ADMIN (draft/pending_review), KORA_ADMIN (any status)
- [x] `PATCH /api/commons/posts/[id]` — COMPANY_ADMIN (propri draft/pending), KORA_ADMIN (moderation)
- [x] `/company/commons` — COMPANY_ADMIN, form crea, lista post, moderation copy
- [x] `/worker/commons` — WORKER, published feed, privacy notice non-sopprimibile, no azioni
- [x] `/admin/commons` — KORA_ADMIN, pending queue, publish/reject/archive
- [x] Sidebar: Admin → /admin/commons, Company → /company/commons, Worker → /worker/commons
- [x] PARTNER: nessuna voce Commons in sidebar B128
- [x] Docs KORA_COMMONS_FOUNDATION.md
- [x] 40 test b128-kora-commons.test.ts
