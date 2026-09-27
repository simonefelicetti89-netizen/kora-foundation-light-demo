# 278 — KORA-WP-129 Wave 4b Cohort W1: Founder acceptance and publication

Status: PUBLISHED
Date: 2026-09-27
Governing registry: `.kora-audit/output/219_*`
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report `274`)
Executable acceptance authority: Registry 219 `AN.10` (report `277`)

**`KORA-WP-129` remains READY. W1 is a completed, accepted migration cohort — it is NOT WP129 completion.**
**No `AL.2` entry is made. No claim is made that `KORA-WP-129` is COMPLETE.**

---

## 1. What was published

| | |
|---|---|
| Accepted & proven Product SHA | **`a379d5a4c644004475397fcdf0b66cd50cf8a2e0`** |
| Previous canonical | `1f786de15b97d04e83abb96a2f8075083a71c772` |
| Surfaces | `/worker/activity-discovery` · `/worker/activity-discovery/detail` · `/worker/kora-link/activate` |

Product source changed across the whole cohort — four files:
`app/worker/activity-discovery/page.tsx` · `app/worker/activity-discovery/detail/page.tsx` ·
`app/worker/kora-link/activate/page.tsx` · `lib/design/page-archetypes.ts`
(plus 9 archived evidence PNGs under `docs/product/visual-evidence/kora-wp-129/`).

## 2. Founder acceptance record — all three surfaces

Three review cycles were required. Both rejected candidates remain in ancestry and were never amended.

| surface | decision | acceptance anchored to |
|---|---|---|
| `/worker/activity-discovery` | **ACCEPT FOR PUBLICATION** | `caadb102206afad8ef548701aaaf79f7fbc627c3` |
| `/worker/activity-discovery/detail` | **ACCEPT FOR PUBLICATION** | `caadb102206afad8ef548701aaaf79f7fbc627c3` |
| `/worker/kora-link/activate` | **ACCEPT FOR PUBLICATION** | `a379d5a4c644004475397fcdf0b66cd50cf8a2e0` |

**Review history.** `dba85fd80a2312b31a05558f17dca2fdd5008b3a` — first visual candidate, **REJECTED** on
information hierarchy, composition and vertical repetition; the WP139–142 migration in it was judged sound.
`caadb102206afad8ef548701aaaf79f7fbc627c3` — second candidate, Discovery and Detail **ACCEPTED**, KORA Link
returned for targeted remediation. `a379d5a4c644004475397fcdf0b66cd50cf8a2e0` — final, all three accepted.

**Why the Discovery/Detail acceptance carries forward to the final SHA, proven mechanically before publication:**
their source blobs are byte-identical between `caadb10` and `a379d5a` —
`app/worker/activity-discovery/page.tsx` = `651919436daacfda844a109accf4ac9feea7415d` and
`app/worker/activity-discovery/detail/page.tsx` = `1a746b9d9da2659a78d98095d9505cb9f3949d74` at **both** SHAs.
The only Product change between them is the authorised Worker KORA Link presentation change
(1 file, +95/−14).

**The residual `DIRECTORY_INDEX` length WARN on `/worker/activity-discovery`** — 2308px against a 2000px
threshold — is **accepted residual evidence, not a remediation requirement**, by explicit Founder ruling. It was
deliberately left firing rather than silenced with a laxer archetype. The surface is visually frozen for W1.

## 3. What the cohort actually changed

**Root cause of the original 4649px was not styling.** The lane model rendered each activity once per pillar it
belonged to — primary *and* every secondary — so 8 real activities produced **15 card renders**. Founder
adjudication: each activity renders **exactly once**, in its **primary** pillar group, with secondary pillars as
row metadata. The catalogue represents real activities, not activity × taxonomy-membership combinations. 15 → 8,
proven in the DOM by 8 disabled CTAs.

**Migration:** 102 primary literal decisions (fontSize 74 + spacing 28) and 74 adjacent drift instances → **0**.
Five below-floor violations fixed as a consequence (the surfaces carried `fontSize` 10 and 10.5, beneath the
11px floor). Sentence-case prose was never mapped to `meta`, the one uppercase role.

