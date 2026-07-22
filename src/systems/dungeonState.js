// ダンジョン状態管理（GDD 14番）
// - 現在の階層／到達済みチェックポイント一覧／現在のゾーン属性
// - React state（カスタムフック）で管理。DB永続化はフェーズ3以降（リロードで消えてよい）
// - 純粋関数（floorToZoneElement等）はスモークテストからも使うためフックと分離して定義
import { useState } from 'react'
import { DUNGEON_CONFIG } from '../data/dungeonConfig.js'

// 階層→ゾーン属性（5階ブロックごとに火→水→雷→土→光→闇を巡回、30階で一周し以降も継続）
export function floorToZoneElement(floor) {
  const { blockSize, zoneRotation } = DUNGEON_CONFIG
  const blockIndex = Math.floor((floor - 1) / blockSize)
  return zoneRotation[blockIndex % zoneRotation.length]
}

// ブロック最終階（5階目）＝ボス階
export function isBossFloor(floor) {
  return floor % DUNGEON_CONFIG.blockSize === 0
}

// ブロック内の何階目か（1〜blockSize）
export function floorInBlock(floor) {
  return ((floor - 1) % DUNGEON_CONFIG.blockSize) + 1
}

// ダンジョン状態のカスタムフック
export function useDungeonState() {
  const [currentFloor, setCurrentFloor] = useState(null) // null=ダンジョン外（ロビー）
  const [checkpoints, setCheckpoints] = useState([1]) // 到達済みチェックポイント（1階は固定解放）

  const enterDungeon = (startFloor) => setCurrentFloor(startFloor)
  const advanceFloor = () => setCurrentFloor((f) => (f == null ? null : f + 1))
  const leaveDungeon = () => setCurrentFloor(null)

  // ボス撃破時に次ブロックの先頭階を到達済みとして記録する
  const unlockCheckpoint = (floor) => {
    setCheckpoints((prev) => (prev.includes(floor) ? prev : [...prev, floor].sort((a, b) => a - b)))
  }

  return { currentFloor, checkpoints, enterDungeon, advanceFloor, leaveDungeon, unlockCheckpoint }
}
