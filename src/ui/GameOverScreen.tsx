import { useGame } from '../game/store'
import { startLevel, runtime, progress, endlessNm } from '../game/runtime'
import { getMissionBriefing } from '../game/missionBriefings'
import { getDeliveryDestination, deliveryBriefing } from '../game/deliveryDestinations'
import { DELIVERY_LEVEL_ID } from '../game/constants'
import { isEndlessLevel } from '../game/levels'
import { loadEndlessBest } from '../game/systems/endlessStorage'
import { ENDLESS_LEVEL_ID } from '../game/constants'

export default function GameOverScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const selectedLevel = useGame((s) => s.selectedLevel)
  const endlessMode = useGame((s) => s.endlessMode)
  const deliveryMode = useGame((s) => s.deliveryMode)
  const selectedDelivery = useGame((s) => s.selectedDelivery)
  const dest = selectedDelivery ? getDeliveryDestination(selectedDelivery) : null
  const mission = dest
    ? deliveryBriefing(dest)
    : getMissionBriefing(selectedLevel)
  const endless = endlessMode || isEndlessLevel(selectedLevel)
  const best = loadEndlessBest()

  return (
    <div className="overlay dim gameover-screen">
      <div className="panel panel-gameover">
        <p className="briefing-codename">{endless ? 'STRAIT RUN' : mission.codename}</p>
        <h2 className="subtitle" style={{ color: 'var(--red)' }}>
          {endless ? 'RUN OVER' : 'TANKER LOST'}
        </h2>
        <p className="muted">
          {endless
            ? `You covered ${endlessNm()} NM through the Hormuz corridor.`
            : `The Strait took your hull. ${mission.title} incomplete.`}
        </p>

        <div className="stats">
          {endless ? (
            <>
              <div className="stat-row">
                <span>Distance</span>
                <b>{endlessNm()} NM</b>
              </div>
              <div className="stat-row">
                <span>Run Score</span>
                <b>{runtime.score.toLocaleString()}</b>
              </div>
              <div className="stat-row">
                <span>Personal Best</span>
                <b>{best.toLocaleString()}</b>
              </div>
            </>
          ) : (
            <>
              <div className="stat-row">
                <span>Distance</span>
                <b>{Math.round(progress() * 100)}%</b>
              </div>
              <div className="stat-row">
                <span>Score</span>
                <b>{runtime.score.toLocaleString()}</b>
              </div>
            </>
          )}
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
          <button
            type="button"
            className="btn"
            onClick={() =>
              startLevel(
                endless
                  ? ENDLESS_LEVEL_ID
                  : deliveryMode
                    ? DELIVERY_LEVEL_ID
                    : selectedLevel,
              )
            }
          >
            {endless ? 'RUN AGAIN' : 'RETRY (R)'}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setScreen(deliveryMode ? 'delivery' : 'levels')}
          >
            {deliveryMode ? 'DESTINATIONS' : endless ? 'STORY MISSIONS' : 'MISSIONS'}
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