**Card monoculture reduced by composition, not by shrinking cards.** Boxed surfaces: activity-discovery **4**,
detail **3**, kora-link **11 → 5**. Governed primitives only, none invented: `PageHead`, `Workspace`/`Col`,
`Band`, `SplitRegion`/`SplitPart`, `Region`, `Facts`, `RankedGroup`, `Notice`, `Status`, `Chip`.

`RankedItem` was deliberately **not** used for catalogue rows: its contract carries rank in a numeral, and a
partner-activity catalogue has no rank — using it would have asserted the ranking this cohort was forbidden to
invent. `RankedGroup`'s grouping is used; the numeral is not.

**Archetypes declared** for all three previously-undeclared routes: `DIRECTORY_INDEX`, `RECORD_DETAIL`,
`DISCLOSURE_STATIC`.

**Measurements, original → final:** activity-discovery 4757 → **2308px**; detail 1159 → **1018px**; kora-link
2756 → **1940px**. Aggregate 8672 → **5266px**, −39%. Every mobile ratio **acceptable**; no overflow-X at any
canonical viewport; 0 page errors.

**Product semantics frozen and verified: 0 copy strings lost** on any surface, checked by extracting and diffing
every prose run. Every preview/"Non attivo" semantic, every disabled CTA and `title`, the KORA Link pilot
StatusCard tones and their derivation from `context.koraLinkEnabled`, catalogue records and ordering, and the
governed `kora-link-back-to-workspace` testid are unchanged.

## 4. KORA Link: Worker-facing capability presentation

The shared capability records in `lib/kora-link/ecosystem.ts` carry **one** `label` and **one** `description` for
every role, both authored in implementation language. `KoraLinkCapabilityCard` accepts only `capability` — there
is **no presentation hook and no prop analogous to `showReadiness`**. The smallest truthful solution was
therefore an **additive, Worker-only presentation mapping at the Worker call site**, with the shared model
untouched.

Verified in the rendered DOM: **zero** occurrences of `Route pubblica`, `DB lookup`, `fn_public_lookup_link`,
`KORA_LINK_DB_LOOKUP_ENABLED`, `KORA_LINK_ACTIVATION_ENABLED`, `Gate richiesti`, `Schema 034`, `RLS 035`,
`Fallback`, `Checkbox`. All nine internal readiness gates are absent. No capability was removed: `public_route`
and `db_lookup` are **re-expressed**, not filtered. No state was reinterpreted — "Disponibile" is absent because
no worker capability is currently available.

`lib/kora-link/**` and `components/kora-link/**`: **0 files changed**. `app/company`, `app/partner`,
`app/admin`: **0 files changed**. Company and Partner render none of the five worker records in any case.

### 4.1 `no_raw_token_persistence` — Founder presentation ruling

`KoraLinkBoundaryCard` left the Worker surface with the shared dashboard. `worker_controls_activation` is still
rendered **verbatim**. `no_raw_token_persistence` — *"solo il digest HMAC-SHA256 attraversa il livello dati"* —
is **not** rendered verbatim; its worker-facing meaning is stated instead: the NFC URL never carries the
worker's name, email or other sensitive data.

**Founder ruling: the Worker-facing presentation decision is ACCEPTED.** Implementation wording — `digest
HMAC-SHA256`, `livello dati`, raw-token-persistence terminology — must **not** be restored to the Worker UI
merely to mirror the underlying contract.

**This ruling is PRESENTATION ONLY.** It authorises no weakening or modification of token-persistence
guarantees, hashing/digest behaviour, privacy semantics, data-layer behaviour, consent semantics or any security
invariant. The technical invariant remains preserved in Product truth and in tests, which were verified
unmodified.

## 5. Proof CI — exact SHA

| | |
|---|---|
| run | **#354**, id `36340277749`, attempt 1, event `push` |
| branch | `integration/pxc-w1-ci-proof-2026-09-27` |
| head SHA | **`a379d5a4c644004475397fcdf0b66cd50cf8a2e0`** |
| conclusion | **success** |

All four mandatory jobs green: *TypeScript, tests, build, lint (blocking)* · *DB-backed gate — RLS-03/05/06 +
KORA Link behavioral suite* · *E2E golden path* · *E2E smoke*.

## 6. Canonical integration and canonical CI

Fast-forward, **no merge commit, no rebase, no force**: `1f786de..a379d5a` on
`integration/kora-canonical-product-2026-09-22`. Canonical was an ancestor; 3 commits advanced
(`dba85fd`, `caadb10`, `a379d5a`) — the two rejected visual candidates are preserved in ancestry by design.

