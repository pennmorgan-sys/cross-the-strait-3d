import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import {
  COLORS,
  MAX_LATERAL,
  STRAIT_HALF_WIDTH,
  BOOST_MULT,
  BOOST_DRAIN,
  BOOST_REGEN,
  TANKER_SCALE,
} from '../constants'
import {
  runtime,
  isOiled,
  isInvincible,
  tickProgress,
  flushHud,
} from '../runtime'
import { getSteer, getThrottle, isBoosting } from '../input'
import { waveHeight } from '../waves'
import { clamp, damp, lerp } from '../systems/math'
import { getCaps, perfState } from '../systems/performance'
import TankerMesh from './TankerMesh'
import { ROUTE_STYLE } from '../tankerRoutes'
import { sfx } from '../systems/audio'

export default function PlayerBoat() {
  const caps = getCaps()
  const group = useRef<THREE.Group>(null)
  const hull = useRef<THREE.Group>(null)
  const wakeL = useRef<THREE.Mesh>(null)
  const wakeR = useRef<THREE.Mesh>(null)
  const wakeC = useRef<THREE.Mesh>(null)
  const boostWash = useRef<THREE.Mesh>(null)
  const pitch = useRef(0)
  const roll = useRef(0)
  const yaw = useRef(0)
  const wakeScale = useRef(1)
  const wakeOp = useRef(0.38)
  const boostWashZ = useRef(1.1)
  const damageWobble = useRef(0)
  const wasBoosting = useRef(false)
  const playerLight = useRef<THREE.PointLight>(null)

  useFrame((state, rawDt) => {
    if (!group.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    const active = runtime.simActive

    const level = runtime.level
    const baseWave = runtime.seaLevel

    if (active) {
      const steer = getSteer()
      const throttle = getThrottle()
      const wantBoost = isBoosting() && runtime.boost > 0

      if (wantBoost) runtime.boost = clamp(runtime.boost - BOOST_DRAIN * dt, 0, 1)
      else runtime.boost = clamp(runtime.boost + BOOST_REGEN * dt, 0, 1)
      runtime.boosting = wantBoost
      if (wantBoost && !wasBoosting.current) sfx.boost()
      wasBoosting.current = wantBoost

      const speed =
        level.speed * (1 + throttle * 0.12) * (wantBoost ? BOOST_MULT : 1)
      runtime.player.z -= speed * dt
      tickProgress(speed * dt)

      const control = isOiled() ? 1.4 : perfState.tier === 'mobile' ? 4.2 : 5.5
      const targetVx = steer * MAX_LATERAL
      runtime.vx = lerp(runtime.vx, targetVx, damp(control, dt))
      runtime.player.x += runtime.vx * dt
      if (level.storm) runtime.player.x += Math.sin(t * 0.7) * 1.8 * dt

      const limit = STRAIT_HALF_WIDTH
      if (runtime.player.x > limit) {
        runtime.player.x = limit
        runtime.vx = 0
      } else if (runtime.player.x < -limit) {
        runtime.player.x = -limit
        runtime.vx = 0
      }

      const slope =
        waveHeight(runtime.player.x, runtime.player.z - 2.5, t) - baseWave
      pitch.current = lerp(pitch.current, slope * 0.22, damp(5, dt))
      roll.current = lerp(roll.current, -runtime.vx * 0.018, damp(5, dt))
      yaw.current = lerp(yaw.current, -runtime.vx * 0.025, damp(6, dt))
    }

    damageWobble.current = lerp(
      damageWobble.current,
      runtime.shake * 0.06,
      damp(10, dt),
    )

    runtime.player.y = baseWave
    group.current.position.set(
      runtime.player.x,
      runtime.player.y + 0.75,
      runtime.player.z,
    )
    group.current.rotation.set(
      pitch.current + damageWobble.current * 0.4,
      yaw.current,
      roll.current + damageWobble.current,
    )

    const flick = isInvincible() && Math.floor(t * 18) % 2 === 0
    if (hull.current) hull.current.visible = !flick

    const targetWake = 1 + (runtime.boosting ? 0.35 : 0)
    const targetOp = runtime.boosting ? 0.5 : 0.38
    wakeScale.current = lerp(wakeScale.current, targetWake, damp(8, dt))
    wakeOp.current = lerp(wakeOp.current, targetOp, damp(8, dt))
    for (const w of [wakeL, wakeR, wakeC]) {
      if (!w.current) continue
      w.current.scale.set(
        wakeScale.current,
        1,
        wakeScale.current * (runtime.boosting ? 1.25 : 1),
      )
      const m = w.current.material as THREE.MeshBasicMaterial
      m.opacity = wakeOp.current
    }
    if (boostWash.current) {
      boostWash.current.visible = runtime.boosting
      const targetZ = 1.1 + Math.sin(t * 24) * 0.12
      boostWashZ.current = lerp(boostWashZ.current, targetZ, damp(12, dt))
      boostWash.current.scale.z = boostWashZ.current
    }

    flushHud()
  })

  return (
    <group ref={group}>
      <mesh ref={wakeL} position={[-2.2, -0.35, 5.5 * TANKER_SCALE]} rotation={[-Math.PI / 2, 0, 0.08]}>
        <planeGeometry args={[4.5, 10]} />
        <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh ref={wakeR} position={[2.2, -0.35, 5.5 * TANKER_SCALE]} rotation={[-Math.PI / 2, 0, -0.08]}>
        <planeGeometry args={[4.5, 10]} />
        <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh ref={wakeC} position={[0, -0.4, 6.2 * TANKER_SCALE]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 8]} />
        <meshBasicMaterial color="#e0f7fa" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh
        ref={boostWash}
        position={[0, -0.2, 6.8 * TANKER_SCALE]}
        rotation={[Math.PI / 2, 0, 0]}
        visible={false}
      >
        <coneGeometry args={[1.8, 5, 12]} />
        <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.55} depthWrite={false} />
      </mesh>

      <group ref={hull}>
        <TankerMesh
          route={runtime.tankerRoute}
          scale={TANKER_SCALE}
          showLabels={false}
          castShadow={getCaps().shadows}
        />
        {caps.pickupLights && (
          <pointLight
            ref={playerLight}
            position={[0, 4, 8]}
            color={ROUTE_STYLE[runtime.tankerRoute].stripe}
            distance={14}
            intensity={0.9}
          />
        )}
        {perfState.tier === 'high' && (
          <>
            <Text
              position={[0, 8.2 * TANKER_SCALE, 2 * TANKER_SCALE]}
              fontSize={0.42 * TANKER_SCALE}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="#000000"
            >
              YOUR TANKER
            </Text>
            <Text
              position={[0, 7.4 * TANKER_SCALE, 2 * TANKER_SCALE]}
              fontSize={0.52 * TANKER_SCALE}
              color={ROUTE_STYLE[runtime.tankerRoute].accent}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.06}
              outlineColor="#000000"
            >
              {runtime.tankerLabel}
            </Text>
          </>
        )}
      </group>
    </group>
  )
}
