// 合成システム（純関数。React非依存＝スモークテスト対象）
// ベース装備に「欠片」や「他の装備（親）」を合成して+値を上げる。
// 親にした装備のスキル／エンチャントは、ベースの枠に入る範囲で好きなだけ選んで引き継げる。
// ただしスキルは武器種ごとの管理：他の武器種用のスキルは引き継げない（属性スキルは武器種を問わない）。
// 親にした装備と使った欠片は消える。
//
// +値の仕組み：
//   - 合成で「合成経験値」が貯まり、一定量ごとに+1される。+値が高いほど次の+1が重くなる
//   - +値は装備に残り続ける。ただし実際に効果が出るのは「今の職業レベル」まで（playerStats.js側で判定）
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js'
import { RARITIES } from '../data/rarities.js'
import { ENCHANT_RULES } from '../data/itemTemplates.js'
import { ALL_SKILLS_BY_ID } from '../data/skills_elemental.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'

// ===== +値と合成経験値 =====

// +n → +(n+1) に必要な合成経験値
export function expToNextPlus(plus) {
  const { expBase, expPow } = PROGRESSION_CONFIG.plus
  return Math.round(expBase * Math.pow(plus + 1, expPow))
}

// その装備がこれまでに取り込んだ合成経験値の合計
export function totalInvestedExp(item) {
  let total = item.plusExp || 0
  for (let n = 0; n < (item.plus || 0); n++) total += expToNextPlus(n)
  return total
}

// 合成経験値を加えた結果の {plus, plusExp} を返す
export function addPlusExp(item, exp) {
  const max = PROGRESSION_CONFIG.plus.max
  let plus = item.plus || 0
  let rest = (item.plusExp || 0) + exp
  while (plus < max && rest >= expToNextPlus(plus)) {
    rest -= expToNextPlus(plus)
    plus++
  }
  if (plus >= max) rest = 0
  return { plus, plusExp: rest }
}

// ===== 素材の価値 =====

// 欠片1個あたりの合成経験値（ランクが高い＝深い階の欠片ほど多い）
export function shardExp(tier) {
  return PROGRESSION_CONFIG.material.shardExpBase * Number(tier)
}

// 装備を素材（親）にした時の合成経験値
// ＝レア度の基礎値 ×(1 + 産出階×補正) ＋ その装備が貯めていた合成経験値の一部
export function equipMaterialExp(item) {
  const { equipExpByRarity, floorBonus, investedRefundRate } = PROGRESSION_CONFIG.material
  const base = (equipExpByRarity[item.rarity] || 0) * (1 + (item.floor || 0) * floorBonus)
  return Math.round(base + totalInvestedExp(item) * investedRefundRate)
}

// ===== 枠数 =====

export function skillSlotCount(item) {
  if (item.slot !== 'weapon') return 0
  // 枠数はレア度依存（合成でも増えない）。既に枠数より多く持っている場合は実数を尊重する
  return Math.max(RARITIES[item.rarity]?.skillSlots ?? 0, (item.skills || []).length)
}

export function enchantSlotCount(item) {
  return Math.max(ENCHANT_RULES.slotsByRarity[item.rarity] ?? 0, (item.enchants || []).length)
}

// ===== スキルの武器種制限 =====
// スキルは武器種ごとに管理する：無属性スキル（剣用・弓用…）は同じ武器種の武器にしか引き継げない。
// 属性スキル（火・水…）は武器種を持たないので、どの武器種にも引き継げる。
// 引き継げない時は理由の文字列、引き継げる時はnullを返す
export function skillInheritBlockReason(base, skillId) {
  const skill = ALL_SKILLS_BY_ID[skillId]
  if (!skill || !skill.weaponType || skill.weaponType === base.weaponType) return null
  return `${WEAPON_TYPES[skill.weaponType]?.name || '別の武器種'}用のスキルは${WEAPON_TYPES[base.weaponType]?.name || 'この武器'}に引き継げない`
}

// ===== 引き継ぎ候補 =====
// ベースと親が持っているスキル／エンチャントを1つの候補リストにまとめる
// key＝「どの装備の何番目か」。fromBase＝ベースが元から持っているもの

