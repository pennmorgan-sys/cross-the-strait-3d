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
import { quickWaveAt } from '../waves'
import { clamp, damp, rand } from '../systems/math'
import { getCaps, perfState } from '../systems/performance'
import { glowTexture } from '../systems/glow'
import type { PowerUpType } from '../types'

const POOL = 32

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

function pickPowerType(): PowerUpType {
  let roll = Math.random() * POWER_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  for (const [type, w] of POWER_WEIGHTS) {
    roll -= w
    if (roll <= 0) return type
  }
  return 'shield'
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

  function tintOrb(idx: number, type: PowerUpType) {
    const c = new THREE.Color(POWER_COLOR[type])
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
    if (activeCount() >= getCaps().maxSupplies) return
    const p = data.current.find((d) => d.state === 'idle')
    if (!p) return
    p.state = 'active'
    p.kind = kind
    p.type = kind === 'power' ? (powerType ?? pickPowerType()) : 'shield'
    p.x = clamp(x, -8, 8)
    p.z = z
    p.phase = Math.random() * 10
    if (kind === 'power') tintOrb(data.current.indexOf(p), p.type)
  }

  function spawnSupplyTrail(lane: number, baseZ: number) {
    spawn('supply', lane, baseZ)
    spawn('supply', lane + rand(-0.8, 0.8), baseZ - 3.5)
    spawn('supply', lane, baseZ - 7)
    if (Math.random() < 0.9) spawn('supply', lane, baseZ - 10.5)
    if (Math.random() < 0.75) spawn('supply', lane, baseZ - 14)
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
        spawnSupplyTrail(-2.5, runtime.player.z - 22)
        spawnSupplyTrail(2.5, runtime.player.z - 30)
        spawn('power', 0, runtime.player.z - 48, 'shield')
        spawn('power', 5, runtime.player.z - 56, 'repair')
      }
      while (runtime.scriptedCrates.length > 0) {
        const c = runtime.scriptedCrates.shift()!
        spawn('supply', c.x, c.z)
      }
      if (runtime.player.z < lastSpawnZ.current - rand(6, 11)) {
        lastSpawnZ.current = runtime.player.z
        const base = runtime.player.z - SPAWN_AHEAD
        const lane = rand(-6, 6)
        if (Math.random() < POWERUP_SPAWN_CHANCE) {
          spawn('power', rand(-7, 7), base, pickPowerType())
          if (Math.random() < 0.35) {
            spawn('power', rand(-5, 5), base - rand(5, 9), pickPowerType())
          }
        } else {
          spawnSupplyTrail(lane, base)
        }
        if (Math.random() < 0.42) {
          spawn('supply', rand(-7, 7), base - rand(3, 8))
        }
      }
    } else if (!runtime.simActive && !runtime.running) {
      seeded.current = false
    }

    const magnet = magnetActive()
    const caps = getCaps()
    const lightMul = caps.pickupLights ? 1 : 0.65

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

      if (magnet && isSupply && active) {
        const d = Math.hypot(runtime.player.x - p.x, runtime.player.z - p.z)
        if (d < 18) {
          p.x = THREE.MathUtils.lerp(p.x, runtime.player.x, damp(5, dt))
          p.z = THREE.MathUtils.lerp(p.z, runtime.player.z, damp(5, dt))
        }
      }

      const surf = quickWaveAt(p.x, p.z, t)
      const bob = Math.sin(t * 2.2 + p.phase) * 0.35
      g.position.set(p.x, surf + 1.55 + bob, p.z)
      g.rotation.y = p.phase + t * 1.4

      const pulse = 0.5 + Math.sin(t * 5 + p.phase) * 0.5
      const marker = g.children[0] as THREE.Mesh | undefined
      if (marker) {
        marker.position.y = surf + 0.12
        marker.rotation.x = -Math.PI / 2
        marker.scale.setScalar(1.15 + pulse * 0.35)
        const mm = marker.material as THREE.MeshBasicMaterial
        mm.color.set(isSupply ? '#fde047' : POWER_COLOR[p.type])
        mm.opacity = 0.72 + pulse * 0.28
      }

      if (isSupply) {
        const box = crate.current[i]?.children[0] as THREE.Mesh | undefined
        const m = box?.material as THREE.MeshStandardMaterial | undefined
        if (m) m.emissiveIntensity = 0.85 + pulse * 1.1
        const beam = crate.current[i]?.children[5] as THREE.Mesh | undefined
        if (beam) {
          beam.scale.set(1.2, 1.1 + pulse * 0.85, 1.2)
          ;(beam.material as THREE.MeshBasicMaterial).opacity = 0.42 + pulse * 0.4
        }
        const ring = crate.current[i]?.children[6] as THREE.Mesh | undefined
        if (ring) ring.scale.setScalar(1.2 + pulse * 0.35)
        const beacon = crate.current[i]?.children[7] as THREE.Sprite | undefined
        if (beacon) {
          beacon.position.y = 3.4 + pulse * 0.5
          beacon.scale.setScalar(5.5 + pulse * 2.2)
          ;(beacon.material as THREE.SpriteMaterial).opacity = 0.75 + pulse * 0.25
        }
      } else {
        const halo = orb.current[i]?.children[4] as THREE.Mesh | undefined
        if (halo) halo.scale.setScalar(1.25 + pulse * 0.55)
        const ring = orb.current[i]?.children[5] as THREE.Mesh | undefined
        if (ring) ring.scale.setScalar(1.1 + pulse * 0.35)
      }

      if (p.z > runtime.player.z + DESPAWN_BEHIND) {
        p.state = 'idle'
        continue
      }

      if (!active) continue

      const setLight = (root: THREE.Group | null, color: string, intensity: number) => {
        const light = root?.children.find((c) => c instanceof THREE.PointLight) as
          | THREE.PointLight
          | undefined
        if (light) {
          light.visible = true
          light.color.set(color)
          light.intensity = intensity * lightMul
        }
      }
      setLight(crate.current[i], COLORS.supplyGold, 3.2)
      setLight(orb.current[i], POWER_COLOR[p.type], 3)

      const dx = runtime.player.x - p.x
      const dz = runtime.player.z - p.z
      if (Math.hypot(dx, dz) < PICKUP_RADIUS) {
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
          <mesh>
            <ringGeometry args={[1.65, 2.05, 36]} />
            <meshBasicMaterial
              color="#fde047"
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>

          <group
            ref={(el) => {
              crate.current[i] = el
            }}
            visible={false}
          >
            <mesh>
              <boxGeometry args={[2.05, 2.05, 2.05]} />
              <meshStandardMaterial
                color="#facc15"
                emissive="#fde047"
                emissiveIntensity={1.1}
                metalness={0.3}
                roughness={0.28}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[2.2, 0.5, 0.5]} />
              <meshStandardMaterial color="#eab308" emissive="#fde047" emissiveIntensity={0.55} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[2.2, 0.5, 0.5]} />
              <meshStandardMaterial color="#eab308" emissive="#fde047" emissiveIntensity={0.55} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <boxGeometry args={[0.65, 0.65, 0.65]} />
              <meshStandardMaterial color="#fffbeb" emissive="#fef08a" emissiveIntensity={1.6} />
            </mesh>
            <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.35, 1.75, 36]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.95} depthWrite={false} />
            </mesh>
            <mesh position={[0, 3.6, 0]}>
              <cylinderGeometry args={[0.35, 1.35, 6.5, 14]} />
              <meshBasicMaterial color="#fde047" transparent opacity={0.5} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.05, 0]}>
              <ringGeometry args={[1.25, 1.65, 36]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={0.95} depthWrite={false} />
            </mesh>
            <sprite position={[0, 3.2, 0]} scale={[4, 4, 1]}>
              <spriteMaterial
                map={glowTexture()}
                color="#fde047"
                transparent
                opacity={0.9}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
            <pointLight color="#fde047" intensity={3.2} distance={22} />
          </group>

          <group
            ref={(el) => {
              orb.current[i] = el
            }}
            visible={false}
          >
            <mesh>
              <icosahedronGeometry args={[0.95, 0]} />
              <meshStandardMaterial
                color="#3b82f6"
                emissive="#3b82f6"
                emissiveIntensity={1.6}
                metalness={0.45}
                roughness={0.12}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2.4, 0, 0]}>
              <torusGeometry args={[1.35, 0.14, 8, 32]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.8} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.55, 0.08, 6, 36]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.65} depthWrite={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[1.35, 16, 16]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.38} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
              <ringGeometry args={[1.35, 1.7, 36]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.85} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[1.5, 1.9, 36]} />
              <meshBasicMaterial color="#93c5fd" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <pointLight color="#60a5fa" intensity={3} distance={20} />
          </group>
        </group>
      ))}
    </>
  )
}
