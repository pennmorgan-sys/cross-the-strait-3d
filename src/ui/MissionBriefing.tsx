import { useGame } from '../game/store'
import { getMissionBriefing } from '../game/missionBriefings'
import { getDeliveryDestination, deliveryBriefing } from '../game/deliveryDestinations'
import { startLevel } from '../game/runtime'
import { ROUTE_STYLE } from '../game/tankerRoutes'
import { CHAOS_LEVEL_ID, DELIVERY_LEVEL_ID, ENDLESS_LEVEL_ID } from '../game/constants'
import { MinimapPreview } from './Minimap'

export default function MissionBriefing() {
  const selectedLevel = useGame((s) => s.selectedLevel)
  const deliveryMode = useGame((s) => s.deliveryMode)
  const selectedDelivery = useGame((s) => s.selectedDelivery)
  const setScreen = useGame((s) => s.setScreen)
  const dest = selectedDelivery ? getDeliveryDestination(selectedDelivery) : null
  const mission = dest
    ? { levelId: selectedLevel, ...deliveryBriefing(dest) }
    : getMissionBriefing(selectedLevel)
  const style = ROUTE_STYLE[mission.tankerRoute]

  return (
    <div className="overlay briefing-overlay briefing-cinematic">
      <div className="briefing-scan-bar" />

      <div className="panel briefing-panel">
        <p className="briefing-phase tagline show">
          {selectedLevel === ENDLESS_LEVEL_ID
            ? 'STRAIT RUN'
            : selectedLevel === CHAOS_LEVEL_ID
              ? 'CHAOS BRIEFING'
              : deliveryMode
                ? 'WORLD DELIVERY'
                : 'COMMANDER BRIEFING'}
        </p>

        <p className="briefing-codename show">{mission.codename}</p>
        <h2 className="briefing-phase subtitle show">{mission.title}</h2>

        <div
          className="briefing-route-badge briefing-phase show"
          style={{ borderColor: style.stripe }}
        >
          <span className="route-dot" style={{ background: style.stripe }} />
          {mission.routeLabel}
        </div>

        <div className="briefing-minimap-wrap briefing-phase show">
          <MinimapPreview
            destinationId={selectedDelivery}
            levelId={selectedLevel}
          />
        </div>
        <div className="briefing-map-strip briefing-phase show">
          <span className="lit">PERSIAN GULF</span>
          <span className="strip-arrow">→</span>
          <span className="lit">HORMUZ</span>
          <span className="strip-arrow">→</span>
          <span className="lit">
            {dest ? dest.country.toUpperCase() : 'SAFE WATER'}
          </span>
        </div>

        <blockquote className="briefing-commander briefing-phase show">
          &ldquo;{mission.commander}&rdquo;
        </blockquote>

        <div className="briefing-surprise briefing-phase show">
          <div className="briefing-label">SURPRISE INTEL</div>
          <div className="briefing-value surprise-hint">{mission.surpriseHint}</div>
        </div>

        <div className="briefing-grid briefing-phase show">
          <div>
            <div className="briefing-label">MISSION</div>
            <div className="briefing-value">{mission.mission}</div>
          </div>
          <div>
            <div className="briefing-label">THREAT</div>
            <div className="briefing-value threat">{mission.threat}</div>
          </div>
          <div>
            <div className="briefing-label">OBJECTIVE</div>
            <div className="briefing-value">{mission.objective}</div>
          </div>
        </div>

        <div className="btn-row briefing-phase show">
          <button type="button" className="btn gold" onClick={() => startLevel(selectedLevel)}>
            START MISSION
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() =>
              setScreen(
                deliveryMode || selectedLevel === DELIVERY_LEVEL_ID ? 'delivery' : 'levels',
              )
            }
          >
            {deliveryMode ? 'DESTINATIONS' : 'MISSIONS'}
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}
