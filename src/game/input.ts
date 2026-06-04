import { useEffect } from 'react'
import { useGame } from './store'
import {
  runtime,
  startLevel,
  usePowerUp,
  finishLevel,
  damage,
  addScore,
} from './runtime'
import { clamp, damp, lerp } from './systems/math'

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false,
}

/** Raw touch target (updated on pointer events) */
const joystickRaw = { x: 0, y: 0, active: false }
/** Smoothed stick — updated each frame in tickInputSmoothing */
const joystickSmooth = { x: 0, y: 0 }
const keySteerSmooth = { v: 0 }
const keyThrottleSmooth = { v: 0 }

export function setJoystick(x: number, y: number) {
  joystickRaw.x = clamp(x, -1, 1)
  joystickRaw.y = clamp(y, -1, 1)
  joystickRaw.active = true
}

export function releaseJoystick() {
  joystickRaw.x = 0
  joystickRaw.y = 0
  joystickRaw.active = false
}

export function setBoostBtn(active: boolean) {
  keys.boost = active
}

function deadzone(v: number, zone: number) {
  const a = Math.abs(v)
  if (a < zone) return 0
  const sign = v < 0 ? -1 : 1
  return (sign * (a - zone)) / (1 - zone)
}

function keySteerTarget() {
  return (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
}

function keyThrottleTarget() {
  return (keys.up ? 1 : 0) - (keys.down ? 1 : 0)
}

/** Call once per render frame (R3F useFrame) for butter-smooth stick + keys */
export function tickInputSmoothing(dt: number) {
  const d = Math.min(Math.max(dt, 0.001), 0.05)
  const stickRate = joystickRaw.active ? 16 : 22
  const stickT = damp(stickRate, d)

  if (joystickRaw.active) {
    joystickSmooth.x = lerp(joystickSmooth.x, joystickRaw.x, stickT)
    joystickSmooth.y = lerp(joystickSmooth.y, joystickRaw.y, stickT)
  } else {
    joystickSmooth.x = lerp(joystickSmooth.x, 0, stickT)
    joystickSmooth.y = lerp(joystickSmooth.y, 0, stickT)
    if (Math.abs(joystickSmooth.x) < 0.004) joystickSmooth.x = 0
    if (Math.abs(joystickSmooth.y) < 0.004) joystickSmooth.y = 0
  }

  const keyRate = 12
  const keyT = damp(keyRate, d)
  keySteerSmooth.v = lerp(keySteerSmooth.v, keySteerTarget(), keyT)
  keyThrottleSmooth.v = lerp(keyThrottleSmooth.v, keyThrottleTarget(), keyT)
}

/** Visual nub position in pixels — matches smoothed game input */
export function getJoystickNubPx(radius: number) {
  return {
    x: joystickSmooth.x * radius,
    y: joystickSmooth.y * radius,
  }
}

export function isJoystickActive() {
  return joystickRaw.active || Math.hypot(joystickSmooth.x, joystickSmooth.y) > 0.02
}

// -1 (left) .. 1 (right)
export function getSteer(): number {
  if (joystickRaw.active || Math.abs(joystickSmooth.x) > 0.02) {
    return deadzone(joystickSmooth.x, 0.07)
  }
  return deadzone(keySteerSmooth.v, 0.02)
}

// -1 (slow/back) .. 1 (speed up). Joystick up = forward.
export function getThrottle(): number {
  if (joystickRaw.active || Math.abs(joystickSmooth.y) > 0.02) {
    return deadzone(-joystickSmooth.y, 0.07)
  }
  return deadzone(keyThrottleSmooth.v, 0.02)
}

export function isBoosting(): boolean {
  return keys.boost
}

export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = useGame.getState()
      if (e.repeat) return
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keys.left = true
          break
        case 'ArrowRight':
        case 'KeyD':
          keys.right = true
          break
        case 'ArrowUp':
        case 'KeyW':
          keys.up = true
          break
        case 'ArrowDown':
        case 'KeyS':
          keys.down = true
          break
        case 'Space':
          e.preventDefault()
          keys.boost = true
          break
        case 'KeyE':
          usePowerUp()
          break
        case 'KeyP':
        case 'Escape':
          g.togglePause()
          break
        case 'KeyR':
          if (g.screen === 'gameOver') startLevel(g.selectedLevel)
          break
      }

      if (import.meta.env.DEV) {
        switch (e.code) {
          case 'Digit1':
            startLevel(1)
            break
          case 'Digit2':
            startLevel(2)
            break
          case 'Digit3':
            startLevel(3)
            break
          case 'Digit4':
            startLevel(4)
            break
          case 'Digit5':
            startLevel(5)
            break
          case 'KeyL':
            if (runtime.running) finishLevel()
            break
          case 'KeyK':
            damage(1)
            break
          case 'KeyM':
            addScore(5000, false)
            break
          case 'KeyB':
            runtime.debugBombReq++
            break
        }
      }
    }

    const up = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keys.left = false
          break
        case 'ArrowRight':
        case 'KeyD':
          keys.right = false
          break
        case 'ArrowUp':
        case 'KeyW':
          keys.up = false
          break
        case 'ArrowDown':
        case 'KeyS':
          keys.down = false
          break
        case 'Space':
          keys.boost = false
          break
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
}
