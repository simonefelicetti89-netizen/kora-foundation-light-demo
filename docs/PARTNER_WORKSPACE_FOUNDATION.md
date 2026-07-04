# Partner Workspace Foundation — B127

**Sprint:** B127  
**Status:** Foundation Light v0.1 — workspace attivo per PARTNER autenticati

---

## Cos'è il Partner Workspace

Il Partner Workspace è l'area riservata per utenti con ruolo `PARTNER` — attori di attivazione KORA
(associazioni, enti, fornitori di servizi verificati). Non è un marketplace, non è una piattaforma
di prenotazione, non è uno strumento CRM.

---

## Ruolo PARTNER

- Il ruolo `PARTNER` è un ruolo distinto nella piattaforma KORA.
- I partner accedono a `/partner/workspace` — area riservata, no self-signup.
- Provisioning: esclusivamente da `KORA_ADMIN` tramite API invite (`POST /api/admin/partners/[id]/invite-user`).
- Autenticazione: Supabase Auth invite email — il partner riceve un link di attivazione.
- `app_metadata` del partner auth user: `{ kora_role: 'PARTNER', kora_partner_id: <uuid>, kora_status: 'active' }`.
- Nessun `kora_tenant_id` — il partner non appartiene a una company.

## No self-signup

Il partner non può registrarsi autonomamente. Non esiste nessuna pagina pubblica di registrazione partner.
L'unica via di provisioning è `KORA_ADMIN → /admin/partners → [partner] → Invita referente`.

---

## Data model

### `network.partner_profile` (migration 010)

Profilo pubblico del partner — gestito da KORA_ADMIN.

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Nome partner |
| `description` | text | Descrizione |
| `pillar` | text | LIFE / GROWTH / CONNECTION / IMPACT / LEGACY |
| `category` | text | Categoria libera |
| `website_url` | text | URL esterno |
| `city` | text | Città |
| `delivery_mode` | text | online / onsite / hybrid |
| `status` | text | draft / published / archived |

### `network.partner_identity` (migration 012)

Mapping Supabase auth user → partner_profile. Creato da KORA_ADMIN al provisioning.

| Campo | Tipo | Note |
|---|---|---|
| `id` | uuid | PK |
| `partner_id` | uuid | FK → partner_profile |
| `auth_user_id` | uuid | Supabase auth.users.id |
| `email` | text | Email del referente partner |
| `status` | text | invited / active / disabled |

---

## Cosa vede il partner

Il partner autenticato in `/partner/workspace` vede:

- Il proprio profilo partner (`name`, `description`, `pillar`, `delivery_mode`, `category`, `city`, `website_url`)
- Lo stato di visibilità nel catalogo opportunità worker (`published` / `draft` / `archived`)
- Il perimetro di accesso dati (cosa NON vede — boundary card non sopprimibile)
- Funzionalità future (prossimamente, no logica attiva)

---

## Cosa NON vede il partner

Il partner non ha accesso a:

- Dati individuali dei lavoratori (no PIB, no Dynamic Impact CV, no worker_id, no email worker)
- KORA Index delle aziende
- Trial Control Center
- Admin dashboard
- Company workspace
- Dati HR confidenziali
- Nominativi, email o ID worker
- Ranking partner
- Worker leads individuali
- Analytics individuali

---

## No marketplace, no booking, no payments

Il Partner Workspace Foundation non include:

- Marketplace di servizi
- Sistema di prenotazione
- Pagamenti o wallet
- Chat o messaggistica
- Worker leads
- CRM
- Confronto/ranking partner

---

## Boundary RLS

| Ruolo | `partner_profile` | `partner_identity` |
|---|---|---|
| KORA_ADMIN | ALL | ALL |
| PARTNER | SELECT own (via partnerId) | SELECT own row |
| COMPANY_ADMIN | NO policy | NO policy |
| COMPANY_VIEWER | NO policy | NO policy |
| WORKER | SELECT published only | NO policy |
| anon | NO policy | NO policy |

---

## Middleware

I PARTNER autenticati sono confinati a:

```
/partner/          — workspace e demo
/account           — account profile
/auth/             — callback, reset-password
/login             — re-autenticazione
/api/              — tutte le API (con propria auth)
```

Qualunque altra route reindirizza a `/partner/workspace`.

---

## Admin provisioning flow

```
KORA_ADMIN → /admin/partners → seleziona partner → "Invita referente"
  → POST /api/admin/partners/[id]/invite-user { email }
  → Supabase Auth invite email inviata al referente
  → app_metadata: { kora_role: PARTNER, kora_partner_id: <uuid>, kora_status: active }
  → network.partner_identity record creato
  → Referente riceve email → clicca link → imposta password → accede a /partner/workspace
```

---

## Componenti

| Path | Ruolo | Scopo |
|---|---|---|
| `app/partner/workspace/page.tsx` | PARTNER | Workspace auth-gated, server component — home |
| `app/partner/layout.tsx` | PARTNER / KORA_ADMIN | Server-side guard (`requirePartnerUser()`); KORA_ADMIN redirected to `/admin` — no demo-state fallback |
| `app/partner/page.tsx` | PARTNER | **PARTNER-01:** ora un redirect server-side a `/partner/workspace` — non più un dashboard |
| `app/demo/partner/page.tsx` | DEMO_VIEWER / KORA_ADMIN | **PARTNER-01:** anteprima demo sintetica (ex `app/partner/page.tsx`), gated da `requireDemoGate()` — mai una sessione PARTNER reale |
| `app/api/admin/partners/[id]/invite-user/route.ts` | KORA_ADMIN | POST — invita referente partner |
| `app/admin/preview/partner/workspace/page.tsx` | KORA_ADMIN | Preview sintetica admin |
| `lib/auth/kora-session.ts` | — | `KoraPartnerUser`, `requirePartnerUser`, `getCurrentPartnerUser` |
| `lib/auth/role-home.ts` | — | `getRoleHome('PARTNER')` → `/partner/workspace` |
| `middleware.ts` | — | `PARTNER_ALLOWED_PREFIXES`, redirect enforcement |
| `supabase/migrations/012_partner_identity.sql` | — | Tabella `network.partner_identity` |

---

## Definition of done — B127

- [x] PARTNER role supportato in `kora-session.ts` (`requirePartnerUser`, `KoraPartnerUser`)
- [x] `getRoleHome('PARTNER')` → `/partner/workspace`
- [x] Middleware blocca PARTNER da /admin, /company, /worker
- [x] `/partner/workspace` richiede PARTNER auth — `requirePartnerUser` enforced
- [x] Workspace mostra profilo partner reale da DB (via service role)
- [x] Boundary card non sopprimibile in workspace
- [x] Status pubblicato/bozza/archiviato visibile con nota corrispondente
- [x] PARTNER non vede worker data, company KORA Index
- [x] `network.partner_identity` migration 012 creata
- [x] Admin invite-user API: `POST /api/admin/partners/[id]/invite-user`
- [x] AccountMenu label PARTNER
- [x] Account page PARTNER section
- [x] Admin preview sintetica a `/admin/preview/partner/workspace`
- [x] Docs `PARTNER_WORKSPACE_FOUNDATION.md` creati
- [x] `ACCESS_PROVISIONING_DOCTRINE.md` aggiornato
- [x] 32 test `b127-partner-workspace.test.ts`
