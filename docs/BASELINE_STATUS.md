# KORA — Baseline Tecnica (CC-00)

**Data/ora:** 2026-06-30 · ~12:50 UTC
**Branch:** `main`
**Commit:** `c1c57db8addb3a1a991736275fdb4fe9be256ca7`
**Scopo:** punto di partenza oggettivo prima di CC-01 e lavoro successivo.
**Autore controllo:** Claude Code (lettura/run senza modifiche)

---

## 1. Stato Git

```
Branch: main
HEAD:   c1c57db  docs: add CTO review for contribution source layer
Status: clean (solo supabase/.temp/ untracked — directory ignorata)
```

Nessun file staged, nessun file modificato non committato.

---

## 2. Stack Tecnico

| Componente | Versione / Stato |
|---|---|
| Node.js | v24.15.0 |
| Package manager | **npm** (package-lock.json presente; nessun yarn.lock, pnpm-lock, bun.lockb) |
| Next.js | 16.2.6 |
| React | 19.2.4 |
| TypeScript | via `npx tsc` (nessuno script `typecheck` in package.json) |
| Test runner | vitest 4.1.8 |
| Linter | ESLint (script `lint`) |
| Supabase CLI | 2.107.0 |
| Docker | **NON disponibile** (daemon non in esecuzione) |

---

## 3. Comandi Disponibili in `package.json`

| Script | Comando |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `test` | `vitest run` |

Non esiste uno script `typecheck` — il controllo TypeScript si esegue con `npx tsc --noEmit`.

---

## 4. Risultati Verifiche

### 4.1 TypeScript — `npx tsc --noEmit`

**Stato: VERDE**

```
(nessun output — nessun errore)
```

tsc passa senza errori.

---

### 4.2 Test — `npm run test`

**Stato: VERDE**

```
Test Files  191 passed (191)
Tests       8079 passed (8079)
Duration    4.04s
```

Tutte le suite passano. 8079 test in 191 file.

---

### 4.3 Lint — `npm run lint`

**Stato: GIALLO**

```
✖ 206 problems (118 errors, 88 warnings)
```

Il lint non blocca né il typecheck né il build (vedi §4.4 per la build).

**Errori per categoria:**

| Regola | Errori | Tipo |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | ~70 | Qualità — `any` esplicito in servizi e API route |
| `@typescript-eslint/no-require-imports` | ~23 | `require()` in test fixtures e script |
| `react/no-unescaped-entities` | ~15 | Apostrofi e virgolette italiane non escapate in JSX |
| `react-hooks` — setState in effect | ~8 | **Sostanziale** — setState sincrono in useEffect (cascading renders) |
| `react-compiler` — cannot create components during render | 3 | **Sostanziale** — componenti definiti dentro render |
| `react-compiler` — memoization skipped | 1 | Compiler warning |
| `prefer-const` | 1 | Triviale |
| `@typescript-eslint/ban-ts-comment` | 1 | `@ts-ignore` invece di `@ts-expect-error` |

**File coinvolti:** 107 file totali — 66 file runtime/app, 41 file test/fixture/script.

**File runtime con errori React sostanziali:**

| File | Errore |
|---|---|
| `app/admin/companies/new/_components/CreateLiveCompanyForm.tsx:80` | setState in effect |
| `app/admin/impact-units/_components/ImpactUnitsExplorer.tsx:134` | setState in effect |
| `app/my-kora/kora-space/page.tsx:340,524,565` | Cannot create components during render (3×) |
| `app/worker/dynamic-cv/_components/DynamicCVClient.tsx:73` | setState in effect |
| `components/admin/AdminSubmissionQueue.tsx:191` | setState in effect |
| `components/admin/CompanyWorkspacePanel.tsx:164` | setState in effect |
| `components/commons/AdminBookingModerationSection.tsx:100` | setState in effect |
| `components/hooks/useCountUp.ts:32` | setState in effect |
| `components/layout/Sidebar.tsx:306` | setState in effect |
| `app/worker/onboarding/_flow.tsx` | setState in effect |

