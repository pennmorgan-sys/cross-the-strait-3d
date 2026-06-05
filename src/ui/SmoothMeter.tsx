import { useEffect, useRef, useState } from 'react'

/** HUD meters use CSS transitions (see index.css .bar > span) — no per-frame rAF. */

export function SmoothBar({
  targetPct,
  className,
}: {
  targetPct: number
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, targetPct))
  return <span className={className} style={{ width: `${pct}%` }} />
}

export function SmoothScore({
  target,
  className,
}: {
  target: number
  className?: string
}) {
  const [shown, setShown] = useState(target)
  const val = useRef(target)

  useEffect(() => {
    const id = window.setInterval(() => {
      const diff = target - val.current
      if (Math.abs(diff) < 0.55) {
        val.current = target
        setShown(target)
        return
      }
      val.current += diff * 0.38
      setShown(Math.round(val.current))
    }, 48)
    return () => clearInterval(id)
  }, [target])

  return <div className={className}>{shown.toLocaleString()}</div>
}
