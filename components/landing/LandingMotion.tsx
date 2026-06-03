'use client';

import { useEffect } from 'react';
import styles from '@/app/landing.module.css';

// ── Impact Field SVG nodes ──────────────────────────────────────────────────
const FIELD_NODES = [
  { id: 'LIFE',       x: 220, y: 74,  r: 8,   accent: true,  lx: 220, ly: 52,  anchor: 'middle' },
  { id: 'GROWTH',     x: 356, y: 172, r: 6,   accent: false, lx: 374, ly: 176, anchor: 'start'  },
  { id: 'CONNECTION', x: 303, y: 330, r: 5.5, accent: false, lx: 316, ly: 354, anchor: 'middle' },
  { id: 'IMPACT',     x: 137, y: 330, r: 5.5, accent: false, lx: 124, ly: 354, anchor: 'middle' },
  { id: 'LEGACY',     x: 84,  y: 172, r: 5,   accent: false, lx: 66,  ly: 176, anchor: 'end'    },
] as const;

const CX = 220, CY = 218, NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// LandingMotion — mounts observers and SVG field after hydration.
// Respects prefers-reduced-motion at runtime.
export function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Build Impact Field SVG ────────────────────────────────────────────
    const fieldLines = document.getElementById('field-lines');
    const fieldNodes = document.getElementById('field-nodes');

    if (fieldLines && fieldNodes) {
      // Radial lines center → each node
      FIELD_NODES.forEach((n) => {
        fieldLines.appendChild(svgEl('line', {
          x1: String(CX), y1: String(CY), x2: String(n.x), y2: String(n.y),
          stroke: 'rgba(247,245,239,.07)', 'stroke-width': '1',
        }));
      });
      // Cross connectors
      FIELD_NODES.forEach((n, i) => {
        const nx = FIELD_NODES[(i + 1) % FIELD_NODES.length];
        fieldLines.appendChild(svgEl('line', {
          x1: String(n.x), y1: String(n.y), x2: String(nx.x), y2: String(nx.y),
          stroke: 'rgba(247,245,239,.04)', 'stroke-width': '1',
        }));
      });
      // Nodes + labels
      FIELD_NODES.forEach((n) => {
        if (n.accent) {
          fieldNodes.appendChild(svgEl('circle', {
            cx: String(n.x), cy: String(n.y), r: String(n.r + 9),
            fill: 'none', stroke: 'rgba(199,111,61,.22)', 'stroke-width': '1',
          }));
        }
        fieldNodes.appendChild(svgEl('circle', {
          cx: String(n.x), cy: String(n.y), r: String(n.r),
          fill: n.accent ? '#C76F3D' : 'rgba(247,245,239,.52)',
        }));
        const t = svgEl('text', {
          x: String(n.lx), y: String(n.ly),
          'text-anchor': n.anchor,
          style: "font-family:'Plus Jakarta Sans';font-weight:700;font-size:8.5px;fill:rgba(247,245,239,.46);letter-spacing:.08em",
        });
        t.textContent = n.id;
        fieldNodes.appendChild(t);
      });
    }

    // ── Gauge count-up ────────────────────────────────────────────────────
    const gauge = document.getElementById('gauge') as SVGCircleElement | null;
    const gnum  = document.getElementById('gauge-num');
    const R = 48, CIRC = 2 * Math.PI * R, TARGET = 34;

    if (gauge) {
      gauge.setAttribute('stroke-dasharray', String(CIRC));
      gauge.setAttribute('stroke-dashoffset', String(CIRC));

      if (reduced) {
        gauge.setAttribute('stroke-dashoffset', String(CIRC - (TARGET / 100) * CIRC));
        if (gnum) gnum.textContent = String(TARGET);
      } else {
        setTimeout(() => {
          const dash = (TARGET / 100) * CIRC;
          gauge.style.transition = 'stroke-dashoffset 1.7s cubic-bezier(.16,1,.3,1)';
          gauge.setAttribute('stroke-dashoffset', String(CIRC - dash));
          let start: number | null = null;
          const step = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / 1700, 1);
            const e = 1 - Math.pow(1 - p, 3);
            if (gnum) gnum.textContent = String(Math.round(e * TARGET));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }, 450);
      }
    }

    // ── Reveal on scroll ──────────────────────────────────────────────────
    if (reduced) {
      document.querySelectorAll<HTMLElement>(`.${styles.reveal}:not(.${styles.revealIn})`).forEach((el) => {
        el.classList.add(styles.revealIn);
        el.querySelectorAll<HTMLElement>(`.${styles.blkFill}`).forEach((f) => {
          const w = f.dataset.w ?? '0';
          f.style.width = Math.min(parseInt(w), 100) + '%';
        });
      });
      return;
    }

    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add(styles.revealIn);
          (en.target as HTMLElement).querySelectorAll<HTMLElement>(`.${styles.blkFill}`).forEach((f) => {
            const w = f.dataset.w ?? '0';
            f.style.width = Math.min(parseInt(w), 100) + '%';
          });
          revealIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.16 });

    document.querySelectorAll(`.${styles.reveal}:not(.${styles.revealIn})`).forEach((el) => {
      revealIO.observe(el);
    });

    // ── Lineage pulse ─────────────────────────────────────────────────────
    const track = document.getElementById('lin-track');
    if (track) {
      const linIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const steps = Array.from(track.querySelectorAll<HTMLElement>('.lin-step-js'));
            const run = () => steps.forEach((s, i) => {
              setTimeout(() => {
                s.classList.add(styles.linStepLit);
                s.querySelectorAll<HTMLElement>('.lin-num-js').forEach((n) => n.classList.add(styles.linNumLit));
                setTimeout(() => {
                  s.classList.remove(styles.linStepLit);
                  s.querySelectorAll<HTMLElement>('.lin-num-js').forEach((n) => n.classList.remove(styles.linNumLit));
                }, 900);
              }, 420 * i);
            });
            run();
            setInterval(run, 420 * steps.length + 1800);
            linIO.unobserve(track);
          }
        });
      }, { threshold: 0.4 });
      linIO.observe(track);
    }

    return () => {
      revealIO.disconnect();
    };
  }, []);

  return null; // pure side-effect component
}
