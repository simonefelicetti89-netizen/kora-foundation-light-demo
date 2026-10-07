// lib/living-koral-render/index.ts
// KORA-WP-146 — Living KORAL Dual Renderer: public entry point.
//
//   CanonicalMorphologyState (KORA-WP-145, the only semantic input)
//     -> projectRenderScene()  (one shared projection)
//     -> renderSculpture()  -> GLB      (3D sculpture / Edition / targa)
//     -> renderMark()       -> SVG      (Living KORAL Mark)
//
// Output identity = canonical state hash + renderer version + parameters ->
// output hashes. Renderer metadata is presentation provenance only; it never
// writes or alters canonical/Edition state.

import { createHash } from 'node:crypto';
import type { CanonicalMorphologyState } from '@/lib/living-koral-mark/canonical-morphology-types';
import { getRendererConfig, RENDERER_VERSION } from './config-v2';
import { projectRenderScene, type RenderScene } from './projection';
import { DEFAULT_SCULPTURE_PARAMS, renderSceneHash, renderSculpture, type SculptureOutput, type SculptureParams } from './sculpture';
import { renderMark, type MarkOutput } from './mark';

export { RENDERER_VERSION } from './config-v2';
export { projectRenderScene } from './projection';
export type { RenderScene } from './projection';

export interface RenderInvariants {
  readonly renderedElementIds: readonly string[];
  readonly notRenderedElementIds: readonly string[];
  readonly branchIds: readonly string[];
  readonly fusedElementIds: readonly string[];
  readonly unassignedSeedIds: readonly string[];
  readonly activeFusionJoints: number;
  readonly openCavities: number;
  readonly visibleMemoryTraces: number;
}

export interface LivingKoralRenderOutput {
  readonly identity: {
    /** Internal provenance only (links to the Edition); never embedded in a public output. */
    readonly canonicalStateHash: string;
    /** Hash of the pillar-free render scene — the only state hash a public output carries. */
    readonly sceneHash: string;
    readonly rendererVersion: string;
    readonly params: SculptureParams;
    readonly sculptureSha256: string;
    readonly markSha256: string;
    readonly markSmallSha256: string;
    readonly outputId: string;
  };
  readonly scene: RenderScene;
  readonly sculpture: SculptureOutput;
  readonly mark: MarkOutput;
  readonly invariants: RenderInvariants;
}

/** What the shared scene says exists — the reference both outputs are checked against. */
export function sceneInvariants(scene: RenderScene): RenderInvariants {
  return {
    renderedElementIds: scene.elements.map((e) => e.id),
    notRenderedElementIds: scene.notRendered.map((e) => e.id),
    branchIds: scene.elements.filter((e) => e.role === 'branch').map((e) => e.id),
    fusedElementIds: scene.elements.filter((e) => e.assignment === 'fused').map((e) => e.id),
    unassignedSeedIds: scene.elements.filter((e) => e.assignment === 'unassigned').map((e) => e.id),
    activeFusionJoints: scene.fusions.length,
    openCavities: scene.openCavityIds.length,
    visibleMemoryTraces: scene.seams.length,
  };
}

/**
 * Renders both outputs and VERIFIES them before returning: 3D genus = Mark holes = open canonical
 * cavities, one body, one silhouette. If a projection would create renderer topology, the same state
 * is re-projected at the next (stricter) verification rung — deterministic: same state, same rung.
 * If no rung verifies, it fails closed: an accidental cavity never reaches an output.
 */
export function renderLivingKoral(state: CanonicalMorphologyState, params: SculptureParams = DEFAULT_SCULPTURE_PARAMS): LivingKoralRenderOutput {
  const want = state.cavities.filter((c) => c.open).length;
  // prefer the first rung that is both topologically exact AND fully clear; else the first that is
  // topologically exact; if none is, fail closed
  let exact: { scene: RenderScene; sculpture: SculptureOutput; mark: MarkOutput } | null = null;
  let last = { genus: -1, holes: -1 };
  for (let rung = 0; rung <= getRendererConfig().clearance.verificationRungs; rung++) {
    const sc = projectRenderScene(state, rung);
    const sx = renderSculpture(sc, params);
    const mk = renderMark(sc);
    last = { genus: sx.topology.bodyGenus, holes: mk.topology.holes };
    const topologyOk = sx.topology.bodyComponents === 1 && sx.topology.bodyGenus === want && mk.topology.holes === want && mk.topology.exteriorLoops === 1 && mk.small.topology.holes === want && mk.small.topology.exteriorLoops === 1;
    if (!topologyOk) continue;
    if (sc.unresolvedContacts.length === 0) { exact = { scene: sc, sculpture: sx, mark: mk }; break; }
    exact ??= { scene: sc, sculpture: sx, mark: mk };
  }
  if (!exact) throw new Error(`[KORA] renderLivingKoral failed closed: renderer topology could not be verified (genus ${last.genus}, holes ${last.holes}, cavities ${want}).`);
  const { scene, sculpture, mark } = exact;

  const outputId = createHash('sha256')
    .update(`${scene.canonicalStateHash}|${RENDERER_VERSION}|${params.voxel}|${sculpture.sha256}|${mark.sha256}|${mark.small.sha256}`)
    .digest('hex');
  return {
    identity: {
      canonicalStateHash: scene.canonicalStateHash,
      sceneHash: renderSceneHash(scene),
      rendererVersion: RENDERER_VERSION,
      params,
      sculptureSha256: sculpture.sha256,
      markSha256: mark.sha256,
      markSmallSha256: mark.small.sha256,
      outputId,
    },
    scene,
    sculpture,
    mark,
    invariants: sceneInvariants(scene),
  };
}
