// スキルチップの一覧表示（ロビーの武器選択・ドロップ結果画面で共用）
// 「★の数＋スキル名」の小さいチップを横並び/折り返しで一覧表示する
// 1回タップで白枠選択、選択状態でもう1回タップするとSkillDetailPopupが開く
// ※戦闘中のスキル選択ボタン（発動操作用UI）とは別物。こちらは眺める用の表示
import { useState } from 'react'
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'
import { getSkillMpCost } from '../../systems/battleEngine.js'
import SkillDetailPopup from '../battle/SkillDetailPopup.jsx'

export default function SkillChipList({ skills, onOpenDictionary }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const [popup, setPopup] = useState(null) // {ref, skill}

  if (!skills || skills.length === 0) {
    return (
      <div className="chip-list">
        <span className="skill-chip empty">スキルなし</span>
      </div>
    )
  }

  // 1回目のタップ：白枠選択／選択状態でもう1回タップ：詳細ポップアップ
  const onTap = (ev, ref, index) => {
    ev.stopPropagation() // 親（武器カード等）の選択処理を発火させない
    const key = String(index)
    if (selectedKey !== key) {
      setSelectedKey(key)
    } else {
      setPopup({ ref, skill: ALL_SKILLS_BY_ID[ref.skillId] })
    }
  }

  return (
    <div className="chip-list">
      {skills.map((ref, i) => {
        const skill = ALL_SKILLS_BY_ID[ref.skillId]
        const elemClass = skill.element ? `elem-${skill.element}` : 'elem-none'
        return (
          <button
            key={i}
            className={`skill-chip ${elemClass} ${selectedKey === String(i) ? 'selected' : ''}`}
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
