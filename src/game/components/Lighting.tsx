import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelConfig } from '../types'
import { runtime, skyFlash } from '../runtime'
import { getCaps, perfState } from '../systems/performance'

export default function Lighting({
  level,
  nightMode,
}: {
  level: LevelConfig
  nightMode: boolean
}) {
  const flashRef = useRef<THREE.PointLight>(null)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const caps = getCaps()

  useFrame(() => {
    if (flashRef.current) {
      flashRef.current.position.set(runtime.player.x, 8, runtime.player.z - 6)
      flashRef.current.intensity = skyFlash() * 7
    }
    if (sunRef.current) {
      sunRef.current.position.set(runtime.player.x + 45, 58, runtime.player.z - 35)
    }
  })

  const shadowProps = caps.shadows
    ? {
        castShadow: true as const,
        'shadow-mapSize': [caps.shadowMapSize, caps.shadowMapSize] as [number, number],
        'shadow-camera-near': 1,
        'shadow-camera-far': nightMode ? 120 : 130,
        'shadow-camera-left': -45,
        'shadow-camera-right': 45,
        'shadow-camera-top': 45,
        'shadow-camera-bottom': -45,
      }
    : { castShadow: false as const }

  if (nightMode) {
    return (
      <>
        <hemisphereLight args={['#6fa8d8', '#2d2118', 0.78]} />
        <directionalLight
          ref={sunRef}
          intensity={0.92}
          color="#c7d8ff"
          {...shadowProps}
        >
          <object3D attach="target" position={[0, 0, -30]} />
        </directionalLight>
        <ambientLight intensity={0.5} color="#26384f" />
        {perfState.tier !== 'mobile' && (
          <pointLight position={[0, 12, -20]} intensity={0.42} color="#67e8f9" distance={90} />
        )}
        <pointLight ref={flashRef} color="#F97316" distance={90} decay={1.4} intensity={0} />
      </>
    )
  }

  const haze = level.id >= 4 ? 1.15 : 1
  return (
    <>
      <hemisphereLight args={['#d7f6ff', '#C89F65', 1.15 * haze]} />
      <directionalLight
        ref={sunRef}
        intensity={2.18 * haze}
        color="#fff2cf"
        {...shadowProps}
      >
        <object3D attach="target" position={[0, 0, -30]} />
      </directionalLight>
      <ambientLight intensity={perfState.tier === 'mobile' ? 0.68 : 0.62} color="#f4fbff" />
      {perfState.tier !== 'mobile' && (
        <pointLight position={[0, 14, -25]} intensity={0.36} color="#8ee6ef" distance={110} />
      )}
      <pointLight ref={flashRef} color="#F97316" distance={90} decay={1.4} intensity={0} />
    </>
  )
}
