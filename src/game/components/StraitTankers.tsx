import { runtime, isSafeWater } from '../runtime'

/** Minimal tanker scene — no extra oil tankers.
 *  World Delivery: only the player tanker.
 *  Story Missions: only the player (mission) tanker.
 *  Strait Run: no random tankers. */
export default function StraitTankers() {
  return (
    <>
      {isSafeWater() && (
        <pointLight
          position={[runtime.player.x, 8, runtime.player.z - 20]}
          color="#67e8f9"
          intensity={2.8}
          distance={100}
        />
      )}
    </>
  )
}
