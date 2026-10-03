// lib/living-koral-mark/canonical-morphology.ts
// KORA-WP-145 — Living KORAL Canonical Morphology Engine v2: the pure fold.
//
//   common seed + canonical ordered event history + engine version
//     -> CanonicalMorphologyState
//
// This is the ONE production boundary. The database service
// (canonical-morphology-service.ts) only fetches and orders events, then
// calls foldCanonicalMorphology(); tests and scenario simulations call the
// same function with fixture events. There is no second engine.
//
// Authority: Registry 219 KORA-WP-145 + spec §0.6 (final Founder record).
// Rules that matter most, enforced here:
//   - R2-alpha: an area is present while >= 1 present lineage exists in it.
//     One initiative and ten give the same state. No count tiers.
//   - One primary growth per present area. A branch arises ONLY from a
//     recognized Reorientation into an already-present area; at most one
//     per area. Cross-area Consolidation fuses, never branches. Mass changes
//     only through recognized Consolidation.
//   - v2 cavities are fusion-enclosed only (C-cav). No size (C1).
//   - Memory only from recognized structural transformation. An area
//     withdrawal leaves ONE scar; the seed element it releases adds none.
//   - Pure and deterministic: no clock, no randomness, no I/O.

import { createHash } from 'node:crypto';
import { getCanonicalMorphologyConfig } from '@/lib/living-koral-morphology-config/v1';
import type { MassClass, MorphologyAreaCode, TerminalPhase } from '@/lib/living-koral-morphology-config/types';
import type {
  CanonicalArea, CanonicalCavity, CanonicalElement, CanonicalFusionJoint, CanonicalHeading, CanonicalLedgerEvent,
  CanonicalMorphologyState, ElementAssignment, ElementKind, ElementOrigin, MemoryTraceKind, MorphologyMemoryTrace,
} from './canonical-morphology-types';

const CFG = getCanonicalMorphologyConfig();
const CORE = 'core';
const MASS_ORDER: readonly MassClass[] = ['slender', 'regular', 'dense'];

interface Lineage {
  area: MorphologyAreaCode | null;
  present: boolean;
  directionOrdinal: number;
  extentStep: number;
  settled: boolean;
  /** Branch element id this lineage was redirected into, if any. */
  branchId: string | null;
}

interface ElementState {
  id: string;
  kind: ElementKind;
  origin: ElementOrigin;
  parentId: string;
  depth: 1 | 2;
  angularSlot: number;
  extentRank: number | null;
  areaId: MorphologyAreaCode | null;
  assignment: ElementAssignment;
  fusedInto: string | null;
  massClass: MassClass;
  createdAtRevision: number;
  hostsFusion: boolean;
  /** Branch only: set once a later recognized change involves the branch (T1 bud -> emergent). */
  confirmed: boolean;
}

interface AreaState {
  areaId: MorphologyAreaCode;
  rank: number;
  present: boolean;
  primaryId: string;
  branchId: string | null;
}

interface TraceDraft {
  kind: MemoryTraceKind;
  subject: { type: 'element' | 'area' | 'fusion' | 'cavity'; id: string };
  host: { elementId: string; position: 'attachment' | 'along' | 'terminal' };
  recordedAtRevision: number;
  mergedCount: number;
}

class Fold {
  readonly lineages = new Map<string, Lineage>();
  readonly elements = new Map<string, ElementState>();
  readonly elementOrder: string[] = [];
  readonly areas = new Map<MorphologyAreaCode, AreaState>();
  readonly fusions: CanonicalFusionJoint[] = [];
  readonly cavities: CanonicalCavity[] = [];
  readonly traces: TraceDraft[] = [];
  private nextRank = 0;
  boundaryRevision = 0;

  constructor() {
    for (const seed of CFG.seed.elements) {
      this.addElement({
        id: seed.id, kind: seed.kind, origin: 'seed', parentId: CORE, depth: 1, angularSlot: seed.angularSlot,
        extentRank: seed.extentRank, areaId: null, assignment: 'unassigned', fusedInto: null, massClass: seed.massClass,
        createdAtRevision: 0, hostsFusion: false, confirmed: false,
      });
    }
  }

  private addElement(e: ElementState): void {
    this.elements.set(e.id, e);
    this.elementOrder.push(e.id);
  }

