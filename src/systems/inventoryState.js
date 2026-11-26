// インベントリ管理
// 所持している装備を配列で保持し、端末内（localStorage）に自動保存する
import { usePersistentState } from './saveStorage.js'

// 旧セーブ互換：後から増えた項目（+値・合成経験値・エンチャント配列など）を既定値で補う
export function migrateItems(saved) {
  if (!Array.isArray(saved)) return []
  return saved
    .filter((it) => it && typeof it.id === 'string' && it.slot)
    .map((it) => ({
      ...it,
      plus: Number.isFinite(it.plus) ? it.plus : 0,
      plusExp: Number.isFinite(it.plusExp) ? it.plusExp : 0,
      skills: Array.isArray(it.skills) ? it.skills : [],
      enchants: Array.isArray(it.enchants) ? it.enchants : [],
    }))
}

export function useInventoryState() {
  const [items, setItems] = usePersistentState('items', [], migrateItems)

  // 新しいドロップ品を先頭に追加する
  const addItem = (item) => setItems((prev) => [item, ...prev])

  // 複数アイテムを定義順のまま末尾に追加する（初期装備の一括付与用）
  const addItems = (list) => setItems((prev) => [...prev, ...list])

  // アイテムを削除する（合成で親にした装備が消えるとき用）
  const removeItems = (itemIds) => {
    const ids = new Set(itemIds)
    setItems((prev) => prev.filter((it) => !ids.has(it.id)))
  }

  // アイテムを置き換える（合成で+値・スキル/エンチャント枠が書き換わったとき用）
  const updateItem = (nextItem) =>
    setItems((prev) => prev.map((it) => (it.id === nextItem.id ? nextItem : it)))

  return { items, addItem, addItems, removeItems, updateItem }
}
