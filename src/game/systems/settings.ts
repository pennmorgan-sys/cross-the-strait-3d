export interface GameSettings {
  nightMode: boolean
  soundOn: boolean
}

const KEY = 'cts-settings'

const defaults: GameSettings = { nightMode: false, soundOn: true }

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    return { ...defaults, ...parsed }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(s: GameSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export const NIGHT_SKY = {
  top: '#0a1628',
  bottom: '#1a2a44',
  fog: '#0c1828',
}

export function skyForLevel(
  levelSky: { top: string; bottom: string; fog: string },
  night: boolean,
) {
  return night ? NIGHT_SKY : levelSky
}
