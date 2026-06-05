import { useGame } from '../game/store'
import type { QualityMode } from '../game/systems/performance'
import { tierDisplayName } from '../game/systems/performance'

const QUALITY_OPTIONS: { id: QualityMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Detect desktop, laptop, or mobile' },
  { id: 'high', label: 'High', hint: 'Best visuals · DPR up to 1.5 · desktop' },
  { id: 'balanced', label: 'Balanced', hint: 'Full Strait look · fewer excess effects' },
  { id: 'mobile', label: 'Mobile', hint: 'Smooth play · core graphics · DPR 1.0' },
]

export default function SettingsModal() {
  const closeSettings = useGame((s) => s.closeSettings)
  const nightMode = useGame((s) => s.nightMode)
  const soundOn = useGame((s) => s.soundOn)
  const qualityMode = useGame((s) => s.qualityMode)
  const toggleNightMode = useGame((s) => s.toggleNightMode)
  const toggleSound = useGame((s) => s.toggleSound)
  const setQualityMode = useGame((s) => s.setQualityMode)
  const openControls = useGame((s) => s.openControls)

  return (
    <div className="overlay dim" style={{ zIndex: 30 }}>
      <div className="panel settings-panel">
        <h2 className="subtitle">SETTINGS</h2>
        <p className="muted">Display, audio, and performance options.</p>

        <div className="settings-list">
          <div className="settings-row settings-quality">
            <div>
              <strong>Graphics quality</strong>
              <span className="muted">Preserves Strait visuals — caps density, not style</span>
            </div>
          </div>
          <div className="quality-pills" role="group" aria-label="Graphics quality">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`quality-pill${qualityMode === opt.id ? ' active' : ''}`}
                onClick={() => setQualityMode(opt.id)}
                aria-pressed={qualityMode === opt.id}
                title={opt.hint}
              >
                {opt.id === 'auto' ? 'Auto' : tierDisplayName(opt.id as 'high' | 'balanced' | 'mobile')}
              </button>
            ))}
          </div>

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
