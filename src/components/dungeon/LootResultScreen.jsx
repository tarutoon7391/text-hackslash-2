// 勝利リザルト画面：獲得したドロップ装備の内容を表示し、「次の階へ」or「ロビーに戻る」を選ぶ
import { ELEMENTS } from '../../data/elements.js'
import { RARITIES } from '../../data/rarities.js'
import { WEAPON_TYPES } from '../../data/weaponTypes.js'
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'

const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' }

export default function LootResultScreen({ item, floor, onNext, onLobby }) {
  const rarity = RARITIES[item.rarity]
  const elem = ELEMENTS[item.element]

  return (
    <div className="loot-screen">
      <div className="loot-banner">🎉 勝利！</div>
      <div className="loot-drop-label">ドロップ獲得</div>

      <div className="loot-card" style={{ borderColor: rarity.color }}>
        <div className="loot-head">
          <span className="loot-name">
            {item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} {item.name}
          </span>
          <span className="loot-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
        </div>
        <div className="loot-meta">
          {elem.icon}{elem.name}属性 ／ {SLOT_LABELS[item.slot]}
          {item.slot === 'weapon' && ` ／ ATK+${item.atk}`}
          {item.slot === 'armor' && ` ／ DEF+${item.def}・HP+${item.hp}`}
          {item.slot === 'accessory' && ` ／ HP+${item.hp}・MP+${item.mp}`}
        </div>

        {/* スキル構成（武器のみ） */}
        {item.slot === 'weapon' && (
          <div className="loot-skills">
            {item.skills.length === 0 && <span className="skill-chip empty">スキルなし</span>}
            {item.skills.map((s, i) => {
              const sk = ALL_SKILLS_BY_ID[s.skillId]
              const elemClass = sk.element ? `elem-${sk.element}` : 'elem-none'
              return (
                <span key={i} className={`skill-chip ${elemClass}`}>
                  {'★'.repeat(sk.star)} {sk.name}{s.plus > 0 ? `(+${s.plus})` : ''}
                </span>
              )
            })}
          </div>
        )}

        {/* エンチャント構成 */}
        <div className="loot-enchants">
          {item.enchants.length === 0 && <span className="loot-enchant none">エンチャントなし</span>}
          {item.enchants.map((en, i) => (
            <span key={i} className={`loot-enchant ${en.kind}`}>
              ✦ {en.name.replace('%', '')}{en.value}%
            </span>
          ))}
        </div>
      </div>

      <div className="dungeon-actions">
        <button className="start-btn" onClick={onNext}>次の階へ進む（{floor + 1}階）</button>
        <button className="back-btn" onClick={onLobby}>ロビーに戻る</button>
      </div>
    </div>
  )
}
