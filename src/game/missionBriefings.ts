import type { TankerRouteId } from './types'
import { CHAOS_LEVEL_ID, ENDLESS_LEVEL_ID } from './constants'

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
      'You have the conn. Keep your hull centered — shadow boats will probe your lane before the coast opens up.',
    mission: 'Drive the tanker into the Strait.',
    threat: 'Patrol probes, coastal launch hints, supply drops under fire.',
    objective: 'Reach the Strait entry beacon.',
    surpriseHint: 'Watch for shadow boats and mid-run supply rain.',
  },
  {
    levelId: 2,
    codename: 'OP NARROW DOOR',
    title: 'Strait Entry',
    routeLabel: 'PACIFIC ROUTE TANKER',
    tankerRoute: 'pacific',
    commander:
      'Searchlights are hunting the lane tonight. Radar will paint you if you drift — intercepts come in pairs.',
    mission: 'Punch through the patrol corridor.',
    threat: 'Searchlights, fast intercepts, coastal launchers.',
    objective: 'Break the patrol screen at 40% route.',
    surpriseHint: 'Mid-run ambush wave — hard starboard when flares pop.',
  },
  {
    levelId: 3,
    codename: 'OP SILENT DEPTH',
    title: 'Mine Belt',
    routeLabel: 'EASTERN REFINERY TANKER',
    tankerRoute: 'eastern',
    commander:
      'Mines ahead — not random, they are lane-cutters. Oil slicks will spin you if you panic. Pulse is charged.',
    mission: 'Thread the convoy through the mine belt.',
    threat: 'Mine lines, oil slicks, narrow safe water.',
    objective: 'Survive the belt with the tanker intact.',
    surpriseHint: 'Minesweeper surprise at halfway — use E when charged.',
  },
  {
    levelId: 4,
    codename: 'OP SKY HAMMER',
    title: 'Missile Storm',
    routeLabel: 'RUSSIA ROUTE TANKER',
    tankerRoute: 'russia',
    commander:
      'Salvo corridor. They will double-tap the lane. Grab the EW burst when it drops — EMP clears the sky for a breath.',
    mission: 'Survive the missile corridor.',
    threat: 'Salvos, airbursts, intercept craft, impact zones.',
    objective: 'Escape the strike zone before 50% losses.',
    surpriseHint: 'EMP gift mid-mission — second wave at 50% progress.',
  },
  {
    levelId: 5,
    codename: 'OP FIRELINE',
    title: 'Refinery Run',
    routeLabel: 'ARCTIC ROUTE TANKER',
    tankerRoute: 'arctic',
    commander:
      'Terminal fireline ahead. Dock traffic crosses your lane — weave, do not stop. Supply lane opens mid-run.',
    mission: 'Escort past burning terminals and loading docks.',
    threat: 'Dock traffic, coastal guns, debris fields.',
    objective: 'Clear the refinery approach.',
    surpriseHint: 'Refinery flares at start — supply lane surprise mid-route.',
  },
  {
    levelId: 6,
    codename: 'OP GHOST RADAR',
    title: 'Radar Silence',
    routeLabel: 'PACIFIC ROUTE TANKER',
    tankerRoute: 'pacific',
    commander:
      'Run dark. Snapshot missiles lock without warning. Radar burst is your only cheat — use it when the sky goes quiet.',
    mission: 'Run the EM corridor without leaving the lane.',
    threat: 'Searchlights, snapshot missiles, patrol swarms.',
    objective: 'Break the radar net.',
    surpriseHint: 'Lights-out opening — radar pickup surprise mid-run.',
  },
  {
    levelId: 7,
    codename: 'OP TWIN SERPENT',
    title: 'Twin Convoy',
    routeLabel: 'CHINA ROUTE TANKER',
    tankerRoute: 'china',
    commander:
      'Two tankers, one lane. Second hull merges on your port — hold formation when crossfire starts.',
    mission: 'Protect the lead tanker through the merge.',
    threat: 'Dual mine lanes, crossing intercepts, crossfire salvos.',
    objective: 'Hold formation through the narrows.',
    surpriseHint: 'Second tanker appears early — dual lane minefield at 60%.',
  },
  {
    levelId: 8,
    codename: 'OP LAST BARREL',
    title: 'Final Tanker Escape',
    routeLabel: 'CHINA ROUTE TANKER',
    tankerRoute: 'china',
    commander:
      'Last barrel out of the Strait. Surprise intercepts will hit before safe water — do not celebrate early.',
    mission: 'Get the tanker to open Gulf water.',
    threat: 'Ambush intercepts, final salvos, lane blockades.',
    objective: 'Reach safe water.',
    surpriseHint: 'Ambush at 60% — final push banner before calm seas.',
  },
  {
    levelId: ENDLESS_LEVEL_ID,
    codename: 'STRAIT RUN',
    title: 'Strait of Hormuz — Endless',
    routeLabel: 'HORMUZ HIGH SCORE',
    tankerRoute: 'china',
    commander:
      'One lane, no finish line. Dodge, collect, survive — every nautical mile pushes your score higher.',
    mission: 'Endless escort through the Strait.',
    threat: 'Speed and threat escalate the farther you run.',
    objective: 'Beat your personal best before the hull breaks.',
    surpriseHint: 'Threat tier rises every few miles — supplies stay sparse.',
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
