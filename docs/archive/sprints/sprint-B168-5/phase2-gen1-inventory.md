# B168.5 Phase 2 — Gen 1 Inventory

## /admin/company-workspace

- Componente: `CompanyWorkspacePanel({ userEmail, userRole })`
- Selector interno: sì — `useState(tenantCode)` con `<select>` multi-tenant
- Identificatore tenant: `tenantCode` (stringa, es. "ACME-001")
- API: `/api/admin/company-workspace?tenantCode=...&reportingPeriod=...`
- Refactor: aggiungere `initialTenantCode?: string` prop
- Inbound links:
  - `app/api/admin/live-company/route.ts:409` — URL con `?tenantCode=...&reportingPeriod=...`
  - `app/api/admin/company-console/route.ts:290` — URL con `?tenantCode=...`
  - Sidebar: NON ha link diretto a company-workspace

## /admin/company-live-preview

- Componente: `CompanyLivePreviewPanel()` (nessun prop)
- Selector interno: sì — `useState(tenantCode)` con `<select>` multi-tenant
- Identificatore tenant: `tenantCode`
- API: `/api/admin/company-live-preview?tenantCode=...`
- Refactor: aggiungere `initialTenantCode?: string` prop
- Inbound links:
  - `app/admin/page.tsx:229` — link statico `/admin/company-live-preview`
  - `components/layout/Sidebar.tsx:151` — `href: '/admin/company-live-preview'`
  - `app/api/admin/live-company/route.ts:411` — URL con `?tenantCode=...`
  - `app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel.tsx:643` — link con `?tenantCode=...`

## /admin/company-evidence-archive

- Componente: `CompanyEvidenceArchivePanel()` (nessun prop)
- Selector interno: sì — MA già usa `useSearchParams` per pre-seedare da URL
  - `const [TENANT, setTENANT] = useState(searchParams?.get('tenantCode') ?? '')`
- Identificatore tenant: `tenantCode`
- API: `/api/admin/company-evidence-archive?tenantCode=...`
- Refactor: aggiungere `initialTenantCode?: string` prop (fallback su searchParams)
- Inbound links:
  - `components/layout/Sidebar.tsx:104` — `href: '/admin/company-evidence-archive'`
  - `app/admin/company-live-preview/_components/CompanyLivePreviewPanel.tsx:603` — link con `?tenantCode=...`

## /admin/company-submissions

- Componente: `AdminSubmissionQueue({ userEmail })`
- Selector interno: NO — mostra TUTTE le submission di tutti i tenant, con `statusFilter`
- Identificatore tenant: nessuno (all-tenants view)
- API: `/api/admin/company-submissions` (no tenant filter)
- Refactor: aggiungere `initialTenantCode?: string` — aggiunge filtro tenant inline
- Inbound links:
  - `app/admin/page.tsx:232` — link statico
  - `app/admin/pipeline/page.tsx:295` — link statico
  - `components/layout/Sidebar.tsx:101` — sidebar

## /admin/company-users

- Componente: `CompanyUserProvisioningPanel({ userEmail, userRole })`
- Selector interno: sì — `useState(tenantId)` con `<select>` per tenantId (UUID)
- Identificatore tenant: `tenantId` (UUID — NON tenantCode)
- API: `/api/admin/company-users?tenantId=...` (POST/PATCH body: `{ tenantId }`)
- Gen 3 già esiste: `/admin/companies/[companyId]/users` (usa mock data)
- Refactor: NON refactorare per questo sprint — redirect a companies list
- Inbound links:
  - `app/admin/companies/[companyId]/users/page.tsx:126,180` — self-referencing link Back
  - `app/api/admin/live-company/route.ts:320` — URL con `?tenantId=...` (UUID)
  - `app/api/admin/company-console/route.ts:291` — URL con `?tenantId=...`
  - `app/api/admin/live-company/route.ts:342` — testo errore warning

## Decisione companyId = tenantCode

Il parametro `[companyId]` nel path drill-in COINCIDE con `tenantCode` (es. "ACME-001"),
non con l'UUID Supabase. Questo allinea con i Gen 3 esistenti che usano `companyId` come chiave
nei mock services.

Conseguenza per `/admin/company-users?tenantId=<uuid>`:
Il redirect non può risolvere UUID → tenantCode senza DB call.
Redirect a `/admin/companies?from=users` (senza companyId specifico).
Se la call ha `?tenantCode=...` (raro): redirect a `/admin/companies/${tenantCode}/users`.
