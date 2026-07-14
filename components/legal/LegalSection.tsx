// components/legal/LegalSection.tsx — PUBLIC-PRIVACY-FOUNDATION-05
// Renders one PrivacySection. Placeholder paragraphs are always visually
// distinct (bordered callout, explicit label) — never hidden, in any
// environment, until a human replaces them with confirmed content.

import type { PrivacySection, PrivacyParagraph } from '@/lib/legal/privacy-content';

function Paragraph({ paragraph, index }: { paragraph: PrivacyParagraph; index: number }) {
  if (typeof paragraph === 'string') {
    return (
      <p style={{ margin: '0 0 12px', lineHeight: 1.7, fontSize: 14, color: 'rgba(6,3,43,0.72)' }}>
        {paragraph}
      </p>
    );
  }

  return (
    <p
      data-testid="privacy-placeholder"
      key={index}
      style={{
        margin: '0 0 12px',
        lineHeight: 1.7,
        fontSize: 14,
        fontWeight: 700,
        color: '#7A3B00',
        background: 'rgba(255, 176, 32, 0.14)',
        border: '1px solid rgba(255, 176, 32, 0.55)',
        borderRadius: 8,
        padding: '10px 14px',
      }}
    >
      [DA COMPLETARE PRIMA DELLA PUBBLICAZIONE: {paragraph.label}]
    </p>
  );
}

export function LegalSection({ section }: { section: PrivacySection }) {
  return (
    <section
      id={section.id}
      data-testid={`privacy-section-${section.id}`}
      style={{ marginBottom: 32 }}
    >
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#06032B', margin: '0 0 12px' }}>
        {section.heading}
      </h2>
      {section.paragraphs.map((paragraph, index) => (
        <Paragraph key={index} paragraph={paragraph} index={index} />
      ))}
    </section>
  );
}
