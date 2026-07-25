// ロビー（拠点）画面：職業と出発チェックポイントを選んでダンジョンへ出発する
// 装備の入手・変更はインベントリ（装備管理画面）経由のみ。ここでは
// 現在装備中の内容を最小限（名前・レア度）だけ表示し、タップで装備画面へ飛ばす
// 出発時の武器は装備スロット（武器）に入っているものを使う
// 職業は装備管理画面と共有するため親（App）が状態を持つ
import { useMemo, useState } from 'react'
import { JOBS, JOB_IDS, calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { RARITIES } from '../data/rarities.js'
import { EQUIP_SLOTS, calcTotalStats } from '../systems/equipmentState.js'
import CheckpointSelector from './dungeon/CheckpointSelector.jsx'

export default function SetupScreen({ onDepart, checkpoints, items, equipment, jobId, onSelectJob, onOpenEquipment }) {
  const [startFloor, setStartFloor] = useState(checkpoints[checkpoints.length - 1]) // 既定は最深チェックポイント

  const job = JOBS[jobId]
  const itemsById = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it])), [items])
  const stats = calcTotalStats({ baseStats: calcJobStats(jobId), slots: equipment.slots, itemsById })
  const weapon = itemsById[equipment.slots.weapon] || null
  // 装備後に職業を変えて、装備中の武器が使えない組み合わせになった場合は出発を止める
  const jobBlocked = Boolean(weapon) && !job.equipableWeaponTypes.includes(weapon.weaponType)

  return (
    <div className="setup">
      <h1 className="setup-title">⚔️ text-hackslash-2</h1>
      <p className="setup-sub">拠点ロビー</p>

      <h2 className="section-label">職業</h2>
      <div className="job-grid">
        {JOB_IDS.map((id) => {
          const j = JOBS[id]
          return (
            <button
              key={id}
              className={`job-card ${id === jobId ? 'selected' : ''}`}
              onClick={() => onSelectJob(id)}
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
        HP{stats.hp}／MP{stats.mp}／ATK{stats.atk}／DEF{stats.def}／SPD{stats.spd}／会心{stats.crit}%（装備込み）
      </div>

      {/* 現在装備中の簡易表示（名前・レア度のみ）。タップで装備管理画面へ */}
      <h2 className="section-label">現在の装備</h2>
      <div className="lobby-equip-grid">
        {EQUIP_SLOTS.map((slotDef) => {
          const item = itemsById[equipment.slots[slotDef.key]]
          const rarity = item ? RARITIES[item.rarity] : null
          return (
            <button
              key={slotDef.key}
              className={`lobby-equip-slot ${item ? 'filled' : ''}`}
              onClick={onOpenEquipment}
            >
              <span className="equip-slot-label">{slotDef.name}</span>
              <span className="equip-slot-item">
                {item
                  ? `${item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} ${item.name}`
                  : 'なし'}
              </span>
              {item && <span className="lobby-equip-rarity" style={{ color: rarity.color }}>{rarity.name}</span>}
            </button>
          )
        })}
      </div>
      <div className="equip-hint">タップで装備画面へ。付け替え・抽出・移植はそこから行う</div>

      <h2 className="section-label">出発チェックポイント</h2>
      <CheckpointSelector checkpoints={checkpoints} selected={startFloor} onSelect={setStartFloor} />

      <button
        className="start-btn"
        disabled={!weapon || jobBlocked}
        onClick={() => onDepart({ weapon, startFloor })}
      >
        🏰 {startFloor}階から出発！
      </button>
      {!weapon && (
        <div className="depart-note">⚠️ 武器を装備していない。「現在の装備」から装備しよう</div>
      )}
      {jobBlocked && (
        <div className="depart-note">
          🚫 {job.name}は{WEAPON_TYPES[weapon.weaponType].name}を装備できない。武器を変更しよう
        </div>
      )}
    </div>
  )
}
