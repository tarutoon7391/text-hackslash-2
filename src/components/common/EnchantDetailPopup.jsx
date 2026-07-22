// エンチャント詳細ポップアップ（SkillDetailPopupと同系統の見た目の簡易版）
// 数値・種別・カテゴリ（攻撃系/生存系/特殊系）を表示する
// 閉じるボタン＋外側タップで閉じる
// ※「青天井組」「渋カーブ組」は内部設計用語のためUIには表示しない
//   （プレイヤー向けには「上限なし」「上限100%」と言い換える）
import { ENCHANTS_BY_ID } from '../../data/itemTemplates.js'

const CATEGORY_LABELS = { attack: '攻撃系', survival: '生存系', special: '特殊系' }

export default function EnchantDetailPopup({ enchant, onClose }) {
  // enchant: {enchantId, name, kind, value}
  const def = ENCHANTS_BY_ID[enchant.enchantId]
  const kindLabel = enchant.kind === 'unlimited'
    ? '数値に上限がなく、重ねるほどどこまでも伸ばせるエンチャント。'
    : '効果が100%で頭打ちになる、上限のあるエンチャント。'

  const closeSelf = (ev) => {
    ev.stopPropagation()
    onClose()
  }

  return (
    <div className="popup-overlay" onClick={closeSelf}>
      <div className="skill-popup enchant-popup" onClick={(ev) => ev.stopPropagation()}>
        <div className="popup-name">✦ {enchant.name.replace('%', `${enchant.value}%`)}</div>
        <div className="popup-meta">
          <span className={`enchant-kind ${enchant.kind}`}>
            {enchant.kind === 'unlimited' ? '上限なし' : '上限100%'}
          </span>
          {def && <span className="gloss-category">{CATEGORY_LABELS[def.category]}</span>}
        </div>
        <div className="popup-desc">{kindLabel}</div>
        <button className="select-btn cancel" onClick={closeSelf}>閉じる</button>
      </div>
    </div>
  )
}
