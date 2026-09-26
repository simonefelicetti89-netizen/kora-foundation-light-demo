# 236 — KORA-WP-063 — My-Access Generalization + Dead Stub Removal — CANONICAL COMPLETION REPORT

**Date:** 2026-09-21
**Package:** `KORA-WP-063` — My-Access Generalization + Dead Stub Removal (I3, NOT BASE PILOT SCOPE)
**Status transition:** `KORA-WP-063` **READY → COMPLETE**
**Founder ruling applied:** **Reading A — KILL-ONLY** (2026-09-21)
**Founder Visual Acceptance:** **not required and not claimed** — this package changes no user-facing surface.
**Commit:** `da62e7660942f87bc3daddcb79b67dcfe2818ce6` — LOCAL ONLY, **NOT PUSHED**
**Parent:** `0bc14f6e484110ce65be8aa0c185a68208057359` (`KORA-WP-125`, the accepted shared Product Experience foundation)
**Worktree / branch:** `/Users/simonefelicetti/KORA-wp063-worktree` · `feature/kora-wp-063-my-access-generalization`

---

## 1. WHAT THE RULING DECIDED

`KORA-WP-063`'s canonical record carries two halves. The Founder ruled that only one is executable under the
current scope-trigger state:

| Half | Requirement | Disposition |
|---|---|---|
| **KILL** | `MYKORA-003b`, `BOOKING-002` — retire the confirmed-dead Booking Light stub | **EXECUTED** |
| **GENERALIZE** | `MYKORA-003` — generalize the live Commons `BookingService` *for Partner access* | **DEFERRED, recorded** |

The KILL half is unconditional, verifiable and self-contained. The GENERALIZE half is not: `46_GLOBAL_GAP_MATRIX`
defines its remediation as generalizing the real Commons `BookingService` **for Partner access**, whose dependencies
are `PARTNER-003` (`KORA-WP-056`, scope trigger "Partner delivery selected") and `BOOKING-001` (`KORA-WP-050`,
scope trigger "Booking selected"). Both triggers are INACTIVE, neither owner is COMPLETE, and no Partner capacity
object exists in the Product for a worker to request access to. Implementing it would have required either
activating a Founder-controlled scope trigger or inventing "new booking feature scope" — this package's own
explicit **Out of Scope**.

The deferral is recorded in two independent places so it cannot be silently dropped: this report and Registry `219`'s
own Section B row, and the repository itself (`lib/architecture/registry.ts`, `svc.booking-request` notes).
`MYKORA-003` re-enters scope with whichever trigger is activated first.

---

## 2. THE KILL — EVIDENCE

**Target:** `services/booking-request/BookingRequestService.ts` — 24 lines, a no-op stub whose two methods
(`getRequests`, `applyAction`) returned only `[]` and `null`.

**Classification, pre-existing and canonical:** KILL/DEAD in the requirement ledger (`64`) and the gap matrix (`46`),
`status: 'DEAD'` in the repository's own Architecture Registry, and listed in Master Plan §32's Safe Deletion Plan.
Removal was gated on **KILL CHALLENGE #2 — "verify importers first"**, and on the registry entry's own
`deletableWhen`: *"After B-REG registry is live and a repo-wide re-grep at CC-003+ time confirms still zero references."*

**Gate satisfaction, re-proved immediately before deletion and again after it:**

| Check | Result |
|---|---|
| `import … from '…booking-request…'` across `app/ services/ lib/ components/ scripts/ tests/` | **0** |
| `require('…booking-request…')` | **0** |
| dynamic `import('…booking-request…')` | **0** |
| identifier references `BookingRequestService` / `bookingRequestService` in executable code | **0** |
| backing database table (`booking_request*` in `supabase/migrations/**`) | **none — nothing to drop** |
| B-REG registry live and validated | **yes** — `tests/unit/cc003-i10-registry-completeness.test.ts` |

The only surviving textual mentions repo-wide are non-runtime: the registry's historical record, one `cc003`
assertion that reads that registry entry by id, two explanatory test comments, and one negative assertion in
`kora-wp-035` that forbids the name from appearing.

