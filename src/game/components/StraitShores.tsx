import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Object3D } from 'three'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { runtime } from '../runtime'
import { getCaps, perfState } from '../systems/performance'
import { cityTextures, dayCityTextures } from '../systems/city'
import { glowTexture } from '../systems/glow'

type Side = -1 | 1

const PALETTE = {
  iran: {
    rock: '#5c4a38',
    cliff: '#4a3828',
    scrub: '#7a6b4f',
    sand: '#c9a66b',
    beach: '#e8d4a8',
  },
  oman: {
    rock: '#8b7355',
    cliff: '#6d5a42',
    scrub: '#a89068',
    sand: '#d4b87a',
    beach: '#f0e0b8',
  },
} as const

function seeded(seed: number) {
  let s = seed >>> 0
  return (min: number, max: number) => {
    s = (s * 1664525 + 1013904223) >>> 0
    return min + (s / 4294967296) * (max - min)
  }
}

function useCoastMaterials(nightMode: boolean) {
  return useMemo(() => {
    const tex = nightMode ? cityTextures() : dayCityTextures()
    const buildingMats = tex.map(
      (t) =>
        new THREE.MeshStandardMaterial({
          map: t,
          emissive: new THREE.Color('#ffffff'),
          emissiveMap: t,
          emissiveIntensity: nightMode ? 1.15 : 0.08,
          color: nightMode ? '#141a24' : '#b8a88c',
          roughness: 0.88,
          metalness: 0.06,
        }),
    )
    return { buildingMats }
  }, [nightMode])
}

interface Building {
  x: number
  y: number
  z: number
  w: number
  d: number
  h: number
  mat: number
}

/** Real Gulf anchor points — buildings only in these clusters, not along empty coast */
interface CoastSettlement {
  z: number
  inland: number
  buildings: number
  hasPort: boolean
  hasRefinery: boolean
  pier?: boolean
  /** Oman: Fujairah-style shipping terminal */
  hasTerminal?: boolean
  /** Iran: coastal radar */
  hasRadar?: boolean
}

/** Left / north — Iran: Bandar Abbas area + refinery ridge */
const IRAN_SETTLEMENTS: CoastSettlement[] = [
  {
    z: -210,
    inland: 9,
    buildings: 10,
    hasPort: true,
    hasRefinery: false,
    pier: true,
    hasRadar: true,
  },
  {
    z: 55,
    inland: 12,
    buildings: 6,
    hasPort: false,
    hasRefinery: true,
    hasRadar: true,
  },
]

/** Right / south — Oman & UAE route: Fujairah + Khor Fakkan terminals */
const OMAN_SETTLEMENTS: CoastSettlement[] = [
  {
    z: -135,
    inland: 6,
    buildings: 8,
    hasPort: true,
    hasRefinery: true,
    pier: true,
    hasTerminal: true,
  },
  {
    z: 95,
    inland: 7,
    buildings: 7,
    hasPort: true,
    hasRefinery: false,
    pier: true,
    hasTerminal: true,
  },
]

function settlementsFor(side: Side): CoastSettlement[] {
  return side === -1 ? IRAN_SETTLEMENTS : OMAN_SETTLEMENTS
}

function genSettlementBuildings(
  side: Side,
  mats: THREE.MeshStandardMaterial[],
): Building[] {
  const out: Building[] = []
  const coastInland = side === -1 ? -1 : 1

  for (const [si, set] of settlementsFor(side).entries()) {
    const r = seeded((side === -1 ? 42001 : 88002) + si * 7919)
    const baseX = side * (26 + set.inland)
    const spreadZ = set.hasRefinery ? 14 : 20
    const spreadInland = set.hasRefinery ? 10 : 14

    for (let i = 0; i < set.buildings; i++) {
      const h = set.hasRefinery ? r(5, 14) : r(7, 24)
      out.push({
        x: baseX + coastInland * r(0, spreadInland),
        y: h / 2,
        z: set.z + r(-spreadZ, spreadZ),
        w: r(4, set.hasRefinery ? 8 : 10),
        d: r(4, 9),
        h,
        mat: Math.floor(r(0, mats.length)),
      })
    }
  }
  return out
}

