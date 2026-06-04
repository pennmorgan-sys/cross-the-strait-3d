/** Lightweight procedural SFX — no asset files required */

let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

export function isSoundEnabled() {
  return enabled
}

export function initAudio() {
  if (typeof window === 'undefined') return
  try {
    if (!ctx) ctx = new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* ignore */
  }
}

function blip(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.12,
  slide = 0,
) {
  if (!enabled || !ctx) return
  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(freq + slide, t0 + duration)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function noiseBurst(duration: number, gain = 0.08) {
  if (!enabled || !ctx) return
  const t0 = ctx.currentTime
  const bufferSize = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  src.connect(g)
  g.connect(ctx.destination)
  src.start(t0)
}

export const sfx = {
  ui: () => blip(520, 0.06, 'sine', 0.08),
  start: () => {
    blip(220, 0.12, 'triangle', 0.1)
    setTimeout(() => blip(440, 0.14, 'sine', 0.1), 80)
  },
  pickup: () => blip(880, 0.07, 'sine', 0.1, 200),
  hit: () => {
    blip(90, 0.18, 'sawtooth', 0.14, -40)
    noiseBurst(0.12, 0.06)
  },
  nearMiss: () => blip(640, 0.05, 'triangle', 0.07),
  boost: () => blip(320, 0.08, 'square', 0.05, 80),
  surprise: () => {
    blip(180, 0.1, 'sawtooth', 0.09)
    setTimeout(() => blip(300, 0.12, 'sawtooth', 0.08), 60)
  },
  milestone: () => blip(660, 0.1, 'sine', 0.09, 120),
  win: () => {
    blip(392, 0.15, 'sine', 0.1)
    setTimeout(() => blip(523, 0.15, 'sine', 0.1), 120)
    setTimeout(() => blip(659, 0.22, 'sine', 0.12), 240)
  },
  gameOver: () => blip(110, 0.35, 'sawtooth', 0.12, -30),
}
