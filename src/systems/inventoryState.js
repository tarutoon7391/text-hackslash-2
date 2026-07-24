// インベントリ管理
// ドロップ品をReact stateの配列で保持する（DB保存はフェーズ3以降。リロードで消えてよい）
import { useState } from 'react'

export function useInventoryState() {
  const [items, setItems] = useState([])

  // 新しいドロップ品を先頭に追加する
  const addItem = (item) => setItems((prev) => [item, ...prev])

  // アイテムを削除する（抽出で装備が破壊されたとき用）
  const removeItem = (itemId) => setItems((prev) => prev.filter((it) => it.id !== itemId))

  // アイテムを置き換える（移植でスキル/エンチャント枠が書き換わったとき用）
  const updateItem = (nextItem) =>
    setItems((prev) => prev.map((it) => (it.id === nextItem.id ? nextItem : it)))

  return { items, addItem, removeItem, updateItem }
}
