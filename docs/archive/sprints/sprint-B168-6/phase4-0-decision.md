# B168.6 Phase 4.0 — Decisione Architettonica Blocco 2

## Analisi

### Grep DROP POLICY in 027

```
DROP POLICY IF EXISTS worker_identity_kora_admin_all ON personal.worker_identity;
DROP POLICY IF EXISTS worker_pib_kora_admin_all ON personal.worker_pib;
DROP POLICY IF EXISTS worker_pseudonym_map_kora_admin_all ON personal.worker_pseudonym_map;
DROP POLICY IF EXISTS worker_profile_kora_admin_all ON personal.worker_profile_private;
DROP POLICY IF EXISTS kora_admin_impact_unit_read   ON analytics.impact_unit;
DROP POLICY IF EXISTS kora_admin_impact_unit_insert ON analytics.impact_unit;
```

### Segnali per/contro A vs B

**Segnali per A (intenzionale):**
- Il commento in 027 è esplicito: "Le policy kora_admin_impact_unit_read e
  kora_admin_impact_unit_insert permettevano accesso diretto a IU individuali. Rimosse."
- La doctrine viene articolata: "Company-aggregate IU remains accessible via
  SECURITY DEFINER aggregate functions."
- Il preamble di 027 include `analytics.impact_unit` nella lista tabelle scope:
  "analytics.impact_unit: solo WORKER (own) + company aggregate via funzioni"
- La policy su `uef_record` è esplicitamente preservata con nota "tensione
  architetturale" — se l'analytics drop fosse side-effect, anche uef sarebbe
  stato incluso o escluso senza commento.

**Segnali per B (side-effect):** nessuno identificato.

## Decisione: A — Intenzionale

Le policy su `analytics.impact_unit` vengono rimosse intenzionalmente. La
doctrine è coerente: i record `analytics.impact_unit` sono computazioni
per-worker-event (una riga per ogni UEF record → un worker). Anche senza una
colonna `worker_identity` diretta, la granularità è individuale. KORA_ADMIN non
dovrebbe avere accesso via app role RLS. L'accesso per pipeline monitoring viene
mantenuto via service-role scoped (impact-unit-service-key.ts).

## Correzione alla pre-read (analisi statica errata)

Il phase4-pre-read.md descriveva:
> "Blocco 2: /api/admin/impact-units fa SELECT su analytics.impact_unit
> come KORA_ADMIN. Dopo 027 la route torna vuota silenziosamente."

Correzione post-analisi completa:
- `app/api/admin/impact-units/route.ts` usa già `getSupabaseServiceClient()` (service-role)
- `app/api/admin/workers/provision/route.ts` usa già `getSupabaseServiceClient()` (service-role)
- Service-role bypassa RLS → entrambe le route NON si rompono dopo 027

**L'impatto funzionale di 027 era già mitigato involontariamente perché
entrambe le route usano service-role direttamente.** Le RLS policy che 027 
rimuove non proteggevano nulla di fatto — il vero controllo è nel codice app.

**Il valore della sprint è quindi:**
- Rendere l'accesso service-role esplicito, scoped e documentato
- Aggiungere assertion sui campi (whitelist) — la blacklist dimentica,
  la whitelist protegge
- Preparare l'audit trail per DPO/CTO review
- Rimuovere l'uso diretto di `getSupabaseServiceClient()` da route operative
  (ogni uso diretto è una dipendenza implicita e un vettore di scope creep)

## Azioni conseguenti

- Fase 1: `worker-provisioning-service-key.ts` — ESEGUIRE
- Fase 2: `impact-unit-service-key.ts` — ESEGUIRE (Decisione A)
- Fase 3: emendamento 027 — SALTARE (Decisione A, drop è intenzionale)
- Fase 4: idempotency guards 027 + 028 — ESEGUIRE

## Commit di riferimento

`B168.6 P4.0.0 — decisione architettonica Blocco 2 (scelta A)`
