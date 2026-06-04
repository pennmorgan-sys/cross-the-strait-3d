import { useGame } from '../game/store'

export default function SettingsModal() {
  const closeSettings = useGame((s) => s.closeSettings)
  const nightMode = useGame((s) => s.nightMode)
  const soundOn = useGame((s) => s.soundOn)
  const toggleNightMode = useGame((s) => s.toggleNightMode)
  const toggleSound = useGame((s) => s.toggleSound)
  const openControls = useGame((s) => s.openControls)

  return (
    <div className="overlay dim" style={{ zIndex: 30 }}>
      <div className="panel settings-panel">
        <h2 className="subtitle">SETTINGS</h2>
        <p className="muted">Display, audio, and gameplay options.</p>

        <div className="settings-list">
          <label className="settings-row">
            <div>
              <strong>Night mode</strong>
              <span className="muted">Dark Gulf sky, moonlit water, lit coasts</span>
            </div>
            <button
              type="button"
              className={`toggle${nightMode ? ' on' : ''}`}
              onClick={toggleNightMode}
              aria-pressed={nightMode}
            >
              <span className="toggle-knob" />
            </button>
          </label>
          <label className="settings-row">
            <div>
              <strong>Sound effects</strong>
              <span className="muted">Hits, pickups, surprises, and mission stingers</span>
            </div>
            <button
              type="button"
              className={`toggle${soundOn ? ' on' : ''}`}
              onClick={toggleSound}
              aria-pressed={soundOn}
            >
              <span className="toggle-knob" />
            </button>
          </label>
        </div>

        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={openControls}>
            CONTROLS
          </button>
          <button type="button" className="btn" onClick={closeSettings}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
