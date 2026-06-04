import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COLORS } from '../constants'
import { runtime, radarActive, skyFlash } from '../runtime'
import { rand } from '../systems/math'
import type { LevelConfig } from '../types'
import StraitTankers from './StraitTankers'
import StraitShores from './StraitShores'
import {
  Searchlights,
  NightSky,
  SurpriseFlares,
  RefineryGlow,
  SkyMissilesEnhanced,
  RouteBeaconGlow,
} from './StraitVisualFX'
import { getCaps, perfState } from '../systems/performance'

const playing = () => runtime.simActive

function SkyDome({
  sky,
  nightMode,
}: {
  sky: { top: string; bottom: string; fog: string }
  nightMode: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(sky.top) },
      bottom: { value: new THREE.Color(sky.bottom) },
      haze: { value: new THREE.Color(nightMode ? '#1e3a5f' : '#f0a060') },
      night: { value: nightMode ? 1 : 0 },
    }),
    [sky.top, sky.bottom, nightMode],
  )
  useFrame(() => {
    if (ref.current) ref.current.position.copy(runtime.player)
  })
  const [segW, segH] =
    perfState.tier === 'high' ? [40, 24] : perfState.tier === 'normal' ? [28, 16] : [20, 12]

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[250, segW, segH]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={uniforms}
        vertexShader={`varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`
          uniform vec3 top; uniform vec3 bottom; uniform vec3 haze; uniform float night; varying vec3 vP;
          void main(){
            float h=clamp(vP.y/250.0*0.5+0.5,0.0,1.0);
            vec3 col=mix(bottom,top,pow(h, night > 0.5 ? 1.1 : 0.75));
            float horizon=smoothstep(0.5,0.0,h);
            float front=smoothstep(0.0,-1.0,normalize(vP).z);
            col=mix(col,haze,horizon*front*(night > 0.5 ? 0.25 : 0.45));
            if (night > 0.5) col *= 0.92;
            gl_FragColor=vec4(col,1.0);
          }
        `}
      />
    </mesh>
  )
}

function RouteLane() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.z = runtime.player.z
  })
  return (
    <group ref={ref}>
      <RouteBeaconGlow />
      {Array.from({ length: getCaps().maxSkyMissiles >= 10 ? 16 : 8 }, (_, i) => (
        <mesh key={i} position={[i % 2 === 0 ? -1.5 : 1.5, 0.3, -i * 14]}>
          <sphereGeometry args={[0.28, 10, 10]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? COLORS.warningRed : '#f8fafc'}
            emissive={i % 2 === 0 ? '#ef4444' : '#e2e8f0'}
            emissiveIntensity={0.45}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  )
}

function MissileLauncher({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)
  const timer = useRef(rand(2, 8))
  const flash = useRef(0)
  useFrame((_, delta) => {
    if (!playing()) return
    timer.current -= delta
    if (timer.current <= 0) {
      timer.current = 3.5 + Math.random() * 5
      if (runtime.level.id >= 2) {
        flash.current = 1
        if (runtime.level.id >= 4) runtime.incoming = Math.min(2.5, runtime.incoming + 0.55)
      }
    }
    flash.current = Math.max(0, flash.current - delta * 2.5)
  })
  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.4, 1, 3.2]} />
        <meshStandardMaterial color="#1e242c" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.15, 0.2]}>
        <boxGeometry args={[2.6, 0.35, 3.4]} />
        <meshStandardMaterial color="#374151" metalness={0.5} />
      </mesh>
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 1.35, -0.35]} rotation={[-0.55, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 2, 8]} />
          <meshStandardMaterial color="#0f1419" metalness={0.75} roughness={0.25} />
        </mesh>
      ))}
      <pointLight
        color={COLORS.warningRed}
        intensity={0.4 + flash.current * 4}
        distance={8}
      />
    </group>
  )
}

function Launchers() {
  const sites = useMemo(
    () =>
      [
        [-32, 2, -60],
        [-34, 3, -140],
        [-30, 2, -220],
        [32, 1.5, -90],
        [34, 2, -180],
        [-33, 2.5, -300],
        [33, 2, -260],
      ] as [number, number, number][],
    [],
  )
  const root = useRef<THREE.Group>(null)
  useFrame(() => {
    if (root.current) root.current.position.z = runtime.player.z
  })
  return (
    <group ref={root}>
      {sites.map((p, i) => (
        <MissileLauncher key={i} pos={p} />
      ))}
    </group>
  )
}

function JetSilhouettes({ count }: { count: number }) {
  const jets = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        phase: Math.random() * 20,
        h: rand(24, 42),
        speed: rand(0.12, 0.3),
      })),
    [count],
  )
  const ref = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!ref.current) return
    ref.current.position.z = runtime.player.z
    const t = state.clock.elapsedTime
    ref.current.children.forEach((c, i) => {
      const j = jets[i]
      c.position.set(Math.sin(t * j.speed + j.phase) * 38, j.h, -55 - i * 28)
    })
  })
  return (
    <group ref={ref}>
      {jets.map((_, i) => (
        <group key={i}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <coneGeometry args={[0.9, 4, 5]} />
            <meshStandardMaterial color="#0f172a" metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, -2.2]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.15, 2.8, 0.5]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function DistantSmoke({ count }: { count: number }) {
  const cols = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: rand(-52, 52),
        z: -rand(70, 180) - i * 35,
      })),
    [count],
  )
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.z = runtime.player.z
  })
  return (
    <group ref={ref}>
      {cols.map((c, i) => (
        <mesh key={i} position={[c.x, 10, c.z]}>
          <cylinderGeometry args={[2, 5, 18, 10]} />
          <meshBasicMaterial color="#5c4a3a" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SunGlare() {
  return (
    <mesh position={[60, 48, -120]}>
      <sphereGeometry args={[10, 20, 20]} />
      <meshBasicMaterial color="#fff8e0" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  )
}

function MinesweeperPulse() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!ref.current) return
    const active = runtime.minesweeperPulseUntil > performance.now()
    ref.current.visible = active
    if (!active) return
    const t = 1 - (runtime.minesweeperPulseUntil - performance.now()) / 2200
    const scale = 4 + t * 42
    ref.current.scale.setScalar(scale)
    ref.current.position.set(runtime.player.x, 0.4, runtime.player.z - 8)
    const mat = ref.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.5 * (1 - t)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.5, 1, 40]} />
      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function StraitScenery({
  level,
  sky,
  nightMode,
}: {
  level: LevelConfig
  sky: { top: string; bottom: string; fog: string }
  nightMode: boolean
}) {
  const chaos = level.id >= 99 ? 1.35 : level.id >= 4 ? 1.1 : level.id >= 2 ? 0.7 : 0.4
  const caps = getCaps()
  const skyMissiles = Math.min(
    Math.floor(5 + chaos * 5),
    caps.maxSkyMissiles,
  )
  return (
    <>
      <SkyDome sky={sky} nightMode={nightMode} />
      {nightMode ? <NightSky /> : <SunGlare />}
      <StraitShores nightMode={nightMode} levelId={level.id} />
      <RouteLane />
      <Launchers />
      <StraitTankers levelId={level.id} />
      <DistantSmoke count={caps.maxDistantSmoke} />
      <RefineryGlow level={level} />
      <SurpriseFlares />
      {level.searchlights && <Searchlights count={caps.maxSearchlights} />}
      {level.id >= 4 && <JetSilhouettes count={caps.maxJets} />}
      <SkyMissilesEnhanced count={skyMissiles} />
      <MinesweeperPulse />
      {radarActive() && (
        <mesh position={[runtime.player.x, 0.2, runtime.player.z - 5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[8, 24, 40]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      )}
      {skyFlash() > 0 && (
        <pointLight
          position={[runtime.player.x, 6, runtime.player.z - 4]}
          intensity={skyFlash() * 10}
          color="#f97316"
          distance={45}
        />
      )}
    </>
  )
}
