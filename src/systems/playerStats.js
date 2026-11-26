// プレイヤーの実ステータス計算（表示と戦闘の両方がここを使う＝画面の数字と戦闘の数字が必ず一致する）
// 計算順：
//   1. 職業の基礎値（レベル成長込み）
//   2. ＋装備の基礎ステータス（ATK/DEF/HP/MP。+値の効果込み）
//   3. ×武器種の補正（ATK/SPD/会心率）
//   4. ×エンチャントの「◯◯+%」（青天井組）
//   5. 会心率などの加算系エンチャント
// React非依存の純関数（スモークテスト・バランスシミュレーション対象）
import { calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js'

const FLAT_KEYS = ['atk', 'def', 'hp', 'mp']
const MAIN_KEYS = ['hp', 'mp', 'atk', 'def', 'spd']

// エンチャントID → 6ステータスの%補正先
const PCT_ENCHANTS = { hpPct: 'hp', mpPct: 'mp', atkPct: 'atk', defPct: 'def', spdPct: 'spd' }
// エンチャントID → 戦闘用の追加ステータス（加算ポイント）
const EXTRA_ENCHANTS = {
  evasionPct: 'evasion',               // 回避+%
  damageCutPct: 'damageCut',           // 被ダメージ軽減%
  weakEffectResistPct: 'ailmentResist', // 弱体効果耐性+%
  critDamagePct: 'critDamagePct',      // 会心ダメージ+%
  skillPowerPct: 'skillPowerPct',      // スキル威力+%
  ailmentChancePct: 'ailmentChancePct', // 状態異常付与率+%
}
export const EXTRA_STAT_KEYS = Object.values(EXTRA_ENCHANTS)

// +値のうち実際に効果が出る分（職業レベルが上限。+値そのものは装備に残る）
export function getEffectivePlus(item, jobLevel = Infinity) {
  return Math.max(0, Math.min(item?.plus || 0, jobLevel))
}

// +値込みの装備基礎ステータス（{atk, def, hp, mp}。持っていない項目は0）
export function getItemStats(item, jobLevel = Infinity) {
  const mult = 1 + getEffectivePlus(item, jobLevel) * PROGRESSION_CONFIG.plus.effectPerPlus
  const out = {}
  for (const key of FLAT_KEYS) out[key] = Math.round((item?.[key] || 0) * mult)
  return out
}

// ステータス計算の本体
// baseStats：職業の基礎値／equippedItems：装備中アイテムの配列／jobLevel：+値の効果上限
// applyWeaponType：武器種補正（ATK/SPD/会心率）を掛けるか
export function computeStats({ baseStats, equippedItems, jobLevel = Infinity, applyWeaponType = false }) {
  const flat = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 }
  const pct = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 }
  const extras = Object.fromEntries(EXTRA_STAT_KEYS.map((k) => [k, 0]))
  let critAdd = 0
  let typeMods = { atk: 1, spd: 1, crit: 1 }

  for (const item of equippedItems) {
    if (!item) continue
    const st = getItemStats(item, jobLevel)
    for (const key of FLAT_KEYS) flat[key] += st[key]
    if (applyWeaponType && item.slot === 'weapon' && WEAPON_TYPES[item.weaponType]) {
      typeMods = WEAPON_TYPES[item.weaponType].statMods
    }
    for (const en of item.enchants || []) {
      if (PCT_ENCHANTS[en.enchantId]) pct[PCT_ENCHANTS[en.enchantId]] += en.value
      else if (en.enchantId === 'critRatePct') critAdd += en.value
      else if (EXTRA_ENCHANTS[en.enchantId]) extras[EXTRA_ENCHANTS[en.enchantId]] += en.value
    }
  }

  const total = {}
  for (const stat of MAIN_KEYS) {
    const typeMult = typeMods[stat] ?? 1
    total[stat] = Math.round((baseStats[stat] + flat[stat]) * typeMult * (1 + pct[stat] / 100))
  }
  // 会心率は100%上限の有限ステータス：武器種補正→加算→上限クリップ
  total.crit = Math.min(100, Math.round(baseStats.crit * (typeMods.crit ?? 1)) + critAdd)
  // 上限のある加算ステータスはここでクリップしておく（回避・被ダメ軽減は90%、耐性は100%まで）
  extras.evasion = Math.min(90, extras.evasion)
  extras.damageCut = Math.min(90, extras.damageCut)
  extras.ailmentResist = Math.min(100, extras.ailmentResist)
  return { ...total, ...extras }
}

// 職業・レベル・装備スロットから実ステータスを作る（ロビー・装備画面の表示と、戦闘開始時に使う）
export function buildPlayerStats({ jobId, level = 1, slots, itemsById }) {
  const equippedItems = Object.values(slots || {}).map((id) => itemsById[id]).filter(Boolean)
  return computeStats({
    baseStats: calcJobStats(jobId, level),
    equippedItems,
    jobLevel: level,
    applyWeaponType: true,
  })
}
