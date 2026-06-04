import { useFrame } from '@react-three/fiber'
import { runtime } from '../runtime'
import { useGame } from '../store'
import { waveHeight } from '../waves'
import { tickPerformance } from '../systems/performance'

/** Central per-frame: FPS, simActive, shared sea level */
export default function PerfTicker() {
  useFrame((state, dt) => {
    const { paused, screen } = useGame.getState()
    runtime.simActive =
      screen === 'playing' && !paused && runtime.running
    const t = state.clock.elapsedTime
    runtime.seaLevel = waveHeight(runtime.player.x, runtime.player.z, t)
    tickPerformance(dt, runtime.simActive)
  })
  return null
}
