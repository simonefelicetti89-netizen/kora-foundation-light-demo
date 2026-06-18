# ADR-002 — Service-Role Client Scoping Pattern

**Data:** 2026-06-18
**Status:** ACTIVE
**Commit di riferimento:** `043f697` (B168.6 P4.0)
**Proposto da:** B168 Privacy Guard Granularization sprint

---

## Contesto

Supabase fornisce due client di accesso al database:

1. **`getSupabaseServerClient()`** — client autenticato che opera nel contesto RLS dell'utente corrente. Le Row Level Security policies limitano l'accesso ai dati in base all'identità dell'utente che fa la richiesta.

2. **`getSupabaseServiceClient()`** — client con chiave service-role che bypassa completamente RLS. Non ha contesto utente. Equivale a un accesso diretto da superuser.

Il problema pre-B168.6: diverse route (`/api/admin/workers/provision`, `/api/admin/impact-units`) usavano `getSupabaseServiceClient()` direttamente, importando e usando il client globale per tutte le operazioni della route — incluse quelle che non richiedevano bypass RLS.

Questo crea:
- **Scope creep implicito**: il client service-role può accedere a qualsiasi tabella, ma il codice non dichiara mai *quali* tabelle intende usare e con *quali* campi
- **Nessuna whitelist sui campi**: un singolo INSERT con un campo non previsto (es. `display_name`, `phone`) passerebbe silenziosamente
- **Difficoltà di audit**: un DPO o CTO che legge la route non può verificare facilmente quali dati entrano/escono via service-role
- **Resistenza alle modifiche**: aggiungere un campo al payload è una riga di codice senza checkpoint

## Decisione

**Il service-role client non viene mai usato direttamente nelle route operative.** Viene invece wrappato in moduli scoped, uno per ogni use case specifico, con:

1. **Whitelist esplicita dei campi** ammessi (non blacklist — la blacklist dimentica, la whitelist protegge)
2. **Assertion runtime** che throw prima di qualsiasi operazione DB se il payload contiene campi non dichiarati
3. **Scope dichiarato nel nome** — il modulo si chiama `{use-case}-service-key.ts`, non `service-client.ts`
4. **Solo le operazioni necessarie** — un modulo di provisioning non espone SELECT, un modulo di read-only non espone INSERT

## Esempi vivi

### `lib/supabase/storage-service-key.ts`
- **Scope**: upload file su bucket privato Supabase Storage
- **Operazioni**: solo `storage.from(BUCKET).upload()`
- **Rationale**: il bucket è privato by design Supabase, non c'è path RLS-respecting per Storage upload

### `lib/supabase/worker-provisioning-service-key.ts`
- **Scope**: INSERT su `personal.worker_identity` durante provisioning nuovo worker
- **Whitelist**: `ALLOWED_IDENTITY_INSERT_FIELDS` — {worker_ref, tenant_id, auth_user_id, status, created_at}
- **Assertion**: `assertProvisioningInsertPayload()` throw su qualsiasi campo fuori whitelist
- **Operazioni**: solo INSERT + SELECT 'id' (per ritornare il workerId)
- **Rationale**: post-027, `worker_identity` non ha più policy RLS per KORA_ADMIN. Il provisioning worker deve creare la riga identity PRIMA che il worker abbia un JWT proprio — service-role è l'unico path safe

### `lib/supabase/impact-unit-service-key.ts`
- **Scope**: SELECT su `analytics.impact_unit` per pipeline monitoring KORA service team
- **Whitelist**: `ALLOWED_IU_SELECT_COLUMNS` — esclude esplicitamente worker_ref, worker_id, auth_user_id, pseudonym_id
- **Assertion**: `assertIUSelectColumns()` throw su qualsiasi colonna fuori whitelist
- **Operazioni**: solo SELECT
- **Rationale**: post-027 (decisione A), analytics.impact_unit non ha più policy RLS per kora_admin. Record per-worker-event, granularità individuale. Accesso KORA service team per monitoring è legittimo ma va scoped

## Conseguenze

### Positive
- Ogni accesso service-role è tracciabile: grep per `{module}-service-key.ts` identifica tutti gli use case
- Le whitelist sono il contratto documentato di cosa può entrare/uscire
- Le assertion sono boundary attivi, non commenti — throw in development e production
- Il DPO può leggere `ALLOWED_IDENTITY_INSERT_FIELDS` e capire cosa il provisioning scrive su `personal.worker_identity`
- Future code review può verificare: "questo campo è nella whitelist? Se sì, era una decisione consapevole"

### Trade-off
- Ogni nuovo use case service-role richiede un nuovo modulo — overhead intenzionale. La frizione serve a far riflettere sulla necessità del bypass RLS.
- La whitelist deve essere aggiornata quando cambia lo schema — ma questa è documentazione forzata, non debito.

## Linee guida per nuovi use case service-role

1. **Crea un modulo dedicato** `lib/supabase/{use-case}-service-key.ts`
2. **Dichiara `ALLOWED_*` come `const Set<string>`** — non come array, non come commento
3. **Scrivi l'assertion** come funzione esportata (per testabilità)
4. **Esporta solo funzioni specifiche**, non il client Supabase
5. **Commenta PERCHÉ service-role è necessario**, COSA non deve fare, e l'invariante
6. **Scrivi test** per l'assertion — almeno: "accetta whitelist", "rifiuta campo PII noto"
7. **MAI creare un service-role generico** condiviso tra use case. Un modulo, un use case.

## Pattern template

```typescript
// lib/supabase/{use-case}-service-key.ts
//
// PERCHÉ ESISTE: [motivo preciso — quale RLS manca, quale operazione richiede bypass]
// COSA NON DEVE FARE: [operazioni escluse esplicitamente]
// INVARIANTE: [cosa è sempre vero su questo modulo]

import { getSupabaseServiceClient } from '@/lib/supabase/server';

const ALLOWED_{RESOURCE}_{OP}_FIELDS = new Set([
  // campi espliciti
  // ESCLUSI deliberatamente: [lista, con perché]
]);

export function assert{UseCase}Payload(payload: Record<string, unknown>): void {
  const forbidden = Object.keys(payload).filter(k => !ALLOWED_{RESOURCE}_{OP}_FIELDS.has(k));
  if (forbidden.length > 0) {
    throw new Error(`{module}: campi non ammessi: ${forbidden.join(', ')}. Aggiornare ALLOWED_* solo se la doctrine consente.`);
  }
}

export async function {specificOperation}(...): Promise<...> {
  assert{UseCase}Payload(payload);
  const sc = getSupabaseServiceClient();
  // operazione specifica
}
```

## Riferimenti

- [B168 Privacy Guard Granularization](../sprint-B168-6/phase4-0-decision.md) — decisione A che ha richiesto il pattern
- Migration 027: rimozione policy kora_admin su personal.* e analytics.impact_unit
- `tests/unit/b168-6-service-key-guards.test.ts` — test delle assertion
