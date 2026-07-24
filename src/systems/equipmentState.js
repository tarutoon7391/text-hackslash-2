// 装備スロット状態管理（GDD 12番）
// プレイヤーの4スロット（武器1／防具1／アクセサリー2）をReact stateで管理する
// スロットにはアイテムIDのみ持ち、実体はinventoryStateの配列から引く
// （移植でアイテムが書き換わっても参照切れしないようにするため）
import { useState } from 'react'
import { JOBS } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'

// 4スロットの定義（key=スロット識別子、accepts=受け入れる部位）
export const EQUIP_SLOTS = [
  { key: 'weapon', name: '武器', accepts: 'weapon' },
  { key: 'armor', name: '防具', accepts: 'armor' },
  { key: 'accessory1', name: 'アクセ1', accepts: 'accessory' },
  { key: 'accessory2', name: 'アクセ2', accepts: 'accessory' },
]

export const EQUIP_SLOTS_BY_KEY = Object.fromEntries(EQUIP_SLOTS.map((s) => [s.key, s]))

// 装備可否チェック（GDD 8番：職業ごとの装備可能武器種）
// 装備できないときはエラーメッセージ文字列、装備できるときはnullを返す
export function checkEquip({ jobId, slotKey, item }) {
  const slotDef = EQUIP_SLOTS_BY_KEY[slotKey]
  if (!slotDef || item.slot !== slotDef.accepts) return 'この部位には装備できない'
  if (slotKey === 'weapon') {
    const job = JOBS[jobId]
    if (!job.equipableWeaponTypes.includes(item.weaponType)) {
      return `${job.name}は${WEAPON_TYPES[item.weaponType].name}を装備できない`
    }
  }
  return null
}

// 装備込みのステータス合計を計算する（GDD 7番の6種：HP/MP/ATK/DEF/SPD/会心率）
// 職業ベース値＋装備の基礎ステータス（フラット加算）→ 青天井組%を乗算 → 会心率+%を加算
// ※戦闘への反映はフェーズ3後半。ここは表示用の集計のみでbattleEngineには触らない
export function calcTotalStats({ baseStats, slots, itemsById }) {
  const flat = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 }
  const pct = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 }
  let critAdd = 0

  for (const { key } of EQUIP_SLOTS) {
    const item = itemsById[slots[key]]
    if (!item) continue
    // 装備の基礎ステータス（武器=ATK、防具=DEF/HP、アクセ=HP/MP）
    flat.atk += item.atk || 0
    flat.def += item.def || 0
    flat.hp += item.hp || 0
    flat.mp += item.mp || 0
    // エンチャント効果のうち6ステータスに対応するもの
    // （スキル威力+%・会心ダメージ+%・回避+%等はステータス表示の対象外）
    for (const en of item.enchants || []) {
      switch (en.enchantId) {
        case 'hpPct': pct.hp += en.value; break
        case 'mpPct': pct.mp += en.value; break
        case 'atkPct': pct.atk += en.value; break
        case 'defPct': pct.def += en.value; break
        case 'spdPct': pct.spd += en.value; break
        case 'critRatePct': critAdd += en.value; break
        default: break
      }
    }
  }

  const total = {}
  for (const stat of ['hp', 'mp', 'atk', 'def', 'spd']) {
    total[stat] = Math.round((baseStats[stat] + flat[stat]) * (1 + pct[stat] / 100))
  }
  // 会心率は渋カーブ組（100%上限の有限ステータス）なので加算＋上限クリップ
  total.crit = Math.min(100, baseStats.crit + critAdd)
  return total
}

const EMPTY_SLOTS = { weapon: null, armor: null, accessory1: null, accessory2: null }

export function useEquipmentState() {
  const [slots, setSlots] = useState(EMPTY_SLOTS)

  // 装備する。武器種制限に違反する場合はエラーメッセージを返して何もしない
  // 同じアイテムが別スロットに装備済みなら外してから付け替える（アクセ1⇔2の移動用）
  const equip = ({ jobId, slotKey, item }) => {
    const error = checkEquip({ jobId, slotKey, item })
    if (error) return error
    setSlots((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (next[key] === item.id) next[key] = null
      }
      next[slotKey] = item.id
      return next
    })
    return null
  }

  // スロットを空にする
  const unequip = (slotKey) => {
    setSlots((prev) => ({ ...prev, [slotKey]: null }))
  }

  // 指定アイテムを全スロットから外す（抽出でアイテムが破壊されたとき用）
  const clearItem = (itemId) => {
    setSlots((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (next[key] === itemId) next[key] = null
      }
      return next
    })
  }

  // アイテムが装備されているスロットkeyを返す（未装備ならnull）
  const equippedSlotOf = (itemId) => {
    if (!itemId) return null
    for (const { key } of EQUIP_SLOTS) {
      if (slots[key] === itemId) return key
    }
    return null
  }

  return { slots, equip, unequip, clearItem, equippedSlotOf }
}
