// スキルの書（純関数。React非依存＝スモークテスト対象）
// 敵がたまに落とす消費アイテム。武器に使うと、その書のスキルを覚えさせられる。
// - 落とすのは、その敵の属性のスキルだけ
// - どの★のスキルが出るかは、装備ドロップと同じ「レア度の抽選 → そのレア度の★の出やすさ」で決まる
// - 書は1回使うと無くなる
// 使った時の動き：
//   その武器がもう同じスキルを持っている → +値が上がるチャンス（合成のおまけと同じ確率）
//   スキル枠が空いている               → そのまま覚える
//   スキル枠が埋まっている             → どれか1つと入れ替える（入れ替える枠を選ぶ）
import { DUNGEON_CONFIG } from '../data/dungeonConfig.js'
import { RARITIES } from '../data/rarities.js'
import { SKILLS_ELEMENTAL, ALL_SKILLS_BY_ID } from '../data/skills_elemental.js'
import { skillSlotCount, skillPlusChance } from './fusionSystem.js'

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

// 書の中身（スキルID）を1つ決める
// element：敵の属性／grade：'grunt' | 'boss'（装備ドロップと同じレア度表を使う）
export function generateSkillBook({ element, grade, rng = Math.random }) {
  const pool = SKILLS_ELEMENTAL.filter((sk) => sk.element === element)
  if (pool.length === 0) return null
  // 装備と同じレア度抽選 → そのレア度の★の出やすさ（ユニークは専用枠なので、★はレジェンダリーの表を使う）
  const rarity = rollWeighted(DUNGEON_CONFIG.dropRates[grade], rng)
  const weights = Object.values(RARITIES[rarity].starWeights).some((w) => w > 0)
    ? RARITIES[rarity].starWeights
    : RARITIES.legendary.starWeights
  const star = Number(rollWeighted(weights, rng))
  // その★のスキルが無ければ、近い下の★に落とす
  for (let s = star; s >= 1; s--) {
    const candidates = pool.filter((sk) => sk.star === s)
    if (candidates.length > 0) return candidates[Math.floor(rng() * candidates.length)].id
  }
  return pool[Math.floor(rng() * pool.length)].id
}

// その武器にこの書を使うと何が起きるか（画面のボタン表示用）
// 戻り値：{ kind: 'plus'（+値チャンス）| 'add'（空き枠に追加）| 'replace'（入れ替え）| 'blocked', chance?, reason? }
export function previewSkillBook(weapon, skillId) {
  if (!weapon || weapon.slot !== 'weapon') return { kind: 'blocked', reason: '武器にしか使えない' }
  if (!ALL_SKILLS_BY_ID[skillId]) return { kind: 'blocked', reason: '中身の分からない書' }
  const owned = (weapon.skills || []).find((ref) => ref.skillId === skillId)
  if (owned) {
    const chance = skillPlusChance(owned.plus || 0)
    return chance > 0 ? { kind: 'plus', chance } : { kind: 'blocked', reason: 'このスキルはもう上限まで育っている' }
  }
  const slots = skillSlotCount(weapon)
  if (slots <= 0) return { kind: 'blocked', reason: 'この武器にはスキル枠がない' }
  return (weapon.skills || []).length < slots ? { kind: 'add' } : { kind: 'replace' }
}

// 書を使う
// replaceIndex：枠が埋まっている時に入れ替える枠の番号
// 戻り値：{ error } または { item（使用後の武器）, kind, plusUp?: {from, to} | null }
export function applySkillBook({ weapon, skillId, replaceIndex = null, rng = Math.random }) {
  const preview = previewSkillBook(weapon, skillId)
  if (preview.kind === 'blocked') return { error: preview.reason }
  const skills = (weapon.skills || []).map((ref) => ({ ...ref }))
  if (preview.kind === 'plus') {
    const index = skills.findIndex((ref) => ref.skillId === skillId)
    const from = skills[index].plus || 0
    const hit = rng() < preview.chance
    if (hit) skills[index].plus = from + 1
    return { item: { ...weapon, skills }, kind: 'plus', plusUp: hit ? { from, to: from + 1 } : null }
  }
  if (preview.kind === 'add') {
    skills.push({ skillId, plus: 0 })
    return { item: { ...weapon, skills }, kind: 'add', plusUp: null }
  }
  if (!Number.isInteger(replaceIndex) || replaceIndex < 0 || replaceIndex >= skills.length) {
    return { error: '入れ替えるスキルを選んでいない' }
  }
  skills[replaceIndex] = { skillId, plus: 0 }
  return { item: { ...weapon, skills }, kind: 'replace', plusUp: null }
}
