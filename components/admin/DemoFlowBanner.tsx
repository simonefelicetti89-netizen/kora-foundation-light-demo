'use client';

// components/admin/DemoFlowBanner.tsx
// B61-B: Reusable banner for demo/synthetic flows.
// Applied to all pages that show demo data but might appear operational.
// Never suppress this banner — users must always know they are in demo mode.

interface DemoFlowBannerProps {
  title?: string;
  description?: string;
  canonicalHref?: string;
  canonicalLabel?: string;
}

export function DemoFlowBanner({
  title = 'Synthetic Demo Flow',
  description = 'This flow does not create or modify live company data. All data shown is synthetic.',
  canonicalHref,
  canonicalLabel,
}: DemoFlowBannerProps) {
  return (
    <div
      role="alert"
      style={{
        background:   'rgba(199,111,61,0.08)',
        border:       '1px solid rgba(199,111,61,0.35)',
        borderRadius: 10,
        padding:      '12px 16px',
        display:      'flex',
        alignItems:   'flex-start',
        gap:          12,
        marginBottom: 20,
      }}
    >
      {/* Amber dot */}
      <span
        style={{
          flexShrink:   0,
          marginTop:    3,
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   '#C76F3D',
          display:      'block',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background:    'rgba(199,111,61,0.14)',
              border:        '1px solid rgba(199,111,61,0.30)',
              borderRadius:  4,
              padding:       '2px 6px',
              color:         '#C76F3D',
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            }}
          >
            SYNTHETIC DEMO
          </span>
          <p
            style={{
              fontSize:   12,
              fontWeight: 600,
              color:      'rgba(6,3,43,0.78)',
              margin:     0,
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            }}
          >
            {title}
          </p>
        </div>
        <p
          style={{
            fontSize:   11.5,
            color:      'rgba(6,3,43,0.52)',
            marginTop:  4,
            lineHeight: 1.55,
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          }}
        >
          {description}
        </p>
        {canonicalHref && canonicalLabel && (
          <p style={{ marginTop: 6, fontSize: 11, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
            <span style={{ color: 'rgba(6,3,43,0.40)' }}>Per il flusso live reale: </span>
            <a
              href={canonicalHref}
              style={{ color: '#C76F3D', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              {canonicalLabel} →
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
