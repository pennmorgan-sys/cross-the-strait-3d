// Shared wave field used by both the water shader (GLSL) and the
// gameplay/buoyancy math (JS). Keep these two definitions identical so the
// player and hazards float exactly on the rendered surface.

import { runtime } from './runtime'

export function waveHeight(x: number, z: number, t: number): number {
  return (
    Math.sin(x * 0.3 + t * 1.2) * 0.35 +
    Math.sin(z * 0.2 - t * 0.9) * 0.5 +
    Math.sin((x + z) * 0.18 + t * 1.6) * 0.25
  )
}

/** Fast bob from shared sea level — avoids 3× sin() per entity per frame */
export function quickWaveAt(x: number, z: number, t: number): number {
  return (
    runtime.seaLevel +
    Math.sin(x * 0.35 + t * 1.1) * 0.1 +
    Math.sin(z * 0.22 - t * 0.85) * 0.08
  )
}

// GLSL counterpart of waveHeight. `wx`/`wz` are world-space coordinates.
export const WAVE_GLSL = /* glsl */ `
float waveHeight(float wx, float wz, float t) {
  return sin(wx * 0.3 + t * 1.2) * 0.35
       + sin(wz * 0.2 - t * 0.9) * 0.5
       + sin((wx + wz) * 0.18 + t * 1.6) * 0.25;
}
`
