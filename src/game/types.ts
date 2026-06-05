export type TankerRouteId = 'china' | 'russia' | 'pacific' | 'eastern' | 'arctic'

export type Screen =
  | 'intro'
  | 'menu'
  | 'levels'
  | 'delivery'
  | 'briefing'
  | 'playing'
  | 'gameOver'
  | 'win'

export type PowerUpType =
  | 'shield'
  | 'repair'
  | 'turbo'
  | 'slow'
  | 'magnet'
  | 'radar'
  | 'minesweeper'
  | 'emp'

export type ObstacleKind =
  | 'mine'
  | 'patrol'
  | 'cargo'
  | 'debris'
  | 'oil'

export interface LevelConfig {
  id: number
  name: string
  tag: string
  description: string
  difficulty: 'Easy' | 'Normal' | 'Hard' | 'Extreme' | 'Insane' | 'Chaos' | 'Endless'
  /** Endless high-score mode — no mission finish */
  endless?: boolean
  length: number // forward distance units to complete
  speed: number // base forward speed
  bombInterval: number // seconds between bomb drops (0 = none)
  bombBurst: number // bombs per drop event
  obstacleGap: number // distance between obstacle waves
  mineBias: number // 0..1 likelihood obstacle is a mine
  patrol: boolean
  cargo: boolean
  searchlights: boolean
  storm: boolean
  targetScore: number
  sky: { top: string; bottom: string; fog: string }
  /** Seconds of travel between normal supply spawns (1–2 crates) */
  normalSupplyIntervalSeconds?: number
  /** Max supply crates visible ahead during normal play */
  maxVisibleSupplies?: number
  /** Cap for scripted supply burst events */
  specialSupplyBurstMax?: number
  /** No bombs, mines, patrols, or combat surprises — escort / delivery only */
  peaceful?: boolean
}

export interface BestRecord {
  score: number
  stars: number
}

export interface HudSnapshot {
  score: number
  multiplier: number
  health: number
  maxHealth: number
  boost: number
  supplies: number
  progress: number
  powerUp: PowerUpType | null
  shield: boolean
  levelName: string
  missionCodename: string
  banner: string
  finalDash: boolean
  siren: boolean
  incoming: number
  tankerRoute: TankerRouteId
  routeLabel: string
  interceptEvent: boolean
  activeSurprise: string
  minesweeperReady: boolean
  /** Endless Strait Run — distance in display units */
  endlessDistance?: number
  endlessBest?: number
  isEndless?: boolean
  /** Lateral position for minimap (-STRAIT_HALF_WIDTH..STRAIT_HALF_WIDTH) */
  playerX?: number
  deliveryCountry?: string
  deliveryFlag?: string
}

export interface RunStats {
  supplies: number
  nearMisses: number
  hits: number
  bestCombo: number
}
