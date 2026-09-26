'use client';

import type { ReactNode } from 'react';
import { PX } from '@/lib/design/kora-design-tokens';

/**
 * One block inside an opened disclosure.
 *
 * It exists so the KORA Index page stops carrying ~290 lines of inline
 * intelligence markup. It is a heading, an optional note and a slot — NOT a
 * card: the disclosure it sits in is already the boundary, and a filled surface
 * here would be a surface inside a surface.
 */
export function IntelligenceGroup({ title, note, children }: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section data-kora-region="intelligence-group" style={{ minWidth: 0 }}>
      <p className="kt-meta" style={{ color: PX.inkMute, marginBottom: note ? 4 : 12 }}>{title}</p>
      {note && <p className="kt-caption" style={{ color: PX.ink3, marginBottom: 12 }}>{note}</p>}
      {children}
    </section>
  );
}