function genRocks(side: Side): Array<{ x: number; y: number; z: number; s: number }> {
  const r = seeded(side === -1 ? 991 : 992)
  return Array.from({ length: 28 }, () => ({
    x: side * r(14, 22) + r(-3, 3),
    y: r(0.3, 1.2),
    z: r(-290, 290),
    s: r(0.4, 1.8),
  }))
}

function genHills(side: Side): Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> {
  const r = seeded(771)
  const zones = [-240, -80, 40, 160]
  return zones.map((z) => ({
    x: side * r(20, 28),
    y: r(1.8, 4),
    z: z + r(-25, 25),
    sx: r(10, 18),
    sy: r(2.5, 5),
    sz: r(8, 14),
  }))
}

function genOmanDunes(coastX: number, side: Side, mobile: boolean): Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number }> {
  const r = seeded(772)
  const n = mobile ? 6 : 12
  return Array.from({ length: n }, () => ({
    x: coastX + side * r(10, 18),
    y: r(0.6, 1.4),
    z: r(-220, 220),
    sx: r(12, 22),
    sy: r(1.2, 2.5),
    sz: r(10, 16),
  }))
}

/** Layered ridge + block peaks — Zagros / Hajar style, not pyramid cones */
interface MountainPeak {
  x: number
  y: number
  z: number
  sx: number
  sy: number
  sz: number
  rotY: number
  shade: number
}

interface MountainRange {
  ridge: { x: number; y: number; z: number; w: number; h: number; d: number }
  peaks: MountainPeak[]
}

function genMountainRanges(side: Side, coastX: number, fullDetail = true): MountainRange[] {
  const r = seeded(side === -1 ? 551 : 552)
  const isIran = side === -1
  const inland = coastX + side * (isIran ? 17 : 19)
  const zAnchors = fullDetail ? [-185, -55, 75, 205] : [-95, 95]

  return zAnchors.map((baseZ) => {
    const peakCount = fullDetail ? Math.floor(r(7, 11)) : 5
    const peaks: MountainPeak[] = []
    for (let p = 0; p < peakCount; p++) {
      const h = isIran ? r(16, 32) : r(14, 26)
      const along = baseZ + r(-28, 28)
      peaks.push({
        x: inland + side * r(-6, 10),
        y: h * 0.42,
        z: along,
        sx: r(10, 20),
        sy: h * r(0.78, 1.08),
        sz: r(8, 15),
        rotY: r(-0.35, 0.35),
        shade: r(0, 1),
      })
      if (r(0, 1) < (fullDetail ? 0.62 : 0.4)) {
        peaks.push({
          x: inland + side * r(-3, 7),
          y: h * r(0.55, 0.78),
          z: along + r(-8, 8),
          sx: r(5, 12),
          sy: h * r(0.38, 0.58),
          sz: r(4, 10),
          rotY: r(-0.2, 0.2),
          shade: r(0, 1),
        })
      }
    }
    return {
      ridge: {
        x: inland + side * r(4, 12),
        y: r(5, 9),
        z: baseZ,
        w: r(32, 48),
        h: r(7, 13),
        d: r(42, 62),
      },
      peaks,
    }
  })
}

function genIranDefenseSites(coastX: number) {
  const r = seeded(66102)
  return [
    { x: coastX + r(-2, 4), y: 1.2, z: -175, flash: r(0, 10) },
    { x: coastX + r(-3, 2), y: 1.5, z: -235, flash: r(0, 10) },
    { x: coastX + r(1, 5), y: 2, z: 40, flash: r(0, 10) },
    { x: coastX + r(-1, 3), y: 1.8, z: 78, flash: r(0, 10) },
  ]
}

function genIranSmokePlumes(coastX: number, mobile: boolean) {
  const r = seeded(66103)
  const n = mobile ? 4 : 8
  return Array.from({ length: n }, () => ({
    x: coastX + r(-8, 14),
    z: r(-250, 120),
    phase: r(0, 20),
    h: r(8, 18),
  }))
}

