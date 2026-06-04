/** Runtime quality tiers, effect caps, FPS tracking, and soft throttles. */

export type QualityTier = 'high' | 'normal' | 'mobile'
export type QualityMode = QualityTier | 'auto'

export interface PerfCaps {
  maxBombs: number
  maxExplosions: number
  maxSmoke: number
  maxMissileTrails: number
  maxSupplies: number
  maxHazards: number
  maxParticles: number
  maxSkyMissiles: number
  maxJets: number
  maxSearchlights: number
  maxDistantSmoke: number
  pickupLights: boolean
  hazardLights: boolean
  shadows: boolean
  shadowMapSize: number
  bloom: boolean
  bloomMultisampling: number
  postfx: boolean
  dpr: [number, number]
  oceanSegments: [number, number]
  particleEmitScale: number
}

const CAPS: Record<QualityTier, PerfCaps> = {
  high: {
    maxBombs: 8,
    maxExplosions: 6,
    maxSmoke: 80,
    maxMissileTrails: 40,
    maxSupplies: 48,
    maxHazards: 45,
    maxParticles: 160,
    maxSkyMissiles: 12,
    maxJets: 4,
    maxSearchlights: 5,
    maxDistantSmoke: 8,
    pickupLights: true,
    hazardLights: true,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    postfx: true,
    dpr: [1, 1.35],
    oceanSegments: [96, 140],
    particleEmitScale: 0.9,
    bloomMultisampling: 0,
  },
  normal: {
    maxBombs: 8,
    maxExplosions: 6,
    maxSmoke: 60,
    maxMissileTrails: 30,
    maxSupplies: 44,
    maxHazards: 40,
    maxParticles: 100,
    maxSkyMissiles: 6,
    maxJets: 2,
    maxSearchlights: 3,
    maxDistantSmoke: 5,
    pickupLights: true,
    hazardLights: false,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    bloomMultisampling: 0,
    postfx: false,
    dpr: [1, 1.15],
    oceanSegments: [48, 72],
    particleEmitScale: 0.8,
  },
  mobile: {
    maxBombs: 5,
    maxExplosions: 3,
    maxSmoke: 35,
    maxMissileTrails: 20,
    maxSupplies: 32,
    maxHazards: 30,
    maxParticles: 80,
    maxSkyMissiles: 5,
    maxJets: 2,
    maxSearchlights: 2,
    maxDistantSmoke: 4,
    pickupLights: true,
    hazardLights: false,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    bloomMultisampling: 0,
    postfx: false,
    dpr: [0.75, 1],
    oceanSegments: [32, 48],
    particleEmitScale: 0.55,
  },
}

export const perfState = {
  tier: 'normal' as QualityTier,
  mode: 'auto' as QualityMode,
  fps: 60,
  frameMs: 16.67,
  highRefreshReady: false,
  performanceReduced: false,
  /** Soft particle throttle 0.35–1 without scene remount */
  emitScale: 1,
  /** Post-FX + bloom strength 0–1 (can disable bloom without remount) */
  fxMul: 1,
  /** DPR multiplier 0.75–1 */
  dprScale: 1,
  overlayVisible: false,
  hudFlushMs: 80,
  counts: {
    bombs: 0,
    explosions: 0,
    smoke: 0,
    supplies: 0,
    hazards: 0,
    particles: 0,
    labels: 0,
  },
}

const listeners = new Set<() => void>()

export function subscribePerf(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function notifyPerf() {
  listeners.forEach((cb) => cb())
}

export function getCaps(): PerfCaps {
  return CAPS[perfState.tier]
}

/** 0 = full waves, 1 = cheap ocean shader path */
export function oceanQuality(): number {
  if (perfState.tier === 'mobile') return 1
  if (perfState.tier === 'normal') return 0.65
  return 0.2
}

/** Effective particle scale = tier base × soft throttle */
export function particleEmitScale(): number {
  return getCaps().particleEmitScale * perfState.emitScale
}

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'normal'
  const ua = navigator.userAgent
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    window.innerWidth < 900 ||
    window.matchMedia('(pointer: coarse)').matches
  if (mobile) return 'mobile'
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (mem !== undefined && mem <= 4) return 'normal'
  // Desktop defaults to normal — logs showed ~10 FPS on "high" tier
  return 'normal'
}

