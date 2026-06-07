import type { TankerRouteId } from './types'
import { CHAOS_LEVEL_ID, DELIVERY_LEVEL_ID, ENDLESS_LEVEL_ID } from './constants'

export interface MissionBriefing {
  levelId: number
  codename: string
  title: string
  routeLabel: string
  tankerRoute: TankerRouteId
  commander: string
  mission: string
  threat: string
  objective: string
  surpriseHint: string
}

export const MISSION_BRIEFINGS: MissionBriefing[] = [
  {
    levelId: 1,
    codename: 'OP BLACK GOLD',
    title: 'Convoy Launch',
    routeLabel: 'CHINA ROUTE TANKER',
    tankerRoute: 'china',
    commander:
      'You have the conn. Keep your hull centered and learn the lane. One shadow boat may test the edge of the route.',
    mission: 'Guide the tanker into the Strait.',
    threat: 'Tutorial pressure only: one patrol boat and one clear strike warning.',
    objective: 'Reach the Strait entry beacon.',
    surpriseHint: 'First supply crates are bright gold and marked with a white plus.',
  },
  {
    levelId: 2,
    codename: 'OP NARROW DOOR',
    title: 'Strait Entry',
    routeLabel: 'PACIFIC ROUTE TANKER',
    tankerRoute: 'pacific',
    commander:
      'The Strait narrows, but the lane is still readable. Watch the warning rings and keep open water between contacts.',
    mission: 'Pass the first patrol corridor.',
    threat: 'One patrol boat and one readable coastal strike.',
    objective: 'Clear the patrol screen.',
    surpriseHint: 'Supply crates mark the safest part of the lane.',
  },
  {
    levelId: 3,
    codename: 'OP SILENT DEPTH',
    title: 'Escort Screen',
    routeLabel: 'EASTERN REFINERY TANKER',
    tankerRoute: 'eastern',
    commander:
      'A light escort screen will cross ahead. Do not oversteer; the safe gaps stay open.',
    mission: 'Hold the tanker through a light intercept screen.',
    threat: 'Two patrol boats max, one intercept event, and one or two clear strike warnings.',
    objective: 'Keep the tanker steady through the screen.',
    surpriseHint: 'No mines in story missions. Watch patrol spacing and collect supplies.',
  },
  {
    levelId: 4,
    codename: 'OP SKY HAMMER',
    title: 'Missile Storm',
    routeLabel: 'RUSSIA ROUTE TANKER',
    tankerRoute: 'russia',
    commander:
      'This corridor adds tension without closing the lane. Warning rings are early and the patrol count stays low.',
    mission: 'Escort through a medium-light missile corridor.',
    threat: 'Two strike warnings max, two patrol boats max, one intercept event.',
    objective: 'Read the warnings and keep a clean route.',
    surpriseHint: 'EMP support may clear intercept pressure if you stay calm.',
  },
  {
    levelId: 5,
    codename: 'OP FIRELINE',
    title: 'Final Tanker Escort',
    routeLabel: 'ARCTIC ROUTE TANKER',
    tankerRoute: 'arctic',
    commander:
      'Final normal escort. It should feel exciting, not punishing: clear warnings, open gaps, and supplies on the route.',
    mission: 'Complete the final story escort to safe water.',
    threat: 'Medium pressure: three patrol boats max, two intercepts max, and up to three strike warnings.',
    objective: 'Reach safe water with the tanker intact.',
    surpriseHint: 'Chaos Challenge is the hard mode. This final story run stays fair.',
  },
  {
    levelId: ENDLESS_LEVEL_ID,
    codename: 'STRAIT RUN',
    title: 'Strait of Hormuz — Endless',
    routeLabel: 'HORMUZ HIGH SCORE',
    tankerRoute: 'china',
    commander:
      'One lane, no finish line. It starts calm, then pressure rises slowly every 45 seconds.',
    mission: 'Endless escort through the Strait.',
    threat: 'No mines. Rare early strikes, occasional patrols, and gradual medium pressure later.',
    objective: 'Beat your personal best before the hull breaks.',
    surpriseHint: 'The first 45 seconds are intentionally easy. Supplies guide the safe route.',
  },
  {
    levelId: DELIVERY_LEVEL_ID,
    codename: 'OP WORLD BARREL',
    title: 'World Delivery',
    routeLabel: 'SELECT DESTINATION',
    tankerRoute: 'china',
    commander: 'Pick a country on the delivery map. Hormuz is only the first leg.',
    mission: 'Deliver oil to the chosen port.',
    threat: 'Easy delivery — no mines, low patrol count, and calmer open water after Hormuz.',
    objective: 'Reach safe water and complete the open-ocean leg to your port.',
    surpriseHint: 'Match the 3D coasts to the NAV MAP (Iran west, Oman east).',
  },
  {
    levelId: CHAOS_LEVEL_ID,
    codename: 'OP TOTAL STORM',
    title: 'Chaos Challenge',
    routeLabel: 'ALL ROUTES — MAX THREAT',
    tankerRoute: 'china',
    commander:
      'No briefing covers this. Mines, missiles, patrols, flares — rotating surprises every segment. Survive.',
    mission: 'Maximum chaos escort.',
    threat: 'Everything at once, escalating beats.',
    objective: 'Reach safe water with the tanker.',
    surpriseHint: 'Random beats fire along the whole route — stay moving.',
  },
]

export function getMissionBriefing(levelId: number): MissionBriefing {
  const found = MISSION_BRIEFINGS.find((m) => m.levelId === levelId)
  if (found) return found
  return MISSION_BRIEFINGS[0]
}
