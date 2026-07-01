# KORA — E2E Testing Guide

**Branch:** `platform/readiness`
**Setup:** CC-08 · 2026-06-30
**Runner:** Playwright 1.60.0 (già in devDependencies)
**Browser:** Chromium headless (già installato in cache)

---

## 1. Perché gli E2E sono stati aggiunti

KORA aveva zero test browser prima di CC-08. L'unica copertura era:
- vitest (unit + integration): 8079 test
- tsc --noEmit: clean
- next build: OK

Il rischio "vibecoding" identificato in CC-06 era alto: nessun test verificava i golden path
reali nel browser. Un CTO esterno o un investitore può chiedere "come verificate che la demo
funziona effettivamente?". La risposta corretta non è "abbiamo unit test" — è "abbiamo E2E
che girano sul branch di staging".

Gli E2E di KORA testano che:
- le pagine pubbliche rispondano senza crash
- il dev server parta correttamente
- gli elementi UI critici siano presenti e visibili
- nessun runtime error Next.js venga esposto all'utente

---

## 2. Come eseguirli

### Prerequisiti

Il dev server Next.js gira su `http://localhost:3000`. Playwright lo avvia automaticamente
se non è già in esecuzione.

Chromium è già installato. Se mancasse, eseguire:
```bash
npx playwright install chromium
```

### Comandi disponibili

```bash
# Run headless (default, CI-friendly)
npm run test:e2e

# Run headed — vedi il browser in esecuzione
npm run test:e2e:headed

# Run con UI interattiva (time-travel, debug step-by-step)
npm run test:e2e:ui

# Run singolo file
npx playwright test tests/e2e/kora-smoke.spec.ts

# Run singolo test per nome
npx playwright test --grep "S01"

# Genera report HTML
npx playwright test --reporter=html && npx playwright show-report
```

### Note sul dev server

- Se il dev server è già in esecuzione su `:3000`, Playwright lo riusa (locale).
- Se non è in esecuzione, Playwright lo avvia (`npm run dev`) e attende fino a 120 secondi.
- In CI (`CI=true`), Playwright avvia sempre un server fresco.
- Il dev server usa `.env.local` che punta a **staging** (`haqf****`). Non tocca produzione.

---

## 3. Script disponibili

| Script | Comando | Uso |
|--------|---------|-----|
| `npm run test:e2e` | `playwright test` | CI + locale headless |
| `npm run test:e2e:headed` | `playwright test --headed` | Debug visivo |
| `npm run test:e2e:ui` | `playwright test --ui` | Debug interattivo |

---

## 4. Test esistenti

### `tests/e2e/kora-smoke.spec.ts` — Public Pages Smoke (6 test)

| ID | Test | Cosa verifica | Stato |
|----|------|--------------|-------|
| S01 | Landing `/` | Risponde 200, mostra "Human Impact Intelligence Platform" | ✅ green |
| S02 | Login `/login` | Carica "Accedi a KORA", campo email visibile (`data-testid`) | ✅ green |
| S03 | Login `?role_hint=company` | Copy "Area Aziendale" visibile | ✅ green |
| S04 | Login `?role_hint=worker` | Copy "Il tuo spazio privato KORA" visibile | ✅ green |
| S05 | Request access `/request-access` | Pagina pubblica info, heading e testid presenti | ✅ green |
| S06 | Demo `/demo` | Risponde < 500, nessun runtime error, "KORA" in body | ✅ green |

**Tutti e 6 green su Chromium headless** — tempo totale ~6 secondi (con server già caldo).

---

## 5. Test mancanti

### Mancanti — golden path autenticati (richiedono credenziali staging reali)

Questi test non sono stati implementati ora perché richiedono sessioni autenticate.
Implementare con account di test dedicati e `PLAYWRIGHT_BASE_URL` puntato a staging.

| ID | Flow | Prerequisiti |
|----|------|-------------|
| E2E-01 | Company login → `/company/workspace` → KORA Index visible | Account company su staging, `test:e2e:staging` |
| E2E-02 | Company → `/company/commons` → iniziativa pubblicata | Account company + iniziativa sintetica |
| E2E-03 | Worker login → `/worker/workspace` → My KORA overview | Account worker su staging |
| E2E-04 | Worker → `/my-kora/kora-space` → demo mode visible | Account worker |
| E2E-05 | Admin → provisioning worker → worker attiva account | Account admin + worker fresh |
| E2E-06 | `/link/[token-invalido]` → errore generico non espone dettagli | KORA Link implementato (Gate 3) |

