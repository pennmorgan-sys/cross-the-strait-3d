import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  COLORS,
  SPAWN_AHEAD,
  DESPAWN_BEHIND,
  PICKUP_RADIUS,
  POWERUP_SPAWN_CHANCE,
  MAX_ACTIVE,
} from '../constants'
import {
  runtime,
  isSlow,
  magnetActive,
  collectSupply,
  setPowerUp,
} from '../runtime'
import { supplyPacing } from '../levels'
import { quickWaveAt } from '../waves'
import { clamp, damp, rand } from '../systems/math'
import { getCaps, perfState } from '../systems/performance'
import { glowTexture } from '../systems/glow'
import type { PowerUpType } from '../types'

const POOL = MAX_ACTIVE.SUPPLIES + 2

/* ── bright yellow supply crate that a new player immediately reads as helpful ── */
const CRATE_BODY_COLOR = '#fbbf24'
const CRATE_CORNER_COLOR = '#1e293b'
const CRATE_ICON_COLOR = '#ffffff'
const CRATE_OUTLINE_COLOR = '#22d3ee'

/* ── reusable geometries ── */
const CRATE_GEO = new THREE.BoxGeometry(1.9, 1.15, 1.9)
const CORNER_GEO = new THREE.BoxGeometry(0.28, 0.28, 0.28)
const PLUS_H_GEO = new THREE.BoxGeometry(1.05, 0.22, 0.06)
const PLUS_V_GEO = new THREE.BoxGeometry(0.22, 1.05, 0.06)

const ORB_GEO = new THREE.IcosahedronGeometry(0.72, 0)
const ORB_RING_GEO = new THREE.TorusGeometry(1.05, 0.1, 8, 24)
const ORB_HALO_GEO = new THREE.RingGeometry(1.05, 1.3, 28)

const POWER_WEIGHTS: [PowerUpType, number][] = [
  ['shield', 4],
  ['repair', 4],
  ['magnet', 3],
  ['turbo', 3],
  ['radar', 2.5],
  ['slow', 2],
  ['emp', 1.5],
]

const POWER_COLOR: Record<PowerUpType, string> = {
  shield: '#3b82f6',
  repair: COLORS.radarGreen,
  turbo: COLORS.tealWake,
  slow: COLORS.stormPurple,
  magnet: COLORS.supplyGold,
  radar: '#16a34a',
  minesweeper: '#22d3ee',
  emp: '#f59e0b',
}

function createMat(color: string, emissive: string, metalness = 0, roughness = 0.5) {
  return new THREE.MeshStandardMaterial({ color, emissive: emissive || color, emissiveIntensity: 0.5, metalness, roughness })
}

function createBasic(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
}

function pickPowerType(): PowerUpType {
  let roll = Math.random() * POWER_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  for (const [type, w] of POWER_WEIGHTS) {
    roll -= w
    if (roll <= 0) return type
  }
  return 'shield'
}

interface Pickup {
  state: 'idle' | 'active' | 'popping'
  kind: 'supply' | 'power'
  type: PowerUpType
  x: number
  z: number
  driftX: number
  driftZ: number
  phase: number
  popUntil: number
}

