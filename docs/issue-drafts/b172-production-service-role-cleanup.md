# B172 follow-up: production service_role local backup cleanup

**Labels suggested:** `security`, `credentials`, `manual-action`, `pilot-readiness`
**Priority:** High
**Source:** B172-RO Credential Audit (read-only, complete)

## Problem statement

The B172-RO credential audit found a real Production Supabase `service_role` key present in a local, untracked backup file: `.env.production.local.backup`. This file also contains the corresponding Production `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

This key was **never committed to git** — confirmed by an exhaustive content-based scan (`git log --all -G<pattern>`) across all 669 reachable commits, every local branch, and every remote-tracking branch. No history rewrite is needed. The exposure is working-tree-only: a real, privileged, unrotated credential sitting at rest in a plaintext file on a local machine, outside git's tracking (the file is covered by the blanket `.env*` rule in `.gitignore`).

## Why it matters

- A Supabase `service_role` key bypasses Row Level Security entirely — full read/write access to the Production database, including all tenant data, worker PIB records, and audit logs.
- "Never committed" and "not in git history" does not mean "no exposure." The key is live, unrotated, plaintext, at rest on disk, in a file whose own name (`...backup`) signals it was kept around rather than actively used or protected.
- This is the single highest-severity finding from B172-RO. Everything else the audit found (staging keys, staging test-account passwords) is lower blast-radius by comparison — this is the one item that reaches live tenant/worker data if it were ever exposed.
- It sits outside the scope of the credential cleanup plan already recorded in `docs/PILOT_GOVERNANCE.md` §15, which is explicitly scoped to "staging Supabase Auth password rotation only" and explicitly excludes Production. This finding needs its own explicitly-approved action — it should not be silently folded into that existing plan, and that existing plan should not be read as already covering it.

## What was confirmed safe

- The key was never committed to git — confirmed across all reachable history (all local + remote-tracking branches, both filename-based and content-based search).
- No `'use client'` component, browser-bundled code path, or client-reachable import chain references this key or this file — the client/server boundary audit in B172-RO found it architecturally clean.
- CI (`.github/workflows/ci.yml`) references zero repository secrets and does not touch this file.
- No history rewrite is required — since the value was never committed, there is nothing in git to remove.

## Manual action required

This cannot be completed by an agent session under the standing rules (no Supabase access, no key rotation, no `.env` file modification/deletion). The operator must, in the Supabase Dashboard, for the **Production** project only:

1. Confirm whether this `service_role` key is still the one actively configured anywhere it's genuinely needed (if anywhere) — or whether it's simply a stale leftover backup with no current legitimate use.
2. If still in active use somewhere: rotate the key via Supabase Dashboard → Production project → Settings → API, then update the one legitimate reference to the new value (manually, outside of any agent session, following the same "no secret through terminal/chat/log/doc/PR" discipline already established for the staging password rotation in `docs/PILOT_GOVERNANCE.md` §15).
3. If not in active use: no rotation is strictly required, but the file should still be deleted from disk once confirmed safe to remove — a stale, unused, real credential sitting on disk indefinitely is unnecessary risk regardless of rotation status.
4. Either way, delete or securely archive `.env.production.local.backup` from the local machine once its status is resolved — it should not persist as a plaintext backup after this cleanup.

## Acceptance criteria

- [ ] Operator has confirmed, in the Supabase Dashboard, whether the key in `.env.production.local.backup` is still active/in use anywhere.
- [ ] If in use: key rotated via Supabase Dashboard; the one legitimate consumer (if any) updated to the new value; old key confirmed rejected.
- [ ] `.env.production.local.backup` deleted from disk (or securely archived outside the working tree) after resolution.
- [ ] This ticket's outcome recorded in `docs/PILOT_GOVERNANCE.md` (or a linked doc) so it isn't rediscovered as a fresh surprise in a future audit — following the same "plan recorded, no values included" pattern already used for §15.
- [ ] No secret value ever appears in the resolution record — booleans and dates only ("rotated: yes, 2026-MM-DD" style), consistent with how §15 documents its own plan.

## Do-not-do list

- Do not rotate the key from within an agent session — Dashboard only, operator-driven.
- Do not paste the key value, or any redacted fingerprint of it, into this ticket, a commit, a PR, chat, or a log at any point.
- Do not touch the staging `service_role` keys as part of this ticket — those are a separate, lower-severity item noted in the B172-RO report, not in scope here.
- Do not fold this into the existing `docs/PILOT_GOVERNANCE.md` §15 plan without updating that doc's stated scope — §15 explicitly excludes Production today, and that boundary should stay explicit and intentional, not quietly widened.
- Do not run any Supabase CLI/API command against Production as part of resolving this ticket from a coding session — Dashboard UI only.
- Do not delete the file from within an agent session unless a future session is explicitly authorized to do so after the operator confirms rotation/disposition status.

## Recommended order of operations

1. Operator reviews this ticket and the underlying B172-RO audit report.
2. Operator checks (outside any agent session) whether the Production `service_role` key is referenced anywhere it's actually needed.
3. Operator rotates the key in the Supabase Dashboard if step 2 finds active use, or proceeds directly to cleanup if not.
4. Operator deletes/archives `.env.production.local.backup` locally.
5. Operator (or a future explicitly-scoped session) records the outcome in `docs/PILOT_GOVERNANCE.md`, values-free, mirroring the existing §15 entry style.
6. Only after the above: this ticket can be closed.
