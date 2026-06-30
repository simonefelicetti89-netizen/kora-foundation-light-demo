# KORA — Consolidation Changelog

Registro cronologico delle operazioni di consolidamento, freeze e branch management.
Nessun dato reale. Nessuna connessione a Supabase. Nessuna migration applicata.

---

## CC-00 — Baseline Tecnica

**Data:** 2026-06-30
**Branch:** `main`
**HEAD:** `c1c57db`

**Scopo:** fotografare lo stato tecnico del repository prima di qualsiasi sviluppo.

**Risultati:**

| Area | Stato |
|---|---|
| TypeScript (`tsc --noEmit`) | 🟢 VERDE — nessun errore |
| Test suite (vitest) | 🟢 VERDE — 8079/8079 passing, 191 file |
| Build Next.js | 🟢 VERDE — 161 route, 7.4s |
| Dipendenze npm | 🟢 VERDE — up to date |
| ESLint | 🟡 GIALLO — 206 problemi (118 errori, 88 warning), non blocca build |
| Supabase CLI | 🟢 VERDE — v2.107.0 |
| Supabase local | 🔴 ROSSO — Docker non disponibile + config.toml assente |

**Baseline complessiva: 🟡 GIALLA** — non bloccante per sviluppo.

**File prodotti:** `docs/BASELINE_STATUS.md`

---

## CC-00B — Environment Safety Check

**Data:** 2026-06-30
**Branch:** `main`
**HEAD:** `c1c57db` (non committato all'epoca)

**Scopo:** identificare a quale ambiente Supabase punta `.env.local`.

**Risultati:**

| File | Project prefix | Ambiente identificato |
|---|---|---|
| `.env.local` | `azdn****` | **PRODUCTION** 🔴 |
| `.env.staging.local` | `haqf****` | **STAGING** 🟢 |

Identificazione tramite sola documentazione interna (`sprint-B168-6/phase4-target-env.md`, `GATE2_STAGING_APP_ENV_WIRING.md`) — nessuna connessione remota.

**Rischio rilevato:** ALTO — `.env.local` conteneva `SUPABASE_SERVICE_ROLE_KEY` di production.

**File prodotti:** `docs/ENVIRONMENT_SAFETY_CHECK.md`

---

## CC-00C — Switch .env.local da Production a Staging

**Data:** 2026-06-30
**Branch:** `main`
**HEAD:** `c1c57db` (non committato all'epoca)

**Scopo:** rendere `.env.local` sicuro per lo sviluppo.

**Azioni:**

1. Backup creato: `.env.production.local.backup` (coperto da `.gitignore`)
2. `.env.local` aggiornato: base da `.env.staging.local` + 7 variabili KORA-only preservate
3. Verifica: `azdn****` rimosso; `haqf****` confermato; `NEXT_PUBLIC_KORA_DEFAULT_ENV=live`

**Risultato:**

| File | Ambiente dopo |
|---|---|
| `.env.local` | STAGING `haqf****` 🟢 |
| `.env.production.local.backup` | PRODUCTION `azdn****` (backup) |

**File prodotti:** `docs/ENVIRONMENT_SAFETY_CHECK.md` aggiornato (sezione CC-00C)

---

## CC-01 — Freeze, Branch e Feature Flag KORA Link

**Data:** 2026-06-30
**Branch iniziale:** `main`
**HEAD iniziale:** `c1c57db`

**Scopo:** congelare lo stato stabile, creare branch separati per area di lavoro, introdurre feature flag KORA Link.

### Commit di freeze

I doc CC-00/CC-00B/CC-00C committati su `main`:

```
eaecdad  docs: CC-00/CC-00B/CC-00C environment baseline and safety check
```

### Tag creato

```
value-freeze-v1 → eaecdad
```

### Branch creati (tutti da `value-freeze-v1`)

| Branch | Scopo |
|---|---|
| `docs/consolidation` | Documentazione, consolidamento, CHANGELOG |
| `platform/readiness` | Platform readiness check e preparazione ambienti |
| `feat/kora-link-v1` | KORA Link v1 — NFC/QR (Future Vision, non attivo) |

### Feature flag KORA Link

**File:** `lib/constants/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  KORA_LINK_ENABLED: process.env.KORA_LINK_ENABLED === 'true',
} as const;
```

- Default: `false` (variabile assente → OFF)
- Non esposto come `NEXT_PUBLIC_` — server-side only
- Nessuna route o UI dipende da questo flag al momento
- Documentato in `.env.local.example`

### Conferme

- ✅ Nessun client Supabase usato
- ✅ Nessuna migration applicata
- ✅ Nessuna query eseguita
- ✅ Production non toccata
- ✅ Nessun merge in `main`
- ✅ Nessun segreto stampato
- ✅ `main` congelato a `value-freeze-v1` (`eaecdad`)

### Branch finale attivo

`docs/consolidation`

---

*Prossimo step: CC-02 — platform readiness*
