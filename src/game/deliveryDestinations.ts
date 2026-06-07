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
  routeName: string
  direction: string
  tankerLabel: string
  colorTheme: string
  difficultyModifier: number
  briefingText: string
  successText: string
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
    routeName: 'China Route',
    direction: 'East / Pacific Route',
    tankerLabel: 'CHINA / SHANGHAI',
    colorTheme: '#dc2626',
    difficultyModifier: 1,
    briefingText: 'Destination: Shanghai, China. Clear Hormuz, then hold the eastbound Pacific route.',
    successText: 'Delivery complete: Shanghai',
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
    routeName: 'India Route',
    direction: 'Indian Ocean Route',
    tankerLabel: 'INDIA / MUMBAI',
    colorTheme: '#ea580c',
    difficultyModifier: 0.95,
    briefingText: 'Destination: Mumbai, India. Escape the Strait, then settle into the Indian Ocean route.',
    successText: 'Delivery complete: Mumbai',
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
    routeName: 'Japan Route',
    direction: 'East / Pacific Route',
    tankerLabel: 'JAPAN / YOKOHAMA',
    colorTheme: '#0d9488',
    difficultyModifier: 1.05,
    briefingText: 'Destination: Yokohama, Japan. Clear the Strait and continue east toward the Pacific leg.',
    successText: 'Delivery complete: Yokohama',
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
    routeName: 'Russia Route',
    direction: 'Northwest Route',
    tankerLabel: 'RUSSIA / NOVOROSSIYSK',
    colorTheme: '#2563eb',
    difficultyModifier: 1,
    briefingText: 'Destination: Novorossiysk, Russia. Exit Hormuz, then turn northwest for the Black Sea supply line.',
    successText: 'Delivery complete: Novorossiysk',
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
    routeName: 'Norway Route',
    direction: 'North Sea Route',
    tankerLabel: 'NORWAY / BERGEN',
    colorTheme: '#1e3a5f',
    difficultyModifier: 1,
    briefingText: 'Destination: Bergen, Norway. Clear the Strait, then follow the North Sea delivery route.',
    successText: 'Delivery complete: Bergen',
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
    routeName: 'UAE Route',
    direction: 'Gulf of Oman Route',
    tankerLabel: 'UAE / FUJAIRAH',
    colorTheme: '#ea580c',
    difficultyModifier: 0.85,
    briefingText: 'Destination: Fujairah, UAE. Short run: clear the Strait and enter the Gulf of Oman route.',
    successText: 'Delivery complete: Fujairah',
    tankerRoute: 'eastern',
    mapX: 0.72,
    mapY: 0.28,
    blurb: 'Short hop — UAE shipping terminals on the Gulf of Oman.',
  },
  {
    id: 'uk',
    country: 'UK',
    port: 'Southampton',
    flag: '🇬🇧',
    routeName: 'UK Route',
    direction: 'Europe Route',
    tankerLabel: 'UK / SOUTHAMPTON',
    colorTheme: '#1e3a5f',
    difficultyModifier: 1,
    briefingText: 'Destination: Southampton, UK. Escape Hormuz and continue on the Europe route.',
    successText: 'Delivery complete: Southampton',
    tankerRoute: 'arctic',
    mapX: 0.12,
    mapY: 0.2,
    blurb: 'Atlantic crossing — European NATO fuel reserve.',
  },
  {
    id: 'usa',
    country: 'USA',
    port: 'Houston',
    flag: '🇺🇸',
    routeName: 'USA Route',
    direction: 'Atlantic/Gulf Route',
    tankerLabel: 'USA / HOUSTON',
    colorTheme: '#0d9488',
    difficultyModifier: 1.05,
    briefingText: 'Destination: Houston, USA. Clear Hormuz, then take the Atlantic/Gulf route to port.',
    successText: 'Delivery complete: Houston',
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
    title: `Destination: ${dest.port}, ${dest.country}`,
    routeLabel: `${dest.routeName.toUpperCase()} · ${dest.port.toUpperCase()}`,
    tankerRoute: dest.tankerRoute,
    commander: `Commander: ${dest.port} is expecting this cargo. Thread the Strait, then hold ${dest.direction} for the open-ocean leg.`,
    mission: dest.briefingText,
    threat: 'Light Strait danger only. Once clear of Hormuz, the route opens up and hazards fall away.',
    objective: `Deliver your cargo and dock at ${dest.port}.`,
    surpriseHint: `Use the NAV MAP — destination pin marks ${dest.port}.`,
  }
}