const FPS_SAMPLES = 90
const fpsBuf: number[] = []
let peakFps = 60
let softLowMs = 0

export function initPerformance() {
  resetPerfSession()
  perfState.mode = 'auto'

  if (typeof window === 'undefined') return

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault()
      perfState.overlayVisible = !perfState.overlayVisible
      notifyPerf()
    }
  })
}

export function setQualityMode(mode: QualityMode) {
  perfState.mode = mode
  if (mode === 'auto') resetPerfSession()
  else {
    perfState.tier = mode
    perfState.performanceReduced = false
    perfState.emitScale = 1
    notifyPerf()
  }
}

/** Lock tier for a mission — avoids remount hitches from mid-run downgrades */
export function resetPerfSession() {
  peakFps = 60
  fpsBuf.length = 0
  softLowMs = 0
  perfState.tier = detectTier()
  perfState.performanceReduced = false
  perfState.emitScale = 1
  perfState.fxMul = 1
  perfState.dprScale = 1
  notifyPerf()
}

export function tickPerformance(dt: number, simActive = true) {
  if (typeof document !== 'undefined' && document.hidden) return
  if (!simActive) return
  const ms = Math.min(Math.max(dt * 1000, 5), 200)
  fpsBuf.push(ms)
  if (fpsBuf.length > FPS_SAMPLES) fpsBuf.shift()

  const avgMs = fpsBuf.reduce((a, b) => a + b, 0) / fpsBuf.length
  perfState.frameMs = avgMs
  perfState.fps = avgMs > 0 ? 1000 / avgMs : 60
  // Track sustained FPS only — ignore single-frame dt spikes (was reporting peak 451)
  peakFps = Math.max(30, Math.min(120, peakFps * 0.99 + perfState.fps * 0.01))
  perfState.highRefreshReady = perfState.fps >= 85 && perfState.tier === 'high'

  const fps = perfState.fps
  const prevEmit = perfState.emitScale
  const prevFx = perfState.fxMul

  if (fps < 50) {
    softLowMs += dt * 1000
    if (fps < 28) {
      perfState.emitScale = Math.max(0.35, perfState.emitScale - dt * 0.25)
      perfState.fxMul = Math.max(0, perfState.fxMul - dt * 0.45)
      perfState.dprScale = Math.max(0.78, perfState.dprScale - dt * 0.12)
      perfState.performanceReduced = true
    } else if (fps < 40) {
      perfState.emitScale = Math.max(0.5, perfState.emitScale - dt * 0.12)
      perfState.fxMul = Math.max(0.35, perfState.fxMul - dt * 0.2)
      perfState.dprScale = Math.max(0.85, perfState.dprScale - dt * 0.05)
      perfState.performanceReduced = true
    }
  } else {
    softLowMs = Math.max(0, softLowMs - dt * 400)
    if (fps > 55) {
      perfState.emitScale = Math.min(1, perfState.emitScale + dt * 0.06)
      perfState.fxMul = Math.min(1, perfState.fxMul + dt * 0.15)
      perfState.dprScale = Math.min(1, perfState.dprScale + dt * 0.04)
      if (perfState.emitScale >= 0.95 && perfState.fxMul >= 0.95) {
        perfState.performanceReduced = false
      }
    }
  }

  if (
    Math.abs(prevEmit - perfState.emitScale) > 0.08 ||
    Math.abs(prevFx - perfState.fxMul) > 0.12
  ) {
    notifyPerf()
  }
}

export function countActive(
  items: { state: string }[],
  activeStates: string[],
): number {
  let n = 0
  for (const it of items) {
    if (activeStates.includes(it.state)) n++
  }
  return n
}
