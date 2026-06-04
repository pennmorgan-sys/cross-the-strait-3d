import * as THREE from 'three'
import {
  INVINCIBLE_MS,
  MAX_HEALTH,
  START_HEALTH,
  MAX_MULTIPLIER,
  COMBO_PER_STEP,
  POWERUP_SLOW_MS,
  POWERUP_MAGNET_MS,
  POWERUP_RADAR_MS,
  OIL_SLIP_MS,
} from './constants'
import { getLevel, CHAOS_LEVEL_ID, isEndlessLevel, ENDLESS_LEVEL } from './levels'
import { saveEndlessBest, loadEndlessBest } from './systems/endlessStorage'
import { getMissionBriefing } from './missionBriefings'
import type { HudSnapshot, LevelConfig, PowerUpType, RunStats, TankerRouteId } from './types'
import { useGame } from './store'
import { computeStars } from './systems/storage'
import { clamp } from './systems/math'
import {
  runOpeningSurprises,
  runProgressSurprises,
  tickSurpriseBanner,
} from './surprises'
import { runProgressMilestones } from './progressMilestones'
import { initAudio, sfx } from './systems/audio'
import { perfState, resetPerfSession } from './systems/performance'

const now = () => performance.now()

export const runtime = {
  level: getLevel(1) as LevelConfig,
  running: false,

  player: new THREE.Vector3(0, 0, 0),
  vx: 0,
  forwardSpeed: 22,

  tankerRoute: 'china' as TankerRouteId,
  tankerProgress: 0,
  interceptEvent: false,
  interceptTimer: 0,

  minesweeperReady: true,
  minesweeperPulseUntil: 0,
  minesweeperCooldownUntil: 0,

  debugBombReq: 0,
  splashReq: 0,
  incoming: 0,
  openingClock: 0,
  openingFlags: {} as Record<string, boolean>,
  activeSurprise: '',
  surpriseBannerUntil: 0,
  flareUntil: 0,
  scriptedBombs: [] as Array<{ x: number; z: number }>,
  scriptedCrates: [] as Array<{ x: number; z: number }>,
  scriptedHazards: [] as Array<{
    kind: 'mine' | 'patrol' | 'cargo' | 'debris' | 'oil'
    x: number
    z: number
  }>,

  score: 0,
  multiplier: 1,
  combo: 0,
  health: START_HEALTH,
  maxHealth: MAX_HEALTH,
  boost: 1,
  boosting: false,

  progressUnits: 0,
  /** Endless Strait Run distance (world units) */
  endlessDistance: 0,

  invincibleUntil: 0,
  slowUntil: 0,
  magnetUntil: 0,
  radarUntil: 0,
  oilUntil: 0,
  flashUntil: 0,
  shield: false,
  powerUp: null as PowerUpType | null,
  shake: 0,
  /** Set once per frame in PerfTicker — avoids useGame.getState() in every component */
  simActive: false,
  /** Player water surface Y — shared by hazards/pickups/bombs (one waveHeight/frame) */
  seaLevel: 0,

  stats: {
    supplies: 0,
    nearMisses: 0,
    hits: 0,
    bestCombo: 0,
  } as RunStats,
}

export const isInvincible = () => now() < runtime.invincibleUntil
export const isSlow = () => now() < runtime.slowUntil
export const magnetActive = () => now() < runtime.magnetUntil
export const radarActive = () => now() < runtime.radarUntil
export const isOiled = () => now() < runtime.oilUntil
export const skyFlash = () => clamp((runtime.flashUntil - now()) / 220, 0, 1)
export const minesweeperActive = () => now() < runtime.minesweeperPulseUntil

export function progress() {
  if (isEndlessLevel(runtime.level.id)) {
    return clamp(runtime.endlessDistance / 6000, 0, 0.99)
  }
  const route =
    runtime.tankerProgress * 0.82 +
    (runtime.progressUnits / runtime.level.length) * 0.18
  return clamp(route, 0, 1)
}

export function endlessNm() {
  return Math.max(0, Math.round(runtime.endlessDistance / 48))
}

export function isFinalDash() {
  if (isEndlessLevel(runtime.level.id)) return false
  const lid = runtime.level.id
  return (lid === 8 || lid === CHAOS_LEVEL_ID) && progress() > 0.78
}

export function isSafeWater() {
  if (isEndlessLevel(runtime.level.id)) return false
  return progress() > 0.88
}

