# KORA Contribution — Audit Read-Only
**Data audit:** 2026-06-22  
**Tipo:** Read-only structural audit — nessuna modifica al codice  
**Scope:** KORA Contribution companion indicator — pipeline, scoring, seed data, DB schema, test coverage  
**Auditor:** Claude Code (Sonnet 4.6)

---

## Executive Summary

KORA Contribution è implementato come indicatore companion separato dal KORA Index, con guardrail espliciti a tutti i livelli (`is_kora_index_component: false` hardcoded in tipi, seed, API). La dottrina fondamentale — nessun punteggio aggregato unico per il percorso Pilot+ live — è rispettata in `lib/commons/contribution-views.ts` e nella dashboard Pilot+; il `contributionScore 0–100` esiste solo nel percorso Foundation Light (demo sintetico). La formula `computeProvisionalScore()` è pre-empirical calibration con 5 componenti direzionali (pesi 30/20/25/15/10), letta senza hardcoding nei componenti. Il percorso live DB è correttamente gated su `production_ready = true`, quindi mai attivo in Foundation Light. Sono identificati un problema di denominazione ambigua tra "ContributionRole" (pipeline) e "KORA Contribution" (companion indicator), una logica OR nell'eligibility check che può includere eventi non collettivi, e alcune inconsistenze minori nella versione methodology nel seed data. Non sono presenti violazioni delle red line CLAUDE.md. La test suite (B72-B, B166, B167) copre bene i percorsi seed e pipeline; il percorso live DB non è testato in isolamento.

---

## 1. COS'È KORA Contribution?

**Risposta:** KORA Contribution è un **indicatore companion** — non un componente del KORA Index — che misura il contributo collettivo ed ecosistemico di un'organizzazione: partecipazioni cross-azienda, iniziative territoriali, partner attivi nel network KORA. Misura **l'organizzazione come attore collettivo** nel network, non l'attivazione interna dei lavoratori (che è dominio del KORA Index).

**Citazioni canoniche:**
- `lib/commons/contribution-views.ts:5–6` — `// DOCTRINE: Nessun punteggio aggregato unico ('Contribution Score'): è fuori dottrina.`
- `data/synthetic/kora-contribution-outputs.json:8–9` — `"constitutional_rule": "KORA Contribution is a companion indicator. It is NOT a KORA Index component."`
- `services/kora-contribution/KoraContributionService.ts:1` (header) — riferimento a `CLAUDE.md §12.7`
- `app/company/contribution/page.tsx` — intestazione: `"Indicatore Companion · Non componente KORA Index"`
- `CLAUDE.md §7` — "KORA Contribution must remain separate from KORA Index. Display them side by side if needed — never merge."

---

## 2. FORMULA

**Risposta:** La formula è `computeProvisionalScore()` — 5 componenti direzionali, calibrazione pre-empirica:

```
score = familyBreadth×30 + initiativesNorm×20 + evidenceQ×25 + territorial×15 + ecosystem×10
```

Dove:
| Componente | Calcolo | Peso |
|---|---|---|
| `familyBreadth` | `distinctFamilies.length / 3` (max 3 famiglie contribution) | 30 |
| `initiativesNorm` | `Math.min(count, 10) / 10` | 20 |
| `evidenceQ` | `evDist.verified / count` (EV ≥ 0.85 = verified, ≥ 0.70 = partial) | 25 |
| `territorial` | `(territorialCount > 0) ? 1 : 0` | 15 |
| `ecosystem` | `(distinctFamilies.length >= 2) ? 1 : 0` | 10 |

**Livelli:** `score ≥ 66` → advanced, `≥ 36` → active, `≥ 16` → emerging, else → minimal.

**Citazioni:** `services/kora-contribution/KoraContributionService.ts:169–248`

**Nota critica:** I pesi (30/20/25/15/10) sono hardcoded direttamente in `computeProvisionalScore()`, non letti da `lib/methodology-config/v0.1.ts` (vedere Finding C-4).

---

## 3. DA COSA È ALIMENTATO?

**Tre percorsi distinti:**

### Percorso A — Foundation Light (seed)
- Fonte: `data/synthetic/kora-contribution-outputs.json` (2 record: S1 Meridiana minimal, S2 Meridiana emerging)
- Servizio: `KoraContributionService.getSummaryV2(companyId, scenarioId)` → `dataSource: 'seed_derived'`
- `data/synthetic/collective-initiatives.json` — iniziative aggregate (no worker_id, no pseudonym_id)
- Citazione: `services/kora-contribution/KoraContributionService.ts` (metodo `getSummaryV2`)