function ChannelBuoys({
  coastX,
  side,
  count,
  nightMode,
}: {
  coastX: number
  side: Side
  count: number
  nightMode: boolean
}) {
  const whiteRef = useRef<THREE.InstancedMesh>(null)
  const redRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8), [])
  const matWhite = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        emissive: '#e2e8f0',
        emissiveIntensity: nightMode ? 0.6 : 0.15,
      }),
    [nightMode],
  )
  const matRed = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#ef4444',
        emissiveIntensity: nightMode ? 0.6 : 0.15,
      }),
    [nightMode],
  )
  const matrix = useMemo(() => new THREE.Matrix4(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const quat = useMemo(() => new THREE.Quaternion(), [])
  const scl = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const whiteSlots = Math.ceil(count / 2)
  const redSlots = Math.floor(count / 2)

  useLayoutEffect(() => {
    let wi = 0
    let ri = 0
    for (let i = 0; i < count; i++) {
      pos.set(coastX - side * 1.2, 0.9, i * 55 - 250)
      matrix.compose(pos, quat, scl)
      if (i % 2 === 0) {
        whiteRef.current?.setMatrixAt(wi++, matrix)
      } else {
        redRef.current?.setMatrixAt(ri++, matrix)
      }
    }
    if (whiteRef.current) {
      whiteRef.current.count = wi
      whiteRef.current.instanceMatrix.needsUpdate = true
    }
    if (redRef.current) {
      redRef.current.count = ri
      redRef.current.instanceMatrix.needsUpdate = true
    }
  }, [count, coastX, side, matrix, pos, quat, scl])

  return (
    <>
      <instancedMesh ref={whiteRef} args={[geo, matWhite, whiteSlots]} />
      <instancedMesh ref={redRef} args={[geo, matRed, redSlots]} />
    </>
  )
}

function genIranCliffRocks(side: Side, coastX: number, coastLen: number, mobile: boolean) {
  const r = seeded(66104)
  const n = mobile ? 12 : 24
  return Array.from({ length: n }, () => ({
    x: coastX - side * r(5, 9),
    y: r(1.5, 5.5),
    z: r(-coastLen * 0.45, coastLen * 0.45),
    sx: r(1.2, 3.5),
    sy: r(1.5, 4),
    sz: r(1, 2.5),
  }))
}

function genOmanTanks(settlements: CoastSettlement[], coastX: number, side: Side) {
  const out: { x: number; z: number; r: number; h: number }[] = []
  for (const set of settlements) {
    if (!set.hasRefinery && !set.hasTerminal) continue
    const r = seeded(88010 + set.z)
    const count = set.hasTerminal ? 5 : 3
    for (let i = 0; i < count; i++) {
      out.push({
        x: coastX + side * r(5, 11),
        z: set.z + r(-14, 14),
        r: r(2.8, 4.2),
        h: r(6, 9),
      })
    }
  }
  return out
}

function genOmanPipelines(settlements: CoastSettlement[], coastX: number, side: Side) {
  return settlements
    .filter((s) => s.hasTerminal || s.hasRefinery)
    .flatMap((s) => [
      {
        x: coastX + side * 8,
        y: 1.2,
        z: s.z - 18,
        len: 36,
        rotY: 0,
      },
      {
        x: coastX + side * 9,
        y: 1.5,
        z: s.z + 8,
        len: 28,
        rotY: 0.12,
      },
    ])
}

function RadarTower({
  x,
  y,
  z,
  nightMode,
}: {
  x: number
  y: number
  z: number
  nightMode: boolean
}) {
  const dish = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (dish.current) dish.current.rotation.y = state.clock.elapsedTime * 0.6
  })
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 4, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.45, 8, 8]} />
        <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 8.2, 0]} ref={dish}>
        <boxGeometry args={[2.8, 0.25, 2.2]} />
        <meshStandardMaterial
          color="#6b7280"
          metalness={0.65}
          emissive={nightMode ? '#22d3ee' : '#000000'}
          emissiveIntensity={nightMode ? 0.35 : 0}
        />
      </mesh>
      <mesh position={[0, 8.5, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {nightMode && (
        <pointLight position={[0, 8, 0]} color="#22d3ee" intensity={0.6} distance={14} />
      )}
    </group>
  )
}

