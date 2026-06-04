# Cross the Strait

**Pilot the tanker. Survive the Strait. Reach safe water.**

A 3D arcade survival game built with **React Three Fiber** and **Three.js**. You captain a **lead oil tanker** through the Strait of Hormuz — dodge mines, missiles, intercept craft, and coastal strikes, grab supplies and tools, and push through eight operation briefings plus a chaos mode.

> Fictional arcade action. No real countries, factions, or military simulation.

## Tech stack

- Vite + React + TypeScript
- Three.js + @react-three/fiber + @react-three/drei
- zustand for game state
- @react-three/postprocessing (bloom, vignette)

## Install & run

```bash
npm install
npm run dev      # start dev server (Vite)
npm run build    # type-check + production build
npm run preview  # preview the production build
```

Open the printed local URL in your browser.

## Controls

**Desktop**

| Action | Keys |
| --- | --- |
| Steer tanker | `A` `D` / `←` `→` |
| Speed up / slow | `W` `S` |
| Engine boost | `Space` |
| Minesweeper / tool | `E` |
| Pause | `P` / `Esc` |
| Retry (game over) | `R` |

**Mobile** — on-screen joystick, BOOST, POWER, pause.

## Features

- **8 story missions** with operation codenames and surprise intel
- **Chaos Challenge** — escalating random events
- **Night mode** — stars, moon, lit coasts
- **Convoy partners** on select missions (twin tanker formation)
- **Surprise events** — flares, salvos, EMP, supply drops, intercept waves

## Ship

You control the **lead oil tanker** (black hull, cargo domes, bridge aft, route stripe). A second convoy tanker may trail on harder missions.

## License

Private / project use — see repository owner.
