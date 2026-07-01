# KORA — Environment Safety Check (CC-00B / CC-00C)

**Data:** 2026-06-30
**Scopo:** verifica sicura dell'ambiente Supabase + switch da production a staging
**Nessun segreto stampato. Nessuna connessione remota effettuata.**

---

## 1. Variabili Presenti (solo nomi)

### `.env.local`

```
KORA_ENABLE_TEST_ROUTES
KORA_GATE_2_STATUS
KORA_GATE_3_STATUS
KORA_GATE_5_STATUS
KORA_OPERATOR_SECRET
KORA_TEST_SEED_SECRET
KORA_TEST_USER_PASSWORD
NEXT_PUBLIC_KORA_DEFAULT_ENV
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### `.env.staging.local`

```
AUDIT_HASH_SALT
NEXT_PUBLIC_KORA_DEFAULT_ENV
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## 2. URL Supabase Mascherati

| File | URL (mascherato) | Project prefix |
|---|---|---|
| `.env.local` | `https://azdn****.supabase.co` | `azdn` |
| `.env.staging.local` | `https://haqf****.supabase.co` | `haqf` |

I due file puntano a **progetti Supabase distinti**.

---

## 3. Ambiente Dedotto

### `azdn****` — `.env.local`

Identificazione tramite documentazione interna (nessuna connessione remota):

- `docs/archive/sprints/sprint-B168-6/phase4-target-env.md` (riga 11):
  > **Supabase project URL:** `azdnepfmwrmacruykskm.supabase.co`
  > **Ambiente scelto:** Production

- `docs/archive/sprints/sprint-B168-6/phase4-execution-queries.md` (riga 3):
  > Ambiente: **Production** `azdnepfmwrmacruykskm.supabase.co`

- `docs/archive/sprints/sprint-B168-6/exposed-domains.md`:
  > `azdnepfmwrmacruykskm.supabase.co` — Backend — Supabase project

**Conclusione: `azdn**** = PRODUCTION`**

### `haqf****` — `.env.staging.local`

Identificazione tramite documentazione interna:

- `docs/GATE2_STAGING_APP_ENV_WIRING.md` (riga 4):
  > **Staging Supabase project:** `haqflkurpmeaxpikozjl` (dedicated staging only)

- `docs/GATE2_CTO_CLOSE_REVIEW.md`:
  > Staging project: `haqflkurpmeaxpikozjl` — only
  > Only staging project `haqflkurpmeaxpikozjl` targeted — ✓ CONFIRMED

**Conclusione: `haqf**** = STAGING (dedicato)`**

---

## 4. Tabella Ambiente

| File | Project | Ambiente | `KORA_DEFAULT_ENV` |
|---|---|---|---|
| `.env.local` | `azdn****` | **PRODUCTION** 🔴 | `demo` |
| `.env.staging.local` | `haqf****` | **STAGING** 🟢 | `live` |

---

## 5. Analisi Rischio

### Perché `.env.local` → PRODUCTION è un rischio

`.env.local` è il file caricato automaticamente da Next.js in ogni sessione `next dev`. Contiene:

- `NEXT_PUBLIC_SUPABASE_URL` → production
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → chiave anon di production
- `SUPABASE_SERVICE_ROLE_KEY` → **chiave service role di production** (bypass totale RLS)

Questo significa che qualsiasi operazione che usa il Supabase client (incluse API route, middleware, server actions, migrations via CLI) colpirebbe il **database di produzione** se eseguita con `.env.local` attivo.

`NEXT_PUBLIC_KORA_DEFAULT_ENV=demo` limita l'app a usare dati sintetici per le funzioni di presentazione, ma **non protegge il database dal essere raggiunto** quando le API route o i service usano il client Supabase.

### Livello rischio

**🔴 ALTO** — per qualsiasi operazione che usa Supabase client

**🟡 BASSO** — per operazioni che non toccano il client Supabase (`tsc`, `vitest`, `eslint`, sviluppo UI puro)

---

## 6. Cosa Verificare Manualmente nella Dashboard Supabase