let endlessBeatNm = 0

function resetEndlessEscalation() {
  runtime.endlessDistance = 0
  endlessBeatNm = 0
  runtime.level.speed = ENDLESS_LEVEL.speed
  runtime.level.bombInterval = ENDLESS_LEVEL.bombInterval
  runtime.level.obstacleGap = ENDLESS_LEVEL.obstacleGap
  runtime.level.mineBias = ENDLESS_LEVEL.mineBias
  runtime.level.bombBurst = ENDLESS_LEVEL.bombBurst
}

function tickEndlessEscalation(d: number) {
  runtime.endlessDistance += d
  const tier = Math.floor(runtime.endlessDistance / 320)

  runtime.level.speed = ENDLESS_LEVEL.speed + tier * 1.15
  runtime.level.bombInterval = Math.max(0.55, ENDLESS_LEVEL.bombInterval - tier * 0.045)
  runtime.level.obstacleGap = Math.max(8, ENDLESS_LEVEL.obstacleGap - tier * 0.22)
  runtime.level.mineBias = Math.min(0.48, ENDLESS_LEVEL.mineBias + tier * 0.012)
  if (tier >= 2 && tier % 3 === 0) {
    runtime.level.bombBurst = Math.min(4, ENDLESS_LEVEL.bombBurst + 1)
  }

  addScore(Math.max(1, Math.floor(d * 2.8)), false)

  runtime.openingClock += d / Math.max(1, runtime.level.speed)
  tickSurpriseBanner()

  const nm = endlessNm()
  if (nm >= endlessBeatNm + 1) {
    endlessBeatNm = nm
    if (nm > 0 && nm % 4 === 0) {
      runtime.incoming = Math.min(2.5, runtime.incoming + 0.9)
      runtime.activeSurprise = 'STRAIT PRESSURE RISING'
      runtime.surpriseBannerUntil = now() + 2200
    }
  }
}

export function startLevel(id: number) {
  resetPerfSession()
  const level = getLevel(id)
  const briefing = getMissionBriefing(id)
  runtime.level = level
  runtime.running = true
  runtime.tankerRoute = briefing.tankerRoute
  runtime.tankerProgress = 0
  runtime.interceptEvent = false
  runtime.interceptTimer = 0
  runtime.minesweeperPulseUntil = 0
  runtime.minesweeperCooldownUntil = 0

  runtime.player.set(0, 0, 0)
  runtime.vx = 0
  runtime.forwardSpeed = level.speed

  runtime.score = 0
  runtime.multiplier = 1
  runtime.combo = 0
  runtime.health = START_HEALTH
  runtime.boost = 1
  runtime.boosting = false
  runtime.progressUnits = 0
  if (isEndlessLevel(id)) resetEndlessEscalation()
  else runtime.endlessDistance = 0

  runtime.invincibleUntil = 0
  runtime.slowUntil = 0
  runtime.magnetUntil = 0
  runtime.radarUntil = 0
  runtime.oilUntil = 0
  runtime.flashUntil = 0
  runtime.shield = false
  runtime.powerUp = null
  runtime.minesweeperReady = level.id >= 3
  runtime.shake = 0
  runtime.openingClock = 0
  runtime.openingFlags = {}
  runtime.activeSurprise = ''
  runtime.surpriseBannerUntil = 0
  runtime.flareUntil = 0
  runtime.scriptedBombs = []
  runtime.scriptedCrates = []
  runtime.scriptedHazards = []

  runtime.stats = {
    supplies: 0,
    nearMisses: 0,
    hits: 0,
    bestCombo: 0,
  }

  initAudio()
  sfx.start()

  const g = useGame.getState()
  g.setSelectedLevel(id)
  g.setScreen('playing')
  useGame.setState({
    endlessMode: isEndlessLevel(id),
    chaosMode: id === CHAOS_LEVEL_ID,
  })
  flushHud(true)
}

function recomputeMultiplier() {
  runtime.multiplier = clamp(
    1 + Math.floor(runtime.combo / COMBO_PER_STEP),
    1,
    MAX_MULTIPLIER,
  )
  runtime.stats.bestCombo = Math.max(runtime.stats.bestCombo, runtime.multiplier)
}

export function addCombo(n: number) {
  runtime.combo += n
  recomputeMultiplier()
}

export function resetCombo() {
  runtime.combo = 0
  runtime.multiplier = 1
}