### Percorso B — Pipeline computed
- Fonte: array di `ContributionPipelineInput[]` — record UEF filtrati da `isContributionEligibleEvent()`
- Servizio: `KoraContributionService.computeFromPipelineResult(companyId, scenarioId, inputs)`
- Filtro eligibility: `lib/kora-engine/contribution-family-detector.ts:49–66` — OR logic su `action_family`, `primary_pillar`, `event_nature`
- Famiglie contribution: `territorial_impact`, `inclusion_and_connection`, `future_and_legacy`
- Citazione: `lib/kora-engine/contribution-family-detector.ts:1–67`

### Percorso C — Live DB (Pilot+, gated)
- Gate: `analytics.tenant.production_ready = true` — tutti i tenant Foundation Light sono `false`
- Servizi: `getContributionLive()`, `getContributionPromoterView()`, `getContributionOriginEmployerView()`
- Tabelle: `commons.contribution_event` (2 righe per booking attended: `role='promoter'` + `role='origin_employer'`)
- Booking: `commons.booking` → `attributeContributionForBooking()` in `lib/commons/cross-company-attribution.ts`
- Aggregazione promoter: RPC SECURITY DEFINER `commons.booking_aggregate_for_promoter()` (aggregate only, no booking rows to company)
- Citazione: `services/kora-contribution/KoraContributionService.ts` (funzioni `getContribution*`)
- Citazione: `supabase/migrations/025_commons_booking_contribution.sql` (Gate 2 OPEN — non applicato)

---

## 4. Findings Table (C-1 — C-10)

