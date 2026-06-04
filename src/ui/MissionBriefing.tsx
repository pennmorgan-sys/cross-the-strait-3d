import { useGame } from '../game/store'
import { getMissionBriefing } from '../game/missionBriefings'
import { startLevel } from '../game/runtime'
import { ROUTE_STYLE } from '../game/tankerRoutes'
import { CHAOS_LEVEL_ID } from '../game/levels'

export default function MissionBriefing() {
  const selectedLevel = useGame((s) => s.selectedLevel)
  const setScreen = useGame((s) => s.setScreen)
  const mission = getMissionBriefing(selectedLevel)
  const style = ROUTE_STYLE[mission.tankerRoute]

  return (
    <div className="overlay briefing-overlay briefing-cinematic">
      <div className="briefing-scan-bar" />

      <div className="panel briefing-panel">
        <p className="briefing-phase tagline show">
          {selectedLevel === CHAOS_LEVEL_ID ? 'CHAOS BRIEFING' : 'COMMANDER BRIEFING'}
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

        <div className="briefing-map-strip briefing-phase show">
          <span className="lit">PERSIAN GULF</span>
          <span className="strip-arrow">→</span>
          <span className="lit">STRAIT</span>
          <span className="strip-arrow">→</span>
          <span className="lit">SAFE WATER</span>
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
          <button type="button" className="btn secondary" onClick={() => setScreen('levels')}>
            MISSIONS
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}