---

## 3. WHAT CHANGED

| File | Change |
|---|---|
| `services/booking-request/BookingRequestService.ts` | **DELETED** (directory removed with it — no empty shell left behind) |
| `lib/architecture/registry.ts` | `svc.booking-request` converted to the repository's established historical-record form |
| `docs/ARCHITECTURE_REGISTRY.md` | **regenerated** via `scripts/generate-architecture-doc.ts` — generated artefact, never hand-edited |
| `tests/unit/cc023-adversarial-one-truth.test.ts` | scheduled-deletion allow-list entry removed; inertness assertion superseded by an absence assertion |
| `tests/unit/kora-wp-063-my-access-generalization.test.ts` | **NEW** — 20 guards |

**Registry entry form.** The entry is not deleted with the code. It follows the precedent already set by
`svc.account`, `svc.advisor-evidence-review`, `svc.budget-to-human-impact` and `svc.company-data-intake`:
`status: 'DEAD'`, `purpose` prefixed `HISTORICAL —`, `deletableWhen: 'Already deleted — this entry is the historical
record of that deletion.'`, a WP-063 `decisionRef`, and notes opening `DELETED (file no longer exists at
primaryPath, kept here only as historical record)`. `competingWith: ['svc.commons.booking']` is **deliberately
retained** rather than emptied: the surviving implementation is an architectural fact that outlives the deletion,
and the generated DEAD table records it under Replacement. Prior history is preserved verbatim inside the notes,
including the original `deletableWhen` text — quoted there as the record of a gate that was satisfied, not as a
pending claim.

**Test-mechanism supersession (disclosed, not silent).** `cc023`'s assertion *"the 2 scheduled-DEAD stubs are
genuinely inert"* proved inertness by **reading the very file it was waiting to see deleted** — a mechanism that
cannot survive the deletion it was gating. The invariant it protected ("no retired component is reachable") is not
weakened but strengthened: the same suite's stronger rule — a DEAD primary path eligible for deletion must not
exist on disk — now applies to this path, and the assertion ends with an explicit
`expect(exists('services/booking-request/BookingRequestService.ts')).toBe(false)`. **Absence is a stronger
guarantee than inertness.** This is the same disclosed-supersession pattern ratified for WP-088, WP-039 and WP-048.

---

## 4. WHAT DID NOT CHANGE — THE LIVE PATH

Verified byte-unchanged, and guarded by the new suite:

- `services/commons/BookingService.ts` — all 8 exported functions intact (`createBooking`, `listMyBookings`,
  `cancelBooking`, `listPendingForModeration`, `listBookingsForModeration`, `moderate`, `markAttended`,
  `getAggregateForPromoter`)
- the `commons.booking` table and every migration (highest remains **089**; no migration added, none altered)
- `app/api/worker/commons/bookings/route.ts` and `app/api/worker/commons/bookings/[id]/route.ts`
- `app/worker/bookings/page.tsx` (session guard `requireWorkerUser` + `redirect('/login')` intact) and
  `app/worker/bookings/_components/BookingsClient.tsx`
- Worker navigation to `/worker/bookings` in `components/layout/Sidebar.tsx`

No route, component, shared shell, navigation entry, user-facing copy, migration, RLS policy or API contract was
modified. `BookingsClient` was deliberately **not** migrated to the WP-125 foundation: that migration is outside
this Founder-selected scope.

---

## 5. SCOPE DISCIPLINE

| Guard | Outcome |
|---|---|
| Scope trigger "Booking selected" (`KORA-WP-050`) | **not activated** — evaluated INACTIVE |
| Scope trigger "Partner delivery selected" (`KORA-WP-051`–`059`) | **not activated** — evaluated INACTIVE |
| Partner-access capability invented? | **no** — no `services/partner-access`, no `app/api/worker/partner-access`, no partner-capacity concept added to the surviving service |
| `KORA-WP-050` / `KORA-WP-056` code paths entered? | **no** |
| New booking feature scope? | **none** |
| `CLAUDE.md`, Registry `102`, Historical Registry `142` | **untouched** |
| `scripts/provision-next-review.mjs` | **not addressed** |

