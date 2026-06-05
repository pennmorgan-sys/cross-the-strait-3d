import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS, MAX_ACTIVE } from '../constants'
import { runtime } from '../runtime'
import { rand } from '../systems/math'
import {
  getCaps,
  particleEmitScale,
  perfState,
} from '../systems/performance'

const POOL = MAX_ACTIVE.PARTICLES

export default function Particles() {
  const geom = useRef<THREE.BufferGeometry>(null)
  const lastSplash = useRef(0)
  const emitCd = useRef(0)
  const { positions, vel, life } = useMemo(() => {
    const positions = new Float32Array(POOL * 3)
    const vel = new Float32Array(POOL * 3)
    const life = new Float32Array(POOL)
    for (let i = 0; i < POOL; i++) positions[i * 3 + 1] = -999
    return { positions, vel, life }
  }, [])

  function emit(count: number, power: number) {
    const cap = getCaps().maxParticles
    const want = Math.floor(count * particleEmitScale())
    let spawned = 0
    for (let i = 0; i < cap && spawned < want; i++) {
      if (life[i] > 0) continue
      life[i] = rand(0.4, 0.9)
      positions[i * 3] = runtime.player.x + rand(-0.6, 0.6)
      positions[i * 3 + 1] = runtime.player.y + 0.2
      positions[i * 3 + 2] = runtime.player.z + rand(0.5, 1.6)
      vel[i * 3] = rand(-2, 2)
      vel[i * 3 + 1] = rand(2, 6) * power
      vel[i * 3 + 2] = rand(1, 4)
      spawned++
    }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const active = runtime.simActive
    const cap = getCaps().maxParticles

    if (active) {
      if (runtime.splashReq !== lastSplash.current) {
        lastSplash.current = runtime.splashReq
        emit(34, 1.6)
      }
      emitCd.current -= dt
      const interval =
        perfState.tier === 'mobile' ? 0.14 : perfState.tier === 'balanced' ? 0.1 : 0.08
      const burst = runtime.boosting
        ? perfState.tier === 'mobile'
          ? 2
          : 3
        : perfState.tier === 'mobile'
          ? 1
          : 2
      if (emitCd.current <= 0) {
        emitCd.current = interval
        emit(burst, runtime.boosting ? 0.8 : 0.5)
      }
    }

    let live = 0
    for (let i = 0; i < cap; i++) {
      if (life[i] <= 0) continue
      live++
      life[i] -= dt
      if (life[i] <= 0) {
        positions[i * 3 + 1] = -999
        continue
      }
      vel[i * 3 + 1] -= 12 * dt
      positions[i * 3] += vel[i * 3] * dt
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt
    }
    perfState.counts.particles = live
    if (geom.current) {
      geom.current.attributes.position.needsUpdate = true
    }
  })

  return (
    <points>
      <bufferGeometry ref={geom}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={COLORS.tealWake}
        size={0.45}
        transparent
        opacity={0.9}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