  private el(id: string): ElementState {
    const e = this.elements.get(id);
    if (!e) throw new Error(`[KORA] canonical-morphology invariant: unknown element ${id}`);
    return e;
  }

  private trace(kind: MemoryTraceKind, subject: TraceDraft['subject'], hostId: string, position: TraceDraft['host']['position'], rev: number): void {
    this.traces.push({ kind, subject, host: { elementId: hostId, position }, recordedAtRevision: rev, mergedCount: 1 });
  }

  // ── structural queries ────────────────────────────────────────────────
  private presentLineagesIn(area: MorphologyAreaCode): number {
    let n = 0;
    for (const l of this.lineages.values()) if (l.present && l.area === area) n++;
    return n;
  }

  private presentRedirectedIn(branchId: string): number {
    let n = 0;
    for (const l of this.lineages.values()) if (l.present && l.branchId === branchId) n++;
    return n;
  }

  private isActive(e: ElementState): boolean {
    if (e.assignment === 'fused' || e.assignment === 'retired') return false;
    if (e.kind === 'bud' && e.assignment === 'unassigned') return false; // an unadopted bud is not a growth member
    return true;
  }

  private activeMemberCount(): number {
    let n = 0;
    for (const e of this.elements.values()) if (this.isActive(e)) n++;
    return n;
  }

  private activeJointCount(): number {
    return this.fusions.filter((f) => f.active).length;
  }

  private openCavityCount(): number {
    return this.cavities.filter((c) => c.open).length;
  }

  // ── area presence (R2-alpha) ──────────────────────────────────────────
  /** Makes an absent area present: adopts its seed element by rank, or grows a primary from the core. One `growth` trace. At the member cap: present without geometry, memory only. */
  private emergeArea(area: MorphologyAreaCode, rev: number): AreaState {
    let state = this.areas.get(area);
    if (!state) {
      const rank = this.nextRank++;
      state = { areaId: area, rank, present: false, primaryId: '', branchId: null };
      this.areas.set(area, state);
    }
    if (state.present) return state;

    const seedDef = CFG.seed.elements[state.rank];
    const seedEl = seedDef ? this.elements.get(seedDef.id) : undefined;
    const adoptsSeed = Boolean(seedEl && seedEl.assignment === 'unassigned');
    const addsMember = !adoptsSeed || seedEl?.kind === 'bud'; // seed:0/seed:1 are already active members
    if (addsMember && this.activeMemberCount() + 1 > CFG.bounds.maxActiveMembers) {
      // Member cap reached (Founder, final): the area is canonically present,
      // but no geometry is created and nothing established is evicted —
      // the arrival is memory only.
      state.present = true;
      state.primaryId = '';
      state.branchId = null;
      this.trace('growth', { type: 'area', id: `rank:${state.rank}` }, CORE, 'attachment', rev);
      return state;
    }
    let primary: ElementState;
    if (seedEl && seedEl.assignment === 'unassigned') {
      primary = seedEl;
      primary.assignment = 'adopted';
      primary.areaId = area;
    } else {
      const id = `grown:${state.rank}`;
      const existing = this.elements.get(id);
      if (existing) {
        primary = existing;
        primary.assignment = 'adopted';
        primary.areaId = area;
        primary.fusedInto = null;
      } else {
        primary = {
          id, kind: 'member', origin: 'core', parentId: CORE, depth: 1,
          angularSlot: CFG.grownPrimarySlotByRank[state.rank] ?? state.rank, extentRank: null, areaId: area,
          assignment: 'adopted', fusedInto: null, massClass: 'regular', createdAtRevision: rev, hostsFusion: false, confirmed: false,
        };
        this.addElement(primary);
      }
    }
    state.present = true;
    state.primaryId = primary.id;
    state.branchId = null;
    this.trace('growth', { type: 'element', id: primary.id }, primary.id, 'attachment', rev);
    return state;
  }

  private retireBranch(area: AreaState, rev: number, scar: boolean): void {
    if (!area.branchId) return;
    const branch = this.el(area.branchId);
    branch.assignment = 'retired';
    for (const l of this.lineages.values()) if (l.branchId === branch.id) l.branchId = null;
    this.migrateTraces(branch.id, area.primaryId);
    area.branchId = null;
    if (scar) this.trace('scar', { type: 'element', id: branch.id }, area.primaryId, 'attachment', rev);
  }

