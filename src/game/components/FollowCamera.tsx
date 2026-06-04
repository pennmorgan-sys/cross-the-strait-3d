import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from '../runtime'
import { isBoosting } from '../input'
import { clamp, damp, lerp } from '../systems/math'
import { TANKER_SCALE, MAX_LATERAL } from '../constants'
import { perfState } from '../systems/performance'

const tmp = new THREE.Vector3()
const look = new THREE.Vector3()

export default function FollowCamera() {
  const { camera } = useThree()
  const roll = useRef(0)
  const velZ = useRef(0)
  const lastPz = useRef(0)
  const shakePhase = useRef(0)

  useFrame((_, dt) => {
    const p = runtime.player
    const d = Math.min(dt, 0.05)
    const boosting = isBoosting() && runtime.boost > 0
    const hullLen = 32 * TANKER_SCALE
    const forward = d > 0 ? (lastPz.current - p.z) / d : 0
    lastPz.current = p.z
    velZ.current = lerp(velZ.current, Math.max(0, forward), damp(7, d))
    const lead = Math.min(velZ.current * 0.32, 7)

    const back = (boosting ? 22 : 19) + hullLen * 0.15
    const up = 8.5
    tmp.set(p.x * 0.48, p.y + up, p.z + back + lead)

    if (runtime.shake > 0.001) {
      shakePhase.current += d * 28
      const s = runtime.shake
      tmp.x += Math.sin(shakePhase.current * 1.1) * s * 0.75
      tmp.y += Math.cos(shakePhase.current * 1.4) * s * 0.55
      runtime.shake = Math.max(0, runtime.shake - d * 2.4)
    }

    const steady = Math.abs(runtime.vx) < 0.12 && runtime.shake < 0.008
    const camRate = perfState.tier === 'mobile' ? 5.5 : steady ? 10 : 6.5
    camera.position.lerp(tmp, damp(camRate, d))
    look.set(p.x * 0.38, p.y + 2.5, p.z - hullLen * 1.8 - lead * 0.25)
    camera.lookAt(look)

    const rollTarget = clamp(-runtime.vx / MAX_LATERAL, -1, 1) * 0.035
    roll.current = lerp(roll.current, rollTarget, damp(5.5, d))
    camera.rotation.z = roll.current

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = boosting ? 72 : 68
      camera.fov = lerp(camera.fov, targetFov, damp(5, d))
      camera.updateProjectionMatrix()
    }
  })

  return null
}
