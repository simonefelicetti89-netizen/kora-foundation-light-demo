'use client';

// KORA-WP-125 — shared system message. HANDOFF §12, §20.
// A 3px left bar + icon + text. Four severities only: ok · info · warn · risk.
// Severity is carried by bar, icon and wording together — never colour alone.
// Structure of the copy is the caller's: what happened → what it means →
// what to do (HANDOFF §20). This primitive never invents the wording.

import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { PX, PX_TONE } from '@/lib/design/kora-design-tokens';

type NoticeTone = 'ok' | 'info' | 'warn' | 'risk';

const ICON = { ok: CircleCheck, info: Info, warn: TriangleAlert, risk: CircleAlert } as const;

export function Notice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  const t = PX_TONE[tone];
  const Icon = ICON[tone];
  return (
    <div
      role={tone === 'risk' ? 'alert' : 'status'}
      style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 14px',
        borderRadius: PX.rInner, fontSize: '13px', lineHeight: 1.55, fontFamily: PX.sans,
        background: t.tint, color: t.text, boxShadow: `inset 3px 0 0 ${t.fill}`,
      }}
    >
      <Icon size={16} strokeWidth={2} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
      <span style={{ minWidth: 0, flex: '1 1 220px', overflowWrap: 'anywhere' }}>{children}</span>
    </div>
  );
}
