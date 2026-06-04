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
import { clamp } from './systems/math'

const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  boost: false,
}

const joystick = { x: 0, y: 0, active: false }

export function setJoystick(x: number, y: number) {
  joystick.x = clamp(x, -1, 1)
  joystick.y = clamp(y, -1, 1)
  joystick.active = true
}
export function releaseJoystick() {
  joystick.x = 0
  joystick.y = 0
  joystick.active = false
}
export function setBoostBtn(active: boolean) {
  keys.boost = active
}

// -1 (left) .. 1 (right)
export function getSteer(): number {
  if (joystick.active && Math.abs(joystick.x) > 0.05) return joystick.x
  return (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
}
// -1 (slow/back) .. 1 (speed up). Joystick up = forward.
export function getThrottle(): number {
  if (joystick.active && Math.abs(joystick.y) > 0.05) return -joystick.y
  return (keys.up ? 1 : 0) - (keys.down ? 1 : 0)
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
