// スキル詳細ポップアップ（星の数・属性色分け・MP消費・効果テキスト）
// 画面遷移せず現在の画面内にオーバーレイ表示する小さなポップアップ
// onUseを渡すと「使う」ボタンが付く（戦闘中のスキル選択フロー用）
import { ELEMENTS } from '../../data/elements.js'

export default function SkillDetailPopup({ skill, displayName, mpCost, usable = true, onUse, onClose }) {
  const elemClass = skill.element ? `elem-${skill.element}` : 'elem-none'
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className={`skill-popup ${elemClass}`} onClick={(ev) => ev.stopPropagation()}>
        <div className="popup-stars">{'★'.repeat(skill.star)}</div>
        <div className="popup-name">{displayName || skill.name}</div>
        <div className="popup-meta">
          <span className={`elem-tag ${elemClass}`}>
            {skill.element ? `${ELEMENTS[skill.element].icon}${ELEMENTS[skill.element].name}属性` : '無属性'}
          </span>
          <span className="popup-mp">MP {mpCost ?? skill.mp}</span>
        </div>
        <div className="popup-desc">{skill.desc}</div>
        {onUse && (
          <button className="use-btn" disabled={!usable} onClick={onUse}>使う</button>
        )}
      </div>
    </div>
  )
}
