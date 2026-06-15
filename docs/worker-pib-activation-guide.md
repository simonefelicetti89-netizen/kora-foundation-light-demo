# Worker PIB / Dynamic CV — Guida di attivazione dato reale

**B157 — Worker PIB/CV: predisposizione binario di consumo**
Data: 2026-06-15
Stato: Foundation Light — sorgente sintetica attiva, LIVE SOURCE HOOKs dichiarati

---

## Contesto

Le pagine `/my-kora/personal-impact-balance`, `/my-kora/dynamic-cv` e la Home My KORA
leggono oggi dati sintetici pre-computati (IU calcolati a design-time dalla formula
`IU = NM × BC × CQ × EV × CF × AGF`, aggregati per persona in `MyKoraPreviewService`).

Il binario di consumo è pronto: le pagine leggono da `WorkerPIBService`
(`services/worker-pib/WorkerPIBService.ts`) dietro il contratto `WorkerPIB` / `WorkerCVData`
(`lib/types/domains/worker-pib.ts`). Il giorno del primo cliente reale, collegare il dato
live è un cambio di sorgente nel servizio — non un rifacimento delle pagine.

---

## Contratto dati (`lib/types/domains/worker-pib.ts`)

### `WorkerPIB`

| Campo | Tipo | Note |
|---|---|---|
| `period` | string | Periodo di analisi (es. "Q1–Q3 2025") |
| `period_iu_total` | number | Somma IU del periodo per tutti i pillar |
| `overall_index` | number | Score 0–100 normalizzato (internal reference) |
| `active_pillars` | number | Numero di pillar con almeno un evento |
| `total_events` | number | Numero totale di eventi nel periodo |
| `pillar_breakdown` | `WorkerPillarData[]` | IU e score per pillar |
| `timeline` | `WorkerTimelineEvent[]` | Tutti gli eventi del periodo, ordinati per data |
| `activation_level` | enum | `'initial'` \| `'developing'` \| `'established'` \| `'advanced'` |
| `activation_level_label` | string | Label italiana del livello |
| `activation_level_description` | string | Descrizione per il worker |
| `activation_profile` | string | Profilo del mix attivazione (es. "Esploratore") |
| `activation_profile_description` | string | Descrizione del profilo |
| `pib_derivation_note` | string | Nota metodologica visibile al worker |
| `pib_derivation_basis` | `PIBDerivationBasis` | `'synthetic_iu_pre_computed'` oggi, `'live_scoring_pipeline'` in Pilot+ |
| `disclaimer` | string | Disclaimer non sopprimibile |
| `not_employer_visible` | `true` | **INVARIANTE — non sopprimibile** |
| `not_performance_score` | `true` | **INVARIANTE — non sopprimibile** |
| `isSynthetic` | boolean | `true` in Foundation Light, `false` con dati reali |

### `WorkerCVData`

| Campo | Tipo | Note |
|---|---|---|
| `items` | `WorkerCVItem[]` | Voci IU-eligible del Dynamic CV |
| `total_items` | number | Count totale voci |
| `verified_count` | number | Voci con `verification_status === 'verified'` |
| `disclaimer` | string | Disclaimer non sopprimibile |
| `export_available` | `false` | **Non sopprimibile** — le pagine non offrono export se `false` |
| `isSynthetic` | boolean | `true` in Foundation Light |

---

## Service (`services/worker-pib/WorkerPIBService.ts`)

Due metodi:

```typescript
workerPIBService.getPIB(personaId: string, scenarioId: string): WorkerPIB
workerPIBService.getCVData(personaId: string): WorkerCVData
```

Entrambi leggono oggi da `MyKoraPreviewService`. I **LIVE SOURCE HOOKs** sono marcati
con commento esplicito nel sorgente:

```typescript
// LIVE SOURCE HOOK (post-Gate-2): sostituire la sorgente sintetica con
// l'aggregazione IU per pseudonym_id dalla pipeline reale.
// Vedi docs/worker-pib-activation-guide.md — sezione "Attivazione sorgente reale".
```

---

## Attivazione sorgente reale (post-Gate-2)

### Pre-requisiti

- Gate 2 (CTO Review) chiuso — sblocca accesso a `analytics.uef_record` e `personal.*`
- Worker provisioned con `kora_worker_id` in `app_metadata` JWT
- Pipeline KORA eseguita (vedi `scripts/run-kora-pipeline.ts`) — genera IU per `pseudonym_id`
- `pseudonym_id` = hash one-way di `WorkerKoraId` (vedi `lib/worker-identity/types.ts`)

### Passaggi in `WorkerPIBService.getPIB()`

