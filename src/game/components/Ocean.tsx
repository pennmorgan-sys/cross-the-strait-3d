import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WAVE_GLSL } from '../waves'
import { runtime, isSafeWater, progress } from '../runtime'
import { damp } from '../systems/math'
import { getCaps, oceanQuality, perfState } from '../systems/performance'

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uCheap;
uniform vec3 uOffset;
varying float vHeight;
varying vec3 vWorld;
varying float vSlopeX;
varying float vSlopeZ;

${WAVE_GLSL}

void main() {
  float wx = position.x + uOffset.x;
  float wz = -position.y + uOffset.z;
  float h = waveHeight(wx, wz, uTime) * (1.0 - uCheap * 0.35);

  float e = 0.75;
  if (uCheap > 0.4) {
    vSlopeX = 0.0;
    vSlopeZ = 0.0;
  } else {
    vSlopeX = waveHeight(wx + e, wz, uTime) - h;
    vSlopeZ = waveHeight(wx, wz + e, uTime) - h;
  }

  vec3 p = position;
  p.z += h;
  vHeight = h;
  vWorld = vec3(wx, h, wz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uBoost;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uCrest;
uniform vec3 uFog;
uniform vec3 uPlayer;
uniform float uCalm;
varying float vHeight;
varying vec3 vWorld;
varying float vSlopeX;
varying float vSlopeZ;

float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5); }

void main() {
  vec3 n = normalize(vec3(-vSlopeX, 1.0, -vSlopeZ));
  float depthMix = smoothstep(-0.6, 0.9, vHeight);
  vec3 col = mix(uDeep, uShallow, depthMix * 0.7 + 0.12);
  float band = sin(vWorld.z * 0.22 + uTime * 3.2);
  float foamBands = smoothstep(0.82, 1.0, band) * 0.18;
  col += foamBands * uCrest;
  float crest = smoothstep(0.28, 0.72, vHeight);
  col = mix(col, uCrest, crest * 0.55);
  float sparkle = hash(floor(vWorld.xz * 1.3) + floor(uTime * 6.0));
  col += crest * step(0.93, sparkle) * 0.35;
  vec3 viewDir = normalize(vec3(uPlayer.x, 6.0, uPlayer.z + 12.0) - vWorld);
  float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
  col += fres * uCrest * 0.4;
  if (uBoost > 0.01) {
    float s = smoothstep(0.96, 1.0, sin(vWorld.z * 1.2 + uTime * 26.0))
            * smoothstep(2.5, 0.0, abs(vWorld.x - uPlayer.x));
    col += s * uBoost * uCrest * 1.2;
  }
  float d = distance(vWorld.xz, uPlayer.xz);
  float fog = smoothstep(60.0, 180.0, d);
  col = mix(col, uFog, fog);
  vec3 calmCol = mix(col, vec3(0.15, 0.55, 0.62), uCalm * 0.35);
  col = mix(col, calmCol, uCalm);
  gl_FragColor = vec4(col, 1.0);
}
`

function OceanCheap({ nightMode }: { nightMode?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = useMemo(
    () => new THREE.Color(nightMode ? '#0a3d52' : '#0B5F7A'),
    [nightMode],
  )

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.position.set(
      runtime.player.x,
      runtime.seaLevel - 0.15,
      runtime.player.z,
    )
  })

  const [w, h] = perfState.tier === 'mobile' ? [24, 36] : [32, 48]
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[320, 480, w, h]} />
      <meshStandardMaterial
        color={color}
        emissive={nightMode ? '#0d4a62' : '#087EA4'}
        emissiveIntensity={0.12}
        roughness={0.35}
        metalness={0.08}
      />
    </mesh>
  )
}

function OceanShader({
  sky,
  nightMode = false,
}: {
  sky: { fog: string }
  nightMode?: boolean
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const boostVal = useRef(0)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBoost: { value: 0 },
      uOffset: { value: new THREE.Vector3() },
      uPlayer: { value: new THREE.Vector3() },
      uShallow: { value: new THREE.Color(nightMode ? '#0d4a62' : '#087EA4') },
      uDeep: { value: new THREE.Color(nightMode ? '#031820' : '#0B5F7A') },
      uCrest: { value: new THREE.Color(nightMode ? '#3a8fa8' : '#67E8F9') },
      uFog: { value: new THREE.Color(sky.fog) },
      uCalm: { value: 0 },
      uCheap: { value: 0 },
    }),
    [sky.fog, nightMode],
  )

  const calmVal = useRef(0)
  const [segW, segH] = useMemo(() => getCaps().oceanSegments, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const target = runtime.boosting ? 1 : 0
    boostVal.current += (target - boostVal.current) * damp(6, Math.min(dt, 0.05))
    const calmTarget = isSafeWater()
      ? 1
      : Math.max(0, (progress() - 0.72) / 0.2)
    calmVal.current += (calmTarget - calmVal.current) * damp(3, Math.min(dt, 0.05))
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t
      matRef.current.uniforms.uBoost.value = boostVal.current
      matRef.current.uniforms.uCalm.value = calmVal.current
      matRef.current.uniforms.uCheap.value = oceanQuality()
    }
    if (meshRef.current) {
      meshRef.current.position.x = runtime.player.x
      meshRef.current.position.z = runtime.player.z
      uniforms.uOffset.value.set(runtime.player.x, 0, runtime.player.z)
      uniforms.uPlayer.value.copy(runtime.player)
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[320, 480, segW, segH]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}

export default function Ocean(props: {
  sky: { fog: string }
  nightMode?: boolean
}) {
  const useCheap = useMemo(() => oceanQuality() >= 0.55, [])
  return useCheap ? <OceanCheap {...props} /> : <OceanShader {...props} />
}
