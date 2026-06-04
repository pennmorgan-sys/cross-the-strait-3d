import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'

const R = 2.15

/** lat/lon in degrees → point on sphere surface */
function latLon(lat: number, lon: number, radius = R) {
  const la = (lat * Math.PI) / 180
  const lo = (lon * Math.PI) / 180
  return new THREE.Vector3(
    radius * Math.cos(la) * Math.cos(lo),
    radius * Math.sin(la),
    radius * Math.cos(la) * Math.sin(lo),
  )
}

const LANDS: Array<{ lat: number; lon: number; sx: number; sy: number; sz: number; color: string }> = [
  { lat: 42, lon: -98, sx: 0.55, sy: 0.4, sz: 0.45, color: '#9ca3af' },
  { lat: 8, lon: -65, sx: 0.35, sy: 0.5, sz: 0.4, color: '#6b7280' },
  { lat: 12, lon: 18, sx: 0.45, sy: 0.55, sz: 0.42, color: '#a8a29e' },
  { lat: 48, lon: 12, sx: 0.5, sy: 0.35, sz: 0.38, color: '#d1d5db' },
  { lat: 32, lon: 78, sx: 0.7, sy: 0.45, sz: 0.5, color: '#e5e7eb' },
  { lat: -8, lon: 135, sx: 0.32, sy: 0.28, sz: 0.3, color: '#9ca3af' },
]

const ROUTE_POINTS = [
  latLon(28, 48, R + 0.02),
  latLon(27, 52, R + 0.02),
  latLon(26.5, 56, R + 0.02),
  latLon(26, 58.5, R + 0.02),
  latLon(25, 62, R + 0.02),
]

function LandBlob({
  lat,
  lon,
  sx,
  sy,
  sz,
  color,
}: (typeof LANDS)[0]) {
  const pos = latLon(lat, lon, R + 0.03)
  const normal = pos.clone().normalize()
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal), [normal.x, normal.y, normal.z])
  return (
    <mesh position={pos} quaternion={q} scale={[sx, sy, sz]}>
      <sphereGeometry args={[0.22, 10, 10]} />
      <meshStandardMaterial color={color} roughness={0.92} metalness={0.05} />
    </mesh>
  )
}

function ThreatZone({ visible }: { visible: boolean }) {
  const pos = latLon(26.5, 56, R + 0.06)
  const normal = pos.clone().normalize()
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal), [normal.x, normal.y, normal.z])
  if (!visible) return null
  return (
    <mesh position={pos} quaternion={q} scale={[0.55, 0.38, 0.55]}>
      <sphereGeometry args={[0.28, 12, 12]} />
      <meshStandardMaterial
        color="#facc15"
        transparent
        opacity={0.55}
        emissive="#fbbf24"
        emissiveIntensity={0.35}
        depthWrite={false}
      />
    </mesh>
  )
}

function RouteArc({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <Line
      points={ROUTE_POINTS}
      color="#fbbf24"
      lineWidth={2.5}
      transparent
      opacity={0.9}
    />
  )
}

function PinLabel({
  position,
  visible,
  tone,
  icon,
  title,
  subtitle,
}: {
  position: THREE.Vector3
  visible: boolean
  tone: 'warn' | 'danger'
  icon: string
  title: string
  subtitle: string
}) {
  if (!visible) return null
  return (
    <Html position={position} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
      <div className={`intro-pin intro-pin-${tone}`}>
        <span className="intro-pin-icon">{icon}</span>
        <div className="intro-pin-text">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>
    </Html>
  )
}

export default function GlobeIntroScene({ phase }: { phase: number }) {
  const globe = useRef<THREE.Group>(null)
  const scan = useRef<THREE.Mesh>(null)
  const targetRot = useRef({ y: 0.85, x: -0.22 })

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (globe.current) {
      if (phase < 3) {
        globe.current.rotation.y += dt * 0.35
        globe.current.rotation.x = THREE.MathUtils.lerp(globe.current.rotation.x, -0.15, dt * 2)
      } else {
        globe.current.rotation.y = THREE.MathUtils.lerp(globe.current.rotation.y, targetRot.current.y, dt * 1.8)
        globe.current.rotation.x = THREE.MathUtils.lerp(globe.current.rotation.x, targetRot.current.x, dt * 1.8)
      }
    }
    if (scan.current && phase >= 2) {
      scan.current.rotation.z += dt * 0.4
      const mat = scan.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.12 + Math.sin(t * 2) * 0.04
    }
  })

  const hormuz = latLon(26.5, 56, R + 0.12)
  const gulfEntry = latLon(27, 50, R + 0.12)

  return (
    <>
      <color attach="background" args={['#030303']} />
      <fog attach="fog" args={['#030303', 8, 22]} />

      <ambientLight intensity={0.06} />
      <directionalLight position={[6, 3, 5]} intensity={2.2} color="#f8fafc" />
      <directionalLight position={[-4, -1, -3]} intensity={0.08} color="#1e293b" />
      <pointLight position={[3, 1, 2]} intensity={0.6} color="#fbbf24" distance={12} />

      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[R, 64, 64]} />
          <meshStandardMaterial color="#050505" roughness={0.85} metalness={0.15} />
        </mesh>

        {LANDS.map((l, i) => (
          <LandBlob key={i} {...l} />
        ))}

        <ThreatZone visible={phase >= 3} />
        <RouteArc visible={phase >= 3} />

        <mesh position={latLon(26.5, 56, R + 0.01)}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>

        <PinLabel
          position={hormuz}
          visible={phase >= 4}
          tone="warn"
          icon="!"
          title="STRAIT OF HORMUZ"
          subtitle="TANKER ROUTE"
        />
        <PinLabel
          position={gulfEntry}
          visible={phase >= 5}
          tone="danger"
          icon="⚠"
          title="COASTAL THREAT ZONE"
          subtitle="MISSILE CORRIDOR"
        />
      </group>

      <mesh ref={scan} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R + 0.35, R + 0.55, 64]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {phase >= 2 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[R + 0.7, R + 0.72, 64]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}
