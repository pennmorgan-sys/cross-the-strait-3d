import { STRAIT_HALF_WIDTH } from './constants'
import { isEndlessLevel } from './levels'
import { progress, runtime } from './runtime'
import {
  getDeliveryDestination,
  type DeliveryDestination,
  type DeliveryDestinationId,
} from './deliveryDestinations'
import { getMissionBriefing } from './missionBriefings'
import type { TankerRouteId } from './types'

/** Fixed corridor waypoints on minimap (0–1 space) */
export const MAP_WAYPOINTS = {
  persianGulf: { x: 0.5, y: 0.92, label: 'PERSIAN GULF' },
  hormuz: { x: 0.5, y: 0.58, label: 'HORMUZ' },
  gulfOman: { x: 0.5, y: 0.38, label: 'GULF OF OMAN' },
} as const

export interface MinimapState {
  progress: number
  playerX: number
  playerY: number
  destination: DeliveryDestination | null
  /** Story/endless inferred destination for pin when not in delivery mode */
  routeLabel: string
  tankerRoute: TankerRouteId
  isEndless: boolean
  endlessNm: number
}

function destinationForRun(
  deliveryId: DeliveryDestinationId | null,
  levelId: number,
): DeliveryDestination | null {
  if (deliveryId) return getDeliveryDestination(deliveryId)
  if (isEndlessLevel(levelId)) {
    return getDeliveryDestination('japan') ?? null
  }
  const briefing = getMissionBriefing(levelId)
  const routeMap: Record<TankerRouteId, DeliveryDestinationId> = {
    china: 'china',
    eastern: 'india',
    pacific: 'japan',
    russia: 'russia',
    arctic: 'norway',
  }
  return getDeliveryDestination(routeMap[briefing.tankerRoute] ?? 'china')
}

export function getMinimapState(
  deliveryId: DeliveryDestinationId | null,
  levelId: number,
  endlessNm = 0,
): MinimapState {
  const p = progress()
  const dest = destinationForRun(deliveryId, levelId)
  const briefing = getMissionBriefing(levelId)

  const laneX = 0.5 + (runtime.player.x / STRAIT_HALF_WIDTH) * 0.22
  const baseY = 0.92 - p * 0.54

  let playerY = baseY
  if (dest && p > 0.55) {
    const t = (p - 0.55) / 0.45
    playerY = MAP_WAYPOINTS.gulfOman.y + (dest.mapY - MAP_WAYPOINTS.gulfOman.y) * t
  }

  return {
    progress: p,
    playerX: clamp01(laneX),
    playerY: clamp01(playerY),
    destination: dest,
    routeLabel: deliveryId
      ? `${dest?.routeName ?? 'DESTINATION'} · ${dest?.port ?? ''}`
      : briefing.routeLabel,
    tankerRoute: deliveryId
      ? (dest?.tankerRoute ?? briefing.tankerRoute)
      : briefing.tankerRoute,
    isEndless: isEndlessLevel(levelId),
    endlessNm,
  }
}

function clamp01(n: number) {
  return Math.max(0.04, Math.min(0.96, n))
}

export function mapPoint(
  point: { mapX: number; mapY: number },
  width: number,
  height: number,
) {
  return {
    x: point.mapX * width,
    y: point.mapY * height,
  }
}

export function mapLabelLayout(
  point: { mapX: number; mapY: number },
  width: number,
  height: number,
) {
  const marker = mapPoint(point, width, height)
  const nearLeft = marker.x < width * 0.34
  const nearRight = marker.x > width * 0.66
  const nearBottom = marker.y > height - 18
  const textAnchor = nearLeft ? 'start' : nearRight ? 'end' : 'middle'
  const offsetX = nearLeft ? 6 : nearRight ? -6 : 0
  const offsetY = nearBottom ? -10 : 13
  const margin = 7

  return {
    marker,
    labelX: Math.max(margin, Math.min(width - margin, marker.x + offsetX)),
    labelY: Math.max(10, Math.min(height - 4, marker.y + offsetY)),
    textAnchor,
  } as const
}

/** SVG path from start through strait toward destination pin */
export function buildRoutePath(
  dest: DeliveryDestination | null,
  width = 100,
  height = 130,
): string {
  const s = MAP_WAYPOINTS.persianGulf
  const h = MAP_WAYPOINTS.hormuz
  const o = MAP_WAYPOINTS.gulfOman
  const end = dest ?? { mapX: 0.5, mapY: 0.08 }
  const mx = (n: number) => n * width
  const my = (n: number) => n * height
  return [
    `M ${mx(s.x)} ${my(s.y)}`,
    `L ${mx(h.x)} ${my(h.y)}`,
    `L ${mx(o.x)} ${my(o.y)}`,
    `Q ${mx((o.x + end.mapX) / 2)} ${my(o.y * 0.7)} ${mx(end.mapX)} ${my(end.mapY)}`,
  ].join(' ')
}