export function addScore(n: number, useMult = true) {
  runtime.score += Math.round(n * (useMult ? runtime.multiplier : 1))
}

let lastNearMiss = 0
export function nearMiss() {
  const t = now()
  if (t - lastNearMiss < 250) return
  lastNearMiss = t
  runtime.stats.nearMisses++
  addScore(150)
  addCombo(1)
  sfx.nearMiss()
}

export function collectSupply() {
  runtime.stats.supplies++
  addScore(100)
  addCombo(1)
  runtime.boost = clamp(runtime.boost + 0.35, 0, 1)
  if (runtime.level.id >= 3) runtime.minesweeperReady = now() >= runtime.minesweeperCooldownUntil
  useGame.getState().pushToast('+100 SUPPLY', 'good')
  sfx.pickup()
}

export function damage(amount = 1): boolean {
  if (isInvincible()) return false
  if (runtime.shield) {
    runtime.shield = false
    runtime.invincibleUntil = now() + INVINCIBLE_MS
    runtime.shake = Math.max(runtime.shake, 0.4)
    useGame.getState().pushToast('SHIELD ABSORBED', 'good')
    return true
  }
  runtime.health -= amount
  runtime.stats.hits++
  resetCombo()
  runtime.invincibleUntil = now() + INVINCIBLE_MS
  runtime.shake = Math.max(runtime.shake, 0.8)
  if (runtime.health <= 0) {
    runtime.health = 0
    gameOver()
  } else {
    useGame.getState().pushToast('HIT!', 'bad')
    sfx.hit()
  }
  return true
}

/** Apply a power-up immediately (pickup or tool button). */
export function grantPowerUp(type: PowerUpType) {
  const t = now()
  switch (type) {
    case 'shield':
      runtime.shield = true
      useGame.getState().pushToast('SHIELD UP', 'good')
      break
    case 'repair':
      runtime.health = clamp(runtime.health + 1, 0, MAX_HEALTH)
      useGame.getState().pushToast('REPAIRED +1', 'good')
      break
    case 'turbo':
      runtime.boost = 1
      useGame.getState().pushToast('ENGINE PRIMED', 'good')
      break
    case 'slow':
      runtime.slowUntil = t + POWERUP_SLOW_MS
      useGame.getState().pushToast('SLOW MOTION', 'good')
      break
    case 'magnet':
      runtime.magnetUntil = t + POWERUP_MAGNET_MS
      useGame.getState().pushToast('MAGNET ON', 'good')
      break
    case 'radar':
      runtime.radarUntil = t + POWERUP_RADAR_MS
      useGame.getState().pushToast('RADAR ON', 'good')
      break
    case 'minesweeper':
      triggerMinesweeperPulse()
      sfx.pickup()
      flushHud()
      return
    case 'emp':
      runtime.interceptEvent = false
      runtime.interceptTimer = 0
      useGame.getState().pushToast('EMP — INTERCEPTS STUNNED', 'good')
      break
  }
  sfx.pickup()
  flushHud()
}

export function setPowerUp(type: PowerUpType) {
  runtime.powerUp = null
  grantPowerUp(type)
}

export function triggerMinesweeperPulse() {
  const t = now()
  if (t < runtime.minesweeperCooldownUntil) return false
  runtime.minesweeperPulseUntil = t + 2200
  runtime.minesweeperCooldownUntil = t + 4500
  useGame.getState().pushToast('MINESWEEPER PULSE', 'good')
  return true
}

export function usePowerUp() {
  if (runtime.powerUp) {
    grantPowerUp(runtime.powerUp)
    runtime.powerUp = null
    return
  }
  if (runtime.minesweeperReady) triggerMinesweeperPulse()
}

export function triggerExplosionFlash() {
  runtime.flashUntil = now() + 220
}

export function applyOil() {
  runtime.oilUntil = now() + OIL_SLIP_MS
}

export function triggerInterceptEvent() {
  runtime.interceptEvent = true
  runtime.interceptTimer = 9 + Math.random() * 5
  useGame.getState().pushToast('INTERCEPT SHIPS INBOUND', 'bad')
}

