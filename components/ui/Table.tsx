'use client';

import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

export interface Column<T = Record<string, unknown>> {
  key:       string;
  label:     string;
  align?:    'left' | 'right' | 'center';
  numeric?:  boolean;
  width?:    string;
  render?:   (value: unknown, row: T, index: number) => ReactNode;
}

interface TableProps<T = Record<string, unknown>> {
  columns:     Column<T>[];
  rows:        T[];
  keyField?:   string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  stickyHead?: boolean;
}

// Table — sticky header, zebra hairline, tabular-nums, hover terracotta.
// Accessible: role=table, scope=col, keyboard navigable rows.
export function Table<T = Record<string, unknown>>({
  columns,
  rows,
  keyField   = 'id',
  onRowClick,
  emptyLabel = 'Nessun dato disponibile.',
  stickyHead = true,
}: TableProps<T>) {
  return (
    <div style={{
      background:   TOKENS.surface,
      border:       TOKENS.cardBorder,
      borderRadius: TOKENS.cardRadius,
      boxShadow:    TOKENS.cardShadow,
      overflow:     'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          style={{
            width:          '100%',
            borderCollapse: 'collapse',
            fontFamily:     'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          }}
        >
          <thead>
            <tr style={{
              background:  stickyHead ? TOKENS.taupe : TOKENS.surface,
              position:    stickyHead ? 'sticky' : undefined,
              top:         stickyHead ? 0 : undefined,
              zIndex:      stickyHead ? 10 : undefined,
              borderBottom: TOKENS.cardBorder,
            }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{
                    padding:       '10px 16px',
                    textAlign:     col.align ?? 'left',
                    fontSize:      10,
                    fontWeight:    600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         TOKENS.inkHint,
                    whiteSpace:    'nowrap',
                    width:         col.width,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    textAlign: 'center',
                    padding:   '32px 16px',
                    fontSize:  13,
                    color:     TOKENS.inkHint,
                    fontStyle: 'italic',
                  }}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr
                key={String((row as Record<string, unknown>)[keyField] ?? i)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row); }
                } : undefined}
                style={{
                  borderBottom:    i < rows.length - 1 ? TOKENS.cardBorder : 'none',
                  cursor:          onRowClick ? 'pointer' : 'default',
                  transition:      'background 130ms ease',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    (e.currentTarget as HTMLElement).style.background = TOKENS.accentHover;
                    (e.currentTarget as HTMLElement).style.borderLeft = `3px solid ${TOKENS.accent}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) {
                    (e.currentTarget as HTMLElement).style.background = '';
                    (e.currentTarget as HTMLElement).style.borderLeft = '';
                  }
                }}
              >
                {columns.map((col) => {
                  const val = (row as Record<string, unknown>)[col.key];
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding:            '12px 16px',
                        textAlign:          col.align ?? 'left',
                        fontSize:           13,
                        color:              TOKENS.inkSecondary,
                        fontVariantNumeric: col.numeric ? 'tabular-nums' : undefined,
                        fontWeight:         col.numeric ? 600 : 400,
                        whiteSpace:         'nowrap',
                      }}
                    >
                      {col.render ? col.render(val, row, i) : String(val ?? '—')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
