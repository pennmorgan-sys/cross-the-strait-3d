import { Text } from '@react-three/drei'
import { COLORS } from '../constants'
import type { TankerRouteId } from '../types'
import { ROUTE_STYLE } from '../tankerRoutes'

const CONCRETE = '#4B5563'
const HULL = '#0a0a0a'

/** Oil tanker hull — player vessel and convoy partners */
export default function TankerMesh({
  route,
  scale = 1,
  showLabels = false,
  labelMain = 'OIL TANKER',
  castShadow = true,
}: {
  route: TankerRouteId
  scale?: number
  showLabels?: boolean
  labelMain?: string
  castShadow?: boolean
}) {
  const style = ROUTE_STYLE[route]
  const shadow = castShadow ? { castShadow: true } : {}

  // Cargo dome positions along the hull (-Z = bow)
  const domes = [-9, -4.5, 0, 4.5, 9, 12.5]

  return (
    <group scale={[scale, scale, scale]}>
      {/* Main hull */}
      <mesh position={[0, 0.55, 0]} {...shadow}>
        <boxGeometry args={[6.2, 1.65, 32]} />
        <meshStandardMaterial color={HULL} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Red boot topping */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[6.35, 0.6, 32.4]} />
        <meshStandardMaterial color={COLORS.warningRed} roughness={0.65} />
      </mesh>
      {/* Route stripe */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[6.4, 0.35, 31.8]} />
        <meshStandardMaterial color={style.stripe} metalness={0.25} />
      </mesh>
      {/* Cargo tanks */}
      {domes.map((tz) => (
        <mesh key={tz} position={[0, 1.9, tz]} {...shadow}>
          <cylinderGeometry args={[2.15, 2.15, 3.9, 16]} />
          <meshStandardMaterial
            color="#c5cdd6"
            metalness={0.5}
            roughness={0.32}
            emissive="#1e293b"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
      {/* Bow taper block */}
      <mesh position={[0, 0.7, -15.2]} {...shadow}>
        <boxGeometry args={[5.2, 1.2, 2.4]} />
        <meshStandardMaterial color={HULL} metalness={0.45} />
      </mesh>
      {/* Bridge / superstructure (aft) */}
      <mesh position={[0, 3.15, 10.5]} {...shadow}>
        <boxGeometry args={[5, 2.9, 4.5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.6, 10.5]} {...shadow}>
        <boxGeometry args={[1.5, 1.9, 1.6]} />
        <meshStandardMaterial color={CONCRETE} metalness={0.3} />
      </mesh>
      {/* Funnel */}
      <mesh position={[0, 5.5, 9.2]} {...shadow}>
        <cylinderGeometry args={[0.7, 0.85, 3.4, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.55} />
      </mesh>
      <mesh position={[0, 6.9, 9.2]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshBasicMaterial color="#64748b" />
      </mesh>
      {/* Mast + nav lights */}
      <mesh position={[0, 6.2, 8.5]}>
        <cylinderGeometry args={[0.06, 0.06, 2.5, 6]} />
        <meshStandardMaterial color="#475569" metalness={0.6} />
      </mesh>
      <mesh position={[-0.35, 7.1, 8.5]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0.35, 7.1, 8.5]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.4} />
      </mesh>
      {/* Bow nav light */}
      <mesh position={[0, 1.2, -14.8]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
      {/* Stern wake plane (static; animated wake separate on player) */}
      <mesh position={[0, -0.12, 15.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 12]} />
        <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.22} depthWrite={false} />
      </mesh>

      {showLabels && (
        <>
          <Text
            position={[0, 7.8, 2]}
            fontSize={0.65}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.06}
            outlineColor="#000000"
          >
            {labelMain}
          </Text>
          <Text
            position={[0, 6.9, 2]}
            fontSize={0.85}
            color={style.accent}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.07}
            outlineColor="#000000"
          >
            {style.label}
          </Text>
        </>
      )}
    </group>
  )
}