  /** Withdraws a present area. The structural loss is ONE scar; releasing its seed element adds no further trace. */
  private withdrawArea(area: AreaState, rev: number, viaFusionInto: string | null): void {
    if (!area.primaryId) {
      area.present = false;
      this.trace('scar', { type: 'area', id: `rank:${area.rank}` }, CORE, 'attachment', rev);
      return;
    }
    if (area.branchId) this.retireBranch(area, rev, false);
    const primary = this.el(area.primaryId);
    this.closeCavitiesBoundedBy(primary.id, rev);
    for (const j of this.fusions) {
      if (j.active && j.resultMemberId === primary.id) this.dissolveJoint(j, rev);
    }
    if (viaFusionInto) {
      primary.assignment = 'fused';
      primary.fusedInto = viaFusionInto;
    } else if (primary.origin === 'seed') {
      primary.assignment = 'unassigned';
      primary.fusedInto = null;
    } else {
      primary.assignment = 'retired';
      this.migrateTraces(primary.id, CORE);
    }
    primary.areaId = null;
    primary.hostsFusion = false;
    area.present = false;
    if (!viaFusionInto) this.trace('scar', { type: 'area', id: `rank:${area.rank}` }, CORE, 'attachment', rev);
  }

  private dissolveJoint(j: CanonicalFusionJoint, rev: number): void {
    const idx = this.fusions.indexOf(j);
    this.fusions[idx] = { ...j, active: false };
    for (const id of j.memberIds) {
      if (id === j.resultMemberId) continue;
      const absorbed = this.el(id);
      if (absorbed.assignment === 'fused' && absorbed.fusedInto === j.resultMemberId) {
        absorbed.fusedInto = null;
        absorbed.assignment = absorbed.origin === 'seed' ? 'unassigned' : 'retired';
      }
    }
    for (const c of this.cavities) {
      if (c.open && c.fusionId === j.fusionId) this.closeCavity(c, rev);
    }
  }

  private closeCavitiesBoundedBy(elementId: string, rev: number): void {
    for (const c of [...this.cavities]) {
      if (c.open && c.boundingMemberIds.includes(elementId)) this.closeCavity(c, rev);
    }
  }

  private closeCavity(c: CanonicalCavity, rev: number): void {
    const idx = this.cavities.indexOf(c);
    this.cavities[idx] = { ...c, open: false, closedAtRevision: rev };
    const survivor = c.boundingMemberIds.find((id) => this.isActive(this.el(id))) ?? CORE;
    this.trace('closure', { type: 'cavity', id: c.cavityId }, survivor, 'along', rev);
  }

  private migrateTraces(fromId: string, toId: string): void {
    for (const t of this.traces) if (t.host.elementId === fromId) t.host = { elementId: toId, position: t.host.position };
  }

  private elementHostingLineage(l: Lineage): string | null {
    if (l.branchId) return l.branchId;
    if (!l.area) return null;
    const a = this.areas.get(l.area);
    return a && a.present && a.primaryId ? a.primaryId : null;
  }

  // ── event handlers ────────────────────────────────────────────────────
  apply(ev: CanonicalLedgerEvent): void {
    this.boundaryRevision = Math.max(this.boundaryRevision, ev.resultingStateRevision);
    const rev = ev.resultingStateRevision;
    switch (ev.operation) {
      case 'add_element': return this.onAdd(ev.sourceKey, ev.area, rev);
      case 'remove_element': return this.onRemove(ev.sourceKey, rev);
      case 'reorient': return this.onReorient(ev.sourceKey, ev.area, rev);
      case 'fuse': return this.onFuse(ev.sourceKey, ev.area, ev.consolidationSources ?? [], rev);
      case 'increase_extent': return this.onExtent(ev.sourceKey, +1);
      case 'decrease_extent': return this.onExtent(ev.sourceKey, -1);
      case 'stabilize': return this.onStabilize(ev.sourceKey);
    }
  }

  private lineage(key: string): Lineage {
    let l = this.lineages.get(key);
    if (!l) {
      l = { area: null, present: false, directionOrdinal: 0, extentStep: 0, settled: false, branchId: null };
      this.lineages.set(key, l);
    }
    return l;
  }

