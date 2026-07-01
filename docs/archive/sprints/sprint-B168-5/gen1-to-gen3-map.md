# Sprint B168.5 — Gen 1 → Gen 3 Mapping

**Data:** 2026-06-17

| Gen 1 flat route | Gen 3 drill-in | Esiste? | Azione Phase 2 |
|---|---|---|---|
| `/admin/company-evidence-archive` | `/admin/companies/[companyId]/evidence` | NO | Creare con _components di Gen 1 |
| `/admin/company-live-preview` | `/admin/companies/[companyId]/preview` | NO | Creare con _components di Gen 1 |
| `/admin/company-submissions` | `/admin/companies/[companyId]/submissions` | NO | Creare con _components di Gen 1 |
| `/admin/company-users` | `/admin/companies/[companyId]/users` | **SÌ** ✓ | Solo redirect stub Gen 1 |
| `/admin/company-workspace` | `/admin/companies/[companyId]/workspace` | NO | Creare con _components di Gen 1 |

## Gen 3 drill-in già esistenti

```
app/admin/companies/[companyId]/
  ├── page.tsx              ← drill-in detail (esiste)
  ├── data-intake/page.tsx  ← (esiste)
  ├── onboarding/page.tsx   ← (esiste)
  ├── users/page.tsx        ← (esiste)
  └── workforce/page.tsx    ← (esiste)
```

## Differenza Gen 1 vs Gen 3

Gen 1: `?tenantCode=xxx` query param → il componente seleziona internamente la company  
Gen 3: `/[companyId]/route` path param → la company è nel path, nessun selector interno

## Redirect stub pattern (Phase 2)

Le Gen 1 diventano 16 righe che reindirizzano a `/admin/companies`:

```typescript
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';

export default async function CompanyXxxPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');
  redirect('/admin/companies');
}
```

Tutti i link esistenti (API responses, sidebar, lib) continuano a funzionare ma atterrano sulla company list. B169 aggiornerà i link ai path drill-in corretti.

## Note sui _components

I _components delle Gen 1 **NON vengono eliminati** in Phase 2 — vengono importati dalle nuove Gen 3 drill-in pages. Eliminazione dei _components avverrà in B169 dopo che tutti i link sono stati aggiornati al path drill-in.
