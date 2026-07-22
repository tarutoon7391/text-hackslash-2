// 勝利リザルト画面：獲得したドロップ装備の内容を表示し、「次の階へ」or「ロビーに戻る」を選ぶ
// スキル表示は戦闘画面と同じ仕組み（ItemSkillList→SkillDetailPopup→用語ポップアップ）を再利用
// エンチャントもタップで詳細（ItemEnchantList→EnchantDetailPopup）
import { ELEMENTS } from '../../data/elements.js'
import { RARITIES } from '../../data/rarities.js'
import { WEAPON_TYPES } from '../../data/weaponTypes.js'
import ItemSkillList from '../common/ItemSkillList.jsx'
import ItemEnchantList from '../common/ItemEnchantList.jsx'

const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' }

export default function LootResultScreen({ item, floor, onNext, onLobby, onOpenDictionary }) {
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

        {/* スキル構成（武器のみ）：戦闘画面と同じスキルボタン＋詳細ポップアップを再利用 */}
        {item.slot === 'weapon' && (
          <ItemSkillList skills={item.skills} onOpenDictionary={onOpenDictionary} />
        )}

        {/* エンチャント構成：タップで詳細 */}
        <ItemEnchantList enchants={item.enchants} />
      </div>

      <div className="dungeon-actions">
        <button className="start-btn" onClick={onNext}>次の階へ進む（{floor + 1}階）</button>
        <button className="back-btn" onClick={onLobby}>ロビーに戻る</button>
      </div>
    </div>
  )
}
