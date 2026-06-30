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

---

## CC-02 — Platform Inventory

**Data:** 2026-06-30
**Branch:** `docs/consolidation`
**HEAD iniziale:** `f985fe2` (CC-01)

**Scopo:** fotografia oggettiva della piattaforma per CTO, investitori, clienti e team esterno.

**Chiarimento tag CC-01:** il commit `c1c57db` era la HEAD di `main` quando CC-01 è iniziato. Durante CC-01, i doc CC-00/CC-00B/CC-00C sono stati committati su `main` creando `eaecdad`. Il tag `value-freeze-v1` è stato apposto su `eaecdad` — ovvero sul freeze completo comprensivo di documentazione, non sul punto di partenza grezzo. Corretto: il freeze cattura lo stato documentato.

**Aree analizzate:** 25

**Distribuzione stato:**

| Stato | N. aree |
|---|---|
| LIVE | ~14 |
| PREVIEW / LIVE-AWARE | ~5 |
| DEMO-ONLY / LOCKED-SHELL / MOCKUP | ~8 |
| Migration non applicate | 3 (025 staging, 032, 033) |

**File prodotti:** `docs/KORA_PLATFORM_INVENTORY.md`

**Conferme:**
- ✅ Nessun codice runtime modificato
- ✅ Nessun Supabase client usato
- ✅ Produzione non toccata
- ✅ Nessun merge in `main`
- ✅ Nessun segreto stampato

---

## CC-03 — ARCHITECTURE.md Industriale

**Data:** 2026-06-30
**Branch:** `docs/consolidation`
**HEAD iniziale:** `1034a0d` (CC-02)

**Scopo:** documentazione architetturale operativa per CTO, investitori tecnici, team esterno.

**Chiarimento migration 032/033:**
- 032 (`032_contribution_atomic_attribution.sql`) — in `supabase/proposed/`, READY_FOR_REVIEW, NON in `migrations/`
- 033 (`033_initiative_adoption_source_model.sql`) — in `supabase/proposed/`, READY_FOR_REVIEW, NON in `migrations/`
- Ultima migration in `migrations/`: `031_revoke_public_execute_uef_definer_functions.sql`
- 032/033 sono occupati — non liberi per KORA Link
- Prossimo numero libero per KORA Link: **034**

**Sezioni create:** 16 (executive summary, repository map, runtime areas, roles, Supabase architecture, KORA Engine, data flow KORA Index, data flow PIB, data flow KORA Space → Contribution, Decision Pack, demo/live/mock boundary, technical quality, KORA Link integration, off-limits areas, investor/CTO narrative, 90-day roadmap)

**File prodotti:** `ARCHITECTURE.md`

**Conferme:**
- ✅ Nessun codice runtime modificato
- ✅ Nessun Supabase client usato
- ✅ Produzione non toccata
- ✅ Nessun merge in `main`
- ✅ Nessun segreto stampato

---

---

## CC-04 — DATA_MODEL.md

**Data:** 2026-06-30
**Branch:** `docs/consolidation`
**HEAD iniziale:** `79b8706` (CC-03)

**Scopo:** documentazione tecnica del modello dati KORA per CTO, reviewer esterno, team di sviluppo.

**Fonti lette (read-only):**
- `supabase/migrations/` — tutti i 30 file (001–031, no 029)
- `supabase/proposed/032_contribution_atomic_attribution.sql`
- `supabase/proposed/033_initiative_adoption_source_model.sql`
- `lib/supabase/types.ts` (542 righe, hand-written)

**Nessuna connessione a Supabase. Nessuna migration applicata. Produzione non toccata.**

**Struttura documento (16 sezioni):**

| Sezione | Contenuto |
|---------|-----------|
| 1 | Executive Summary — 2 principi architetturali, metriche schema |
| 2 | Schema Map — 7 schemi, purpose, chi accede, privacy level |
| 3 | Core Entity Map — tutte le tabelle per schema con migration di origine |
| 4 | Privacy Boundary Map — matrice 25×7 (tabella × ruolo) |
| 5 | Migration Map — 001–031 (applicate), 032–033 (proposed), 034–035 (pianificate) |
| 6 | RLS Model — meccanismo canonico, pattern policy, funzioni SECURITY DEFINER |
| 7 | Supabase Types — stato hand-written, 8 rischi di drift identificati |
| 8 | KORA Index Data Model — catena analytics 14-stage, immutabilità scoring |
| 9 | Worker PIB Data Model — catena personal, re-identificazione prevention |
| 10 | KORA Space / Contribution Data Model — commons chain cross-company |
| 11 | KORA Link v1 Candidate Model — 034/035, Modalità A/B, prerequisiti |
| 12 | Two-Track Event Model — Track 1 (IU→Index) vs Track 2 (Contribution) |
| 13 | Partner L4 Accreditation — EV correction factor, accreditamento schema |
| 14 | Wallet Hook — gov.kip_records escluso, Gate 5 blocca |
| 15 | Data Risks — 8 rischi identificati (DR-01 a DR-08) |
| 16 | Migration Roadmap — ordine apply 032/033/034/035 con prerequisiti |

**Chiarimento numerazione KORA Link:**
- 032 occupato: `032_contribution_atomic_attribution.sql` (proposed/)
- 033 occupato: `033_initiative_adoption_source_model.sql` (proposed/)
- **034** = primo numero libero → `034_kora_link_schema.sql`
- **035** = secondo numero libero → `035_kora_link_rls.sql`

**File prodotti:** `DATA_MODEL.md`

**Conferme:**
- ✅ Nessun codice runtime modificato
- ✅ Nessun Supabase client usato
- ✅ Produzione non toccata
- ✅ Nessun merge in `main`
- ✅ Nessun segreto stampato
- ✅ Nessuna migration applicata

---

*Consolidazione completata: CC-00 → CC-04*
