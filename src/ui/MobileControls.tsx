import { useRef, useState } from 'react'
import { setJoystick, releaseJoystick, setBoostBtn } from '../game/input'
import { usePowerUp } from '../game/runtime'
import { useGame } from '../game/store'

const RADIUS = 52

export default function MobileControls() {
  const baseRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)
  const [nub, setNub] = useState({ x: 0, y: 0 })
  const togglePause = useGame((s) => s.togglePause)

  function handleMove(clientX: number, clientY: number) {
    const el = baseRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS
      dy = (dy / dist) * RADIUS
    }
    setNub({ x: dx, y: dy })
    setJoystick(dx / RADIUS, dy / RADIUS)
  }

  return (
    <div className="mobile auto-hide">
      <div
        className="joystick"
        ref={baseRef}
        onPointerDown={(e) => {
          pointerId.current = e.pointerId
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          handleMove(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (pointerId.current === e.pointerId) handleMove(e.clientX, e.clientY)
        }}
        onPointerUp={(e) => {
          if (pointerId.current === e.pointerId) {
            pointerId.current = null
            setNub({ x: 0, y: 0 })
            releaseJoystick()
          }
        }}
        onPointerCancel={() => {
          pointerId.current = null
          setNub({ x: 0, y: 0 })
          releaseJoystick()
        }}
      >
        <div
          className="nub"
          style={{ transform: `translate(${nub.x}px, ${nub.y}px)` }}
        />
      </div>

      <button
        className="mob-btn mob-boost"
        onPointerDown={() => setBoostBtn(true)}
        onPointerUp={() => setBoostBtn(false)}
        onPointerLeave={() => setBoostBtn(false)}
        onPointerCancel={() => setBoostBtn(false)}
      >
        FLANK
      </button>

      <button className="mob-btn mob-power" onClick={() => usePowerUp()}>
        POWER
      </button>

      <button className="mob-btn mob-pause" onClick={togglePause}>
        II
      </button>
    </div>
  )
}