Accedi a [supabase.com/dashboard](https://supabase.com/dashboard) e verifica:

1. **Conferma che `azdn****` è il progetto Production:**
   - Dashboard → seleziona il progetto `azdnepfmwrmacruykskm`
   - Il nome deve corrispondere al progetto production (es. "KORA Production" o "kora.io")

2. **Conferma che `haqf****` è il progetto Staging:**
   - Dashboard → seleziona il progetto `haqflkurpmeaxpikozjl`
   - Il nome deve corrispondere al progetto staging (es. "KORA Staging")

3. **Verifica Table Editor su `azdn****`:**
   - Apri Table Editor del progetto production
   - Verifica che ci siano dati reali di tenant/utenti (conferma ulteriore che è production)

---

## 7. Raccomandazione

### Azione immediata richiesta

**Non usare `.env.local` così com'è per qualsiasi lavoro che coinvolge Supabase.**

Se vuoi sviluppare con accesso al database, usa **sempre** `.env.staging.local`:

```bash
# Per eseguire il dev server contro staging:
cp .env.staging.local .env.local.staging-override
# oppure usa --env-file se supportato dal tuo workflow
```

Oppure, crea un nuovo `.env.local` che punti a staging:

```
# .env.local (da aggiornare per puntare a staging, non a production)
NEXT_PUBLIC_SUPABASE_URL=https://haqf****.supabase.co  # staging
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>
SUPABASE_SERVICE_ROLE_KEY=<staging service role key>
NEXT_PUBLIC_KORA_DEFAULT_ENV=demo
```

> I valori corretti per staging sono già in `.env.staging.local`.

### Per lavoro senza Supabase (tsc, vitest, eslint, UI)

`.env.local` attuale è **accettabile** — queste operazioni non usano il client Supabase e `KORA_DEFAULT_ENV=demo` mantiene l'app in modalità sintetica.

---

## 8. Tabella CC-01 / Migrations / Types

| Operazione | Può procedere con `.env.local` attuale? | Env corretto |
|---|---|---|
| `tsc --noEmit` | ✅ Sì | qualsiasi |
| `vitest run` | ✅ Sì | qualsiasi |
| `eslint` | ✅ Sì | qualsiasi |
| `next dev` (modalità demo, no login) | ✅ Sì (demo mode) | `.env.local` OK |
| CC-01 (se non usa Supabase client) | ✅ Sì | `.env.local` OK |
| `supabase gen types` | ⚠️ Solo con env staging | `.env.staging.local` |
| migrations apply (032/033) | 🔴 Solo staging, mai production | `.env.staging.local` |
| `supabase db push` | 🔴 Solo staging, mai production | `.env.staging.local` |
| Login/auth reali | 🔴 Mai con `.env.local` attuale | `.env.staging.local` |
| API route con Supabase client | 🔴 Mai con `.env.local` attuale | `.env.staging.local` |

---

## 9. CC-00C — Switch Production → Staging (2026-06-30)

### Stato prima del switch

| File | Progetto | Ambiente |
|---|---|---|
| `.env.local` | `azdn****` | PRODUCTION 🔴 |
| `.env.staging.local` | `haqf****` | STAGING 🟢 |

### Azioni eseguite

1. **Backup creato:** `.env.production.local.backup` ← copia di `.env.local` (production)
2. **Backup coperto da `.gitignore`:** regola `.env*` riga 35 — non entrerà mai in git
3. **`.env.local` aggiornato:** base da `.env.staging.local` + 7 variabili KORA-only preservate dal backup

### Variabili risultanti in `.env.local`

| Fonte | Variabili |
|---|---|
| `.env.staging.local` (Supabase staging) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_KORA_DEFAULT_ENV`, `AUDIT_HASH_SALT` |
| Backup (KORA-only, non Supabase) | `KORA_ENABLE_TEST_ROUTES`, `KORA_GATE_2_STATUS`, `KORA_GATE_3_STATUS`, `KORA_GATE_5_STATUS`, `KORA_OPERATOR_SECRET`, `KORA_TEST_SEED_SECRET`, `KORA_TEST_USER_PASSWORD` |

### Stato dopo il switch

| File | Progetto | Ambiente |
|---|---|---|
| `.env.local` | `haqf****` | STAGING 🟢 |
| `.env.production.local.backup` | `azdn****` | PRODUCTION (backup) |
| `.env.staging.local` | `haqf****` | STAGING 🟢 |

### Verifica post-switch

- ✅ `.env.local` punta a `haqf****` (staging)
- ✅ `azdn****` (production) non compare in `.env.local`
- ✅ `NEXT_PUBLIC_KORA_DEFAULT_ENV=live` (staging — corretto per uso con client Supabase)
- ✅ 12 chiavi totali presenti (5 da staging + 7 KORA-only)
- ✅ Backup coperto da `.gitignore` (`.env*` riga 35)

---

## 10. Tabella CC-01 / Migrations / Types (post CC-00C)

| Operazione | Può procedere? | Note |
|---|---|---|
| `tsc --noEmit` | ✅ Sì | sempre |
| `vitest run` | ✅ Sì | sempre |
| `eslint` | ✅ Sì | sempre |
| `next dev` (modalità demo/live) | ✅ Sì — ora su staging | staging, non production |
| CC-01 | ✅ Sì | `.env.local` ora è staging |
| `supabase gen types` | ✅ Sì — staging | `.env.local` ora punta a staging |
| migrations apply (032/033) | ✅ Sì — staging | solo staging, mai production |
| `supabase db push` | ✅ Sì — staging | solo staging, mai production |
| Login/auth reali | ✅ Sì — staging | ora su staging, non production |

**Nota:** per tornare a modalità demo pura (senza accesso Supabase), impostare `NEXT_PUBLIC_KORA_DEFAULT_ENV=demo` in `.env.local`.

---

## 11. Conferma Sicurezza (CC-00B + CC-00C)

- ✅ Nessun segreto stampato
- ✅ Nessuna chiave completa mostrata
- ✅ Nessuna connessione remota effettuata
- ✅ Nessuna query eseguita
- ✅ Nessuna migration applicata
- ✅ Nessun codice runtime modificato
- ✅ Nessun commit effettuato
- ✅ Produzione non toccata
- ✅ Backup creato e coperto da `.gitignore`
- ✅ Identificazione ambiente basata solo su documentazione interna esistente
