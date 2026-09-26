'use client';

// KORA-WP-141 — chapter, anchor and mobile priority.
//
// THE DEFECT THESE EXIST FOR: /company/kora-index runs ~6,901px across ~15
// top-level sections with no division other than a flat stack, and every
// canonical surface stacks its desktop order on a phone. A reader on 375px gets
// the desktop reading order at twice the length, which is reflow, not design.
//
// A CHAPTER IS NOT A CARD. The whole point is to divide a surface WITHOUT
// another bordered rectangle: a chapter is a rule, a name and an anchor. Adding
// a card here would answer card monoculture with more cards.
//
// WHAT THIS DOES NOT DO: it is not a layout engine and it does not own the
// inside of anything. Children keep their KORA-WP-140 surface roles and their
// KORA-WP-139 typography; a chapter only says where one part of a surface ends
// and the next begins, and which part a phone should meet first.

import type { ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import type { Tier } from '@/lib/design/page-archetypes';

export function Chapter({
  id, label, tier, aside, children,
}: {
  /** Anchor target. A chapter without an id cannot be linked to or tested. */
  id: string;
  label: string;
  /** The information tier this chapter carries. Declared, not inferred. */
  tier: Tier;
  /** Optional right-aligned context — never an action. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} data-kora-chapter={id} data-tier={tier} className="kora-chapter" aria-labelledby={`${id}-label`}>
      <div className="kora-chapter-head">
        <h2 id={`${id}-label`} className="kt-meta" style={{ margin: 0, flex: '1 1 auto', color: PX.ink3 }}>
          {label}
        </h2>
        {aside && <div style={{ flex: '0 0 auto', minWidth: 0 }}>{aside}</div>}
      </div>
      <div className="kora-chapter-body">{children}</div>
    </section>
  );
}

/**
 * A stack whose children may declare an explicit MOBILE order.
 *
 * Desktop keeps DOM order untouched — the declaration is inert above 767px — so
 * adopting this changes nothing a desktop reader sees. Below the breakpoint the
 * declared order applies, which is the mechanism the Benchmark contract means
 * by "re-prioritisation, never reflow".
 */
export function PriorityStack({ children }: { children: ReactNode }) {
  return <div className="kora-priority-stack">{children}</div>;
}

/**
 * Declares where this block belongs in the MOBILE reading order.
 *
 * `order` is a priority, not an index: lower arrives sooner. It is deliberately
 * required — a block inside a PriorityStack that has not thought about its
 * mobile position should not silently inherit one.
 */
export function Priority({
  order, children,
}: {
  order: number;
  children: ReactNode;
}) {
  return (
    <div
      data-mobile-order={order}
      style={{ ['--kora-mobile-order' as string]: String(order), minWidth: 0 }}
    >
      {children}
    </div>
  );
}
