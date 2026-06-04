import { useGame } from '../game/store'
import { startLevel, runtime, progress } from '../game/runtime'
import { getMissionBriefing } from '../game/missionBriefings'

export default function GameOverScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const selectedLevel = useGame((s) => s.selectedLevel)
  const mission = getMissionBriefing(selectedLevel)

  return (
    <div className="overlay dim gameover-screen">
      <div className="panel panel-gameover">
        <p className="briefing-codename">{mission.codename}</p>
        <h2 className="subtitle" style={{ color: 'var(--red)' }}>
          TANKER LOST
        </h2>
        <p className="muted">The Strait took your hull. {mission.title} incomplete.</p>

        <div className="stats">
          <div className="stat-row">
            <span>Distance</span>
            <b>{Math.round(progress() * 100)}%</b>
          </div>
          <div className="stat-row">
            <span>Score</span>
            <b>{runtime.score.toLocaleString()}</b>
          </div>
          <div className="stat-row">
            <span>Best Combo</span>
            <b>x{runtime.stats.bestCombo}</b>
          </div>
          <div className="stat-row">
            <span>Hits Taken</span>
            <b>{runtime.stats.hits}</b>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="btn" onClick={() => startLevel(selectedLevel)}>
            RETRY (R)
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('levels')}>
            MISSIONS
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
