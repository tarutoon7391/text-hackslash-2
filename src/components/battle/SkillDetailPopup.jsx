// スキル詳細ポップアップ（星の数・属性色分け・MP消費・効果テキスト）
// 画面遷移せず現在の画面内にオーバーレイ表示する小さなポップアップ
// onUseを渡すと「使う」ボタンが付く（戦闘中のスキル選択フロー用）
// 効果テキスト内の用語は色付き表示され、タップするとまとめ用語ポップアップが
// このポップアップより上のレイヤーに重なって開く（閉じてもこちらは維持される）
import { useState } from 'react'
import { ELEMENTS } from '../../data/elements.js'
import { GLOSSARY_BY_TERM } from '../../data/glossary.js'
import { renderGlossaryText } from '../../utils/glossaryText.js'
import GlossarySummaryPopup from '../common/GlossarySummaryPopup.jsx'

export default function SkillDetailPopup({ skill, displayName, mpCost, usable = true, onUse, onClose }) {
  // まとめ用語ポップアップ（このコンポーネント内で管理するので、
  // SkillDetailPopup自体が閉じられたら一緒に閉じる）
  const [glossTerms, setGlossTerms] = useState(null)

  const elemClass = skill.element ? `elem-${skill.element}` : 'elem-none'
  const { nodes: descNodes } = renderGlossaryText(skill.desc, (terms) => setGlossTerms(terms))

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className={`skill-popup ${elemClass}`} onClick={(ev) => ev.stopPropagation()}>
        <div className="popup-stars">{'★'.repeat(skill.star)}</div>
        <div className="popup-name">{displayName || skill.name}</div>
        <div className="popup-meta">
          {/* 属性ラベルもタップで用語詳細を開ける（その属性名1つだけを表示） */}
          <span
            className={`elem-tag ${elemClass}`}
            onClick={() => {
              if (!skill.element) return
              const entry = GLOSSARY_BY_TERM[ELEMENTS[skill.element].name]
              if (entry) setGlossTerms([entry])
            }}
          >
            {skill.element ? `${ELEMENTS[skill.element].icon}${ELEMENTS[skill.element].name}属性` : '無属性'}
          </span>
          <span className="popup-mp">MP {mpCost ?? skill.mp}</span>
        </div>
        <div className="popup-desc">{descNodes}</div>
        {onUse && (
          <button className="use-btn" disabled={!usable} onClick={onUse}>使う</button>
        )}
      </div>

      {/* まとめ用語ポップアップ（z-indexでこのポップアップより上に重ねる） */}
      {glossTerms && (
        <GlossarySummaryPopup terms={glossTerms} onClose={() => setGlossTerms(null)} />
      )}
    </div>
  )
}
