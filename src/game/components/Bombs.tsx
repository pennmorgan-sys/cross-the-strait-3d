import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  BOMB_WARNING_TIME,
  BOMB_BLAST_RADIUS,
  EXPLOSION_DURATION,
  DESPAWN_BEHIND,
  COLORS,
  MAX_ACTIVE,
} from '../constants'
import { runtime, isSlow, damage, triggerExplosionFlash } from '../runtime'
import { quickWaveAt } from '../waves'
import { clamp, rand } from '../systems/math'
import { glowTexture } from '../systems/glow'
import { getCaps, perfState } from '../systems/performance'

const POOL = MAX_ACTIVE.BOMBS + 2
const SPAWN_Y = 56

type State = 'idle' | 'fall' | 'boom'
interface Bomb {
  state: State
  x: number
  z: number
  y: number
  fall: number
  boom: number
}

export default function Bombs() {
  const data = useRef<Bomb[]>(
    Array.from({ length: POOL }, () => ({
      state: 'idle' as State,
      x: 0,
      z: 0,
      y: 0,
      fall: 0,
      boom: 0,
    })),
  )
  const body = useRef<(THREE.Group | null)[]>([])
  const warn = useRef<(THREE.Group | null)[]>([])
  const fire = useRef<(THREE.Group | null)[]>([])
  const shock = useRef<(THREE.Mesh | null)[]>([])

  const timer = useRef(0)
  const seeded = useRef(false)
  const lastDebug = useRef(0)

  const slots = useMemo(() => Array.from({ length: POOL }, (_, i) => i), [])

  function activeCount() {
    let n = 0
    for (const b of data.current) {
      if (b.state !== 'idle') n++
    }
    return n
  }

  function spawnOne(closer = false) {
    const caps = getCaps()
    if (activeCount() >= caps.maxBombs) return
    const slot = data.current.find((b) => b.state === 'idle')
    if (!slot) return
    slot.state = 'fall'
    slot.x = clamp(runtime.player.x + rand(-9, 9), -9.5, 9.5)
    slot.z = closer
      ? runtime.player.z - rand(22, 40)
      : runtime.player.z - rand(26, 66)
    slot.y = SPAWN_Y
    slot.fall = BOMB_WARNING_TIME
  }

  function spawnAt(x: number, z: number) {
    if (activeCount() >= getCaps().maxBombs) return
    const slot = data.current.find((b) => b.state === 'idle')
    if (!slot) return
    slot.state = 'fall'
    slot.x = clamp(x, -9.6, 9.6)
    slot.z = z
    slot.y = SPAWN_Y
    slot.fall = BOMB_WARNING_TIME
  }

  useFrame((state, rawDt) => {
    const active = runtime.simActive
    const t = state.clock.elapsedTime
    const slow = isSlow() ? 0.4 : 1
    const dt = Math.min(rawDt, 0.05) * slow

    const level = runtime.level

    if (active && level.bombInterval > 0) {
      while (runtime.scriptedBombs.length > 0) {
        const b = runtime.scriptedBombs.shift()!
        spawnAt(b.x, b.z)
      }
      if (!seeded.current) {
        seeded.current = true
        // Guarantee an early, visible bomb so the run feels exciting fast.
        timer.current = Math.min(level.bombInterval, 2.1)
      }
      timer.current -= dt
      if (timer.current <= 0) {
        timer.current = level.bombInterval
        for (let i = 0; i < level.bombBurst; i++) spawnOne()
      }
      if (runtime.debugBombReq !== lastDebug.current) {
        lastDebug.current = runtime.debugBombReq
        spawnOne(true)
        spawnOne()
      }
    } else if (!runtime.running) {
      seeded.current = false
    }

    let falling = 0
    let booming = 0
    for (let i = 0; i < POOL; i++) {
      const b = data.current[i]
      const g = body.current[i]
      const w = warn.current[i]
      const f = fire.current[i]
      const s = shock.current[i]
      if (b.state === 'fall') falling++
      if (b.state === 'boom') booming++

      if (b.state === 'fall' || b.state === 'boom') {
        if (b.z > runtime.player.z + DESPAWN_BEHIND + 12) {
          b.state = 'idle'
          if (g) g.visible = false
          if (w) w.visible = false
          if (f) f.visible = false
          if (s) s.visible = false
          continue
        }
      }

      if (b.state === 'fall') {
        if (active) b.fall -= dt
        const p = 1 - b.fall / BOMB_WARNING_TIME
        const surf = quickWaveAt(b.x, b.z, t)
        b.y = THREE.MathUtils.lerp(SPAWN_Y, surf + 0.4, p * p)
        if (g) {
          g.visible = true
          g.position.set(b.x, b.y, b.z)
          g.rotation.z = Math.sin(t * 6) * 0.15
        }
        if (w) {
          w.visible = true
          w.position.set(b.x, surf + 0.12, b.z)
          const pulse = 0.78 + Math.sin(t * 16) * 0.22
          const sc = BOMB_BLAST_RADIUS * (0.55 + p * 0.45) * pulse
          w.scale.set(sc, sc, sc)
          w.rotation.z = t * 1.5
        }
        if (f) f.visible = false
        if (s) s.visible = false

        if (b.fall <= 0) {
          triggerExplosionFlash()
          runtime.shake = Math.max(runtime.shake, 0.55)
          if (g) g.visible = false
          if (w) w.visible = false
          const dx = runtime.player.x - b.x
          const dz = runtime.player.z - b.z
          if (Math.hypot(dx, dz) < BOMB_BLAST_RADIUS) {
            damage(1)
          }
          if (booming < getCaps().maxExplosions) {
            b.state = 'boom'
            b.boom = EXPLOSION_DURATION
          } else {
            b.state = 'idle'
          }
        }
      } else if (b.state === 'boom') {
        if (active) b.boom -= dt
        const k = clamp(1 - b.boom / EXPLOSION_DURATION, 0, 1)
        const surf = quickWaveAt(b.x, b.z, t)
        if (f) {
          f.visible = true
          f.position.set(b.x, surf + 1.4, b.z)
          // children: 0 white core, 1 gold, 2 orange, 3 smoke plume
          const cs = f.children
          const setLayer = (idx: number, scl: number, op: number) => {
            const m = cs[idx] as THREE.Mesh
            if (!m) return
            m.scale.setScalar(scl)
            const mat = m.material as THREE.MeshBasicMaterial
            mat.opacity = clamp(op, 0, 1)
          }
          setLayer(0, 0.6 + k * 3.2, 1 - k)
          setLayer(1, 0.5 + k * 4.6, (1 - k) * 0.95)
          setLayer(2, 0.4 + k * 6.2, (1 - k) * 0.85)
          const plume = cs[3] as THREE.Mesh
          if (plume) {
            plume.position.y = 1 + k * 6
            plume.scale.setScalar(1 + k * 3.4)
            ;(plume.material as THREE.MeshBasicMaterial).opacity = clamp((1 - k) * 0.55, 0, 0.55)
          }
          const flash = cs[4] as THREE.Sprite
          if (flash) {
            const fs = 6 + k * 18
            flash.scale.set(fs, fs, 1)
            ;(flash.material as THREE.SpriteMaterial).opacity = clamp(1 - k, 0, 1)
          }
        }
        if (s) {
          s.visible = true
          s.position.set(b.x, surf + 0.12, b.z)
          const sc = 1 + k * BOMB_BLAST_RADIUS * 2.6
          s.scale.set(sc, sc, sc)
          ;(s.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.7
        }
        if (b.boom <= 0) {
          b.state = 'idle'
          if (f) f.visible = false
          if (s) s.visible = false
        }
      } else {
        if (g) g.visible = false
        if (w) w.visible = false
        if (f) f.visible = false
        if (s) s.visible = false
      }
    }
    perfState.counts.bombs = falling
    perfState.counts.explosions = booming
    runtime.incoming = active ? falling : 0
    // Low rumble when the sky is thick with incoming ordnance.
    if (active && falling >= 3) {
      runtime.shake = Math.max(runtime.shake, 0.12 + falling * 0.02)
    }
  })

  return (
    <>
      {slots.map((i) => (
        <group key={i}>
          {/* Falling bomb */}
          <group
            ref={(el) => {
              body.current[i] = el
            }}
            visible={false}
          >
            <mesh>
              <capsuleGeometry args={[0.6, 1.1, 6, 12]} />
              <meshStandardMaterial color="#14141a" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* glowing red nose */}
            <mesh position={[0, -0.9, 0]}>
              <sphereGeometry args={[0.42, 12, 12]} />
              <meshStandardMaterial color={COLORS.warningRed} emissive={COLORS.warningRed} emissiveIntensity={1.4} />
            </mesh>
            {/* fins */}
            <mesh position={[0, 0.9, 0]}>
              <coneGeometry args={[0.55, 0.6, 4]} />
              <meshStandardMaterial color="#26262e" />
            </mesh>
            {/* big orange glow enveloping the whole bomb */}
            <sprite position={[0, -0.2, 0]} scale={[3.8, 4.4, 1]}>
              <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            {/* white-hot nose core */}
            <sprite position={[0, -0.95, 0]} scale={[1.7, 1.7, 1]}>
              <spriteMaterial map={glowTexture()} color="#fff0c0" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            {/* fiery trailing streak */}
            <sprite position={[0, 2.4, 0]} scale={[2.6, 6.5, 1]}>
              <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            {/* dark smoke behind the fire */}
            <sprite position={[0, 3.6, 0]} scale={[2, 4, 1]}>
              <spriteMaterial map={glowTexture()} color="#5a5a62" transparent opacity={0.35} depthWrite={false} />
            </sprite>
          </group>

          {/* Warning marker on water */}
          <group
            ref={(el) => {
              warn.current[i] = el
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
          >
            <mesh>
              <ringGeometry args={[0.78, 1, 40]} />
              <meshBasicMaterial color={COLORS.warningRed} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh>
              <ringGeometry args={[0.42, 0.5, 32]} />
              <meshBasicMaterial color={COLORS.explosionOrange} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
              <circleGeometry args={[1, 40]} />
              <meshBasicMaterial color={COLORS.warningRed} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>

          {/* Explosion fireball + plume */}
          <group
            ref={(el) => {
              fire.current[i] = el
            }}
            visible={false}
          >
            <mesh>
              <sphereGeometry args={[1, 14, 14]} />
              <meshBasicMaterial color="#fff3c4" transparent opacity={1} depthWrite={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[1, 14, 14]} />
              <meshBasicMaterial color={COLORS.supplyGold} transparent opacity={1} depthWrite={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[1, 14, 14]} />
              <meshBasicMaterial color={COLORS.explosionOrange} transparent opacity={1} depthWrite={false} />
            </mesh>
            <mesh position={[0, 1, 0]}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshBasicMaterial color="#3a3a42" transparent opacity={0.4} depthWrite={false} />
            </mesh>
            {/* additive bloom flash (child index 4) */}
            <sprite scale={[1, 1, 1]}>
              <spriteMaterial map={glowTexture()} color="#ffd27a" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
          </group>

          {/* Shockwave ring */}
          <mesh
            ref={(el) => {
              shock.current[i] = el
            }}
            rotation={[-Math.PI / 2, 0, 0]}
            visible={false}
          >
            <ringGeometry args={[0.85, 1.05, 48]} />
            <meshBasicMaterial color={COLORS.explosionOrange} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}
