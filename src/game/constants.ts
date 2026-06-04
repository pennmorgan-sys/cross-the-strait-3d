// Core tuning constants for Cross the Strait. Arcade feel over realism.

export const COLORS = {
  oceanNavy: '#061826',
  waterBlue: '#0B3A53',
  tealWake: '#12D6DF',
  warningRed: '#EF4444',
  explosionOrange: '#F97316',
  supplyGold: '#FACC15',
  radarGreen: '#22C55E',
  stormPurple: '#A855F7',
  uiWhite: '#F8FAFC',
} as const

export const STRAIT_HALF_WIDTH = 9 // playable corridor on X: [-9, 9]
/** Player oil tanker visual scale (hull length ~13 units) */
export const TANKER_SCALE = 0.42
/** Hitbox half-extents for the player tanker */
export const TANKER_HALF_W = 3.1
export const TANKER_HALF_L = 5.2
/** @deprecated use TANKER_HALF_W */
export const BOAT_RADIUS = TANKER_HALF_W
export const START_HEALTH = 3
export const MAX_HEALTH = 5
export const TOTAL_LEVELS = 8
export const CHAOS_LEVEL_ID = 99

export const STEER_SPEED = 15 // lateral acceleration response
export const MAX_LATERAL = 12
export const JUMP_VELOCITY = 11
export const GRAVITY = 26

export const BOOST_MULT = 1.7 // forward speed multiplier while boosting
export const BOOST_DRAIN = 0.7 // boost fuel per second while boosting
export const BOOST_REGEN = 0.06 // passive boost regen per second

export const SPAWN_AHEAD = 110 // how far ahead (-Z) hazards spawn
export const DESPAWN_BEHIND = 22 // recycle distance behind player

export const INVINCIBLE_MS = 1200
export const BOMB_WARNING_TIME = 1.65
export const BOMB_BLAST_RADIUS = 6.5
export const EXPLOSION_DURATION = 0.8
export const NEAR_MISS_DIST = 2.6

export const POWERUP_SLOW_MS = 3000
export const POWERUP_MAGNET_MS = 6000
export const POWERUP_RADAR_MS = 8000
export const OIL_SLIP_MS = 1600

export const MAX_MULTIPLIER = 5
export const COMBO_PER_STEP = 5 // combo points needed to raise multiplier
