// 状態異常アイコンのタップ詳細ポップアップ
// 状態異常名・現在のスタック数・残りターン数・効果説明を表示する
// - 説明文はglossary.jsの当該状態異常の文言を再利用（二重管理しない）
// - アクセントカラーはstatusEffectColors.js（スキル属性色と同一パレット）
// - GlossarySummaryPopupと同系統の小さいオーバーレイ。閉じるボタン＋外側タップで閉じる
import { STATUS_EFFECTS } from '../../data/statusEffects.js'
import { STATUS_EFFECT_COLORS } from '../../data/statusEffectColors.js'
import { GLOSSARY_BY_TERM } from '../../data/glossary.js'

export default function StatusEffectPopup({ info, onClose }) {
  // info: { ailmentId, stacks, turns, ownerName }
  if (!info) return null
  const def = STATUS_EFFECTS[info.ailmentId]
  const color = STATUS_EFFECT_COLORS[info.ailmentId]
  const gloss = GLOSSARY_BY_TERM[def.name] // 説明文はグロッサリーから再利用

  const closeSelf = (ev) => {
    ev.stopPropagation()
    onClose()
  }

  return (
    <div className="gloss-overlay" onClick={closeSelf}>
      <div className="gloss-popup se-popup" style={{ borderTopColor: color }} onClick={(ev) => ev.stopPropagation()}>
        <h3 className="se-popup-name" style={{ color }}>{def.icon} {def.name}</h3>
        <div className="se-popup-owner">対象：{info.ownerName}</div>
        <div className="se-popup-stats">
          <span className="se-popup-stat">スタック <b>×{info.stacks}</b></span>
          <span className="se-popup-stat">残り <b>{info.turns}</b> ターン</span>
        </div>
        <p className="se-popup-desc">{gloss?.description}</p>
        <button className="select-btn cancel" onClick={closeSelf}>閉じる</button>
      </div>
    </div>
  )
}