> **Nota:** gli errori `react/no-unescaped-entities` derivano principalmente da testo italiano con apostrofi (`'`). Sono errori tecnici ma non causano bug a runtime — il rendering funziona.
>
> Gli errori `setState in effect` e `cannot create components during render` sono pattern React anti-corretti che possono causare render loop o instabilità in edge case. Non bloccano il build attuale.

---

### 4.4 Build — `npm run build`

**Stato: VERDE**

```
✓ Compiled successfully in 7.4s
161 static/dynamic routes generate senza errori TypeScript.
```

Il build Next.js 16 non esegue ESLint come step bloccante (ESLint è un check separato). Il build compila tutto in TypeScript strict senza errori.

> **Nota:** `next.config.ts` non ha `eslint: { ignoreDuringBuilds: true }` esplicito. In Next.js 15+/16, il comportamento predefinito è che ESLint è eseguito come step separato durante CI ma non blocca `next build` se passa tsc. Questo spiega perché la build passa nonostante 118 errori ESLint.

---

### 4.5 Dev Server

Non avviato — evitato per non bloccare la sessione. Il build ha compilato con successo, quindi il dev server è presumibilmente funzionante.

---

## 5. Dipendenze Node

**Stato: VERDE**

```
npm install --dry-run
→ up to date in 530ms (nessuna dipendenza mancante)
```

`node_modules` presente e allineato con `package-lock.json`.

---

## 6. Supabase CLI e Ambiente Local

### 6.1 Supabase CLI

**Stato: VERDE** (CLI disponibile)

```
supabase --version → 2.107.0
```

### 6.2 Docker

**Stato: ROSSO** (non disponibile)

```
docker: command not found
Docker daemon: not running / not installed
```

Supabase local stack richiede Docker. Senza Docker, `supabase start` non può essere eseguito.

### 6.3 Supabase Local

**Stato: ROSSO — non disponibile**

Due blocchi:
1. Docker non disponibile (vedi §6.2)
2. `supabase/config.toml` **assente** — il progetto non è inizializzato per Supabase local. Esistono solo le directory `supabase/migrations/`, `supabase/proposed/`, `supabase/rollback/`, `supabase/seed/`.

```
supabase status → "Cannot connect to Docker daemon"
```

### 6.4 Supabase Staging

**Stato: DISPONIBILE (con nota)**

Presente `.env.local` e `.env.staging.local`, entrambe con chiavi Supabase remote.

**Ambiente disponibile per sviluppo non-production:** il progetto Supabase usato da `.env.local` / `.env.staging.local`.

---

## 7. Variabili di Ambiente

### 7.1 File presenti

| File | Presente |
|---|---|
| `.env.local` | ✓ |
| `.env.local.example` | ✓ |
| `.env.staging.local` | ✓ |
| `.env.staging.passwords.local` | ✓ |

### 7.2 Chiavi in `.env.local`

```
KORA_ENABLE_TEST_ROUTES
KORA_GATE_2_STATUS
KORA_GATE_3_STATUS
KORA_GATE_5_STATUS
KORA_OPERATOR_SECRET
KORA_TEST_SEED_SECRET
KORA_TEST_USER_PASSWORD
NEXT_PUBLIC_KORA_DEFAULT_ENV=demo
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### 7.3 Chiavi in `.env.staging.local`

```
AUDIT_HASH_SALT
NEXT_PUBLIC_KORA_DEFAULT_ENV=live
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### 7.4 `.env.local` punta a produzione?

**Non confermabile con certezza automatica — GIALLO.**

- `NEXT_PUBLIC_SUPABASE_URL` punta a un endpoint Supabase **remote** (non localhost)
- `NEXT_PUBLIC_KORA_DEFAULT_ENV=demo` → suggerisce che sia il progetto staging/demo, non produzione
- L'URL non contiene la parola "staging" nel dominio (Supabase non differenzia staging/prod nel formato URL)
- Senza leggere l'URL completo (che contiene il project ID e sarebbe un segreto), non è possibile determinare automaticamente se sia staging o produzione

> **Azione richiesta:** confermare manualmente che `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` punta al progetto **staging** e non al progetto **production**. Se `.env.local` punta a produzione, deve essere aggiornato prima di qualsiasi sviluppo che usa il client Supabase.

