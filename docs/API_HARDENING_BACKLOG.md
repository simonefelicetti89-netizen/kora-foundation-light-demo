# KORA — API Hardening Backlog

**Branch:** `platform/readiness`
**Generato:** CC-10 · 2026-06-30
**Fonte:** `docs/API_ROUTE_AUTH_MATRIX.md`
**Scope:** Foundation Light staging → produzione → pilot real data → KORA Link v1

---

## P0 — Must fix before real data

Queste issue bloccano l'introduzione di dati aziendali o worker reali.

---

### H-001 — `commons/posts` e `commons/posts/[id]`: service client per path non-admin ✅ RISOLTO CC-11

**Finding:** F-001 (see API_ROUTE_AUTH_MATRIX.md §10)

**Stato:** **RISOLTO in CC-11** (2026-06-30)

**Fix applicato:**
- `app/api/commons/posts/route.ts` (GET e POST): `getSupabaseServiceClient()` → `await getSupabaseServerClient()`
- `app/api/commons/posts/[id]/route.ts` (PATCH): idem
- `app/api/commons/initiatives/route.ts` — già corretto prima di CC-11; matrice CC-10 errata

**RLS backstop confermato (mig 013):**
- `commons_post_kora_admin_all` FOR ALL
- `commons_post_company_admin_select/insert/update` con `tenant_id = kora.tenant_id()`
- `commons_post_worker_published_select` con `tenant_id + status='published'`

**Cambiamento comportamentale documentato:**
- PATCH company su post cross-tenant: da 403 → 404 (più sicuro — non rivela esistenza post altrui)
- GET/POST: comportamento identico; la RLS rinforza a DB level quello che il codice già faceva applicativamente

**Test:** tsc clean + 8079/8079 vitest post-fix.

---

### H-002 — Direct `createClient` con service role key ✅ RISOLTO CC-11

**Finding:** F-002

**Stato:** **RISOLTO in CC-11** (2026-06-30)

**Fix applicato:**
- `app/api/admin/data-intake/accept/route.ts`: rimosso `import { createClient } from '@supabase/supabase-js'` e `import type { Database }`, sostituito con `import { getSupabaseServiceClient } from '@/lib/supabase/server'`; istanza diretta → `const db = getSupabaseServiceClient()`
- `app/api/admin/decision-pack/status/route.ts`: idem

**Test:** tsc clean + 8079/8079 vitest post-fix. Comportamento identico — stesso client, stesse opzioni, stessa key.

---

## P1 — Should fix before client pilot

Queste issue non bloccano staging ma sono richieste prima di una demo con dati reali o un pilot commerciale.

---

### H-003 — Zero rate limiting

**Finding:** F-003

**Problema:**
Nessuna delle 84 route ha rate limiting. Le route più rischiose:

| Route | Perché critica |
|-------|---------------|
| `POST /api/admin/workers/provision` | Chiama `auth.admin.inviteUserByEmail` — abuso crea spam email |
| `POST /api/admin/companies/provision` | Crea tenant Supabase — abuso crea noise nel DB |
| `POST /api/admin/data-intake/accept` | Esegue parsing + write batch — costoso CPU/DB |
| `POST /api/admin/scoring/run-approved-batch` | Esegue scoring live — costoso CPU |
| `POST /api/admin/live-company` | Compound operation (tenant + auth user + baseline) |

**Approccio consigliato:**
Aggiungere rate limiting a livello di Edge Middleware (Vercel Edge Config + Upstash Redis) piuttosto che in ogni route individualmente.

**Claude Code:** NO — richiede:
1. Decisione su soluzione (Upstash/Redis vs Vercel Edge vs in-memory)
2. Modifica a `middleware.ts` (escluso da CC) o nuovo middleware layer
3. Configurazione Redis (infrastruttura)

**CTO review:** SÌ — decisione architetturale.
**Timing:** prima di pilot con real data.

---

