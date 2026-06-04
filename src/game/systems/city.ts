import * as THREE from 'three'

// Procedural night-city building textures: a dark facade with a grid of
// randomly-lit windows. Used as both map and emissiveMap so the windows glow
// (and get picked up by bloom) for a believable skyline with zero assets.
let cached: THREE.Texture[] | null = null

const WINDOW_COLORS = ['#ffd98a', '#ffe9b0', '#7fe9f2', '#cfe0ff', '#ffb45c']

function makeVariant(seed: number): THREE.Texture {
  const w = 64
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Facade.
  ctx.fillStyle = '#070b12'
  ctx.fillRect(0, 0, w, h)

  const cols = 4 + (seed % 3)
  const rows = 12
  const padX = 6
  const padY = 5
  const cellW = (w - padX * 2) / cols
  const cellH = (h - padY * 2) / rows
  const winW = cellW * 0.62
  const winH = cellH * 0.55

  // Deterministic-ish PRNG so variants are stable.
  let s = seed * 9301 + 49297
  const rng = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rng() > 0.42
      const x = padX + c * cellW + (cellW - winW) / 2
      const y = padY + r * cellH + (cellH - winH) / 2
      if (lit) {
        const col = WINDOW_COLORS[Math.floor(rng() * WINDOW_COLORS.length)]
        ctx.fillStyle = col
        ctx.globalAlpha = 0.65 + rng() * 0.35
      } else {
        ctx.fillStyle = '#0e131c'
        ctx.globalAlpha = 1
      }
      ctx.fillRect(x, y, winW, winH)
    }
  }
  ctx.globalAlpha = 1

  // Roof line / antenna hint.
  ctx.fillStyle = '#05080e'
  ctx.fillRect(0, 0, w, padY)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

export function cityTextures(): THREE.Texture[] {
  if (cached) return cached
  cached = [makeVariant(1), makeVariant(2), makeVariant(3), makeVariant(4)]
  return cached
}

let dayCached: THREE.Texture[] | null = null

function makeDayVariant(seed: number): THREE.Texture {
  const w = 64
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#c4b59a'
  ctx.fillRect(0, 0, w, h)
  const cols = 4 + (seed % 2)
  const rows = 10
  let s = seed * 7919 + 104729
  const rng = () => {
    s = (s * 7919 + 104729) % 233280
    return s / 233280
  }
  const padX = 5
  const padY = 4
  const cellW = (w - padX * 2) / cols
  const cellH = (h - padY * 2) / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rng() > 0.7
      ctx.fillStyle = lit ? '#5a6a7a' : '#8a7d68'
      ctx.globalAlpha = lit ? 0.5 : 0.85
      ctx.fillRect(
        padX + c * cellW + cellW * 0.15,
        padY + r * cellH + cellH * 0.2,
        cellW * 0.7,
        cellH * 0.55,
      )
    }
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#9a8b72'
  ctx.fillRect(0, 0, w, 6)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

export function dayCityTextures(): THREE.Texture[] {
  if (dayCached) return dayCached
  dayCached = [makeDayVariant(11), makeDayVariant(22), makeDayVariant(33)]
  return dayCached
}
