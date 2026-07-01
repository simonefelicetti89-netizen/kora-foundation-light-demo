# B169 FASE 1 — Analisi Ridondanza Demo & Preview

## Metodo di analisi

Per ogni voce della sidebar "Demo & Preview":
- (a) La pagina usa `useRole`/`useDemoState`? (grep)
- (b) Il contenuto è accessibile anche via VISTA: Company Admin + navigazione normale?
- Ridondante = (a) SÌ e (b) SÌ entrambi.

## Tabella analisi

| Voce sidebar | URL | usa useRole/useDemoState | Accessibile via VISTA+nav | RIDONDANTE | Note |
|---|---|---|---|---|---|
| Anteprima Live Cockpit | `/admin/companies?from=preview` | NO (redirect) | N/A | SÌ | È un redirect alla companies list. Non è più una pagina demo. Rimossa da Demo Lab. |
| KORA Commons Network | `/commons` | NO | NO (URL separato da /company/commons) | NO | URL diverso da KORA Space company. Pagina separata. |
| Guided Demo ACME-001 | `/admin/demo/acme-001` | NO | NO (dataset curato specifico) | NO | Narrativa di vendita strutturata, dataset curato, non duplicabile via VISTA. |
| Registro KORA Index | `/demo/index-registry` | NO | NO | NO | Contenuto unico — registry aggregato multi-company. |
| Portfolio Aziende | `/demo/portfolio` | NO | NO | NO | Vista portfolio multi-company, non riproducibile via VISTA singola company. |
| Rete Advisor & Partner | `/demo/network` | NO | NO | NO | Network view specifica per presentazioni. |
| Demo Scoring (Synthetic) | `/admin/operator` | NO | NO | NO | Operatore scoring con dati sintetici, tool tecnico. |
| Anteprima Classificazione | `/demo/ai-onboarding` | NO | NO | NO | AI ingestion preview, tool tecnico. |
| GTM Preview | `/demo/gtm` | NO | NO | NO | Contenuto GTM specifico, non in navigazione normale. |
| Benchmark Preview | `/demo/benchmarks` | NO | NO | NO | Benchmark view aggregata, non in navigazione normale. |
| Demo Guide | `/demo/guide` | NO | NO | NO | Guida narrativa demo per presentazioni. |
| KORA Index™ Demo | `/demo/company/kora-index` | **SÌ** | **SÌ** (= /company/kora-index via VISTA) | **SÌ** | Stessi mock service, stessa UI. RIDONDANTE. |
| Status Center Demo | `/demo/company/status` | **SÌ** | **SÌ** (= /company/status via VISTA) | **SÌ** | RIDONDANTE. |
| Activation Demo | `/demo/company/activation` | **SÌ** | **SÌ** (= /company/activation via VISTA) | **SÌ** | RIDONDANTE. |
| Pillar Intelligence Demo | `/demo/company/pillars` | **SÌ** | **SÌ** (= /company/pillars via VISTA) | **SÌ** | RIDONDANTE. |
| Decision Pack Demo | `/demo/company/reports` | **SÌ** | **SÌ** (= /company/reports via VISTA) | **SÌ** | RIDONDANTE. |
| Financial Governance Demo | `/demo/company/financial` | **SÌ** | **SÌ** (= /company/financial via VISTA) | **SÌ** | RIDONDANTE. |

## Decisioni FASE 4

**Link sidebar RIMOSSI** (6 voci ridondanti):
- `/demo/company/kora-index`
- `/demo/company/status`
- `/demo/company/activation`
- `/demo/company/pillars`
- `/demo/company/reports`
- `/demo/company/financial`

**Link sidebar RIMOSSI** (1 voce non-demo):
- `/admin/companies?from=preview` — ora voce operativa, già in Operations se serve

**Link sidebar MANTENUTI** nel gruppo Demo Lab (9 voci):
1. `/admin/demo/acme-001` — Guided Demo ACME-001
2. `/commons` — KORA Commons Network
3. `/demo/index-registry` — Registro KORA Index
4. `/demo/portfolio` — Portfolio Aziende
5. `/demo/network` — Rete Advisor & Partner
6. `/admin/operator` — Demo Scoring (Synthetic)
7. `/demo/ai-onboarding` — Anteprima Classificazione
8. `/demo/gtm` — GTM Preview
9. `/demo/benchmarks` — Benchmark Preview
10. `/demo/guide` — Demo Guide

> Nota: `/commons` è separato da `/admin/commons` (moderazione admin). Mantenuto in Demo Lab per navigazione sintetica.
