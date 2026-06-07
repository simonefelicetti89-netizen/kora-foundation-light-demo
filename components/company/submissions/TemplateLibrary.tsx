'use client';

// components/company/submissions/TemplateLibrary.tsx
// Reusable template download library.
// Used in /company/status and inside the submission wizard.

import { SUBMISSION_TEMPLATES } from '@/lib/company-submissions/templates';
import type { SubmissionTemplate } from '@/lib/company-submissions/templates';

interface Props {
  /** When set, only show the template with this id */
  highlightId?: string;
  /** Compact mode: reduced padding, no description */
  compact?: boolean;
}

function TemplateCard({ tmpl, compact }: { tmpl: SubmissionTemplate; compact?: boolean }) {
  return (
    <a
      href={`/templates/${tmpl.fileName}`}
      download
      style={{
        display: 'block',
        textDecoration: 'none',
        padding: compact ? '10px 12px' : '14px 16px',
        borderRadius: 8,
        background: 'rgba(6,3,43,0.03)',
        border: '1px solid rgba(6,3,43,0.08)',
        cursor: 'pointer',
      }}
      data-template-id={tmpl.id}
      data-testid={`template-card-${tmpl.id}`}
    >
      <div className="flex items-start gap-2">
        <div style={{
          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
          background: 'rgba(74,127,224,0.12)', border: '1px solid rgba(74,127,224,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
        }}>
          📄
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(6,3,43,0.88)' }}>
            {tmpl.title}
          </div>
          {!compact && (
            <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', marginTop: 2 }}>
              {tmpl.description}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'rgba(74,127,224,0.65)', marginTop: compact ? 2 : 3 }}>
            {tmpl.pillarHint}
          </div>
        </div>
      </div>

      {!compact && (
        <>
          <div style={{
            marginTop: 10, padding: '7px 10px', borderRadius: 6,
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.14)',
            fontSize: 10, color: 'rgba(34,197,94,0.75)', lineHeight: 1.5,
          }}>
            ✓ {tmpl.allowedDataNote}
          </div>
          <div style={{
            marginTop: 6, padding: '7px 10px', borderRadius: 6,
            background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)',
            fontSize: 10, color: 'rgba(239,68,68,0.65)', lineHeight: 1.5,
          }}>
            ✗ {tmpl.forbiddenFieldsNotice}
          </div>
        </>
      )}

      <div style={{
        marginTop: compact ? 6 : 10, fontSize: 11, fontWeight: 600,
        color: 'rgba(74,127,224,0.80)', textAlign: 'right',
      }}>
        ↓ Scarica CSV
      </div>
    </a>
  );
}

export function TemplateLibrary({ highlightId, compact }: Props) {
  const templates = highlightId
    ? SUBMISSION_TEMPLATES.filter((t) => t.id === highlightId)
    : SUBMISSION_TEMPLATES;

  return (
    <div data-testid="template-library">
      {!compact && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 8, fontSize: 11,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
          color: 'rgba(239,68,68,0.75)', lineHeight: 1.6,
        }}
        data-testid="template-library-warning"
        >
          <strong style={{ color: 'rgba(239,68,68,0.85)' }}>Attenzione:</strong>{' '}
          Non includere nei file caricati: dati sanitari, performance individuali, salari, consensi,
          PIB, IU o attività private dei lavoratori. I template forniscono la struttura corretta.
        </div>
      )}
      <div
        className={compact ? 'flex flex-col gap-2' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}
        data-testid="template-library-grid"
      >
        {templates.map((tmpl) => (
          <TemplateCard key={tmpl.id} tmpl={tmpl} compact={compact} />
        ))}
      </div>
    </div>
  );
}
