/**
 * Per-mission surprise beats — scripted spawns, toasts, and HUD callouts.
 */
import { CHAOS_LEVEL_ID } from './levels'
import {
  runtime,
  progress,
  triggerInterceptEvent,
  triggerExplosionFlash,
  grantPowerUp,
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
  for (let i = 0; i < n; i++) {
    runtime.scriptedHazards.push({ kind: 'mine', x: lane + (i % 2) * 1.2, z: pz - 28 - i * 5 })
  }
}

function spawnBombSalvo(n: number) {
  const pz = runtime.player.z
  for (let i = 0; i < n; i++) {
    runtime.scriptedBombs.push({ x: (Math.random() - 0.5) * 12, z: pz - 35 - i * 9 })
  }
  runtime.incoming = Math.min(2.5, runtime.incoming + 0.8)
}

function supplyRain(count: number) {
  const pz = runtime.player.z
  for (let i = 0; i < count; i++) {
    runtime.scriptedCrates.push({ x: (Math.random() - 0.5) * 10, z: pz - 16 - i * 3 })
  }
}

/** Time-based beats (openingClock) */
export function runOpeningSurprises() {
  if (!runtime.running) return
  const lid = runtime.level.id
  const pz = runtime.player.z
  const once = (key: string, at: number, fn: () => void) => {
    if (runtime.openingClock < at || flag(key)) return
    setFlag(key)
    fn()
  }

  if (lid === 1) {
    once('l1-supply', 0.35, () => {
      supplyRain(8)
      toast('CONVOY SUPPLY DROP', 'good')
    })
    once('l1-intercept', 2, () => {
      setSurpriseBanner('SHADOW BOATS — STAY IN LANE')
      triggerInterceptEvent()
      spawnPatrolWave(2, 32)
    })
    once('l1-missile', 4.2, () => {
      pulseFlare()
      toast('COASTAL LAUNCH — INCOMING', 'bad')
      spawnBombSalvo(1)
    })
    once('l1-gift', 7, () => {
      supplyRain(9)
      toast('ALLIED REINFORCEMENTS', 'good')
    })
  }

  if (lid === 2) {
    once('l2-radar', 1.2, () => {
      setSurpriseBanner('RADAR SWEEP ACTIVE')
      toast('SEARCHLIGHTS ON THE COAST', 'bad')
      spawnPatrolWave(2, 28)
    })
    once('l2-ambush', 3.5, () => {
      pulseFlare()
      spawnPatrolWave(2, 40)
      toast('FAST INTERCEPT — HARD STARBORD', 'bad')
    })
  }

  if (lid === 3) {
    once('l3-mines', 0.8, () => {
      setSurpriseBanner('MINE BELT — PULSE READY (E)')
      spawnMineLine(3)
      toast('MINEFIELD DETECTED', 'bad')
    })
    once('l3-oil', 4, () => {
      runtime.scriptedHazards.push({ kind: 'oil', x: 2, z: pz - 45 })
      runtime.scriptedHazards.push({ kind: 'oil', x: -2.5, z: pz - 52 })
      toast('OIL SLICK — AVOID CENTER', 'bad')
    })
  }

  if (lid === 4) {
    once('l4-open', 0.6, () => {
      setSurpriseBanner('MISSILE CORRIDOR LIVE')
      spawnBombSalvo(3)
      toast('SALVO INBOUND', 'bad')
    })
    once('l4-emp', 5, () => {
      grantPowerUp('emp')
      toast('EW BURST — EMP READY (E)', 'good')
      pulseFlare()
    })
  }

  if (lid === 5) {
    once('l5-terminal', 1, () => {
      setSurpriseBanner('REFINERY FIRELINE')
      pulseFlare()
      spawnBombSalvo(2)
    })
    once('l5-dock', 4.5, () => {
      runtime.scriptedHazards.push({ kind: 'cargo', x: 5, z: pz - 38 })
      runtime.scriptedHazards.push({ kind: 'debris', x: -4, z: pz - 44 })
      toast('DOCK TRAFFIC — WEAVE', 'bad')
    })
  }

  if (lid === 6) {
    once('l6-dark', 0.9, () => {
      setSurpriseBanner('RADAR SILENCE — RUN DARK')
      runtime.incoming = 1.2
      toast('SNAPSHOT MISSILE LOCK', 'bad')
    })
    once('l6-flare', 3.8, () => {
      pulseFlare()
      spawnPatrolWave(3, 36)
    })
  }

  if (lid === 7) {
    once('l7-merge', 1.1, () => {
      setSurpriseBanner('TWIN CONVOY MERGE')
      toast('SECOND TANKER ON YOUR PORT SIDE', 'info')
      supplyRain(7)
    })
    once('l7-cross', 4.2, () => {
      spawnBombSalvo(2)
      spawnPatrolWave(2, 30)
      toast('CROSSFIRE — HOLD FORMATION', 'bad')
    })
  }

  if (lid === 8) {
    once('l8-push', 1.5, () => {
      setSurpriseBanner('FINAL PUSH — ESCORT OR DIE')
      triggerInterceptEvent()
    })
    once('l8-salvo', 4, () => {
      spawnBombSalvo(3)
      pulseFlare()
    })
  }

  if (lid === CHAOS_LEVEL_ID) {
    once('chaos-open', 0.5, () => {
      setSurpriseBanner('CHAOS MODE — EVERYTHING AT ONCE')
      spawnBombSalvo(3)
      spawnPatrolWave(2, 25)
      spawnMineLine(2)
    })
  }
}

