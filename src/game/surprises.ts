/**
 * Per-mission surprise beats — scripted spawns, toasts, and HUD callouts.
 */
import { CHAOS_LEVEL_ID, isEndlessLevel } from './levels'
import {
  runtime,
  progress,
  triggerInterceptEvent,
  triggerExplosionFlash,
  grantPowerUp,
  consumeBombEvent,
  canSpawnBudgetedHazard,
} from './runtime'
import { useGame } from './store'
import { sfx } from './systems/audio'

function toast(text: string, kind: 'good' | 'bad' | 'info' = 'info') {
  useGame.getState().pushToast(text, kind)
}

function flag(key: string) {
  return runtime.openingFlags[key] === true
}

function setFlag(key: string) {
  runtime.openingFlags[key] = true
}

function tryFlag(key: string) {
  if (flag(key)) return false
  setFlag(key)
  return true
}

export function setSurpriseBanner(text: string, duration = 4.5) {
  runtime.activeSurprise = text
  runtime.surpriseBannerUntil = performance.now() + duration * 1000
  sfx.surprise()
}

function pulseFlare() {
  runtime.flareUntil = performance.now() + 2400
  triggerExplosionFlash()
  runtime.shake = Math.max(runtime.shake, 0.35)
}

function spawnPatrolWave(count: number, spread = 14) {
  const pz = runtime.player.z
  for (let i = 0; i < count; i++) {
    if (!canSpawnBudgetedHazard('patrol')) break
    runtime.scriptedHazards.push({
      kind: 'patrol',
      x: (i % 2 === 0 ? -1 : 1) * (6 + (i % 3) * 2),
      z: pz - spread - i * 7,
    })
  }
}

function spawnMineLine(n: number) {
  const pz = runtime.player.z
  const lane = Math.random() < 0.5 ? -3.5 : 3.5
  const count = Math.min(n, 2)
  for (let i = 0; i < count; i++) {
    if (!canSpawnBudgetedHazard('mine')) break
    runtime.scriptedHazards.push({ kind: 'mine', x: lane + (i % 2) * 1.2, z: pz - 28 - i * 6 })
  }
}

function spawnBombSalvo(n: number) {
  if (!consumeBombEvent()) return false
  const pz = runtime.player.z
  for (let i = 0; i < n; i++) {
    runtime.scriptedBombs.push({ x: (Math.random() - 0.5) * 12, z: pz - 35 - i * 9 })
  }
  runtime.incoming = Math.min(2.5, runtime.incoming + 0.8)
  return true
}

function supplyRain(count: number) {
  const pz = runtime.player.z
  const n = Math.min(count, runtime.level.specialSupplyBurstMax ?? 2, 2)
  for (let i = 0; i < n; i++) {
    runtime.scriptedCrates.push({
      x: (Math.random() - 0.5) * 8,
      z: pz - 24 - i * 10,
    })
  }
}