  private onAdd(key: string, area: MorphologyAreaCode | null, rev: number): void {
    const l = this.lineage(key);
    if (l.present) return; // 1 vs 10, retries, and post-fuse re-observation: no structural change
    l.present = true;
    if (area) l.area = area;
    if (!l.area) return; // legacy lineage with no area: tracked, never structural
    const a = this.areas.get(l.area);
    if (!a || !a.present) this.emergeArea(l.area, rev);
  }

  /** Removes a lineage from its redirected branch; returns true when the branch is left without present lineages. */
  private detachFromBranch(l: Lineage): AreaState | null {
    if (!l.branchId) return null;
    const branchId = l.branchId;
    l.branchId = null;
    if (this.presentRedirectedIn(branchId) > 0) return null;
    return [...this.areas.values()].find((a) => a.branchId === branchId) ?? null;
  }

  private onRemove(key: string, rev: number): void {
    const l = this.lineages.get(key);
    if (!l || !l.present) return;
    l.present = false;
    const emptiedBranchArea = this.detachFromBranch(l);
    if (!l.area) return;
    const a = this.areas.get(l.area);
    if (!a || !a.present) return;
    if (this.presentLineagesIn(l.area) === 0) {
      this.withdrawArea(a, rev, null); // one scar; branch loss is part of the same transformation
    } else if (emptiedBranchArea) {
      this.retireBranch(emptiedBranchArea, rev, true);
    }
  }

  private onReorient(key: string, destination: MorphologyAreaCode | null, rev: number): void {
    const l = this.lineage(key);
    l.directionOrdinal += 1;
    if (!l.present) return; // a closed lineage changes no present structure
    const from = l.area;
    const to = destination ?? from;

    if (!to || to === from) {
      const host = this.elementHostingLineage(l);
      if (host) this.trace('reorientation', { type: 'element', id: host }, host, 'terminal', rev);
      return;
    }

    // presence effects first (tie-break order: presence -> reorientation -> consolidation -> cavities -> traces)
    const destinationArea = this.areas.get(to);
    const destinationWasPresent = Boolean(destinationArea && destinationArea.present);
    const emptiedBranchArea = this.detachFromBranch(l);
    l.area = to;
    const target = destinationWasPresent ? (destinationArea as AreaState) : this.emergeArea(to, rev);

    if (from) {
      const source = this.areas.get(from);
      if (source && source.present && this.presentLineagesIn(from) === 0) {
        this.withdrawArea(source, rev, null);
      } else if (emptiedBranchArea && emptiedBranchArea.present) {
        this.retireBranch(emptiedBranchArea, rev, true);
      }
    }

    // reorientation effects
    if (!destinationWasPresent || !target.primaryId) {
      // a newly present area, or one present without geometry (member cap): memory only, no branch
      const hostId = target.primaryId || CORE;
      this.trace('reorientation', { type: target.primaryId ? 'element' : 'area', id: target.primaryId || `rank:${target.rank}` }, hostId, 'terminal', rev);
      return;
    }
    if (target.branchId) {
      l.branchId = target.branchId;
      this.el(target.branchId).confirmed = true;
      this.trace('reorientation', { type: 'element', id: target.branchId }, target.branchId, 'terminal', rev);
      return;
    }
    if (this.activeMemberCount() + 1 <= CFG.bounds.maxActiveMembers) {
      const host = this.el(target.primaryId);
      const branch: ElementState = {
        id: `branch:${host.id}`, kind: 'branch', origin: 'branch', parentId: host.id, depth: 2, angularSlot: host.angularSlot,
        extentRank: null, areaId: target.areaId, assignment: 'adopted', fusedInto: null, massClass: 'slender', createdAtRevision: rev,
        hostsFusion: false, confirmed: false,
      };
      const existing = this.elements.get(branch.id);
      if (existing) {
        Object.assign(existing, { ...branch, createdAtRevision: rev });
      } else {
        this.addElement(branch);
      }
      target.branchId = branch.id;
      l.branchId = branch.id;
      this.trace('growth', { type: 'element', id: branch.id }, branch.id, 'attachment', rev);
      this.trace('reorientation', { type: 'element', id: branch.id }, branch.id, 'terminal', rev);
      return;
    }
    // member cap reached: heading + memory only, no geometry
    this.trace('reorientation', { type: 'element', id: target.primaryId }, target.primaryId, 'terminal', rev);
  }

