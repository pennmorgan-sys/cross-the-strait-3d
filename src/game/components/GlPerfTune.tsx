import { useThree, useFrame } from '@react-three/fiber'
import { getCaps, perfState, effectivePixelRatio } from '../systems/performance'

/** Applies tier DPR each frame — mobile keeps Retina-sharp ratio, desktop can soft-throttle */
export default function GlPerfTune() {
  const { gl } = useThree()
  useFrame(() => {
    const target = effectivePixelRatio()
    if (Math.abs(gl.getPixelRatio() - target) > 0.02) {
      gl.setPixelRatio(target)
    }
    const caps = getCaps()
    const wantShadows = caps.shadows && perfState.fxMul > 0.4
    if (gl.shadowMap.enabled !== wantShadows) {
      gl.shadowMap.enabled = wantShadows
    }
  })
  return null
}
