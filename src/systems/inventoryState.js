// インベントリ管理
// ドロップ品をReact stateの配列で保持する（DB保存はフェーズ3以降。リロードで消えてよい）
import { useState } from 'react'

export function useInventoryState() {
  const [items, setItems] = useState([])

  // 新しいドロップ品を先頭に追加する
  const addItem = (item) => setItems((prev) => [item, ...prev])

  return { items, addItem }
}
