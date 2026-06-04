import { useThree, useFrame } from '@react-three/fiber'
import { getCaps, perfState } from '../systems/performance'

/** Lowers DPR and shadows when FPS drops — no scene remount */
export default function GlPerfTune() {
  const { gl } = useThree()
  useFrame(() => {
    const caps = getCaps()
    const max = caps.dpr[1] * perfState.dprScale
    const min = caps.dpr[0]
    const target = Math.max(min, Math.min(max, window.devicePixelRatio * perfState.dprScale))
    if (Math.abs(gl.getPixelRatio() - target) > 0.02) {
      gl.setPixelRatio(target)
    }
    const wantShadows = caps.shadows && perfState.fxMul > 0.55
    if (gl.shadowMap.enabled !== wantShadows) {
      gl.shadowMap.enabled = wantShadows
    }
  })
  return null
}
