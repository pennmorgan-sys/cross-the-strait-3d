import type { TankerRouteId } from './types'

/** Oil delivery destinations — shown on minimap and World Delivery mode */
export type DeliveryDestinationId =
  | 'china'
  | 'india'
  | 'japan'
  | 'russia'
  | 'norway'
  | 'uae'
  | 'uk'
  | 'usa'

export interface DeliveryDestination {
  id: DeliveryDestinationId
  country: string
  port: string
  flag: string
  tankerRoute: TankerRouteId
  /** Minimap pin 0–1 (x: west→east, y: north/up toward destination) */
  mapX: number
  mapY: number
  blurb: string
}

export const DELIVERY_DESTINATIONS: DeliveryDestination[] = [
  {
    id: 'china',
    country: 'China',
    port: 'Shanghai',
    flag: '🇨🇳',
    tankerRoute: 'china',
    mapX: 0.82,
    mapY: 0.12,
    blurb: 'Far East refinery corridor — long Pacific leg after Hormuz.',
  },
  {
    id: 'india',
    country: 'India',
    port: 'Mumbai',
    flag: '🇮🇳',
    tankerRoute: 'eastern',
    mapX: 0.58,
    mapY: 0.18,
    blurb: 'Eastern refinery run — Arabian Sea crossing.',
  },
  {
    id: 'japan',
    country: 'Japan',
    port: 'Yokohama',
    flag: '🇯🇵',
    tankerRoute: 'pacific',
    mapX: 0.9,
    mapY: 0.22,
    blurb: 'Pacific route tanker — tight escort past the Gulf of Oman.',
  },
  {
    id: 'russia',
    country: 'Russia',
    port: 'Novorossiysk',
    flag: '🇷🇺',
    tankerRoute: 'russia',
    mapX: 0.22,
    mapY: 0.1,
    blurb: 'Northern delivery — Caspian / Black Sea pipeline terminus.',
  },
  {
    id: 'norway',
    country: 'Norway',
    port: 'Bergen',
    flag: '🇳🇴',
    tankerRoute: 'arctic',
    mapX: 0.15,
    mapY: 0.08,
    blurb: 'Arctic route — North Sea terminal, ice-season priority.',
  },
  {
    id: 'uae',
    country: 'UAE',
    port: 'Fujairah',
    flag: '🇦🇪',
    tankerRoute: 'eastern',
    mapX: 0.72,
    mapY: 0.28,
    blurb: 'Short hop — UAE shipping terminals on the Gulf of Oman.',
  },
  {
    id: 'uk',
    country: 'United Kingdom',
    port: 'Southampton',
    flag: '🇬🇧',
    tankerRoute: 'arctic',
    mapX: 0.12,
    mapY: 0.2,
    blurb: 'Atlantic crossing — European NATO fuel reserve.',
  },
  {
    id: 'usa',
    country: 'United States',
    port: 'Houston',
    flag: '🇺🇸',
    tankerRoute: 'pacific',
    mapX: 0.05,
    mapY: 0.35,
    blurb: 'Transoceanic barrel — Suez alternative via Hormuz exit.',
  },
]

const BY_ID = Object.fromEntries(
  DELIVERY_DESTINATIONS.map((d) => [d.id, d]),
) as Record<DeliveryDestinationId, DeliveryDestination>

export function getDeliveryDestination(
  id: DeliveryDestinationId | null | undefined,
): DeliveryDestination | null {
  if (!id) return null
  return BY_ID[id] ?? null
}

export function deliveryBriefing(dest: DeliveryDestination) {
  return {
    codename: 'OP WORLD BARREL',
    title: `Deliver to ${dest.country}`,
    routeLabel: `${dest.country.toUpperCase()} · ${dest.port.toUpperCase()}`,
    tankerRoute: dest.tankerRoute,
    commander: `Commander: ${dest.port} is expecting this cargo. Thread the Strait, then hold your lane for the open-ocean leg.`,
    mission: dest.blurb,
    threat: 'Peaceful lane — no bombs, mines, or intercepts. Follow the minimap to your port.',
    objective: `Deliver your cargo and dock at ${dest.port}.`,
    surpriseHint: 'Use the NAV MAP — Iran left, Oman right, destination pin ahead.',
  }
}
