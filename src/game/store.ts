import { create } from 'zustand'
import type { HudSnapshot, Screen } from './types'
import { START_HEALTH, MAX_HEALTH, DELIVERY_LEVEL_ID, ENDLESS_LEVEL_ID } from './constants'
import type { DeliveryDestinationId } from './deliveryDestinations'
import { loadEndlessBest } from './systems/endlessStorage'
import { loadBest, saveBest, type BestMap } from './systems/storage'
import { loadSettings, saveSettings } from './systems/settings'
import { setQualityMode as applyQualityMode, type QualityMode } from './systems/performance'
import { initAudio, setSoundEnabled, sfx } from './systems/audio'
import type { BestRecord } from './types'

export interface Toast {
  id: number
  text: string
  kind: 'good' | 'bad' | 'info'
}

const defaultHud: HudSnapshot = {
  score: 0,
  multiplier: 1,
  health: START_HEALTH,
  maxHealth: MAX_HEALTH,
  boost: 1,
  supplies: 0,
  progress: 0,
  powerUp: null,
  shield: false,
  levelName: '',
  missionCodename: '',
  banner: '',
  finalDash: false,
  siren: false,
  incoming: 0,
  tankerRoute: 'china',
  routeLabel: '',
  interceptEvent: false,
  activeSurprise: '',
  minesweeperReady: false,
}

interface GameStore {
  screen: Screen
  paused: boolean
  controlsOpen: boolean
  settingsOpen: boolean
  nightMode: boolean
  soundOn: boolean
  qualityMode: QualityMode
  chaosMode: boolean
  endlessMode: boolean
  deliveryMode: boolean
  selectedDelivery: DeliveryDestinationId | null
  endlessBest: number
  selectedLevel: number
  introDone: boolean
  best: BestMap
  hud: HudSnapshot
  toasts: Toast[]

  setScreen: (s: Screen) => void
  setPaused: (b: boolean) => void
  togglePause: () => void
  openControls: () => void
  closeControls: () => void
  openSettings: () => void
  closeSettings: () => void
  toggleNightMode: () => void
  toggleSound: () => void
  setQualityMode: (mode: QualityMode) => void
  setSelectedLevel: (n: number) => void
  setIntroDone: () => void
  startMission: (levelId: number) => void
  startChaos: () => void
  startEndlessRun: () => void
  startDelivery: (destinationId: DeliveryDestinationId) => void
  openDeliverySelect: () => void
  refreshEndlessBest: () => void
  setHud: (h: HudSnapshot) => void
  updateBest: (id: number, rec: BestRecord) => void
  pushToast: (text: string, kind?: Toast['kind']) => void
  removeToast: (id: number) => void
}

let toastId = 0
const initialSettings = loadSettings()
setSoundEnabled(initialSettings.soundOn)

