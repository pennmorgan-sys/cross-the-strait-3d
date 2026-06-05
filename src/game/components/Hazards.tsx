import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  COLORS,
  SPAWN_AHEAD,
  DESPAWN_BEHIND,
  NEAR_MISS_DIST,
  MINE_SPAWN_MULT,
  STRAIT_HALF_WIDTH,
  TANKER_HALF_W,
  TANKER_HALF_L,
  MAX_ACTIVE,
} from '../constants'
import { runtime, damage, applyOil, nearMiss, minesweeperActive } from '../runtime'
import { quickWaveAt } from '../waves'
import { clamp, rand, damp } from '../systems/math'
import { getCaps, perfState } from '../systems/performance'
import type { ObstacleKind } from '../types'

const POOL = MAX_ACTIVE.HAZARDS + 2

interface Hazard {
  state: 'idle' | 'active'
  kind: ObstacleKind
  x: number
  z: number
  baseX: number
  phase: number
  hit: boolean
  missed: boolean
  launched: boolean
}

interface KindSpec {
  w: number
  l: number
  clear: number
  dmg: number
}

const SPEC: Record<ObstacleKind, KindSpec> = {
  mine: { w: 1.3, l: 1.3, clear: 2.4, dmg: 2 },
  patrol: { w: 1.7, l: 2.6, clear: 2.5, dmg: 1 },
  cargo: { w: 4.6, l: 7, clear: 7.2, dmg: 1 },
  debris: { w: 1.1, l: 1.1, clear: 1.7, dmg: 1 },
  oil: { w: 3, l: 3, clear: -1, dmg: 0 },
}

const KINDS: ObstacleKind[] = ['mine', 'patrol', 'cargo', 'debris', 'oil']

