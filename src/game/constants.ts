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
export const START_HEALTH = 5
export const MAX_HEALTH = 6
export const TOTAL_LEVELS = 5
export const CHAOS_LEVEL_ID = 99
/** Endless high-score run — Strait of Hormuz */
export const ENDLESS_LEVEL_ID = 100
/** World Delivery — pick country, complete Hormuz escort */
export const DELIVERY_LEVEL_ID = 101

export const STEER_SPEED = 15 // lateral acceleration response
export const MAX_LATERAL = 12
export const JUMP_VELOCITY = 11
export const GRAVITY = 26

export const BOOST_MULT = 1.7 // forward speed multiplier while boosting
export const BOOST_DRAIN = 0.7 // boost fuel per second while boosting
export const BOOST_REGEN = 0.09 // passive boost regen per second

export const SPAWN_AHEAD = 110 // how far ahead (-Z) hazards spawn
export const DESPAWN_BEHIND = 22 // recycle distance behind player

export const INVINCIBLE_MS = 1500
export const BOMB_WARNING_TIME = 2.45
export const BOMB_BLAST_RADIUS = 6
export const EXPLOSION_DURATION = 0.8
export const NEAR_MISS_DIST = 2.6

/** Scales random mine rolls from level.mineBias (publish tuning — fewer mines) */
export const MINE_SPAWN_MULT = 0.52

export const PICKUP_RADIUS = 4.2
export const POWERUP_SPAWN_CHANCE = 0.26

/** Default supply pacing (overridable per level) */
export const NORMAL_SUPPLY_INTERVAL_SEC = 3.8
export const MAX_VISIBLE_SUPPLIES = 3
export const SPECIAL_SUPPLY_BURST_MAX = 3

/** Hard caps for active gameplay objects (tier scales in performance.ts) */
export const MAX_ACTIVE = {
  BOMBS: 8,
  EXPLOSIONS: 6,
  SMOKE: 70,
  MISSILE_TRAILS: 35,
  SUPPLIES: 8,
  HAZARDS: 40,
  PARTICLES: 160,
  SKY_MISSILES: 12,
} as const

export const POWERUP_SLOW_MS = 4500
export const POWERUP_MAGNET_MS = 9000
export const POWERUP_RADAR_MS = 11000
export const OIL_SLIP_MS = 1600

export const MAX_MULTIPLIER = 5
export const COMBO_PER_STEP = 5 // combo points needed to raise multiplier
