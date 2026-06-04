import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { runtime, progress, isSafeWater } from '../runtime'
import { waveHeight } from '../waves'
import type { TankerRouteId } from '../types'
import TankerMesh from './TankerMesh'
import { perfState } from '../systems/performance'

/** Convoy partner tanker — player is the lead vessel at center */
function ConvoyPartner({
  route,
  xOffset,
  zOffset,
  scale = 0.38,
}: {
  route: TankerRouteId
  xOffset: number
  zOffset: number
  scale?: number
}) {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const x = runtime.player.x + xOffset
    const z = runtime.player.z + zOffset
    const y = waveHeight(x, z, t) + 0.75
    group.current.position.set(x, y, z)
    group.current.rotation.y = Math.sin(t * 0.1) * 0.012
  })

  return (
    <group ref={group}>
      <TankerMesh
        route={route}
        scale={scale}
        showLabels={perfState.tier === 'high'}
        labelMain="CONVOY #2"
      />
    </group>
  )
}

export default function StraitTankers({ levelId = 1 }: { levelId?: number }) {
  const partnerRoute = useMemo<TankerRouteId>(
    () => (levelId === 7 || levelId >= 99 ? 'pacific' : runtime.tankerRoute),
    [levelId],
  )

  const showPartner =
    levelId === 7 || levelId >= 99
      ? progress() > 0.06 && progress() < 0.85
      : progress() > 0.15 && progress() < 0.7 && levelId >= 3

  return (
    <>
      {showPartner && (
        <ConvoyPartner route={partnerRoute} xOffset={-7.5} zOffset={-48} scale={0.38} />
      )}
      {isSafeWater() && (
        <pointLight
          position={[runtime.player.x, 8, runtime.player.z - 20]}
          color="#67e8f9"
          intensity={2.8}
          distance={100}
        />
      )}
    </>
  )
}
