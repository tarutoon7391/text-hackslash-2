// エンチャントチップの一覧表示（ロビーの武器選択・ドロップ結果画面で共用）
// スキルチップと同系統の「✦＋名前＋数値」の小さいチップを横並び/折り返しで表示する
// タップ導線もスキルチップと同じ：1回タップで白枠選択、もう1回タップで詳細ポップアップ
// ※「青天井組」「渋カーブ組」は内部設計用語のためラベル表示しない（種別の色分けのみ）
import { useState } from 'react'
import EnchantDetailPopup from './EnchantDetailPopup.jsx'

export default function EnchantChipList({ enchants }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const [popup, setPopup] = useState(null)

  if (!enchants || enchants.length === 0) {
    return (
      <div className="chip-list enchant-chip-list">
        <span className="skill-chip empty">エンチャントなし</span>
      </div>
    )
  }

  // 1回目のタップ：白枠選択／選択状態でもう1回タップ：詳細ポップアップ
  const onTap = (ev, en, index) => {
    ev.stopPropagation() // 親（武器カード等）の選択処理を発火させない
    const key = String(index)
    if (selectedKey !== key) {
      setSelectedKey(key)
    } else {
      setPopup(en)
    }
  }

  return (
    <div className="chip-list enchant-chip-list">
      {enchants.map((en, i) => (
        <button
          key={i}
          className={`skill-chip enchant-chip ${en.kind} ${selectedKey === String(i) ? 'selected' : ''}`}
          onClick={(ev) => onTap(ev, en, i)}
        >
          ✦ {en.name.replace('%', '')}{en.value}%
        </button>
      ))}
      {popup && <EnchantDetailPopup enchant={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}
