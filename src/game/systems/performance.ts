/** Runtime quality tiers, effect caps, FPS tracking, and soft throttles. */

import { MAX_ACTIVE } from '../constants'
import { loadSettings } from './settings'

export type QualityTier = 'high' | 'balanced' | 'mobile'
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
    maxSmoke: MAX_ACTIVE.SMOKE,
    maxMissileTrails: 18,
    maxSupplies: 4,
    maxHazards: MAX_ACTIVE.HAZARDS,
    maxParticles: MAX_ACTIVE.PARTICLES,
    maxSkyMissiles: 5,
    maxJets: 0,
    maxSearchlights: 6,
    maxDistantSmoke: 8,
    pickupLights: true,
    hazardLights: false,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    postfx: true,
    dpr: [1.25, 1.5],
    oceanSegments: [128, 180],
    particleEmitScale: 1,
    bloomMultisampling: 1,
  },
  balanced: {
    maxBombs: 7,
    maxExplosions: 5,
    maxSmoke: 50,
    maxMissileTrails: 12,
    maxSupplies: 4,
    maxHazards: 38,
    maxParticles: 110,
    maxSkyMissiles: 3,
    maxJets: 0,
    maxSearchlights: 4,
    maxDistantSmoke: 5,
    pickupLights: false,
    hazardLights: false,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    bloomMultisampling: 0,
    postfx: true,
    dpr: [1, 1.25],
    oceanSegments: [80, 110],
    particleEmitScale: 0.9,
  },
  mobile: {
    maxBombs: 3,
    maxExplosions: 3,
    maxSmoke: 30,
    maxMissileTrails: 8,
    maxSupplies: 3,
    maxHazards: 30,
    maxParticles: 50,
    maxSkyMissiles: 1,
    maxJets: 0,
    maxSearchlights: 0,
    maxDistantSmoke: 3,
    pickupLights: false,
    hazardLights: false,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    bloomMultisampling: 0,
    postfx: false,
    dpr: [1, 1],
    oceanSegments: [32, 48],
    particleEmitScale: 0.55,
  },
}

export function getCanvasDpr(): [number, number] {
  return getCaps().dpr
}

export function effectivePixelRatio(): number {
  const [min, max] = getCanvasDpr()
  const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  return Math.max(min, Math.min(max, ratio * perfState.dprScale))
}

export function tierDisplayName(tier: QualityTier): string {
  if (tier === 'balanced') return 'BALANCED'
  return tier.toUpperCase()
}

function applyTierDefaults() {
  const tier = perfState.tier
  if (tier === 'high') {
    perfState.skyChaosMul = 1
    perfState.hudFlushMs = 50
  } else if (tier === 'balanced') {
    perfState.skyChaosMul = 0.78
    perfState.hudFlushMs = 66
  } else {
    perfState.skyChaosMul = 0.52
    perfState.hudFlushMs = 100
  }
}

export const perfState = {
  tier: 'balanced' as QualityTier,
  mode: 'auto' as QualityMode,
  fps: 60,
  frameMs: 16.67,
  highRefreshReady: false,
  performanceReduced: false,
  /** Soft particle throttle 0.35–1 without scene remount */
  emitScale: 1,
  /** Post-FX + bloom strength 0–1 (can disable bloom without remount) */
  fxMul: 1,
  /** Sky backdrop spawn scale — tier base, never below 0.45 */
  skyChaosMul: 1,
  /** DPR multiplier 0.75–1 */
  dprScale: 1,
  overlayVisible: false,
  hudFlushMs: 66,
  counts: {
    bombs: 0,
    explosions: 0,
    smoke: 0,
    trails: 0,
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
  if (perfState.tier === 'mobile') return 0.85
  if (perfState.tier === 'balanced') return 0.35
  return 0
}

/** Effective particle scale = tier base × soft throttle */
export function particleEmitScale(): number {
  return getCaps().particleEmitScale * perfState.emitScale
}

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'balanced'
  const ua = navigator.userAgent
  const mobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    window.innerWidth < 768 ||
    window.matchMedia('(pointer: coarse)').matches
  if (mobile) return 'mobile'
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (mem !== undefined && mem <= 3) return 'balanced'
  if (window.innerWidth >= 1024) return 'high'
  return 'balanced'
}

const FPS_SAMPLES = 90
const fpsBuf: number[] = []
let peakFps = 60
let softLowMs = 0

export function initPerformance() {
  peakFps = 60
  fpsBuf.length = 0
  softLowMs = 0

  const saved = loadSettings().qualityMode ?? 'auto'
  perfState.mode = saved
  if (saved === 'auto') {
    resetPerfSession()
  } else {
    perfState.tier = saved
    perfState.performanceReduced = false
    perfState.emitScale = 1
    perfState.fxMul = 1
    perfState.dprScale = 1
    applyTierDefaults()
    notifyPerf()
  }

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
    perfState.fxMul = 1
    perfState.dprScale = 1
    applyTierDefaults()
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
  applyTierDefaults()
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
  peakFps = Math.max(30, Math.min(120, peakFps * 0.99 + perfState.fps * 0.01))
  perfState.highRefreshReady = perfState.fps >= 85 && perfState.tier === 'high'

  const fps = perfState.fps
  const prevEmit = perfState.emitScale
  const prevFx = perfState.fxMul

  const throttleDpr = perfState.tier !== 'mobile'

  if (fps < 50) {
    softLowMs += dt * 1000
    if (fps < 28) {
      perfState.emitScale = Math.max(0.5, perfState.emitScale - dt * 0.2)
      perfState.fxMul = Math.max(0.45, perfState.fxMul - dt * 0.35)
      if (throttleDpr) {
        perfState.dprScale = Math.max(0.78, perfState.dprScale - dt * 0.12)
      }
      perfState.performanceReduced = true
    } else if (fps < 40) {
      perfState.emitScale = Math.max(0.65, perfState.emitScale - dt * 0.1)
      perfState.fxMul = Math.max(0.55, perfState.fxMul - dt * 0.15)
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
