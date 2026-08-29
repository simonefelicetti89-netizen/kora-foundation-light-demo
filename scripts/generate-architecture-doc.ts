// scripts/generate-architecture-doc.ts
// CC-003 / B-REG — generates docs/ARCHITECTURE_REGISTRY.md from
// lib/architecture/registry.ts. That Markdown file is DERIVED — never hand-edit it.
//
// Usage: npx tsx scripts/generate-architecture-doc.ts
//   (writes docs/ARCHITECTURE_REGISTRY.md)
//
// tests/unit/cc003-i10-registry-completeness.test.ts imports renderArchitectureDoc()
// directly to compare its in-memory output against the checked-in file — it never
// invokes this script or writes to disk itself.

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import {
  ARCHITECTURE_REGISTRY,
  TARGET_ONTOLOGY,
  type ArchitectureComponent,
  type ArchitectureStatus,
  type OntologyObject,
} from '../lib/architecture/registry';

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function statusCounts(components: ArchitectureComponent[]): Record<ArchitectureStatus, number> {
  const counts: Record<string, number> = {};
  for (const c of components) counts[c.status] = (counts[c.status] ?? 0) + 1;
  return counts as Record<ArchitectureStatus, number>;
}

function renderComponentsTable(components: ArchitectureComponent[]): string {
  const header = '| ID | Domain | Path | Status | Future Core | Decision Ref | Notes |\n|---|---|---|---|---|---|---|';
  const rows = components
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(
      (c) =>
        `| \`${c.id}\` | ${mdEscape(c.domain)} | \`${c.primaryPath}\` | ${c.status} | ${c.futureCore ? 'Y' : '—'} | ${c.decisionRef ? mdEscape(c.decisionRef) : '—'} | ${mdEscape(c.notes)} |`,
    );
  return [header, ...rows].join('\n');
}

function renderDeadTable(components: ArchitectureComponent[]): string {
  const dead = components.filter((c) => c.status === 'DEAD');
  if (dead.length === 0) return '_No DEAD components currently registered._';
  const header = '| ID | Path | Replacement | Deletable When | Decision Ref |\n|---|---|---|---|---|';
  const rows = dead.map((c) => {
    const replacement = c.competingWith.length > 0 ? c.competingWith.map((r) => `\`${r}\``).join(', ') : '—';
    return `| \`${c.id}\` | \`${c.primaryPath}\` | ${replacement} | ${mdEscape(c.deletableWhen ?? '')} | ${mdEscape(c.decisionRef ?? '')} |`;
  });
  return [header, ...rows].join('\n');
}

function renderFutureCoreList(components: ArchitectureComponent[]): string {
  const fc = components.filter((c) => c.futureCore);
  if (fc.length === 0) return '_None registered._';
  return fc
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => `- \`${c.id}\` (${c.status}) — \`${c.primaryPath}\` — ${mdEscape(c.purpose)}`)
    .join('\n');
}

function renderInvestigateList(components: ArchitectureComponent[]): string {
  const inv = components.filter((c) => c.status === 'INVESTIGATE');
  if (inv.length === 0) return '_None registered._';
  return inv
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => `- \`${c.id}\` — \`${c.primaryPath}\` — ${mdEscape(c.notes)}`)
    .join('\n');
}

function renderOntologyTable(objects: OntologyObject[]): string {
  const header =
    '| Object | Status | Current Representation | Paths | Implementation Block | Notes |\n|---|---|---|---|---|---|';
  const rows = objects.map((o) => {
    const paths = o.primaryPaths.length > 0 ? o.primaryPaths.map((p) => `\`${p}\``).join(', ') : '—';
    return `| ${mdEscape(o.id)} | ${o.status} | ${mdEscape(o.currentRepresentation)} | ${paths} | ${o.implementationBlock ? mdEscape(o.implementationBlock) : '—'} | ${mdEscape(o.notes)} |`;
  });
  return [header, ...rows].join('\n');
}

export function renderArchitectureDoc(
  components: ArchitectureComponent[] = ARCHITECTURE_REGISTRY,
  ontology: OntologyObject[] = TARGET_ONTOLOGY,
): string {
  const counts = statusCounts(components);
  const statusOrder: ArchitectureStatus[] = [
    'CANONICAL', 'CONSOLIDATE', 'COMPLETE', 'FROZEN', 'FUTURE_CORE', 'LEGACY', 'DEAD', 'INVESTIGATE',
  ];

  return `# KORA Architecture Registry

**Generated file — do not hand-edit.** Source: \`lib/architecture/registry.ts\`.
Regenerate with: \`npx tsx scripts/generate-architecture-doc.ts\`.

---

## Governance

- **This document (Architecture Registry)** describes the **CODE** — real components that exist in the repository today, classified by \`ArchitectureStatus\`.
- **The Target Ontology Implementation section below** describes the **target DOMAIN MODEL** the Master Plan defines — objects that may or may not have code behind them yet. These are two different axes and must never be conflated: a domain object can be \`TO_BUILD\` while unrelated code implementing a different capability is \`CANONICAL\`.
- **\`docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.0.md\` is the architectural truth.** This registry — like the rest of the repository — is the **operational truth**: what actually exists, not what should exist. Where they disagree, the Master Plan's own Read-Before-Write protocol governs (report \`STATE_MATCH = NO\`, do not silently reconcile).
- Classifications here do not anticipate any decision reserved for a future CC block or D-letter (D-A Confidence, D-B Decision Pack, D-C One Truth, D-D worker surfaces). Where two components compete, both carry the same \`decisionRef\` and neither is elevated.

---

## Architecture Components

${components.length} components across ${new Set(components.map((c) => c.domain)).size} domains.

${renderComponentsTable(components)}

---

## Status Distribution

| Status | Count |
|---|---|
${statusOrder.map((s) => `| ${s} | ${counts[s] ?? 0} |`).join('\n')}

---

## DEAD Components

${renderDeadTable(components)}

---

## FUTURE CORE

Capabilities explicitly preserved per Master Plan §33 (Do-Not-Delete / Future Core) — never reclassify these as DEAD or LEGACY for low current usage.

${renderFutureCoreList(components)}

---

## INVESTIGATE

Components where evidence is insufficient to assign a confident status. Per Master Plan discipline: \`INVESTIGATE\` is preferred over an aggressive classification when in doubt.

${renderInvestigateList(components)}

---

## Target Ontology Implementation

${TARGET_ONTOLOGY.length} target ontology objects (Master Plan §3). Status values: \`EXISTS\` / \`PARTIAL\` / \`TO_BUILD\` / \`UNCERTAIN\`.

${renderOntologyTable(ontology)}
`;
}

function main(): void {
  const doc = renderArchitectureDoc();
  const outPath = resolve(__dirname, '..', 'docs', 'ARCHITECTURE_REGISTRY.md');
  writeFileSync(outPath, doc, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath} (${ARCHITECTURE_REGISTRY.length} components, ${TARGET_ONTOLOGY.length} ontology objects).`);
}

// Only run when executed directly (`npx tsx scripts/generate-architecture-doc.ts`),
// never when imported by the test suite for renderArchitectureDoc().
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  main();
}
