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

import type { CSSProperties, ReactNode } from 'react';
import type React from 'react';
import { PX } from '@/lib/design/kora-design-tokens';
import type { Tier } from '@/lib/design/page-archetypes';

export function Chapter({
  id, label, tier, aside, mobileOrder, index, band, collapsible, children,
}: {
  /** Anchor target. A chapter without an id cannot be linked to or tested. */
  id: string;
  label: string;
  /** The information tier this chapter carries. Declared, not inferred. */
  tier: Tier;
  /** Optional right-aligned context — never an action. */
  aside?: ReactNode;
  /** Position in the MOBILE reading order. Inert above 767px. */
  mobileOrder?: number;
  /**
   * Chapter number. A reader should be able to tell WHERE THEY ARE without
   * counting rules — the number plus a section-scale title is what makes a
   * chapter change perceptible rather than merely present.
   */
  index?: number;
  /**
   * Tonal band. Alternating chapters sit on a different ground, so the change
   * is felt in composition rather than read from a label. This is rhythm, not
   * decoration: it uses the existing KORA ground tokens and invents no new
   * visual language.
   */
  band?: boolean;
  /**
   * Progressive disclosure, legitimate for T3-T5. It uses a real <details>, so
   * the content stays in the DOM, stays findable and stays reachable by
   * assistive technology — nothing disappears permanently.
   *
   * THE INVARIANT IS NOT THE TIER, IT IS THE LABEL: the mandatory KORA Index
   * disclosures — the index value, Confidence Score, Activation Safeguard,
   * calibration_status and methodology_version_id — live in the always-open
   * judgment and the provenance footer, never behind a toggle. T1 and T2 are
   * never collapsible, because a judgment the reader has to open is not a
   * judgment.
   */
  collapsible?: boolean;
  children: ReactNode;
}) {
  const head = (
    <>
      {index !== undefined && (
        <span aria-hidden="true" className="kora-chapter-num kt-meta">{String(index).padStart(2, '0')}</span>
      )}
      <h2 id={`${id}-label`} className="kt-section" style={{ margin: 0, flex: '1 1 auto', color: PX.ink }}>
        {label}
      </h2>
      {aside && <div style={{ flex: '0 0 auto', minWidth: 0 }}>{aside}</div>}
    </>
  );
  const attrs = {
    id,
    'data-kora-chapter': id,
    'data-tier': tier,
    // Every chapter is a band. That is what actually groups its contents into
    // ONE surface instead of leaking each child out as another top-level
    // rectangle — which is the card monoculture this package exists to end.
    // Rhythm comes from alternating the GROUND, not from some chapters having
    // one and others not.
    className: 'kora-chapter kora-chapter-band',
    'data-band': band ?? ((index ?? 0) % 2 === 0) ? 'b' : 'a',
    ...(mobileOrder === undefined ? null : {
      'data-mobile-order': mobileOrder,
      style: { ['--kora-mobile-order' as string]: String(mobileOrder) } as React.CSSProperties,
    }),
  };
  if (collapsible) {
    return (
      <details {...attrs} data-collapsible="true">
        <summary className="kora-chapter-head" style={{ cursor: 'pointer', listStyle: 'none' }}>{head}</summary>
        <div className="kora-chapter-body">{children}</div>
      </details>
    );
  }
  return (
    <section {...attrs} aria-labelledby={`${id}-label`}>
      <div className="kora-chapter-head">{head}</div>
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
