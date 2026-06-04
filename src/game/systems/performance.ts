/** Runtime quality tiers, effect caps, FPS tracking, and soft throttles. */

import { MAX_ACTIVE } from '../constants'

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
    maxBombs: MAX_ACTIVE.BOMBS,
    maxExplosions: MAX_ACTIVE.EXPLOSIONS,
    maxSmoke: 70,
    maxMissileTrails: MAX_ACTIVE.MISSILE_TRAILS,
    maxSupplies: MAX_ACTIVE.SUPPLIES,
    maxHazards: MAX_ACTIVE.HAZARDS,
    maxParticles: MAX_ACTIVE.PARTICLES,
    maxSkyMissiles: MAX_ACTIVE.SKY_MISSILES,
    maxJets: 4,
    maxSearchlights: 5,
    maxDistantSmoke: 6,
    pickupLights: false,
    hazardLights: false,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    postfx: true,
    dpr: [1, 1.5],
    oceanSegments: [96, 140],
    particleEmitScale: 0.9,
    bloomMultisampling: 0,
  },
  normal: {
    maxBombs: 7,
    maxExplosions: 5,
    maxSmoke: 50,
    maxMissileTrails: 28,
    maxSupplies: 6,
    maxHazards: 38,
    maxParticles: 90,
    maxSkyMissiles: 6,
    maxJets: 2,
    maxSearchlights: 3,
    maxDistantSmoke: 4,
    pickupLights: false,
    hazardLights: false,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    bloomMultisampling: 0,
    postfx: false,
    dpr: [1, 1.5],
    oceanSegments: [48, 72],
    particleEmitScale: 0.8,
  },
  mobile: {
    maxBombs: 4,
    maxExplosions: 2,
    maxSmoke: 18,
    maxMissileTrails: 10,
    maxSupplies: 4,
    maxHazards: 22,
    maxParticles: 45,
    maxSkyMissiles: 2,
    maxJets: 0,
    maxSearchlights: 0,
    maxDistantSmoke: 2,
    pickupLights: false,
    hazardLights: false,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    bloomMultisampling: 0,
    postfx: false,
    /** Bounds only — actual ratio from getCanvasDpr() on Retina */
    dpr: [1.15, 2],
    oceanSegments: [24, 36],
    particleEmitScale: 0.5,
  },
}

/** Mobile DPR: sharp enough on Retina without full 3× framebuffer cost */
export function getMobileDprRange(): [number, number] {
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const max = Math.min(2, Math.max(1.35, ratio * 0.72))
  const min = Math.min(1.15, max * 0.88)
  return [min, max]
}

export function getCanvasDpr(): [number, number] {
  if (perfState.tier === 'mobile') return getMobileDprRange()
  return getCaps().dpr
}

export function effectivePixelRatio(): number {
  const [min, max] = getCanvasDpr()
  if (perfState.tier === 'mobile') return max
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.max(min, Math.min(max, ratio * perfState.dprScale))
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
  hudFlushMs: 100,
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

  const throttleDpr = perfState.tier !== 'mobile'

  if (fps < 50) {
    softLowMs += dt * 1000
    if (fps < 28) {
      perfState.emitScale = Math.max(0.35, perfState.emitScale - dt * 0.25)
      perfState.fxMul = Math.max(0, perfState.fxMul - dt * 0.45)
      if (throttleDpr) {
        perfState.dprScale = Math.max(0.78, perfState.dprScale - dt * 0.12)
      }
      perfState.performanceReduced = true
    } else if (fps < 40) {
      perfState.emitScale = Math.max(0.5, perfState.emitScale - dt * 0.12)
      perfState.fxMul = Math.max(0.35, perfState.fxMul - dt * 0.2)
      if (throttleDpr) {
        perfState.dprScale = Math.max(0.85, perfState.dprScale - dt * 0.05)
      }
      perfState.performanceReduced = true
    }
  } else {
    softLowMs = Math.max(0, softLowMs - dt * 400)
    if (fps > 55) {
      perfState.emitScale = Math.min(1, perfState.emitScale + dt * 0.06)
      perfState.fxMul = Math.min(1, perfState.fxMul + dt * 0.15)
      if (throttleDpr) {
        perfState.dprScale = Math.min(1, perfState.dprScale + dt * 0.04)
      }
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
