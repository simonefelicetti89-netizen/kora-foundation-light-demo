'use client';

// KORA-WP-125 — shared table foundation. HANDOFF §9.
//
// THE DEFECT CLASSES THIS EXISTS FOR, observed on the real KORA-WP-039 route:
//   D1 — a fixed-percentage column layout clipped the action button mid-word
//        and truncated status chips to "Requisito sod…", destroying the
//        non-colour signal the accessibility contract depends on.
//   D2 — the page asked the VIEWPORT whether it was "desktop" while its own
//        container was 456px wide, so it kept rendering a 6-column table into
//        space that could not hold one.
//
// THE RULE THAT PREVENTS BOTH: this component measures ITS OWN CONTAINER, not
// the viewport (Founder Decision 3). Each column declares the width it needs;
// when the container cannot pay for them the table becomes a record list —
// never a squeezed table, never a horizontally scrolling page. A technically
// non-overflowing table that has become unreadable is not responsive success.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

export interface PxColumn<T> {
  key: string;
  header: string;
  /** Width the column needs before the table stops being worth rendering. */
  minWidth: number;
  /** Share of the surplus this column absorbs. 0 = never grows. */
  grow?: number;
  align?: 'left' | 'right';
  /** Exactly one column should truncate — the descriptive one (HANDOFF §9). */
  truncate?: boolean;
  /** Right-aligned numerics are tabular by default. */
  numeric?: boolean;
  /** Omit from the record rendering — for the column the record TITLE already
   *  states, so a narrow container does not repeat the same value twice.
   *  Additive and optional: a column without it behaves exactly as before. */
  hideInRecords?: boolean;
  render: (row: T) => ReactNode;
}

export interface PxDataTableProps<T> {
  columns: PxColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Row title used by the record-list rendering below the fold width. */
  recordTitle: (row: T) => ReactNode;
  selectedKey?: string | null;
  onSelect?: (row: T) => void;
  density?: 'compact' | 'standard';
  emptyLabel?: string;
  caption?: string;
}

const ROW_H = { compact: 36, standard: 42 } as const;

export function PxDataTable<T>({
  columns, rows, rowKey, recordTitle, selectedKey = null, onSelect,
  density = 'standard', emptyLabel = 'Nessun dato disponibile.', caption,
}: PxDataTableProps<T>) {
  const hostRef = useRef<HTMLDivElement>(null);
  // -1 = not measured yet. Starting as "wide" would flash a table that may not
  // fit; starting as "narrow" would flash a record list on every desktop load.
  const [width, setWidth] = useState(-1);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof ResizeObserver === 'undefined') { setWidth(Number.MAX_SAFE_INTEGER); return; }
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const required = columns.reduce((sum, c) => sum + c.minWidth, 0);
  // Unmeasured renders as a table so server output and first paint agree.
  const asRecords = width >= 0 && width < required;
  const rowHeight = ROW_H[density];

  if (rows.length === 0) {
    return (
      <div ref={hostRef} style={{ padding: '36px 20px', textAlign: 'center', fontFamily: PX.sans }}>
        <p style={{ fontSize: 12.5, color: PX.ink3, margin: 0 }}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div ref={hostRef} style={{ minWidth: 0 }}>
      {asRecords ? (
        <div data-px-table="records">
          {rows.map((row) => {
            const k = rowKey(row);
            return (
              <article
                key={k}
                data-selected={k === selectedKey ? 'true' : undefined}
                onClick={onSelect ? () => onSelect(row) : undefined}
                style={{
                  padding: '12px 16px', borderBottom: `1px solid ${PX.line}`,
                  display: 'grid', gap: 8, minWidth: 0, fontFamily: PX.sans,
                  background: k === selectedKey ? PX.violetTint : undefined,
                  cursor: onSelect ? 'pointer' : undefined,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, overflowWrap: 'anywhere' }}>{recordTitle(row)}</div>
                <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(0,auto) minmax(0,1fr)', gap: '4px 12px', margin: 0, fontSize: 12 }}>
                  {columns.filter((c) => !c.hideInRecords).map((c) => (
                    <div key={c.key} style={{ display: 'contents' }}>
                      <dt style={{ color: PX.ink3, fontWeight: 600 }}>{c.header}</dt>
                      <dd style={{ margin: 0, fontWeight: 650, minWidth: 0, overflowWrap: 'anywhere' }}>{c.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        // The wrapper contains any residual overflow so the PAGE never scrolls
        // sideways — but by construction the table is only rendered when the
        // container can actually pay for its columns.
        <div data-px-table="table" style={{ overflowX: 'auto', minWidth: 0 }}>
          <table style={{
            width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0,
            fontSize: 13, fontFamily: PX.sans, fontVariantNumeric: 'tabular-nums',
          }}>
            {caption ? <caption style={{ captionSide: 'top', textAlign: 'left', padding: '0 10px 8px', fontSize: 11.5, color: PX.ink3 }}>{caption}</caption> : null}
            <colgroup>
              {columns.map((c) => {
                const surplus = Math.max(0, (width < 0 ? required : width) - required);
                const totalGrow = columns.reduce((s, x) => s + (x.grow ?? 0), 0) || 1;
                const w = c.minWidth + surplus * ((c.grow ?? 0) / totalGrow);
                return <col key={c.key} style={{ width: `${w}px` }} />;
              })}
            </colgroup>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    style={{
                      position: 'sticky', top: 0, zIndex: 2, background: PX.l2,
                      textAlign: c.align ?? 'left', padding: '8px 10px', whiteSpace: 'nowrap',
                      fontSize: 11, fontWeight: 800, letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: PX.ink3,
                      borderBottom: `1px solid ${PX.line2}`,
                    }}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const k = rowKey(row);
                const selected = k === selectedKey;
                return (
                  <tr
                    key={k}
                    aria-selected={selected || undefined}
                    onClick={onSelect ? () => onSelect(row) : undefined}
                    style={{ background: selected ? PX.violetTint : undefined, cursor: onSelect ? 'pointer' : undefined }}
                  >
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        style={{
                          height: rowHeight, padding: '0 10px', verticalAlign: 'middle',
                          borderBottom: `1px solid ${PX.line}`,
                          textAlign: c.align ?? 'left',
                          fontVariantNumeric: c.numeric ? 'tabular-nums' : undefined,
                          // Only the designated column truncates. Every other
                          // cell keeps its content readable — that is the D1 rule.
                          ...(c.truncate
                            ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                            : { whiteSpace: 'normal', overflowWrap: 'anywhere' }),
                          ...(selected && i === 0 ? { boxShadow: `inset 3px 0 0 ${PX.violet}` } : null),
                        }}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
