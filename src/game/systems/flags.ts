import * as THREE from 'three'

// Procedural national-flag textures drawn to canvas so we ship no external
// assets. Stylized/simplified arcade renditions, not exact specifications.

let iran: THREE.Texture | null = null
let usa: THREE.Texture | null = null

function finalize(canvas: HTMLCanvasElement): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function iranFlagTexture(): THREE.Texture {
  if (iran) return iran
  const w = 210
  const h = 120
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  // Tricolor: green / white / red
  ctx.fillStyle = '#239f40'
  ctx.fillRect(0, 0, w, h / 3)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, h / 3, w, h / 3)
  ctx.fillStyle = '#da0000'
  ctx.fillRect(0, (2 * h) / 3, w, h / 3)

  // Stylized red central emblem (simplified, symmetric mark).
  ctx.fillStyle = '#da0000'
  const cx = w / 2
  const cy = h / 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - 16)
  ctx.lineTo(cx + 7, cy + 6)
  ctx.lineTo(cx, cy + 12)
  ctx.lineTo(cx - 7, cy + 6)
  ctx.closePath()
  ctx.fill()
  for (const dx of [-12, 12]) {
    ctx.beginPath()
    ctx.moveTo(cx + dx, cy - 8)
    ctx.lineTo(cx + dx * 1.5, cy + 8)
    ctx.lineTo(cx + dx * 0.5, cy + 8)
    ctx.closePath()
    ctx.fill()
  }

  // Kufic-style border ticks along the band edges (suggestive, not text).
  const tick = (y: number, color: string) => {
    ctx.fillStyle = color
    for (let x = 4; x < w; x += 10) ctx.fillRect(x, y, 5, 3)
  }
  tick(h / 3 - 4, '#ffffff')
  tick((2 * h) / 3 + 1, '#ffffff')

  iran = finalize(c)
  return iran
}

export function usaFlagTexture(): THREE.Texture {
  if (usa) return usa
  const w = 228
  const h = 120
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  // 13 stripes, starting red.
  const stripeH = h / 13
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff'
    ctx.fillRect(0, i * stripeH, w, stripeH + 1)
  }
  // Blue canton.
  const cw = w * 0.42
  const ch = stripeH * 7
  ctx.fillStyle = '#3c3b6e'
  ctx.fillRect(0, 0, cw, ch)
  // Star grid (approximation).
  ctx.fillStyle = '#ffffff'
  const cols = 9
  const rows = 7
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if ((r + col) % 2 !== 0) continue
      const x = ((col + 0.5) / cols) * cw
      const y = ((r + 0.5) / rows) * ch
      ctx.beginPath()
      ctx.arc(x, y, 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  usa = finalize(c)
  return usa
}