| | |
|---|---|
| run | **#355**, id `36340532118`, event `push` |
| head SHA | **`a379d5a4c644004475397fcdf0b66cd50cf8a2e0`** |
| conclusion | **success** — all four mandatory jobs green |

## 7. Local validation at the accepted candidate

`tsc --noEmit` clean · full suite **443 files / 14094 passed**, 349 skipped, 5 todo · 9 Worker privacy suites
**483 passed**, verified **unmodified** before running · lint **0 errors** (warnings 5970 → 5830) · build OK ·
**0 test files modified across the entire cohort** · literal debt **0 primary / 0 adjacent** on all three
surfaces.

## 8. `KORA-WP-126` acceptance-instrument residual — rail-viewport nondeterminism

**Finding.** The **1200px rail** capture is **not byte-reproducible**. Two control captures taken at *identical
code and identical seed* produced different rail bytes (`6f8ff8673f1fb7b2` vs `a29409ed9cf49c88`) at *identical
heights*. Desktop (1440×900) and mobile (767×812) are byte-deterministic.

**Consequence, and what it does not do.** Rail bytes cannot serve as a change signal. This does **not** invalidate
the Founder acceptance of Discovery and Detail, which rests on: byte-identical **source** blobs, byte-identical
**desktop** evidence, byte-identical **mobile** evidence, identical measured geometry at all three viewports, and
direct Founder visual review. The accepted archived evidence for those two surfaces was therefore left in place
rather than overwritten with noisier captures.

**Disposition: a `KORA-WP-126` acceptance-instrument residual requiring separate treatment.** `KORA-WP-126` is
**not reopened** here, no new package is created, and the capture harness is **not modified** by this task.

## 9. Registry position — unchanged

| | before | after |
|---|---|---|
| `KORA-WP-129` | **READY** | **READY** |
| `AL.2` COMPLETE | 70 | 70 |
| READY | 39 | 39 |
| BLOCKED | 35 | 35 |
| TOTAL | 144 | 144 |

`KORA-WP-129` is not in `AL.2`; its Hard Dep `126` is. By `AL.1` it derives as **READY** — unchanged by this
publication. No lifecycle transition occurred, no status was written, and no total moved.

**W1 is one accepted cohort inside Wave 4b.** WP129's acceptance debt remains outstanding.

## 10. Remaining WP129 debt after W1 — carried forward, not remediated

**384 primary literal decisions + 253 adjacent drift across 10 Worker files.** Largest: `DynamicCVClient` 111,
`onboarding/_flow` 64, `commons` 52, `BookingsClient` 47.

Also outstanding: **W2** (bookings, commons, opportunities, personal-impact-balance) and **W3** (dynamic-cv,
dynamic-cv/print, onboarding, setup-password), both **frozen and unstarted**, both requiring fixture provisioning
that is not authorised; `ROUTE_ARCHETYPE` declarations for the remaining 8 Worker routes; **WP140 state-grammar
adoption, still zero across the Worker environment**; WP-125-native recomposition of the remaining surfaces;
navigation consistency; the "privacy surface integrated rather than adjacent" Founder judgment; the
`/worker/dynamic-cv/print` page error.

Adjacent, explicitly not fixed: shared KORA Link role-aware presentation-model debt; shared
implementation-flavoured KORA Link capability and state labels; `Notice`'s internal 12.5px residual; the WP126
rail nondeterminism above; the governance-verifier residual (PENDING ENFORCEMENT IMPLEMENTATION); the
`next/font/google` build-time dependency and CI-reliability residuals; the `KORA-WP-127` "36 canonical Admin
surfaces" discrepancy.

## 11. Scope and safety

Not started: W2, W3, `KORA-WP-127`, `128`, `130`, `131`, `143`. Not reopened: `126`, `139`, `140`, `141`, `142`.
`KORA-WP-117` WIP untouched. Website/public-marketing workstream remains separate.

`main` untouched at `70c4cfa`. Production `azdnepfmwrmacruykskm` never contacted. No staging writes, no schema
change, no migration, no RLS change, no backfill, no migration 090, no Gate-3 publication, no secrets, no PR
created or merged, no force push. No governance file is embedded in the Product candidate
(`.kora-audit` files in the W1 range: 0).
