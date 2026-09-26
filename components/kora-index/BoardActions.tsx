'use client';

import { RankedGroup, RankedItem, RankedLine } from '@/components/ui/px';

interface BoardAction {
  priority: number;
  action:   string;
  detail:   string;
  signal?:  string;
  effort?:  string;
}

interface BoardActionsProps {
  actions: BoardAction[];
}

// BoardActions — 3 board-level recommended actions.
// Shown BEFORE the technical breakdown panels.
// Purpose: executive can understand what to decide without reading the full analysis.
//
// KORA-WP-141: action #1 used to invert to an ink card with an accent disc while
// #2 and #3 stayed cream with a drop shadow — a second "hero" competing with the
// actual T1 one screen above. Rank is the numeral now, as everywhere else.
export function BoardActions({ actions }: BoardActionsProps) {
  if (!actions.length) return null;
  const shown = actions.slice(0, 3);

  return (
    <RankedGroup tier="subsection" title="Azioni raccomandate al board" note="Segnali direzionali — correlazione ≠ causalità">
      {shown.map((a, i) => (
        <RankedItem
          key={i}
          rank={a.priority}
          title={a.action}
          last={i === shown.length - 1}
        >
          <RankedLine>{a.detail}</RankedLine>
          {(a.signal || a.effort) && (
            <RankedLine tone="tertiary">
              {[a.signal ? `Segnale atteso: ${a.signal}` : null, a.effort ? `Effort: ${a.effort}` : null]
                .filter(Boolean).join(' · ')}
            </RankedLine>
          )}
        </RankedItem>
      ))}
    </RankedGroup>
  );
}
