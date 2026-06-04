import { progress, runtime } from './runtime'
import { isEndlessLevel } from './levels'
import { useGame } from './store'
import { sfx } from './systems/audio'

const MARKS = [
  { at: 0.25, msg: '25% — STILL IN THE HOT ZONE' },
  { at: 0.5, msg: 'HALFWAY — HOLD THE LANE' },
  { at: 0.75, msg: '75% — SAFE WATER NEAR' },
] as const

export function runProgressMilestones(flags: Record<string, boolean>) {
  if (isEndlessLevel(runtime.level.id)) return
  const p = progress()
  for (const m of MARKS) {
    const key = `mile-${m.at}`
    if (p < m.at || flags[key]) continue
    flags[key] = true
    useGame.getState().pushToast(m.msg, 'info')
    sfx.milestone()
  }
}
