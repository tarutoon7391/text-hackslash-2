// セットアップ画面：職業とテスト武器と敵を選んで戦闘開始
import { useState, useMemo } from 'react'
import { JOBS, JOB_IDS, calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { ELEMENTS } from '../data/elements.js'
import { RARITIES } from '../data/rarities.js'
import { ENEMIES, ENEMY_IDS } from '../data/enemies.js'
import { SAMPLE_WEAPONS } from '../data/sampleWeapons.js'
import { ALL_SKILLS_BY_ID } from '../data/skills_elemental.js'

export default function SetupScreen({ onStart }) {
  const [jobId, setJobId] = useState('swordsman')
  const [weaponId, setWeaponId] = useState(null)
  const [enemyId, setEnemyId] = useState('goblin')

  const job = JOBS[jobId]
  const equipable = useMemo(
    () => SAMPLE_WEAPONS.filter((w) => job.equipableWeaponTypes.includes(w.weaponType)),
    [jobId]
  )
  const weapon = equipable.find((w) => w.id === weaponId) || equipable[0]
  const stats = calcJobStats(jobId)

  return (
    <div className="setup">
      <h1 className="setup-title">⚔️ text-hackslash-2</h1>
      <p className="setup-sub">フェーズ1：ソロ戦闘テスト</p>

      <h2 className="section-label">職業</h2>
      <div className="job-grid">
        {JOB_IDS.map((id) => {
          const j = JOBS[id]
          return (
            <button
              key={id}
              className={`job-card ${id === jobId ? 'selected' : ''}`}
              onClick={() => { setJobId(id); setWeaponId(null) }}
            >
              <span className="job-icon">{j.icon}</span>
              <span className="job-name">{j.name}</span>
              <span className="job-weapons">
                {j.equipableWeaponTypes.map((wt) => WEAPON_TYPES[wt].name).join('・')}
              </span>
            </button>
          )
        })}
      </div>
      <div className="stat-row">
        HP{stats.hp}／MP{stats.mp}／ATK{stats.atk}／DEF{stats.def}／SPD{stats.spd}／会心{stats.crit}%
      </div>

      <h2 className="section-label">武器（テスト用サンプル）</h2>
      <div className="weapon-list">
        {equipable.map((w) => {
          const rarity = RARITIES[w.rarity]
          const elem = ELEMENTS[w.element]
          return (
            <button
              key={w.id}
              className={`weapon-card ${w.id === weapon?.id ? 'selected' : ''}`}
              style={{ borderColor: w.id === weapon?.id ? rarity.color : undefined }}
              onClick={() => setWeaponId(w.id)}
            >
              <div className="weapon-head">
                <span>{WEAPON_TYPES[w.weaponType].icon} {w.name}</span>
                <span className="weapon-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
              </div>
              <div className="weapon-meta">
                {elem.icon}{elem.name}属性 ／ ATK+{w.atk}
              </div>
              <div className="weapon-skills">
                {w.skills.length === 0 && <span className="skill-chip empty">スキルなし</span>}
                {w.skills.map((s, i) => {
                  const sk = ALL_SKILLS_BY_ID[s.skillId]
                  return (
                    <span key={i} className={`skill-chip ${sk.element ? 'elemental' : ''}`}>
                      {'★'.repeat(sk.star)} {sk.name}{s.plus > 0 ? `(+${s.plus})` : ''}
                    </span>
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>

      <h2 className="section-label">敵</h2>
      <div className="enemy-grid">
        {ENEMY_IDS.map((id) => {
          const e = ENEMIES[id]
          const elem = ELEMENTS[e.element]
          return (
            <button
              key={id}
              className={`enemy-card ${id === enemyId ? 'selected' : ''}`}
              onClick={() => setEnemyId(id)}
            >
              <span className="enemy-icon">{e.icon}</span>
              <span className="enemy-name">{e.name}</span>
              <span className="enemy-elem">{elem.icon}{elem.name}</span>
            </button>
          )
        })}
      </div>
      <div className="stat-row">{ENEMIES[enemyId].description}</div>

      <button
        className="start-btn"
        disabled={!weapon}
        onClick={() => onStart({ jobId, weapon, enemyId })}
      >
        戦闘開始！
      </button>
    </div>
  )
}
