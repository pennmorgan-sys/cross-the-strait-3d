import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGame } from '../game/store'
import { getMissionBriefing } from '../game/missionBriefings'
import { getDeliveryDestination, deliveryBriefing } from '../game/deliveryDestinations'
import { startLevel } from '../game/runtime'
import { ROUTE_STYLE } from '../game/tankerRoutes'
import { CHAOS_LEVEL_ID, DELIVERY_LEVEL_ID, ENDLESS_LEVEL_ID } from '../game/constants'
import { MinimapPreview } from './Minimap'

export default function MissionBriefing() {
  const panelRef = useRef<HTMLDivElement>(null)
  const selectedLevel = useGame((s) => s.selectedLevel)
  const deliveryMode = useGame((s) => s.deliveryMode)
  const selectedDelivery = useGame((s) => s.selectedDelivery)
  const setScreen = useGame((s) => s.setScreen)
  const dest = selectedDelivery ? getDeliveryDestination(selectedDelivery) : null
  const mission = dest
    ? { levelId: selectedLevel, ...deliveryBriefing(dest) }
    : getMissionBriefing(selectedLevel)
  const style = ROUTE_STYLE[mission.tankerRoute]
  const briefingKind =
    selectedLevel === ENDLESS_LEVEL_ID
      ? 'STRAIT RUN'
      : selectedLevel === CHAOS_LEVEL_ID
        ? 'CHAOS BRIEFING'
        : deliveryMode
          ? 'WORLD DELIVERY'
          : 'COMMANDER BRIEFING'
  const finalPort = dest ? dest.port.toUpperCase() : 'SAFE WATER'
  const startLabel =
    selectedLevel === ENDLESS_LEVEL_ID
      ? 'START STRAIT RUN'
      : selectedLevel === CHAOS_LEVEL_ID
        ? 'START CHAOS'
        : deliveryMode
          ? 'START DELIVERY'
          : 'START MISSION'

  useEffect(() => {
    if (!panelRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.briefing-phase',
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.48, stagger: 0.045, ease: 'power2.out' },
      )
    }, panelRef)
    return () => ctx.revert()
  }, [selectedLevel, selectedDelivery])

  return (
    <div className="overlay briefing-overlay briefing-cinematic">
      <div className="briefing-scan-bar" />

      <div ref={panelRef} className="panel briefing-panel">
        <div className="briefing-header briefing-phase show">
          <div>
            <p className="briefing-kicker">{briefingKind}</p>
            <p className="briefing-codename">{mission.codename}</p>
          </div>
          <div
            className="briefing-route-badge"
            style={{ borderColor: style.stripe }}
          >
            <span className="route-dot" style={{ background: style.stripe }} />
            {mission.routeLabel}
          </div>
        </div>

        <h2 className="briefing-title briefing-phase show">{mission.title}</h2>

        <div className="briefing-dossier briefing-phase show">
          <section className="briefing-map-panel" aria-label="Route preview">
            <div className="briefing-minimap-wrap">
              <MinimapPreview
                destinationId={selectedDelivery}
                levelId={selectedLevel}
              />
            </div>
            <div className="briefing-map-strip">
              <span className="lit">PERSIAN GULF</span>
              <span className="strip-arrow">→</span>
              <span className="lit">HORMUZ</span>
              <span className="strip-arrow">→</span>
              <span className="lit">{finalPort}</span>
            </div>
          </section>

          <section className="briefing-intel-panel" aria-label="Mission details">
            <blockquote className="briefing-commander">
              &ldquo;{mission.commander}&rdquo;
            </blockquote>

            <div className="briefing-surprise">
              <div className="briefing-label">INTEL</div>
              <div className="briefing-value surprise-hint">{mission.surpriseHint}</div>
            </div>

            <div className="briefing-grid">
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
          </section>
        </div>

        <div className="briefing-actions briefing-phase show">
          <button type="button" className="btn gold" onClick={() => startLevel(selectedLevel)}>
            {startLabel}
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