export const useGame = create<GameStore>((set, get) => ({
  screen: typeof localStorage !== 'undefined' && localStorage.getItem('cts-intro') === '1' ? 'menu' : 'intro',
  paused: false,
  controlsOpen: false,
  settingsOpen: false,
  nightMode: initialSettings.nightMode,
  soundOn: initialSettings.soundOn,
  qualityMode: initialSettings.qualityMode,
  chaosMode: false,
  endlessMode: false,
  deliveryMode: false,
  selectedDelivery: null,
  endlessBest: loadEndlessBest(),
  selectedLevel: 1,
  introDone: typeof localStorage !== 'undefined' && localStorage.getItem('cts-intro') === '1',
  best: loadBest(),
  hud: defaultHud,
  toasts: [],

  setScreen: (s) => set({ screen: s, paused: false }),
  setPaused: (b) => set({ paused: b }),
  togglePause: () => {
    if (get().screen !== 'playing') return
    set((s) => ({ paused: !s.paused }))
  },
  openControls: () => set({ controlsOpen: true, settingsOpen: false }),
  closeControls: () => set({ controlsOpen: false }),
  openSettings: () => set({ settingsOpen: true, controlsOpen: false }),
  closeSettings: () => set({ settingsOpen: false }),
  setQualityMode: (mode) => {
    applyQualityMode(mode)
    saveSettings({
      nightMode: get().nightMode,
      soundOn: get().soundOn,
      qualityMode: mode,
    })
    set({ qualityMode: mode })
  },
  toggleNightMode: () => {
    const nightMode = !get().nightMode
    saveSettings({ nightMode, soundOn: get().soundOn, qualityMode: get().qualityMode })
    set({ nightMode })
  },
  toggleSound: () => {
    const soundOn = !get().soundOn
    saveSettings({ nightMode: get().nightMode, soundOn, qualityMode: get().qualityMode })
    setSoundEnabled(soundOn)
    if (soundOn) {
      initAudio()
      sfx.ui()
    }
    set({ soundOn })
  },
  setSelectedLevel: (n) => set({ selectedLevel: n }),
  setIntroDone: () => {
    try {
      localStorage.setItem('cts-intro', '1')
    } catch {
      /* ignore */
    }
    set({ introDone: true })
  },
  startMission: (levelId) => {
    initAudio()
    sfx.ui()
    set({
      selectedLevel: levelId,
      chaosMode: false,
      endlessMode: false,
      deliveryMode: false,
      selectedDelivery: null,
      screen: 'briefing',
    })
  },
  startChaos: () => {
    initAudio()
    sfx.ui()
    set({
      selectedLevel: 99,
      chaosMode: true,
      endlessMode: false,
      deliveryMode: false,
      selectedDelivery: null,
      screen: 'briefing',
    })
  },
  openDeliverySelect: () => {
    initAudio()
    sfx.ui()
    set({ screen: 'delivery' })
  },
  startDelivery: (destinationId) => {
    initAudio()
    sfx.ui()
    set({
      selectedDelivery: destinationId,
      selectedLevel: DELIVERY_LEVEL_ID,
      chaosMode: false,
      endlessMode: false,
      deliveryMode: true,
      screen: 'briefing',
    })
  },
  startEndlessRun: () => {
    initAudio()
    sfx.ui()
    set({
      selectedLevel: ENDLESS_LEVEL_ID,
      chaosMode: false,
      deliveryMode: false,
      selectedDelivery: null,
      endlessMode: true,
      endlessBest: loadEndlessBest(),
      screen: 'briefing',
    })
  },
  refreshEndlessBest: () => set({ endlessBest: loadEndlessBest() }),
  setHud: (h) => {
    const prev = get().hud
    if (
      prev.score === h.score &&
      prev.multiplier === h.multiplier &&
      prev.health === h.health &&
      prev.maxHealth === h.maxHealth &&
      prev.boost === h.boost &&
      prev.supplies === h.supplies &&
      Math.abs(prev.progress - h.progress) < 0.004 &&
      prev.powerUp === h.powerUp &&
      prev.shield === h.shield &&
      prev.levelName === h.levelName &&
      prev.missionCodename === h.missionCodename &&
      prev.banner === h.banner &&
      prev.finalDash === h.finalDash &&
      prev.siren === h.siren &&
      prev.incoming === h.incoming &&
      prev.tankerRoute === h.tankerRoute &&
      prev.routeLabel === h.routeLabel &&
      prev.interceptEvent === h.interceptEvent &&
      prev.activeSurprise === h.activeSurprise &&
      prev.minesweeperReady === h.minesweeperReady &&
      prev.isEndless === h.isEndless &&
      prev.endlessDistance === h.endlessDistance &&
      prev.endlessBest === h.endlessBest &&
      prev.playerX === h.playerX &&
      prev.deliveryCountry === h.deliveryCountry &&
      prev.deliveryFlag === h.deliveryFlag
    ) {
      return
    }
    set({ hud: h })
  },

  updateBest: (id, rec) => {
    const cur = get().best[id]
    const merged: BestRecord = {
      score: Math.max(cur?.score ?? 0, rec.score),
      stars: Math.max(cur?.stars ?? 0, rec.stars),
    }
    const next = { ...get().best, [id]: merged }
    saveBest(next)
    set({ best: next })
  },

  pushToast: (text, kind = 'info') => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts.slice(-4), { id, text, kind }] }))
    setTimeout(() => get().removeToast(id), 1300)
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
