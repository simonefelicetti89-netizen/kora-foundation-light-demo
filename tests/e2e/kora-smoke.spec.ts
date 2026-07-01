/**
 * KORA E2E Smoke Tests — Public Pages
 *
 * Scope: pagine pubbliche accessibili senza autenticazione.
 * Nessun dato reale. Nessuna credenziale. Nessuna chiamata diretta a Supabase.
 *
 * Cosa testa:
 *   - le pagine pubbliche rispondono con status < 500
 *   - nessun runtime error Next.js visibile
 *   - elementi UI stabili presenti (heading, testid, campo email)
 *
 * Cosa NON testa (golden path futuri con auth):
 *   - login autenticato con credenziali reali
 *   - company workspace → KORA Index
 *   - worker workspace → My KORA
 *   - admin provisioning
 *   - KORA Space worker
 *   - KORA Link /link/[token]
 *
 * Dev server: avviato automaticamente da Playwright su http://localhost:3000
 * Browser: Chromium headless
 */

import { test, expect, type Page } from 'playwright/test';

const RUNTIME_ERROR_PATTERNS = [
  'Application error: a client-side exception has occurred',
  'Unhandled Runtime Error',
  'Internal Server Error',
];

async function assertNoRuntimeError(page: Page) {
  const content = await page.content();
  for (const pattern of RUNTIME_ERROR_PATTERNS) {
    expect(content, `Runtime error trovato: "${pattern}"`).not.toContain(pattern);
  }
}

// ── Smoke: Public Pages ───────────────────────────────────────────────────────

test.describe('KORA — Public Pages Smoke', () => {

  test('S01 · Landing / — risponde e mostra contenuto KORA', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status(), 'landing page status').toBeLessThan(500);
    await expect(page.getByText('Human Impact Intelligence Platform').first()).toBeVisible();
    await assertNoRuntimeError(page);
  });

  test('S02 · Login page — carica heading Accedi a KORA e campo email', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status(), 'login page status').toBeLessThan(500);
    await expect(page.getByText('Accedi a KORA')).toBeVisible();
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await assertNoRuntimeError(page);
  });

  test('S03 · Login role_hint=company — mostra copy Area Aziendale', async ({ page }) => {
    await page.goto('/login?role_hint=company');
    await expect(page.getByText('Area Aziendale')).toBeVisible();
    await assertNoRuntimeError(page);
  });

  test('S04 · Login role_hint=worker — mostra copy spazio privato', async ({ page }) => {
    await page.goto('/login?role_hint=worker');
    await expect(page.getByText('Il tuo spazio privato KORA')).toBeVisible();
    await assertNoRuntimeError(page);
  });

  test('S05 · Request access — carica pagina informativa pubblica', async ({ page }) => {
    const response = await page.goto('/request-access');
    expect(response?.status(), 'request-access status').toBeLessThan(500);
    await expect(page.getByTestId('request-access-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Richiedi accesso' })).toBeVisible();
    await assertNoRuntimeError(page);
  });

  test('S06 · Demo page — risponde senza 500 (redirect login OK)', async ({ page }) => {
    // /demo è accessibile ai visitatori demo e agli utenti KORA_ADMIN.
    // Per un visitatore non autenticato può avvenire un redirect a /login — è comportamento corretto.
    const response = await page.goto('/demo');
    const status = response?.status() ?? 0;
    expect(status, 'demo page non deve rispondere 500').toBeLessThan(500);
    await assertNoRuntimeError(page);
    // Sia /demo che l'eventuale redirect a /login contengono "KORA"
    await expect(page.locator('body')).toContainText('KORA');
  });

});