  private onFuse(resultKey: string, area: MorphologyAreaCode | null, sources: readonly string[], rev: number): void {
    // presence: the result lineage exists in its area; the sources end.
    const result = this.lineage(resultKey);
    result.present = true;
    if (area) result.area = area;
    const t = result.area;
    if (!t) return;
    const sourceAreas: MorphologyAreaCode[] = [];
    const emptiedBranches: AreaState[] = [];
    for (const key of sources) {
      const s = this.lineages.get(key);
      if (!s || !s.present || key === resultKey) continue;
      s.present = false;
      const emptied = this.detachFromBranch(s);
      if (emptied) emptiedBranches.push(emptied);
      if (s.area && !sourceAreas.includes(s.area)) sourceAreas.push(s.area);
    }
    const target = (this.areas.get(t)?.present ? this.areas.get(t) : this.emergeArea(t, rev)) as AreaState;
    if (!target.primaryId) {
      // result area present without geometry (member cap): no joint, no cavity, no mass step.
      // Sources still end: an area left with no present lineage withdraws through its normal rule.
      for (const code of sourceAreas) {
        const s = this.areas.get(code);
        if (s && s.present && code !== t && this.presentLineagesIn(code) === 0) this.withdrawArea(s, rev, null);
      }
      for (const e of emptiedBranches) if (e.present && e.branchId) this.retireBranch(e, rev, true);
      this.trace('consolidation', { type: 'area', id: `rank:${target.rank}` }, CORE, 'along', rev);
      return;
    }
    const host = this.el(target.primaryId);

    // cross-area fusion, in area-rank order
    let crossAreaFusion = false;
    const ordered = sourceAreas
      .filter((code) => code !== t)
      .map((code) => this.areas.get(code) as AreaState)
      .filter((s) => s && s.present && this.presentLineagesIn(s.areaId) === 0)
      .sort((x, y) => x.rank - y.rank);
    for (const s of ordered) {
      if (!s.primaryId) {
        this.withdrawArea(s, rev, null); // a source area without geometry has nothing to fuse; it withdraws by its normal rule
        continue;
      }
      const absorbedId = s.primaryId;
      this.withdrawArea(s, rev, host.id);
      crossAreaFusion = true;
      host.hostsFusion = true;
      this.trace('fusion', { type: 'element', id: absorbedId }, host.id, 'along', rev);
      if (this.activeJointCount() < CFG.bounds.maxActiveFusionJoints) {
        const pair = [absorbedId, host.id].sort() as [string, string];
        const fusionId = `fusion:${rev}:${pair.join('+')}`;
        this.fusions.push({ fusionId, memberIds: pair, resultMemberId: host.id, kind: 'cross-area', sinceRevision: rev, active: true });
        if (this.openCavityCount() < CFG.bounds.maxOpenCavities) {
          const cavity: CanonicalCavity = {
            cavityId: `fusion-enclosed:${pair.join('+')}`, kind: 'fusion-enclosed', boundingMemberIds: pair, fusionId,
            open: true, sinceRevision: rev, closedAtRevision: null,
          };
          this.cavities.push(cavity);
          const lowerRank = [...this.areas.values()].filter((a) => pair.includes(a.primaryId)).sort((x, y) => x.rank - y.rank)[0];
          this.trace('opening', { type: 'cavity', id: cavity.cavityId }, lowerRank ? lowerRank.primaryId : host.id, 'along', rev);
        }
      }
    }

    // consolidation: mass changes only here — one step on the result member per event
    host.massClass = MASS_ORDER[Math.min(MASS_ORDER.indexOf(host.massClass) + 1, MASS_ORDER.length - 1)];
    for (const e of emptiedBranches) {
      if (e === target && target.branchId) {
        const branchId = target.branchId;
        this.retireBranch(target, rev, false);
        const branch = this.el(branchId);
        branch.assignment = 'fused';
        branch.fusedInto = host.id;
        host.hostsFusion = true;
        if (this.activeJointCount() < CFG.bounds.maxActiveFusionJoints) {
          const pair = [branchId, host.id].sort() as [string, string];
          this.fusions.push({ fusionId: `fusion:${rev}:${pair.join('+')}`, memberIds: pair, resultMemberId: host.id, kind: 'intra-area', sinceRevision: rev, active: true });
        }
      } else if (e !== target && e.present && e.branchId) {
        this.retireBranch(e, rev, true);
      }
    }
    if (!crossAreaFusion) this.trace('consolidation', { type: 'element', id: host.id }, host.id, 'along', rev);
  }