export function buildSkillPool(base, parents) {
  const pool = []
  for (const src of [base, ...parents]) {
    ;(src.skills || []).forEach((ref, i) => {
      const fromBase = src.id === base.id
      pool.push({
        key: `${src.id}:s${i}`, fromBase, sourceName: src.name, skillId: ref.skillId, plus: ref.plus || 0,
        // 親のスキルが武器種違いで引き継げない場合の理由（ベースが元から持っているものは対象外）
        blocked: fromBase ? null : skillInheritBlockReason(base, ref.skillId),
      })
    })
  }
  return pool
}

export function buildEnchantPool(base, parents) {
  const pool = []
  for (const src of [base, ...parents]) {
    ;(src.enchants || []).forEach((en, i) => {
      pool.push({
        key: `${src.id}:e${i}`, fromBase: src.id === base.id, sourceName: src.name,
        enchantId: en.enchantId, name: en.name, kind: en.kind, value: en.value,
      })
    })
  }
  return pool
}

// 選んだスキルの組み合わせが有効か（エラーメッセージ or null）
export function validateSkillSelection(base, selected) {
  // 武器種が違うスキルは親から引き継げない（ベースが元から持っているものはそのまま残せる）
  for (const entry of selected) {
    if (entry.fromBase) continue
    const reason = skillInheritBlockReason(base, entry.skillId)
    if (reason) return reason
  }
  if (selected.length > skillSlotCount(base)) return `スキルは${skillSlotCount(base)}枠まで`
  const ids = selected.map((s) => s.skillId)
  if (new Set(ids).size !== ids.length) return '同じスキルは1つの武器に1個まで'
  return null
}

// 選んだエンチャントの組み合わせが有効か（エラーメッセージ or null）
// GDD 10.3：上限100%系（渋カーブ組）は1装備に同種1個まで。青天井組は同種を複数積める
export function validateEnchantSelection(base, selected) {
  if (selected.length > enchantSlotCount(base)) return `エンチャントは${enchantSlotCount(base)}枠まで`
  const capped = selected.filter((e) => e.kind === 'capped').map((e) => e.enchantId)
  if (new Set(capped).size !== capped.length) return '上限100%系の同じエンチャントは1個まで'
  return null
}

// ===== 合成の実行 =====
// base：ベース装備／parents：親にする装備（消える）／shardsUsed：{ランク: 個数}
// keepSkillKeys／keepEnchantKeys：合成後に残すものの候補key（省略時はベースの現状維持）
// 戻り値：{ error } または { item（合成後のベース）, gainedExp, removedIds（消える親のID） }
export function fuse({ base, parents = [], shardsUsed = {}, keepSkillKeys = null, keepEnchantKeys = null }) {
  if (parents.some((p) => p.id === base.id)) return { error: 'ベース自身は素材にできない' }
  if (parents.some((p) => p.slot !== base.slot)) return { error: '同じ部位の装備しか親にできない' }
  if (new Set(parents.map((p) => p.id)).size !== parents.length) return { error: '同じ装備を2回選んでいる' }

  let gainedExp = 0
  for (const [tier, count] of Object.entries(shardsUsed)) gainedExp += shardExp(tier) * count
  for (const p of parents) gainedExp += equipMaterialExp(p)
  if (gainedExp <= 0 && parents.length === 0) return { error: '素材を選んでいない' }

  const skillPool = buildSkillPool(base, parents)
  const enchantPool = buildEnchantPool(base, parents)
  const pick = (pool, keys) =>
    keys == null ? pool.filter((e) => e.fromBase) : keys.map((k) => pool.find((e) => e.key === k)).filter(Boolean)
  const skills = pick(skillPool, keepSkillKeys)
  const enchants = pick(enchantPool, keepEnchantKeys)

  const error = validateSkillSelection(base, skills) || validateEnchantSelection(base, enchants)
  if (error) return { error }

  const item = {
    ...base,
    ...addPlusExp(base, gainedExp),
    skills: base.slot === 'weapon' ? skills.map((s) => ({ skillId: s.skillId, plus: s.plus })) : (base.skills || []),
    enchants: enchants.map((e) => ({ enchantId: e.enchantId, name: e.name, kind: e.kind, value: e.value })),
  }
  return { item, gainedExp, removedIds: parents.map((p) => p.id) }
}
