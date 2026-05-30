// lib/decision-pack/pdf-runtime.ts
// PDF rendering abstraction — SERVER-SIDE ONLY.
//
// @sparticuz/chromium and puppeteer-core are imported ONLY in this file.
// No other file in this project may import these packages.
//
// Platform strategy:
//   process.platform === 'linux' (Vercel / Lambda) → @sparticuz/chromium + puppeteer-core
//   otherwise (macOS / Windows dev)                → playwright (locally installed Chromium)
//
// Cold start note (Vercel Pro): first request decompresses the ~67MB Chromium binary
// to /tmp. Subsequent warm invocations reuse the cached binary — fast.
//
// Vercel Hobby (50MB function limit): function size will exceed the limit.
// The PDF endpoint returns 501; HTML preview remains the export path.

import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// ── Linux/Vercel path: @sparticuz/chromium + puppeteer-core ──────────────────

async function renderWithSparticuz(html: string): Promise<Buffer> {
  // @sparticuz/chromium v149: no headless/defaultViewport props — set explicitly.
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args:       chromium.args,
    executablePath,
    headless:   true,
  });
  try {
    const page = await browser.newPage();
    // 'load' is correct: HTML is fully self-contained (base64 images, inline CSS).
    // puppeteer-core v25 excludes networkidle0/2 from setContent waitUntil.
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin:          { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ── macOS/Windows dev path: playwright (locally installed Chromium) ──────────

async function renderWithPlaywright(html: string): Promise<Buffer> {
  // Dynamic import: playwright uses a local browser installed via npx playwright install chromium.
  // Not available on Vercel — this path is dev-only.
  const { chromium: playwrightChromium } = await import('playwright');
  const browser = await playwrightChromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin:          { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders an HTML string to an A4 PDF Buffer.
 * Throws if the runtime cannot launch — caller should handle gracefully.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  if (process.platform === 'linux') {
    return renderWithSparticuz(html);
  }
  return renderWithPlaywright(html);
}
