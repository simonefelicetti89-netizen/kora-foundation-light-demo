// lib/decision-pack/pdf-strategy.ts
// B79-P0-3: PDF delivery strategy for Vercel Hobby constraint.
//
// Vercel Hobby has a 50MB function size limit. @sparticuz/chromium weighs 67MB.
// Foundation Light v0.1 uses HTML preview as the primary delivery path.
// Automated PDF export is opt-in via NEXT_PUBLIC_KORA_PDF_ENABLED=true.
//
// When PDF is disabled (default):
//   - PDF buttons render as "Stampa / Salva PDF" pointing to the HTML preview URL
//   - Browser print dialog (Cmd+P / Ctrl+P) produces a PDF from the styled HTML
//   - No Chromium binary required; no Vercel function size issue
//
// When PDF is enabled (self-hosted or Vercel Pro with larger limits):
//   - PDF buttons point to /api/admin/decision-pack/pdf
//   - Chromium-based rendering via @sparticuz/chromium + puppeteer-core

export type PdfDeliveryMode = 'browser_print' | 'api_render';

export function getPdfDeliveryMode(): PdfDeliveryMode {
  if (typeof process !== 'undefined') {
    if (process.env.NEXT_PUBLIC_KORA_PDF_ENABLED === 'true') return 'api_render';
  }
  if (typeof window !== 'undefined') {
    if ((window as Window & { NEXT_PUBLIC_KORA_PDF_ENABLED?: string }).NEXT_PUBLIC_KORA_PDF_ENABLED === 'true') return 'api_render';
  }
  return 'browser_print';
}

export function isPdfApiEnabled(): boolean {
  return getPdfDeliveryMode() === 'api_render';
}

export interface PdfLinkConfig {
  href: string;
  label: string;
  title: string;
  openInNewTab: boolean;
}

export function getPdfLinkConfig(previewUrl: string, pdfUrl: string): PdfLinkConfig {
  if (isPdfApiEnabled()) {
    return {
      href:        pdfUrl,
      label:       'PDF',
      title:       'Scarica Decision Pack in PDF',
      openInNewTab: true,
    };
  }
  return {
    href:        previewUrl,
    label:       'Stampa / Salva PDF',
    title:       'Apri anteprima HTML — usa Stampa (Cmd+P) per salvare come PDF',
    openInNewTab: true,
  };
}
