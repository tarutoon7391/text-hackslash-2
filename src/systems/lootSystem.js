// ドロップ生成システム（GDD 9.2・10番・12番）
// 勝利した敵の階層・ゾーン属性・敵の格（雑魚/ボス）からドロップ装備を1個生成する
// 武器のスキル抽選はフェーズ1のweaponGenerator（GDD 9.2実装済み）をそのまま流用する
import { DUNGEON_CONFIG } from '../data/dungeonConfig.js'
import { ELEMENTS, ELEMENT_IDS } from '../data/elements.js'
import { WEAPON_TYPE_IDS } from '../data/weaponTypes.js'
import { RARITIES } from '../data/rarities.js'
import { ARMOR_TEMPLATE, ACCESSORY_TEMPLATE, ENCHANTS, ENCHANT_RULES } from '../data/itemTemplates.js'
import { generateWeapon } from './weaponGenerator.js'
import { floorToZoneElement } from './dungeonState.js'

let itemSeq = 1

// 重み表から抽選（{key: weight}）
function rollWeighted(weights, rng) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0)
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let r = rng() * total
  for (const [key, w] of entries) {
    r -= w
    if (r <= 0) return key
  }
  return entries[entries.length - 1][0]
}

function randInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1))
}

// レア度抽選（GDD 12番。確率はdungeonConfig参照・実装後調整）
function rollRarity(grade, rng) {
  return rollWeighted(DUNGEON_CONFIG.dropRates[grade], rng)
}

// 装備属性の抽選：ゾーン属性に重み付け（他属性も出うる）
function rollElement(zone, rng) {
  const weights = {}
  for (const id of ELEMENT_IDS) {
    weights[id] = id === zone ? DUNGEON_CONFIG.zoneElementWeight : 1
  }
  return rollWeighted(weights, rng)
}

// ===== エンチャント抽選（GDD 10.2〜10.4） =====
// 各枠50%充填・保証なし。自然ドロップでは同種重複なし（青天井・渋カーブとも）
function rollEnchants({ slot, rarity, floor, rng }) {
  const slots = ENCHANT_RULES.slotsByRarity[rarity] ?? 0
  const catWeights = ENCHANT_RULES.categoryWeightsBySlot[slot]
  const result = []
  const usedIds = new Set()

  for (let i = 0; i < slots; i++) {
    if (rng() >= ENCHANT_RULES.fillChance) continue // 50%で空振り（保証なし）

    // 部位別カテゴリ重み×同種重複除外で候補を作る
    const candidates = ENCHANTS.filter((e) => !usedIds.has(e.id))
    if (candidates.length === 0) break
    const weights = {}
    for (const e of candidates) weights[e.id] = catWeights[e.category] || 1
    const id = rollWeighted(weights, rng)
    const enchant = ENCHANTS.find((e) => e.id === id)

    // TODO: 数値レンジは暫定（青天井+3〜8%／渋カーブ+1〜3%）×階層スケール。
    // 「深度⇔レンジ対応表」は実装後調整（GDD 17番）
    const [min, max] = ENCHANT_RULES.valueRanges[enchant.kind]
    const value = Math.max(1, Math.round((min + rng() * (max - min)) * (1 + floor * ENCHANT_RULES.floorScale)))

    usedIds.add(id)
    result.push({ enchantId: id, name: enchant.name, kind: enchant.kind, value })
  }
  return result
}

// ===== 部位別の生成 =====

function generateArmor({ rarity, element, floor, rng }) {
  const t = ARMOR_TEMPLATE
  return {
    id: `item_${itemSeq++}`,
    slot: 'armor',
    name: `${ELEMENTS[element].name}の${t.name}`,
    icon: t.icon,
    weaponType: null,
    element,
    rarity,
    def: randInt(...t.defRange[rarity], rng),
    hp: randInt(...t.hpRange[rarity], rng),
    skills: [],
    floor,
  }
}

function generateAccessory({ rarity, element, floor, rng }) {
  const t = ACCESSORY_TEMPLATE
  const baseName = t.names[Math.floor(rng() * t.names.length)]
  return {
    id: `item_${itemSeq++}`,
    slot: 'accessory',
    name: `${ELEMENTS[element].name}の${baseName}`,
    icon: t.icon,
    weaponType: null,
    element,
    rarity,
    hp: randInt(...t.hpRange[rarity], rng),
    mp: randInt(...t.mpRange[rarity], rng),
    skills: [],
    floor,
  }
}

// ===== メインAPI =====
// 勝利した敵の情報からドロップ装備を1個生成して返す
export function generateLoot({ floor, grade, rng = Math.random }) {
  const zone = floorToZoneElement(floor)
  const rarity = rollRarity(grade, rng)
  // TODO: ユニークの固有スキル・固有効果は実装後調整（GDD 17番）。
  // 現状はレア度表示のみ「ユニーク」で、スキル枠0・エンチャント枠2の仮動作
  const slot = rollWeighted(DUNGEON_CONFIG.slotWeights, rng)
  const element = rollElement(zone, rng)

  let item
  if (slot === 'weapon') {
    const weaponType = WEAPON_TYPE_IDS[Math.floor(rng() * WEAPON_TYPE_IDS.length)]
    // スキル抽選はGDD 9.2実装済みのweaponGeneratorを流用
    item = generateWeapon({ weaponType, rarity, element, rng })
    item.slot = 'weapon'
    item.floor = floor
  } else if (slot === 'armor') {
    item = generateArmor({ rarity, element, floor, rng })
  } else {
    item = generateAccessory({ rarity, element, floor, rng })
  }

  // エンチャント抽選（部位別重み・GDD 10.2）
  item.enchants = rollEnchants({ slot, rarity, floor, rng })
  return item
}
