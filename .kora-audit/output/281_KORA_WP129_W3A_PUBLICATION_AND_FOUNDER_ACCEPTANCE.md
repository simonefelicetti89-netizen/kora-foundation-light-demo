# 281 — KORA-WP-129 Wave 4b Cohort W3A: Founder visual acceptance and publication

Status: PUBLISHED
Date: 2026-09-28
Governing registry: `.kora-audit/output/219_*`
Governing contract: Registry 219 Section A — Founder Review Publication Contract (report `274`)
Executable acceptance authority: Registry 219 `AN.10` (report `277`)

**`KORA-WP-129` remains READY. W3A is a completed, accepted migration cohort — it is NOT WP129
completion, NOT W3B, and NOT a claim that the Worker migration is finished. No `AL.2` entry is made.**

---

## 1. What was published

| | |
|---|---|
| Accepted & proven Product SHA | **`e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8`** |
| Previous canonical | `06874e264414d209b0906be3ef562058c7f42f18` |
| Surfaces | `/worker/onboarding` (incl. `?mode=review`) · `/worker/setup-password` |
| Founder ruling | **W3A VISUAL ACCEPTANCE — GRANTED**, material and scope-limited |

Two commits, fast-forward, no merge/rebase/squash/force:

| SHA | Content |
|---|---|
| `18a6092fd0d1b945bf31404152d9a07231d55a25` | W3A migration of the two entry surfaces onto the Product Experience system |
| `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` | W3A remediation — the focused first-access shell and the trust-footer correction |

Ten files: 3 Worker source files, 3 new shell files, 1 archetype declaration, 2 test files, 1 scoped
stylesheet. Zero SQL, zero migrations, zero RLS, zero schema, zero governance files in the Product delta.

---

## 2. W3A scope

- **Worker onboarding** — the five-step privacy-boundary and profile flow.
- **Worker setup-password** — the invite-accept password creation surface.
- **First-access shell** — a third AppShell mode for exactly those two routes.

---

## 3. What the migration changed

Both surfaces were written as if they were standalone screens, while both have always rendered inside
the authenticated Worker shell. `setup-password` painted a full-viewport dark panel inside the shell's
own canvas and centred a **second KORA logo** a few hundred pixels from the sidebar's; `onboarding`
floated a 600px card carrying its own type scale. Two page frames competed in one viewport, on the
first surface a worker ever sees.

Both now compose as ordinary Product surfaces: `PageHead`, one working `Region`, one measure, the
canonical `KORA-WP-139` type roles and the `KORA-WP-141` `SPACE` scale. **Subfloor typography went from
2–6 elements per state to 0 across all captured states**; lint on the two migrated files went from 121
warnings to 21, with 0 remaining `KORA-WP-139` `fontSize` warnings.

`setup-password` also gained something it lacked rather than merely restyling: the password policy lived
only in a placeholder — the text that disappears exactly when the reader starts typing. The requirements
are now stated and check themselves off against what has been entered, **reading the same predicates the
submit guard uses**, so the page cannot promise something the guard would then refuse.

Onboarding keeps all five steps, their order, their copy, the consent gate and the API call. Steps 1–3
are the only place a worker is told what their employer can and cannot see; that text is Product truth
and is carried across verbatim, including every string `b113` pins. The language buttons lost their flag
emoji — a flag is a country, not a language, and the words already said it.

Two entry pieces shared by both surfaces live in `app/worker/_entry/`, **scoped deliberately**: promoting
a Product-wide form primitive would have touched Founder-accepted W1/W2 surfaces, which W3A was not
authorised to do.

`/worker/onboarding` and `/worker/setup-password` are declared **`OPERATIONAL_WORKSPACE`** — surfaces the
worker works through rather than reads.

---

## 4. The first-access shell — the remediation Founder required

**Root cause.** `AppShell` decided chrome from one predicate, `isPublicRoute(pathname)`, and had only
two modes: public (no chrome) and authenticated (full chrome). Both entry routes are authenticated, so
they fell into the second and received the complete Worker navigation — My KORA Home, Personal Impact
Balance, Dynamic Impact CV, Opportunità, KORA Space, Prenotazioni and several items already labelled
`preview` — plus the workspace identity chip, the route breadcrumb and, below 767px, the drawer toggle
that opens all of it. **There was no third mode.** The shell said *"you are already inside the whole
Product"* while the flow said *"you are still completing first access"*, and it offered a catalogue of
destinations to someone who had not yet set a password or acknowledged the privacy boundary.

**Remediation.** A third mode, narrowly:

