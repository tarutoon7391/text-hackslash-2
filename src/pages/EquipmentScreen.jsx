// 装備管理画面（GDD 11番・12番）
// 拠点から開き、所持している全装備の確認・4スロットへの付け替え・合成（+値の強化と
// スキル/エンチャントの引き継ぎ）を行う
// 一覧はスクロール可（本質的に一覧性が必要な部分＝GDD 3番の例外）
// スキル/エンチャントの表示は共通チップコンポーネントを再利用する
import { useMemo, useRef, useState } from 'react'
import { JOBS } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { getElementDef, getElementLabel } from '../data/elements.js'
import { RARITIES } from '../data/rarities.js'
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js'
import { ALL_SKILLS_BY_ID } from '../data/skills_elemental.js'
import { EQUIP_SLOTS } from '../systems/equipmentState.js'
import { buildPlayerStats, getItemStats } from '../systems/playerStats.js'
import { fuse, skillSlotCount, enchantSlotCount, expToNextPlus } from '../systems/fusionSystem.js'
import { FILTER_STATS, filterAndSortItems, formatStatGain } from '../systems/equipmentFilter.js'
import SkillChipList from '../components/common/SkillChipList.jsx'
import EnchantChipList from '../components/common/EnchantChipList.jsx'
import FusionScreen from '../components/equipment/FusionScreen.jsx'

const TAB_DEFS = [
  { key: 'weapon', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'accessory', label: 'アクセ' },
]

