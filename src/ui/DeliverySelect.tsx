import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGame } from '../game/store'
import {
  DELIVERY_DESTINATIONS,
  type DeliveryDestination,
} from '../game/deliveryDestinations'
import { ROUTE_STYLE } from '../game/tankerRoutes'
import { buildRoutePath, mapLabelLayout } from '../game/worldMap'
import { MAP_WAYPOINTS } from '../game/worldMap'

function DestinationMapThumb({ dest }: { dest: DeliveryDestination }) {
  const style = ROUTE_STYLE[dest.tankerRoute]
  const routeD = buildRoutePath(dest, 100, 80)
  const destinationLabel = mapLabelLayout(dest, 100, 80)
  return (
    <svg viewBox="0 0 100 80" className="delivery-thumb-svg" aria-hidden>
      <rect width="100" height="80" fill="#061826" rx="4" />
      <rect x="0" y="0" width="14" height="80" fill="rgba(92,74,56,0.5)" />
      <rect x="86" y="0" width="14" height="80" fill="rgba(212,184,122,0.35)" />
      <path d={routeD} fill="none" stroke={style.stripe} strokeWidth="1.5" opacity="0.85" />
      <circle cx={destinationLabel.marker.x} cy={destinationLabel.marker.y} r="4" fill={style.stripe} />
      <text
        x={destinationLabel.labelX}
        y={destinationLabel.labelY}
        textAnchor={destinationLabel.textAnchor}
        className="delivery-thumb-label"
      >
        {dest.flag}
      </text>
    </svg>
  )
}

export default function DeliverySelect() {
  const panelRef = useRef<HTMLDivElement>(null)
  const startDelivery = useGame((s) => s.startDelivery)
  const setScreen = useGame((s) => s.setScreen)
  const [picked, setPicked] = useState<DeliveryDestination | null>(null)

  useEffect(() => {
    if (!panelRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.delivery-card',
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.035, ease: 'power2.out' },
      )
    }, panelRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="overlay delivery-overlay">
      <div ref={panelRef} className="panel panel-delivery">
        <p className="tagline">World Delivery</p>
        <h2 className="subtitle">Choose destination country</h2>
        <p className="menu-desc">
          Escort crude through the Strait of Hormuz, then follow the open-ocean route on the
          minimap to your port.
        </p>

        <div className="delivery-map-legend">
          <span>{MAP_WAYPOINTS.persianGulf.label}</span>
          <span>→</span>
          <span>{MAP_WAYPOINTS.hormuz.label}</span>
          <span>→</span>
          <span>Your port</span>
        </div>

        <div className="delivery-grid">
          {DELIVERY_DESTINATIONS.map((dest) => {
            const style = ROUTE_STYLE[dest.tankerRoute]
            const active = picked?.id === dest.id
            return (
              <button
                key={dest.id}
                type="button"
                className={`delivery-card${active ? ' delivery-card-active' : ''}`}
                style={{ borderColor: active ? style.stripe : undefined }}
                onClick={() => setPicked(dest)}
              >
                <DestinationMapThumb dest={dest} />
                <span className="delivery-card-flag">{dest.flag}</span>
                <span className="delivery-card-country">{dest.country}</span>
                <span className="delivery-card-port">{dest.port}</span>
              </button>
            )
          })}
        </div>

        {picked && (
          <p className="delivery-blurb">
            {picked.briefingText} · {picked.routeName} · {picked.direction}
          </p>
        )}

        <div className="btn-row">
          <button
            type="button"
            className="btn gold"
            disabled={!picked}
            onClick={() => picked && startDelivery(picked.id)}
          >
            START DELIVERY
          </button>
          <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
            BACK
          </button>
        </div>
      </div>
    </div>
  )
}
