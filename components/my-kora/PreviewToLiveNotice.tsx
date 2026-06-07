'use client';
// B84-B Task 3: Per-route preview-to-live context block for My KORA pages.
// Answers 4 questions for the worker:
//   1. What is this page?
//   2. What does the preview data represent?
//   3. What feeds it in Pilot+?
//   4. Privacy guarantee.
// Worker-first language. No architecture jargon. No technical IDs.

import { TOKENS } from '@/lib/design/kora-design-tokens';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export interface PreviewToLiveNoticeProps {
  what: string;
  preview: string;
  live: string;
  privacy: string;
  style?: React.CSSProperties;
}

export function PreviewToLiveNotice({ what, preview, live, privacy, style }: PreviewToLiveNoticeProps) {
  return (
    <div style={{
      background:   TOKENS.surface,
      border:       `1px solid rgba(6,3,43,0.10)`,
      borderLeft:   `3px solid ${TOKENS.accent}`,
      borderRadius: TOKENS.cardRadiusSm,
      padding:      '10px 14px',
      display:      'flex',
      flexDirection:'column',
      gap:          6,
      ...style,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
        <span style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, color: TOKENS.accent, letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0 }}>Questa pagina</span>
        <span style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.ink }}>{what}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
        <span style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint, letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0 }}>Anteprima</span>
        <span style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary }}>{preview}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
        <span style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, color: TOKENS.success, letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0 }}>In Pilot+</span>
        <span style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary }}>{live}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline', paddingTop: 4, borderTop: `1px solid rgba(6,3,43,0.06)` }}>
        <span style={{ fontFamily: FONT, fontSize: '10px', fontWeight: 700, color: TOKENS.inkHint, letterSpacing: '0.07em', textTransform: 'uppercase', flexShrink: 0 }}>Privacy</span>
        <span style={{ fontFamily: FONT, fontSize: '11.5px', color: TOKENS.inkSecondary }}>{privacy}</span>
      </div>
    </div>
  );
}
