// tests/unit/b140c-activation-signature.test.ts
// B140-C — KORA Activation Signature / STRATO visual integration.
//
// PRIOR HISTORY (accurate as of B140-C, preserved as a record, not verbatim
// given the volume): this file exercised components/my-kora/KoraActivationSignature.tsx
// and WorkerActivationSignatureCard.tsx (STRATO normalization invariants, no
// avatar/trophy/badge, "Composizione del periodo, non una classifica."
// copy), services/my-kora-preview/MyKoraPreviewService.ts (period_iu_total,
// activation_profile, "Life Anchor" naming), and
// app/my-kora/personal-impact-balance/page.tsx's copy (period-iu-total
// testid, KORA Link card, forbidden "Wellbeing Pioneer" naming).
//
// B-WORKER "One Product / No Demo Runtime" correction (2026-09-06):
// KoraActivationSignature.tsx, WorkerActivationSignatureCard.tsx, and
// MyKoraPreviewService.ts are all deleted (zero real callers, verified
// fresh before deletion). app/my-kora/personal-impact-balance/page.tsx is
// now a pure, unconditional redirect() to /worker/personal-impact-balance —
// it has none of this copy anymore. components/brand/KoraStratoMark.tsx
// (brand STRATO, unrelated to the worker preview) and
// lib/design/kora-design-tokens.ts are untouched by this retirement. See
// lib/architecture/registry.ts svc.my-kora-preview and
// tests/unit/bworker-preview-runtime-retirement.test.ts for the regression
// guard proving the retirement.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

describe('B140-C KoraActivationSignature — retired component, retired preview service', () => {
  it('components/brand/KoraStratoMark.tsx (unrelated brand mark) is unaffected', () => {
    const src = read('components/brand/KoraStratoMark.tsx');
    expect(src).toContain('benchmark');
    expect(src).toContain('GEOMETRIA DI BRAND');
  });

  it('KoraActivationSignature.tsx and WorkerActivationSignatureCard.tsx no longer exist', () => {
    expect(() => read('components/my-kora/KoraActivationSignature.tsx')).toThrow();
    expect(() => read('components/my-kora/WorkerActivationSignatureCard.tsx')).toThrow();
  });
});
