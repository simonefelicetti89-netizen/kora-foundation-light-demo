'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface Tab {
  id:       string;
  label:    string;
  content:  ReactNode;
  badge?:   string;
}

interface TabsProps {
  tabs:         Tab[];
  defaultTab?:  string;
  variant?:     'line' | 'pill';
}

// Tabs — role=tablist, keyboard accessible (arrow keys), ARIA compliant.
export function Tabs({ tabs, defaultTab, variant = 'line' }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active);

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'ArrowRight' && idx < tabs.length - 1) {
      setActive(tabs[idx + 1].id);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      setActive(tabs[idx - 1].id);
    }
  }

  return (
    <div>
      {/* Tab list */}
      <div
        role="tablist"
        style={{
          display:        'flex',
          gap:            variant === 'pill' ? 6 : 0,
          borderBottom:   variant === 'line' ? TOKENS.cardBorder : 'none',
          overflowX:      'auto',
          scrollbarWidth: 'none',
          paddingBottom:  variant === 'line' ? 0 : undefined,
        }}
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === active;
          const pillStyle: React.CSSProperties = variant === 'pill' ? {
            background:  isActive ? TOKENS.accent : TOKENS.inkBorder,
            color:       isActive ? '#FFFFFF' : TOKENS.inkSecondary,
            borderRadius: 999,
            padding:     '6px 14px',
            border:      'none',
          } : {
            background:  'transparent',
            color:       isActive ? TOKENS.ink : TOKENS.inkHint,
            borderBottom: isActive ? `2px solid ${TOKENS.accent}` : '2px solid transparent',
            borderRadius: 0,
            padding:     '10px 16px',
            border:      'none',
          };

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              style={{
                fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:    isActive ? 700 : 500,
                fontSize:      13,
                cursor:        'pointer',
                transition:    'all 150ms ease',
                whiteSpace:    'nowrap',
                display:       'inline-flex',
                alignItems:    'center',
                gap:           6,
                minHeight:     44,
                ...pillStyle,
              }}
            >
              {tab.label}
              {tab.badge && (
                <span style={{
                  fontSize:    10,
                  fontWeight:  700,
                  background:  isActive ? 'rgba(255,255,255,0.25)' : TOKENS.accentSoft,
                  color:       isActive ? '#FFFFFF' : TOKENS.accent,
                  borderRadius: 999,
                  padding:     '1px 7px',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab panel */}
      {current && (
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          style={{ paddingTop: 20 }}
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
