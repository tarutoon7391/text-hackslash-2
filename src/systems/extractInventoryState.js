// 抽出インベントリ管理＋移植ロジック（GDD 11番）
// 装備から抽出したスキル/エンチャントを保持し、別装備への移植（上書き）に使う
// 抽出物は元アイテムの情報（スキル=+値／エンチャント=数値）をそのまま保持する
import { useState } from 'react'

let extractSeq = 1

// ===== 移植の純関数ロジック（スモークテスト対象。React非依存） =====

// 渋カーブ組の重複バリデーション（GDD 10.3：1装備につき同種1個まで。移植でも重複不可）
// 上書き先の枠（targetIndex）自体は消滅するので重複判定から除外する
// 青天井組は移植でのみ同種を複数積める（効果は単純加算）ため制限なし
// 移植できないときはエラーメッセージ文字列、できるときはnullを返す
export function validateEnchantTransplant({ item, targetIndex, entry }) {
  if (entry.kind !== 'capped') return null
  const dup = (item.enchants || []).some(
    (en, i) => i !== targetIndex && en.enchantId === entry.enchantId
  )
  if (dup) return `上限100%系の「${entry.name}」は1つの装備に1個までしか付けられない`
  return null
}

// スキル移植のバリデーション
// GDDの重複ルール（10.3）はエンチャント対象だが、スキルも生成時に同一武器内の
// 重複を避けている（weaponGenerator）ため、移植でも同スキルの重複は弾く
// ※武器種・属性をまたぐ移植はGDDに制限記述がないため許可
export function validateSkillTransplant({ item, targetIndex, entry }) {
  const dup = (item.skills || []).some(
    (ref, i) => i !== targetIndex && ref.skillId === entry.skillId
  )
  if (dup) return 'このスキルは既にこの装備に付いている'
  return null
}

// 枠listのtargetIndexへentryを上書きした新しい配列を返す
// 空き枠（既存要素より後ろのindex）を選んだ場合は末尾に追加になる
function overwriteAt(list, targetIndex, entry) {
  const next = [...(list || [])]
  if (targetIndex < next.length) next[targetIndex] = entry
  else next.push(entry)
  return next
}

// スキルを移植した新しいアイテムを返す（元アイテムは変更しない）
export function applySkillTransplant({ item, targetIndex, entry }) {
  return { ...item, skills: overwriteAt(item.skills, targetIndex, { skillId: entry.skillId, plus: entry.plus }) }
}

// エンチャントを移植した新しいアイテムを返す（元アイテムは変更しない）
export function applyEnchantTransplant({ item, targetIndex, entry }) {
  const en = { enchantId: entry.enchantId, name: entry.name, kind: entry.kind, value: entry.value }
  return { ...item, enchants: overwriteAt(item.enchants, targetIndex, en) }
}

// ===== 抽出インベントリのstate管理 =====

export function useExtractInventoryState() {
  const [skills, setSkills] = useState([])     // {extractId, skillId, plus}
  const [enchants, setEnchants] = useState([]) // {extractId, enchantId, name, kind, value}

  // 装備から抽出したスキルを追加（+値を保持したままコピー）
  const addSkill = (ref) => {
    const entry = { extractId: `ext_${extractSeq++}`, skillId: ref.skillId, plus: ref.plus }
    setSkills((prev) => [entry, ...prev])
  }

  // 装備から抽出したエンチャントを追加（数値を保持したままコピー）
  const addEnchant = (en) => {
    const entry = { extractId: `ext_${extractSeq++}`, enchantId: en.enchantId, name: en.name, kind: en.kind, value: en.value }
    setEnchants((prev) => [entry, ...prev])
  }

  // 移植で消費したスキル/エンチャントをインベントリから削除する
  const removeSkill = (extractId) => setSkills((prev) => prev.filter((s) => s.extractId !== extractId))
  const removeEnchant = (extractId) => setEnchants((prev) => prev.filter((e) => e.extractId !== extractId))

  return { skills, enchants, addSkill, addEnchant, removeSkill, removeEnchant }
}
