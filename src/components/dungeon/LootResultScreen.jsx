// 勝利リザルト画面：獲得した経験値・欠片・（落ちていれば）装備を表示し、「次の階へ」or「ロビーに戻る」を選ぶ
// ドロップは素材（欠片）メイン。装備は雑魚だとたまに、ボスは確定で落ちる
// スキル/エンチャントは共通チップコンポーネントで表示する
import { getElementDef, getElementLabel } from '../../data/elements.js'
import { RARITIES } from '../../data/rarities.js'
import { WEAPON_TYPES } from '../../data/weaponTypes.js'
import { PROGRESSION_CONFIG } from '../../data/progressionConfig.js'
import SkillChipList from '../common/SkillChipList.jsx'
import EnchantChipList from '../common/EnchantChipList.jsx'
import PixelSprite from '../battle/PixelSprite.jsx'

const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' }

export default function LootResultScreen({ result, jobName, hp = null, maxHp = null, allyStatus = null, onNext, onLobby, onOpenDictionary }) {
  // recruited：勧誘で仲間にしたモンスター（その場合は敵を倒していないのでドロップ＝item・shardsは無い）
  // ally：連れている仲間の経験値結果 {name, levelBefore, levelAfter}（連れていなければnull）
  const { floor, item, shards, exp, levelBefore, levelAfter, recruited = null, ally = null } = result
  const rarity = item ? RARITIES[item.rarity] : null
  const leveledUp = levelAfter > levelBefore

  return (
    <div className="loot-screen">
      <div className="loot-banner">{recruited ? '🤝 仲間になった！' : '🎉 勝利！'}</div>

      {recruited && (
        <div className="monster-card recruited">
          <div className="monster-sprite">
            <PixelSprite enemyDef={{ isBoss: recruited.isBoss, sprite: recruited.sprite }} element={recruited.element} size={72} />
          </div>
          <div className="monster-info">
            <div className="monster-name">{recruited.name}</div>
            <div className="weapon-meta">{getElementDef(recruited.element).icon}{getElementLabel(recruited.element)}</div>
            <div className="weapon-meta">
              HP{recruited.stats.hp}／ATK{recruited.stats.atk}／DEF{recruited.stats.def}／SPD{recruited.stats.spd}
            </div>
          </div>
        </div>
      )}

      {/* 経験値と素材（毎回もらえる） */}
      <div className="loot-gains">
        <div className="loot-gain-row">
          <span>{jobName} 経験値</span>
          <span className="loot-gain-value">+{exp}</span>
        </div>
        {leveledUp && (
          <div className="loot-levelup">⬆ レベルアップ！ Lv{levelBefore} → Lv{levelAfter}</div>
        )}
        {ally && (
          <div className="loot-gain-row">
            <span>🤝 {ally.name} 経験値</span>
            <span className="loot-gain-value">+{exp}</span>
          </div>
        )}
        {ally && ally.levelAfter > ally.levelBefore && (
          <div className="loot-levelup">⬆ {ally.name} レベルアップ！ Lv{ally.levelBefore} → Lv{ally.levelAfter}</div>
        )}
        {hp != null && maxHp != null && (
          <div className="loot-gain-row">
            <span>残りHP（次の階に持ち越し）</span>
            <span className={`loot-gain-value ${hp / maxHp <= 0.3 ? 'low' : ''}`}>{Math.min(hp, maxHp)}/{maxHp}</span>
          </div>
        )}
        {allyStatus && (
          <div className="loot-gain-row">
            <span>{allyStatus.name} 残りHP{allyStatus.hp <= 0 ? '（戦闘不能）' : ''}</span>
            <span className={`loot-gain-value ${allyStatus.hp / allyStatus.maxHp <= 0.3 ? 'low' : ''}`}>{allyStatus.hp}/{allyStatus.maxHp}</span>
          </div>
        )}
        {shards && (
          <div className="loot-gain-row">
            <span>🔷 {PROGRESSION_CONFIG.material.shardName}（ランク{shards.tier}）</span>
            <span className="loot-gain-value">×{shards.count}</span>
          </div>
        )}
      </div>

      {/* 装備ドロップ（落ちた時だけ） */}
      {item ? (
        <>
          <div className="loot-drop-label">装備ドロップ！</div>
          <div className="loot-card" style={{ borderColor: rarity.color }}>
            <div className="loot-head">
              <span className="loot-name">
                {item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} {item.name}
              </span>
              <span className="loot-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
            </div>
            <div className="loot-meta">
              {getElementDef(item.element).icon}{getElementLabel(item.element)} ／ {SLOT_LABELS[item.slot]}
              {item.slot === 'weapon' && ` ／ ATK+${item.atk}`}
              {item.slot === 'armor' && ` ／ DEF+${item.def}・HP+${item.hp}`}
              {item.slot === 'accessory' && ` ／ HP+${item.hp}・MP+${item.mp}`}
            </div>
            {item.slot === 'weapon' && (
              <SkillChipList skills={item.skills} onOpenDictionary={onOpenDictionary} />
            )}
            <EnchantChipList enchants={item.enchants} />
          </div>
        </>
      ) : recruited ? (
        <div className="equip-hint loot-no-equip">仲間にしたので、ドロップ（欠片・装備）は無い。拠点の「仲間」で確認できる</div>
      ) : (
        <div className="equip-hint loot-no-equip">装備は落ちなかった（ボスは必ず装備を落とす）</div>
      )}

      <div className="dungeon-actions">
        <button className="start-btn" onClick={onNext}>次の階へ進む（{floor + 1}階）</button>
        <button className="back-btn" onClick={onLobby}>ロビーに戻る</button>
      </div>
    </div>
  )
}
