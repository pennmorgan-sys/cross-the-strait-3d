import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  effectivePixelRatio,
  getCaps,
  perfState,
  subscribePerf,
  tierDisplayName,
} from '../game/systems/performance'

function readPerf() {
  return {
    visible: perfState.overlayVisible,
    tier: perfState.tier,
    mode: perfState.mode,
    fps: perfState.fps,
    frameMs: perfState.frameMs,
    highRefreshReady: perfState.highRefreshReady,
    performanceReduced: perfState.performanceReduced,
    skyChaosMul: perfState.skyChaosMul,
    counts: { ...perfState.counts },
  }
}

export default function PerformanceOverlay() {
  const visible = useSyncExternalStore(
    subscribePerf,
    () => perfState.overlayVisible,
    () => perfState.overlayVisible,
  )
  const [shown, setShown] = useState(readPerf)

  useEffect(() => {
    if (!visible) return
    setShown(readPerf())
    const id = window.setInterval(() => setShown(readPerf()), 250)
    return () => clearInterval(id)
  }, [visible])

  if (!visible) return null

  const caps = getCaps()
  const dpr =
    typeof window !== 'undefined' ? window.devicePixelRatio.toFixed(2) : '—'

  return (
    <div className="perf-overlay" aria-hidden>
      <div className="perf-title">PERF (F3)</div>
      <div>FPS {shown.fps.toFixed(0)} · {shown.frameMs.toFixed(1)} ms</div>
      <div>
        Quality {tierDisplayName(shown.tier)}
        {shown.mode !== shown.tier && ` (${shown.mode})`}
        {shown.highRefreshReady && ' · High Refresh Ready'}
        {shown.performanceReduced && ' · Soft throttle active'}
      </div>
      <div>
        Sky {shown.skyChaosMul.toFixed(2)} · Emit {perfState.emitScale.toFixed(2)} · FX{' '}
        {perfState.fxMul.toFixed(2)} · DPR scale {perfState.dprScale.toFixed(2)}
      </div>
      <div>
        DPR {dpr} · render {effectivePixelRatio().toFixed(2)} · cap [{caps.dpr[0]}, {caps.dpr[1]}]
      </div>
      <div>
        Bombs {shown.counts.bombs}/{caps.maxBombs} · Boom{' '}
        {shown.counts.explosions}/{caps.maxExplosions}
      </div>
      <div>
        Supplies {shown.counts.supplies}/{caps.maxSupplies} · Hazards{' '}
        {shown.counts.hazards}/{caps.maxHazards}
      </div>
      <div>
        Trails {shown.counts.trails}/{caps.maxMissileTrails} · Smoke{' '}
        {shown.counts.smoke}/{caps.maxSmoke}
      </div>
      <div>
        Particles {shown.counts.particles}/{caps.maxParticles} · Labels {shown.counts.labels}
      </div>
      <div>HUD ~{Math.round(1000 / perfState.hudFlushMs)} Hz</div>
    </div>
  )
}
