// エンチャントチップの一覧表示（ロビーの武器選択・ドロップ結果画面・装備管理画面で共用）
// スキルチップと同系統の「✦＋名前＋数値」の小さいチップを横並び/折り返しで表示する
// タップ導線もスキルチップと同じ：1回タップで白枠選択、もう1回タップで詳細ポップアップ
// ※「青天井組」「渋カーブ組」は内部設計用語のためラベル表示しない（種別の色分けのみ）
//
// 枠選択モード（slotCount指定時）：抽出・移植用に空き枠も含めて枠を描画し、
// タップした枠のindexを親（onSelectSlot）へ通知する。選択状態は親が管理する
// 選択済みの枠をもう1回タップすると通常モードと同じ詳細ポップアップが開く
import { useState } from 'react'
import EnchantDetailPopup from './EnchantDetailPopup.jsx'

export default function EnchantChipList({ enchants, slotCount = null, selectedSlot = null, onSelectSlot = null }) {
  const [selectedKey, setSelectedKey] = useState(null)
  const [popup, setPopup] = useState(null)

  const frameMode = slotCount != null
  const list = enchants || []
  // 枠数はレア度依存（移植で枠は増えない）。念のため実数がはみ出す場合は実数に合わせる
  const frameTotal = frameMode ? Math.max(slotCount, list.length) : list.length

  if (!frameMode && list.length === 0) {
    return (
      <div className="chip-list enchant-chip-list">
        <span className="skill-chip empty">エンチャントなし</span>
      </div>
    )
  }

  const isSelected = (index) =>
    frameMode ? selectedSlot === index : selectedKey === String(index)

  // 通常：1回目のタップで白枠選択／選択状態でもう1回タップで詳細ポップアップ
  // 枠選択モード：1回目のタップで枠選択を親へ通知／もう1回タップで詳細（空き枠は詳細なし）
  const onTap = (ev, en, index) => {
    ev.stopPropagation() // 親（武器カード等）の選択処理を発火させない
    if (frameMode) {
      if (selectedSlot !== index) onSelectSlot?.(index)
      else if (en) setPopup(en)
      return
    }
    const key = String(index)
    if (selectedKey !== key) {
      setSelectedKey(key)
    } else {
      setPopup(en)
    }
  }

  return (
    <div className="chip-list enchant-chip-list">
      {Array.from({ length: frameTotal }, (_, i) => {
        const en = list[i] || null
        if (!en) {
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
        return (
          <button
            key={i}
            className={`skill-chip enchant-chip ${en.kind} ${isSelected(i) ? 'selected' : ''}`}
            onClick={(ev) => onTap(ev, en, i)}
          >
            ✦ {en.name.replace('%', '')}{en.value}%
          </button>
        )
      })}
      {popup && <EnchantDetailPopup enchant={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}
