import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { LevelConfig } from '../types'
import { runtime, skyFlash } from '../runtime'
import { getCaps } from '../systems/performance'

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
        <hemisphereLight args={['#1e3a5f', '#050810', 0.55]} />
        <directionalLight
          ref={sunRef}
          intensity={0.65}
          color="#a5b8ff"
          {...shadowProps}
        >
          <object3D attach="target" position={[0, 0, -30]} />
        </directionalLight>
        <ambientLight intensity={0.32} color="#121c32" />
        <pointLight ref={flashRef} color="#F97316" distance={90} decay={1.4} intensity={0} />
      </>
    )
  }

  const haze = level.id >= 4 ? 1.15 : 1
  return (
    <>
      <hemisphereLight args={['#b8e4f8', '#c89f65', 0.9 * haze]} />
      <directionalLight
        ref={sunRef}
        intensity={1.65 * haze}
        color="#fff4e6"
        {...shadowProps}
      >
        <object3D attach="target" position={[0, 0, -30]} />
      </directionalLight>
      <ambientLight intensity={0.48} color="#e8f4fc" />
      <pointLight ref={flashRef} color="#F97316" distance={90} decay={1.4} intensity={0} />
    </>
  )
}
