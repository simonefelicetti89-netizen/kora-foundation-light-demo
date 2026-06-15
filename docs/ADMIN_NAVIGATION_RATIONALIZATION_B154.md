# Admin Navigation Rationalization — B154

**Task:** B154-B  
**Date:** 2026-06-15  
**Author:** Founder decision, implementation B154-B  
**Status:** COMPLETED

---

## Motivazione

Prima di B154-B il sidebar KORA_ADMIN conteneva un unico gruppo "Live Operations" con 16 voci, senza distinzione tra flussi operativi. Il risultato era un elenco indifferenziato che non rispecchiava l'architettura del prodotto.

---

## Struttura sidebar post-B154-B

| Gruppo | Badge | Voci principali |
|--------|-------|-----------------|
| **Provisioning** | LIVE | Pilot Lifecycle, Company Console, Crea Azienda, Tenant Registry, Workforce Management, Worker Provisioning |
| **Intake & Review** | LIVE | Submission Queue, Data Intake, UEF Review, Evidence Archive |
| **Scoring & Output** | LIVE | Impact Units™, Data Lifecycle |
| **Monitoraggio** | LIVE | Trial Control Center |
| **Contenuti** | LIVE | KORA Space Moderazione, Worker Initiatives, Partner Map |
| **Worker Preview** | SYNTHETIC | /my-kora, Personal Impact Balance, KORA Space |
| **Demo & Preview** | SYNTHETIC | Anteprima Live Cockpit, Guided Demo ACME-001, Demo Scoring, + demo routes |
| **Founder** | FOUNDER | Validation Cockpit |
| **Future Vision** | ROADMAP | Future Vision |

---

## Modifiche al sidebar (Sidebar.tsx)

### Aggiunto al sidebar
- `/admin/workers` (Provisioning) — Worker Provisioning
- `/admin/worker-initiatives` (Contenuti) — Worker Initiatives
- `/admin/partners` (Contenuti) — Partner Map

### Rimosso dal sidebar
- `/admin/company-users` — stub 25 righe, superato da `[companyId]/users`
- `/admin/company-workspace` — contestuale, non voce di navigazione primaria

### Spostato
- `/admin/company-live-preview` — da "Live Operations" → "Demo & Preview"

### Rinominati (heading groups)
- `Live Operations` → `Provisioning`
- `Demo · Sintetico` → `Demo & Preview`
- `Founder Tools` → `Founder`

---

## Dead routes — non eliminate

Entrambe le dead route hanno test strutturali che leggono il file direttamente. Eliminazione bloccata.

| Route | Motivo blocco | Azione |
|-------|---------------|--------|
| `app/admin/preview/company/wallboard/page.tsx` | Referenziata da `app/company/wallboard/page.tsx` (href) + `tests/unit/b119-company-wallboard.test.ts` (readFile) | Commento DEPRECATED aggiunto |
| `app/admin/preview/partner/workspace/page.tsx` | Referenziata da `tests/unit/b127-partner-workspace.test.ts` (readFile) | Commento DEPRECATED aggiunto |

---

## Famiglie duplicate — commento aggiunto, non consolidate

| File | Classificazione |
|------|----------------|
| `app/admin/data-intake/page.tsx` | CANONICAL — entry point globale |
| `app/admin/companies/data-intake/page.tsx` | DUPLICATO — list-level |
| `app/admin/companies/new/page.tsx` | CANONICAL — creazione azienda |
| `app/admin/companies/setup/page.tsx` | DUPLICATO — setup wizard |
| `app/admin/companies/onboarding/page.tsx` | DUPLICATO — list-level onboarding |
| `app/admin/companies/[companyId]/onboarding/page.tsx` | CANONICAL — per-company onboarding |

Decisione founder: **non consolidare ancora**. Commenti aggiunti per futura disambiguazione.

---

## Test aggiornati

I seguenti test usavano i vecchi heading name e sono stati aggiornati:

| File | Cambiamento |
|------|-------------|
| `tests/unit/b95c-workforce-navigation.test.ts` | `'Live Operations'` → `'Provisioning'` |
| `tests/unit/b82b-admin-operational-clarity.test.ts` | `'Live Operations'` → `'Provisioning'`; `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b95b-admin-lifecycle.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b96b-founder-validation.test.ts` | `'Founder Tools'` → `'Founder'` |
| `tests/unit/b80b-boundary-clarity.test.ts` | `'Live Operations'` → `'Provisioning'`; `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b130-activation.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b130-pillars.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b130-reports.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b130-financial.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b130-status.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |
| `tests/unit/b129-fase3-demo-kora-index-pilot.test.ts` | `'Demo · Sintetico'` → `'Demo & Preview'` |

---

## Risultato verifica

- `npx tsc --noEmit` — 0 errori
- `npm test` — 4484/4484 test passano (109 file)