/** Progress-based surprises (0..1) */
export function runProgressSurprises() {
  if (!runtime.running) return
  const lid = runtime.level.id
  const p = progress()
  const pz = runtime.player.z

  if (lid === 1 && p > 0.42 && tryFlag('l1-mid')) {
    setSurpriseBanner('GHOST CONVOY — FRIEND OR FOE?')
    spawnPatrolWave(2, 22)
    toast('UNKNOWN CONTACT AHEAD', 'info')
  }

  if (lid === 2 && p > 0.38 && tryFlag('l2-mid')) {
    triggerInterceptEvent()
    spawnBombSalvo(2)
  }

  if (lid === 3 && p > 0.55 && tryFlag('l3-mid')) {
    runtime.minesweeperReady = true
    grantPowerUp('minesweeper')
    toast('MINESWEEPER CHARGED', 'good')
    pulseFlare()
  }

  if (lid === 4 && p > 0.48 && tryFlag('l4-mid')) {
    setSurpriseBanner('DOUBLE TAP — SECOND WAVE')
    spawnBombSalvo(3)
    runtime.shake = 0.5
  }

  if (lid === 5 && p > 0.5 && tryFlag('l5-mid')) {
    supplyRain(5)
    toast('TERMINAL SUPPLY LANE', 'good')
  }

  if (lid === 6 && p > 0.45 && tryFlag('l6-mid')) {
    grantPowerUp('radar')
    toast('RADAR BURST — SCAN ACTIVE', 'good')
  }

  if (lid === 7 && p > 0.62 && tryFlag('l7-mid')) {
    spawnMineLine(2)
    spawnPatrolWave(2, 34)
    setSurpriseBanner('DUAL LANE MINEFIELD')
  }

  if ((lid === 8 || lid === CHAOS_LEVEL_ID) && p > 0.58 && tryFlag('l8-ambush')) {
    triggerInterceptEvent()
    spawnPatrolWave(lid === CHAOS_LEVEL_ID ? 4 : 2, 28)
    toast('SURPRISE INTERCEPT', 'bad')
  }

  if (lid === CHAOS_LEVEL_ID) {
    const beat = Math.floor(p * 12)
    const key = `chaos-b${beat}`
    if (beat > 0 && tryFlag(key)) {
      const roll = Math.random()
      if (roll < 0.35) spawnBombSalvo(1 + Math.floor(Math.random() * 2))
      else if (roll < 0.65) spawnPatrolWave(2, 20 + beat * 2)
      else spawnMineLine(1 + (beat % 2))
      if (beat % 3 === 0) pulseFlare()
      toast(['HOT SKY', 'PATROL SWARM', 'MINE SNAP', 'FLARE BURST'][beat % 4], 'bad')
    }
  }

  // Late-game refinery debris (level 5+)
  if (lid >= 5 && p > 0.72 && p < 0.85 && tryFlag(`debris-${lid}-${Math.floor(p * 20)}`)) {
    runtime.scriptedHazards.push({ kind: 'debris', x: randSide(), z: pz - 30 })
  }
}

function randSide() {
  return (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 4)
}

/** Tick surprise banner expiry */
export function tickSurpriseBanner() {
  if (runtime.activeSurprise && performance.now() > runtime.surpriseBannerUntil) {
    runtime.activeSurprise = ''
  }
}
