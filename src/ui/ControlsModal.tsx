import { useGame } from '../game/store'

const ROWS: { keys: string[]; action: string }[] = [
  { keys: ['A', 'D', '\u2190', '\u2192'], action: 'Steer the tanker / hold the lane' },
  { keys: ['W', 'S'], action: 'Ahead slow / flank speed' },
  { keys: ['Space'], action: 'Engine boost (flank speed)' },
  { keys: ['E'], action: 'Minesweeper pulse / use tool' },
  { keys: ['P', 'Esc'], action: 'Pause' },
  { keys: ['R'], action: 'Restart after game over' },
]

export default function ControlsModal() {
  const closeControls = useGame((s) => s.closeControls)

  return (
    <div className="overlay dim" style={{ zIndex: 30 }}>
      <div className="panel">
        <h2 className="subtitle">CONTROLS</h2>
        <p className="muted">
          Pilot the lead oil tanker through the Strait. Dodge mines, missiles, intercept
          craft, and coastal strikes. Convoy partners trail on harder missions.
        </p>

        <div className="controls-list">
          {ROWS.map((r) => (
            <div className="row" key={r.action}>
              <span>{r.action}</span>
              <span>
                {r.keys.map((k) => (
                  <span className="kbd" key={k}>
                    {k}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>

        <p className="muted">
          Mobile: joystick to steer, BOOST and POWER buttons, pause top-right.
        </p>

        <div className="btn-row">
          <button type="button" className="btn" onClick={closeControls}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