export default function Pickups() {
  const data = useRef<Pickup[]>(
    Array.from({ length: POOL }, () => ({
      state: 'idle' as const,
      kind: 'supply' as const,
      type: 'shield' as PowerUpType,
      x: 0,
      z: 0,
      driftX: 0,
      driftZ: 0,
      phase: 0,
      popUntil: 0,
    })),
  )
  const grp = useRef<(THREE.Group | null)[]>([])
  const crate = useRef<(THREE.Group | null)[]>([])
  const orb = useRef<(THREE.Group | null)[]>([])

  const lastSupplySpawnZ = useRef(0)
  const seeded = useRef(false)
  const slots = useMemo(() => Array.from({ length: POOL }, (_, i) => i), [])

  const mats = useMemo(() => {
    const body = createMat(CRATE_BODY_COLOR, '#fde047', 0.22, 0.26)
    const corner = createMat(CRATE_CORNER_COLOR, '#0f172a', 0.82, 0.34)
    const iconWhite = createMat(CRATE_ICON_COLOR, '#fefefe', 0.05, 0.12)
    iconWhite.emissiveIntensity = 0.7

    const waterRing = createBasic('#fbbf24', 0.72)
    const shadowDisc = createBasic('#020617', 0.32)
    const outlineMat = new THREE.MeshBasicMaterial({
      color: CRATE_OUTLINE_COLOR,
      transparent: true,
      opacity: 0.52,
      side: THREE.BackSide,
      depthWrite: false,
    })
    const sparkleMat = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: '#fef9c3',
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    })
    return { body, corner, iconWhite, waterRing, shadowDisc, outlineMat, sparkleMat }
  }, [])

  function activeCount() {
    let n = 0
    for (const p of data.current) if (p.state !== 'idle') n++
    return n
  }

  function activeSupplyCount() {
    let n = 0
    for (const p of data.current) {
      if (p.state !== 'idle' && p.kind === 'supply') n++
    }
    return n
  }

  function setOrbColor(idx: number, type: PowerUpType) {
    const hex = POWER_COLOR[type]
    orb.current[idx]?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && m.color) {
        m.color.set(hex)
        if (m.emissive) m.emissive.set(hex)
      }
      const bm = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
      if (bm && bm.color) bm.color.set(hex)
    })
  }

  function spawn(
    kind: 'supply' | 'power',
    x: number,
    z: number,
    powerType?: PowerUpType,
  ) {
    const pacing = supplyPacing(runtime.level)
    const cap = Math.min(getCaps().maxSupplies, pacing.maxVisible)
    if (kind === 'supply' && activeSupplyCount() >= cap) return
    if (activeCount() >= getCaps().maxSupplies) return
    const p = data.current.find((d) => d.state === 'idle')
    if (!p) return
    p.state = 'active'
    p.kind = kind
    p.type = kind === 'power' ? (powerType ?? pickPowerType()) : 'shield'
    p.x = clamp(x, -8, 8)
    p.z = z
    p.driftX = rand(-0.14, 0.14)
    p.driftZ = kind === 'supply' ? rand(0.5, 1.05) : rand(0.18, 0.4)
    p.phase = Math.random() * 10
    p.popUntil = 0
    if (kind === 'power') setOrbColor(data.current.indexOf(p), p.type)
  }

  function trySpawnSupplyWave() {
    const pacing = supplyPacing(runtime.level)
    const cap = Math.min(getCaps().maxSupplies, pacing.maxVisible)
    if (activeSupplyCount() >= cap) return
    const dist = runtime.forwardSpeed * pacing.intervalSec
    if (runtime.player.z >= lastSupplySpawnZ.current - dist) return

    lastSupplySpawnZ.current = runtime.player.z
    const base = runtime.player.z - SPAWN_AHEAD

    if (Math.random() < POWERUP_SPAWN_CHANCE) {
      spawn('power', rand(-6, 6), base, pickPowerType())
      return
    }

    const lane = rand(-5, 5)
    spawn('supply', lane, base)
  }

  useFrame((state, rawDt) => {
    const active = runtime.simActive
    const t = state.clock.elapsedTime
    const slow = isSlow() ? 0.4 : 1
    const dt = Math.min(rawDt, 0.05) * slow

    if (active) {
      if (!seeded.current) {
        seeded.current = true
        lastSupplySpawnZ.current = runtime.player.z
        spawn('supply', -2, runtime.player.z - 42)
        spawn('power', 0, runtime.player.z - 48, 'shield')
      }

      const pacing = supplyPacing(runtime.level)
      const burstCap = Math.min(pacing.burstMax, pacing.maxVisible, getCaps().maxSupplies)
      let placed = 0
      while (
        runtime.scriptedCrates.length > 0 &&
        placed < 1 &&
        activeSupplyCount() < burstCap
      ) {
        const c = runtime.scriptedCrates.shift()!
        spawn('supply', c.x, c.z)
        placed++
      }
      if (activeSupplyCount() >= burstCap || placed >= 1) {
        runtime.scriptedCrates = []
      }

      trySpawnSupplyWave()
    } else if (!runtime.simActive && !runtime.running) {
      seeded.current = false
    }

    const magnet = magnetActive()

    for (let i = 0; i < POOL; i++) {
      const p = data.current[i]
      const g = grp.current[i]
      if (!g) continue
      const isSupply = p.kind === 'supply'
      if (crate.current[i]) crate.current[i]!.visible = p.state !== 'idle' && isSupply
      if (orb.current[i]) orb.current[i]!.visible = p.state !== 'idle' && !isSupply

      if (p.state === 'idle') {
        g.visible = false
        continue
      }
      g.visible = true

      if (p.state === 'popping') {
        const u = clamp((p.popUntil - t) / 0.28, 0, 1)
        const pop = 1 + (1 - u) * 0.45
        g.scale.setScalar(pop)
        if (t >= p.popUntil) {
          p.state = 'idle'
          g.scale.setScalar(1)
        }
        continue
      }

      if (magnet && isSupply && active) {
        const d = Math.hypot(runtime.player.x - p.x, runtime.player.z - p.z)
        if (d < 16) {
          p.x = THREE.MathUtils.lerp(p.x, runtime.player.x, damp(4, dt))
          p.z = THREE.MathUtils.lerp(p.z, runtime.player.z, damp(4, dt))
        }
      } else if (active) {
        p.x = clamp(p.x + Math.sin(t * 0.8 + p.phase) * p.driftX * dt, -8, 8)
        p.z += p.driftZ * dt
      }

      const surf = quickWaveAt(p.x, p.z, t)
      const bob = Math.sin(t * 1.45 + p.phase) * 0.08
      g.position.set(p.x, surf + (isSupply ? 0.7 : 1.05) + bob, p.z)
      if (crate.current[i]) {
        crate.current[i]!.rotation.y += dt * 0.18
        crate.current[i]!.rotation.z = Math.sin(t * 1.1 + p.phase) * 0.03
      }

      const pulse = 0.5 + Math.sin(t * 4.5 + p.phase) * 0.5

      if (isSupply && crate.current[i]) {
        const ring = crate.current[i]!.children[1] as THREE.Mesh | undefined
        if (ring) {
          ring.scale.setScalar(1.04 + pulse * 0.1)
          ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.28
        }
        const outline = crate.current[i]!.children[9] as THREE.Mesh | undefined
        if (outline) {
          ;(outline.material as THREE.MeshBasicMaterial).opacity = 0.35 + pulse * 0.35
        }
        if (perfState.tier === 'high') {
          for (let s = 10; s <= 12; s++) {
            const sp = crate.current[i]!.children[s] as THREE.Sprite | undefined
            if (sp) {
              sp.visible = pulse > 0.78
              sp.scale.setScalar(0.32 + pulse * 0.22)
            }
          }
        }
      }

      if (p.z > runtime.player.z + DESPAWN_BEHIND) {
        p.state = 'idle'
        g.scale.setScalar(1)
        continue
      }

      if (!active) continue

      const dx = runtime.player.x - p.x
      const dz = runtime.player.z - p.z
      if (Math.hypot(dx, dz) < PICKUP_RADIUS) {
        if (isSupply) {
          collectSupply()
          p.state = 'popping'
          p.popUntil = t + 0.28
        } else {
          setPowerUp(p.type)
          p.state = 'idle'
        }
      }
    }
    perfState.counts.supplies = activeSupplyCount()
  })

  return (
    <>
      {slots.map((i) => (
        <group
          key={i}
          ref={(el) => {
            grp.current[i] = el
          }}
          visible={false}
        >
          {/* SUPPLY CRATE — bright yellow body, dark metal corners, white cross icon */}
          <group
            ref={(el) => {
              crate.current[i] = el
            }}
            visible={false}
          >
            {/* shadow disc on water */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
              <circleGeometry args={[1.5, perfState.tier === 'mobile' ? 12 : 24]} />
              <primitive object={mats.shadowDisc} attach="material" />
            </mesh>
            {/* water ripple ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[1.05, 1.28, perfState.tier === 'mobile' ? 14 : 28]} />
              <primitive object={mats.waterRing} attach="material" />
            </mesh>
            {/* main body */}
            <mesh geometry={CRATE_GEO} material={mats.body} />
            {/* dark metal corner protectors */}
            {(
              [[-0.9, 0.56, 0.9], [0.9, 0.56, 0.9], [-0.9, 0.56, -0.9], [0.9, 0.56, -0.9]] as const
            ).map((pos, j) => (
              <mesh key={`corner-${j}`} position={[...pos]} geometry={CORNER_GEO} material={mats.corner} />
            ))}
            {/* white cross/plus icon on front face */}
            <mesh position={[0, 0.02, 0.96]} geometry={PLUS_H_GEO} material={mats.iconWhite} />
            <mesh position={[0, 0.02, 0.96]} geometry={PLUS_V_GEO} material={mats.iconWhite} />
            {/* teal outline rim */}
            <mesh position={[0, 0.02, 0.02]} scale={[1.03, 1.03, 1.02]} geometry={CRATE_GEO} material={mats.outlineMat} />
            {/* sparkles */}
            {(
              [[0.9, 1.1, 0.4], [-0.85, 1.25, -0.5], [0.3, 1.35, -0.75]] as const
            ).map((pos, j) => (
              <sprite key={`spkr-${j}`} position={[...pos]} scale={[0.4, 0.4, 1]} visible={false}>
                <primitive object={mats.sparkleMat} attach="material" />
              </sprite>
            ))}
            <Text
              position={[0, 0.66, 0.98]}
              rotation={[-0.18, 0, 0]}
              fontSize={0.23}
              letterSpacing={0.05}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.025}
              outlineColor="#0f172a"
            >
              SUPPLY
            </Text>
          </group>

          {/* POWER-UP ORB */}
          <group
            ref={(el) => {
              orb.current[i] = el
            }}
            visible={false}
          >
            <mesh geometry={ORB_GEO}>
              <meshStandardMaterial
                color="#3b82f6"
                emissive="#3b82f6"
                emissiveIntensity={1.2}
                metalness={0.45}
                roughness={0.15}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2.4, 0, 0]} geometry={ORB_RING_GEO}>
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.4} />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.4, 0]}
              geometry={ORB_HALO_GEO}
            >
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.65} depthWrite={false} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  )
}