### 7.5 `.env.staging.local`

`NEXT_PUBLIC_KORA_DEFAULT_ENV=live` — questo file è esplicitamente per l'ambiente staging live. Da usare solo per operazioni esplicitamente staging.

### 7.6 Variabili necessarie per local/staging

Le chiavi necessarie (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sono presenti in entrambi i file. Nessuna variabile critica mancante.

---

## 8. Dati Reali

**Confermato: nessun dato reale coinvolto.**

- Nessuna operazione su database reale eseguita in questo controllo
- Tutti i comandi eseguiti sono read-only (git status, npm scripts, tsc, vitest, eslint)
- Il database (anche staging) non è stato interrogato in questa sessione

---

## 9. Baseline Status Complessivo

| Area | Stato |
|---|---|
| TypeScript | 🟢 VERDE — tsc clean |
| Test suite | 🟢 VERDE — 8079/8079 passing |
| Build Next.js | 🟢 VERDE — compila senza errori |
| Dipendenze npm | 🟢 VERDE — up to date |
| ESLint | 🟡 GIALLO — 206 problemi (118 errori, 88 warning); non blocca tsc né build |
| Supabase CLI | 🟢 VERDE — 2.107.0 |
| Supabase local | 🔴 ROSSO — Docker non disponibile + config.toml assente |
| Supabase staging | 🟡 GIALLO — disponibile, ma confermare che .env.local non punta a produzione |
| .env.local → produzione | 🟡 GIALLO — non confermabile automaticamente; richiede conferma umana |
| Dati reali | 🟢 VERDE — nessuno coinvolto |
| Codice runtime modificato | 🟢 VERDE — nessuna modifica |

**Baseline complessiva: 🟡 GIALLA**

Posso procedere ma con le condizioni indicate di seguito.

---

## 10. Rischi Rilevati

| # | Rischio | Severità | Blocca CC-01? |
|---|---|---|---|
| R-1 | `.env.local` potrebbe puntare a produzione — richiede conferma | Alta | Sì (se confermato production) |
| R-2 | 8 istanze di `setState in useEffect` — possibili render loop in produzione | Media | No |
| R-3 | 3 istanze di `cannot create components during render` in `kora-space/page.tsx` | Media | No |
| R-4 | Supabase local non disponibile (Docker) — sviluppo DB solo via staging | Media | No (ma limita l'ambiente) |
| R-5 | `supabase/config.toml` assente — impossibile `supabase db diff`, `supabase gen types` localmente | Media | No |
| R-6 | 70 occorrenze `no-explicit-any` in servizi e API route — debito tecnico | Bassa | No |
| R-7 | Nessuno script `typecheck` in `package.json` — tsc non è nel CI standard | Bassa | No |
| R-8 | `SUPABASE_SERVICE_ROLE_KEY` presente in `.env.local` — se questo file punta a produzione, è una chiave service role di produzione non protetta | Alta | Dipende da R-1 |

---

## 11. Raccomandazione

### Posso procedere a CC-01?

**Sì, con una condizione bloccante:**

> **R-1 (bloccante):** Confermare manualmente che `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` punta al progetto **staging** (non production) prima di qualsiasi sessione che usa il Supabase client.

Se la conferma è positiva (staging), la baseline è sufficiente per procedere.

### Condizioni non bloccanti da tenere a mente

- **R-2/R-3 (lint React):** gli errori `setState in effect` e `cannot create components during render` andrebbero corretti prima del Pilot, ma non impediscono sviluppo ora.
- **R-4/R-5 (Supabase local):** tutto il lavoro DB si farà su staging. Questo è accettabile pre-Pilot ma limita l'isolamento.
- **R-6 (no-explicit-any):** debito tecnico da pianificare, non urgente.

---

## 12. Conferma Finale

- ✓ Nessun codice runtime modificato
- ✓ Nessuna migration applicata
- ✓ Nessun DB production toccato
- ✓ Nessun dato reale usato
- ✓ Nessun commit effettuato
- ✓ Nessun segreto / password / token / connection string stampato in output
