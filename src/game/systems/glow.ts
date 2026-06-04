import * as THREE from 'three'

// A soft round radial-gradient sprite texture. Using this for additive sprites
// (bomb glow, explosions, drone engines, embers, deck lights) is what makes the
// scene read as cinematic glow instead of hard-edged primitive blocks.
let cached: THREE.Texture | null = null

export function glowTexture(): THREE.Texture {
  if (cached) return cached
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  cached = tex
  return tex
}
