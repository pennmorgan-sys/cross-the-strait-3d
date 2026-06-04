import { useGame } from './game/store'
import { useKeyboard } from './game/input'
import GameCanvas from './game/components/GameCanvas'
import Hud from './ui/Hud'
import MainMenu from './ui/MainMenu'
import LevelSelect from './ui/LevelSelect'
import PauseOverlay from './ui/PauseOverlay'
import GameOverScreen from './ui/GameOverScreen'
import WinScreen from './ui/WinScreen'
import ControlsModal from './ui/ControlsModal'
import SettingsModal from './ui/SettingsModal'
import MobileControls from './ui/MobileControls'
import GlobeIntro from './ui/GlobeIntro'
import MissionBriefing from './ui/MissionBriefing'
import PerformanceOverlay from './ui/PerformanceOverlay'

export default function App() {
  useKeyboard()

  const screen = useGame((s) => s.screen)
  const paused = useGame((s) => s.paused)
  const controlsOpen = useGame((s) => s.controlsOpen)
  const settingsOpen = useGame((s) => s.settingsOpen)

  return (
    <div className="app">
      {screen === 'playing' && (
        <div className="canvas-wrap">
          <GameCanvas />
        </div>
      )}

      {screen === 'intro' && <GlobeIntro />}
      {screen === 'menu' && <MainMenu />}
      {screen === 'levels' && <LevelSelect />}
      {screen === 'briefing' && <MissionBriefing />}

      {screen === 'playing' && (
        <>
          <Hud />
          <MobileControls />
          {paused && <PauseOverlay />}
        </>
      )}

      {screen === 'gameOver' && <GameOverScreen />}
      {screen === 'win' && <WinScreen />}

      {controlsOpen && <ControlsModal />}
      {settingsOpen && <SettingsModal />}
      {import.meta.env.DEV && <PerformanceOverlay />}
    </div>
  )
}
