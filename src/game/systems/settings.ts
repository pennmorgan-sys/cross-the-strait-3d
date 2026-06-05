import type { QualityMode } from './performance'

export interface GameSettings {
  nightMode: boolean
  soundOn: boolean
  qualityMode: QualityMode
}

const KEY = 'cts-settings'

const defaults: GameSettings = {
  nightMode: false,
  soundOn: true,
  qualityMode: 'auto',
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Partial<GameSettings> & { qualityMode?: string }
    const rawQ = parsed.qualityMode as string | undefined
    let qualityMode = defaults.qualityMode
    if (rawQ === 'normal') qualityMode = 'balanced'
    else if (rawQ === 'high' || rawQ === 'balanced' || rawQ === 'mobile' || rawQ === 'auto') {
      qualityMode = rawQ
    }
    return { ...defaults, ...parsed, qualityMode }
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
