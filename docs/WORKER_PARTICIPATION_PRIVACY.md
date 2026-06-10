# KORA Worker Participation Privacy Architecture

**Sprint**: B109 + B109-B  
**Data**: 2026-06-10  
**Gate**: Gate 2 OPEN · Gate 3 OPEN  
**Stato**: Hardened — passa B109-B privacy invariant tests

---

## Principio costituzionale

KORA misura **le organizzazioni, non le persone**.

Le partecipazioni dei worker alle iniziative aziendali sono **dati personali privati del worker**. Il datore di lavoro (company) **non può mai vedere chi ha partecipato, espresso interesse, scritto note private o costruito uno storico individuale**.

Questo documento descrive come questa garanzia è applicata a ogni layer: database, API, UI.

---

## Chi vede cosa

### Worker

Può vedere:
- Le proprie partecipazioni (storico personale)
- Le proprie note private (`private_note`)
- Le iniziative pubblicate (`status = 'published'`) del proprio tenant
- Il proprio profilo privacy (onboarding, display_name)

Non può vedere:
- Le partecipazioni di altri worker
- Il totale delle partecipazioni aziendali
- Dati di altri tenant
- Iniziative in stato `draft` o `closed`

### Company (COMPANY_ADMIN / COMPANY_VIEWER)

Può vedere:
- Numero di iniziative pubblicate
- Aggregato di partecipazione per pillar — **solo se N ≥ SAFE_AGGREGATION_THRESHOLD (10)**
- Totale engagement aggregato — **solo se N ≥ 10**

**Non può mai vedere:**
- Singole righe di `worker_participation`
- Chi ha espresso interesse (nome, worker_id, email, display_name)
- Le note private dei worker (`private_note`)
- Il timestamp di singoli worker
- Qualsiasi identificativo individuale

Se un conteggio è inferiore a 10:
```json
{
  "suppressed": true,
  "suppression_reason": "privacy_threshold",
  "suppression_threshold": 10
}
```

Il campo `total_participations` è **assente** quando soppresso — non viene restituito `-1` né alcun valore che segnali "esiste almeno una partecipazione" (prevenzione inferenza).

### KORA_ADMIN

Può vedere:
- Tutte le iniziative (draft, published, closed)
- Conteggi aggregati di worker per tenant (via `/api/admin/worker-diagnostics`)
- La gestione delle iniziative (crea, pubblica, chiude)

**Non vede (per design attuale):**
- `private_note` dei worker — non esposta in nessuna route admin standard
- Partecipazioni individuali — non giustificate in dashboard admin operativa

---

## Architettura RLS — migration 008

### `personal.worker_initiative`

| Ruolo | Policy | Cosa vede |
|---|---|---|
| `KORA_ADMIN` | ALL | Tutte le iniziative di tutti i tenant |
| `WORKER` | SELECT | Solo `status = 'published'` del proprio tenant (via `kora.tenant_id()`) |
| `COMPANY_ADMIN` | **NESSUNA** | Zero accesso diretto |
| `COMPANY_VIEWER` | **NESSUNA** | Zero accesso diretto |

### `personal.worker_participation`

| Ruolo | Policy | Cosa vede |
|---|---|---|
| `KORA_ADMIN` | ALL | Tutte le partecipazioni |
| `WORKER` | ALL (own row) | Solo le proprie righe (via `auth.uid()` → `worker_identity.id`) |
| `COMPANY_ADMIN` | **NESSUNA** | Zero accesso diretto — mai |
| `COMPANY_VIEWER` | **NESSUNA** | Zero accesso diretto — mai |

Entrambe le tabelle hanno `FORCE ROW LEVEL SECURITY` attivo.

L'aggregato company è servito **solo via service-role app-layer** con threshold enforcement esplicito — non via RLS policy.

---

## API layer

### Worker APIs (WORKER role only)

| Route | Cosa restituisce | Cosa non restituisce |
|---|---|---|
| `GET /api/worker/initiatives` | Iniziative published + status personale | `private_note` di altri worker |
| `POST /api/worker/initiatives/[id]/interest` | Conferma upsert | worker_id/tenant_id dal body ignorati |
| `GET /api/worker/history` | Storico personale + `private_note` propria | Partecipazioni di altri worker |

