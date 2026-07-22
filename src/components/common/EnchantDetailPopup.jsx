// エンチャント詳細ポップアップ（SkillDetailPopupと同系統の見た目の簡易版）
// 数値・種別（青天井/渋カーブ）・カテゴリ（攻撃系/生存系/特殊系）を表示する
// 閉じるボタン＋外側タップで閉じる
import { ENCHANTS_BY_ID } from '../../data/itemTemplates.js'

const CATEGORY_LABELS = { attack: '攻撃系', survival: '生存系', special: '特殊系' }

export default function EnchantDetailPopup({ enchant, onClose }) {
  // enchant: {enchantId, name, kind, value}
  const def = ENCHANTS_BY_ID[enchant.enchantId]
  const kindLabel = enchant.kind === 'unlimited'
    ? '青天井組：上限なく伸ばせるエンチャント'
    : '渋カーブ組：100%上限のある有限エンチャント'

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
            {enchant.kind === 'unlimited' ? '青天井' : '渋カーブ'}
          </span>
          {def && <span className="gloss-category">{CATEGORY_LABELS[def.category]}</span>}
        </div>
        <div className="popup-desc">{kindLabel}</div>
        <button className="select-btn cancel" onClick={closeSelf}>閉じる</button>
      </div>
    </div>
  )
}
