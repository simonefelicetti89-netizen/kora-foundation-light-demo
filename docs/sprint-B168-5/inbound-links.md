# Sprint B168.5 — Inbound Link Map

**Data:** 2026-06-17  
**Scopo:** Mappa completa degli inbound link verso i 5 file da eliminare (Phase 1) e i 5 Gen 1 flat pages (Phase 2).

---

## 1. File da eliminare (Phase 1)

### 1.1 `/admin/companies/setup`

| File sorgente | Tipo | Azione |
|---|---|---|
| `app/admin/companies/[companyId]/page.tsx:636` | Link | Cambia → `/admin/companies/new` |
| `app/admin/companies/[companyId]/data-intake/page.tsx:246` | Link | Cambia → `/admin/companies/new` |
| `app/admin/companies/[companyId]/users/page.tsx:186` | Link | Cambia → `/admin/companies/new` |
| `app/admin/companies/onboarding/page.tsx:267` | Link | Ignorare — pagina stessa viene eliminata |
| `app/company/setup/page.tsx:5` | Commento | Nessuna azione |
| `tests/unit/b117-platform-entry-role-reset.test.ts:37` | readFile | Rimuovere il readFile + test che lo usa |
| `tests/unit/b99-provision-credentials.test.ts:206` | readFile | Rimuovere readFile + describe block; aggiungere test su `companies/new` |

### 1.2 `/admin/companies/onboarding` (flat — non la dynamic route)

| File sorgente | Tipo | Azione |
|---|---|---|
| `app/admin/companies/workforce-baseline/page.tsx:329` | Link | Cambia → `/admin/companies` (senza ID — dinamico non risolvibile senza contesto) |
| `app/admin/companies/[companyId]/onboarding/page.tsx:1` | Commento | Nessuna azione (commento storico) |

### 1.3 `/admin/companies/data-intake` (flat)

| File sorgente | Tipo | Azione |
|---|---|---|
| `app/company/data/upload/page.tsx:697` | Link | Cambia → `/admin/data-intake` (canonical global) |
| `components/demo/PipelineConnectorBanner.tsx:12` | href | Cambia → `/admin/data-intake` |
| `app/admin/data-intake/page.tsx:1` | Commento storico | Nessuna azione |

### 1.4 `/admin/preview/company/wallboard`

| File sorgente | Tipo | Azione |
|---|---|---|
| `app/company/wallboard/page.tsx:46` | `<a href=...>` | Rimuovere il link (o cambiare → `/admin`) |
| `tests/unit/b119-company-wallboard.test.ts:32` | readFile | Rimuovere readFile + describe block section 15 (3 test) |

### 1.5 `/admin/preview/partner/workspace`

| File sorgente | Tipo | Azione |
|---|---|---|
| `app/partner/layout.tsx:9` | Commento | Nessuna azione |
| `tests/unit/b127-partner-workspace.test.ts:45` | readFile | Rimuovere readFile + describe block admin preview |
| `tests/unit/b127-partner-workspace.test.ts:322` | fileExists check | Rimuovere |

---

## 2. Gen 1 flat pages — redirect stubs (Phase 2)

Questi file hanno decine di inbound link (sidebar, API responses, lib) — si usano redirect stubs anziché aggiornare tutti i link.

### 2.1 `/admin/company-evidence-archive`

Inbound: Sidebar.tsx:104, CompanyLivePreviewPanel.tsx:603, company-console API:292 + altri  
Stub redirect: `/admin/companies` (utente seleziona company, poi naviga a evidence)  
Gen 3 target: `companies/[companyId]/evidence` → DA CREARE

### 2.2 `/admin/company-live-preview`

Inbound: admin/page.tsx:229, TenantOnboardingPanel.tsx:298, Sidebar.tsx:151, live-company API:411, company-console API:293 + altri (il più linkato)  
Stub redirect: `/admin/companies`  
Gen 3 target: `companies/[companyId]/preview` → DA CREARE

### 2.3 `/admin/company-submissions`

Inbound: admin/page.tsx:232, AcmeDemoHub:338, pipeline/page.tsx:295, Sidebar.tsx:101, company-console API:296 + altri  
Stub redirect: `/admin/companies`  
Gen 3 target: `companies/[companyId]/submissions` → DA CREARE

### 2.4 `/admin/company-users`

Inbound: MOLTI (API routes, PilotOnboardingChecklist, Sidebar, lib/permissions, feature-discovery, companies/setup, companies/[companyId]/users)  
Stub redirect: `/admin/companies`  
Gen 3 target: `companies/[companyId]/users` → GIÀ ESISTE ✓

### 2.5 `/admin/company-workspace`

Inbound: MOLTI (TenantOnboardingPanel, CompanyLivePreviewPanel, api/admin/live-company, company-console, company-submissions, Sidebar, lib/permissions, feature-discovery)  
Stub redirect: `/admin/companies`  
Gen 3 target: `companies/[companyId]/workspace` → DA CREARE

---

## 3. Demo layout — guard esistente (impatto su Phase 3)

**SCOPERTA:** `app/demo/layout.tsx` già usa `requireDemoAccess()` su TUTTE le 16 route.

Phase 3 richiede un refactor architetturale:
1. Rimuovere il guard dal demo layout (diventa solo styling + BoundaryBadge)
2. Aggiungere `requireDemoAccess()` per-page alle 11 route gated
3. Le 5 route pubbliche restano senza guard

**5 PUBBLICHE** (no guard post-Phase 3):
`/demo`, `/demo/guide`, `/demo/gtm`, `/demo/benchmarks`, `/demo/future-vision`

**11 GATED** (aggiungere guard per-page):
`/demo/company/kora-index`, `/demo/company/financial`, `/demo/company/pillars`,
`/demo/company/status`, `/demo/company/activation`, `/demo/company/reports`,
`/demo/index-registry`, `/demo/portfolio`, `/demo/network`, `/demo/advisor`,
`/demo/ai-onboarding`
