// 武器生成システム
// GDD 9.2「武器ドロップ時のスキル抽選」を再現する生成関数
// ※フェーズ2のドロップシステムでこのままドロップ処理に使う

import { RARITIES, SKILL_ROLL_RULES } from '../data/rarities.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { ELEMENTS } from '../data/elements.js'
import { SKILLS_NORMAL } from '../data/skills_normal.js'
import { SKILLS_ELEMENTAL } from '../data/skills_elemental.js'

// シード付き乱数（mulberry32）。テスト武器の再現性確保とスモークテスト用
export function createSeededRng(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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

// 配列からランダムに1つ
function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)]
}

// ★を指定して抽選プールからスキルを1つ選ぶ（プールが空なら近い★へフォールバック）
function pickSkillByStar(pool, star, rng) {
  for (let s = star; s >= 1; s--) {
    const candidates = pool.filter((sk) => sk.star === s)
    if (candidates.length > 0) return pick(candidates, rng)
  }
  return null
}

// 1枠分のスキル抽選（GDD 9.2）
function rollSkillSlot({ weaponType, element, rarity, rng, excludeIds }) {
  const rarityDef = RARITIES[rarity]
  const star = Number(rollWeighted(rarityDef.starWeights, rng))

  // 無属性7:属性3（属性スキルが許可されたレア度のみ）
  const useElemental =
    rarityDef.allowElementalSkills && rng() >= SKILL_ROLL_RULES.normalVsElemental

  let pool
  if (useElemental) {
    // 属性スキルは武器の属性と一致するもののみ
    pool = SKILLS_ELEMENTAL.filter((s) => s.element === element && !excludeIds.has(s.id))
    // 属性プールが尽きたら無属性へフォールバック
    if (pool.filter((s) => s.star <= star).length === 0) {
      pool = SKILLS_NORMAL.filter((s) => s.weaponType === weaponType && !excludeIds.has(s.id))
    }
  } else {
    pool = SKILLS_NORMAL.filter((s) => s.weaponType === weaponType && !excludeIds.has(s.id))
  }

  const skill = pickSkillByStar(pool, star, rng)
  return skill ? skill.id : null
}

let weaponSeq = 1

// 武器を1本生成する
// plusValue：スキル+値（ダンジョン階層で固定。フェーズ1は常に0）
export function generateWeapon({ weaponType, rarity, element, rng = Math.random, plusValue = 0, name = null }) {
  const rarityDef = RARITIES[rarity]
  const typeDef = WEAPON_TYPES[weaponType]
  const elementDef = ELEMENTS[element]

  // スキル抽選：各枠50%で充填
  const skillIds = []
  const excludeIds = new Set() // 同一武器内でのスキル重複を避ける
  for (let i = 0; i < rarityDef.skillSlots; i++) {
    if (rng() < SKILL_ROLL_RULES.slotFillChance) {
      const id = rollSkillSlot({ weaponType, element, rarity, rng, excludeIds })
      if (id) {
        skillIds.push(id)
        excludeIds.add(id)
      }
    }
  }
  // 全枠空振り時は1枠目に1個保証（全武器最低1スキル）
  if (skillIds.length === 0 && SKILL_ROLL_RULES.guaranteeFirstSlot && rarityDef.skillSlots > 0) {
    const id = rollSkillSlot({ weaponType, element, rarity, rng, excludeIds })
    if (id) skillIds.push(id)
  }

  // 基礎ATK：レア度のレンジからランダム
  const [minAtk, maxAtk] = rarityDef.baseAtkRange
  const atk = minAtk + Math.floor(rng() * (maxAtk - minAtk + 1))

  return {
    id: `weapon_${weaponSeq++}`,
    name: name || `${elementDef.name}の${typeDef.name}`,
    weaponType,
    element,
    rarity,
    atk,
    // スキルは+値枠付きのインスタンスとして持つ（フェーズ1は全て+0）
    skills: skillIds.map((skillId) => ({ skillId, plus: plusValue })),
  }
}
