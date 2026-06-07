import { AlertTriangle, BookOpen, Globe2, Keyboard, ListChecks, Settings, Ship } from 'lucide-react'
import { useGame } from '../game/store'

export default function MainMenu() {
  const startMission = useGame((s) => s.startMission)
  const startEndlessRun = useGame((s) => s.startEndlessRun)
  const openDeliverySelect = useGame((s) => s.openDeliverySelect)
  const startChaos = useGame((s) => s.startChaos)
  const setScreen = useGame((s) => s.setScreen)
  const openSettings = useGame((s) => s.openSettings)
  const openControls = useGame((s) => s.openControls)
  const nightMode = useGame((s) => s.nightMode)
  const endlessBest = useGame((s) => s.endlessBest)

  return (
    <div className="overlay menu-overlay">
      <div className="panel menu-panel">
        <p className="tagline menu-eyebrow">Oil Tanker Survival</p>
        <h1 className="title">CROSS THE STRAIT</h1>
        <p className="menu-desc">
          Escort an oil tanker through the Strait of Hormuz. Manage the route, survive the
          corridor, and reach safe water.
        </p>
        {nightMode && <p className="menu-night-badge">NIGHT OPS ACTIVE</p>}

        <div className="menu-card-grid">
          <button type="button" className="menu-card menu-card-primary" onClick={() => startMission(1)}>
            <BookOpen size={22} aria-hidden="true" />
            <span>STORY MISSIONS</span>
            <small>Five fair escorts</small>
          </button>
          <button type="button" className="menu-card" onClick={openDeliverySelect}>
            <Globe2 size={22} aria-hidden="true" />
            <span>WORLD DELIVERY</span>
            <small>Pick a port</small>
          </button>
          <button type="button" className="menu-card" onClick={startEndlessRun}>
            <Ship size={22} aria-hidden="true" />
            <span>STRAIT RUN</span>
            <small>Best {endlessBest > 0 ? endlessBest.toLocaleString() : '-'}</small>
          </button>
        </div>

        <div className="menu-secondary-grid">
          <button type="button" className="btn secondary menu-mode-action" onClick={() => setScreen('levels')}>
            <ListChecks size={17} aria-hidden="true" />
            MISSION SELECT
          </button>
          <button type="button" className="btn danger menu-chaos" onClick={startChaos}>
            <AlertTriangle size={17} aria-hidden="true" />
            CHAOS CHALLENGE
          </button>
        </div>

        <div className="menu-row-2">
          <button type="button" className="btn secondary menu-utility-action" onClick={openControls}>
            <Keyboard size={16} aria-hidden="true" />
            CONTROLS
          </button>
          <button type="button" className="btn secondary menu-utility-action" onClick={openSettings}>
            <Settings size={16} aria-hidden="true" />
            SETTINGS
          </button>
        </div>

        <p className="brand-foot">5 story ops / world delivery / endurance run</p>
      </div>
    </div>
  )
}