### H-004 — Zero schema validation strutturata (Zod) — PARZIALMENTE RISOLTO CC-12

**Finding:** F-004

**Stato:** **PARZIALMENTE RISOLTO in CC-12** (2026-06-30). Zod installato (v4.4.3). 4 route hardened.

**Route hardened in CC-12:**
- ✅ `POST /api/admin/workers/provision` — `ProvisionWorkerSchema`: tenantCode min(1)+max(32), email format, workerRef optional
- ✅ `POST /api/admin/companies/provision` — `ProvisionCompanySchema`: company_name required, admin_email format, optional fields
- ✅ `POST /api/admin/scoring/run-approved-batch` — `RunBatchSchema`: batchId required, workforcePopulation optional number
- ✅ `POST /api/worker/initiatives/[id]/interest` — `InterestSchema`: status z.enum (3 valori), private_note max(500)

**Route escluse da CC-12 (rimandare a CC futuro):**
- `POST /api/admin/live-company` — 400+ righe, payload > 10 campi, complesso
- `POST /api/admin/data-intake/accept` — multipart, payload costoso, scope adiacente
- `POST /api/admin/workers/provision` (KORA Link) — non implementato
- GET routes con query param — H-006, gestire separatamente

**Invarianti rispettate:**
- Output per payload valido identico — solo input validation cambia
- Auth guard non modificata
- runKoraPipeline non toccata
- Privacy: InterestSchema esclude worker_id/tenant_id da body per costruzione

**Test:** `tests/unit/cc12-zod-validation.test.ts` — 25 test, 25/25 green. `b109b-participation-privacy.test.ts` aggiornato. Suite completa: 8104/8104 green.

---

### H-005 — `auth/logout` senza guard esplicita

**Finding:** F-005

**Problema:**
`/api/auth/logout` non ha `requireXxx`. Chiama `getUser()` (può ritornare null) poi `signOut()` poi redirect.

**Fix (3 righe):**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.redirect(new URL('/company/login', request.url));
const koraRole = user.app_metadata?.kora_role as string | undefined;
await supabase.auth.signOut();
// ... redirect
```

**Claude Code:** SÌ.
**Rischio se non fixato:** minimo (signOut su no-session è no-op).

---

### H-006 — UUID validation assente su tenantId query param ✅ RISOLTO CC-13

**Finding:** F-007

**Stato:** **RISOLTO in CC-13** (2026-06-30)

**Route hardened:**
- ✅ `GET /api/admin/impact-units?tenantId=<uuid>` — `z.string().uuid().safeParse()`
- ✅ `GET /api/admin/worker-initiatives?tenantId=<uuid>` — idem
- ✅ `GET /api/admin/company-users?tenantId=<uuid>` — idem (aggiunta vs backlog originale)
- ✅ `GET /api/admin/workers/list?tenantCode=<string>` — `z.string().min(1).max(40).safeParse()`

**Pattern applicato:**
```typescript
import { z } from 'zod';
const tenantIdParsed = z.string().uuid().safeParse(searchParams.get('tenantId'));
if (!tenantIdParsed.success) {
  return NextResponse.json({ error: 'tenantId non valido.' }, { status: 400 });
}
const tenantId = tenantIdParsed.data;
```

**Invarianti rispettate:**
- Output per param valido identico — solo validazione input aggiunta
- Guard auth non modificate
- Query DB invariate (ricevono lo stesso valore, ora validato)
- Errore generico privacy-safe — raw value non esposto

**Test:** `tests/unit/cc13-query-param-validation.test.ts` — 22/22 green. Suite: 8126/8126.

**Claude Code:** SÌ.

---

### H-007 — Formato errori non standardizzato

**Finding:** F-006

**Problema:** mix di `{ error: 'msg' }`, `{ ok: false, error: 'msg' }`, `{ message: 'msg' }`.

**Convenzione proposta:**
```typescript
// Standard error shape per KORA API
interface KoraErrorResponse {
  ok:     false;
  error:  string;
  code?:  string;  // machine-readable (es. 'UNAUTHORIZED', 'TENANT_NOT_FOUND')
}

