export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Frame-rate independent smoothing factor for exponential lerps.
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt)

export const rand = (min: number, max: number) => min + Math.random() * (max - min)

export const pick = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

export const TAU = Math.PI * 2
