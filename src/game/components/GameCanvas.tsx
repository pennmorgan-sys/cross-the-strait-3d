import { useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGame } from '../store'
import { getLevel } from '../levels'
import { skyForLevel } from '../systems/settings'
import { getCaps, perfState, subscribePerf } from '../systems/performance'
import Ocean from './Ocean'
import Lighting from './Lighting'
import StraitScenery from './StraitScenery'
import FollowCamera from './FollowCamera'
import PlayerBoat from './PlayerBoat'
import Hazards from './Hazards'
import Bombs from './Bombs'
import Pickups from './Pickups'
import Particles from './Particles'
import PerfTicker from './PerfTicker'
import GlPerfTune from './GlPerfTune'

function useFxMul() {
  return useSyncExternalStore(
    subscribePerf,
    () => perfState.fxMul,
    () => perfState.fxMul,
  )
}

export default function GameCanvas() {
  const selectedLevel = useGame((s) => s.selectedLevel)
  const nightMode = useGame((s) => s.nightMode)
  const paused = useGame((s) => s.paused)
  const fxMul = useFxMul()
  const level = getLevel(selectedLevel)
  const sky = skyForLevel(level.sky, nightMode)
  const caps = getCaps()
  const bloomBase = nightMode ? 1.05 : 0.85
  const usePost = caps.postfx && fxMul > 0.08

  return (
    <Canvas
      shadows={caps.shadows}
      dpr={caps.dpr}
      frameloop={paused ? 'never' : 'always'}
      gl={{
        antialias: perfState.tier === 'high',
        powerPreference: 'high-performance',
      }}
      camera={{ fov: 68, near: 0.1, far: 340, position: [0, 5, 11] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = nightMode ? 1.08 : 1.32
        gl.shadowMap.enabled = caps.shadows
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={[sky.bottom]} />
      <fog attach="fog" args={[sky.fog, nightMode ? 50 : 68, nightMode ? 210 : 255]} />

      <PerfTicker />
      <GlPerfTune />
      <Lighting level={level} nightMode={nightMode} />
      <StraitScenery
        key={`scene-${level.id}-${nightMode}`}
        level={level}
        sky={sky}
        nightMode={nightMode}
      />
      <Ocean key={`ocean-${level.id}-${nightMode}`} sky={sky} nightMode={nightMode} />

      <FollowCamera />
      <PlayerBoat />
      <Hazards />
      <Bombs />
      <Pickups />
      <Particles />

      {usePost && (
        <EffectComposer multisampling={caps.bloomMultisampling}>
          {caps.bloom && fxMul > 0.2 ? (
            <Bloom
              mipmapBlur
              intensity={bloomBase * fxMul}
              luminanceThreshold={nightMode ? 0.32 : 0.45}
              luminanceSmoothing={0.2}
              radius={0.85}
            />
          ) : (
            <></>
          )}
          <Vignette
            eskil={false}
            offset={0.22}
            darkness={(nightMode ? 0.65 : 0.45) * fxMul}
          />
        </EffectComposer>
      )}
    </Canvas>
  )
}
