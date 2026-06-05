import { useGame } from '../game/store'
import { runtime } from '../game/runtime'
import { getMissionBriefing } from '../game/missionBriefings'
import { getDeliveryDestination, deliveryBriefing } from '../game/deliveryDestinations'
import { TOTAL_LEVELS, CHAOS_LEVEL_ID } from '../game/constants'

export default function WinScreen() {
  const setScreen = useGame((s) => s.setScreen)
  const startMission = useGame((s) => s.startMission)
  const deliveryMode = useGame((s) => s.deliveryMode)
  const selectedDelivery = useGame((s) => s.selectedDelivery)
  const best = useGame((s) => s.best)
  const selectedLevel = useGame((s) => s.selectedLevel)

  const lvl = runtime.level
  const dest = selectedDelivery ? getDeliveryDestination(selectedDelivery) : null
  const mission = dest
    ? deliveryBriefing(dest)
    : getMissionBriefing(lvl.id)
  const rec = best[lvl.id]
  const stars = rec?.stars ?? 1
  const hasNext = lvl.id < TOTAL_LEVELS && lvl.id !== CHAOS_LEVEL_ID

  return (
    <div className="overlay dim win-screen">
      <div className="panel panel-win">
        <p className="tagline">SAFE WATER REACHED</p>
        <p className="briefing-codename">{mission.codename}</p>
        <h2 className="subtitle" style={{ color: 'var(--green)' }}>
          TANKER DELIVERED
        </h2>
        <p className="muted">
          {deliveryMode && dest
            ? `Oil delivered to ${dest.port}, ${dest.country}.`
            : `${mission.title} — cargo route secured.`}
        </p>
        <p className="muted">{mission.routeLabel}</p>

        <div className="big-stars">
          {[0, 1, 2].map((i) => (
            <span key={i} className={i < stars ? '' : 'off'}>
              {'\u2605'}
            </span>
          ))}
        </div>

        <div className="stats">
          <div className="stat-row">
            <span>Score</span>
            <b>{runtime.score.toLocaleString()}</b>
          </div>
          <div className="stat-row">
            <span>Supplies</span>
            <b>{runtime.stats.supplies}</b>
          </div>
          <div className="stat-row">
            <span>Near Misses</span>
            <b>{runtime.stats.nearMisses}</b>
          </div>
          <div className="stat-row">
            <span>Hits Taken</span>
            <b>{runtime.stats.hits}</b>
          </div>
        </div>

        <div className="btn-row">
          {hasNext && (
            <button type="button" className="btn gold" onClick={() => startMission(lvl.id + 1)}>
              NEXT MISSION {'\u2192'}
            </button>
          )}
          <button type="button" className="btn" onClick={() => startMission(selectedLevel)}>
            RETRY
          </button>
          {deliveryMode && dest && (
            <button type="button" className="btn teal" onClick={() => setScreen('delivery')}>
              NEW DESTINATION
            </button>
          )}
          <button
            type="button"
            className="btn secondary"
            onClick={() => setScreen(deliveryMode ? 'delivery' : 'levels')}
          >
            {deliveryMode ? 'DESTINATIONS' : 'MISSIONS'}
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  )
}
