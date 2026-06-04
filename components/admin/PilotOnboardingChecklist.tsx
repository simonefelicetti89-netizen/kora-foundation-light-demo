'use client';

// components/admin/PilotOnboardingChecklist.tsx
// B61-B: Visual onboarding progress checklist for KORA_ADMIN.
// Shows the canonical 10-step pilot onboarding flow.
// Visual only — no backend state, no API calls.
// Highlight the current step to orient the operator.

const STEPS = [
  { id: 1, label: 'Crea azienda',           hint: '/admin/companies/new',  route: '/admin/companies/new'  },
  { id: 2, label: 'Crea utente company',    hint: '/admin/company-users',  route: '/admin/company-users'  },
  { id: 3, label: 'Carica dati',            hint: '/admin/data-intake',    route: '/admin/data-intake'    },
  { id: 4, label: 'Preview & PII guard',    hint: 'upload-preview API',    route: '/admin/data-intake'    },
  { id: 5, label: 'Accetta upload',         hint: 'accept API',            route: '/admin/data-intake'    },
  { id: 6, label: 'Genera UEF™',            hint: '/admin/uef-review',     route: '/admin/uef-review'     },
  { id: 7, label: 'Approva UEF™',           hint: '/admin/uef-review',     route: '/admin/uef-review'     },
  { id: 8, label: 'Baseline workforce',     hint: 'workforce-baseline API', route: '/admin/tenants'       },
  { id: 9, label: 'Esegui scoring',         hint: '/admin/uef-review',     route: '/admin/uef-review'     },
  { id: 10, label: 'Decision Pack & accesso', hint: '/company/workspace', route: '/admin/company-workspace' },
] as const;

interface PilotOnboardingChecklistProps {
  /** ID of the current step (1–10). Highlights that step. */
  currentStep?: number;
  /** If true, shows a compact single-row version */
  compact?: boolean;
}

export function PilotOnboardingChecklist({ currentStep, compact = false }: PilotOnboardingChecklistProps) {
  if (compact) {
    return (
      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          4,
          flexWrap:     'wrap',
          padding:      '10px 14px',
          background:   'rgba(6,3,43,0.03)',
          border:       '1px solid rgba(6,3,43,0.07)',
          borderRadius: 8,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.40)', marginRight: 6, fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif' }}>
          Pilot:
        </span>
        {STEPS.map((step, i) => {
          const isActive  = step.id === currentStep;
          const isPast    = currentStep !== undefined && step.id < currentStep;
          return (
            <span key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <a
                href={step.route}
                style={{
                  fontSize:      10,
                  fontWeight:    isActive ? 700 : 500,
                  color:         isActive ? '#06032B' : isPast ? 'rgba(47,125,85,0.80)' : 'rgba(6,3,43,0.38)',
                  background:    isActive ? 'rgba(6,3,43,0.08)' : 'transparent',
                  borderRadius:  4,
                  padding:       isActive ? '1px 5px' : '0',
                  textDecoration:'none',
                  fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                }}
              >
                {isPast ? '✓ ' : ''}{step.id}. {step.label}
              </a>
              {i < STEPS.length - 1 && (
                <span style={{ color: 'rgba(6,3,43,0.20)', fontSize: 10 }}>→</span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        background:   '#F8F6F1',
        border:       '1px solid rgba(6,3,43,0.08)',
        borderRadius: 12,
        padding:      '16px 20px',
      }}
    >
      <p style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         'rgba(6,3,43,0.40)',
        marginBottom:  12,
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
      }}>
        Flusso Onboarding Pilot — 10 passi
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {STEPS.map((step) => {
          const isActive  = step.id === currentStep;
          const isPast    = currentStep !== undefined && step.id < currentStep;
          const isFuture  = currentStep !== undefined && step.id > currentStep;
          return (
            <a
              key={step.id}
              href={step.route}
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                padding:       '7px 10px',
                borderRadius:  7,
                background:    isActive ? 'rgba(6,3,43,0.06)' : 'transparent',
                border:        isActive ? '1px solid rgba(6,3,43,0.12)' : '1px solid transparent',
                textDecoration: 'none',
                transition:    'background 0.15s',
              }}
            >
              {/* Step indicator */}
              <span style={{
                flexShrink:   0,
                width:        22,
                height:       22,
                borderRadius: '50%',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     10,
                fontWeight:   700,
                fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                background:   isPast  ? 'rgba(47,125,85,0.15)'
                            : isActive ? 'rgba(6,3,43,0.85)'
                            : 'rgba(6,3,43,0.07)',
                color:        isPast  ? '#2F7D55'
                            : isActive ? '#FFFFFF'
                            : 'rgba(6,3,43,0.38)',
                border:       isPast  ? '1px solid rgba(47,125,85,0.30)'
                            : isActive ? 'none'
                            : '1px solid rgba(6,3,43,0.12)',
              }}>
                {isPast ? '✓' : step.id}
              </span>

              {/* Step label */}
              <span style={{
                flex:       1,
                fontSize:   12,
                fontWeight: isActive ? 700 : isFuture ? 400 : 500,
                color:      isPast  ? '#2F7D55'
                          : isActive ? 'rgba(6,3,43,0.90)'
                          : 'rgba(6,3,43,0.42)',
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              }}>
                {step.label}
              </span>

              {/* Hint */}
              {isActive && (
                <span style={{
                  fontSize:   10,
                  fontWeight: 500,
                  color:      'rgba(6,3,43,0.35)',
                  fontFamily: 'monospace',
                }}>
                  {step.hint}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
