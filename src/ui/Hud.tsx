import { useGame } from '../game/store'
import { usePowerUp } from '../game/runtime'
import { MAX_HEALTH } from '../game/constants'
import type { PowerUpType, TankerRouteId } from '../game/types'
import { ROUTE_STYLE } from '../game/tankerRoutes'
import { SmoothBar, SmoothScore } from './SmoothMeter'

const POWER_COLOR: Record<PowerUpType, string> = {
  shield: '#3b82f6',
  repair: '#22c55e',
  turbo: '#12d6df',
  slow: '#a855f7',
  magnet: '#facc15',
  radar: '#16a34a',
  minesweeper: '#22c55e',
  emp: '#38bdf8',
}

const ROUTE_LABEL: Record<TankerRouteId, string> = {
  china: 'CN ROUTE',
  russia: 'RU ROUTE',
  pacific: 'PACIFIC',
  eastern: 'EASTERN',
  arctic: 'ARCTIC',
}

export default function Hud() {
  const hud = useGame((s) => s.hud)
  const toasts = useGame((s) => s.toasts)
  const togglePause = useGame((s) => s.togglePause)

  const slots = MAX_HEALTH
  const hearts = Array.from({ length: slots }, (_, i) => i < hud.health)
  const danger =
    hud.incoming >= 2 || hud.health <= 1 || hud.interceptEvent || hud.banner.includes('MISSILE')
  const routeStyle = ROUTE_STYLE[hud.tankerRoute]
  const showMinesweeper =
    hud.minesweeperReady || hud.powerUp === 'minesweeper'

  return (
    <div className="hud">
      <div className="fx vignette hud-vignette" />
      <div className={`fx danger${danger ? ' on' : ''}`} />

      <div className="hud-top">
        <div className="hud-card">
          <SmoothScore target={hud.score} className="score" />
          <div className={`mult${hud.multiplier >= 3 ? ' mult-hot' : ''}`}>
            x{hud.multiplier} MULTIPLIER
          </div>
          <div className="hud-stat-line">
            <span className="hud-supplies">SUPPLIES {hud.supplies}</span>
            <span className="hud-sep">|</span>
            <span>ENGINE {Math.round(hud.boost * 100)}%</span>
          </div>
          <div className="bar boost">
            <SmoothBar targetPct={hud.boost * 100} />
          </div>
        </div>

        <div className="hud-card hud-card-right">
          {hud.missionCodename && (
            <div className="hud-codename">{hud.missionCodename}</div>
          )}
          <div className="level-name">{hud.levelName}</div>
          <div
            className="tanker-route-badge"
            style={{ borderColor: routeStyle.stripe, color: routeStyle.accent }}
          >
            {ROUTE_LABEL[hud.tankerRoute]}
          </div>
          <div className="hearts">
            {hearts.map((full, i) => (
              <span key={i} className={`heart${full ? '' : ' empty'}`}>
                {full ? '\u2764\uFE0F' : '\u{1F90D}'}
              </span>
            ))}
          </div>
          {hud.shield && <div className="shield-ring">SHIELD ACTIVE</div>}
          <button type="button" className="btn-hud-pause" onClick={togglePause}>
            PAUSE
          </button>
        </div>
      </div>

      <div className="hud-orient">
        <span>IRAN COAST</span>
        <span className="hud-orient-mid">STRAIT OF HORMUZ</span>
        <span>OMAN COAST</span>
      </div>

      {hud.banner && (
        <div
          className={`banner${hud.finalDash ? ' dash' : ''}${hud.activeSurprise ? ' surprise' : ''}`}
        >
          {hud.banner}
        </div>
      )}

      {hud.siren && (
        <div className="siren">MISSILE WARNING — AIRSPACE HOT</div>
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>

      <div className="hud-bottom">
        <div className="hud-progress">
          <div className="route-progress-label">
            {hud.isEndless
              ? `STRAIT RUN · ${hud.endlessDistance ?? 0} NM · BEST ${(hud.endlessBest ?? 0).toLocaleString()}`
              : `TANKER ROUTE · ${Math.round(hud.progress * 100)}%`}
          </div>
          <div className={`bar dist${hud.progress >= 0.88 ? ' bar-safe' : ''}`}>
            <SmoothBar targetPct={hud.progress * 100} />
          </div>
          <div className="route-sublabel">{hud.routeLabel}</div>
        </div>

        <div className="hud-bottom-tools">
          {showMinesweeper && !hud.powerUp && (
            <span className="tool-pill">MINESWEEPER READY — E</span>
          )}
          {hud.powerUp && (
            <div className="powerup-chip">
              <span
                className="powerup-dot"
                style={{
                  background: POWER_COLOR[hud.powerUp],
                }}
              />
              <span>{hud.powerUp.toUpperCase()}</span>
              <button type="button" className="btn-use-tool" onClick={usePowerUp}>
                USE (E)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
