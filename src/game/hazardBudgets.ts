import { DELIVERY_LEVEL_ID, ENDLESS_LEVEL_ID } from './constants'

export interface HazardBudget {
  maxMines: number
  maxPatrolBoats: number
  maxInterceptShips: number
  maxBombEvents: number
}

export interface HazardBudgetUsage {
  mines: number
  patrolBoats: number
  interceptShips: number
  bombEvents: number
}

export const EMPTY_HAZARD_USAGE: HazardBudgetUsage = {
  mines: 0,
  patrolBoats: 0,
  interceptShips: 0,
  bombEvents: 0,
}

const STORY_BUDGETS: Record<number, HazardBudget> = {
  1: { maxMines: 0, maxPatrolBoats: 1, maxInterceptShips: 0, maxBombEvents: 0 },
  2: { maxMines: 0, maxPatrolBoats: 1, maxInterceptShips: 0, maxBombEvents: 1 },
  3: { maxMines: 0, maxPatrolBoats: 2, maxInterceptShips: 1, maxBombEvents: 2 },
  4: { maxMines: 0, maxPatrolBoats: 2, maxInterceptShips: 1, maxBombEvents: 2 },
  5: { maxMines: 0, maxPatrolBoats: 3, maxInterceptShips: 2, maxBombEvents: 3 },
}

const DELIVERY_BUDGET: HazardBudget = {
  maxMines: 0,
  maxPatrolBoats: 1,
  maxInterceptShips: 0,
  maxBombEvents: 1,
}

const ENDLESS_BUDGET: HazardBudget = {
  maxMines: 0,
  maxPatrolBoats: 999,
  maxInterceptShips: 0,
  maxBombEvents: 999,
}

export function getHazardBudget(levelId: number): HazardBudget | null {
  if (levelId === DELIVERY_LEVEL_ID) return DELIVERY_BUDGET
  if (levelId === ENDLESS_LEVEL_ID) return ENDLESS_BUDGET
  return STORY_BUDGETS[levelId] ?? null
}

export function freshHazardUsage(): HazardBudgetUsage {
  return { ...EMPTY_HAZARD_USAGE }
}