export function tickProgress(d: number) {
  if (!runtime.running) return
  if (isEndlessLevel(runtime.level.id)) {
    tickEndlessEscalation(d)
    if (runtime.interceptTimer > 0) {
      runtime.interceptTimer -= d / runtime.level.speed
      if (runtime.interceptTimer <= 0) runtime.interceptEvent = false
    }
    runtime.incoming = Math.max(0, runtime.incoming - (d / runtime.level.speed) * 0.35)
    return
  }
  runtime.progressUnits += d
  runtime.tankerProgress = clamp(
    runtime.progressUnits / runtime.level.length,
    0,
    1,
  )
  runtime.openingClock += d / Math.max(1, runtime.level.speed)
  runOpeningSurprises()
  runProgressSurprises()
  runProgressMilestones(runtime.openingFlags)
  tickSurpriseBanner()
  if (runtime.interceptTimer > 0) {
    runtime.interceptTimer -= d / runtime.level.speed
    if (runtime.interceptTimer <= 0) runtime.interceptEvent = false
  }
  runtime.incoming = Math.max(0, runtime.incoming - (d / runtime.level.speed) * 0.35)
  if (runtime.progressUnits >= runtime.level.length) {
    finishLevel()
  }
}

function saveResult(finished: boolean) {
  const lvl = runtime.level
  const stars = computeStars(
    finished,
    runtime.score,
    lvl.targetScore,
    runtime.stats.hits,
  )
  useGame.getState().updateBest(lvl.id, { score: runtime.score, stars })
}

export function finishLevel() {
  if (!runtime.running) return
  runtime.running = false
  addScore(2000, false)
  if (runtime.health >= START_HEALTH) addScore(1500, false)
  saveResult(true)
  sfx.win()
  useGame.getState().setScreen('win')
}

export function gameOver() {
  if (!runtime.running) return
  runtime.running = false
  if (isEndlessLevel(runtime.level.id)) {
    const record = saveEndlessBest(runtime.score)
    useGame.getState().updateBest(runtime.level.id, {
      score: runtime.score,
      stars: 0,
    })
    useGame.getState().refreshEndlessBest()
    if (record) {
      useGame.getState().pushToast('NEW STRAIT RUN RECORD!', 'good')
    }
  } else {
    saveResult(false)
  }
  sfx.gameOver()
  useGame.getState().setScreen('gameOver')
}

let lastFlush = 0
export function flushHud(force = false) {
  const t = now()
  if (!force && t - lastFlush < perfState.hudFlushMs) return
  lastFlush = t
  const briefing = getMissionBriefing(runtime.level.id)
  const snap: HudSnapshot = {
    score: runtime.score,
    multiplier: runtime.multiplier,
    health: runtime.health,
    maxHealth: runtime.maxHealth,
    boost: runtime.boost,
    supplies: runtime.stats.supplies,
    progress: progress(),
    powerUp: runtime.powerUp,
    shield: runtime.shield,
    levelName: runtime.level.name,
    missionCodename: briefing.codename,
    banner: bannerText(),
    finalDash: isFinalDash(),
    siren: runtime.incoming > 0,
    incoming: runtime.incoming,
    tankerRoute: runtime.tankerRoute,
    routeLabel: briefing.routeLabel,
    interceptEvent: runtime.interceptEvent,
    activeSurprise: runtime.activeSurprise,
    minesweeperReady:
      runtime.level.id >= 3 &&
      (runtime.powerUp === 'minesweeper' || now() >= runtime.minesweeperCooldownUntil),
    isEndless: isEndlessLevel(runtime.level.id),
    endlessDistance: isEndlessLevel(runtime.level.id) ? endlessNm() : undefined,
    endlessBest: isEndlessLevel(runtime.level.id) ? loadEndlessBest() : undefined,
  }
  useGame.getState().setHud(snap)
}

function bannerText(): string {
  if (isEndlessLevel(runtime.level.id)) {
    if (runtime.activeSurprise) return runtime.activeSurprise
    return `STRAIT RUN · ${endlessNm()} NM · BEST ${loadEndlessBest().toLocaleString()}`
  }
  if (runtime.activeSurprise) return runtime.activeSurprise
  if (runtime.interceptEvent) return 'INTERCEPT SHIPS INBOUND'
  if (isSafeWater()) return 'SAFE WATER AHEAD'
  if (isFinalDash()) return 'FINAL ESCORT'
  if (runtime.level.id === 4) return 'MISSILE STORM'
  if (runtime.level.id === 3) return 'MINE BELT AHEAD'
  if (runtime.incoming > 0) return 'MISSILE WARNING'
  return ''
}
