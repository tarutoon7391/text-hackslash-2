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
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'

const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' }

export default function LootResultScreen({ result, jobName, hp = null, maxHp = null, allyStatus = null, boxFull = false, onJoinAnswer, onNext, onLobby, onOpenDictionary }) {
  // joinOffer：倒したあと起き上がって仲間になりたそうにしているモンスター（居なければnull）
  // joinState：'offer'（返事待ち）｜'joined'（仲間にした）｜'declined'（見送った）
  // ally：連れている仲間の経験値結果 {name, levelBefore, levelAfter}（連れていなければnull）
  // book：スキルの書が落ちた時のスキルID（落ちていなければnull）
  const { floor, item, shards, exp, levelBefore, levelAfter, joinOffer = null, joinState = null, ally = null, book = null } = result
  const rarity = item ? RARITIES[item.rarity] : null
  const leveledUp = levelAfter > levelBefore

  return (
    <div className="loot-screen">
      <div className="loot-banner">🎉 勝利！</div>

      {joinOffer && (
        <div className={`join-offer ${joinState}`}>
          <div className="join-msg">
            {joinState === 'offer' && `なんと ${joinOffer.name} が起き上がり、仲間になりたそうにこちらを見ている！`}
            {joinState === 'joined' && `🤝 ${joinOffer.name} が仲間になった！`}
            {joinState === 'declined' && `${joinOffer.name} は寂しそうに去っていった…`}
          </div>
          <div className="monster-card recruited">
            <div className="monster-sprite">
              <PixelSprite enemyDef={{ isBoss: joinOffer.isBoss, sprite: joinOffer.sprite }} element={joinOffer.element} size={72} />
            </div>
            <div className="monster-info">
              <div className="monster-name">{joinOffer.name}</div>
              <div className="weapon-meta">{getElementDef(joinOffer.element).icon}{getElementLabel(joinOffer.element)}</div>
              <div className="weapon-meta">
                HP{joinOffer.stats.hp}／ATK{joinOffer.stats.atk}／DEF{joinOffer.stats.def}／SPD{joinOffer.stats.spd}
              </div>
            </div>
          </div>
          {joinState === 'offer' && (
            <>
              <div className="join-actions">
                <button className="start-btn" disabled={boxFull} onClick={() => onJoinAnswer?.(true)}>仲間にする</button>
                <button className="back-btn" onClick={() => onJoinAnswer?.(false)}>見送る</button>
              </div>
              <div className="equip-hint">
                {boxFull
                  ? '仲間が満員で連れていけない（拠点の「仲間」で別れると空きができる）'
                  : '返事をせずに先へ進むと、見送ったことになる'}
              </div>
            </>
          )}
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

      {/* スキルの書（たまに落ちる） */}
      {book && ALL_SKILLS_BY_ID[book] && (
        <>
          <div className="loot-drop-label">スキルの書を拾った！</div>
          <div className="loot-card book-card">
            <div className="loot-head">
              <span className="loot-name">📜 {ALL_SKILLS_BY_ID[book].name}の書</span>
              <span className="loot-rarity">{'★'.repeat(ALL_SKILLS_BY_ID[book].star)}</span>
            </div>
            <div className="loot-meta">
              {getElementDef(ALL_SKILLS_BY_ID[book].element).icon}{getElementLabel(ALL_SKILLS_BY_ID[book].element)} ／ {ALL_SKILLS_BY_ID[book].desc}
            </div>
            <div className="loot-meta">装備画面で武器に使うと、このスキルを覚えさせられる（1回で無くなる）</div>
          </div>
        </>
      )}

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
