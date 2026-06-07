import type { LevelConfig } from './types'
import {
  CHAOS_LEVEL_ID,
  DELIVERY_LEVEL_ID,
  ENDLESS_LEVEL_ID,
  MAX_VISIBLE_SUPPLIES,
  NORMAL_SUPPLY_INTERVAL_SEC,
  SPECIAL_SUPPLY_BURST_MAX,
} from './constants'

export { CHAOS_LEVEL_ID, DELIVERY_LEVEL_ID, ENDLESS_LEVEL_ID }

export function isEndlessLevel(id: number) {
  return id === ENDLESS_LEVEL_ID
}

export function supplyPacing(level: LevelConfig) {
  return {
    intervalSec: level.normalSupplyIntervalSeconds ?? NORMAL_SUPPLY_INTERVAL_SEC,
    maxVisible: level.maxVisibleSupplies ?? MAX_VISIBLE_SUPPLIES,
    burstMax: level.specialSupplyBurstMax ?? SPECIAL_SUPPLY_BURST_MAX,
  }
}

/** Daytime Gulf palettes per level mood */
const SKY = {
  clear: { top: '#55A7D8', bottom: '#F1D19A', fog: '#A9C7B8' },
  hazy: { top: '#6EA9C7', bottom: '#E6C28A', fog: '#B9B08A' },
  dusty: { top: '#D08D52', bottom: '#EBC08B', fog: '#C89F65' },
  smoky: { top: '#9B8068', bottom: '#D2A77B', fog: '#A8896A' },
  escape: { top: '#61A7D8', bottom: '#F0C878', fog: '#9DC5C1' },
  night: { top: '#0a1628', bottom: '#1a2a44', fog: '#0c1828' },
  chaos: { top: '#1a0a18', bottom: '#3d1838', fog: '#180c16' },
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Convoy Launch',
    tag: 'PERSIAN GULF',
    description: 'OP BLACK GOLD — clear lane, supply crates, one shadow boat.',
    difficulty: 'Easy',
    length: 540,
    speed: 18,
    bombInterval: 0,
    bombBurst: 1,
    obstacleGap: 170,
    mineBias: 0,
    patrol: true,
    cargo: false,
    searchlights: false,
    storm: false,
    targetScore: 15000,
    sky: SKY.clear,
    normalSupplyIntervalSeconds: 4.4,
    maxVisibleSupplies: 2,
    specialSupplyBurstMax: 2,
  },
  {
    id: 2,
    name: 'Strait Entry',
    tag: 'PATROL CORRIDOR',
    description: 'OP NARROW DOOR — gentle patrol contact and one readable strike.',
    difficulty: 'Easy',
    length: 620,
    speed: 20,
    bombInterval: 16,
    bombBurst: 1,
    obstacleGap: 155,
    mineBias: 0,
    patrol: true,
    cargo: false,
    searchlights: false,
    storm: false,
    targetScore: 25000,
    sky: SKY.hazy,
  },
  {
    id: 3,
    name: 'Escort Screen',
    tag: 'ESCORT SCREEN',
    description: 'OP SILENT DEPTH — light intercept screen with clear safe gaps.',
    difficulty: 'Normal',
    length: 700,
    speed: 22,
    bombInterval: 14,
    bombBurst: 1,
    obstacleGap: 140,
    mineBias: 0,
    patrol: true,
    cargo: false,
    searchlights: false,
    storm: false,
    targetScore: 35000,
    sky: SKY.dusty,
  },
  {
    id: 4,
    name: 'Missile Corridor',
    tag: 'MISSILE CORRIDOR',
    description: 'OP SKY HAMMER — two clear warning strikes and a light escort screen.',
    difficulty: 'Normal',
    length: 760,
    speed: 23,
    bombInterval: 13,
    bombBurst: 1,
    obstacleGap: 130,
    mineBias: 0,
    patrol: true,
    cargo: false,
    searchlights: true,
    storm: false,
    targetScore: 50000,
    sky: SKY.smoky,
  },
  {
    id: 5,
    name: 'Final Tanker Escort',
    tag: 'SAFE WATER',
    description: 'OP FIRELINE — medium final escort with supplies and fair warning zones.',
    difficulty: 'Normal',
    length: 820,
    speed: 24,
    bombInterval: 12,
    bombBurst: 1,
    obstacleGap: 120,
    mineBias: 0,
    patrol: true,
    cargo: false,
    searchlights: true,
    storm: false,
    targetScore: 55000,
    sky: SKY.smoky,
  },
]

export const CHAOS_LEVEL: LevelConfig = {
  id: CHAOS_LEVEL_ID,
  name: 'Chaos Challenge',
  tag: 'MAX THREAT',
  description: 'OP TOTAL STORM — rotating surprises every segment. Maximum pressure.',
  difficulty: 'Chaos',
  length: 1200,
  speed: 32,
  bombInterval: 2.2,
  bombBurst: 1,
  obstacleGap: 11,
  mineBias: 0.18,
  patrol: true,
  cargo: true,
  searchlights: true,
  storm: false,
  targetScore: 100000,
  sky: SKY.chaos,
}

export const DELIVERY_LEVEL: LevelConfig = {
  id: DELIVERY_LEVEL_ID,
  name: 'World Delivery',
  tag: 'GLOBAL ROUTE',
  description: 'Easy escort — clear the Strait and deliver crude to your chosen port.',
  difficulty: 'Easy',
  length: 760,
  speed: 20,
  bombInterval: 18,
  bombBurst: 1,
  obstacleGap: 170,
  mineBias: 0,
  patrol: true,
  cargo: false,
  searchlights: false,
  storm: false,
  targetScore: 28000,
  sky: SKY.hazy,
  calmAfterProgress: 0.5,
  normalSupplyIntervalSeconds: 4.5,
  maxVisibleSupplies: 2,
  specialSupplyBurstMax: 2,
}

export const ENDLESS_LEVEL: LevelConfig = {
  id: ENDLESS_LEVEL_ID,
  name: 'Strait Run',
  tag: 'HORMUZ ENDLESS',
  description: 'Endless escort — score as long as you survive the Strait.',
  difficulty: 'Endless',
  endless: true,
  length: 1_000_000,
  speed: 20,
  bombInterval: 48,
  bombBurst: 1,
  obstacleGap: 180,
  mineBias: 0,
  patrol: true,
  cargo: false,
  searchlights: false,
  storm: false,
  targetScore: 0,
  sky: SKY.escape,
  normalSupplyIntervalSeconds: 4.2,
  maxVisibleSupplies: 3,
  specialSupplyBurstMax: 3,
}

export function isDeliveryLevel(id: number) {
  return id === DELIVERY_LEVEL_ID
}

export function isPeacefulLevel(level: LevelConfig) {
  return level.peaceful === true
}

export function getLevel(id: number): LevelConfig {
  if (id === ENDLESS_LEVEL_ID) return { ...ENDLESS_LEVEL }
  if (id === DELIVERY_LEVEL_ID) return { ...DELIVERY_LEVEL }
  if (id === CHAOS_LEVEL_ID) return CHAOS_LEVEL
  return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, id - 1))]
}

export function isStoryLevel(id: number): boolean {
  return id >= 1 && id <= LEVELS.length
}