function DecorLauncher({
  x,
  y,
  z,
  flashSeed,
}: {
  x: number
  y: number
  z: number
  flashSeed: number
}) {
  const flash = useRef(0)
  const smoke = useRef(0)
  const timer = useRef(flashSeed)
  useFrame((_, dt) => {
    if (!runtime.simActive) return
    timer.current -= dt
    if (timer.current <= 0) {
      timer.current = 4 + Math.random() * 6
      flash.current = 1
      smoke.current = 1.2
    }
    flash.current = Math.max(0, flash.current - dt * 2.2)
    smoke.current = Math.max(0, smoke.current - dt * 0.35)
  })
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.6, 1, 3.4]} />
        <meshStandardMaterial color="#1e242c" metalness={0.65} roughness={0.35} />
      </mesh>
      {[-0.55, 0, 0.55].map((lx, i) => (
        <mesh key={i} position={[lx, 1.35, -0.4]} rotation={[-0.55, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 2.1, 6]} />
          <meshStandardMaterial color="#0f1419" metalness={0.75} />
        </mesh>
      ))}
      <pointLight color="#ef4444" intensity={0.3} distance={6} />
      {flash.current > 0.01 && (
        <sprite position={[0, 2.5, -1]} scale={[2.5, 2.5, 1]}>
          <spriteMaterial
            map={glowTexture()}
            color="#f97316"
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            opacity={flash.current}
          />
        </sprite>
      )}
      {smoke.current > 0.01 && (
        <sprite position={[0, 4 + (1.2 - smoke.current) * 6, -1.5]} scale={[3, 5, 1]}>
          <spriteMaterial
            map={glowTexture()}
            color="#6b7280"
            transparent
            opacity={smoke.current * 0.45}
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  )
}

function SmokePlume({
  x,
  z,
  phase,
  maxH,
}: {
  x: number
  z: number
  phase: number
  maxH: number
}) {
  const ref = useRef<THREE.Sprite>(null)
  useFrame((state) => {
    if (!ref.current || !runtime.simActive) return
    const t = state.clock.elapsedTime + phase
    const cycle = (t * 0.35) % 1
    ref.current.position.y = 2 + cycle * maxH
    ref.current.position.x = x + Math.sin(t * 0.7) * 1.5
    const mat = ref.current.material as THREE.SpriteMaterial
    mat.opacity = 0.5 * (1 - cycle) * (0.7 + Math.sin(t * 3) * 0.2)
    ref.current.scale.set(4 + cycle * 3, 6 + cycle * 5, 1)
  })
  return (
    <sprite ref={ref} position={[x, 2, z]} scale={[4, 6, 1]}>
      <spriteMaterial
        map={glowTexture()}
        color="#9ca3af"
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.4}
      />
    </sprite>
  )
}

function CoastFire({ x, y, z, phase }: { x: number; y: number; z: number; phase: number }) {
  const ref = useRef<THREE.Sprite>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const flick = 0.55 + Math.sin(t * 8 + phase) * 0.3
    ref.current.scale.set(4 + flick * 3, 5 + flick * 4, 1)
    ;(ref.current.material as THREE.SpriteMaterial).opacity = 0.35 + flick * 0.35
  })
  return (
    <sprite ref={ref} position={[x, y, z]} scale={[6, 8, 1]}>
      <spriteMaterial
        map={glowTexture()}
        color="#ff8c42"
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}

