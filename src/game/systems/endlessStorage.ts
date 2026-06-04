const KEY = 'cross_the_strait_endless_v1'

export function loadEndlessBest(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0
  } catch {
    return 0
  }
}

/** Returns true if this score is a new personal best */
export function saveEndlessBest(score: number): boolean {
  if (typeof localStorage === 'undefined') return false
  const prev = loadEndlessBest()
  if (score <= prev) return false
  try {
    localStorage.setItem(KEY, String(Math.floor(score)))
  } catch {
    return false
  }
  return true
}
