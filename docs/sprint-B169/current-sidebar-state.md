# B169 FASE 1 — Stato Sidebar Admin (pre-refactor)

Misurato su commit 0e8c469 (dopo B168.5 Phase 2 + B168.8 fix).

## Conteggio attuale

**Total href items in Sidebar.tsx:** 77 occurrences (inclusi Company Admin, Worker, ecc.)

**KORA_ADMIN groups e items:**

| Gruppo | Badge | N. voci |
|---|---|---|
| Provisioning | LIVE | 6 |
| Intake & Review | LIVE | 4 |
| Scoring & Output | LIVE | 2 |
| Monitoraggio | LIVE | 1 |
| Contenuti | LIVE | 3 |
| Worker Preview | SYNTHETIC | 3 |
| Demo & Preview | SYNTHETIC | 17 |
| Founder | FOUNDER | 1 |
| Future Vision | ROADMAP | 1 |
| **Totale admin** | | **38** |

## Voci Demo & Preview (17)

1. `/admin/companies?from=preview` — Anteprima Live Cockpit (redirect)
2. `/commons` — KORA Commons Network
3. `/admin/demo/acme-001` — Guided Demo ACME-001
4. `/demo/index-registry` — Registro KORA Index
5. `/demo/portfolio` — Portfolio Aziende
6. `/demo/network` — Rete Advisor & Partner
7. `/admin/operator` — Demo Scoring (Synthetic)
8. `/demo/ai-onboarding` — Anteprima Classificazione
9. `/demo/gtm` — GTM Preview
10. `/demo/benchmarks` — Benchmark Preview
11. `/demo/guide` — Demo Guide
12. `/demo/company/kora-index` — KORA Index™ Demo
13. `/demo/company/status` — Status Center Demo
14. `/demo/company/activation` — Activation Demo
15. `/demo/company/pillars` — Pillar Intelligence Demo
16. `/demo/company/reports` — Decision Pack Demo
17. `/demo/company/financial` — Financial Governance Demo

## Target B169

- KORA_ADMIN groups: 6 (da 9)
- Total KORA_ADMIN items: ~14-16 voci live + Demo Lab variabile
- Sidebar data-driven: ADMIN_NAV_GROUPS in lib/navigation/admin-nav-groups.ts
- Gruppi collassabili, espanso solo il gruppo con route attiva
