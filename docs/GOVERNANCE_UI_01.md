# Governance UI 01 — Platform Governance/DPO Surface

**Data:** 2026-07-12
**Branch:** `feature/governance-ui-01`
**Tipo:** Read-only admin UI surface — nessuna migration, nessuna Supabase call, nessuna RLS, nessuna RPC, nessun feature flag abilitato, nessuna decisione CTO/DPO presa, nessun gate chiuso.

## Perché questo sprint

L'audit di piattaforma aggiornato ha rilevato che i contenuti di governance di KORA esistono già in documenti solidi (`docs/PILOT_GOVERNANCE.md`, `docs/PILOT_PRIVACY_GOVERNANCE.md`, `docs/KORA_LINK_GATE_REPORT.md`, ecc.), ma restano principalmente document-based, non UI-based — dopo KORA Link Shell e Partner Surface, questo era il prossimo gap di credibilità di piattaforma visibile. Questo sprint introduce `/admin/governance`, la prima superficie UI che rende visibili dentro la piattaforma i confini di privacy, lo stato dei gate, il consenso e la registrazione di audit.

## Scopo della pagina

`/admin/governance` è un **registro di governance in sola lettura**. Rende esplicito, in un'unica vista:

1. **Panoramica di governance** — principi di privacy della piattaforma (nessun ranking individuale, azienda solo aggregata, partner con visibilità worker-initiated, KORA Link proposed/non applicato).
2. **Stato dei gate** — riutilizza `getKoraLinkGates()` da `lib/kora-link/ecosystem.ts` (la stessa fonte canonica già usata da Control Tower e KORA Link Governance) — nessun dato duplicato o re-inventato.
3. **Registro decisioni pendenti** — 10 voci, tutte esplicitamente "Aperta / pending", raggruppate per owner (DPO/Legal, CTO, CTO+Founder, CTO+DPO). Sei di queste hanno dettaglio più esteso su `/admin/kora-link/governance` (linkate, non duplicate); quattro sono nuove voci più tecniche (worker self-select, percorso di lookup pubblico, concorrenza di attivazione, grant service_role su audit_log vs pattern SECURITY DEFINER) tratte dai marker `TODO-RLS`/`TODO-RPC` in `035`/`036`.
4. **Mappa del confine privacy** — cosa vede/non vede ciascun attore (Company, Worker, Partner, KORA Admin, DPO/Legal), con link alle pagine concrete che già implementano ciascun confine.
5. **Evidenze e documenti** — riferimenti testuali (non link navigabili, `docs/` non è una route servita) a `QA_STATUS.md`, `E2E_GOLDEN_PATH.md`, `E2E_TWO_TENANT_ISOLATION.md`, `KORA_LINK_GATE_REPORT.md`, `PARTNER_SURFACE_01.md`, `PILOT_PRIVACY_GOVERNANCE.md` — senza rivendicare una verifica più recente di quella già dichiarata in quei documenti.

## Cosa la pagina NON fa (per design)

- Non approva alcuna decisione legale o tecnica pendente.
- Non chiude alcun gate.
- Non attiva KORA Link.
- Non modifica alcuna regola di visibilità dei dati.
- Non introduce testo di consenso finale, non decide retention, hashing di `request_fingerprint`, soglia di aggregazione, o procedura di break-glass DPO.
- Non chiama Supabase, DB, o RPC — dati statici/in-memory (principi, gate status derivato da `ecosystem.ts`, elenco decisioni) generati server-side senza alcuna query.

## Integrazione con KORA Link Governance

`/admin/kora-link/governance` (KORA-LINK-SHELL-01) resta specifica a KORA Link. `/admin/governance` è la superficie di piattaforma. Le due pagine si linkano a vicenda:
- `/admin/governance` → link a `/admin/kora-link/governance` per il dettaglio KORA-Link-specifico.
- `/admin/kora-link/governance` → link a `/admin/governance` per il registro di piattaforma.

Nessun contenuto è duplicato integralmente — le 6 decisioni condivise compaiono in forma sintetica su `/admin/governance` con rimando esplicito, non ricopiate per intero.

## Navigazione

Aggiunto un nuovo gruppo di primo livello **"Governance"** in `lib/navigation/admin-nav-groups.ts`, separato da "Operations" — non annidato solo dentro KORA Link, coerentemente con il fatto che questa è ora una superficie di credibilità di piattaforma, non un sotto-argomento operativo.

## Cosa resta esplicitamente aperto

Tutte le 10 decisioni della registry, il gate status (nessun gate chiuso da questo sprint), e ogni claim di validazione nei documenti collegati — nessuno di questi è stato toccato, deciso, o rivendicato come più aggiornato da questo sprint.

## Documenti collegati

`docs/PILOT_GOVERNANCE.md`, `docs/PILOT_PRIVACY_GOVERNANCE.md`, `docs/KORA_LINK_GATE_REPORT.md`, `docs/KORA_LINK_STATUS.md`, `docs/KORA_LINK_CHANGELOG.md`, `docs/PARTNER_SURFACE_01.md`.