- `components/layout/first-access-routes.ts` — the route predicate, in its own module **because a test
  has to assert both halves of one rule**: that these two routes get the focused shell, and that every
  other Worker route keeps the full navigation.
- `components/layout/EntryShell.tsx` — a slim top bar carrying one `KoraLogo` + "My KORA", and
  `<main id="main-content">` with a centred reading measure. No nav, no drawer, no preview items.
- `components/layout/entry-shell.module.css` — its geometry, with **no `:global` selector**, so no other
  surface can inherit it.
- `components/layout/AppShell.tsx` — one import and a three-line branch.

**The routes were deliberately NOT added to `PUBLIC_ROUTE_PREFIXES`.** That would have changed what they
mean, not merely how they look: both remain inside `app/worker/layout.tsx`'s WORKER gate. A test pins
that they were not made public.

Proven in the DOM, at 1440 and 767:

| | 18a6092 | published |
|---|---|---|
| shell mode | `full` / `mobile` | **`first-access`** |
| navigation links | 9 | **0** |
| mobile hamburger | **VISIBLE** | **absent** (not hidden — not rendered) |
| identity signals | 3 | **1** |
| horizontal overflow · pageerrors | 0 · 0 | **0 · 0** |

---

## 5. Trust footer — contract analysis before the edit, not after

| String | Category | Disposition |
|---|---|---|
| `Il tuo datore di lavoro non vede questi dati` | **Product/privacy truth** — test-pinned on other privacy surfaces (`b122`, `kora-wp-048`, `PrivacySettingsClient`) | **KEPT**, and promoted to the primary message |
| `Privacy Consent v1.0` | **version label** — appears only here, pinned by no test, and **did not match the canonical value**: the server records `CURRENT_PRIVACY_CONSENT_VERSION = 'B113-v1.0'` | **REMOVED** |
| `KORA Foundation Light` | **build label** — required on KORA Index surfaces (CLAUDE.md §6); neither entry surface shows a KORA Index | **REMOVED** |

Published presentation: `Il tuo datore di lavoro non vede questi dati.` (onboarding) and
`Il tuo datore di lavoro non può vedere questi dati.` (setup-password). **The consent version remains
computed, persisted and returned by the API exactly as before** — the removed line never carried it.

**Binding for future work:** neither removed label may be reintroduced on these two surfaces without
separate authorization.

---

## 6. Accepted contracts preserved without semantic change

**setup-password**: minimum length 8, confirmation-match guard, `supabase.auth.updateUser({ password })`,
invite-link error handling, success redirect to `/worker/onboarding`, WORKER gate, `autoComplete="new-password"`.

**onboarding**: privacy-boundary acknowledgement required (`acceptPrivacyBoundary !== true` → 400),
`display_name` ≤ 80, `preferred_lang` allowlist, success redirect to `/worker/workspace`, consent version
persisted, all three `KORA-WP-073` aria contracts verbatim, all `b113` privacy Product truth verbatim.

---

## 7. Accepted-surface regression — proven, not asserted

`/worker/workspace`, `/worker/privacy` and `/worker/bookings` were captured at 1440×900 before and after
the shell change, same fixture and same build pipeline. **All three are byte-identical (SHA-256 equal)**,
and all three still report shell `full`, 9 navigation links, 3 identity signals and content at x=248.
No re-acceptance of W1 or W2 was required or requested.

---

## 8. Two test assertions narrowly superseded — one is a real finding

Both in `tests/unit/b106b-identity-login-workspace.test.ts`, explained at the call site:

- `form usa design system KORA (TOKENS)` pinned the legacy `TOKENS` object, a visual implementation
  detail. It now asserts `PX`, the canonical token object from the same module.
- `form redirige a /worker/workspace dopo password set` asserted `toContain('/worker/workspace')` against
  the whole file. **The code has pushed `/worker/onboarding` since long before W3A** — the only
  `/worker/workspace` in the file was a header comment that contradicted it. The assertion was passing
  on a stale comment, not on behaviour. Correcting the comment surfaced the false positive. **The
  redirect is unchanged**, and the stale comment was not reinstated to keep the test green.

A governed `KORA-WP-088` test caught a hardcoded `#EAECF4` in the new stylesheet. That was a correct
catch: the stylesheet was corrected to resolve through `--px-l0`/`--px-l1`/`--px-line`; **the test was
not touched**. No existing test was weakened.

---

## 9. Proof CI — exact SHA

| | |
|---|---|
| Branch | `integration/wp129-w3a-proof-2026-09-28` |
| Remote HEAD | `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` — exact, no extra commit |
| Workflow | KORA CI **#360**, run `36471421487`, attempt 1 |
| Event / branch | `push` / the proof branch |
| Tested SHA | `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` |
| Conclusion | **SUCCESS** |

