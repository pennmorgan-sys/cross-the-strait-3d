import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { COLORS } from '../constants'
import { runtime, isSlow } from '../runtime'
import { waveHeight } from '../waves'
import { useGame } from '../store'
import { rand } from '../systems/math'
import { glowTexture } from '../systems/glow'
import { cityTextures } from '../systems/city'
import { FlagClock, FlagPole } from './Flags'
import type { LevelConfig } from '../types'

const playing = () => {
  const { paused, screen } = useGame.getState()
  return screen === 'playing' && !paused
}

// Ships push missile launch origins here; ShipMissiles drains it each frame.
interface Launch {
  x: number
  y: number
  z: number
}
const launchQueue: Launch[] = []

function SkyDome({ level }: { level: LevelConfig }) {
  const ref = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(level.sky.top) },
      bottom: { value: new THREE.Color(level.sky.bottom) },
      haze: { value: new THREE.Color(level.storm ? '#5a3a7a' : '#ff8a5a') },
    }),
    [level.sky.top, level.sky.bottom, level.storm],
  )
  useFrame(() => {
    if (ref.current) ref.current.position.copy(runtime.player)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[250, 32, 20]} />
      <shaderMaterial
        side={THREE.BackSide}
        uniforms={uniforms}
        vertexShader={`varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
        fragmentShader={`
          uniform vec3 top; uniform vec3 bottom; uniform vec3 haze; varying vec3 vP;
          void main(){
            float h = clamp(vP.y/250.0*0.5+0.5,0.0,1.0);
            vec3 col = mix(bottom, top, pow(h, 0.8));
            // war glow on the horizon ahead (-z)
            float horizon = smoothstep(0.55, 0.0, h);
            float front = smoothstep(0.0, -1.0, normalize(vP).z);
            col = mix(col, haze, horizon * front * 0.6);
            gl_FragColor = vec4(col,1.0);
          }
        `}
      />
    </mesh>
  )
}

function Shore({ side }: { side: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.z = runtime.player.z
  })
  return (
    <group ref={ref} position={[side * 42, 0, 0]}>
      {/* dark night landmass */}
      <mesh position={[0, -1, 0]}>
        <boxGeometry args={[34, 4, 480]} />
        <meshStandardMaterial color="#10130f" roughness={1} />
      </mesh>
    </group>
  )
}

// Shared night-city building materials (lit windows via emissiveMap).
let cityMatsCache: THREE.MeshStandardMaterial[] | null = null
function cityMaterials(): THREE.MeshStandardMaterial[] {
  if (!cityMatsCache) {
    cityMatsCache = cityTextures().map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          emissive: new THREE.Color('#ffffff'),
          emissiveMap: tex,
          emissiveIntensity: 1.1,
          color: '#161b26',
          roughness: 0.92,
          metalness: 0.05,
        }),
    )
  }
  return cityMatsCache
}

// A glowing night skyline lining each shore, in two depth bands so the
// horizon is never empty. Scrolls with the player like an endless city.
function City({ side }: { side: 1 | -1 }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.z = runtime.player.z
  })
  const mats = cityMaterials()
  const buildings = useMemo(() => {
    const out: {
      x: number
      y: number
      z: number
      w: number
      d: number
      h: number
      mat: number
    }[] = []
    // near band
    for (let i = 0; i < 16; i++) {
      const h = rand(10, 38)
      out.push({
        x: side * rand(48, 72),
        y: h / 2 - 0.5,
        z: rand(-240, 240),
        w: rand(6, 12),
        d: rand(6, 12),
        h,
        mat: Math.floor(rand(0, mats.length)),
      })
    }
    // far band (taller skyline silhouette)
    for (let i = 0; i < 12; i++) {
      const h = rand(22, 58)
      out.push({
        x: side * rand(80, 120),
        y: h / 2 - 0.5,
        z: rand(-260, 260),
        w: rand(8, 16),
        d: rand(8, 16),
        h,
        mat: Math.floor(rand(0, mats.length)),
      })
    }
    return out
  }, [side, mats.length])

  const fires = useMemo(
    () =>
      Array.from({ length: 5 }, () => ({
        x: side * rand(48, 100),
        y: rand(2, 10),
        z: rand(-240, 240),
        phase: rand(0, 10),
      })),
    [side],
  )

  return (
    <group ref={ref}>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} material={mats[b.mat]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
        </mesh>
      ))}
      {/* burning-city glows at building bases */}
      {fires.map((f, i) => (
        <Fire key={`f${i}`} x={f.x} y={f.y} z={f.z} phase={f.phase} />
      ))}
    </group>
  )
}

function Fire({ x, y, z, phase }: { x: number; y: number; z: number; phase: number }) {
  const ref = useRef<THREE.Sprite>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) {
      const flick = 0.6 + Math.sin(t * 9 + phase) * 0.25 + Math.sin(t * 23 + phase) * 0.12
      const s = 5 + flick * 4
      ref.current.scale.set(s, s * 1.3, 1)
      ;(ref.current.material as THREE.SpriteMaterial).opacity = 0.45 + flick * 0.4
    }
  })
  return (
    <sprite ref={ref} position={[x, y, z]} scale={[6, 8, 1]}>
      <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  )
}

// Moon + stars to fill the night sky.
function NightSky() {
  const moonRef = useRef<THREE.Group>(null)
  const starRef = useRef<THREE.Group>(null)
  useFrame(() => {
    if (moonRef.current) {
      moonRef.current.position.set(
        runtime.player.x + 70,
        78,
        runtime.player.z - 170,
      )
    }
    if (starRef.current) starRef.current.position.copy(runtime.player)
  })
  return (
    <>
      <group ref={starRef}>
        <Stars radius={240} depth={70} count={1800} factor={6} saturation={0} fade speed={0.6} />
      </group>
      <group ref={moonRef}>
        <mesh>
          <sphereGeometry args={[10, 24, 24]} />
          <meshBasicMaterial color="#eaf0ff" />
        </mesh>
        <sprite scale={[44, 44, 1]}>
          <spriteMaterial map={glowTexture()} color="#bcd0ff" transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
    </>
  )
}

function FinishGate({ level }: { level: LevelConfig }) {
  const z = -level.length
  return (
    <group position={[0, 0, z]}>
      {[-9, 9].map((x) => (
        <mesh key={x} position={[x, 5, 0]}>
          <boxGeometry args={[1.2, 10, 1.2]} />
          <meshStandardMaterial color={COLORS.radarGreen} emissive={COLORS.radarGreen} emissiveIntensity={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 10, 0]}>
        <boxGeometry args={[20, 1.4, 1.2]} />
        <meshStandardMaterial color={COLORS.radarGreen} emissive={COLORS.radarGreen} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 6]} />
        <meshBasicMaterial color={COLORS.radarGreen} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// A stylized American-style supercarrier flanking the corridor.
function Carrier({
  side,
  zOffset,
  dist,
}: {
  side: 1 | -1
  zOffset: number
  dist: number
}) {
  const ref = useRef<THREE.Group>(null)
  const flashRef = useRef<THREE.Sprite>(null)
  const fireTimer = useRef(rand(2, 5))
  const flash = useRef(0)
  useFrame((state, dt) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const z = runtime.player.z + zOffset
    const x = side * dist
    ref.current.position.set(x, waveHeight(x, z, t) - 0.5, z)
    ref.current.rotation.z = Math.sin(t * 0.3 + zOffset) * 0.01
    // Periodically launch a missile from the deck.
    if (playing()) {
      fireTimer.current -= dt
      if (fireTimer.current <= 0) {
        fireTimer.current = rand(2.5, 5.5)
        launchQueue.push({ x, y: 7, z })
        flash.current = 1
      }
      flash.current = Math.max(0, flash.current - dt * 3)
    }
    if (flashRef.current) {
      const s = 2 + flash.current * 5
      flashRef.current.scale.set(s, s, 1)
      ;(flashRef.current.material as THREE.SpriteMaterial).opacity = flash.current
    }
  })
  const jets = useMemo(
    () => Array.from({ length: 4 }, (_, i) => ({ x: rand(-3, 3), z: 8 - i * 6 + rand(-1, 1) })),
    [],
  )
  return (
    <group ref={ref} rotation={[0, side > 0 ? 0.12 : -0.12, 0]}>
      {/* hull */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[13, 4, 62]} />
        <meshStandardMaterial color="#3a4450" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* waterline */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[13.4, 1.2, 62]} />
        <meshStandardMaterial color="#161b22" roughness={0.9} />
      </mesh>
      {/* flight deck */}
      <mesh position={[0, 3.7, 0]}>
        <boxGeometry args={[16, 0.5, 64]} />
        <meshStandardMaterial color="#23262b" roughness={0.95} />
      </mesh>
      {/* angled runway centerline */}
      <mesh position={[-1.5, 4.0, 0]} rotation={[-Math.PI / 2, 0, 0.16]}>
        <planeGeometry args={[2.2, 56]} />
        <meshBasicMaterial color="#d7e2ee" transparent opacity={0.5} />
      </mesh>
      {/* island superstructure (starboard) */}
      <mesh position={[6, 6.2, -6]}>
        <boxGeometry args={[2.6, 5, 9]} />
        <meshStandardMaterial color="#2a2f36" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[6, 9.4, -6]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#11151a" />
      </mesh>
      <sprite position={[6, 11.6, -6]} scale={[1.4, 1.4, 1]}>
        <spriteMaterial map={glowTexture()} color={COLORS.warningRed} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {/* big US ensign on the island + a stern flagstaff */}
      <group position={[6, 8.4, -2]} scale={2.2}>
        <FlagPole nation="usa" height={4} flagW={3} flagH={1.9} />
      </group>
      <group position={[0, 4, 28]} scale={1.6}>
        <FlagPole nation="usa" height={3.4} />
      </group>
      {/* parked jets */}
      {jets.map((j, i) => (
        <group key={i} position={[j.x, 4.2, j.z]} rotation={[0, rand(-0.4, 0.4), 0]}>
          <mesh>
            <coneGeometry args={[0.5, 3, 4]} />
            <meshStandardMaterial color="#454c55" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.2, 3.4, 0.5]} />
            <meshStandardMaterial color="#3a4049" />
          </mesh>
        </group>
      ))}
      {/* deck edge lights */}
      <sprite position={[8, 4.1, 24]} scale={[1, 1, 1]}>
        <spriteMaterial map={glowTexture()} color={COLORS.supplyGold} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <sprite position={[-8, 4.1, -24]} scale={[1, 1, 1]}>
        <spriteMaterial map={glowTexture()} color={COLORS.supplyGold} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      {/* missile launch flash */}
      <sprite ref={flashRef} position={[0, 5.5, 6]} scale={[2, 2, 1]}>
        <spriteMaterial map={glowTexture()} color="#fff0b0" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  )
}

function Fleet() {
  return (
    <>
      <Carrier side={-1} zOffset={-70} dist={62} />
      <Carrier side={1} zOffset={-130} dist={74} />
      <Carrier side={-1} zOffset={-210} dist={90} />
      <Carrier side={1} zOffset={-30} dist={58} />
      <Carrier side={1} zOffset={-180} dist={66} />
      <Carrier side={-1} zOffset={-120} dist={104} />
      <Carrier side={-1} zOffset={-20} dist={88} />
    </>
  )
}

// Shahed-style delta-wing kamikaze drones swarming overhead, flying Iran flags.
function Drones() {
  const COUNT = 36
  const refs = useRef<(THREE.Group | null)[]>([])
  const data = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      x: rand(-40, 40),
      y: rand(20, 46),
      zOff: -30 - (i % 9) * 26 - rand(0, 14),
      vx: rand(7, 16) * (Math.random() < 0.5 ? 1 : -1),
      bank: 0,
    })),
  )
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const moving = playing()
    for (let i = 0; i < COUNT; i++) {
      const d = data.current[i]
      const g = refs.current[i]
      if (moving) {
        d.x += d.vx * dt
        if (d.x > 55) d.vx = -Math.abs(d.vx)
        if (d.x < -55) d.vx = Math.abs(d.vx)
      }
      if (g) {
        g.position.set(d.x, d.y + Math.sin(t * 1.5 + i) * 0.6, runtime.player.z + d.zOff)
        g.rotation.y = d.vx > 0 ? -Math.PI / 2 : Math.PI / 2
        g.rotation.z = Math.sin(t * 2 + i) * 0.12
      }
    }
  })
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          scale={1.4}
        >
          {/* fuselage */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.26, 2.2, 8]} />
            <meshStandardMaterial color="#2b2f26" roughness={0.7} metalness={0.2} />
          </mesh>
          {/* warhead nose */}
          <mesh position={[0, 0, -1.3]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.26, 0.8, 8]} />
            <meshStandardMaterial color="#1c2018" />
          </mesh>
          {/* delta wings */}
          <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.5, 1.7, 3]} />
            <meshStandardMaterial color="#343a2c" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          {/* inverted-V tail */}
          <mesh position={[0.35, 0.25, 1]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.05, 0.6, 0.4]} />
            <meshStandardMaterial color="#2b2f26" />
          </mesh>
          <mesh position={[-0.35, 0.25, 1]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.05, 0.6, 0.4]} />
            <meshStandardMaterial color="#2b2f26" />
          </mesh>
          {/* rear engine glow */}
          <sprite position={[0, 0, 1.3]} scale={[0.8, 0.8, 1]}>
            <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          {/* small Iran flag on a tail mast */}
          <group position={[0, 0.5, 0.9]} scale={0.6} rotation={[0, Math.PI / 2, 0]}>
            <FlagPole nation="iran" height={1.4} flagW={1.2} flagH={0.8} />
          </group>
        </group>
      ))}
    </>
  )
}

// Cruise-missile streaks arcing across the sky with smoke + engine glow.
function Missiles({ level }: { level: LevelConfig }) {
  const COUNT = level.id >= 4 ? 14 : 9
  const headRefs = useRef<(THREE.Sprite | null)[]>([])
  const trailRefs = useRef<(THREE.Mesh | null)[]>([])
  const data = useRef(
    Array.from({ length: 14 }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0 })),
  )
  const timer = useRef(0)
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (playing()) {
      timer.current -= dt
      if (timer.current <= 0) {
        timer.current = rand(0.25, 0.8) * (level.id >= 4 ? 0.6 : 1)
        const d = data.current.find((e) => e.life <= 0)
        if (d) {
          const dir = Math.random() < 0.5 ? 1 : -1
          d.life = d.max = rand(0.9, 1.6)
          d.x = runtime.player.x - dir * 80
          d.y = rand(24, 50)
          d.z = runtime.player.z - rand(30, 160)
          d.vx = dir * rand(90, 150)
          d.vy = -rand(4, 12)
        }
      }
    }
    for (let i = 0; i < COUNT; i++) {
      const d = data.current[i]
      const head = headRefs.current[i]
      const trail = trailRefs.current[i]
      const live = d.life > 0
      if (live && playing()) {
        d.life -= dt
        d.x += d.vx * dt
        d.y += d.vy * dt
      }
      if (head) {
        head.visible = live
        head.position.set(d.x, d.y, d.z)
      }
      if (trail) {
        trail.visible = live
        trail.position.set(d.x - d.vx * 0.02, d.y - d.vy * 0.02, d.z)
        trail.rotation.z = Math.atan2(d.vy, d.vx)
        trail.scale.set(1, 1, 1)
        ;(trail.material as THREE.MeshBasicMaterial).opacity = Math.min(1, d.life / d.max) * 0.5
      }
      void t
    }
  })
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i}>
          <mesh
            ref={(el) => {
              trailRefs.current[i] = el
            }}
            visible={false}
          >
            <boxGeometry args={[7, 0.5, 0.5]} />
            <meshBasicMaterial color="#cfd3d8" transparent opacity={0.4} depthWrite={false} />
          </mesh>
          <sprite
            ref={(el) => {
              headRefs.current[i] = el
            }}
            scale={[2.4, 2.4, 1]}
            visible={false}
          >
            <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  )
}

// The main spectacle: a relentless barrage of bombs raining on both flanks of
// the corridor (visual only, no damage), plus mid-air flak airbursts. This is
// what delivers "hundreds of bombs a minute" without making the lane unfair.
function SkyBarrage({ level }: { level: LevelConfig }) {
  const COUNT = 120
  const SPAWN_Y = 78
  const bodyRefs = useRef<(THREE.Group | null)[]>([])
  const fireRefs = useRef<(THREE.Sprite | null)[]>([])
  const data = useRef(
    Array.from({ length: COUNT }, () => ({
      state: 'idle' as 'idle' | 'fall' | 'boom',
      x: 0,
      y: 0,
      z: 0,
      surf: 0,
      fall: 0,
      boom: 0,
      air: false,
    })),
  )
  const acc = useRef(0)

  // Bombs per second scales hard with level. L1 ~18/s (1080/min) up to ~44/s.
  const perSec =
    level.id >= 5 ? 44 : level.id >= 4 ? 36 : level.id >= 2 ? 26 : 18

  function spawn() {
    const d = data.current.find((e) => e.state === 'idle')
    if (!d) return
    const dir = Math.random() < 0.5 ? 1 : -1
    d.state = 'fall'
    // Land on the flanks (outside the playable corridor) or far downrange.
    d.x = runtime.player.x + dir * rand(13, 95)
    d.z = runtime.player.z - rand(10, 230)
    d.surf = 0
    d.y = SPAWN_Y
    d.fall = rand(0.7, 1.5)
    d.air = Math.random() < 0.42 // many mid-air flak bursts for sky chaos
  }

  useFrame((state, rawDt) => {
    const t = state.clock.elapsedTime
    const slow = isSlow() ? 0.45 : 1
    const dt = Math.min(rawDt, 0.05) * slow
    if (playing()) {
      acc.current += dt * perSec
      let guard = 0
      while (acc.current >= 1 && guard < 40) {
        acc.current -= 1
        spawn()
        guard++
      }
    }

    for (let i = 0; i < COUNT; i++) {
      const d = data.current[i]
      const g = bodyRefs.current[i]
      const f = fireRefs.current[i]
      if (d.state === 'idle') {
        if (g) g.visible = false
        if (f) f.visible = false
        continue
      }

      if (d.state === 'fall') {
        if (playing()) d.fall -= dt
        const groundY = d.air ? rand(14, 30) : waveHeight(d.x, d.z, t)
        const p = 1 - Math.max(d.fall, 0) / 1.5
        d.y = THREE.MathUtils.lerp(SPAWN_Y, groundY, Math.min(1, p * p + 0.05))
        if (g) {
          g.visible = true
          g.position.set(d.x, d.y, d.z)
        }
        if (f) f.visible = false
        if (d.fall <= 0) {
          d.state = 'boom'
          d.boom = rand(0.4, 0.7)
          d.surf = d.air ? d.y : waveHeight(d.x, d.z, t)
          if (g) g.visible = false
        }
      } else {
        if (playing()) d.boom -= dt
        const k = 1 - Math.max(d.boom, 0) / 0.7
        if (f) {
          f.visible = true
          f.position.set(d.x, d.surf + 1.2, d.z)
          const s = 3 + k * 12
          f.scale.set(s, s, 1)
          ;(f.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - k)
        }
        if (d.boom <= 0) {
          d.state = 'idle'
          if (f) f.visible = false
        }
      }
    }
  })

  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i}>
          <group
            ref={(el) => {
              bodyRefs.current[i] = el
            }}
            visible={false}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.4, 0.9, 4, 8]} />
              <meshStandardMaterial color="#120c08" metalness={0.4} roughness={0.6} />
            </mesh>
            {/* orange glow envelope */}
            <sprite position={[0, -0.1, 0]} scale={[2.8, 3.2, 1]}>
              <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            {/* fiery falling streak */}
            <sprite position={[0, 2.4, 0]} scale={[1.7, 6, 1]}>
              <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
            {/* hot core */}
            <sprite position={[0, -0.55, 0]} scale={[1, 1, 1]}>
              <spriteMaterial map={glowTexture()} color="#ffe6a0" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
            </sprite>
          </group>
          <sprite
            ref={(el) => {
              fireRefs.current[i] = el
            }}
            visible={false}
            scale={[5, 5, 1]}
          >
            <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  )
}

function DistantExplosions() {
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const data = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      t: rand(0, 4),
      x: (i % 2 === 0 ? -1 : 1) * rand(55, 130),
      z: -rand(60, 220),
      y: rand(4, 26),
    })),
  )
  useFrame((_, dt) => {
    const moving = playing()
    for (let i = 0; i < data.current.length; i++) {
      const d = data.current[i]
      const m = refs.current[i]
      if (moving) {
        d.t -= dt
        if (d.t <= 0) {
          d.t = rand(1, 4)
          d.x = runtime.player.x + (Math.random() < 0.5 ? -1 : 1) * rand(55, 130)
          d.z = -rand(60, 220)
          d.y = rand(4, 26)
        }
      }
      if (m) {
        const k = 1 - d.t / 4
        const flare = Math.abs(Math.sin(k * 6))
        m.position.set(d.x, d.y, runtime.player.z + d.z)
        const s = 6 + flare * 16
        m.scale.set(s, s, 1)
        ;(m.material as THREE.SpriteMaterial).opacity = (0.2 + flare * 0.6) * (moving ? 1 : 0.5)
      }
    }
  })
  return (
    <>
      {Array.from({ length: 16 }, (_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          scale={[10, 10, 1]}
        >
          <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </>
  )
}

function Searchlights() {
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < refs.current.length; i++) {
      const g = refs.current[i]
      if (g) {
        g.position.set(Math.sin(t * 0.4 + i) * 20, 26, runtime.player.z - 30 - i * 40)
        g.rotation.z = Math.sin(t * 0.6 + i) * 0.6
      }
    }
  })
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <mesh position={[0, -13, 0]}>
            <coneGeometry args={[10, 26, 16, 1, true]} />
            <meshBasicMaterial color={COLORS.supplyGold} transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Embers() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.position.set(runtime.player.x, 8, runtime.player.z - 20)
  })
  return (
    <group ref={ref}>
      <Sparkles count={90} scale={[80, 26, 90]} size={5} speed={0.5} opacity={0.7} color={COLORS.explosionOrange} />
      <Sparkles count={50} scale={[70, 20, 80]} size={3} speed={0.3} opacity={0.5} color={COLORS.supplyGold} />
    </group>
  )
}

// Iranian fast-attack craft swarming the flanks, flying Iran flags + firing.
function IranianFleet() {
  const COUNT = 14
  const refs = useRef<(THREE.Group | null)[]>([])
  const flashRefs = useRef<(THREE.Sprite | null)[]>([])
  const data = useRef(
    Array.from({ length: COUNT }, (_, i) => ({
      side: (i % 2 === 0 ? -1 : 1) as 1 | -1,
      baseX: 13 + (i % 6) * 6,
      zOff: -16 - i * 11,
      phase: rand(0, 10),
      speed: rand(0.5, 1.1),
      fireTimer: rand(1.5, 5),
      flash: 0,
    })),
  )
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const play = playing()
    for (let i = 0; i < COUNT; i++) {
      const d = data.current[i]
      const g = refs.current[i]
      if (!g) continue
      const x = d.side * (d.baseX + Math.sin(t * d.speed + d.phase) * 4)
      const z = runtime.player.z + d.zOff
      const y = waveHeight(x, z, t) - 0.1
      g.position.set(x, y, z)
      g.rotation.y = Math.sin(t * d.speed + d.phase) * 0.3 + (d.side > 0 ? -0.2 : 0.2)
      g.rotation.z = Math.sin(t * 1.4 + d.phase) * 0.05
      // Fire missiles toward the corridor.
      if (play) {
        d.fireTimer -= dt
        if (d.fireTimer <= 0) {
          d.fireTimer = rand(2.2, 5)
          launchQueue.push({ x, y: y + 1.6, z })
          d.flash = 1
        }
        d.flash = Math.max(0, d.flash - dt * 3)
      }
      const fl = flashRefs.current[i]
      if (fl) {
        const s = 1 + d.flash * 3
        fl.scale.set(s, s, 1)
        ;(fl.material as THREE.SpriteMaterial).opacity = d.flash
      }
    }
  })
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          scale={1.3}
        >
          {/* missile launch flash */}
          <sprite
            ref={(el) => {
              flashRefs.current[i] = el
            }}
            position={[0, 1.3, -1.6]}
            scale={[1, 1, 1]}
          >
            <spriteMaterial map={glowTexture()} color="#fff0b0" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          {/* hull */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.4, 0.5, 4]} />
            <meshStandardMaterial color="#4b5a4a" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.3, -2.4]} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
            <coneGeometry args={[0.7, 1.2, 4]} />
            <meshStandardMaterial color="#566b53" roughness={0.6} />
          </mesh>
          {/* cabin */}
          <mesh position={[0, 0.75, 0.3]}>
            <boxGeometry args={[0.9, 0.55, 1.2]} />
            <meshStandardMaterial color="#37432f" />
          </mesh>
          {/* deck gun */}
          <mesh position={[0, 0.7, -1.4]} rotation={[Math.PI / 2.5, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 1.1, 6]} />
            <meshStandardMaterial color="#1c2218" metalness={0.5} />
          </mesh>
          {/* muzzle flash */}
          <sprite position={[0, 0.95, -2.1]} scale={[1.1, 1.1, 1]}>
            <spriteMaterial
              map={glowTexture()}
              color={COLORS.explosionOrange}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
          {/* Iran flag */}
          <group position={[0, 0.9, 1.7]} scale={0.9}>
            <FlagPole nation="iran" height={2.6} flagW={1.9} flagH={1.2} />
          </group>
          {/* wake */}
          <mesh position={[0, -0.18, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2, 4]} />
            <meshBasicMaterial color={COLORS.tealWake} transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// Flag buoys lining the corridor edges, alternating nations, scrolling past.
function FlagBuoys() {
  const COUNT = 12
  const refs = useRef<(THREE.Group | null)[]>([])
  const zPos = useRef<number[]>([])
  if (zPos.current.length === 0) {
    zPos.current = Array.from({ length: COUNT }, (_, i) => -i * 22)
  }
  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      const g = refs.current[i]
      if (!g) continue
      // Recycle ahead when they drift behind the player.
      if (zPos.current[i] > runtime.player.z + 24) {
        zPos.current[i] -= COUNT * 22
      }
      const side = i % 2 === 0 ? -1 : 1
      const x = side * (11.5 + (i % 3))
      const z = zPos.current[i]
      g.position.set(x, waveHeight(x, z, t) - 0.3, z)
      g.rotation.z = Math.sin(t * 1.2 + i) * 0.06
    }
  })
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          {/* float */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.5, 0.7, 0.5, 8]} />
            <meshStandardMaterial color="#c2351f" roughness={0.6} />
          </mesh>
          <FlagPole nation={i % 2 === 0 ? 'iran' : 'usa'} height={3} flagW={2} flagH={1.3} />
        </group>
      ))}
    </>
  )
}

// Glowing tracer streaks crisscrossing the sky for relentless crossfire.
function Tracers({ level }: { level: LevelConfig }) {
  const N = 42
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const data = useRef(
    Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0 })),
  )
  const timer = useRef(0)
  const fire = new THREE.Color(COLORS.explosionOrange)
  const gold = new THREE.Color(COLORS.supplyGold)
  const purple = new THREE.Color(COLORS.stormPurple)
  useFrame((_, dt) => {
    if (playing()) {
      timer.current -= dt
      if (timer.current <= 0) {
        timer.current = (level.id >= 4 ? 0.12 : 0.28) * rand(0.5, 1.5)
        const d = data.current.find((e) => e.life <= 0)
        if (d) {
          const dir = Math.random() < 0.5 ? 1 : -1
          d.life = d.max = rand(0.5, 1.0)
          d.x = runtime.player.x - dir * 75
          d.y = rand(20, 52)
          d.z = runtime.player.z - rand(20, 170)
          d.vx = dir * rand(120, 190)
          d.vy = -rand(2, 14)
          const m = refs.current[data.current.indexOf(d)]
          if (m) {
            ;(m.material as THREE.MeshBasicMaterial).color.copy(
              level.storm && Math.random() < 0.4 ? purple : Math.random() < 0.5 ? fire : gold,
            )
          }
        }
      }
    }
    for (let i = 0; i < N; i++) {
      const d = data.current[i]
      const m = refs.current[i]
      if (!m) continue
      if (d.life <= 0) {
        m.visible = false
        continue
      }
      if (playing()) {
        d.life -= dt
        d.x += d.vx * dt
        d.y += d.vy * dt
      }
      m.visible = true
      m.position.set(d.x, d.y, d.z)
      m.rotation.z = Math.atan2(d.vy, d.vx)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, d.life / d.max)
    }
  })
  return (
    <>
      {Array.from({ length: N }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          visible={false}
        >
          <boxGeometry args={[8, 0.16, 0.16]} />
          <meshBasicMaterial color={COLORS.explosionOrange} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

// Fighter jets screaming across the sky with afterburners + contrails.
function Jets({ level }: { level: LevelConfig }) {
  const COUNT = level.id >= 4 ? 5 : 3
  const refs = useRef<(THREE.Group | null)[]>([])
  const data = useRef(
    Array.from({ length: 5 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, dir: 1 })),
  )
  const timer = useRef(1.5)
  useFrame((_, dt) => {
    if (playing()) {
      timer.current -= dt
      if (timer.current <= 0) {
        timer.current = rand(1.2, 3.2)
        const d = data.current.find((e) => e.life <= 0)
        if (d) {
          d.dir = Math.random() < 0.5 ? 1 : -1
          d.life = rand(2, 3)
          d.x = runtime.player.x - d.dir * 95
          d.y = rand(28, 56)
          d.z = runtime.player.z - rand(40, 150)
          d.vx = d.dir * rand(80, 120)
        }
      }
    }
    for (let i = 0; i < COUNT; i++) {
      const d = data.current[i]
      const g = refs.current[i]
      if (!g) continue
      if (d.life <= 0) {
        g.visible = false
        continue
      }
      if (playing()) {
        d.life -= dt
        d.x += d.vx * dt
      }
      g.visible = true
      g.position.set(d.x, d.y, d.z)
      g.rotation.y = d.dir > 0 ? -Math.PI / 2 : Math.PI / 2
    }
  })
  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          scale={2}
          visible={false}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.3, 2.4, 6]} />
            <meshStandardMaterial color="#3a4049" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[1.5, 1.1, 3]} />
            <meshStandardMaterial color="#2d333b" side={THREE.DoubleSide} />
          </mesh>
          {/* afterburner */}
          <sprite position={[0, 0, 1.5]} scale={[1.4, 1.4, 1]}>
            <spriteMaterial map={glowTexture()} color={COLORS.tealWake} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          {/* contrail */}
          <sprite position={[0, 0, 5]} scale={[2, 9, 1]}>
            <spriteMaterial map={glowTexture()} color="#dfe6ee" transparent opacity={0.32} depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  )
}

// Diagonal meteor-shower streaks raining across the sky (additive → bloom).
function MeteorStreaks() {
  const N = 34
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const data = useRef(
    Array.from({ length: N }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0 })),
  )
  const timer = useRef(0)
  const fire = new THREE.Color(COLORS.explosionOrange)
  const gold = new THREE.Color(COLORS.supplyGold)
  useFrame((_, dt) => {
    if (playing()) {
      timer.current -= dt
      if (timer.current <= 0) {
        timer.current = rand(0.06, 0.2)
        const d = data.current.find((e) => e.life <= 0)
        if (d) {
          d.life = d.max = rand(0.7, 1.4)
          d.x = runtime.player.x + rand(-85, 85)
          d.y = rand(42, 72)
          d.z = runtime.player.z - rand(20, 200)
          d.vx = rand(-22, 22)
          d.vy = -rand(34, 64)
          const m = refs.current[data.current.indexOf(d)]
          if (m) (m.material as THREE.MeshBasicMaterial).color.copy(Math.random() < 0.6 ? fire : gold)
        }
      }
    }
    for (let i = 0; i < N; i++) {
      const d = data.current[i]
      const m = refs.current[i]
      if (!m) continue
      if (d.life <= 0) {
        m.visible = false
        continue
      }
      if (playing()) {
        d.life -= dt
        d.x += d.vx * dt
        d.y += d.vy * dt
      }
      m.visible = true
      m.position.set(d.x, d.y, d.z)
      m.rotation.z = Math.atan2(d.vy, d.vx)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, d.life / d.max) * 0.95
    }
  })
  return (
    <>
      {Array.from({ length: N }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          visible={false}
        >
          <boxGeometry args={[5, 0.13, 0.13]} />
          <meshBasicMaterial color={COLORS.explosionOrange} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}

// Missiles fired by the ships: arc up off the decks, then airburst.
function ShipMissiles() {
  const COUNT = 30
  const headRefs = useRef<(THREE.Sprite | null)[]>([])
  const tailRefs = useRef<(THREE.Sprite | null)[]>([])
  const boomRefs = useRef<(THREE.Sprite | null)[]>([])
  const data = useRef(
    Array.from({ length: COUNT }, () => ({
      state: 'idle' as 'idle' | 'fly' | 'boom',
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      boom: 0,
    })),
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const play = playing()

    if (!play) {
      launchQueue.length = 0
    } else {
      // Drain queued launches into idle slots.
      let guard = 0
      while (launchQueue.length > 0 && guard < 40) {
        guard++
        const o = launchQueue.shift()!
        const slot = data.current.find((d) => d.state === 'idle')
        if (!slot) break
        slot.state = 'fly'
        slot.x = o.x
        slot.y = o.y
        slot.z = o.z
        slot.vx = (runtime.player.x - o.x) * 0.18 + rand(-7, 7)
        slot.vy = rand(20, 30)
        slot.vz = -rand(8, 26)
        slot.life = rand(2.2, 3.2)
        slot.boom = 0
      }
    }

    for (let i = 0; i < COUNT; i++) {
      const d = data.current[i]
      const head = headRefs.current[i]
      const tail = tailRefs.current[i]
      const boom = boomRefs.current[i]

      if (d.state === 'fly') {
        if (play) {
          d.life -= dt
          d.vy -= 9 * dt
          d.x += d.vx * dt
          d.y += d.vy * dt
          d.z += d.vz * dt
        }
        if (head) {
          head.visible = true
          head.position.set(d.x, d.y, d.z)
        }
        if (tail) {
          tail.visible = true
          tail.position.set(d.x - d.vx * 0.04, d.y - d.vy * 0.04, d.z - d.vz * 0.04)
        }
        if (boom) boom.visible = false
        if (d.life <= 0) {
          d.state = 'boom'
          d.boom = 0.45
        }
      } else if (d.state === 'boom') {
        if (play) d.boom -= dt
        const k = 1 - Math.max(d.boom, 0) / 0.45
        if (head) head.visible = false
        if (tail) tail.visible = false
        if (boom) {
          boom.visible = true
          boom.position.set(d.x, d.y, d.z)
          const s = 3 + k * 12
          boom.scale.set(s, s, 1)
          ;(boom.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - k)
        }
        if (d.boom <= 0) {
          d.state = 'idle'
          if (boom) boom.visible = false
        }
      } else {
        if (head) head.visible = false
        if (tail) tail.visible = false
        if (boom) boom.visible = false
      }
    }
  })

  return (
    <>
      {Array.from({ length: COUNT }, (_, i) => (
        <group key={i}>
          <sprite
            ref={(el) => {
              tailRefs.current[i] = el
            }}
            visible={false}
            scale={[1.8, 1.8, 1]}
          >
            <spriteMaterial map={glowTexture()} color="#ffae5a" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          <sprite
            ref={(el) => {
              headRefs.current[i] = el
            }}
            visible={false}
            scale={[2.2, 2.2, 1]}
          >
            <spriteMaterial map={glowTexture()} color="#fff0b0" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
          <sprite
            ref={(el) => {
              boomRefs.current[i] = el
            }}
            visible={false}
            scale={[6, 6, 1]}
          >
            <spriteMaterial map={glowTexture()} color={COLORS.explosionOrange} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  )
}

export default function Scenery({ level }: { level: LevelConfig }) {
  return (
    <>
      <FlagClock />
      <SkyDome level={level} />
      <NightSky />
      <Shore side={1} />
      <Shore side={-1} />
      <City side={1} />
      <City side={-1} />
      <FinishGate level={level} />
      <Fleet />
      <IranianFleet />
      <ShipMissiles />
      <FlagBuoys />
      <Drones />
      <Jets level={level} />
      <Missiles level={level} />
      <Tracers level={level} />
      <MeteorStreaks />
      <SkyBarrage level={level} />
      <DistantExplosions />
      <Embers />
      {level.searchlights && <Searchlights />}
    </>
  )
}