export default function EquipmentScreen({
  jobId,
  jobLevel = 1,
  items,
  equipment,
  shards = {},
  onSpendShards,
  onRemoveItems,
  onUpdateItem,
  onBack,
  onOpenDictionary,
}) {
  const [tab, setTab] = useState('weapon')
  const [filterStat, setFilterStat] = useState(null)  // 絞り込むステータス（null=すべて表示・入手順）
  const [sortOrder, setSortOrder] = useState('desc')  // 'desc'=大きい順 | 'asc'=小さい順
  const [detailItemId, setDetailItemId] = useState(null)
  const [fusionBaseId, setFusionBaseId] = useState(null)       // 合成画面を開いているベース装備のID
  const [toast, setToast] = useState(null)                     // {msg, isError}
  const toastTimer = useRef(null)

  const job = JOBS[jobId]
  const itemsById = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it])), [items])
  // 表示するステータスは戦闘で使われる値そのもの（職業レベル・装備・+値・エンチャント込み）
  const totalStats = buildPlayerStats({ jobId, level: jobLevel, slots: equipment.slots, itemsById })
  const tabItems = items.filter((it) => it.slot === tab)
  // 絞り込み・並べ替え：上がるステータスを選ぶと、そのステータスが上がる装備だけを上がり幅順に並べる
  const visibleItems = filterAndSortItems(tabItems, { statKey: filterStat, order: sortOrder })
  const detailItem = detailItemId ? itemsById[detailItemId] : null
  const fusionBase = fusionBaseId ? itemsById[fusionBaseId] : null

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }

  // ===== 装備の付け替え =====

  const equipTo = (slotKey, item) => {
    const error = equipment.equip({ jobId, slotKey, item })
    if (error) showToast(`🚫 ${error}`, true)
    else showToast(`${item.name}を装備した`)
  }

  // ===== 詳細ビューの開閉 =====

  const openDetail = (itemId) => setDetailItemId(itemId)
  const closeDetail = () => setDetailItemId(null)

  // ===== 合成 =====
  // 親にできるのは「同じ部位・ベース以外・装備中でない」装備
  const fusionCandidates = fusionBase
    ? items.filter((it) => it.slot === fusionBase.slot && it.id !== fusionBase.id && !equipment.equippedSlotOf(it.id))
    : []

  const doFusion = ({ parents, shardsUsed, keepSkillKeys, keepEnchantKeys }) => {
    const result = fuse({ base: fusionBase, parents, shardsUsed, keepSkillKeys, keepEnchantKeys })
    if (result.error) {
      showToast(`🚫 ${result.error}`, true)
      return
    }
    onUpdateItem(result.item)
    if (result.removedIds.length > 0) onRemoveItems(result.removedIds)
    onSpendShards(shardsUsed)
    setFusionBaseId(null)
    const before = fusionBase.plus || 0
    // スキルの+値が上がっていたら一緒に知らせる（おまけ要素）
    const skillUpText = result.skillUps
      .map((up) => `✨ ${ALL_SKILLS_BY_ID[up.skillId]?.name || 'スキル'} +${up.from}→+${up.to}`)
      .join(' ')
    const mainText = result.item.plus > before
      ? `合成成功！ +${before} → +${result.item.plus}`
      : `合成した（合成経験値 +${result.gainedExp}）`
    showToast(skillUpText ? `${mainText} ／ ${skillUpText}` : mainText)
  }

  // +値つきの表示名／+値の効果込みのステータス文字列
  const displayName = (item) => `${item.name}${item.plus > 0 ? ` +${item.plus}` : ''}`
  const statLine = (item) => {
    const st = getItemStats(item, jobLevel)
    if (item.slot === 'weapon') return `${WEAPON_TYPES[item.weaponType].name} ／ ATK+${st.atk}`
    if (item.slot === 'armor') return `DEF+${st.def}・HP+${st.hp}`
    return `HP+${st.hp}・MP+${st.mp}`
  }

  // ===== 描画部品 =====

  // 一覧のアイテムカード（ロビーの武器カードと同系統の見た目）
  const renderItemCard = (item) => {
    const rarity = RARITIES[item.rarity]
    const elem = getElementDef(item.element) // 初期装備はelement=null（無属性）
    const equippedSlot = equipment.equippedSlotOf(item.id)
    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        className="weapon-card equip-item-card"
        style={equippedSlot ? { borderColor: rarity.color } : undefined}
        onClick={() => openDetail(item.id)}
      >
        <div className="weapon-head">
          <span>
            {item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} {displayName(item)}
            {equippedSlot && (
              <span className="equip-badge">装備中：{EQUIP_SLOTS.find((s) => s.key === equippedSlot).name}</span>
            )}
          </span>
          <span className="weapon-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
        </div>
        {/* 絞り込み中は、並べ替えの基準になっている上がり幅を目立たせて出す */}
        {filterStat && formatStatGain(item, filterStat) && (
          <div className="sort-key-badge">{formatStatGain(item, filterStat)}</div>
        )}
        <div className="weapon-meta">
          {elem.icon}{getElementLabel(item.element)} ／ {statLine(item)}
          {item.floor != null && ` ／ ${item.floor}階産`}
        </div>
        {/* スキル/エンチャントは共通チップで表示（タップで詳細ポップアップ） */}
        {item.slot === 'weapon' && <SkillChipList skills={item.skills} onOpenDictionary={onOpenDictionary} />}
        <EnchantChipList enchants={item.enchants} />
        {renderQuickEquip(item)}
      </div>
    )
  }

  // 一覧カード内のクイック装備ボタン（詳細を開かずに装備／外すができる）
  // カード自体がタップで詳細を開くので、ボタンのタップは伝播を止める
  const renderQuickEquip = (item) => {
    const equippedSlot = equipment.equippedSlotOf(item.id)
    const slotDefs = EQUIP_SLOTS.filter((s) => s.accepts === item.slot)
    const jobBlocked =
      item.slot === 'weapon' && !job.equipableWeaponTypes.includes(item.weaponType)
    const fusionBtn = (
      <button
        className="quick-equip-btn fusion"
        onClick={(ev) => { ev.stopPropagation(); setFusionBaseId(item.id) }}
      >
        ⚒ 合成
      </button>
    )
    if (jobBlocked) {
      return (
        <>
          <div className="equip-block-note">🚫 {job.name}は{WEAPON_TYPES[item.weaponType].name}を装備できない</div>
          <div className="quick-equip">{fusionBtn}</div>
        </>
      )
    }
    return (
      <div className="quick-equip">
        {slotDefs.map((slotDef) =>
          equippedSlot === slotDef.key ? (
            <button
              key={slotDef.key}
              className="quick-equip-btn equipped"
              onClick={(ev) => { ev.stopPropagation(); equipment.unequip(slotDef.key); showToast(`${slotDef.name}を外した`) }}
            >
              外す
            </button>
          ) : (
            <button
              key={slotDef.key}
              className="quick-equip-btn"
              onClick={(ev) => { ev.stopPropagation(); equipTo(slotDef.key, item) }}
            >
              {slotDefs.length > 1 ? `${slotDef.name}に装備` : '装備する'}
            </button>
          )
        )}
        {fusionBtn}
      </div>
    )
  }

  // 詳細ビュー内の装備ボタン行（部位ごとに対応するスロットへ）
  const renderEquipButtons = (item) => {
    const equippedSlot = equipment.equippedSlotOf(item.id)
    const slotDefs = EQUIP_SLOTS.filter((s) => s.accepts === item.slot)
    // 武器の職業制限（GDD 8番）：装備不可の武器種はボタンを無効化して理由を表示する
    const jobBlocked =
      item.slot === 'weapon' && !job.equipableWeaponTypes.includes(item.weaponType)
    return (
      <div className="equip-actions">
        {slotDefs.map((slotDef) =>
          equippedSlot === slotDef.key ? (
            <button
              key={slotDef.key}
              className="equip-action-btn equipped"
              onClick={() => { equipment.unequip(slotDef.key); showToast(`${slotDef.name}を外した`) }}
            >
              ✅ {slotDef.name}装備中（タップで外す）
            </button>
          ) : (
            <button
              key={slotDef.key}
              className="equip-action-btn"
              disabled={jobBlocked}
              onClick={() => equipTo(slotDef.key, item)}
            >
              {slotDef.name}に装備する
            </button>
          )
        )}
        {jobBlocked && (
          <div className="equip-block-note">
            🚫 {job.name}は{WEAPON_TYPES[item.weaponType].name}を装備できない
          </div>
        )}
      </div>
    )
  }

  // 詳細ビュー（全画面オーバーレイ）：装備の中身の確認・付け替え・合成への入口
  const renderDetail = (item) => {
    const rarity = RARITIES[item.rarity]
    const elem = getElementDef(item.element) // 初期装備はelement=null（無属性）
    const plus = item.plus || 0
    const capped = plus > jobLevel

    return (
      <div className="equip-detail">
        <div className="equip-header">
          <button className="dict-back" onClick={closeDetail}>← 一覧</button>
          <span className="dict-title">アイテム詳細</span>
        </div>
        <div className="equip-detail-body">
          <div className="loot-card" style={{ borderColor: rarity.color }}>
            <div className="loot-head">
              <span className="loot-name">
                {item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} {displayName(item)}
              </span>
              <span className="loot-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
            </div>
            <div className="loot-meta">
              {elem.icon}{getElementLabel(item.element)} ／ {statLine(item)}
              {item.floor != null && ` ／ ${item.floor}階産`}
            </div>
            <div className="loot-meta">
              +値 {plus}（次の+1まで合成経験値 {expToNextPlus(plus) - (item.plusExp || 0)}）
            </div>
            {capped && (
              <div className="depart-note fusion-cap-note">
                ⚠️ {job.name}はLv{jobLevel}なので、効果が出ているのは +{jobLevel} ぶんまで
              </div>
            )}
          </div>

          {renderEquipButtons(item)}
          <button className="equip-action-btn fusion" onClick={() => setFusionBaseId(item.id)}>
            ⚒ この装備をベースに合成する
          </button>

          {item.slot === 'weapon' && (
            <>
              <h2 className="section-label">スキル（{(item.skills || []).length}/{skillSlotCount(item)}枠）</h2>
              <SkillChipList skills={item.skills} onOpenDictionary={onOpenDictionary} />
            </>
          )}
          <h2 className="section-label">エンチャント（{(item.enchants || []).length}/{enchantSlotCount(item)}枠）</h2>
          {enchantSlotCount(item) === 0 ? (
            <div className="equip-hint">このレア度にはエンチャント枠がない</div>
          ) : (
            <EnchantChipList enchants={item.enchants} />
          )}
          <div className="equip-hint">
            スキル・エンチャントは合成で他の装備から引き継げる（{PROGRESSION_CONFIG.material.shardName}だけの合成なら+値だけ上がる）
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="equip-screen">
      <div className="equip-header">
        <button className="dict-back" onClick={onBack}>← 拠点</button>
        <span className="dict-title">🎒 装備・アイテム</span>
      </div>

      <div className="equip-body">
        {/* 現在の4スロット（タップで装備中アイテムの詳細へ） */}
        <div className="equip-slots">
          {EQUIP_SLOTS.map((slotDef) => {
            const item = itemsById[equipment.slots[slotDef.key]]
            return (
              <button
                key={slotDef.key}
                className={`equip-slot ${item ? 'filled' : ''}`}
                onClick={() => item && openDetail(item.id)}
              >
                <span className="equip-slot-label">{slotDef.name}</span>
                <span className="equip-slot-item">
                  {item
                    ? `${item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} ${displayName(item)}`
                    : 'なし'}
                </span>
              </button>
            )
          })}
        </div>

        {/* 装備込みのステータス合計（職業ベース＋装備＋エンチャント） */}
        <div className="stat-row equip-stat-row">
          <span className="equip-stat-owner">{job.icon} {job.name} Lv{jobLevel}（装備込み）</span>
          HP{totalStats.hp}／MP{totalStats.mp}／ATK{totalStats.atk}／DEF{totalStats.def}／SPD{totalStats.spd}／会心{totalStats.crit}%
        </div>

        {/* 合成素材（欠片）の所持数 */}
        <h2 className="section-label">合成素材</h2>
        {Object.keys(shards).length === 0 ? (
          <div className="equip-hint">{PROGRESSION_CONFIG.material.shardName}をまだ持っていない。敵を倒すと手に入る</div>
        ) : (
          <div className="chip-list">
            {Object.keys(shards).map(Number).sort((x, y) => x - y).map((tier) => (
              <span key={tier} className="skill-chip shard-chip">🔷 ランク{tier} ×{shards[tier]}</span>
            ))}
          </div>
        )}

        {/* 種別タブ＋所持アイテム一覧 */}
        <div className="equip-tabs">
          {TAB_DEFS.map((t) => (
            <button
              key={t.key}
              className={`equip-tab ${tab === t.key ? 'selected' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}（{items.filter((it) => it.slot === t.key).length}）
            </button>
          ))}
        </div>
        {/* 絞り込み・並べ替え：上がるステータスを選ぶ → そのステータスの昇順/降順で並ぶ */}
        <div className="equip-filter">
          <div className="equip-filter-stats">
            <button
              className={`filter-chip ${filterStat === null ? 'selected' : ''}`}
              onClick={() => setFilterStat(null)}
            >
              すべて
            </button>
            {FILTER_STATS.map((st) => (
              <button
                key={st.key}
                className={`filter-chip ${filterStat === st.key ? 'selected' : ''}`}
                onClick={() => setFilterStat(filterStat === st.key ? null : st.key)}
              >
                {st.label}
              </button>
            ))}
          </div>
          <button
            className="sort-order-btn"
            disabled={filterStat === null}
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortOrder === 'desc' ? '▼ 降順（高い順）' : '▲ 昇順（低い順）'}
          </button>
        </div>
        <div className="equip-list">
          {tabItems.length === 0 ? (
            <div className="equip-hint">
              {TAB_DEFS.find((t) => t.key === tab).label}をまだ持っていない。ダンジョンでドロップを集めよう
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="equip-hint">
              {FILTER_STATS.find((st) => st.key === filterStat).label}が上がる{TAB_DEFS.find((t) => t.key === tab).label}は持っていない
            </div>
          ) : (
            visibleItems.map(renderItemCard)
          )}
        </div>
      </div>

      {/* アイテム詳細（全画面オーバーレイ） */}
      {detailItem && renderDetail(detailItem)}

      {/* 合成画面（全画面オーバーレイ。詳細より上に重ねる） */}
      {fusionBase && (
        <FusionScreen
          key={fusionBase.id}
          base={fusionBase}
          candidates={fusionCandidates}
          shards={shards}
          jobLevel={jobLevel}
          onConfirm={doFusion}
          onCancel={() => setFusionBaseId(null)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>{toast.msg}</div>
      )}
    </div>
  )
}
