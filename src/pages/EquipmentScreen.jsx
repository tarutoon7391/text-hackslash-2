// 装備管理画面（GDD 11番・12番）
// 拠点から開き、所持している全装備の確認・4スロットへの付け替え・
// スキル/エンチャントの抽出・移植を行う
// 一覧はスクロール可（本質的に一覧性が必要な部分＝GDD 3番の例外）
// スキル/エンチャントの表示は共通チップコンポーネントを再利用する
import { useMemo, useRef, useState } from 'react'
import { JOBS, calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { ELEMENTS } from '../data/elements.js'
import { RARITIES } from '../data/rarities.js'
import { ENCHANT_RULES } from '../data/itemTemplates.js'
import { EQUIP_SLOTS, calcTotalStats } from '../systems/equipmentState.js'
import {
  applySkillTransplant,
  applyEnchantTransplant,
} from '../systems/extractInventoryState.js'
import SkillChipList from '../components/common/SkillChipList.jsx'
import EnchantChipList from '../components/common/EnchantChipList.jsx'
import ExtractConfirmDialog from '../components/equipment/ExtractConfirmDialog.jsx'
import TransplantSelector from '../components/equipment/TransplantSelector.jsx'

const TAB_DEFS = [
  { key: 'weapon', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'accessory', label: 'アクセ' },
]

export default function EquipmentScreen({
  jobId,
  items,
  equipment,
  extractInv,
  onRemoveItem,
  onUpdateItem,
  onBack,
  onOpenDictionary,
}) {
  const [tab, setTab] = useState('weapon')
  const [detailItemId, setDetailItemId] = useState(null)
  const [selectedFrame, setSelectedFrame] = useState(null)     // {kind: 'skill'|'enchant', index}
  const [extractTarget, setExtractTarget] = useState(null)     // {kind, entry} 確認ダイアログ表示中
  const [transplantTarget, setTransplantTarget] = useState(null) // {kind, index} セレクター表示中
  const [toast, setToast] = useState(null)                     // {msg, isError}
  const toastTimer = useRef(null)

  const job = JOBS[jobId]
  const itemsById = useMemo(() => Object.fromEntries(items.map((it) => [it.id, it])), [items])
  const baseStats = calcJobStats(jobId)
  const totalStats = calcTotalStats({ baseStats, slots: equipment.slots, itemsById })
  const tabItems = items.filter((it) => it.slot === tab)
  const detailItem = detailItemId ? itemsById[detailItemId] : null

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

  const openDetail = (itemId) => {
    setDetailItemId(itemId)
    setSelectedFrame(null)
  }
  const closeDetail = () => {
    setDetailItemId(null)
    setSelectedFrame(null)
  }

  // ===== 抽出（確認ダイアログで確定後に実行。元装備は破壊される） =====

  const doExtract = () => {
    const { kind, entry } = extractTarget
    if (kind === 'skill') extractInv.addSkill(entry)
    else extractInv.addEnchant(entry)
    // 装備中だった場合は該当スロットを空にしてからインベントリから削除する
    equipment.clearItem(detailItem.id)
    onRemoveItem(detailItem.id)
    setExtractTarget(null)
    closeDetail()
    showToast(`${kind === 'skill' ? 'スキル' : 'エンチャント'}を抽出した（元の装備は破壊）`)
  }

  // ===== 移植（セレクター側でバリデーション済み。使った抽出物は消費される） =====

  const applyTransplant = (entry) => {
    const { kind, index } = transplantTarget
    const nextItem =
      kind === 'skill'
        ? applySkillTransplant({ item: detailItem, targetIndex: index, entry })
        : applyEnchantTransplant({ item: detailItem, targetIndex: index, entry })
    onUpdateItem(nextItem)
    if (kind === 'skill') extractInv.removeSkill(entry.extractId)
    else extractInv.removeEnchant(entry.extractId)
    setTransplantTarget(null)
    setSelectedFrame(null)
    showToast('移植した')
  }

  // ===== 描画部品 =====

  // 一覧のアイテムカード（ロビーの武器カードと同系統の見た目）
  const renderItemCard = (item) => {
    const rarity = RARITIES[item.rarity]
    const elem = ELEMENTS[item.element]
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
            {item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} {item.name}
            {equippedSlot && (
              <span className="equip-badge">装備中：{EQUIP_SLOTS.find((s) => s.key === equippedSlot).name}</span>
            )}
          </span>
          <span className="weapon-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
        </div>
        <div className="weapon-meta">
          {elem.icon}{elem.name}属性
          {item.slot === 'weapon' && ` ／ ${WEAPON_TYPES[item.weaponType].name} ／ ATK+${item.atk}`}
          {item.slot === 'armor' && ` ／ DEF+${item.def}・HP+${item.hp}`}
          {item.slot === 'accessory' && ` ／ HP+${item.hp}・MP+${item.mp}`}
          {item.floor != null && ` ／ ${item.floor}階産`}
        </div>
        {/* スキル/エンチャントは共通チップで表示（タップで詳細ポップアップ） */}
        {item.slot === 'weapon' && <SkillChipList skills={item.skills} onOpenDictionary={onOpenDictionary} />}
        <EnchantChipList enchants={item.enchants} />
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

  // 詳細ビュー（枠選択→抽出・移植の起点。全画面オーバーレイ）
  const renderDetail = (item) => {
    const rarity = RARITIES[item.rarity]
    const elem = ELEMENTS[item.element]
    const skillSlots = item.slot === 'weapon' ? RARITIES[item.rarity].skillSlots : 0
    const enchantSlots = ENCHANT_RULES.slotsByRarity[item.rarity] ?? 0
    // 選択中の枠の中身（空き枠ならnull）
    const frameEntry = selectedFrame
      ? (selectedFrame.kind === 'skill'
          ? item.skills?.[selectedFrame.index]
          : item.enchants?.[selectedFrame.index]) || null
      : null

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
                {item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} {item.name}
              </span>
              <span className="loot-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
            </div>
            <div className="loot-meta">
              {elem.icon}{elem.name}属性
              {item.slot === 'weapon' && ` ／ ${WEAPON_TYPES[item.weaponType].name} ／ ATK+${item.atk}`}
              {item.slot === 'armor' && ` ／ DEF+${item.def}・HP+${item.hp}`}
              {item.slot === 'accessory' && ` ／ HP+${item.hp}・MP+${item.mp}`}
              {item.floor != null && ` ／ ${item.floor}階産`}
            </div>
          </div>

          {renderEquipButtons(item)}

          {/* スキル枠（武器のみ）：枠選択モードで空き枠も表示 */}
          {item.slot === 'weapon' && (
            <>
              <h2 className="section-label">スキル枠（{skillSlots}枠）</h2>
              <SkillChipList
                skills={item.skills}
                slotCount={skillSlots}
                selectedSlot={selectedFrame?.kind === 'skill' ? selectedFrame.index : null}
                onSelectSlot={(i) => setSelectedFrame({ kind: 'skill', index: i })}
                onOpenDictionary={onOpenDictionary}
              />
            </>
          )}

          {/* エンチャント枠：枠選択モードで空き枠も表示（コモンは枠なし） */}
          <h2 className="section-label">エンチャント枠（{enchantSlots}枠）</h2>
          {enchantSlots === 0 && (item.enchants || []).length === 0 ? (
            <div className="equip-hint">このレア度にはエンチャント枠がない</div>
          ) : (
            <EnchantChipList
              enchants={item.enchants}
              slotCount={enchantSlots}
              selectedSlot={selectedFrame?.kind === 'enchant' ? selectedFrame.index : null}
              onSelectSlot={(i) => setSelectedFrame({ kind: 'enchant', index: i })}
            />
          )}

          {/* 枠を選択すると抽出・変更（移植）ボタンが出る */}
          {selectedFrame ? (
            <div className="frame-actions">
              {frameEntry && (
                <button
                  className="equip-action-btn extract"
                  onClick={() => setExtractTarget({ kind: selectedFrame.kind, entry: frameEntry })}
                >
                  🔮 この枠を抽出する（装備は破壊）
                </button>
              )}
              <button
                className="equip-action-btn"
                onClick={() => setTransplantTarget({ ...selectedFrame })}
              >
                🔁 この枠を変更する（移植）
              </button>
            </div>
          ) : (
            <div className="equip-hint">枠をタップして選ぶと、抽出・変更（移植）ができる</div>
          )}
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
                    ? `${item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon} ${item.name}`
                    : 'なし'}
                </span>
              </button>
            )
          })}
        </div>

        {/* 装備込みのステータス合計（職業ベース＋装備＋エンチャント） */}
        <div className="stat-row equip-stat-row">
          <span className="equip-stat-owner">{job.icon} {job.name}（装備込み）</span>
          HP{totalStats.hp}／MP{totalStats.mp}／ATK{totalStats.atk}／DEF{totalStats.def}／SPD{totalStats.spd}／会心{totalStats.crit}%
        </div>

        {/* 抽出インベントリ（抽出したスキル/エンチャントの在庫。チップをタップで詳細） */}
        <h2 className="section-label">抽出インベントリ</h2>
        {extractInv.skills.length === 0 && extractInv.enchants.length === 0 ? (
          <div className="equip-hint">まだ何も抽出していない。アイテム詳細の枠から抽出できる</div>
        ) : (
          <>
            {extractInv.skills.length > 0 && (
              <SkillChipList skills={extractInv.skills} onOpenDictionary={onOpenDictionary} />
            )}
            {extractInv.enchants.length > 0 && <EnchantChipList enchants={extractInv.enchants} />}
          </>
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
        <div className="equip-list">
          {tabItems.length === 0 ? (
            <div className="equip-hint">
              {TAB_DEFS.find((t) => t.key === tab).label}をまだ持っていない。ダンジョンでドロップを集めよう
            </div>
          ) : (
            tabItems.map(renderItemCard)
          )}
        </div>
      </div>

      {/* アイテム詳細（全画面オーバーレイ） */}
      {detailItem && renderDetail(detailItem)}

      {/* 抽出の確認ダイアログ（不可逆操作なので必ず挟む） */}
      {extractTarget && detailItem && (
        <ExtractConfirmDialog
          item={detailItem}
          target={extractTarget}
          onConfirm={doExtract}
          onCancel={() => setExtractTarget(null)}
        />
      )}

      {/* 移植セレクター（対象枠の種類に応じたインベントリのみ表示） */}
      {transplantTarget && detailItem && (
        <TransplantSelector
          item={detailItem}
          target={transplantTarget}
          candidates={transplantTarget.kind === 'skill' ? extractInv.skills : extractInv.enchants}
          onApply={applyTransplant}
          onCancel={() => setTransplantTarget(null)}
          onOpenDictionary={onOpenDictionary}
        />
      )}

      {toast && (
        <div className={`toast ${toast.isError ? 'toast-error' : ''}`}>{toast.msg}</div>
      )}
    </div>
  )
}
