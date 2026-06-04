import { useEffect } from 'react'
import { tickInputSmoothing } from './input'

/** Smooths joystick + keyboard on display refresh (works when game canvas is paused). */
export default function InputTicker() {
  useEffect(() => {
    let id = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      tickInputSmoothing(dt)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])
  return null
}
