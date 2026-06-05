import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { runtime, progress } from '../runtime'
import { perfState } from '../systems/performance'
import { COLORS } from '../constants'

interface MapLabelDef {
  text: string
  position: [number, number, number]
  color: string
  fontSize: number
  pulseSafe?: boolean
}

const MAP_LABELS: MapLabelDef[] = [
  { text: 'IRAN COAST', position: [-46, 5.5, 18], color: '#d4a574', fontSize: 1.15 },
  { text: 'OMAN COAST', position: [46, 5.5, 18], color: '#f0e0b8', fontSize: 1.15 },
  { text: 'UAE SHIPPING ROUTE', position: [52, 7, -115], color: '#fbbf24', fontSize: 0.92 },
  { text: 'STRAIT OF HORMUZ', position: [0, 13, -24], color: '#22d3ee', fontSize: 1.35 },
  { text: 'TANKER ROUTE', position: [0, 3.2, -14], color: COLORS.tealWake, fontSize: 0.88 },
  { text: 'SAFE WATER', position: [0, 4.2, -105], color: COLORS.radarGreen, fontSize: 1.05, pulseSafe: true },
  { text: 'GULF OF OMAN', position: [0, 9.5, -195], color: '#cbd5e1', fontSize: 1.2 },
  { text: 'PERSIAN GULF', position: [0, 9.5, 125], color: '#cbd5e1', fontSize: 1.2 },
]

function MapLabel({ def, scale }: { def: MapLabelDef; scale: number }) {
  const textRef = useRef<THREE.Mesh>(null)
  const size = def.fontSize * scale
  const pulseTick = useRef(0)

  useFrame(() => {
    if (!def.pulseSafe || !textRef.current) return
    pulseTick.current++
    if (pulseTick.current % 4 !== 0) return
    const p = progress()
    const mat = (textRef.current as THREE.Mesh).material
    if (mat && 'color' in mat) {
      const c = mat as THREE.MeshBasicMaterial
      const bright = p > 0.75
      c.color.set(bright ? '#4ade80' : COLORS.radarGreen)
      c.opacity = bright ? 0.95 + Math.sin(performance.now() * 0.005) * 0.05 : 0.9
    }
  })

  return (
    <Billboard position={def.position}>
      <Text
        ref={textRef}
        fontSize={size}
        color={def.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05 * scale}
        outlineColor="#020617"
        letterSpacing={0.04}
        maxWidth={def.text.length > 14 ? 28 : 18}
      >
        {def.text}
      </Text>
    </Billboard>
  )
}

/** Tactical map labels — coasts, waterways, tanker lane (scrolls with player) */
export default function StraitMapLabels({ peaceful = false }: { peaceful?: boolean }) {
  const root = useRef<THREE.Group>(null)
  const mobile = perfState.tier === 'mobile' && !peaceful
  const scale = mobile ? 0.72 : 1
  const laneStripeGeo = useMemo(() => new THREE.PlaneGeometry(4.8, 0.35), [])
  const labels = useMemo(() => {
    const list = mobile
      ? MAP_LABELS.filter((l) =>
          ['IRAN COAST', 'OMAN COAST', 'STRAIT OF HORMUZ', 'TANKER ROUTE'].includes(l.text),
        )
      : MAP_LABELS
    perfState.counts.labels = list.length
    return list
  }, [mobile])

  useFrame(() => {
    if (root.current) root.current.position.z = runtime.player.z
  })

  return (
    <group ref={root}>
      {labels.map((def) => (
        <MapLabel key={def.text} def={def} scale={scale} />
      ))}
      {!mobile &&
        [-18, -42, -68, -92].map((z, i) => (
          <mesh
            key={`lane-${i}`}
            position={[0, 0.12, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <primitive object={laneStripeGeo} attach="geometry" />
            <meshBasicMaterial
              color={COLORS.tealWake}
              transparent
              opacity={0.28}
              depthWrite={false}
            />
          </mesh>
        ))}
    </group>
  )
}