export default function Hazards() {
  const data = useRef<Hazard[]>(
    Array.from({ length: POOL }, () => ({
      state: 'idle' as const,
      kind: 'debris' as ObstacleKind,
      x: 0,
      z: 0,
      baseX: 0,
      phase: 0,
      hit: false,
      missed: false,
      launched: false,
    })),
  )
  const grp = useRef<(THREE.Group | null)[]>([])
  const sub = useRef<Record<ObstacleKind, (THREE.Group | null)[]>>({
    mine: [],
    patrol: [],
    cargo: [],
    debris: [],
    oil: [],
  })

  const lastSpawnZ = useRef(0)
  const seeded = useRef(false)
  const slots = useMemo(() => Array.from({ length: POOL }, (_, i) => i), [])
  const liteHazards = perfState.tier === 'mobile'

  function freeSlot() {
    return data.current.find((h) => h.state === 'idle')
  }

  function activeCount() {
    let n = 0
    for (const h of data.current) if (h.state === 'active') n++
    return n
  }

  function spawn(kind: ObstacleKind, x: number, z: number) {
    if (activeCount() >= getCaps().maxHazards) return
    const h = freeSlot()
    if (!h) return
    h.state = 'active'
    h.kind = kind
    h.baseX = clamp(x, -STRAIT_HALF_WIDTH, STRAIT_HALF_WIDTH)
    h.x = h.baseX
    h.z = z
    h.phase = Math.random() * 10
    h.hit = false
    h.missed = false
    h.launched = false
  }

  function chooseKind(): ObstacleKind {
    const level = runtime.level
    const r = Math.random()
    if (level.cargo && r < 0.22) return 'cargo'
    if (level.id >= 3 && r < 0.26) return 'oil'
    if (Math.random() < level.mineBias * MINE_SPAWN_MULT) return 'mine'
    if (level.patrol && Math.random() < 0.5) return 'patrol'
    return 'debris'
  }

  function spawnWave() {
    const level = runtime.level
    const z = runtime.player.z - SPAWN_AHEAD
    const kind = chooseKind()
    if (kind === 'cargo') {
      spawn('cargo', Math.random() < 0.5 ? -4 : 4, z)
    } else {
      spawn(kind, rand(-7, 7), z)
      // Higher levels add a second obstacle, leaving a gap to thread.
      if (level.id >= 2 && Math.random() < 0.34) {
        const k2 = chooseKind()
        if (k2 !== 'cargo' && !(kind === 'mine' && k2 === 'mine')) {
          spawn(k2, rand(-7, 7), z - rand(4, 9))
        }
      }
      if (level.id >= 5 && Math.random() < 0.22) {
        const k3 = chooseKind()
        if (k3 !== 'cargo' && k3 !== 'mine') {
          spawn(k3, rand(-7.5, 7.5), z - rand(10, 15))
        }
      }
    }
  }

  useFrame((state, rawDt) => {
    const active = runtime.simActive
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime

    if (active) {
      if (!seeded.current) {
        seeded.current = true
        lastSpawnZ.current = runtime.player.z
        // Keep early scene dense in all runs.
        spawn('debris', -3, runtime.player.z - 72)
      }
      while (runtime.scriptedHazards.length > 0) {
        const h = runtime.scriptedHazards.shift()!
        spawn(h.kind, h.x, h.z)
      }
      if (runtime.player.z < lastSpawnZ.current - runtime.level.obstacleGap) {
        lastSpawnZ.current = runtime.player.z
        spawnWave()
      }
    } else if (!runtime.running) {
      seeded.current = false
    }

    for (let i = 0; i < POOL; i++) {
      const h = data.current[i]
      const g = grp.current[i]
      if (!g) continue

      // Toggle which kind mesh is shown for this slot.
      for (const k of KINDS) {
        const node = sub.current[k][i]
        if (node) node.visible = h.state === 'active' && h.kind === k
      }

      if (h.state !== 'active') {
        g.visible = false
        continue
      }
      g.visible = true

      const spec = SPEC[h.kind]

      if (h.kind === 'patrol' && active) {
        const targetX = clamp(h.baseX + Math.sin(t * 1.1 + h.phase) * 5, -8, 8)
        h.x = THREE.MathUtils.lerp(h.x, targetX, damp(8, dt))
      }

      const surf = quickWaveAt(h.x, h.z, t)
      g.position.set(h.x, surf, h.z)

      const pulse = 0.5 + Math.sin(t * 6 + h.phase) * 0.5

      const caps = getCaps()
      if (h.kind === 'mine') {
        const m = sub.current.mine[i]
        if (m) {
          const light = m.children.find(
            (c) => c instanceof THREE.PointLight,
          ) as THREE.PointLight | undefined
          if (light) light.visible = caps.hazardLights
          m.position.y = 0.55 + Math.sin(t * 2 + h.phase) * 0.2
          const ring = m.children[8] as THREE.Mesh | undefined
          if (ring) {
            ring.scale.setScalar(1 + pulse * 0.28)
            ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.5 + pulse * 0.4
          }
          const beacon = m.children[9] as THREE.Mesh | undefined
          if (beacon) beacon.position.y = 2.2 + Math.sin(t * 4 + h.phase) * 0.15
        }
      } else if (h.kind === 'patrol') {
        const p = sub.current.patrol[i]
        if (p) {
          const light = p.children.find(
            (c) => c instanceof THREE.PointLight,
          ) as THREE.PointLight | undefined
          if (light) light.visible = caps.hazardLights
        }
        const ring = p?.children[7] as THREE.Mesh | undefined
        if (ring) {
          ring.scale.setScalar(1 + pulse * 0.18)
          ;(ring.material as THREE.MeshBasicMaterial).opacity = 0.45 + pulse * 0.35
        }
      } else if (h.kind === 'oil') {
        const o = sub.current.oil[i]
        const ring = o?.children[2] as THREE.Mesh | undefined
        if (ring) ring.scale.setScalar(1 + pulse * 0.12)
      }

      // Recycle once well behind the player.
      if (h.z > runtime.player.z + DESPAWN_BEHIND) {
        h.state = 'idle'
        continue
      }

      if (!active) continue

      const dx = runtime.player.x - h.x
      const dz = runtime.player.z - h.z
      const overlapX = Math.abs(dx) < spec.w + TANKER_HALF_W
      const overlapZ = Math.abs(dz) < spec.l + TANKER_HALF_L

      if (h.kind === 'mine' && minesweeperActive()) {
        const dist = Math.hypot(dx, dz)
        if (dist < 14 && !h.hit) {
          h.state = 'idle'
          continue
        }
      }

      if (h.kind === 'oil') {
        if (overlapX && overlapZ) applyOil()
        continue
      }

      // Damaging kinds.
      if (overlapX && overlapZ) {
        if (!h.hit) {
          h.hit = true
          damage(spec.dmg)
        }
      } else if (
        !h.missed &&
        Math.abs(dz) < 1.2 &&
        Math.abs(dx) < spec.w + TANKER_HALF_W + NEAR_MISS_DIST
      ) {
        h.missed = true
        nearMiss()
      }
    }
    perfState.counts.hazards = activeCount()
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
          {/* Mine */}
          <group
            ref={(el) => {
              sub.current.mine[i] = el
            }}
            visible={false}
          >
            <mesh>
              <icosahedronGeometry args={[1.05, liteHazards ? 0 : 1]} />
              <meshStandardMaterial
                color="#2a3544"
                emissive="#334155"
                emissiveIntensity={0.22}
                metalness={0.5}
                roughness={0.5}
              />
            </mesh>
            {!liteHazards &&
              [
                [0, 1, 0],
                [0, -1, 0],
                [1, 0, 0],
                [-1, 0, 0],
              ].map((d, k) => (
                <mesh
                  key={k}
                  position={[d[0] * 1.05, d[1] * 1.05, d[2] * 1.05]}
                  rotation={[d[2] ? Math.PI / 2 : 0, 0, d[0] ? Math.PI / 2 : 0]}
                >
                  <coneGeometry args={[0.22, 0.65, 5]} />
                  <meshStandardMaterial color="#4a5568" emissive="#64748b" emissiveIntensity={0.2} />
                </mesh>
              ))}
            <mesh position={[0, 1.15, 0]}>
              <sphereGeometry args={[0.26, 8, 8]} />
              <meshStandardMaterial
                color={COLORS.warningRed}
                emissive={COLORS.warningRed}
                emissiveIntensity={liteHazards ? 1.2 : 2}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
              <ringGeometry args={[1.35, 1.65, liteHazards ? 16 : 24]} />
              <meshBasicMaterial color={COLORS.warningRed} transparent opacity={0.8} depthWrite={false} />
            </mesh>
            {!liteHazards && (
              <mesh position={[0, 1.85, 0]}>
                <octahedronGeometry args={[0.3, 0]} />
                <meshStandardMaterial
                  color="#fca5a5"
                  emissive={COLORS.warningRed}
                  emissiveIntensity={1.4}
                />
              </mesh>
            )}
            {!liteHazards && getCaps().hazardLights && (
              <pointLight color={COLORS.warningRed} distance={8} intensity={1.4} />
            )}
          </group>

          {/* Patrol boat */}
          <group
            ref={(el) => {
              sub.current.patrol[i] = el
            }}
            visible={false}
            scale={1.25}
          >
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[1.5, 0.5, 2.6]} />
              <meshStandardMaterial color="#6b8299" emissive="#475569" emissiveIntensity={0.12} roughness={0.45} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0.2, -1.6]} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
              <coneGeometry args={[0.78, 1, 4]} />
              <meshStandardMaterial color="#7c9ab8" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.62, 0.3]}>
              <boxGeometry args={[0.95, 0.55, 1.1]} />
              <meshStandardMaterial color="#334155" emissive="#1e293b" emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[0, 1.05, 0.2]}>
              <boxGeometry args={[0.3, 0.5, 0.3]} />
              <meshStandardMaterial color="#1c2733" />
            </mesh>
            <mesh position={[-0.2, 1.35, 0.2]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2.2} />
            </mesh>
            <mesh position={[0.2, 1.35, 0.2]}>
              <sphereGeometry args={[0.18, 8, 8]} />
              <meshStandardMaterial color={COLORS.warningRed} emissive={COLORS.warningRed} emissiveIntensity={2.2} />
            </mesh>
            <mesh position={[0, -0.18, 1.9]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.4, 4]} />
              <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.42} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
              <ringGeometry args={[1.7, 2.05, 32]} />
              <meshBasicMaterial color="#f97316" transparent opacity={0.65} depthWrite={false} />
            </mesh>
            <pointLight color="#f97316" intensity={1.6} distance={12} />
          </group>

          {/* Cargo ship */}
          <group
            ref={(el) => {
              sub.current.cargo[i] = el
            }}
            visible={false}
          >
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[4.4, 1, 7]} />
              <meshStandardMaterial color="#52606d" emissive="#1e293b" emissiveIntensity={0.08} roughness={0.65} />
            </mesh>
            {[-1.2, 0, 1.2].map((cz, k) => (
              <mesh key={k} position={[0, 1.2, cz * 1.6]}>
                <boxGeometry args={[3.6, 0.9, 1.4]} />
                <meshStandardMaterial
                  color={k % 2 ? '#ea580c' : '#2563eb'}
                  emissive={k % 2 ? '#c2410c' : '#1d4ed8'}
                  emissiveIntensity={0.35}
                />
              </mesh>
            ))}
            <mesh position={[0, 1.6, -2.6]}>
              <boxGeometry args={[1.4, 1, 1]} />
              <meshStandardMaterial color="#f8fafc" emissive="#e2e8f0" emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[4.5, 0.35, 7.1]} />
              <meshStandardMaterial color={COLORS.warningRed} emissive={COLORS.warningRed} emissiveIntensity={0.4} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[2.8, 3.2, 36]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <mesh position={[0, -0.3, 5]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[6.5, 6.5]} />
              <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.38} depthWrite={false} />
            </mesh>
          </group>

          {/* Debris (broken planks + crate) */}
          <group
            ref={(el) => {
              sub.current.debris[i] = el
            }}
            visible={false}
            scale={1.2}
          >
            <mesh rotation={[0.2, 0.6, 0.1]} position={[0, 0.25, 0]}>
              <boxGeometry args={[1.1, 0.8, 1.1]} />
              <meshStandardMaterial color="#b45309" emissive="#92400e" emissiveIntensity={0.2} roughness={0.85} />
            </mesh>
            <mesh rotation={[0, 0.4, 0.2]} position={[0.6, 0.1, 0.3]}>
              <boxGeometry args={[2, 0.26, 0.36]} />
              <meshStandardMaterial color="#92400e" roughness={1} />
            </mesh>
            <mesh rotation={[0, -0.3, -0.15]} position={[-0.5, 0.1, -0.3]}>
              <boxGeometry args={[1.6, 0.24, 0.34]} />
              <meshStandardMaterial color="#78350f" roughness={1} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
              <ringGeometry args={[1.1, 1.35, 28]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} depthWrite={false} />
            </mesh>
          </group>

          {/* Oil slick (glossy dark patch) */}
          <group
            ref={(el) => {
              sub.current.oil[i] = el
            }}
            visible={false}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
              <circleGeometry args={[3.2, 32]} />
              <meshStandardMaterial
                color="#0c0c18"
                emissive="#312e81"
                emissiveIntensity={0.25}
                metalness={0.92}
                roughness={0.12}
                transparent
                opacity={0.82}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
              <ringGeometry args={[2.2, 2.9, 32]} />
              <meshBasicMaterial
                color="#a78bfa"
                transparent
                opacity={0.45}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
              <ringGeometry args={[1.2, 1.45, 24]} />
              <meshBasicMaterial color="#f472b6" transparent opacity={0.35} depthWrite={false} />
            </mesh>
          </group>

        </group>
      ))}
    </>
  )
}