```typescript
// 1. Sostituire il blocco "TODAY" con questo:
import { getSupabaseServerClient } from '@/lib/supabase/server';

async getPIB(workerId: string, tenantId: string, period: string): Promise<WorkerPIB> {
  const pseudonymId = derivePseudonymId(workerId); // one-way hash
  const db = await getSupabaseServerClient(); // RLS-gated, non service client

  // Leggi IU aggregati per pseudonym_id dalla pipeline
  const { data: iuRows } = await db
    .schema('analytics')
    .from('uef_record')
    .select('pillar_primary, iu_value, event_date, verification_status, source_type, cv_eligible')
    .eq('pseudonym_id', pseudonymId)
    .eq('tenant_id', tenantId)
    .gte('event_date', periodStart(period))
    .lte('event_date', periodEnd(period));

  // Aggregare per pillar → WorkerPillarData[]
  // Calcolare period_iu_total, active_pillars, activation_level
  // Restituire WorkerPIB con isSynthetic: false, pib_derivation_basis: 'live_scoring_pipeline'
}
```

### Passaggi in `WorkerPIBService.getCVData()`

```typescript
// 1. Query UEF records con cv_eligible: true per pseudonym_id
// 2. Mappare a WorkerCVItem[]
// 3. Restituire WorkerCVData con isSynthetic: false, export_available: false
//    (export_available diventa true solo quando il worker conferma l'intent di export)
```

### Dynamic CV IU-based vs participation-based

**Importante**: il route esistente `/api/worker/dynamic-cv` (vedi `app/api/worker/dynamic-cv/route.ts`)
restituisce dati di PARTECIPAZIONE (interested/registered/attended per iniziativa).
NON è il route per questo CV IU-based.

Il route-ponte IU-based è `/api/worker/impact-cv` (`app/api/worker/impact-cv/route.ts`).

---

## Route-ponte (`app/api/worker/pib/route.ts` e `app/api/worker/impact-cv/route.ts`)

Dual-path authentication:

| Path | JWT richiesto | Dati restituiti |
|---|---|---|
| WORKER | `kora_role = 'WORKER'`, `kora_worker_id` in `app_metadata` | Oggi: sintetici (LIVE SOURCE HOOK); Pilot+: aggregazione pipeline |
| KORA_ADMIN | `kora_role = 'KORA_ADMIN'` + `?persona=A&scenario=S1` | Sempre sintetici per preview |

Le route filtrano per il worker autenticato dal JWT — MAI da query params.

---

## RLS e sicurezza

**RLS DEBT**: le route API worker attuali (attivazione-profile, dynamic-cv, etc.) usano
`getSupabaseServiceClient()` che bypassa RLS. Questo è annotato nei file come debito esplicito.

Quando si attiva la sorgente reale in `WorkerPIBService`:
1. Usare `getSupabaseServerClient()` (non service client) — RLS-gated
2. Verificare che le policy RLS coprano `analytics.uef_record` per `pseudonym_id` del worker autenticato
3. Verificare che `personal.worker_identity` mappi `kora_worker_id` → `pseudonym_id`
4. Rimuovere il debt comment dalla route corrispondente

La chain completa è:
```
JWT.app_metadata.kora_worker_id
  → personal.worker_identity.id (join)
  → personal.worker_identity.pseudonym_id (select)
  → analytics.uef_record WHERE pseudonym_id = ? (RLS: auth.uid() constraint)
```

---

## Invarianti non sopprimibili

Queste proprietà del contratto non possono mai essere false o omesse:

```typescript
not_employer_visible: true   // PIB è privato del worker — mai employer-visible
not_performance_score: true  // PIB misura attivazione, non performance
export_available: false      // Dynamic CV non esportabile finché isSynthetic
```

Le pagine non possono offrire funzionalità di export finché `isSynthetic: true` o `export_available: false`.

---

## File coinvolti

| File | Ruolo |
|---|---|
| `lib/types/domains/worker-pib.ts` | Contratto dati (WorkerPIB, WorkerCVData, WorkerCVItem, WorkerPillarData, WorkerTimelineEvent) |
| `services/worker-pib/WorkerPIBService.ts` | Service wrapper + LIVE SOURCE HOOKs |
| `app/api/worker/pib/route.ts` | Route-ponte PIB (WORKER JWT + KORA_ADMIN preview) |
| `app/api/worker/impact-cv/route.ts` | Route-ponte CV IU-based (WORKER JWT + KORA_ADMIN preview) |
| `app/my-kora/personal-impact-balance/page.tsx` | Consuma `workerPIBService.getPIB()` |
| `app/my-kora/dynamic-cv/page.tsx` | Consuma `workerPIBService.getCVData()` |
| `app/my-kora/page.tsx` | Consuma entrambi i metodi per PIB card + CV counts |