  private onExtent(key: string, delta: number): void {
    const l = this.lineages.get(key);
    if (l) l.extentStep += delta; // dormant in Product (N1); canonical capability only, no memory
  }

  private onStabilize(key: string): void {
    const l = this.lineages.get(key);
    if (l) l.settled = true; // dormant in Product (N1); one-way
  }

  // ── output ────────────────────────────────────────────────────────────
  private contributors(e: ElementState): Lineage[] {
    const out: Lineage[] = [];
    for (const l of this.lineages.values()) {
      if (!l.present) continue;
      if (e.kind === 'branch' ? l.branchId === e.id : (l.branchId === null && l.area !== null && e.areaId === l.area && e.assignment === 'adopted')) out.push(l);
    }
    return out;
  }

  private terminalPhase(e: ElementState, settledShare: number): TerminalPhase {
    if (e.kind === 'bud' && e.assignment === 'unassigned') return 'bud';
    if (settledShare >= CFG.settledPhaseThreshold) return 'settled';
    if (e.kind === 'branch') return e.confirmed ? 'emergent' : 'bud';
    if (e.assignment === 'fused' || e.hostsFusion) return 'formed';
    const area = e.areaId ? this.areas.get(e.areaId) : undefined;
    if (area && area.present && area.primaryId === e.id && area.branchId) return 'formed';
    return 'emergent';
  }

