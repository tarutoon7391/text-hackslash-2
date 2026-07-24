// スキルチップの一覧表示（ロビーの武器選択・ドロップ結果画面・装備管理画面で共用）
// 「★の数＋スキル名」の小さいチップを横並び/折り返しで一覧表示する
// 1回タップで白枠選択、選択状態でもう1回タップするとSkillDetailPopupが開く
// ※戦闘中のスキル選択ボタン（発動操作用UI）とは別物。こちらは眺める用の表示
//
// 枠選択モード（slotCount指定時）：抽出・移植用に空き枠も含めて枠を描画し、
// タップした枠のindexを親（onSelectSlot）へ通知する。選択状態は親が管理する
// 選択済みの枠をもう1回タップすると通常モードと同じ詳細ポップアップが開く
import { useState } from 'react'
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'
import { getSkillMpCost } from '../../systems/battleEngine.js'
import SkillDetailPopup from '../battle/SkillDetailPopup.jsx'

export default function SkillChipList({ skills, onOpenDictionary, slotCount = null, selectedSlot = null, onSelectSlot = null }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const [popup, setPopup] = useState(null) // {ref, skill}

  const frameMode = slotCount != null
  const list = skills || []
  // 枠数はレア度依存（移植で枠は増えない）。念のため実数がはみ出す場合は実数に合わせる
  const frameTotal = frameMode ? Math.max(slotCount, list.length) : list.length

  if (!frameMode && list.length === 0) {
    return (
      <div className="chip-list">
        <span className="skill-chip empty">スキルなし</span>
      </div>
    )
  }

  const isSelected = (index) =>
    frameMode ? selectedSlot === index : selectedKey === String(index)

  // 通常：1回目のタップで白枠選択／選択状態でもう1回タップで詳細ポップアップ
  // 枠選択モード：1回目のタップで枠選択を親へ通知／もう1回タップで詳細（空き枠は詳細なし）
  const onTap = (ev, ref, index) => {
    ev.stopPropagation() // 親（武器カード等）の選択処理を発火させない
    if (frameMode) {
      if (selectedSlot !== index) onSelectSlot?.(index)
      else if (ref) setPopup({ ref, skill: ALL_SKILLS_BY_ID[ref.skillId] })
      return
    }
    const key = String(index)
    if (selectedKey !== key) {
      setSelectedKey(key)
    } else {
      setPopup({ ref, skill: ALL_SKILLS_BY_ID[ref.skillId] })
    }
  }

  return (
    <div className="chip-list">
      {Array.from({ length: frameTotal }, (_, i) => {
        const ref = list[i] || null
        if (!ref) {
          // 空き枠（枠選択モードのみ。移植先として選択できる）
          return (
            <button
              key={i}
              className={`skill-chip empty frame-empty ${isSelected(i) ? 'selected' : ''}`}
              onClick={(ev) => onTap(ev, null, i)}
            >
              ＋ 空き枠
            </button>
          )
        }
        const skill = ALL_SKILLS_BY_ID[ref.skillId]
        const elemClass = skill.element ? `elem-${skill.element}` : 'elem-none'
        return (
          <button
            key={i}
            className={`skill-chip ${elemClass} ${isSelected(i) ? 'selected' : ''}`}
            onClick={(ev) => onTap(ev, ref, i)}
          >
            {'★'.repeat(skill.star)} {skill.name}{ref.plus > 0 ? `(+${ref.plus})` : ''}
          </button>
        )
      })}

      {/* スキル詳細（戦闘画面と同じSkillDetailPopupを再利用。「使う」なし） */}
      {popup && (
        <SkillDetailPopup
          skill={popup.skill}
          displayName={popup.ref.plus > 0 ? `${popup.skill.name}(+${popup.ref.plus})` : popup.skill.name}
          mpCost={getSkillMpCost(popup.ref)}
          onClose={() => setPopup(null)}
          onOpenDictionary={onOpenDictionary}
        />
      )}
    </div>
  )
}
