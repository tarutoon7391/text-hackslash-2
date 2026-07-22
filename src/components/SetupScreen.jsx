// セットアップ画面：職業とテスト武器と敵を選んで戦闘開始
// スキルチップ：1回タップで白枠選択、選択状態でもう1回タップすると詳細ポップアップ
import { useState, useMemo } from 'react'
import { JOBS, JOB_IDS, calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { ELEMENTS } from '../data/elements.js'
import { RARITIES } from '../data/rarities.js'
import { ENEMIES, ENEMY_IDS } from '../data/enemies.js'
import { SAMPLE_WEAPONS } from '../data/sampleWeapons.js'
import { ALL_SKILLS_BY_ID } from '../data/skills_elemental.js'
import SkillDetailPopup from './battle/SkillDetailPopup.jsx'

export default function SetupScreen({ onStart }) {
  const [jobId, setJobId] = useState('swordsman')
  const [weaponId, setWeaponId] = useState(null)
  const [enemyId, setEnemyId] = useState('goblin')
  const [selectedChip, setSelectedChip] = useState(null) // `${weaponId}:${index}`
  const [popupSkill, setPopupSkill] = useState(null)     // {skill, plus}

  const job = JOBS[jobId]
  const equipable = useMemo(
    () => SAMPLE_WEAPONS.filter((w) => job.equipableWeaponTypes.includes(w.weaponType)),
    [jobId]
  )
  const weapon = equipable.find((w) => w.id === weaponId) || equipable[0]
  const stats = calcJobStats(jobId)

  // スキルチップのタップ：1回目=白枠選択、2回目=詳細ポップアップ
  const onChipTap = (ev, w, index) => {
    ev.stopPropagation() // 武器カードの選択切り替えを発火させない
    const key = `${w.id}:${index}`
    if (selectedChip !== key) {
      setSelectedChip(key)
    } else {
      const s = w.skills[index]
      setPopupSkill({ skill: ALL_SKILLS_BY_ID[s.skillId], plus: s.plus })
    }
  }

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
              onClick={() => { setJobId(id); setWeaponId(null); setSelectedChip(null) }}
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
            <div
              key={w.id}
              role="button"
              tabIndex={0}
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
                  const elemClass = sk.element ? `elem-${sk.element}` : 'elem-none'
                  const key = `${w.id}:${i}`
                  return (
                    <span
                      key={i}
                      className={`skill-chip ${elemClass} ${selectedChip === key ? 'selected' : ''}`}
                      onClick={(ev) => onChipTap(ev, w, i)}
                    >
                      {'★'.repeat(sk.star)} {sk.name}{s.plus > 0 ? `(+${s.plus})` : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <h2 className="section-label">敵</h2>
      <div className="enemy-grid">
        {ENEMY_IDS.map((id) => {
          const en = ENEMIES[id]
          const elem = ELEMENTS[en.element]
          return (
            <button
              key={id}
              className={`enemy-card ${id === enemyId ? 'selected' : ''}`}
              onClick={() => setEnemyId(id)}
            >
              <span className="enemy-icon">{en.icon}</span>
              <span className="enemy-name">{en.name}</span>
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

      {/* スキル詳細ポップアップ（セットアップ画面では「使う」なし） */}
      {popupSkill && (
        <SkillDetailPopup
          skill={popupSkill.skill}
          displayName={popupSkill.plus > 0 ? `${popupSkill.skill.name}(+${popupSkill.plus})` : popupSkill.skill.name}
          onClose={() => setPopupSkill(null)}
        />
      )}
    </div>
  )
}