### Mancanti — demo flow non autenticati (implementabili ora)

| ID | Flow | Note |
|----|------|-------|
| D01 | `/demo` → navigazione verso `/company/kora-index` | Richiede che demo page sia accessibile a utenti non auth |
| D02 | `/demo/benchmarks` → carica senza 500 | Demo sintetica, no auth |
| D03 | `/demo/portfolio` → carica senza 500 | Demo sintetica, no auth |

---

## 6. Golden path futuri (CC-09+)

### Golden Path con autenticazione staging

Per implementare i golden path autenticati:

```typescript
// tests/e2e/helpers/auth.ts
import { Page } from 'playwright/test';

export async function loginAsCompany(page: Page) {
  await page.goto('/login?role_hint=company');
  await page.getByTestId('login-email-input').fill(process.env.E2E_COMPANY_EMAIL!);
  await page.locator('#password').fill(process.env.E2E_COMPANY_PASSWORD!);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/company/workspace');
}
```

Variabili d'ambiente necessarie (non in `.env.local`, mai committate):
- `E2E_COMPANY_EMAIL` — account company di test su staging
- `E2E_COMPANY_PASSWORD` — password account di test
- `E2E_WORKER_EMAIL` — account worker di test
- `E2E_WORKER_PASSWORD` — password worker di test
- `PLAYWRIGHT_BASE_URL` — URL staging (opzionale, override di `baseURL`)

### KORA Link (post Gate 3)

```typescript
// tests/e2e/kora-link-smoke.spec.ts — da creare post Gate 3
test('E2E-06 · /link/[token-invalido] — errore generico, no stack trace', async ({ page }) => {
  await page.goto('/link/INVALID_TOKEN_12345');
  await expect(page.locator('body')).not.toContainText('at Object.');
  await expect(page.locator('body')).not.toContainText('stack trace');
  // Deve mostrare un errore generico, non i dettagli
});
```

---

## 7. Limiti attuali

| Limite | Impatto | Quando risolto |
|--------|---------|---------------|
| Nessun test autenticato | Non verifica golden path company/worker | CC-09 con account staging dedicati |
| Solo pagine pubbliche | Non verifica KORA Index, My KORA, KORA Space | CC-09+ |
| Solo Chromium | Non testa Firefox/Safari | Basso rischio, aggiungere in CC-10 |
| No mobile viewport | Non verifica responsive | Aggiungere test mobile viewport |
| No CI integration | Playwright non è in pipeline CI/CD | CC-10 — aggiungere GitHub Actions step |
| No screenshot baseline | No visual regression | Aggiungere se necessario post-pilot |

---

## 8. Regola: nessun dato reale

I test E2E **non usano mai**:
- credenziali di produzione
- dati reali di aziende o lavoratori
- connessioni dirette a Supabase produzione
- account reali al di fuori di account di test dedicati su staging

Se un test richiede dati reali, documenta il golden path come "futuro" e lascia un placeholder.

---

## 9. Come usare staging senza produzione

Il dev server (`npm run dev`) usa `.env.local` che punta a **staging** (`haqf****`).

Per run contro staging remoto senza avviare dev server locale:
```bash
PLAYWRIGHT_BASE_URL=https://kora-staging.vercel.app npm run test:e2e
```

La config Playwright legge `baseURL` da `playwright.config.ts` ma può essere overridata via env.
Aggiungere in `playwright.config.ts`:
```typescript
use: {
  baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
}
```

**Non usare mai l'URL di produzione** (`azdn****`) per i test E2E.

---

## 10. Troubleshooting

### Browser non installato

```
Error: Executable doesn't exist at ...
```

Soluzione:
```bash
npx playwright install chromium
```

### Porta 3000 già occupata

```
Error: listen EADDRINUSE :::3000
```

Soluzione: chiudere il processo esistente o cambiare porta in `playwright.config.ts`:
```typescript
webServer: { command: 'npm run dev -- --port 3001', url: 'http://localhost:3001' }
```

### Test fallisce con timeout

Aumentare `timeout` in `playwright.config.ts` o nel singolo test:
```typescript
test('S01 ...', async ({ page }) => {
  test.setTimeout(60_000);
  // ...
});
```

### Dev server non parte

Verificare che `npm run dev` parta correttamente da CLI prima di eseguire Playwright.
Controllare `.env.local` — deve esistere con le variabili Supabase staging.

---

*E2E_TESTING.md — CC-08 · Branch `platform/readiness`*
*Aggiornare questo documento a ogni nuovo test E2E aggiunto.*
