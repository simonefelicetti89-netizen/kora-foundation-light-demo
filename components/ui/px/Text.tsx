'use client';

// KORA-WP-139 — the shared typographic primitives.
//
// Nine components, one per canonical role. A caller states WHAT THE TEXT IS,
// never how big it should be — that is the whole point. `<Label>` and
// `fontSize: 13` render the same pixels today, but only one of them still says
// something true after the scale is recalibrated, and only one of them can be
// audited.
//
// WHY CLASSES AND NOT STYLE OBJECTS: `display`, `title` and `section` carry a
// mobile variant, and a media query cannot live in a style object. The `.kt-*`
// classes in app/globals.css hold the breakpoint; the numbers in them are
// asserted against TYPE in lib/design/kora-design-tokens.ts by test, so there
// is still exactly one numeric authority.
//
// NOT A FLAG MATRIX: there is no `size`, no `variant`, no `weight="sm"`. The
// only modifiers are `emphasis` — which picks the heavier weight the role's own
// documented range already permits — and `tabular`, for figures a reader
// compares down a column.

import type { CSSProperties, ElementType, ReactNode } from 'react';
import { TYPE, type TypeRole } from '@/lib/design/kora-design-tokens';

interface TextProps {
  children: ReactNode;
  /** Render as a different element. Semantics stay the caller's choice. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Figures a reader compares down a column. */
  tabular?: boolean;
  /** The heavier weight this role's documented range already allows. */
  emphasis?: boolean;
  title?: string;
  id?: string;
}

function make(role: TypeRole, defaultAs: ElementType) {
  const step = TYPE[role];
  const heavier = step.weights[step.weights.length - 1];
  function Role({
    children, as, className, style, tabular, emphasis, ...rest
  }: TextProps) {
    const Tag = as ?? defaultAs;
    return (
      <Tag
        {...rest}
        className={['kt-' + role, tabular ? 'kt-num' : null, className].filter(Boolean).join(' ')}
        style={emphasis && heavier !== step.weight ? { fontWeight: heavier, ...style } : style}
      >
        {children}
      </Tag>
    );
  }
  Role.displayName = role;
  return Role;
}

/** One analytical statement per surface. Never a heading. */
export const Display = make('display', 'p');
/** The page or surface title. */
export const Title = make('title', 'h1');
/** A major division of a surface. */
export const Section = make('section', 'h2');
/** A division inside a section. */
export const Subsection = make('subsection', 'h3');
/** Sustained reading. Never shrinks on mobile. */
export const Body = make('body', 'p');
/** Supporting prose that qualifies body text. */
export const Secondary = make('secondary', 'p');
/** A control or field label. */
export const Label = make('label', 'span');
/** The reading floor — footnotes, hints, table text. */
export const Caption = make('caption', 'p');
/** Eyebrows, provenance stamps, micro-labels. The ONLY role at the 11px floor. */
export const Meta = make('meta', 'span');
