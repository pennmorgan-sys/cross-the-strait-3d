import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
}

const IRAN_SETTLEMENTS: CoastSettlement[] = [
  { z: -210, inland: 9, buildings: 16, hasPort: true, hasRefinery: false, pier: true },
  { z: 55, inland: 11, buildings: 12, hasPort: false, hasRefinery: true },
]

const OMAN_SETTLEMENTS: CoastSettlement[] = [
  { z: -135, inland: 7, buildings: 14, hasPort: true, hasRefinery: false, pier: true },
  { z: 95, inland: 8, buildings: 10, hasPort: true, hasRefinery: false },
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
  const r = seeded(side === -1 ? 771 : 772)
  // Sparse hills between towns — no urban clutter
  const zones = [-240, -80, 40, 160]
  return zones.map((z) => ({
    x: side * r(20, 28),
    y: r(2, 5),
    z: z + r(-25, 25),
    sx: r(6, 12),
    sy: r(4, 9),
    sz: r(5, 11),
  }))
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
  levelId,
  buildingMats,
}: {
  side: Side
  nightMode: boolean
  levelId: number
  buildingMats: THREE.MeshStandardMaterial[]
}) {
  const palette = side === -1 ? PALETTE.iran : PALETTE.oman
  const isIran = side === -1
  const showTerminal = levelId >= 5
  const coastX = side * 36
  const shadow = getCaps().shadows

  const settlements = useMemo(() => settlementsFor(side), [side])
  const buildings = useMemo(
    () => genSettlementBuildings(side, buildingMats),
    [side, buildingMats],
  )
  const rocks = useMemo(() => genRocks(side), [side])
  const hills = useMemo(() => genHills(side), [side])
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

  return (
    <group>
      {/* Deep land base — sloped plateau */}
      <mesh position={[coastX + side * 8, 0.8, 0]} receiveShadow={shadow} castShadow={shadow}>
        <boxGeometry args={[52, 2.2, 640]} />
        <meshStandardMaterial color={palette.rock} roughness={0.95} />
      </mesh>
      <mesh position={[coastX + side * 14, 2.2, 0]} receiveShadow>
        <boxGeometry args={[40, 3.5, 620]} />
        <meshStandardMaterial color={palette.scrub} roughness={0.92} />
      </mesh>

      {/* Cliff face toward the strait */}
      <mesh position={[coastX - side * 6, 2.5, 0]} receiveShadow>
        <boxGeometry args={[4, 6, 620]} />
        <meshStandardMaterial color={palette.cliff} roughness={1} />
      </mesh>
      {/* Cliff vertical cap */}
      <mesh position={[coastX - side * 4, 4.5, 0]}>
        <boxGeometry args={[1.5, 3, 620]} />
        <meshStandardMaterial color="#3d3020" roughness={1} />
      </mesh>

      {/* Beach / shoreline strip */}
      <mesh position={[coastX - side * 2, 0.25, 0]} receiveShadow>
        <boxGeometry args={[14, 0.55, 620]} />
        <meshStandardMaterial color={palette.beach} roughness={0.82} />
      </mesh>
      <mesh
        position={[coastX - side * 1.5, 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[12, 620]} />
        <meshStandardMaterial
          color={palette.sand}
          roughness={0.75}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Rolling hills / mountains inland */}
      {hills.map((h, i) => (
        <mesh key={`hill-${i}`} position={[h.x, h.y, h.z]} scale={[h.sx, h.sy, h.sz]} castShadow={shadow}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={palette.cliff} roughness={0.98} flatShading />
        </mesh>
      ))}
      {/* Distant mountain wall */}
      {[-180, -60, 80, 200].map((z, i) => (
        <mesh key={`mtn-${i}`} position={[coastX + side * 18, 9 + i * 2, z]} castShadow={shadow}>
          <coneGeometry args={[10 + i * 2, 22 + i * 4, 8]} />
          <meshStandardMaterial
            color={isIran ? '#2a2218' : '#3d3428'}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Scatter rocks along shore */}
      {rocks.map((rk, i) => (
        <mesh key={`rk-${i}`} position={[rk.x, rk.y, rk.z]} scale={rk.s}>
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

      {/* Port cranes — only at port settlements */}
      {settlements
        .filter((s) => s.hasPort)
        .map((s, i) => (
          <group key={`crane-${i}`} position={[coastX + 4, 0, s.z]}>
            <mesh position={[0, 3, 0]} castShadow={shadow}>
              <boxGeometry args={[1.2, 6, 1.2]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 7.5, 0]} rotation={[0, 0, -0.4]} castShadow={shadow}>
              <boxGeometry args={[0.5, 9, 0.5]} />
              <meshStandardMaterial color="#eab308" metalness={0.55} />
            </mesh>
            <mesh position={[3.5, 5.5, 0]} castShadow={shadow}>
              <boxGeometry args={[6, 0.4, 0.4]} />
              <meshStandardMaterial color="#ca8a04" metalness={0.5} />
            </mesh>
          </group>
        ))}

      {/* Oil storage — refinery settlements only */}
      {settlements
        .filter((s) => s.hasRefinery && (showTerminal || isIran))
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

      {/* Dock piers — port towns with piers */}
      {settlements
        .filter((s) => s.pier)
        .map((s, i) => (
        <group key={`pier-${i}`} position={[coastX - side * 3, 0.2, s.z]}>
          <mesh castShadow={shadow} receiveShadow={shadow}>
            <boxGeometry args={[3, 0.5, 14]} />
            <meshStandardMaterial color="#6b7280" metalness={0.35} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.2, -5]}>
            <boxGeometry args={[2.5, 2, 0.4]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        </group>
      ))}

      {/* Channel markers */}
      {Array.from({ length: 10 }, (_, i) => i * 55 - 250).map((z, i) => (
        <mesh key={`buoy-${i}`} position={[coastX - side * 1.2, 0.9, z]}>
          <cylinderGeometry args={[0.35, 0.4, 1.2, 8]} />
          <meshStandardMaterial
            color={i % 2 ? '#f8fafc' : '#ef4444'}
            emissive={i % 2 ? '#e2e8f0' : '#ef4444'}
            emissiveIntensity={nightMode ? 0.6 : 0.15}
          />
        </mesh>
      ))}

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
      {!isIran && nightMode && (
        <pointLight position={[coastX, 6, 0]} color="#fbbf24" intensity={2} distance={70} />
      )}
    </group>
  )
}

/** Rich Persian Gulf coasts — cliffs, beaches, cities, ports, mountains */
export default function StraitShores({
  nightMode = false,
  levelId = 1,
}: {
  nightMode?: boolean
  levelId?: number
}) {
  const root = useRef<THREE.Group>(null)
  const { buildingMats } = useCoastMaterials(nightMode)

  useFrame(() => {
    if (root.current) root.current.position.z = runtime.player.z
  })

  return (
    <group ref={root}>
      <CoastSide side={-1} nightMode={nightMode} levelId={levelId} buildingMats={buildingMats} />
      <CoastSide side={1} nightMode={nightMode} levelId={levelId} buildingMats={buildingMats} />
    </group>
  )
}
