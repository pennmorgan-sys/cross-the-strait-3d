import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGame } from '../game/store'
import GlobeIntroScene from './GlobeIntroScene'

export default function GlobeIntro() {
  const setScreen = useGame((s) => s.setScreen)
  const setIntroDone = useGame((s) => s.setIntroDone)
  const [phase, setPhase] = useState(0)

  const finish = () => {
    setIntroDone()
    setScreen('menu')
  }

  useEffect(() => {
    const steps = [400, 900, 1600, 2400, 3200, 4200, 5200, 6200]
    const timers = steps.map((ms, i) => setTimeout(() => setPhase(i + 1), ms))
    const end = setTimeout(finish, 9000)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(end)
    }
  }, [])

  return (
    <div className="overlay intro-overlay intro-tactical">
      <div className="intro-legend">
        <span>
          <i className="leg leg-safe" /> Safe Lane
        </span>
        <span>
          <i className="leg leg-warn" /> Active Route
        </span>
        <span>
          <i className="leg leg-hot" /> Threat Zone
        </span>
      </div>

      <header className="intro-header">
        <h1 className="intro-mapped-title">
          <span className="intro-mapped-accent">Mapped:</span> Tanker Escort Corridor
        </h1>
        {phase >= 4 && (
          <p className="intro-mapped-sub">Persian Gulf → Strait of Hormuz → Gulf of Oman</p>
        )}
      </header>

      <div className="intro-canvas-wrap">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0.4, 5.8], fov: 42, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: false }}
        >
          <GlobeIntroScene phase={phase} />
        </Canvas>
        <div className="intro-vignette" />
        <div className="intro-scan-sweep" />
      </div>

      <div className="intro-copy">
        {phase >= 5 && (
          <>
            <h2 className="intro-title">CROSS THE STRAIT</h2>
            <p className="intro-sub">YOU ARE THE TANKER</p>
          </>
        )}
        {phase >= 6 && (
          <p className="intro-commander">
            Commander: you have the conn. Hold the lane — the Strait does not forgive a wide turn.
          </p>
        )}
        {phase >= 7 && (
          <p className="intro-mission">Mission: drive the oil tanker to safe water.</p>
        )}
      </div>

      <button type="button" className="btn secondary intro-skip" onClick={finish}>
        SKIP INTRO
      </button>
    </div>
  )
}
