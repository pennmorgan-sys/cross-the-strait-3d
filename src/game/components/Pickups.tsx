import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS, SPAWN_AHEAD, DESPAWN_BEHIND } from '../constants'
import {
  runtime,
  isSlow,
  magnetActive,
  collectSupply,
  setPowerUp,
} from '../runtime'
import { quickWaveAt } from '../waves'
import { clamp, damp, rand, pick } from '../systems/math'
import { getCaps, perfState } from '../systems/performance'
import type { PowerUpType } from '../types'

const POOL = 28
const PICK_RADIUS = 3.8

const POWER_TYPES: PowerUpType[] = [
  'shield',
  'repair',
  'turbo',
  'slow',
  'magnet',
  'radar',
  'minesweeper',
  'emp',
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

interface Pickup {
  state: 'idle' | 'active'
  kind: 'supply' | 'power'
  type: PowerUpType
  x: number
  z: number
  phase: number
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
    })),
  )
  const grp = useRef<(THREE.Group | null)[]>([])
  const crate = useRef<(THREE.Group | null)[]>([])
  const orb = useRef<(THREE.Group | null)[]>([])

  const lastSpawnZ = useRef(0)
  const seeded = useRef(false)
  const slots = useMemo(() => Array.from({ length: POOL }, (_, i) => i), [])

  function activeCount() {
    let n = 0
    for (const p of data.current) if (p.state === 'active') n++
    return n
  }

  function spawn(kind: 'supply' | 'power', x: number, z: number) {
    if (activeCount() >= getCaps().maxSupplies) return
    const p = data.current.find((d) => d.state === 'idle')
    if (!p) return
    p.state = 'active'
    p.kind = kind
    p.type = pick(POWER_TYPES)
    p.x = clamp(x, -8, 8)
    p.z = z
    p.phase = Math.random() * 10
    const idx = data.current.indexOf(p)
    if (kind === 'power' && orb.current[idx]) {
      const c = new THREE.Color(POWER_COLOR[p.type])
      orb.current[idx]!.traverse((o) => {
        const m = (o as THREE.Mesh).material as
          | (THREE.Material & { color?: THREE.Color; emissive?: THREE.Color })
          | undefined
        if (m?.color) m.color.copy(c)
        if (m?.emissive) m.emissive.copy(c)
      })
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
        lastSpawnZ.current = runtime.player.z
        spawn('supply', -2, runtime.player.z - 24)
        spawn('supply', 0, runtime.player.z - 28)
        spawn('supply', 2, runtime.player.z - 32)
        spawn('power', 4, runtime.player.z - 52)
      }
      while (runtime.scriptedCrates.length > 0) {
        const c = runtime.scriptedCrates.shift()!
        spawn('supply', c.x, c.z)
      }
      if (runtime.player.z < lastSpawnZ.current - rand(9, 17)) {
        lastSpawnZ.current = runtime.player.z
        const isPower = Math.random() < 0.25
        if (isPower) spawn('power', rand(-7, 7), runtime.player.z - SPAWN_AHEAD)
        else {
          // coin-like crate trails
          const lane = rand(-6, 6)
          const base = runtime.player.z - SPAWN_AHEAD
          spawn('supply', lane, base)
          spawn('supply', lane, base - 4)
          if (Math.random() < 0.8) spawn('supply', lane, base - 8)
          if (Math.random() < 0.65) spawn('supply', lane, base - 12)
        }
      }
    } else if (!runtime.simActive && !runtime.running) {
      seeded.current = false
    }

    const magnet = magnetActive()

    for (let i = 0; i < POOL; i++) {
      const p = data.current[i]
      const g = grp.current[i]
      if (!g) continue
      const isSupply = p.kind === 'supply'
      if (crate.current[i]) crate.current[i]!.visible = p.state === 'active' && isSupply
      if (orb.current[i]) orb.current[i]!.visible = p.state === 'active' && !isSupply

      if (p.state !== 'active') {
        g.visible = false
        continue
      }
      g.visible = true

      // Magnet pulls supply crates toward the player.
      if (magnet && isSupply && active) {
        const d = Math.hypot(runtime.player.x - p.x, runtime.player.z - p.z)
        if (d < 14) {
          p.x = THREE.MathUtils.lerp(p.x, runtime.player.x, damp(4, dt))
          p.z = THREE.MathUtils.lerp(p.z, runtime.player.z, damp(4, dt))
        }
      }

      const surf = quickWaveAt(p.x, p.z, t)
      const bob = Math.sin(t * 2 + p.phase) * 0.28
      g.position.set(p.x, surf + 1.35 + bob, p.z)
      g.rotation.y = p.phase + t * 1.5

      const pulse = 0.5 + Math.sin(t * 5 + p.phase) * 0.5
      const marker = g.children[0] as THREE.Mesh | undefined
      if (marker) {
        marker.position.y = surf + 0.14
        marker.rotation.x = -Math.PI / 2
        marker.scale.setScalar(1 + pulse * 0.22)
        const mm = marker.material as THREE.MeshBasicMaterial
        mm.color.set(isSupply ? COLORS.supplyGold : POWER_COLOR[p.type])
        mm.opacity = 0.55 + pulse * 0.35
      }

      if (isSupply) {
        const box = crate.current[i]?.children[0] as THREE.Mesh | undefined
        const m = box?.material as THREE.MeshStandardMaterial | undefined
        if (m) m.emissiveIntensity = 0.55 + pulse * 0.95
        const beam = crate.current[i]?.children[4] as THREE.Mesh | undefined
        if (beam) {
          beam.scale.set(1.15, 1 + pulse * 0.65, 1.15)
          ;(beam.material as THREE.MeshBasicMaterial).opacity = 0.28 + pulse * 0.35
        }
        const ring = crate.current[i]?.children[5] as THREE.Mesh | undefined
        if (ring) ring.scale.setScalar(1.1 + pulse * 0.25)
      } else {
        const halo = orb.current[i]?.children[3] as THREE.Mesh | undefined
        if (halo) halo.scale.setScalar(1.15 + pulse * 0.45)
        const ring = orb.current[i]?.children[4] as THREE.Mesh | undefined
        if (ring) ring.scale.setScalar(1 + pulse * 0.3)
      }

      if (p.z > runtime.player.z + DESPAWN_BEHIND) {
        p.state = 'idle'
        continue
      }

      if (!active) continue

      const caps = getCaps()
      if (crate.current[i]) {
        const light = crate.current[i]!.children.find(
          (c) => c instanceof THREE.PointLight,
        ) as THREE.PointLight | undefined
        if (light) light.visible = caps.pickupLights
      }
      if (orb.current[i]) {
        const light = orb.current[i]!.children.find(
          (c) => c instanceof THREE.PointLight,
        ) as THREE.PointLight | undefined
        if (light) light.visible = caps.pickupLights
      }

      const dx = runtime.player.x - p.x
      const dz = runtime.player.z - p.z
      if (Math.hypot(dx, dz) < PICK_RADIUS) {
        p.state = 'idle'
        if (isSupply) collectSupply()
        else setPowerUp(p.type)
      }
    }
    perfState.counts.supplies = activeCount()
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
          {/* Water-level marker — easy to spot from chase cam */}
          <mesh>
            <ringGeometry args={[1.35, 1.65, 32]} />
            <meshBasicMaterial
              color={COLORS.supplyGold}
              transparent
              opacity={0.7}
              depthWrite={false}
            />
          </mesh>

          {/* Supply crate */}
          <group
            ref={(el) => {
              crate.current[i] = el
            }}
            visible={false}
          >
            <mesh>
              <boxGeometry args={[1.55, 1.55, 1.55]} />
              <meshStandardMaterial
                color={COLORS.supplyGold}
                emissive={COLORS.supplyGold}
                emissiveIntensity={0.75}
                metalness={0.35}
                roughness={0.35}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[1.65, 0.42, 0.42]} />
              <meshStandardMaterial color="#ca8a04" emissive="#eab308" emissiveIntensity={0.25} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[1.65, 0.42, 0.42]} />
              <meshStandardMaterial color="#ca8a04" emissive="#eab308" emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0.95, 0]}>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, 3.2, 0]}>
              <cylinderGeometry args={[0.28, 1.1, 5.2, 12]} />
              <meshBasicMaterial color={COLORS.supplyGold} transparent opacity={0.38} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.85, 0]}>
              <ringGeometry args={[1, 1.28, 28]} />
              <meshBasicMaterial color="#fde047" transparent opacity={0.85} depthWrite={false} />
            </mesh>
            <pointLight color={COLORS.supplyGold} intensity={2.2} distance={14} />
          </group>

          {/* Power-up orb (color set on spawn) */}
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
                emissiveIntensity={1.35}
                metalness={0.45}
                roughness={0.15}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2.4, 0, 0]}>
              <torusGeometry args={[1.05, 0.1, 8, 28]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.6} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.25, 0.06, 6, 32]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[1.05, 14, 14]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.32} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
              <ringGeometry args={[1.1, 1.38, 32]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.75} depthWrite={false} />
            </mesh>
            <pointLight color="#60a5fa" intensity={2.5} distance={16} />
          </group>
        </group>
      ))}
    </>
  )
}
