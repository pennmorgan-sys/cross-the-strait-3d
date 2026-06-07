import { useSyncExternalStore } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { useGame } from '../store'
import { getLevel, isPeacefulLevel } from '../levels'
import { skyForLevel } from '../systems/settings'
import { getCaps, getCanvasDpr, perfState, subscribePerf } from '../systems/performance'
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
  const peaceful = isPeacefulLevel(level)
  const sky = skyForLevel(level.sky, nightMode)
  const caps = getCaps()
  const bloomBase = nightMode ? 0.5 : perfState.tier === 'high' ? 0.42 : 0.28
  const usePost = caps.postfx && fxMul > 0.05
  const useBloom = caps.bloom && fxMul > 0.15

  return (
    <Canvas
      shadows={caps.shadows}
      dpr={getCanvasDpr()}
      frameloop={paused ? 'never' : 'always'}
      gl={{
        antialias: perfState.tier !== 'mobile',
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      }}
      camera={{ fov: 66, near: 0.1, far: 360, position: [0, 5, 11] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = nightMode ? 1.12 : 1.42
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.shadowMap.enabled = caps.shadows
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}
    >
      <color attach="background" args={[sky.bottom]} />
      <fog attach="fog" args={[sky.fog, nightMode ? 55 : 75, nightMode ? 225 : 270]} />

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
      {!peaceful && <Hazards />}
      {!peaceful && <Bombs />}
      <Pickups />
      <Particles />

      {usePost && (
        <EffectComposer multisampling={caps.bloomMultisampling}>
          {useBloom ? (
            <Bloom
              mipmapBlur
              intensity={bloomBase * fxMul}
              luminanceThreshold={nightMode ? 0.44 : 0.62}
              luminanceSmoothing={0.28}
              radius={0.58}
            />
          ) : (
            <></>
          )}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} adaptive={false} resolution={128} />
          <Vignette
            eskil={false}
            offset={0.28}
            darkness={(nightMode ? 0.42 : 0.24) * fxMul}
          />
        </EffectComposer>
      )}
    </Canvas>
  )
}
