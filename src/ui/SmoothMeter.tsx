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
  return <div className={className}>{Math.round(target).toLocaleString()}</div>
}
