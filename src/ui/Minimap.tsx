import { useMemo } from 'react'
import { useGame } from '../game/store'
import { ROUTE_STYLE } from '../game/tankerRoutes'
import {
  buildRoutePath,
  getMinimapState,
  mapLabelLayout,
  MAP_WAYPOINTS,
} from '../game/worldMap'

export default function Minimap() {
  const hud = useGame((s) => s.hud)
  const deliveryId = useGame((s) => s.selectedDelivery)
  const selectedLevel = useGame((s) => s.selectedLevel)

  const state = useMemo(
    () =>
      getMinimapState(
        deliveryId,
        selectedLevel,
        hud.isEndless ? (hud.endlessDistance ?? 0) : 0,
      ),
    [
      deliveryId,
      selectedLevel,
      hud.progress,
      hud.endlessDistance,
      hud.isEndless,
      hud.playerX,
    ],
  )

  const style = ROUTE_STYLE[state.tankerRoute]
  const routeD = buildRoutePath(state.destination)
  const px = state.playerX * 100
  const py = state.playerY * 130
  const destinationLabel = state.destination
    ? mapLabelLayout(state.destination, 100, 130)
    : null

  return (
    <div className="minimap" aria-label="Navigation minimap">
      <div className="minimap-header">
        <span className="minimap-title">NAV MAP</span>
        {state.destination && (
          <span className="minimap-dest">
            {state.destination.flag} {state.destination.port}
          </span>
        )}
      </div>
      <svg viewBox="0 0 100 130" className="minimap-svg" role="img">
        <defs>
          <linearGradient id="mm-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e3a52" />
            <stop offset="100%" stopColor="#061826" />
          </linearGradient>
        </defs>
        <rect width="100" height="130" fill="url(#mm-water)" rx="6" />
        <rect x="0" y="0" width="18" height="130" fill="rgba(92, 74, 56, 0.55)" />
        <rect x="82" y="0" width="18" height="130" fill="rgba(212, 184, 122, 0.4)" />
        <text x="9" y="64" className="mm-coast-label" transform="rotate(-90 9 64)">
          IRAN
        </text>
        <text x="91" y="64" className="mm-coast-label" transform="rotate(90 91 64)">
          OMAN
        </text>
        <path d={routeD} className="mm-route" stroke={style.stripe} />
        {Object.values(MAP_WAYPOINTS).map((wp) => (
          <g key={wp.label} transform={`translate(${wp.x * 100}, ${wp.y * 130})`}>
            <circle r="2.2" className="mm-wp-dot" />
            <text y="-4" className="mm-wp-label">
              {wp.label}
            </text>
          </g>
        ))}
        {state.destination && (
          <g>
            <circle
              cx={destinationLabel?.marker.x}
              cy={destinationLabel?.marker.y}
              r="5"
              className="mm-dest-ring"
              stroke={style.stripe}
            />
            <text
              x={destinationLabel?.marker.x}
              y={(destinationLabel?.marker.y ?? 0) + 1}
              className="mm-dest-flag"
              textAnchor="middle"
            >
              {state.destination.flag}
            </text>
            <text
              x={destinationLabel?.labelX}
              y={destinationLabel?.labelY}
              className="mm-dest-name"
              textAnchor={destinationLabel?.textAnchor}
            >
              {state.destination.port}
            </text>
          </g>
        )}
        <g transform={`translate(${px}, ${py})`}>
          <polygon points="0,-5 4,4 -4,4" className="mm-player" fill={style.stripe} />
          <circle r="7" className="mm-player-pulse" stroke={style.stripe} />
        </g>
      </svg>
      <div className="minimap-foot">
        {state.isEndless ? (
          <span>{state.endlessNm} NM · OPEN ROUTE</span>
        ) : (
          <span>{Math.round(state.progress * 100)}% to port</span>
        )}
      </div>
    </div>
  )
}

/** Compact minimap for briefing / delivery select headers */
export function MinimapPreview({
  destinationId,
  levelId = 101,
}: {
  destinationId: import('../game/deliveryDestinations').DeliveryDestinationId | null
  levelId?: number
}) {
  const state = useMemo(
    () => getMinimapState(destinationId, levelId, 0),
    [destinationId, levelId],
  )
  const style = ROUTE_STYLE[state.tankerRoute]
  const routeD = buildRoutePath(state.destination, 100, 70)
  const destinationLabel = state.destination
    ? mapLabelLayout(state.destination, 100, 70)
    : null

  return (
    <svg viewBox="0 0 100 70" className="minimap-preview-svg" aria-hidden>
      <rect width="100" height="70" fill="#061826" rx="6" />
      <path d={routeD} fill="none" stroke={style.stripe} strokeWidth="1.8" opacity="0.9" />
      {state.destination && (
        <g>
          <circle
            cx={destinationLabel?.marker.x}
            cy={destinationLabel?.marker.y}
            r="5"
            fill={style.stripe}
          />
          <text
            x={destinationLabel?.labelX}
            y={destinationLabel?.labelY}
            textAnchor={destinationLabel?.textAnchor}
            fontSize="7"
            fill="#f8fafc"
          >
            {state.destination.flag} {state.destination.port}
          </text>
        </g>
      )}
    </svg>
  )
}