| ID | Descrizione | File:riga | Severity | Raccomandazione |
|---|---|---|---|---|
| C-1 | `is_kora_index_component: false` correttamente hardcoded a tutti i livelli — seed, tipi, API, servizio | `lib/commons/contribution-views.ts:5`, `lib/commons/booking-types.ts` (hardcoded `false`), `data/synthetic/kora-contribution-outputs.json:21` | INFO — PASS | Nessuna azione. Guardrail strutturale robusto. |
| C-2 | Contraddizione apparente: dottrina (`contribution-views.ts:5`) vieta punteggio aggregato unico; `computeProvisionalScore()` calcola `contributionScore 0–100` | `lib/commons/contribution-views.ts:5–6`, `services/kora-contribution/KoraContributionService.ts:169` | MEDIUM | Documentare esplicitamente la scissione: lo score esiste solo nel percorso demo (Foundation Light preview); il percorso Pilot+ live NON espone score (view types in `contribution-views.ts` non hanno campo `score`). Aggiungere commento in `computeProvisionalScore()` che chiarisce che è usato solo per il percorso `seed_derived`. |
| C-3 | `INITIATIVE_TYPE_TO_FAMILY['collective_upskilling'] = 'professional_growth'` — mappa a una famiglia NON eligibile. Gli eventi `collective_upskilling` non passerebbero il filtro di action_family, ma potrebbero passare il filtro pillar se `primary_pillar = 'GROWTH'` (escluso da eligibility) oppure pillar IMPACT/CONNECTION/LEGACY | `services/kora-contribution/KoraContributionService.ts:254–260` | LOW | Verificare se `collective_upskilling` è intentionalmente escluso da KORA Contribution. Se sì, aggiungere commento esplicito. Se no, mappare a una famiglia contribution-eligible. |
| C-4 | I pesi della formula (30/20/25/15/10) sono **hardcoded** dentro `computeProvisionalScore()`, non letti da `lib/methodology-config/v0.1.ts` — viola CLAUDE.md §12 principio 12 | `services/kora-contribution/KoraContributionService.ts:219–225` | MEDIUM | Esporre i pesi come costanti nominate o leggerli da `lib/methodology-config/v0.1.ts`. I pesi provvisori pre-empirici devono essere versionati e modificabili senza toccare la logica computazionale. |
| C-5 | `isContributionEligibleEvent()` usa logica OR: un match su `primary_pillar` IMPACT/CONNECTION/LEGACY è sufficiente per l'eligibility, indipendentemente da `action_family` o `event_nature`. Questo può includere eventi di training individuale con `primary_pillar = 'IMPACT'` che non sono collettivi | `lib/kora-engine/contribution-family-detector.ts:49–66` | MEDIUM | Valutare se la logica OR è corretta o se l'eligibility dovrebbe richiedere una combinazione più restrittiva (es. `action_family` IN contribution families, oppure `event_nature` IN contribution natures). Documentare l'intento. |
| C-6 | Collisione di nomenclatura: `ContributionRole` in `lib/live/contribution-lineage.ts` classifica il ruolo di un record UEF nella pipeline KORA Index/BTI (es. `kora_index_and_bti`, `bti_only_economic_relief`). Non ha nulla a che fare con KORA Contribution companion indicator. Il termine "contribution" è usato in due sensi completamente diversi | `lib/live/contribution-lineage.ts:1–155` | LOW | Rinominare `ContributionRole` in `PipelineContributionRole` o `IUPipelineRole` per disambiguare dalla KORA Contribution companion indicator. Aggiungere commento in entrambi i file. |
| C-7 | Il percorso live DB (Percorso C) non è mai attivo in Foundation Light (`production_ready = false` per tutti i tenant FL). Le tre funzioni `getContributionLive`, `getContributionPromoterView`, `getContributionOriginEmployerView` non sono mai eseguite nella demo. Zero test su questo percorso | `services/kora-contribution/KoraContributionService.ts` (sezioni `getContribution*`), `app/api/company/contribution/live/route.ts:1–36` | INFO | Documentare che il percorso live è "dead code path" in Foundation Light. Aggiungere smoke test con mock DB per le funzioni Pilot+ prima dell'attivazione post-Gate 3. |
| C-8 | `methodology_version_id` nel seed file è `"KORA Index v1.0"` — inconsistente con il formato canonico `"KORA Methodology v0.1"` richiesto da CLAUDE.md §6 per tutti i display del KORA Index/Contribution | `data/synthetic/kora-contribution-outputs.json:19` | LOW | Allineare a `"KORA Methodology v0.1"` per coerenza con gli altri output e con CLAUDE.md §6 requisiti di display. |
| C-9 | `attributeContributionForBooking()` scrive 2 righe in `commons.contribution_event` (promoter + origin_employer) senza wrapper transazionale esplicito. Se la seconda INSERT fallisce (non-idempotency error), solo una riga è scritta — contribution attribution parziale | `lib/commons/cross-company-attribution.ts` (funzione `attributeContributionForBooking`) | MEDIUM | Verificare che la scrittura delle due righe avvenga dentro una singola transazione DB (o confermarne l'idempotenza separata). La migration 025 usa idempotency UNIQUE constraint su `source_booking_id` — ma ciò non gestisce write failures parziali. |
| C-10 | `getSummaryV2()` — percorso seed — e `computeFromPipelineResult()` — percorso pipeline — producono output con la stessa forma (`ContributionSummary`) ma con `dataSource: 'seed_derived'` vs `'pipeline'`. Non esiste sincronizzazione automatica: i valori seed di S2 (score=38, 28 partecipazioni) non si riconciliano con quanto `computeFromPipelineResult()` produrrebbe a partire dagli stessi eventi sintetici | `services/kora-contribution/KoraContributionService.ts` (entrambi i metodi), `data/synthetic/kora-contribution-outputs.json` | LOW | Accettabile per demo. Documentare la divergenza intenzionale tra i due percorsi. Post-pilot, il percorso seed sarà rimosso — solo pipeline computed e live DB rimarranno. |

---

## 5. Dottrina Coherence

### Invarianti rispettate ✓

| Invariante | Evidenza nel codice |
|---|---|
| KORA Contribution ≠ KORA Index component | `is_kora_index_component: false` in `lib/commons/booking-types.ts`, seed file, service response |
| No ranking, no rewards, no leaderboard | `no_ranking: true`, `no_rewards: true`, `no_leaderboard: true` in seed data e `computeFromPipelineResult()` |
| No punteggio aggregato nelle view Pilot+ | `lib/commons/contribution-views.ts:5–6` dottrina + nessun campo `score` in `ContributionPromoterView` / `ContributionOriginEmployerView` |
| Anonimato worker nella view promoter | `booking_aggregate_for_promoter()` SECURITY DEFINER — solo aggregati; no `worker_identity_id` in `ContributionPromoterView` |
| Anonimato worker nella view origin_employer | `getContributionOriginEmployerView()` non seleziona `source_booking_id` né `worker_identity_id` |
| Narrativa no LLM | `lib/commons/contribution-narrative.ts` — funzioni pure deterministiche, no `fetch()`, no API esterne |
| `calibration_status = 'pre_empirical_calibration'` | In `ContributionPromoterView`, `ContributionOriginEmployerView`, seed data, risposta API live |
| Label "Indicatore Companion" non sopprimibile | `app/company/contribution/page.tsx` — header fisso + `contribution-methodology-notice` |
| CSR/ESG disclaimer presente | `app/company/contribution/page.tsx` — disclaimer `"KORA supporta la rendicontazione CSR/ESG..."` |

### Tensioni rilevate ⚠

| Tensione | Dettaglio |
|---|---|
| Score nel demo vs. dottrina no-score | `computeProvisionalScore()` produce `contributionScore 0–100` usato nel percorso Foundation Light preview; la dottrina no-score vale solo per Pilot+ live. La distinzione è corretta ma **non è esplicitamente documentata nel codice** — solo nell'architettura della pagina. |
| Pesi hardcoded vs. principio no-hardcoding | Pesi 30/20/25/15/10 in `computeProvisionalScore()` non sono in `lib/methodology-config/v0.1.ts` (Finding C-4). |

---

## 6. Definition ↔ Code Gap

| Concetto da CLAUDE.md | Implementazione attuale | Gap |
|---|---|---|
| "KORA Contribution misura engagement collettivo ed ecosistemico" | `isContributionEligibleEvent()` include eventi per pillar match (IMPACT/CONNECTION/LEGACY) anche senza event_nature collettiva | Gap: la logica OR può includere eventi non collettivi (C-5) |
| "Non è un componente KORA Index" | Hardcoded `false` ovunque | ✓ Allineato |
| "Display it separately — never merge" | Pagina ha sezione separata; test B166 verifica `"Non componente KORA Index"` | ✓ Allineato |
| "No ranking, no rewards, no leaderboard" | Constants nel seed e service output | ✓ Allineato |
| "Methodology weights from `lib/methodology-config/v0.1.ts`" | Pesi Contribution hardcoded in `computeProvisionalScore()` | **Gap** (C-4) |
| `methodology_version_id = "KORA Methodology v0.1"` | Seed usa `"KORA Index v1.0"` | Gap minore (C-8) |
| "Pillar coverage: IMPACT, CONNECTION, LEGACY" | `CONTRIBUTION_PILLARS = ['IMPACT', 'CONNECTION', 'LEGACY']` | ✓ Allineato |
| "Famiglie contribution: territorial_impact, inclusion_and_connection, future_and_legacy" | `CONTRIBUTION_ACTION_FAMILIES` — 3 famiglie corrette | ✓ Allineato |

---

## 7. Open Questions per il Founder

1. **Score nel percorso demo (C-2):** Il `contributionScore 0–100` nella Foundation Light preview è intenzionale come "anteprima metodologica dimostrativa"? Se sì, va documentato esplicitamente nel codice. Se no (e anche la preview deve seguire la dottrina no-score), `computeProvisionalScore()` va rimosso.

2. **Eligibility OR logic (C-5):** L'eligibility `isContributionEligibleEvent()` con logica OR (action_family OR pillar OR event_nature) è intenzionale? Un evento training con `primary_pillar = 'IMPACT'` sarebbe contribution-eligible, anche se non ha natura collettiva. Questo è il comportamento desiderato?

3. **Pesi Contribution in methodology-config (C-4):** I pesi 30/20/25/15/10 di `computeProvisionalScore()` devono essere versionati in `lib/methodology-config/v0.1.ts` come gli altri pesi KORA Index? Attualmente sono hardcoded nel servizio — violazione del principio di no-hardcoding.

4. **`collective_upskilling → professional_growth` (C-3):** La mappatura `INITIATIVE_TYPE_TO_FAMILY['collective_upskilling'] = 'professional_growth'` sembra intenzionalmente escludere queste iniziative da KORA Contribution (professional_growth non è una contribution family). È corretto? O dovrebbe mapparsi a una familia eligibile come `future_and_legacy`?

5. **Naming collision `ContributionRole` (C-6):** `lib/live/contribution-lineage.ts` usa "contribution" per classificare il ruolo di un UEF record nella pipeline KORA Index/BTI — completamente diverso da KORA Contribution companion indicator. Un rename preventivo eviterebbe confusione nel team durante l'onboarding.

6. **Transaction safety per attribution (C-9):** `attributeContributionForBooking()` scrive 2 righe in `commons.contribution_event` sequenzialmente. Se la seconda scrittura fallisce (per motivi non idempotency), si crea una doppia asimmetria nell'attribuzione. Va avvolto in una transazione esplicita?

---

*Audit completato. Nessuna modifica al codice. Tutti i file elencati sono stati letti in modalità read-only.*

---

## 8. Resolution — Hardening Sprint (2026-06-23)

Sprint `fix: harden KORA Contribution methodology` — all findings addressed.

| ID | Status | Resolution |
|---|---|---|
| C-1 | PASS (no change) | `is_kora_index_component: false` correctly hardcoded at all layers — confirmed, no fix needed |
| C-2 | RESOLVED | Added `scorePresentationMode: 'provisional_demo_only'` to `ContributionSummary`. `ContributionPromoterView`/`ContributionOriginEmployerView` (Pilot+) have no score field — doctrine confirmed. Doctrine doc `lib/kora-contribution/contribution-methodology.ts` codifies FL/Pilot+ distinction. |
| C-3 | RESOLVED | Fixed `getSummaryV2()` event_nature assignment: `collective_upskilling` without `partner_id` → `event_nature=undefined` (not eligible). With `partner_id` → `event_nature='partner_service'` (eligible as ecosystem activation). Comment updated in `INITIATIVE_TYPE_TO_FAMILY`. |
| C-4 | RESOLVED | Weights (30/20/25/15/10) moved to `data/methodology/methodology-config.json` → `kora_contribution.weights`. `getContributionConfig()` added to `lib/methodology-config/v0.1.ts`. `computeProvisionalScore()` now reads from config — no hardcoded weights in service. |
| C-5 | RESOLVED | `isContributionEligibleEvent()` updated: bare pillar-only match removed. Eligibility now requires `action_family` in contribution families OR `event_nature` in contribution natures. Existing tests in `kora-contribution-pipeline.test.ts` updated accordingly. |
| C-6 | ADDRESSED | Clarifying disambiguation comment block added to `lib/live/contribution-lineage.ts`. Rename to `IUPipelineRole` recommended in a future sprint. |
| C-7 | DOCUMENTED | Live DB path is correctly gated on `production_ready = true`. All FL tenants = false. Documented in `docs/KORA_CONTRIBUTION_METHODOLOGY.md §7`. |
| C-8 | RESOLVED | `data/synthetic/kora-contribution-outputs.json`: `"KORA Index v1.0"` → `"KORA Methodology v0.1"` on all records. |
| C-9 | PARTIALLY RESOLVED | Transaction risk documented in `attributeContributionForBooking()` with partial failure detection (log PARTIAL ATTRIBUTION on second row failure). Proposed atomic fix in `supabase/proposed/026_contribution_atomic_attribution.sql`. Requires Gate 3 + CTO review before apply. Idempotency via UNIQUE constraints mitigates risk for Foundation Light (retry self-corrects). |
| C-10 | DOCUMENTED | Divergence between seed values and pipeline-computed values documented in `docs/KORA_CONTRIBUTION_METHODOLOGY.md §10`. Acceptable for demo; seed path removed post-pilot. |

**Files created/modified:**
- `lib/kora-contribution/contribution-methodology.ts` (new — doctrine constants)
- `lib/kora-engine/contribution-family-detector.ts` (C-5 — stricter eligibility)
- `lib/methodology-config/v0.1.ts` (C-4 — `getContributionConfig()`)
- `data/methodology/methodology-config.json` (C-4 — `kora_contribution` section)
- `services/kora-contribution/KoraContributionService.ts` (C-2, C-3, C-4)
- `lib/commons/cross-company-attribution.ts` (C-9 — transaction risk docs + detection)
- `lib/live/contribution-lineage.ts` (C-6 — disambiguation comment)
- `data/synthetic/kora-contribution-outputs.json` (C-8 — methodology version)
- `supabase/proposed/026_contribution_atomic_attribution.sql` (new — proposed atomic migration)
- `tests/unit/kora-contribution-pipeline.test.ts` (updated pillar-only tests)
- `tests/unit/kora-contribution-hardening.test.ts` (new — 18 hardening assertions)
- `docs/KORA_CONTRIBUTION_METHODOLOGY.md` (new — full methodology doc)