  private heading(e: ElementState, ls: readonly Lineage[]): CanonicalHeading {
    const step = 360 / CFG.directionCycleSteps;
    const angleOf = (ordinal: number) => (((ordinal % CFG.directionCycleSteps) + CFG.directionCycleSteps) % CFG.directionCycleSteps) * step;
    if (ls.length === 0) return { slot: e.angularSlot, angle: 0, coherence: 0, isFallback: true };
    let vx = 0;
    let vy = 0;
    for (const l of ls) {
      const r = (angleOf(l.directionOrdinal) * Math.PI) / 180;
      vx += Math.cos(r);
      vy += Math.sin(r);
    }
    const coherence = Math.hypot(vx, vy) / ls.length;
    if (coherence < CFG.directionFallbackEpsilon) return { slot: e.angularSlot, angle: angleOf(ls[0].directionOrdinal), coherence, isFallback: true };
    const angle = ((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360;
    return { slot: e.angularSlot, angle, coherence, isFallback: false };
  }

  toState(): CanonicalMorphologyState {
    const elements: CanonicalElement[] = this.elementOrder.map((id) => {
      const e = this.el(id);
      const ls = this.contributors(e);
      const raw = ls.length ? ls.reduce((s, l) => s + l.extentStep, 0) / ls.length : 0;
      const settledShare = ls.length ? ls.filter((l) => l.settled).length / ls.length : 0;
      const area = e.areaId ? this.areas.get(e.areaId) : undefined;
      return {
        id: e.id, kind: e.kind, origin: e.origin, parentId: e.parentId, depth: e.depth, areaId: e.areaId,
        areaRank: area ? area.rank : null, assignment: e.assignment, active: this.isActive(e), fusedInto: e.fusedInto,
        terminalPhase: this.terminalPhase(e, settledShare), massClass: e.massClass,
        extent: { raw: round(raw), normalized: round(Math.tanh(raw / CFG.extentTanhScale)) },
        heading: roundHeading(this.heading(e, ls)), settledShare: round(settledShare), extentRank: e.extentRank,
        createdAtRevision: e.createdAtRevision,
      };
    });
    const areas: CanonicalArea[] = [...this.areas.values()]
      .sort((a, b) => a.rank - b.rank)
      .map((a) => ({ areaId: a.areaId, rank: a.rank, present: a.present, primaryId: a.primaryId || null, branchId: a.branchId }));
    const withdrawn = [...this.areas.values()].filter((a) => !a.present).length;
    const b = CFG.bounds;
    const massShare = Math.max(b.coreMassShareMin, Math.min(b.coreMassShareMax, CFG.seed.coreMassShare + withdrawn * b.coreMassShareStepPerWithdrawnArea));
    const total = this.traces.reduce((s, t) => s + t.mergedCount, 0);
    return {
      seedVersion: CFG.seed.seedVersion,
      morphologyEngineVersion: CFG.morphologyEngineVersion,
      boundaryRevision: this.boundaryRevision,
      core: { massShare: round(massShare) },
      areas,
      elements,
      fusions: [...this.fusions],
      cavities: [...this.cavities],
      memoryTraces: finalizeTraces(this.traces),
      memoryTraceTotal: total,
    };
  }
}

function round(n: number): number {
  const r = Math.round(n * 1e6) / 1e6;
  return Object.is(r, -0) ? 0 : r;
}

function roundHeading(h: CanonicalHeading): CanonicalHeading {
  return { slot: h.slot, angle: round(h.angle), coherence: round(h.coherence), isFallback: h.isFallback };
}

/** Deterministic visible-memory bound: merge the oldest pair on the same host until <= the cap. Never prunes. */
function finalizeTraces(drafts: readonly TraceDraft[]): MorphologyMemoryTrace[] {
  const list = drafts.map((t, i) => ({ ...t, order: i }));
  while (list.length > CFG.bounds.maxVisibleMemoryTraces) {
    const byHost = new Map<string, typeof list>();
    for (const t of list) {
      const arr = byHost.get(t.host.elementId) ?? [];
      arr.push(t);
      byHost.set(t.host.elementId, arr);
    }
    let pair: [typeof list[number], typeof list[number]] | null = null;
    for (const arr of byHost.values()) {
      if (arr.length < 2) continue;
      const candidate: [typeof list[number], typeof list[number]] = [arr[0], arr[1]];
      if (!pair || candidate[1].order < pair[1].order) pair = candidate;
    }
    if (!pair) pair = [list[0], list[1]];
    const [older, newer] = pair;
    older.mergedCount += newer.mergedCount;
    list.splice(list.indexOf(newer), 1);
  }
  const seen = new Map<string, number>();
  return list.map((t) => {
    const base = `${t.kind}:${t.subject.id}:${t.recordedAtRevision}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return {
      traceId: n === 0 ? base : `${base}#${n}`,
      kind: t.kind, subject: t.subject, host: t.host, recordedAtRevision: t.recordedAtRevision, mergedCount: t.mergedCount,
    };
  });
}

/** The common seed as a canonical state (no history). */
export function canonicalSeedState(): CanonicalMorphologyState {
  return new Fold().toState();
}

/**
 * The single morphology boundary: same seed + same ordered history + same
 * engine version -> the same state. `events` must already be in canonical
 * replay order; out-of-order `seq` is rejected rather than silently sorted.
 */
export function foldCanonicalMorphology(events: readonly CanonicalLedgerEvent[]): CanonicalMorphologyState {
  const fold = new Fold();
  let lastSeq = -Infinity;
  for (const ev of events) {
    if (ev.seq <= lastSeq) throw new Error(`[KORA] foldCanonicalMorphology rejected: events must be in strictly ascending seq order (got ${ev.seq} after ${lastSeq}).`);
    lastSeq = ev.seq;
    fold.apply(ev);
  }
  return fold.toState();
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** SHA-256 of the canonical (sorted-key) JSON of the state — the Edition's rebuilt-state hash. */
export function hashCanonicalMorphologyState(state: CanonicalMorphologyState): string {
  return createHash('sha256').update(canonicalJson(state)).digest('hex');
}

function omitAreaId<T extends { readonly areaId: unknown }>(value: T): Omit<T, 'areaId'> {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'areaId')) as Omit<T, 'areaId'>;
}

/**
 * Expression-safe projection: removes the company-private pillar code from
 * every area/element, keeping only the neutral appearance rank (P1). The
 * canonical state itself never contains source or Material Change ids.
 */
export function projectCanonicalMorphologyForExpression(state: CanonicalMorphologyState): Omit<CanonicalMorphologyState, 'areas' | 'elements'> & {
  readonly areas: readonly (Omit<CanonicalArea, 'areaId'>)[];
  readonly elements: readonly (Omit<CanonicalElement, 'areaId'>)[];
} {
  return {
    ...state,
    areas: state.areas.map((a) => omitAreaId(a)),
    elements: state.elements.map((e) => omitAreaId(e)),
  };
}
