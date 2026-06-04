import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COLORS,
  SPAWN_AHEAD,
  DESPAWN_BEHIND,
  PICKUP_RADIUS,
  POWERUP_SPAWN_CHANCE,
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

const POOL = 18

const POWER_WEIGHTS: [PowerUpType, number][] = [
  ['shield', 4],
  ['repair', 4],
  ['magnet', 3],
  ['turbo', 3],
  ['radar', 2.5],
  ['minesweeper', 2],
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

const ORB_COLORS = Object.fromEntries(
  Object.entries(POWER_COLOR).map(([k, v]) => [k, new THREE.Color(v)]),
) as Record<PowerUpType, THREE.Color>

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
    const gold = new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: '#fde047',
      emissiveIntensity: 0.55,
      metalness: 0.35,
      roughness: 0.32,
    })
    const panel = new THREE.MeshStandardMaterial({
      color: '#ea580c',
      emissive: '#c2410c',
      emissiveIntensity: 0.2,
      roughness: 0.55,
    })
    const metal = new THREE.MeshStandardMaterial({
      color: '#374151',
      metalness: 0.7,
      roughness: 0.45,
    })
    const bolt = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#e2e8f0',
      emissiveIntensity: 0.35,
      metalness: 0.5,
      roughness: 0.35,
    })
    const stripe = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.8 })
    const waterRing = new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    })
    const shadowDisc = new THREE.MeshBasicMaterial({
      color: '#020617',
      transparent: true,
      opacity: 0.35,
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
    return { gold, panel, metal, bolt, stripe, waterRing, shadowDisc, sparkleMat }
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

  function tintOrb(idx: number, type: PowerUpType) {
    const c = ORB_COLORS[type]
    orb.current[idx]?.traverse((o) => {
      const m = (o as THREE.Mesh).material as
        | (THREE.Material & { color?: THREE.Color; emissive?: THREE.Color })
        | undefined
      if (m?.color) m.color.copy(c)
      if (m?.emissive) m.emissive.copy(c)
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
    p.phase = Math.random() * 10
    p.popUntil = 0
    if (kind === 'power') tintOrb(data.current.indexOf(p), p.type)
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
    if (Math.random() < 0.35 && activeSupplyCount() < cap) {
      spawn('supply', lane + rand(-1.2, 1.2), base - rand(4, 7))
    }
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
        spawn('supply', -2, runtime.player.z - 32)
        spawn('power', 0, runtime.player.z - 48, 'shield')
      }

      const pacing = supplyPacing(runtime.level)
      const burstCap = Math.min(pacing.burstMax, pacing.maxVisible, getCaps().maxSupplies)
      let placed = 0
      while (
        runtime.scriptedCrates.length > 0 &&
        placed < 2 &&
        activeSupplyCount() < burstCap
      ) {
        const c = runtime.scriptedCrates.shift()!
        spawn('supply', c.x, c.z)
        placed++
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
      }

      const surf = quickWaveAt(p.x, p.z, t)
      const bob = Math.sin(t * 1.8 + p.phase) * 0.22
      g.position.set(p.x, surf + 1.35 + bob, p.z)
      if (crate.current[i]) {
        crate.current[i]!.rotation.y += dt * 0.55
      }

      const pulse = 0.5 + Math.sin(t * 4.5 + p.phase) * 0.5

      if (isSupply && crate.current[i]) {
        const rim = crate.current[i]!.children[1] as THREE.Mesh | undefined
        if (rim) {
          rim.scale.setScalar(1.05 + pulse * 0.12)
          ;(rim.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.25
        }
        const outline = crate.current[i]!.children[12] as THREE.Mesh | undefined
        if (outline) {
          ;(outline.material as THREE.MeshBasicMaterial).opacity = 0.4 + pulse * 0.35
        }
        if (perfState.tier !== 'mobile') {
          for (let s = 13; s <= 15; s++) {
            const sp = crate.current[i]!.children[s] as THREE.Sprite | undefined
            if (sp) {
              sp.visible = pulse > 0.72
              sp.scale.setScalar(0.35 + pulse * 0.25)
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
          <group
            ref={(el) => {
              crate.current[i] = el
            }}
            visible={false}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
              <circleGeometry args={[1.5, perfState.tier === 'mobile' ? 12 : 24]} />
              <primitive object={mats.shadowDisc} attach="material" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[1.05, 1.28, perfState.tier === 'mobile' ? 14 : 28]} />
              <primitive object={mats.waterRing} attach="material" />
            </mesh>
            <mesh material={mats.gold}>
              <boxGeometry args={[1.85, 1.85, 1.85]} />
            </mesh>
            {(
              [
                [-0.95, 0.95, 0.95],
                [0.95, 0.95, 0.95],
                [-0.95, 0.95, -0.95],
                [0.95, 0.95, -0.95],
              ] as const
            ).map((pos, j) => (
              <mesh key={`c-${j}`} position={[...pos]} material={mats.metal}>
                <boxGeometry args={[0.28, 0.28, 0.28]} />
              </mesh>
            ))}
            <mesh position={[0, 0.2, 0]} material={mats.panel}>
              <boxGeometry args={[1.95, 0.38, 1.55]} />
            </mesh>
            <mesh position={[0, -0.15, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.panel}>
              <boxGeometry args={[1.95, 0.32, 1.45]} />
            </mesh>
            <mesh position={[0, 0.55, 0.93]} material={mats.stripe}>
              <boxGeometry args={[1.2, 0.14, 0.08]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={mats.bolt}>
              <boxGeometry args={[0.12, 0.55, 0.12]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.bolt}>
              <boxGeometry args={[0.12, 0.55, 0.12]} />
            </mesh>
            <mesh scale={[1.05, 1.05, 1.05]}>
              <boxGeometry args={[1.85, 1.85, 1.85]} />
              <meshBasicMaterial
                color="#22d3ee"
                transparent
                opacity={0.5}
                side={THREE.BackSide}
                depthWrite={false}
              />
            </mesh>
            {(
              [
                [0.9, 1.1, 0.4],
                [-0.85, 1.25, -0.5],
                [0.3, 1.35, -0.75],
              ] as const
            ).map((pos, j) => (
              <sprite key={`sp-${j}`} position={[...pos]} scale={[0.4, 0.4, 1]} visible={false}>
                <primitive object={mats.sparkleMat} attach="material" />
              </sprite>
            ))}
          </group>

          <group
            ref={(el) => {
              orb.current[i] = el
            }}
            visible={false}
          >
            <mesh>
              <icosahedronGeometry args={[0.72, 0]} />
              <meshStandardMaterial
                color="#3b82f6"
                emissive="#3b82f6"
                emissiveIntensity={1.2}
                metalness={0.45}
                roughness={0.15}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2.4, 0, 0]}>
              <torusGeometry args={[1.05, 0.1, 8, 24]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.4} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
              <ringGeometry args={[1.05, 1.3, 28]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.65} depthWrite={false} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  )
}