/** Time-based beats (openingClock) */
export function runOpeningSurprises() {
  if (!runtime.running || isEndlessLevel(runtime.level.id) || runtime.level.peaceful) return
  const lid = runtime.level.id
  const once = (key: string, at: number, fn: () => void) => {
    if (runtime.openingClock < at || flag(key)) return
    setFlag(key)
    fn()
  }

  if (lid === 1) {
    once('l1-supply', 0.35, () => {
      supplyRain(2)
      toast('CONVOY SUPPLY DROP', 'good')
    })
    once('l1-intercept', 2, () => {
      setSurpriseBanner('ONE SHADOW BOAT — STAY IN LANE')
      spawnPatrolWave(1, 42)
    })
    once('l1-gift', 7, () => {
      supplyRain(2)
      toast('ALLIED REINFORCEMENTS', 'good')
    })
  }

  if (lid === 2) {
    once('l2-radar', 1.2, () => {
      setSurpriseBanner('LIGHT PATROL SCREEN')
      toast('PATROL BOAT ON THE EDGE', 'info')
      spawnPatrolWave(1, 36)
    })
    once('l2-ambush', 3.5, () => {
      if (spawnBombSalvo(1)) {
        pulseFlare()
        toast('COASTAL LAUNCH — CLEAR WARNING', 'bad')
      }
    })
  }

  if (lid === 3) {
    once('l3-screen', 1.3, () => {
      setSurpriseBanner('ESCORT SCREEN — KEEP THE GAP')
      spawnPatrolWave(1, 38)
      toast('PATROL AHEAD', 'info')
    })
    once('l3-warning', 4, () => {
      if (spawnBombSalvo(1)) toast('STRIKE WARNING — OPEN WATER LEFT', 'bad')
    })
  }

  if (lid === 4) {
    once('l4-open', 0.6, () => {
      setSurpriseBanner('MISSILE CORRIDOR — WATCH THE RINGS')
      spawnBombSalvo(1)
      toast('SINGLE STRIKE INBOUND', 'bad')
    })
    once('l4-emp', 5, () => {
      grantPowerUp('emp')
      toast('EW BURST — EMP READY (E)', 'good')
      pulseFlare()
    })
  }

  if (lid === 5) {
    once('l5-terminal', 1, () => {
      setSurpriseBanner('FINAL ESCORT — MEDIUM PRESSURE')
      pulseFlare()
      spawnBombSalvo(1)
    })
    once('l5-dock', 4.5, () => {
      spawnPatrolWave(1, 36)
      toast('ESCORT BOAT CROSSING', 'info')
    })
  }

  if (lid === CHAOS_LEVEL_ID) {
    once('chaos-open', 0.5, () => {
      setSurpriseBanner('CHAOS MODE — EVERYTHING AT ONCE')
      spawnBombSalvo(3)
      spawnPatrolWave(2, 25)
      spawnMineLine(1)
    })
  }
}

/** Progress-based surprises (0..1) */
export function runProgressSurprises() {
  if (!runtime.running || isEndlessLevel(runtime.level.id) || runtime.level.peaceful) return
  const lid = runtime.level.id
  const p = progress()

  if (lid === 1 && p > 0.42 && tryFlag('l1-mid')) {
    supplyRain(2)
    toast('SAFE LANE SUPPLIES AHEAD', 'good')
  }

  if (lid === 2 && p > 0.38 && tryFlag('l2-mid')) {
    supplyRain(2)
    toast('SAFE GAP SUPPLIES', 'good')
  }

  if (lid === 3 && p > 0.55 && tryFlag('l3-mid')) {
    triggerInterceptEvent()
    spawnBombSalvo(1)
    toast('INTERCEPT SCREEN — FAIR GAP AHEAD', 'bad')
  }

  if (lid === 4 && p > 0.48 && tryFlag('l4-mid')) {
    setSurpriseBanner('SECOND WARNING ZONE')
    triggerInterceptEvent()
    spawnBombSalvo(1)
    runtime.shake = 0.28
  }

  if (lid === 5 && p > 0.5 && tryFlag('l5-mid')) {
    supplyRain(3)
    toast('TERMINAL SUPPLY LANE', 'good')
  }

  if (lid === 5 && p > 0.66 && tryFlag('l5-final-screen')) {
    triggerInterceptEvent()
    spawnBombSalvo(1)
    spawnPatrolWave(1, 34)
    toast('FINAL ESCORT SCREEN', 'bad')
  }

  if (lid === CHAOS_LEVEL_ID && p > 0.58 && tryFlag('chaos-ambush')) {
    triggerInterceptEvent()
    spawnPatrolWave(4, 28)
    toast('SURPRISE INTERCEPT', 'bad')
  }

  if (lid === CHAOS_LEVEL_ID) {
    const beat = Math.floor(p * 12)
    const key = `chaos-b${beat}`
    if (beat > 0 && tryFlag(key)) {
      const roll = Math.random()
      if (roll < 0.35) spawnBombSalvo(1 + Math.floor(Math.random() * 2))
      else if (roll < 0.65) spawnPatrolWave(2, 20 + beat * 2)
      else if (beat % 2 === 0) spawnMineLine(1)
      if (beat % 3 === 0) pulseFlare()
      toast(['HOT SKY', 'PATROL SWARM', 'MINE SNAP', 'FLARE BURST'][beat % 4], 'bad')
    }
  }
}

/** Tick surprise banner expiry */
export function tickSurpriseBanner() {
  if (runtime.activeSurprise && performance.now() > runtime.surpriseBannerUntil) {
    runtime.activeSurprise = ''
  }
}
