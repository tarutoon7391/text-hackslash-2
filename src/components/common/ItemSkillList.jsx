// 装備スキルの一覧表示（ドロップ結果画面・ロビーの装備選択で共用）
// 戦闘画面のスキルボタンと同じ見た目（星の数・属性色分け・MP消費）と
// 同じ導線（1タップで白枠選択→もう1タップでSkillDetailPopup）をそのまま再利用する。
// テキスト内の用語もglossaryTextの色付け／タップ判定をそのまま適用（GlossarySummaryPopupが開く）
import { useState } from 'react'
import { ELEMENTS } from '../../data/elements.js'
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'
import { getSkillMpCost } from '../../systems/battleEngine.js'
import { renderGlossaryText } from '../../utils/glossaryText.js'
import SkillDetailPopup from '../battle/SkillDetailPopup.jsx'
import GlossarySummaryPopup from './GlossarySummaryPopup.jsx'

export default function ItemSkillList({ skills, onOpenDictionary }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const [popup, setPopup] = useState(null)         // {ref, skill}
  const [glossTerms, setGlossTerms] = useState(null) // 一覧内の用語タップ

  if (!skills || skills.length === 0) {
    return (
      <div className="skill-grid">
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
    <div className="skill-grid">
      {skills.map((ref, i) => {
        const skill = ALL_SKILLS_BY_ID[ref.skillId]
        const elemClass = skill.element ? `elem-${skill.element}` : 'elem-none'
        const displayName = ref.plus > 0 ? `${skill.name}(+${ref.plus})` : skill.name
        const nameText = renderGlossaryText(displayName, setGlossTerms)
        const descText = renderGlossaryText(skill.desc, setGlossTerms)
        return (
          <button
            key={i}
            className={`skill-btn ${elemClass} ${selectedKey === String(i) ? 'selected' : ''}`}
            onClick={(ev) => onTap(ev, ref, i)}
          >
            <span className="skill-stars">{'★'.repeat(skill.star)}</span>
            <span className="skill-name">{nameText.nodes}</span>
            <span className="skill-info">
              MP{getSkillMpCost(ref)}{skill.element ? ` ${ELEMENTS[skill.element].icon}` : ''}
            </span>
            <span className="skill-desc">{descText.nodes}</span>
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

      {/* 一覧内の色付き用語タップ→まとめ用語ポップアップ（既存コンポーネント再利用） */}
      {glossTerms && (
        <GlossarySummaryPopup
          terms={glossTerms}
          onClose={() => setGlossTerms(null)}
          onOpenDictionary={onOpenDictionary}
        />
      )}
    </div>
  )
}
