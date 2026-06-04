import type { BestRecord } from '../types'

const KEY = 'cross_the_strait_best_v1'

export type BestMap = Record<number, BestRecord>

export function loadBest(): BestMap {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as BestMap
  } catch {
    return {}
  }
}

export function saveBest(map: BestMap) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // ignore quota / private mode errors
  }
}

// Stars: 1 = finished, 2 = beat target score, 3 = target score with <=1 hit.
export function computeStars(
  finished: boolean,
  score: number,
  target: number,
  hits: number,
): number {
  if (!finished) return 0
  if (score >= target && hits <= 1) return 3
  if (score >= target) return 2
  return 1
}
