import { progress, runtime } from './runtime'
import { isEndlessLevel } from './levels'
import { useGame } from './store'
import { sfx } from './systems/audio'

const MARKS = [
  { at: 0.25, msg: '25% — STILL IN THE HOT ZONE' },
  { at: 0.5, msg: 'HALFWAY — HOLD THE LANE' },
  { at: 0.75, msg: '75% — SAFE WATER NEAR' },
] as const

const PEACEFUL_MARKS = [
  { at: 0.25, msg: '25% — Strait of Hormuz' },
  { at: 0.5, msg: 'HALFWAY — Gulf of Oman ahead' },
  { at: 0.75, msg: '75% — open ocean to your port' },
] as const

export function runProgressMilestones(flags: Record<string, boolean>) {
  if (isEndlessLevel(runtime.level.id)) return
  const p = progress()
  const marks = runtime.level.peaceful ? PEACEFUL_MARKS : MARKS
  for (const m of marks) {
    const key = `mile-${m.at}`
    if (p < m.at || flags[key]) continue
    flags[key] = true
    useGame.getState().pushToast(m.msg, 'info')
    sfx.milestone()
  }
}