---

## 6. VALIDATION — ZERO FAILURES

| Gate | Result |
|---|---|
| Full Vitest | **421 files passed · 13455 passed · 325 skipped · 5 todo · 0 failed** |
| `tsc --noEmit` | **exit 0** |
| ESLint (changed files) | **exit 0, clean** |
| `next build` | **succeeds** — full route table rendered, `/worker/bookings` present |
| New WP-063 suite | **20/20 passing** |
| `cc003-i10-registry-completeness` | passing — generated doc matches `renderArchitectureDoc()` exactly |
| `cc023-adversarial-one-truth` | passing with the superseded mechanism |
| Post-deletion importer re-scan | **zero runtime consumers** |
| Staged-content secrets scan | **clean** |

One failure surfaced during validation and was fixed: a guard of my own asserted that no rendered registry row
may contain the old `deletableWhen` text, which the historical notes legitimately **quote**. The assertion was
retargeted to the semantic fact — the DEAD table's deletable-when column must state the deletion as done — rather
than to prose that is correctly preserved.

---

## 7. COMMIT INTEGRITY

| Check | Result |
|---|---|
| Commit | `da62e7660942f87bc3daddcb79b67dcfe2818ce6` |
| Parent is `0bc14f6e…` (WP-125) | **YES** |
| `KORA-WP-039` `02cf4349…` an ancestor? | **NO** (correct — sibling) |
| `KORA-WP-048` `b257d264…` an ancestor? | **NO** (correct — sibling) |
| Gate 3 `0cdc7e0d…` an ancestor? | **NO** (correct) |
| Upstream configured / pushed | **NO** — local only |
| Governance artefacts in the commit | **none** — `.kora-audit/` is gitignored and was **not** force-added |
| Commit count | **exactly one** |

---

## 8. REGISTRY 219 CONSEQUENCES — DERIVED, NOT ASSUMED

- **`KORA-WP-063` READY → COMPLETE.** The READY precondition was re-derived: its sole Hard Dep `033` is COMPLETE in
  code truth (`lib/advisor-portal/advisor-action-matrix.ts`, `app/company/advisor/page.tsx`, `app/advisor/**` all
  exist), and its Conditional Dep `050` evaluated INACTIVE.
- **Nothing is unlocked.** Section C's edge list contains no package whose Hard Deps include `063` — its only
  appearance is its own row `063:033`. Section D's only `063` edge is `063 -[cond]-> 050`, where `063` is the
  dependent, not the dependency. Zero dependents ⇒ zero promotions.
- **New aggregate: COMPLETE 59 · READY 33 · BLOCKED 33 · TOTAL 125** (59 + 33 + 33 = 125 = node count, re-counted
  from Section B).
- **Graph invariants unchanged**: 197 hard edges, 5 conditional edges, 4 scope triggers, 0 cycles. The conditional
  edge `063 -[cond]-> 050` is retained as structural — evaluated, not consumed.
- **Requirement closure ≠ package status.** `MYKORA-003` remains open as a recorded carve-out on the package's
  Section B row; it moves no mechanical status here.

---

## 9. OPEN ITEMS CARRIED FORWARD

1. **`MYKORA-003`** — Partner-access generalization of the Commons `BookingService`. Deferred pending activation of
   "Partner delivery selected" (`KORA-WP-056`) or "Booking selected" (`KORA-WP-050`). Recorded in the repository.
2. **`app/worker/bookings/**` WP-125 migration** — the Bookings UI keeps its pre-existing presentation; its
   migration onto the accepted foundation is unscheduled and belongs to a UI-bearing package, not to this one.
3. `app/company/reports/board-pack/page.tsx` and `app/my-kora/` remain on `cc023`'s scheduled-deletion allow-list,
   unchanged by this package.

---

**`KORA-WP-063` is COMPLETE under the Founder KILL-only ruling. One local commit. Not pushed.**
