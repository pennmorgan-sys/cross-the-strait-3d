import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { COLORS } from '../constants'
import { runtime, progress } from '../runtime'
import type { LevelConfig } from '../types'
import { getCaps, perfState } from '../systems/performance'

const playing = () => runtime.running

export function Searchlights({ count = 5 }: { count?: number }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const g = refs.current[i]
      if (g) {
        g.position.set(Math.sin(t * 0.35 + i * 1.2) * 22, 28, runtime.player.z - 35 - i * 45)
        g.rotation.z = Math.sin(t * 0.5 + i) * 0.55
      }
    }
  })
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <mesh position={[0, -14, 0]}>
            <coneGeometry args={[12, 28, 16, 1, true]} />
            <meshBasicMaterial
              color={COLORS.supplyGold}
              transparent
              opacity={0.14}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            color="#fbbf24"
            intensity={0.45}
            distance={28}
            position={[0, -8, 0]}
          />
        </group>
      ))}
    </>
  )
}

export function NightSky() {
  return (
    <>
      <Stars radius={180} depth={40} count={2800} factor={3.2} saturation={0.15} fade speed={0.4} />
      <mesh position={[70, 55, -140]}>
        <sphereGeometry args={[4.5, 24, 24]} />
        <meshBasicMaterial color="#e8f0ff" />
      </mesh>
      <pointLight position={[70, 55, -140]} color="#c7d2fe" intensity={1.2} distance={120} />
    </>
  )
}

export function SurpriseFlares() {
  const ref = useRef<THREE.Group>(null)
  const flares = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        ox: (Math.random() - 0.5) * 50,
        oz: -Math.random() * 80,
        hue: Math.random() > 0.5 ? '#f97316' : '#facc15',
      })),
    [],
  )
  useFrame((state) => {
    if (!ref.current) return
    const active = performance.now() < runtime.flareUntil
    ref.current.visible = active
    if (!active) return
    ref.current.position.z = runtime.player.z
    const t = state.clock.elapsedTime
    ref.current.children.forEach((c, i) => {
      const f = flares[i]
      c.position.set(f.ox, 6 + Math.sin(t * 3 + i) * 4, f.oz)
      c.scale.setScalar(0.8 + Math.sin(t * 5 + i) * 0.3)
    })
  })
  return (
    <group ref={ref} visible={false}>
      {flares.map((f, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.35, 8, 8]} />
          <meshBasicMaterial color={f.hue} />
          <pointLight color={f.hue} intensity={1.2} distance={10} />
        </mesh>
      ))}
    </group>
  )
}

export function RefineryGlow({ level }: { level: LevelConfig }) {
  if (level.id !== 5 && level.id !== 99) return null
  const stacks = useMemo(
    () =>
      [
        [-38, 5, -80],
        [-36, 6, -160],
        [36, 4, -120],
      ] as [number, number, number][],
    [],
  )
  const root = useRef<THREE.Group>(null)
  useFrame(() => {
    if (root.current) root.current.position.z = runtime.player.z
  })
  return (
    <group ref={root}>
      {stacks.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <cylinderGeometry args={[2.5, 3, 14, 10]} />
            <meshStandardMaterial color="#1f2937" emissive="#f97316" emissiveIntensity={0.35} />
          </mesh>
          {perfState.tier === 'high' && (
            <>
              <pointLight color="#fb923c" intensity={1.8} distance={28} position={[0, 8, 0]} />
              <Sparkles count={12} scale={[6, 10, 6]} size={2} speed={0.4} color="#fdba74" />
            </>
          )}
        </group>
      ))}
    </group>
  )
}

const SKY_MISSILE_GEOM = {
  body: new THREE.ConeGeometry(0.08, 1.4, 6),
  tip: new THREE.SphereGeometry(0.1, 6, 6),
}
const SKY_MISSILE_MAT = {
  body: new THREE.MeshBasicMaterial({ color: '#fdba74' }),
  tip: new THREE.MeshBasicMaterial({ color: '#fb923c' }),
}

export function SkyMissilesEnhanced({ count }: { count: number }) {
  const pool = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 28,
        z: -Math.random() * 90,
        phase: Math.random() * 10,
        speed: 0.5 + Math.random() * 0.6,
      })),
    [count],
  )
  const grp = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!grp.current) return
    grp.current.position.z = runtime.player.z
    const t = state.clock.elapsedTime
    const show = playing()
    let live = 0
    grp.current.children.forEach((c, i) => {
      const m = pool[i]
      c.visible = show
      if (!show) return
      live++
      const y = 16 + ((t * m.speed * 22 + m.phase * 6) % 28)
      const z = m.z - ((t * m.speed * 45) % 70)
      c.position.set(m.x, y, z)
    })
    const cap = getCaps().maxMissileTrails
    perfState.counts.trails = Math.min(live, cap)
  })
  return (
    <group ref={grp}>
      {pool.map((_, i) => (
        <group key={i} visible={false}>
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            geometry={SKY_MISSILE_GEOM.body}
            material={SKY_MISSILE_MAT.body}
          />
          <mesh
            position={[0, -0.9, 0]}
            geometry={SKY_MISSILE_GEOM.tip}
            material={SKY_MISSILE_MAT.tip}
          />
        </group>
      ))}
    </group>
  )
}

export function RouteBeaconGlow() {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLORS.tealWake,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    [],
  )
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.z = runtime.player.z
    const pulse = 0.18 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08
    mat.opacity = progress() > 0.88 ? 0.08 : pulse + 0.15
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, -80]}>
      <planeGeometry args={[5.2, 320]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}
