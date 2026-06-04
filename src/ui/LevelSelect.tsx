import { useGame } from '../game/store'
import { LEVELS, CHAOS_LEVEL } from '../game/levels'
import { getMissionBriefing } from '../game/missionBriefings'

function Stars({ n }: { n: number }) {
  return (
    <div className="stars">
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0.22 }}>
          {'\u2605'}
        </span>
      ))}
    </div>
  )
}

export default function LevelSelect() {
  const setScreen = useGame((s) => s.setScreen)
  const startMission = useGame((s) => s.startMission)
  const startChaos = useGame((s) => s.startChaos)
  const best = useGame((s) => s.best)

  return (
    <div className="overlay dim levels-screen">
      <div className="levels-header">
        <h2 className="subtitle">MISSIONS</h2>
        <p className="muted">Eight tanker runs through the Strait. Beat targets for stars.</p>
      </div>

      <div className="levels-scroll">
        <div className="levels-grid">
          {LEVELS.map((lvl) => {
            const rec = best[lvl.id]
            const brief = getMissionBriefing(lvl.id)
            return (
              <div className="level-card" key={lvl.id}>
                <span className={`diff ${lvl.difficulty}`}>{lvl.difficulty}</span>
                <p className="level-codename">{brief.codename}</p>
                <h3>
                  {lvl.id}. {lvl.name}
                </h3>
                <div className="desc">{lvl.description}</div>
                <Stars n={rec?.stars ?? 0} />
                <div className="muted level-scores">
                  Target {lvl.targetScore.toLocaleString()} · Best{' '}
                  {(rec?.score ?? 0).toLocaleString()}
                </div>
                <div className="card-foot">
                  <button type="button" className="btn" onClick={() => startMission(lvl.id)}>
                    BRIEFING
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="level-card chaos-card">
          <span className="diff Chaos">CHAOS</span>
          <p className="level-codename">{getMissionBriefing(CHAOS_LEVEL.id).codename}</p>
          <h3>{CHAOS_LEVEL.name}</h3>
          <div className="desc">{CHAOS_LEVEL.description}</div>
          <Stars n={best[CHAOS_LEVEL.id]?.stars ?? 0} />
          <div className="muted level-scores">
            Target {CHAOS_LEVEL.targetScore.toLocaleString()} · Best{' '}
            {(best[CHAOS_LEVEL.id]?.score ?? 0).toLocaleString()}
          </div>
          <div className="card-foot">
            <button type="button" className="btn danger" onClick={startChaos}>
              CHAOS BRIEFING
            </button>
          </div>
        </div>
      </div>

      <div className="btn-row">
        <button type="button" className="btn secondary" onClick={() => setScreen('menu')}>
          {'\u2190'} MAIN MENU
        </button>
      </div>
    </div>
  )
}