All four mandatory jobs green. Job set **verified identical** to the last accepted canonical run
(`36458662354`, report `280`) by sorted-name hash `9cd15788df1bf485` — no new acceptance standard invented.

---

## 10. Canonical integration and canonical CI

Canonical head was **read from the remote, not assumed**, and re-read immediately before the push; both
times `06874e2`. Fast-forward `06874e2..e79baf5`, 2 commits, 0 behind, **0 merge commits**.

| | |
|---|---|
| Canonical branch | `integration/kora-canonical-product-2026-09-22` |
| Previous | `06874e264414d209b0906be3ef562058c7f42f18` |
| New remote HEAD | `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` |
| Workflow | KORA CI **#361**, run `36471953014`, attempt 1 |
| Event / branch | `push` / canonical |
| Tested SHA | `e79baf5b1f0bdb1f0f43666c7ff0d1703e7b0be8` |
| Conclusion | **SUCCESS** — job-set hash `9cd15788df1bf485`, all four green |

Canonical is the exact Founder-accepted candidate. **No additional Product commit was created for
publication** — canonical is 0 commits ahead of the accepted SHA.

---

## 11. Local validation at the accepted candidate

TypeScript `tsc --noEmit` exit 0 · targeted onboarding/setup-password/auth/privacy/security suites
**34 files, 1406 passed** · design-system suites (WP073/088/126/139/140/141 + website boundary)
**10 files, 362 passed** · full suite **446 files, 14130 passed**, 349 skipped, 5 todo · lint **0 errors**
· production build exit 0.

**Governance validation — standing finding preserved unchanged.** `CLAUDE.md` references
`npm run governance:registry-check`; that script is absent from `package.json` and from every ref in this
checkout (`scripts/governance/` exists on no branch). No replacement tooling was invented. Validation
followed the precedent of reports `279` and `280`: local Product validation above, plus mechanical
registry assertions — Registry `219` is the only registry edited, `142` untouched, WP129 status string
unchanged, WP namespace count unchanged at 144, AL.2 count unchanged at 70.

---

## 12. Accepted non-blocking residuals — carried forward, NOT solved

1. The first-access shell shows no account/email context. On setup-password, seeing which address the
   password is being created for would help; session plumbing was deliberately not added to the shell in
   this pass. **Founder-accepted as non-blocking.**
2. 18 optical spacing warnings remain on the touched files, matching the established W1/W2 exception
   precedent. **Founder-accepted as non-blocking.**

Neither was addressed in the published candidate, and no polishing commit was created.

---

## 13. Review fixture excluded from Product publication

The local review-fixture commit `1b327c084e8702ffb1b2676c6914e93425dad220` remains **unpublished**: not an
ancestor of the accepted SHA, 0 remote refs, 0 fixture files in the published tree. It was restored as
untracked local infrastructure for the runtime evidence and deleted before each candidate commit.

---

## 14. Registry position — unchanged

`KORA-WP-129` status **READY → READY**. No `AL.2` entry. WP namespace unchanged at `001`–`144`, 144
distinct ids; AL.2 COMPLETE set unchanged at 70. `KORA-WP-131` remains **BLOCKED** — its Hard Deps are
`127`, `128`, `129`, none of which is in AL.2, and this publication changes none of them. No unrelated
package state altered. Registry `142` untouched.

---

## 15. W3B remains unstarted

`/worker/dynamic-cv`, `/worker/dynamic-cv/print`, `DynamicCVClient` and `print.module.css` are untouched
by both W3A commits — 0 files in the delta match them. **Defect A** and **Defect B** remain PUBLISHED and
unchanged (report `280`). **Defect C (`Data stampa`) remains `C6 / CONTRACT AMBIGUOUS`, OPEN for W3B**,
together with the Dynamic CV legacy visual debt.

Founder acceptance of W3A is **scope-limited** and is explicitly not: WP129 completion, W3B acceptance,
Dynamic CV or print acceptance, Defect C resolution, WP131 unblocking, a general Worker redesign
authorization, or a global AppShell redesign authorization.

---

## 16. Safety

`main` unchanged at `70c4cfa0dfa36d8697d8f76a3a7df8a5bf530adc`. Production Supabase `azdnepfmwrmacruykskm`
never contacted. No production operations, no staging writes, no schema changes, no migrations, no RLS
changes, no backfills, no migration 090, no Gate-3 publication, no secrets, no PR, no force push. Local
Docker Supabase only, torn down. WP117 WIP preserved exactly on `audit/mega-code-truth-2026-09`, never
staged, moved or cleaned, and absent from both the Product and governance publications.
