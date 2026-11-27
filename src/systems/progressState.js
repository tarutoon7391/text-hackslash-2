// 成長の状態管理：職業レベル・経験値／合成素材（欠片）の所持数
// 純関数（必要経験値・経験値加算）はスモークテスト・シミュレーションからも使うためフックと分離
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js'
import { DUNGEON_CONFIG } from '../data/dungeonConfig.js'
import { JOB_IDS } from '../data/jobs.js'
import { usePersistentState } from './saveStorage.js'

// ===== 職業レベル（純関数） =====

// そのレベルから次のレベルまでに必要な経験値
export function expToNextLevel(level) {
  const { expBase, expPow } = PROGRESSION_CONFIG.level
  return Math.round(expBase * Math.pow(level, expPow))
}

// 経験値を加算した結果を返す（{level, exp}。上限レベルでは経験値は貯まらない）
export function applyJobExp({ level, exp }, amount) {
  const max = PROGRESSION_CONFIG.level.max
  let lv = level
  let rest = exp + amount
  while (lv < max && rest >= expToNextLevel(lv)) {
    rest -= expToNextLevel(lv)
    lv++
  }
  if (lv >= max) rest = 0
  return { level: lv, exp: rest }
}

// 敵を倒した時の経験値（階層が深いほど多い）
export function enemyExpFor({ floor, boss }) {
  const { grunt, boss: bossBase, perFloor } = PROGRESSION_CONFIG.enemyExp
  return Math.round((boss ? bossBase : grunt) * (1 + floor * perFloor))
}

// ===== 欠片（純関数） =====

// 階層→欠片のランク（5階ブロックごとに1上がる。1〜5階=1、6〜10階=2…）
export function shardTierForFloor(floor) {
  return Math.ceil(floor / DUNGEON_CONFIG.blockSize)
}

// ===== state =====

const defaultJobLevels = () => Object.fromEntries(JOB_IDS.map((id) => [id, { level: 1, exp: 0 }]))

// 旧セーブ互換：職業が増えていたらLv1で補う／壊れた値は既定値に戻す
function migrateJobLevels(saved) {
  const out = defaultJobLevels()
  for (const id of JOB_IDS) {
    const s = saved?.[id]
    if (s && Number.isFinite(s.level) && Number.isFinite(s.exp)) {
      out[id] = { level: Math.max(1, Math.floor(s.level)), exp: Math.max(0, Math.floor(s.exp)) }
    }
  }
  return out
}

function migrateShards(saved) {
  const out = {}
  for (const [tier, count] of Object.entries(saved || {})) {
    if (Number.isFinite(count) && count > 0) out[tier] = Math.floor(count)
  }
  return out
}

export function useProgressState() {
  const [jobLevels, setJobLevels] = usePersistentState('jobLevels', defaultJobLevels(), migrateJobLevels)
  const [shards, setShards] = usePersistentState('shards', {}, migrateShards) // {ランク: 個数}
  const [books, setBooks] = usePersistentState('skillBooks', {}, migrateShards) // {スキルID: 冊数}（形が欠片と同じなので補正も共用）

  // 経験値を加算する。戻り値は {before, after}（レベルアップ表示用）
  const gainExp = (jobId, amount) => {
    const before = jobLevels[jobId] || { level: 1, exp: 0 }
    const after = applyJobExp(before, amount)
    setJobLevels((prev) => ({ ...prev, [jobId]: applyJobExp(prev[jobId] || { level: 1, exp: 0 }, amount) }))
    return { before, after }
  }

  const addShards = (tier, count) =>
    setShards((prev) => ({ ...prev, [tier]: (prev[tier] || 0) + count }))

  // 欠片を消費する（used = {ランク: 個数}）
  const spendShards = (used) =>
    setShards((prev) => {
      const next = { ...prev }
      for (const [tier, count] of Object.entries(used)) {
        next[tier] = Math.max(0, (next[tier] || 0) - count)
        if (next[tier] === 0) delete next[tier]
      }
      return next
    })

  // スキルの書：{スキルID: 冊数}
  const addBook = (skillId) => setBooks((prev) => ({ ...prev, [skillId]: (prev[skillId] || 0) + 1 }))
  // スキルの書を1冊消費する
  const spendBook = (skillId) =>
    setBooks((prev) => {
      const next = { ...prev }
      next[skillId] = Math.max(0, (next[skillId] || 0) - 1)
      if (next[skillId] === 0) delete next[skillId]
      return next
    })

  return { jobLevels, shards, books, gainExp, addShards, spendShards, addBook, spendBook }
}
