/**
 * FULL SKY WAR — decorative only. Jets, drones, missiles, tracers, meteors,
 * air bombs, nukes, constant crossfire. Zero gameplay hooks.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS } from '../constants'
import { runtime } from '../runtime'
import { rand, clamp } from '../systems/math'
import { glowTexture } from '../systems/glow'
import { getCaps, perfState } from '../systems/performance'

function chaosBudget() {
  const mul = perfState.skyChaosMul
  const pack = (base: {
    jets: number
    missiles: number
    tracers: number
    drones: number
    meteors: number
    skyBombs: number
    bursts: number
    nukes: number
    salvos: number
  }) => ({
    jets: Math.ceil(base.jets * mul),
    missiles: Math.ceil(base.missiles * mul),
    tracers: Math.ceil(base.tracers * mul),
    drones: Math.ceil(base.drones * mul),
    meteors: Math.ceil(base.meteors * mul),
    skyBombs: Math.ceil(base.skyBombs * mul),
    bursts: Math.ceil(base.bursts * mul),
    nukes: Math.ceil(base.nukes * mul),
    salvos: Math.ceil(base.salvos * mul),
  })
  if (perfState.tier === 'mobile') {
    return pack({
      jets: 12,
      missiles: 28,
      tracers: 48,
      drones: 20,
      meteors: 28,
      skyBombs: 20,
      bursts: 24,
      nukes: 6,
      salvos: 3,
    })
  }
  if (perfState.tier === 'balanced') {
    return pack({
      jets: 22,
      missiles: 48,
      tracers: 90,
      drones: 36,
      meteors: 48,
      skyBombs: 36,
      bursts: 42,
      nukes: 10,
      salvos: 6,
    })
  }
  return pack({
    jets: 32,
    missiles: 72,
    tracers: 140,
    drones: 56,
    meteors: 72,
    skyBombs: 56,
    bursts: 64,
    nukes: 16,
    salvos: 10,
  })
}

const MAX = {
  jets: 36,
  missiles: 80,
  tracers: 150,
  drones: 60,
  meteors: 80,
  skyBombs: 60,
  bursts: 70,
  nukes: 18,
}

function skyX(px: number, spread: number, y: number) {
  const x = px + rand(-spread, spread)
  if (y < 38 && Math.abs(x - px) < 9) {
    return px + (x < px ? -1 : 1) * rand(12, spread)
  }
  return clamp(x, -72, 72)
}

type JetSlot = { life: number; x: number; y: number; z: number; vx: number; dir: number }
type StreakSlot = { life: number; max: number; x: number; y: number; z: number; vx: number; vy: number }
type DroneSlot = { x: number; y: number; zOff: number; vx: number; phase: number }
type SkyBombSlot = { life: number; x: number; y: number; z: number; vy: number; flash: number }
type BurstSlot = { life: number; max: number; x: number; y: number; z: number; scale: number }
type NukeSlot = { life: number; max: number; x: number; y: number; z: number }

function takeFreeSlot<T extends { life: number }>(pool: T[], cap: number): T | undefined {
  const free = pool.slice(0, cap).find((e) => e.life <= 0)
  if (free) return free
  let oldest = pool[0]
  let best = oldest.life
  for (let i = 1; i < cap; i++) {
    if (pool[i].life < best) {
      best = pool[i].life
      oldest = pool[i]
    }
  }
  if (best > 0.02) return oldest
  return undefined
}

function spawnStreak(
  pool: StreakSlot[],
  cap: number,
  px: number,
  pz: number,
  opts: { fast?: boolean; diagonal?: boolean },
) {
  const slot = takeFreeSlot(pool, cap)
  if (!slot) return
  const dir = Math.random() < 0.5 ? 1 : -1
  const y = opts.diagonal ? rand(40, 72) : rand(18, 58)
  slot.max = slot.life = opts.fast ? rand(0.25, 0.55) : rand(0.45, 1.1)
  slot.x = skyX(px, opts.diagonal ? 75 : 65, y)
  slot.y = y
  slot.z = pz - rand(15, 200)
  if (opts.diagonal) {
    slot.vx = rand(-28, 28)
    slot.vy = -rand(40, 85)
  } else {
    slot.vx = dir * rand(120, 280)
    slot.vy = rand(-18, 18)
  }
}

export default function SkyWarBackdrop({ nightMode = false }: { nightMode?: boolean }) {
  const root = useRef<THREE.Group>(null)
  const warmed = useRef(false)
  const runClock = useRef(0)
  const lastPrime = useRef(0)

  const jetRefs = useRef<(THREE.Group | null)[]>([])
  const jets = useRef<JetSlot[]>(
    Array.from({ length: MAX.jets }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, dir: 1 })),
  )

  const missileRefs = useRef<(THREE.Group | null)[]>([])
  const missiles = useRef<StreakSlot[]>(
    Array.from({ length: MAX.missiles }, () => ({
      life: 0,
      max: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
    })),
  )

  const tracerRefs = useRef<(THREE.Mesh | null)[]>([])
  const tracers = useRef<StreakSlot[]>(
    Array.from({ length: MAX.tracers }, () => ({
      life: 0,
      max: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
    })),
  )

  const droneRefs = useRef<(THREE.Group | null)[]>([])
  const drones = useRef<DroneSlot[]>(
    Array.from({ length: MAX.drones }, (_, i) => ({
      x: rand(-40, 40),
      y: rand(22, 48),
      zOff: -20 - (i % 12) * 18,
      vx: rand(8, 18) * (Math.random() < 0.5 ? 1 : -1),
      phase: rand(0, 20),
    })),
  )

  const meteorRefs = useRef<(THREE.Mesh | null)[]>([])
  const meteors = useRef<StreakSlot[]>(
    Array.from({ length: MAX.meteors }, () => ({
      life: 0,
      max: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
    })),
  )

  const bombRefs = useRef<(THREE.Group | null)[]>([])
  const skyBombs = useRef<SkyBombSlot[]>(
    Array.from({ length: MAX.skyBombs }, () => ({
      life: 0,
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      flash: 0,
    })),
  )

  const burstRefs = useRef<(THREE.Sprite | null)[]>([])
  const bursts = useRef<BurstSlot[]>(
    Array.from({ length: MAX.bursts }, () => ({
      life: 0,
      max: 1,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
    })),
  )

  const nukeRefs = useRef<(THREE.Sprite | null)[]>([])
  const nukes = useRef<NukeSlot[]>(
    Array.from({ length: MAX.nukes }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0 })),
  )

  const glow = useMemo(() => glowTexture(), [])
  const burstMats = useMemo(
    () =>
      Array.from({ length: MAX.bursts }, () =>
        new THREE.SpriteMaterial({
          map: glow,
          color: COLORS.explosionOrange,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        }),
      ),
    [glow],
  )
  const nukeMats = useMemo(
    () =>
      Array.from({ length: MAX.nukes }, () =>
        new THREE.SpriteMaterial({
          map: glow,
          color: nightMode ? '#fef9c3' : '#fffbeb',
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        }),
      ),
    [glow, nightMode],
  )
  const bombFlashMats = useMemo(
    () =>
      Array.from({ length: MAX.skyBombs }, () =>
        new THREE.SpriteMaterial({
          map: glow,
          color: COLORS.warningRed,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        }),
      ),
    [glow],
  )

  const colors = useMemo(
    () => ({
      fire: new THREE.Color(COLORS.explosionOrange),
      gold: new THREE.Color(COLORS.supplyGold),
      teal: new THREE.Color(COLORS.tealWake),
      red: new THREE.Color(COLORS.warningRed),
      purple: new THREE.Color(COLORS.stormPurple),
    }),
    [],
  )

  const spawnBurst = (px: number, pz: number, cap: number, scale = rand(3, 12)) => {
    const slot = takeFreeSlot(bursts.current, cap)
    if (!slot) return
    const y = rand(22, 62)
    slot.max = slot.life = rand(0.2, 0.55)
    slot.x = skyX(px, 70, y)
    slot.y = y
    slot.z = pz - rand(10, 210)
    slot.scale = scale
  }

  const primeChaos = (px: number, pz: number, cap: ReturnType<typeof chaosBudget>, heavy = false) => {
    const n = heavy ? 3 : 1
    for (let r = 0; r < n; r++) {
      for (let i = 0; i < cap.salvos * 2; i++) {
        spawnStreak(tracers.current, cap.tracers, px, pz, { fast: true })
        spawnStreak(missiles.current, cap.missiles, px, pz, {})
        spawnStreak(meteors.current, cap.meteors, px, pz, { diagonal: true })
      }
      spawnBurst(px, pz, cap.bursts, rand(5, 14))
      const jet = takeFreeSlot(jets.current, cap.jets)
      if (jet) {
        jet.dir = Math.random() < 0.5 ? 1 : -1
        jet.life = rand(2.5, 4.5)
        jet.y = rand(30, 56)
        jet.z = pz - rand(20, 160)
        jet.x = px - jet.dir * rand(60, 100)
        jet.vx = jet.dir * rand(85, 140)
      }
    }
  }

  useFrame((state, dt) => {
    if (!root.current) return
    if (!runtime.running) {
      warmed.current = false
      runClock.current = 0
      return
    }
    const d = Math.min(dt, 0.05)
    const cap = chaosBudget()
    const px = runtime.player.x
    const pz = runtime.player.z
    const t = state.clock.elapsedTime
    root.current.position.z = pz

    if (runtime.simActive) runClock.current += d
    else return

    if (!warmed.current) {
      warmed.current = true
      primeChaos(px, pz, cap, true)
    }
    // Sustained intensity — no long quiet valleys (was 0.1× spawn at wave trough)
    const intensity = perfState.skyChaosMul * (1.15 + Math.sin(t * 1.35) * 0.18)
    const pace = d * intensity

    for (let n = 0; n < cap.salvos; n++) {
      spawnStreak(tracers.current, cap.tracers, px, pz, { fast: true })
      spawnStreak(missiles.current, cap.missiles, px, pz, { fast: Math.random() < 0.55 })
      spawnStreak(meteors.current, cap.meteors, px, pz, { diagonal: true })
    }

    if (runClock.current - lastPrime.current > 3.2) {
      lastPrime.current = runClock.current
      primeChaos(px, pz, cap, false)
    }

    if (Math.random() < pace * 52) {
      const slot = takeFreeSlot(jets.current, cap.jets)
      if (slot) {
        slot.dir = Math.random() < 0.5 ? 1 : -1
        slot.life = rand(2, 4.2)
        slot.y = rand(28, 58)
        slot.z = pz - rand(25, 190)
        slot.x = px - slot.dir * rand(70, 110)
        slot.vx = slot.dir * rand(75, 145)
      }
    }

    if (Math.random() < pace * 95) {
      spawnStreak(tracers.current, cap.tracers, px, pz, { fast: Math.random() < 0.65 })
    }
    if (Math.random() < pace * 72) {
      spawnStreak(missiles.current, cap.missiles, px, pz, {})
      spawnStreak(missiles.current, cap.missiles, px, pz, { fast: Math.random() < 0.5 })
    }
    if (Math.random() < pace * 78) {
      spawnStreak(meteors.current, cap.meteors, px, pz, { diagonal: true })
    }
    if (Math.random() < pace * 58) spawnBurst(px, pz, cap.bursts)
    if (Math.random() < pace * 34) {
      const slot = takeFreeSlot(skyBombs.current, cap.skyBombs)
      if (slot) {
        const y = rand(52, 78)
        slot.life = rand(2, 3.5)
        slot.x = skyX(px, 65, y)
        slot.y = y
        slot.z = pz - rand(30, 180)
        slot.vy = rand(14, 26)
        slot.flash = 0
      }
    }
    if (Math.random() < pace * 9) {
      const slot = takeFreeSlot(nukes.current, cap.nukes)
      if (slot) {
        slot.max = slot.life = rand(1.2, 2.6)
        const y = rand(35, 62)
        slot.x = skyX(px, 60, y)
        slot.y = y
        slot.z = pz - rand(60, 220)
        spawnBurst(px, pz, cap.bursts, rand(8, 20))
      }
    }

    for (let i = 0; i < cap.drones; i++) {
      const dr = drones.current[i]
      const g = droneRefs.current[i]
      if (!g) continue
      dr.x += dr.vx * d
      if (dr.x > 62) dr.vx = -Math.abs(dr.vx)
      if (dr.x < -62) dr.vx = Math.abs(dr.vx)
      g.visible = true
      g.position.set(
        px + dr.x,
        dr.y + Math.sin(t * 1.8 + dr.phase) * 2.5,
        pz + dr.zOff,
      )
      g.rotation.y = dr.vx > 0 ? -Math.PI / 2 : Math.PI / 2
      g.rotation.z = Math.sin(t * 2.5 + dr.phase) * 0.18
    }

    for (let i = 0; i < cap.jets; i++) {
      const j = jets.current[i]
      const g = jetRefs.current[i]
      if (!g) continue
      if (j.life <= 0) {
        g.visible = false
        continue
      }
      j.life -= d
      j.x += j.vx * d
      g.visible = true
      g.position.set(j.x, j.y, j.z)
      g.rotation.y = j.dir > 0 ? -Math.PI / 2 : Math.PI / 2
      const burn = g.children[3] as THREE.Sprite | undefined
      if (burn) burn.scale.setScalar(1.2 + Math.sin(t * 30) * 0.25)
    }

    const updateStreak = (
      pool: StreakSlot[],
      refs: (THREE.Object3D | null)[],
      limit: number,
      baseLen: number,
    ) => {
      for (let i = 0; i < limit; i++) {
        const s = pool[i]
        const obj = refs[i]
        if (!obj) continue
        if (s.life <= 0) {
          obj.visible = false
          continue
        }
        s.life -= d
        s.x += s.vx * d
        s.y += s.vy * d
        obj.visible = true
        obj.position.set(s.x, s.y, s.z)
        obj.rotation.z = Math.atan2(s.vy, s.vx)
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshBasicMaterial
          mat.opacity = clamp(s.life / s.max, 0.2, 1)
          obj.scale.set(baseLen + (i % 4) * 0.22, 1, 1)
          const pick = i % 5
          if (pick === 0) mat.color.copy(colors.fire)
          else if (pick === 1) mat.color.copy(colors.gold)
          else if (pick === 2) mat.color.copy(colors.teal)
          else if (pick === 3) mat.color.copy(colors.red)
          else mat.color.copy(colors.purple)
        }
        if (s.vy < -20 && s.y < 34 && s.life < s.max * 0.3 && Math.random() < 0.15) {
          spawnBurst(px, pz, cap.bursts, rand(4, 10))
        }
      }
    }

    updateStreak(tracers.current, tracerRefs.current, cap.tracers, 1.6)
    updateStreak(missiles.current, missileRefs.current, cap.missiles, 1.15)
    updateStreak(meteors.current, meteorRefs.current, cap.meteors, 0.95)

    for (let i = 0; i < cap.skyBombs; i++) {
      const b = skyBombs.current[i]
      const g = bombRefs.current[i]
      if (!g) continue
      if (b.life <= 0 && b.flash <= 0) {
        g.visible = false
        continue
      }
      if (b.flash > 0) {
        b.flash -= d
        g.visible = true
        g.position.set(b.x, b.y, b.z)
        const sprite = g.children[1] as THREE.Sprite | undefined
        if (sprite) {
          const s = 5 + (1 - b.flash / 0.4) * 14
          sprite.scale.set(s, s, 1)
          bombFlashMats[i].opacity = clamp(b.flash / 0.4, 0, 1)
        }
        const body = g.children[0] as THREE.Mesh | undefined
        if (body) body.visible = false
      } else {
        b.y -= b.vy * d
        if (b.y < 28) {
          b.flash = 0.4
          b.life = 0
          spawnBurst(px, pz, cap.bursts, rand(5, 11))
        }
        g.visible = true
        g.position.set(b.x, b.y, b.z)
        const body = g.children[0] as THREE.Mesh | undefined
        if (body) body.visible = true
      }
    }

    for (let i = 0; i < cap.bursts; i++) {
      const b = bursts.current[i]
      const spr = burstRefs.current[i]
      if (!spr) continue
      if (b.life <= 0) {
        spr.visible = false
        continue
      }
      b.life -= d
      spr.visible = true
      spr.position.set(b.x, b.y, b.z)
      const prog = 1 - b.life / b.max
      const s = b.scale * (0.5 + prog * 2.2)
      spr.scale.set(s, s, 1)
      burstMats[i].opacity = clamp(0.95 * (1 - prog), 0, 1)
    }

    for (let i = 0; i < cap.nukes; i++) {
      const n = nukes.current[i]
      const spr = nukeRefs.current[i]
      if (!spr) continue
      if (n.life <= 0) {
        spr.visible = false
        continue
      }
      n.life -= d
      spr.visible = true
      spr.position.set(n.x, n.y, n.z)
      const prog = 1 - n.life / n.max
      spr.scale.set(6 + prog * 32, (6 + prog * 32) * 1.4, 1)
      nukeMats[i].opacity = clamp(0.9 * (1 - prog * prog), 0, 1)
    }

    const hideFrom = (refs: (THREE.Object3D | null)[], from: number, max: number) => {
      for (let i = from; i < max; i++) if (refs[i]) refs[i]!.visible = false
    }
    hideFrom(jetRefs.current, cap.jets, MAX.jets)
    hideFrom(missileRefs.current, cap.missiles, MAX.missiles)
    hideFrom(tracerRefs.current, cap.tracers, MAX.tracers)
    hideFrom(droneRefs.current, cap.drones, MAX.drones)
    hideFrom(meteorRefs.current, cap.meteors, MAX.meteors)
    hideFrom(bombRefs.current, cap.skyBombs, MAX.skyBombs)
    hideFrom(burstRefs.current, cap.bursts, MAX.bursts)
    hideFrom(nukeRefs.current, cap.nukes, MAX.nukes)

    let trails = 0
    let smoke = 0
    for (let i = 0; i < cap.missiles; i++) if (missiles.current[i].life > 0) trails++
    for (let i = 0; i < cap.tracers; i++) if (tracers.current[i].life > 0) trails++
    for (let i = 0; i < cap.meteors; i++) if (meteors.current[i].life > 0) trails++
    for (let i = 0; i < cap.bursts; i++) if (bursts.current[i].life > 0) smoke++
    const limits = getCaps()
    perfState.counts.trails = Math.min(trails, limits.maxMissileTrails)
    perfState.counts.smoke = Math.min(smoke, limits.maxSmoke)
  })

  return (
    <group ref={root}>
      {drones.current.map((_, i) => (
        <group
          key={`dr-${i}`}
          ref={(el) => {
            droneRefs.current[i] = el
          }}
          scale={1.35}
          visible={false}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.28, 2.4, 6]} />
            <meshStandardMaterial color="#2b2f26" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0, -1.4]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.28, 0.9, 6]} />
            <meshStandardMaterial color="#1a1f18" />
          </mesh>
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.35, 1.5, 3]} />
            <meshStandardMaterial color="#3d4238" side={THREE.DoubleSide} />
          </mesh>
          <sprite position={[0, 0, 1.3]} scale={[0.9, 0.9, 1]}>
            <spriteMaterial
              map={glow}
              color={COLORS.explosionOrange}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        </group>
      ))}

      {jets.current.map((_, i) => (
        <group
          key={`jet-${i}`}
          ref={(el) => {
            jetRefs.current[i] = el
          }}
          scale={2.2}
          visible={false}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.32, 2.5, 6]} />
            <meshStandardMaterial color="#3a4049" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.6, 1.15, 3]} />
            <meshStandardMaterial color="#2d333b" side={THREE.DoubleSide} />
          </mesh>
          <sprite position={[0, 0, 1.6]} scale={[1.6, 1.6, 1]}>
            <spriteMaterial
              map={glow}
              color={COLORS.tealWake}
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
          <sprite position={[0, 0, 5.5]} scale={[2.2, 11, 1]}>
            <spriteMaterial
              map={glow}
              color="#e8eef5"
              transparent
              opacity={0.38}
              depthWrite={false}
            />
          </sprite>
        </group>
      ))}

      {missiles.current.map((_, i) => (
        <group
          key={`msl-${i}`}
          ref={(el) => {
            missileRefs.current[i] = el
          }}
          visible={false}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.14, 2.2, 6]} />
            <meshBasicMaterial color="#fde68a" />
          </mesh>
          <mesh position={[-2, 0, 0]}>
            <boxGeometry args={[4.5, 0.18, 0.18]} />
            <meshBasicMaterial color="#fb923c" transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <sprite position={[-3.5, 0, 0]} scale={[1.2, 0.5, 1]}>
            <spriteMaterial
              map={glow}
              color="#f97316"
              transparent
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              opacity={0.7}
            />
          </sprite>
        </group>
      ))}

      {tracers.current.map((_, i) => (
        <mesh
          key={`tr-${i}`}
          ref={(el) => {
            tracerRefs.current[i] = el
          }}
          visible={false}
        >
          <boxGeometry args={[22, 0.2, 0.2]} />
          <meshBasicMaterial
            color={COLORS.explosionOrange}
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
      ))}

      {meteors.current.map((_, i) => (
        <mesh
          key={`met-${i}`}
          ref={(el) => {
            meteorRefs.current[i] = el
          }}
          visible={false}
        >
          <boxGeometry args={[14, 0.16, 0.16]} />
          <meshBasicMaterial
            color={COLORS.supplyGold}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}

      {skyBombs.current.map((_, i) => (
        <group
          key={`bomb-${i}`}
          ref={(el) => {
            bombRefs.current[i] = el
          }}
          visible={false}
        >
          <mesh scale={1.2}>
            <cylinderGeometry args={[0.22, 0.32, 1.1, 8]} />
            <meshStandardMaterial
              color="#111827"
              emissive="#ef4444"
              emissiveIntensity={0.8}
              metalness={0.7}
            />
          </mesh>
          <sprite scale={[0.01, 0.01, 1]} material={bombFlashMats[i]} />
        </group>
      ))}

      {bursts.current.map((_, i) => (
        <sprite
          key={`burst-${i}`}
          ref={(el) => {
            burstRefs.current[i] = el
          }}
          visible={false}
          material={burstMats[i]}
        />
      ))}

      {nukes.current.map((_, i) => (
        <sprite
          key={`nuke-${i}`}
          ref={(el) => {
            nukeRefs.current[i] = el
          }}
          visible={false}
          material={nukeMats[i]}
        />
      ))}
    </group>
  )
}
