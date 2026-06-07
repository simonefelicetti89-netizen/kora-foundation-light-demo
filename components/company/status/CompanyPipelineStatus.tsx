'use client';

import type { PipelineStage, PipelineStatusResult } from '@/lib/company-status/company-status-engine';
import { PIPELINE_STAGES } from '@/lib/company-status/company-status-engine';

interface Props {
  pipeline: PipelineStatusResult;
}

export function CompanyPipelineStatus({ pipeline }: Props) {
  const stages = ([1, 2, 3, 4, 5] as PipelineStage[]);

  return (
    <div>
      {/* ── Desktop: horizontal bar ─────────────────────────────────────────── */}
      <div className="hidden md:flex items-stretch gap-0">
        {stages.map((stage, idx) => {
          const isDone    = pipeline.completedStages.includes(stage);
          const isCurrent = !isDone && stage === pipeline.currentStage;
          const isNotStarted = !isDone && !isCurrent;

          const lineColor = isDone
            ? '#22c55e'
            : isCurrent
            ? 'rgba(74,127,224,0.9)'
            : 'rgba(6,3,43,0.10)';

          const dotBg = isDone
            ? '#22c55e'
            : isCurrent
            ? 'rgba(74,127,224,0.9)'
            : 'rgba(6,3,43,0.12)';

          const textColor = isDone
            ? '#22c55e'
            : isCurrent
            ? 'rgba(6,3,43,0.92)'
            : 'rgba(6,3,43,0.36)';

          return (
            <div key={stage} className="flex-1 flex flex-col items-center relative">
              {/* connector line left */}
              {idx > 0 && (
                <div
                  className="absolute top-[14px] right-1/2 left-0 h-[2px]"
                  style={{ background: lineColor, opacity: isDone || (stage === pipeline.currentStage) ? 1 : 0.3 }}
                />
              )}
              {/* connector line right */}
              {idx < stages.length - 1 && (
                <div
                  className="absolute top-[14px] left-1/2 right-0 h-[2px]"
                  style={{
                    background: pipeline.completedStages.includes((stage + 1) as PipelineStage)
                      ? '#22c55e'
                      : 'rgba(6,3,43,0.10)',
                  }}
                />
              )}

              {/* dot */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: dotBg,
                  border: isCurrent ? '2px solid rgba(74,127,224,0.7)' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: isCurrent ? '0 0 0 4px rgba(74,127,224,0.15)' : undefined,
                }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: isNotStarted ? 'rgba(6,3,43,0.30)' : '#fff' }}>
                    {stage}
                  </span>
                )}
              </div>

              {/* label */}
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: isCurrent ? 700 : 500,
                  color: textColor,
                  textAlign: 'center',
                  lineHeight: 1.3,
                  padding: '0 4px',
                }}
              >
                {PIPELINE_STAGES[stage].label}
              </div>

              {/* current pill */}
              {isCurrent && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(74,127,224,0.9)',
                    background: 'rgba(74,127,224,0.12)',
                    borderRadius: 4,
                    padding: '2px 5px',
                  }}
                >
                  Corrente
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: vertical list ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {stages.map((stage) => {
          const isDone    = pipeline.completedStages.includes(stage);
          const isCurrent = !isDone && stage === pipeline.currentStage;

          return (
            <div key={stage} className="flex items-start gap-3">
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: isDone
                    ? '#22c55e'
                    : isCurrent
                    ? 'rgba(74,127,224,0.9)'
                    : 'rgba(6,3,43,0.10)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{stage}</span>
                )}
              </div>
              <div>
                <div style={{
                  fontSize: 12,
                  fontWeight: isCurrent ? 700 : 500,
                  color: isDone ? '#22c55e' : isCurrent ? 'rgba(6,3,43,0.92)' : 'rgba(6,3,43,0.40)',
                }}>
                  {PIPELINE_STAGES[stage].label}
                  {isCurrent && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'rgba(74,127,224,0.9)',
                      background: 'rgba(74,127,224,0.12)',
                      borderRadius: 3,
                      padding: '1px 5px',
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                    }}>
                      Corrente
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.35)', marginTop: 2 }}>
                  {PIPELINE_STAGES[stage].description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
