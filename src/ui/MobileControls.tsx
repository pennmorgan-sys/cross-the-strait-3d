import { useEffect, useRef } from 'react'
import { setJoystick, releaseJoystick, setBoostBtn, getJoystickNubPx } from '../game/input'
import { usePowerUp } from '../game/runtime'
import { useGame } from '../game/store'

const RADIUS = 52

export default function MobileControls() {
  const baseRef = useRef<HTMLDivElement>(null)
  const nubRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)
  const screen = useGame((s) => s.screen)
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
    setJoystick(dx / RADIUS, dy / RADIUS)
  }

  /** Nub follows smoothed stick on the game rAF loop — no React setState per touch */
  useEffect(() => {
    let id = 0
    const paint = () => {
      const nub = nubRef.current
      if (nub) {
        const { x, y } = getJoystickNubPx(RADIUS)
        nub.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
      id = requestAnimationFrame(paint)
    }
    id = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`mobile auto-hide${screen === 'playing' ? ' mobile-active' : ''}`}>
      <div
        className="joystick"
        ref={baseRef}
        onPointerDown={(e) => {
          e.preventDefault()
          pointerId.current = e.pointerId
          baseRef.current?.setPointerCapture(e.pointerId)
          handleMove(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (pointerId.current === e.pointerId) {
            e.preventDefault()
            handleMove(e.clientX, e.clientY)
          }
        }}
        onPointerUp={(e) => {
          if (pointerId.current === e.pointerId) {
            pointerId.current = null
            releaseJoystick()
          }
        }}
        onPointerCancel={() => {
          pointerId.current = null
          releaseJoystick()
        }}
      >
        <div className="nub" ref={nubRef} />
      </div>

      <button
        type="button"
        className="mob-btn mob-boost"
        onPointerDown={(e) => {
          e.preventDefault()
          setBoostBtn(true)
        }}
        onPointerUp={() => setBoostBtn(false)}
        onPointerLeave={() => setBoostBtn(false)}
        onPointerCancel={() => setBoostBtn(false)}
      >
        FLANK
      </button>

      <button type="button" className="mob-btn mob-power" onClick={() => usePowerUp()}>
        POWER
      </button>

      <button type="button" className="mob-btn mob-pause" onClick={togglePause}>
        II
      </button>
    </div>
  )
}
