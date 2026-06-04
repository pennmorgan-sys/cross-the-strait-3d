import { useGame } from '../game/store'

export default function MainMenu() {
  const startMission = useGame((s) => s.startMission)
  const startEndlessRun = useGame((s) => s.startEndlessRun)
  const startChaos = useGame((s) => s.startChaos)
  const setScreen = useGame((s) => s.setScreen)
  const openSettings = useGame((s) => s.openSettings)
  const openControls = useGame((s) => s.openControls)
  const nightMode = useGame((s) => s.nightMode)
  const endlessBest = useGame((s) => s.endlessBest)

  return (
    <div className="overlay menu-overlay">
      <div className="panel">
        <p className="tagline">Oil Tanker Survival</p>
        <h1 className="title">CROSS THE STRAIT</h1>
        <p className="menu-desc">
          You are the tanker. Pilot your ship through the Strait of Hormuz — mines, missiles,
          and intercept craft won&apos;t wait.
        </p>
        {nightMode && <p className="menu-night-badge">NIGHT OPS ACTIVE</p>}

        <div className="btn-col menu-buttons">
          <button type="button" className="btn btn-lg gold" onClick={startEndlessRun}>
            STRAIT RUN
          </button>
          <p className="menu-endless-hint">
            Endless high score · Hormuz corridor · Best{' '}
            <b>{endlessBest > 0 ? endlessBest.toLocaleString() : '—'}</b>
          </p>
          <button type="button" className="btn btn-lg" onClick={() => startMission(1)}>
            STORY MISSIONS
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('levels')}>
            MISSION SELECT
          </button>
          <button type="button" className="btn danger menu-chaos" onClick={startChaos}>
            CHAOS CHALLENGE
          </button>
          <div className="menu-row-2">
            <button type="button" className="btn secondary" onClick={openControls}>
              CONTROLS
            </button>
            <button type="button" className="btn secondary" onClick={openSettings}>
              SETTINGS
            </button>
          </div>
        </div>

        <p className="brand-foot">
          8 operations · Strait Run · Chaos · Night ops
        </p>
      </div>
    </div>
  )
}
