// lib/platform-boundaries.ts
// B80-B: Canonical boundary definitions for the KORA platform.
// Consumed by BoundaryBadge, BoundaryBanner, and all page-level boundary labels.
// Never import scoring, methodology, or DB config from this file.

export type BoundaryMode = 'LIVE' | 'DEMO' | 'PREVIEW' | 'FUTURE_VISION';

export const BOUNDARY_LABEL: Record<BoundaryMode, string> = {
  LIVE:         'DATI LIVE',
  DEMO:         'DATI DEMO',
  PREVIEW:      'PREVIEW',
  FUTURE_VISION: 'FUTURE VISION',
};

export const BOUNDARY_DESCRIPTION: Record<BoundaryMode, string> = {
  LIVE:         'Backed by real Supabase data — intended for pilot use.',
  DEMO:         'Synthetic data — usable for demonstration only.',
  PREVIEW:      'Architectural shell or incomplete implementation — not production-ready.',
  FUTURE_VISION: 'Intentionally not implemented in Foundation Light.',
};

// Italian UI descriptions
export const BOUNDARY_DESCRIPTION_IT: Record<BoundaryMode, string> = {
  LIVE:         'Dati reali del tenant autenticato. Nessun fallback demo attivo.',
  DEMO:         'Dati sintetici dimostrativi. Nessun dato aziendale reale caricato.',
  PREVIEW:      'Shell architetturale — implementazione non completata.',
  FUTURE_VISION: 'Non implementato in Foundation Light.',
};

// Inline style tokens for each boundary mode (dark background context — sidebar, dark headers)
export const BOUNDARY_BADGE_STYLE_DARK: Record<BoundaryMode, React.CSSProperties> = {
  LIVE:         { background: 'rgba(47,125,85,0.22)',  color: 'rgba(120,210,145,0.95)', border: '1px solid rgba(47,125,85,0.45)' },
  DEMO:         { background: 'rgba(199,111,61,0.18)', color: 'rgba(220,150,80,0.95)',  border: '1px solid rgba(199,111,61,0.40)' },
  PREVIEW:      { background: 'rgba(74,127,224,0.18)', color: 'rgba(130,180,240,0.90)', border: '1px solid rgba(74,127,224,0.38)' },
  FUTURE_VISION:{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.12)' },
};

// Inline style tokens for light background context — company pages, reports
export const BOUNDARY_BADGE_STYLE_LIGHT: Record<BoundaryMode, React.CSSProperties> = {
  LIVE:         { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' },
  DEMO:         { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa' },
  PREVIEW:      { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' },
  FUTURE_VISION:{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
};

// Banner background/text for dual-path pages (light bg context)
export const BOUNDARY_BANNER_STYLE: Record<'LIVE' | 'DEMO', React.CSSProperties> = {
  LIVE: { background: '#f0fdf4', borderColor: '#86efac', color: '#166534' },
  DEMO: { background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' },
};
