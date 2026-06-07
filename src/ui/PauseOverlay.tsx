import { useGame } from '../game/store'
import { startLevel } from '../game/runtime'

export default function PauseOverlay() {
  const setPaused = useGame((s) => s.setPaused)
  const setScreen = useGame((s) => s.setScreen)
  const selectedLevel = useGame((s) => s.selectedLevel)
  const deliveryMode = useGame((s) => s.deliveryMode)
  const endlessMode = useGame((s) => s.endlessMode)

  return (
    <div className="overlay dim">
      <div className="panel">
        <h2 className="subtitle">PAUSED</h2>
        <div className="btn-col">
          <button type="button" className="btn" onClick={() => setPaused(false)}>
            RESUME
          </button>
          <button type="button" className="btn secondary" onClick={() => startLevel(selectedLevel)}>
            RESTART LEVEL
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setScreen(deliveryMode ? 'delivery' : 'levels')}
          >
            {deliveryMode ? 'DESTINATIONS' : endlessMode ? 'STORY MISSIONS' : 'LEVEL SELECT'}
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