### Regole POST interest (hardened B109-B)

1. **`worker_id` e `tenant_id` dal body sono ignorati silenziosamente** — i valori provengono esclusivamente da `requireWorkerUser()` che legge `app_metadata` dalla sessione JWT
2. **`attended` non è un status autodichiarabile** — solo `interested`, `registered`, `cancelled` sono accettati dal worker. `attended` può essere impostato solo da flow admin/sistema.
3. **`private_note` max 500 caratteri** — eccedenza → `400`
4. **Iniziativa verificata**: deve appartenere al tenant del worker e avere `status = 'published'`

### Company API

| Route | Restituisce | Non restituisce mai |
|---|---|---|
| `GET /api/company/workers/activation-aggregate` | Aggregati per pillar, engagement totale | worker_id, email, display_name, private_note, righe individuali |

Ogni conteggio < 10 viene soppresso con `{ suppressed: true, suppression_reason: "privacy_threshold", suppression_threshold: 10 }`.

---

## SAFE_AGGREGATION_THRESHOLD

```typescript
const SAFE_AGGREGATION_THRESHOLD = 10;
```

Definito in `app/api/company/workers/activation-aggregate/route.ts`.

Se un pillar ha meno di 10 partecipazioni aggregate, il conteggio è soppresso. Non viene restituito `-1` né alcun valore numerico che permetterebbe di inferire "almeno 1 persona ha partecipato".

**Scenario rischio prevenuto**: un'azienda con 2 worker e 1 iniziativa non può vedere se il singolo worker ha partecipato — il conteggio verrebbe soppresso.

---

## Invarianti da non rompere

Questi invarianti sono testati in `tests/unit/b109b-participation-privacy.test.ts` (47 test):

1. `personal.worker_participation` non ha policy COMPANY_ADMIN
2. `personal.worker_participation` non ha policy COMPANY_VIEWER
3. Il worker vede solo iniziative `published` del proprio tenant
4. Il worker non vede iniziative `draft` o `closed`
5. Il worker vede solo le proprie partecipazioni (filter `worker_id = session.workerId`)
6. `POST interest` ignora `worker_id` e `tenant_id` dal body
7. `attended` non è autodichiarabile dal worker
8. `private_note` ha lunghezza massima validata
9. Company aggregate non espone worker_id in nessun select
10. Company aggregate non espone display_name, email, private_note
11. Company aggregate usa `{ suppressed: true, suppression_reason, suppression_threshold }` — mai `-1`
12. Admin route non espone `private_note` in nessun select su `worker_initiative`
13. Admin route non join su `worker_participation`
14. Nessuna company route importa `worker_profile_private`

---

## Cosa è vietato aggiungere

- Qualsiasi policy `COMPANY_ADMIN` o `COMPANY_VIEWER` su `worker_participation`
- Qualsiasi endpoint che restituisca righe individuali di `worker_participation` a ruoli company
- `private_note` in qualsiasi response company
- `worker_id`, `email`, `display_name` in qualsiasi response company
- `attended` come status auto-dichiarabile dal worker via API

---

## Rischi residui (accettati)

| Rischio | Severità | Mitigazione |
|---|---|---|
| Se una company ha esattamente 10 worker tutti in 1 pillar, e 10/10 partecipano, il conteggio è visibile come "10" | BASSA | La soglia è rispettata; non si possono dedurre individui specifici da un conteggio collettivo |
| Service-role bypassa RLS — il layer app deve sempre filtrare correttamente | MEDIA | Tutte le route usano `requireWorkerUser()` / `requireCompanyUser()` prima di qualsiasi query; enforcement a livello applicativo |
| KORA_ADMIN può vedere partecipazioni individuali via service-role | ACCETTATO | KORA_ADMIN è operatore interno, non employer; equivale a DBA internal ops |

---

## Prossimo sprint raccomandato

**B110 — Worker Workspace UX MVP**: iniziative cliccabili con CTA "Mi interessa" in-page (client component), senza page reload. Prerequisito: B109-B chiuso (questo documento).

Non aprire B110 finché B109-B non è chiuso.

---

*KORA Foundation Light · B109-B Worker Participation Privacy Architecture*  
*Invarianti: 47/47 test pass · tsc clean · build clean*
