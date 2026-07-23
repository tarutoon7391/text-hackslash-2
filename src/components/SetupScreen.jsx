// ロビー（拠点）画面：職業・武器・出発チェックポイントを選んでダンジョンへ出発する
// 武器はテスト用サンプルに加えて、ドロップで入手したインベントリの武器も選べる
// （本格的な抽出・移植UIはフェーズ3。ここでは「装備する武器を選ぶ」だけのシンプルな一覧）
// スキル/エンチャントはLootResultScreenと同じ共通チップコンポーネント
// （SkillChipList／EnchantChipList→各詳細ポップアップ）で表示する
import { useState, useMemo } from 'react'
import { JOBS, JOB_IDS, calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { ELEMENTS } from '../data/elements.js'
import { RARITIES } from '../data/rarities.js'
import { SAMPLE_WEAPONS } from '../data/sampleWeapons.js'
import SkillChipList from './common/SkillChipList.jsx'
import EnchantChipList from './common/EnchantChipList.jsx'
import CheckpointSelector from './dungeon/CheckpointSelector.jsx'

export default function SetupScreen({ onDepart, checkpoints, inventory, initialJobId, initialWeaponId, onOpenDictionary }) {
  const [jobId, setJobId] = useState(initialJobId || 'swordsman')
  const [weaponId, setWeaponId] = useState(initialWeaponId || null)
  const [startFloor, setStartFloor] = useState(checkpoints[checkpoints.length - 1]) // 既定は最深チェックポイント

  const job = JOBS[jobId]
  // 装備可能武器：テスト用サンプル＋インベントリのドロップ武器
  const inventoryWeapons = inventory.filter((it) => it.slot === 'weapon')
  const equipableSamples = useMemo(
    () => SAMPLE_WEAPONS.filter((w) => job.equipableWeaponTypes.includes(w.weaponType)),
    [jobId]
  )
  const equipableDrops = inventoryWeapons.filter((w) => job.equipableWeaponTypes.includes(w.weaponType))
  const allEquipable = [...equipableDrops, ...equipableSamples]
  const weapon = allEquipable.find((w) => w.id === weaponId) || allEquipable[0]
  const stats = calcJobStats(jobId)

  const renderWeaponCard = (w, isDrop) => {
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
          <span>{WEAPON_TYPES[w.weaponType].icon} {w.name}{isDrop && <span className="drop-tag">{w.floor}階産</span>}</span>
          <span className="weapon-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
        </div>
        <div className="weapon-meta">
          {elem.icon}{elem.name}属性 ／ ATK+{w.atk}
        </div>
        {/* スキル構成（チップ形式。タップで詳細ポップアップ） */}
        <SkillChipList skills={w.skills} onOpenDictionary={onOpenDictionary} />
        {/* エンチャント（ドロップ品のみ持つ。タップで詳細） */}
        {w.enchants && w.enchants.length > 0 && <EnchantChipList enchants={w.enchants} />}
      </div>
    )
  }

  return (
    <div className="setup">
      <h1 className="setup-title">⚔️ text-hackslash-2</h1>
      <p className="setup-sub">拠点ロビー</p>

      {/* 用語辞典への導線 */}
      <button className="dict-link" onClick={onOpenDictionary}>📖 用語辞典</button>

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

      {equipableDrops.length > 0 && (
        <>
          <h2 className="section-label">武器（ドロップ入手）</h2>
          <div className="weapon-list">
            {equipableDrops.map((w) => renderWeaponCard(w, true))}
          </div>
        </>
      )}

      <h2 className="section-label">武器（テスト用サンプル）</h2>
      <div className="weapon-list">
        {equipableSamples.map((w) => renderWeaponCard(w, false))}
      </div>

      <h2 className="section-label">出発チェックポイント</h2>
      <CheckpointSelector checkpoints={checkpoints} selected={startFloor} onSelect={setStartFloor} />

      <button
        className="start-btn"
        disabled={!weapon}
        onClick={() => onDepart({ jobId, weapon, startFloor })}
      >
        🏰 {startFloor}階から出発！
      </button>
    </div>
  )
}
