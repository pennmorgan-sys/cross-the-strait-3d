import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { iranFlagTexture, usaFlagTexture } from '../systems/flags'

export type Nation = 'iran' | 'usa'

// One shared time uniform ticked once per frame by <FlagClock/>, referenced by
// both shared flag materials. Keeps hundreds of waving flags cheap.
const flagTime = { value: 0 }

const vertexShader = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float d = uv.x; // 0 at pole, 1 at free edge
  float wave = sin(d * 7.0 - uTime * 7.0) * 0.16 * d
             + sin(d * 13.0 - uTime * 11.0) * 0.06 * d;
  p.z += wave;
  p.y += sin(d * 5.0 - uTime * 6.0) * 0.04 * d;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv);
}
`

let iranMat: THREE.ShaderMaterial | null = null
let usaMat: THREE.ShaderMaterial | null = null

function material(nation: Nation): THREE.ShaderMaterial {
  if (nation === 'iran') {
    if (!iranMat) {
      iranMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: iranFlagTexture() }, uTime: flagTime },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
      })
    }
    return iranMat
  }
  if (!usaMat) {
    usaMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: usaFlagTexture() }, uTime: flagTime },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    })
  }
  return usaMat
}

export function FlagClock() {
  useFrame((state) => {
    flagTime.value = state.clock.elapsedTime
  })
  return null
}

export function WavingFlag({
  nation,
  w = 2.2,
  h = 1.4,
}: {
  nation: Nation
  w?: number
  h?: number
}) {
  // Plane's left edge sits at the local origin (the pole).
  return (
    <mesh material={material(nation)} position={[w / 2, 0, 0]}>
      <planeGeometry args={[w, h, 16, 10]} />
    </mesh>
  )
}

export function FlagPole({
  nation,
  height = 4,
  flagW = 2.4,
  flagH = 1.5,
}: {
  nation: Nation
  height?: number
  flagW?: number
  flagH?: number
}) {
  return (
    <group>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.09, height, 6]} />
        <meshStandardMaterial color="#20262d" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, height + 0.02, 0]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.6} />
      </mesh>
      <group position={[0, height - flagH / 2 - 0.18, 0]}>
        <WavingFlag nation={nation} w={flagW} h={flagH} />
      </group>
    </group>
  )
}
