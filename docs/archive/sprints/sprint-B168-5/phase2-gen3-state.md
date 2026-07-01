# B168.5 Phase 2 — Gen 3 State Discovery

## Esistenti (4/8)

| Path | Status | Data type |
|---|---|---|
| `/admin/companies/[companyId]/users` | EXISTS (mock data — `tenantService`) | Demo synthetic |
| `/admin/companies/[companyId]/workforce` | EXISTS (mock data) | Demo synthetic |
| `/admin/companies/[companyId]/data-intake` | EXISTS (mock data — `companyDataIntakeService`) | Demo synthetic |
| `/admin/companies/[companyId]/onboarding` | EXISTS (mock data) | Demo synthetic |

## Da creare (4/8)

| Path | Componente sorgente | Tipo dati |
|---|---|---|
| `/admin/companies/[companyId]/workspace` | `CompanyWorkspacePanel` (Gen 1 live) | **Supabase real** |
| `/admin/companies/[companyId]/preview` | `CompanyLivePreviewPanel` (Gen 1 live) | **Supabase real** |
| `/admin/companies/[companyId]/evidence` | `CompanyEvidenceArchivePanel` (Gen 1 live) | **Supabase real** |
| `/admin/companies/[companyId]/submissions` | `AdminSubmissionQueue` (Gen 1 live) | **Supabase real** |

## Nota architetturale

I Gen 3 esistenti usano mock data services (`tenantService`, `companyDataIntakeService`).
I 4 Gen 3 da creare useranno i componenti Gen 1 con dati Supabase reali.
Questo crea una dualità: drill-in Gen 3 = mix di mock e live a seconda del tab.
È accettabile per Foundation Light (demo + live coesistono).