interface KoraSuccessResponse<T> {
  ok:   true;
  data: T;
}
```

**Claude Code:** SÌ (meccanico, molti file).
**Timing:** da fare prima di integrazioni partner o client SDK.

---

## P2 — Should fix before KORA Link

Queste issue sono specificamente richieste per abilitare KORA Link v1 in sicurezza.

---

### H-008 — Pattern route pubblica mancante

**Problema:**
KORA Link richiede una route pubblica (`GET /api/link/[token]` o `GET /link/[token]`) accessibile senza sessione. Non esiste alcun template o pattern per route pubbliche sicure in KORA.

**Requisiti per la route pubblica:**
```typescript
// Pattern: public route sicura
export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  // 1. Validate token format (no DB query for invalid format)
  const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);
  const tokenResult = tokenSchema.safeParse(params.token);
  if (!tokenResult.success) {
    return NextResponse.json({ ok: false, error: 'Link non valido.' }, { status: 400 });
  }

  // 2. Lookup token (server-side, service role OK here)
  const db = getSupabaseServiceClient();
  const { data: linkRecord } = await db
    .schema('personal') // or appropriate schema
    .from('kora_link')
    .select('worker_identity_id, tenant_id, status, expires_at')
    .eq('token', tokenResult.data)
    .single();

  // 3. Check revoked/expired (timing-safe: same response as not-found)
  if (!linkRecord || linkRecord.status !== 'active' || new Date(linkRecord.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: 'Link non valido o scaduto.' }, { status: 404 });
  }

  // 4. Return NO PII — only safe activation data
  return NextResponse.json({
    ok: true,
    data: {
      activation_pillar: linkRecord.pillar,
      event_ref:         linkRecord.event_ref,
      // NO: worker_id, tenant_id, email, nome
    }
  });
}
```

**Claude Code:** SÌ parzialmente (struttura route). Rate limiting e audit: CTO review.

---

### H-009 — Rate limiting per route pubblica KORA Link

**Problema:**
Una route pubblica senza rate limiting è esposta a scan di token e DoS.

**Requisiti minimi:**
- Max 10 req/IP/minuto su `GET /link/[token]`
- Max 5 req/IP/minuto su `POST /api/worker/kora-link/activate`
- Blocco automatico IP dopo N errori in M minuti

**Claude Code:** NO — richiede infrastruttura rate limiting (H-003 prerequisito).
**CTO review:** SÌ — security decision.

---

### H-010 — Endpoint partner/event registration per KORA Link

**Richiede:**
1. `POST /api/admin/kora-link` — KORA_ADMIN genera token link
2. `POST /api/company/kora-link/revoke` — COMPANY_ADMIN revoca token
3. `POST /api/worker/kora-link/activate` — WORKER attiva scan

**Note di progettazione:**
- I token sono UUID v4 o CUID2 (non sequenziali — no enumeration attack)
- `activate` richiede WORKER session (no public activation)
- Revoca è soft (status=revoked, non delete — per audit trail)
- Ogni attivazione crea un record in `audit.audit_log`

**Claude Code:** SÌ (struttura route, se Gate 2 e Gate 3 chiusi).
**Gate blocker:** Gate 3 (legal/privacy) deve chiudersi prima di endpoint live.

---

### H-011 — RLS negative tests per KORA Link

**Problema:**
Prima di KORA Link, servono test che verificano che le RLS policy blocchino:
1. Un worker che vede il token di un altro worker
2. Un company admin che vede token non del proprio tenant
3. Un unauthenticated user che chiama endpoint protetti

**Claude Code:** SÌ (vitest + test infrastruttura). Richiede schema DB definito (post Gate 2).

---

## P3 — Nice to have

### H-012 — Request correlation ID

**Problema:** nessun `X-Request-ID` header per correlare log.
**Fix:** aggiungere in `middleware.ts` (un'aggiunta, non modifica logica).
**Claude Code:** SÌ (se middleware scope aperto).

### H-013 — API versioning

**Problema:** nessun prefisso versione.
**Fix:** stabilire convenzione (header vs path) prima di partner API.
**Claude Code:** NO — decisione architetturale.

### H-014 — Documentazione OpenAPI/Swagger

**Problema:** nessuna specifica API formale.
**Fix:** generare da TSDoc/Zod schema.
**Claude Code:** SÌ (dopo H-004 Zod).

### H-015 — Structured logging

**Problema:** `console.log` / `console.error` non strutturati in molte route.
**Fix:** logger strutturato (pino) con `requestId`, `tenantId`, `userId` (hash).
**Claude Code:** SÌ parzialmente.

---

## KORA Link API Readiness

Valutazione per KORA Link v1 (futura):

| Endpoint | Status | Prerequisiti | Gate |
|----------|--------|-------------|------|
| `GET /link/[token]` (public) | ❌ Non implementato | H-008, H-009, H-011 | Gate 3 |
| `POST /api/admin/kora-link` | ❌ Non implementato | H-010 | Gate 2 + 3 |
| `POST /api/company/kora-link/revoke` | ❌ Non implementato | H-010 | Gate 2 + 3 |
| `POST /api/worker/kora-link/activate` | ❌ Non implementato | H-010, H-011 | Gate 2 + 3 |
| Endpoint partner/event registration | ❌ Non implementato | H-010 | Gate 2 + 3 + partner onboarding |
| Audit trail KORA Link | ❌ Non implementato | audit.audit_log schema | Gate 2 |
| Rate limiting public route | ❌ Non implementato | H-003, H-009 | Gate 3 |
| RLS negative tests | ❌ Non implementato | H-011, schema DB | Gate 2 |

**Prerequisiti infrastrutturali KORA Link:**
1. Gate 2 chiuso (SQL schema, RLS, produzione)
2. Gate 3 chiuso (legal/privacy su dati worker in scan)
3. H-001 risolto (commons service client)
4. H-003 risolto (rate limiting infrastruttura)
5. H-008 pattern pubblico definito
6. Security review CTO + eventuale pen test su route pubbliche

**Stima effort KORA Link (post-prerequisiti):**
- Route core (admin/company/worker): 1-2 sprint
- Public route sicura + rate limiting: 0.5 sprint + infra
- RLS + test: 0.5 sprint
- Security review: esterno

---

## Cosa può fare Claude Code vs cosa richiede CTO/Security

| Issue | Claude Code | CTO/Security |
|-------|------------|-------------|
| H-001 (commons service client) | ✅ RISOLTO CC-11 | Review post-fix |
| H-002 (direct createClient) | ✅ RISOLTO CC-11 | — |
| H-003 (rate limiting) | NO | SÌ — decisione architetturale |
| H-004 (Zod validation) | ✅ PARZIALE CC-12 (4 route; live-company + data-intake pendenti) | Review schema |
| H-005 (logout guard) | SÌ | — |
| H-006 (UUID validation) | ✅ RISOLTO CC-13 | — |
| H-007 (errori standardizzati) | SÌ | — |
| H-008 (pattern public route) | SÌ (struttura) | Review sicurezza |
| H-009 (rate limiting Link) | NO | SÌ |
| H-010 (endpoint KORA Link) | SÌ (post Gate 2+3) | Review pre-merge |
| H-011 (RLS negative tests) | SÌ (post Gate 2) | — |
| H-012 (correlation ID) | SÌ (se middleware aperto) | — |
| H-013 (API versioning) | NO | SÌ |

---

*API_HARDENING_BACKLOG.md — CC-10 generato · CC-11 aggiornato · CC-12 aggiornato · Branch `platform/readiness`*
*Aggiornare dopo ogni CC che risolve un finding.*
