// 端末内セーブ（localStorage）
// useStateと同じ使い勝手で、値が変わるたびに自動保存し、次回起動時に読み戻す
// - サーバー・DBは使わない。同じ端末・同じブラウザでのみ続きから遊べる
// - 旧バージョンのセーブを読んだ時のために、migrate関数で「足りない項目を既定値で補う」ことができる
// - localStorageが無い環境（Nodeでのテスト・SSR）では保存せず、普通のuseStateとして動く
import { useEffect, useState } from 'react'

const PREFIX = 'th2-save-v1:'

function hasStorage() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

function load(name, initial, migrate) {
  if (!hasStorage()) return initial
  try {
    const raw = localStorage.getItem(PREFIX + name)
    if (raw == null) return initial
    const parsed = JSON.parse(raw)
    return migrate ? migrate(parsed) : parsed
  } catch {
    return initial // 壊れたセーブは無視して初期値で始める
  }
}

export function usePersistentState(name, initial, migrate = null) {
  const [value, setValue] = useState(() => load(name, initial, migrate))
  useEffect(() => {
    if (!hasStorage()) return
    try {
      localStorage.setItem(PREFIX + name, JSON.stringify(value))
    } catch {
      // 容量超過などで保存できなくてもゲームは止めない
    }
  }, [name, value])
  return [value, setValue]
}

// セーブを全消去する（「データを消して最初から」用）
export function clearAllSaves() {
  if (!hasStorage()) return
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  }
}
