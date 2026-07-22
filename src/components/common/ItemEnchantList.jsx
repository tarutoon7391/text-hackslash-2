// 装備エンチャントの一覧表示（ドロップ結果画面・ロビーの装備選択で共用）
// タップで詳細ポップアップ（EnchantDetailPopup）を開く
import { useState } from 'react'
import EnchantDetailPopup from './EnchantDetailPopup.jsx'

export default function ItemEnchantList({ enchants }) {
  const [popup, setPopup] = useState(null)

  if (!enchants || enchants.length === 0) {
    return (
      <div className="loot-enchants">
        <span className="loot-enchant none">エンチャントなし</span>
      </div>
    )
  }

  return (
    <div className="loot-enchants">
      {enchants.map((en, i) => (
        <button
          key={i}
          className={`loot-enchant tappable ${en.kind}`}
          onClick={(ev) => { ev.stopPropagation(); setPopup(en) }}
        >
          ✦ {en.name.replace('%', '')}{en.value}%
        </button>
      ))}
      {popup && <EnchantDetailPopup enchant={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}
