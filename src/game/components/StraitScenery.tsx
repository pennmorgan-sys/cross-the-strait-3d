import { useLayoutEffect, useMemo, useRef } from 'react'
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
import { isPeacefulLevel } from '../levels'
import StraitMapLabels from './StraitMapLabels'

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
    perfState.tier === 'high' ? [48, 28] : perfState.tier === 'balanced' ? [32, 20] : [22, 14]

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
  const count = perfState.tier === 'mobile' ? 4 : 8
  const seg = perfState.tier === 'mobile' ? 6 : 10
  const geo = useMemo(() => new THREE.SphereGeometry(0.22, seg, seg), [seg])
  const matRed = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FACC15',
        emissive: '#FACC15',
        emissiveIntensity: 0.22,
        metalness: 0.18,
        roughness: 0.5,
      }),
    [],
  )
  const matWhite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#F8FAFC',
        emissive: '#67E8F9',
        emissiveIntensity: 0.16,
        metalness: 0.15,
        roughness: 0.5,
      }),
    [],
  )
  const redRef = useRef<THREE.InstancedMesh>(null)
  const whiteRef = useRef<THREE.InstancedMesh>(null)
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const quat = useMemo(() => new THREE.Quaternion(), [])
  const scl = useMemo(() => new THREE.Vector3(1, 1, 1), [])

  useLayoutEffect(() => {
    let ri = 0
    let wi = 0
    for (let i = 0; i < count; i++) {
      pos.set(i % 2 === 0 ? -1.5 : 1.5, 0.3, -i * 14)
      matrix.compose(pos, quat, scl)
      if (i % 2 === 0) redRef.current?.setMatrixAt(ri++, matrix)
      else whiteRef.current?.setMatrixAt(wi++, matrix)
    }
    if (redRef.current) {
      redRef.current.count = ri
      redRef.current.instanceMatrix.needsUpdate = true
    }
    if (whiteRef.current) {
      whiteRef.current.count = wi
      whiteRef.current.instanceMatrix.needsUpdate = true
    }
  }, [count, matrix, pos, quat, scl])

  useFrame(() => {
    if (ref.current) ref.current.position.z = runtime.player.z
  })

  const redN = Math.ceil(count / 2)
  const whiteN = Math.floor(count / 2)

  return (
    <group ref={ref}>
      <RouteBeaconGlow />
      <mesh position={[0, 0.09, -72]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 160]} />
        <meshBasicMaterial color="#67E8F9" transparent opacity={0.06} depthWrite={false} />
      </mesh>
      <instancedMesh ref={redRef} args={[geo, matRed, redN]} />
      <instancedMesh ref={whiteRef} args={[geo, matWhite, whiteN]} />
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
      flash.current = 1
    }
    flash.current = Math.max(0, flash.current - delta * 2.5)
  })
  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.4, 1, 3.2]} />
        <meshStandardMaterial color="#4B5563" metalness={0.55} roughness={0.44} flatShading />
      </mesh>
      <mesh position={[0, 0.15, 0.2]}>
        <boxGeometry args={[2.6, 0.35, 3.4]} />
        <meshStandardMaterial color="#374151" metalness={0.5} />
      </mesh>
      {[-0.55, 0, 0.55].map((x, i) => (
        <mesh key={i} position={[x, 1.35, -0.35]} rotation={[-0.55, 0, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 2, 8]} />
          <meshStandardMaterial color="#6B7280" metalness={0.72} roughness={0.34} />
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
  const mobile = perfState.tier === 'mobile'
  const peaceful = isPeacefulLevel(level)
  const routeVisualsOnly = peaceful || level.calmAfterProgress !== undefined
  const combatFx = !routeVisualsOnly
  const caps = getCaps()
  return (
    <>
      <SkyDome sky={sky} nightMode={nightMode} />
      {nightMode && !mobile ? <NightSky /> : !nightMode ? <SunGlare /> : null}
      <StraitShores nightMode={nightMode} peaceful={routeVisualsOnly} />
      <StraitMapLabels peaceful={routeVisualsOnly} />
      <RouteLane />
      {combatFx && !mobile && <Launchers />}
      <StraitTankers />
      {combatFx && <DistantSmoke count={caps.maxDistantSmoke} />}
      {combatFx && !mobile && <RefineryGlow level={level} />}
      {combatFx && !mobile && <SurpriseFlares />}
      {combatFx && level.searchlights && !mobile && (
        <Searchlights count={caps.maxSearchlights} />
      )}
      {combatFx && (
        <SkyMissilesEnhanced
          count={Math.min(caps.maxSkyMissiles, caps.maxMissileTrails)}
        />
      )}
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