function CoastSide({
  side,
  nightMode,
  buildingMats,
  peaceful,
}: {
  side: Side
  nightMode: boolean
  buildingMats: THREE.MeshStandardMaterial[]
  peaceful: boolean
}) {
  const palette = side === -1 ? PALETTE.iran : PALETTE.oman
  const isIran = side === -1
  const mobile = perfState.tier === 'mobile' && !peaceful
  const coastX = side * 36
  const coastLen = peaceful || perfState.tier !== 'mobile' ? 620 : 360
  const shadow = getCaps().shadows

  const settlements = useMemo(() => settlementsFor(side), [side])
  const buildings = useMemo(
    () => genSettlementBuildings(side, buildingMats),
    [side, buildingMats],
  )
  const rocks = useMemo(() => genRocks(side), [side])
  const hills = useMemo(() => (isIran ? genHills(side) : []), [isIran, side])
  const dunes = useMemo(
    () => (!isIran ? genOmanDunes(coastX, side, mobile) : []),
    [isIran, coastX, side, mobile],
  )
  const fullMountains = peaceful || perfState.tier !== 'mobile'
  const mountains = useMemo(
    () => (isIran ? genMountainRanges(side, coastX, fullMountains) : []),
    [isIran, side, coastX, fullMountains],
  )
  const iranDefense = useMemo(
    () => (isIran && !peaceful ? genIranDefenseSites(coastX) : []),
    [isIran, coastX, peaceful],
  )
  const iranSmoke = useMemo(
    () => (isIran && !peaceful ? genIranSmokePlumes(coastX, mobile) : []),
    [isIran, coastX, mobile, peaceful],
  )
  const iranCliffs = useMemo(
    () =>
      isIran ? genIranCliffRocks(side, coastX, coastLen, peaceful ? false : mobile) : [],
    [isIran, side, coastX, coastLen, mobile, peaceful],
  )
  const omanTanks = useMemo(
    () => (!isIran ? genOmanTanks(settlements, coastX, side) : []),
    [isIran, settlements, coastX, side],
  )
  const omanPipes = useMemo(
    () => (!isIran ? genOmanPipelines(settlements, coastX, side) : []),
    [isIran, settlements, coastX, side],
  )
  const cliffRockGeo = useMemo(() => new THREE.BoxGeometry(1, 1.2, 0.8), [])
  const hillGeo = useMemo(() => new THREE.BoxGeometry(1, 0.55, 1.4), [])
  const duneGeo = useMemo(() => new THREE.BoxGeometry(1, 0.35, 1.2), [])
  const mtnColors = useMemo(() => {
    const base = isIran
      ? ['#3d3228', '#4a3a2e', '#352a22', '#5c4a38']
      : ['#5a4d3a', '#6d5a42', '#4a4032', '#7a6a52']
    return base.map((hex) => new THREE.Color(hex))
  }, [isIran])
  const fires = useMemo(() => {
    const r = seeded(side * 333)
    const bases = settlements.map((s) => s.z)
    return bases.flatMap((z, i) =>
      Array.from({ length: nightMode && i === 0 ? 2 : 1 }, () => ({
        x: side * r(30, 44),
        y: r(2, 7),
        z: z + r(-8, 8),
        phase: r(0, 20),
      })),
    )
  }, [side, nightMode, settlements])

  const decorRef = useRef<THREE.Group>(null)
  const cullZ =
    peaceful || perfState.tier === 'high'
      ? 380
      : perfState.tier === 'balanced'
        ? 300
        : 200

  useFrame(() => {
    const root = decorRef.current
    if (!root) return
    root.traverse((o: Object3D) => {
      if (!o.userData.coastCull) return
      o.visible = Math.abs(o.position.z) < cullZ
    })
  })

  return (
    <group ref={decorRef}>
      {/* Deep land base — sloped plateau */}
      <mesh position={[coastX + side * 8, 0.8, 0]} receiveShadow={shadow} castShadow={shadow}>
        <boxGeometry args={[52, 2.2, coastLen + 20]} />
        <meshStandardMaterial color={palette.rock} roughness={0.95} />
      </mesh>
      <mesh position={[coastX + side * 14, 2.2, 0]} receiveShadow>
        <boxGeometry args={[40, 3.5, coastLen]} />
        <meshStandardMaterial color={palette.scrub} roughness={0.92} />
      </mesh>

      {/* Cliff / bluff toward the strait — rugged Iran, low sandy Oman */}
      <mesh
        position={[coastX - side * (isIran ? 6 : 4), isIran ? 2.5 : 1.2, 0]}
        receiveShadow
      >
        <boxGeometry args={[isIran ? 5 : 3, isIran ? 7 : 3.5, coastLen]} />
        <meshStandardMaterial color={palette.cliff} roughness={1} flatShading={isIran} />
      </mesh>
      {isIran && (
        <mesh position={[coastX - side * 4, 5, 0]}>
          <boxGeometry args={[2, 4, coastLen]} />
          <meshStandardMaterial color="#3d3020" roughness={1} flatShading />
        </mesh>
      )}

      {/* Beach / shoreline — wider sandy strip on Oman side */}
      <mesh
        position={[coastX - side * (isIran ? 2 : 1.5), 0.25, 0]}
        receiveShadow
      >
        <boxGeometry args={[isIran ? 14 : 22, 0.55, coastLen]} />
        <meshStandardMaterial color={palette.beach} roughness={0.82} />
      </mesh>
      <mesh
        position={[coastX - side * (isIran ? 1.5 : 1), 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[isIran ? 12 : 20, coastLen]} />
        <meshStandardMaterial
          color={palette.sand}
          roughness={0.75}
          transparent
          opacity={isIran ? 0.85 : 0.92}
        />
      </mesh>

      {/* Iran: rocky cliff outcrops */}
      {iranCliffs.map((c, i) => (
        <mesh
          key={`cliff-rk-${i}`}
          userData={{ coastCull: true }}
          position={[c.x, c.y, c.z]}
          scale={[c.sx, c.sy, c.sz]}
          rotation={[0, ((i * 0.21) % 1) * Math.PI, 0]}
          castShadow={shadow}
        >
          <primitive object={cliffRockGeo} attach="geometry" />
          <meshStandardMaterial color={palette.cliff} roughness={1} flatShading />
        </mesh>
      ))}

      {/* Iran foothills — low mesas */}
      {hills.map((h, i) => (
        <mesh
          key={`hill-${i}`}
          userData={{ coastCull: true }}
          position={[h.x, h.y, h.z]}
          scale={[h.sx, h.sy, h.sz]}
          rotation={[0, ((i * 0.37) % 1) * Math.PI * 0.5, 0]}
          castShadow={shadow}
        >
          <primitive object={hillGeo} attach="geometry" />
          <meshStandardMaterial color={palette.scrub} roughness={0.96} flatShading />
        </mesh>
      ))}

      {/* Oman: low sand dunes instead of mountains */}
      {!isIran &&
        dunes.map((d, i) => (
          <mesh
            key={`dune-${i}`}
            userData={{ coastCull: true }}
            position={[d.x, d.y, d.z]}
            scale={[d.sx, d.sy, d.sz]}
            rotation={[0, ((i * 0.29) % 1) * Math.PI * 0.5, 0]}
            receiveShadow
          >
            <primitive object={duneGeo} attach="geometry" />
            <meshStandardMaterial color={palette.sand} roughness={0.9} />
          </mesh>
        ))}

      {/* Iran only — Zagros-style ridges + block peaks */}
      {mountains.map((range, ri) => (
        <group key={`mtn-range-${ri}`}>
          <mesh
            userData={{ coastCull: true }}
            position={[range.ridge.x, range.ridge.y, range.ridge.z]}
            scale={[range.ridge.w, range.ridge.h, range.ridge.d]}
            rotation={[0, side * 0.08, 0]}
            castShadow={shadow}
            receiveShadow={shadow}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={mtnColors[0]}
              roughness={1}
              flatShading
            />
          </mesh>
          {range.peaks.map((p, pi) => (
            <group
              key={`peak-${ri}-${pi}`}
              userData={{ coastCull: true }}
              position={[p.x, p.y, p.z]}
              rotation={[0, p.rotY, 0]}
            >
              <mesh
                scale={[p.sx, p.sy, p.sz]}
                castShadow={shadow}
                receiveShadow={shadow}
              >
                <boxGeometry args={[1, 1.15, 0.85]} />
                <meshStandardMaterial
                  color={mtnColors[Math.min(3, Math.floor(p.shade * 4))]}
                  roughness={0.98}
                  flatShading
                />
              </mesh>
              <mesh
                position={[side * 2.2, p.sy * 0.35, p.sz * 0.15]}
                scale={[p.sx * 0.55, p.sy * 0.42, p.sz * 0.5]}
                castShadow={shadow}
              >
                <boxGeometry args={[1, 0.9, 1]} />
                <meshStandardMaterial
                  color={mtnColors[1 + (pi % 2)]}
                  roughness={1}
                  flatShading
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Shore rocks — dense on Iran, sparse on Oman */}
      {(isIran ? rocks : rocks.filter((_, i) => i % 3 === 0)).map((rk, i) => (
        <mesh key={`rk-${i}`} position={[rk.x, rk.y, rk.z]} scale={rk.s * (isIran ? 1 : 0.7)}>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={palette.cliff} roughness={0.9} flatShading />
        </mesh>
      ))}

      {/* Town / port clusters only — empty coast stays desert + cliffs */}
      {buildings.map((b, i) => (
        <mesh
          key={`bld-${i}`}
          position={[b.x, b.y, b.z]}
          material={buildingMats[b.mat]}
          castShadow={shadow}
          receiveShadow={shadow}
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
        </mesh>
      ))}

      {/* Port cranes — Oman terminals get twin cranes */}
      {settlements
        .filter((s) => s.hasPort)
        .flatMap((s, si) => {
          const count = !isIran && s.hasTerminal ? 2 : 1
          return Array.from({ length: count }, (_, ci) => ({
            key: `crane-${si}-${ci}`,
            z: s.z + (ci === 0 ? 0 : 12),
            tall: !isIran && s.hasTerminal,
          }))
        })
        .map(({ key, z, tall }) => (
          <group key={key} position={[coastX + side * 5, 0, z]}>
            <mesh position={[0, 3, 0]} castShadow={shadow}>
              <boxGeometry args={[1.2, tall ? 7 : 6, 1.2]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, tall ? 9 : 7.5, 0]} rotation={[0, 0, -0.4]} castShadow={shadow}>
              <boxGeometry args={[0.5, tall ? 11 : 9, 0.5]} />
              <meshStandardMaterial color="#eab308" metalness={0.55} />
            </mesh>
            <mesh position={[side * -3.5, tall ? 6.5 : 5.5, 0]} castShadow={shadow}>
              <boxGeometry args={[6, 0.4, 0.4]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.5} />
            </mesh>
          </group>
        ))}

      {/* Iran refinery tanks */}
      {isIran &&
        settlements
          .filter((s) => s.hasRefinery)
          .flatMap((s, si) =>
            [-10, 0, 10].map((dz, ti) => ({ key: `tank-${si}-${ti}`, z: s.z + dz })),
          )
          .map(({ key, z }) => (
            <group key={key} position={[coastX + side * 6, 0, z]}>
              <mesh position={[0, 3.5, 0]} castShadow={shadow}>
                <cylinderGeometry args={[3.2, 3.5, 7, 16]} />
                <meshStandardMaterial
                  color="#1e293b"
                  metalness={0.55}
                  roughness={0.35}
                  emissive={nightMode ? '#f97316' : '#000000'}
                  emissiveIntensity={nightMode ? 0.2 : 0}
                />
              </mesh>
              <mesh position={[0, 7.2, 0]}>
                <sphereGeometry args={[0.35, 8, 8]} />
                <meshBasicMaterial color="#94a3b8" />
              </mesh>
            </group>
          ))}

      {/* Oman oil storage farm */}
      {!isIran &&
        omanTanks.map((t, i) => (
          <group key={`om-tank-${i}`} position={[t.x, 0, t.z]}>
            <mesh position={[0, t.h / 2, 0]} castShadow={shadow}>
              <cylinderGeometry args={[t.r, t.r * 1.05, t.h, 14]} />
              <meshStandardMaterial
                color="#1e293b"
                metalness={0.6}
                roughness={0.3}
                emissive={nightMode ? '#fbbf24' : '#000000'}
                emissiveIntensity={nightMode ? 0.15 : 0}
              />
            </mesh>
          </group>
        ))}

      {/* Oman pipelines between tanks and terminals */}
      {!isIran &&
        omanPipes.map((p, i) => (
          <mesh
            key={`pipe-${i}`}
            position={[p.x, p.y, p.z]}
            rotation={[0, p.rotY, Math.PI / 2]}
            castShadow={shadow}
          >
            <cylinderGeometry args={[0.35, 0.35, p.len, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.35} />
          </mesh>
        ))}

      {/* Oman shipping terminal warehouses */}
      {!isIran &&
        settlements
          .filter((s) => s.hasTerminal)
          .flatMap((s, si) => {
            const r = seeded(88020 + s.z)
            return Array.from({ length: mobile ? 2 : 4 }, (_, wi) => ({
              key: `term-${si}-${wi}`,
              x: coastX + side * r(8, 14),
              z: s.z + r(-16, 16),
              w: r(10, 18),
              h: r(5, 9),
              d: r(8, 14),
            }))
          })
          .map(({ key, x, z, w, h, d }) => (
            <mesh key={key} position={[x, h / 2, z]} castShadow={shadow}>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.85} metalness={0.12} />
            </mesh>
          ))}

      {/* Dock piers — extended tanker berths on Oman terminals */}
      {settlements
        .filter((s) => s.pier)
        .map((s, i) => {
          const tanker = !isIran && s.hasTerminal
          return (
            <group
              key={`pier-${i}`}
              position={[coastX - side * (tanker ? 4 : 3), 0.2, s.z]}
            >
              <mesh castShadow={shadow} receiveShadow={shadow}>
                <boxGeometry args={[tanker ? 5 : 3, 0.5, tanker ? 28 : 14]} />
                <meshStandardMaterial color="#6b7280" metalness={0.35} roughness={0.6} />
              </mesh>
              {tanker && (
                <mesh position={[0, 0.55, 10]}>
                  <boxGeometry args={[4.5, 0.35, 12]} />
                  <meshStandardMaterial color="#475569" metalness={0.4} />
                </mesh>
              )}
              <mesh position={[0, 1.2, tanker ? -8 : -5]}>
                <boxGeometry args={[tanker ? 4 : 2.5, 2, 0.4]} />
                <meshStandardMaterial color="#4b5563" />
              </mesh>
            </group>
          )
        })}

      {/* Iran coastal radar */}
      {isIran &&
        settlements
          .filter((s) => s.hasRadar)
          .map((s, i) => (
            <RadarTower
              key={`radar-${i}`}
              x={coastX + side * 3}
              y={0}
              z={s.z + (i === 0 ? -22 : 18)}
              nightMode={nightMode}
            />
          ))}

      {/* Iran decorative missile launchers + launch smoke */}
      {iranDefense.map((d, i) => (
        <DecorLauncher key={`launch-${i}`} x={d.x} y={d.y} z={d.z} flashSeed={d.flash} />
      ))}
      {iranSmoke.map((s, i) => (
        <SmokePlume key={`smoke-${i}`} x={s.x} z={s.z} phase={s.phase} maxH={s.h} />
      ))}

      <ChannelBuoys
        coastX={coastX}
        side={side}
        count={mobile ? 5 : 10}
        nightMode={nightMode}
      />

      {/* Ground-level fire glow (night / conflict) */}
      {fires.map((f, i) => (
        <CoastFire key={`fire-${i}`} x={f.x} y={f.y} z={f.z} phase={f.phase} />
      ))}

      {/* Desert haze / dust on Iran side */}
      {isIran && perfState.tier === 'high' && (
        <Sparkles
          count={40}
          scale={[30, 8, 120]}
          position={[coastX + side * 10, 4, 0]}
          size={2}
          speed={0.2}
          opacity={0.35}
          color="#d4a574"
        />
      )}

      {/* Port lights at night — Oman */}
      {!isIran && nightMode && !mobile && (
        <pointLight position={[coastX, 6, 0]} color="#fbbf24" intensity={2} distance={70} />
      )}
    </group>
  )
}

/** Rich Persian Gulf coasts — cliffs, beaches, cities, ports, mountains */
export default function StraitShores({
  nightMode = false,
  peaceful = false,
}: {
  nightMode?: boolean
  peaceful?: boolean
  /** @deprecated kept for callers; coast theming no longer scales by level */
  levelId?: number
}) {
  const root = useRef<THREE.Group>(null)
  const { buildingMats } = useCoastMaterials(nightMode)

  useFrame(() => {
    if (root.current) root.current.position.z = runtime.player.z
  })

  return (
    <group ref={root}>
      <CoastSide side={-1} nightMode={nightMode} buildingMats={buildingMats} peaceful={peaceful} />
      <CoastSide side={1} nightMode={nightMode} buildingMats={buildingMats} peaceful={peaceful} />
    </group>
  )
}
