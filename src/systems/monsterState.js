// 仲間モンスターの管理
// - 倒したあと起き上がって仲間になったモンスターを最大10体まで持てる
// - そのうち1体を「連れていく仲間」に選ぶと、戦闘でプレイヤーと一緒に戦う（自動で通常攻撃）
// - 連れていった仲間は経験値をもらってレベルが上がる
// 端末内（localStorage）に自動保存する
import { PROGRESSION_CONFIG } from '../data/progressionConfig.js'
import { usePersistentState } from './saveStorage.js'
import { applyJobExp } from './progressState.js'

export const MONSTER_BOX_MAX = PROGRESSION_CONFIG.monster.maxBox

// 戦闘中の敵（battle.enemy）から、仲間として保存する情報を作る（純関数）
// 戦闘で減ったHPではなく、その敵の本来のステータス（最大HP）を記録する
// 倒した敵が起き上がって仲間になりたそうにするかの判定（戦闘に勝った時に1回だけ呼ぶ）
// ボスは仲間にならない。rng は 0〜1 の乱数関数
export function rollJoin(enemy, rng = Math.random) {
  const { gruntChance, bossChance } = PROGRESSION_CONFIG.join
  const chance = enemy?.enemyDef?.isBoss ? bossChance : gruntChance
  return chance > 0 && rng() < chance
}

export function createMonsterFromEnemy(enemy, { now = Date.now(), rand = Math.random } = {}) {
  const def = enemy.enemyDef || {}
  return {
    id: `mon_${now.toString(36)}_${Math.floor(rand() * 1e9).toString(36)}`,
    name: enemy.name,
    element: enemy.element || null,
    floor: def.floor ?? null,
    isBoss: Boolean(def.isBoss),
    sprite: def.sprite || null,
    // 仲間にした時点のステータス（レベル1の基礎値として使う）
    stats: {
      hp: enemy.stats.maxHp,
      atk: enemy.stats.atk,
      def: enemy.stats.def,
      spd: enemy.stats.spd,
    },
    level: 1,
    exp: 0,
    recruitedAt: now,
  }
}

// 仲間の今のステータス（基礎値×レベル成長）。戦闘に出す時と一覧表示の両方で使う（純関数）
export function calcMonsterStats(monster) {
  const growth = PROGRESSION_CONFIG.monster.growthPerLevel
  const lv = monster.level || 1
  const out = {}
  for (const key of ['hp', 'atk', 'def', 'spd']) {
    out[key] = Math.round((monster.stats[key] || 0) * (1 + (lv - 1) * (growth[key] || 0)))
  }
  out.crit = PROGRESSION_CONFIG.monster.crit
  return out
}

// 戦闘エンジンに渡す仲間データを作る（startHp：探索中の残りHP。nullなら満タン）
export function buildAllyForBattle(monster, startHp = null) {
  return {
    monsterId: monster.id,
    name: monster.name,
    element: monster.element,
    sprite: monster.sprite,
    isBoss: monster.isBoss,
    stats: calcMonsterStats(monster),
    startHp,
  }
}

// 仲間に経験値を加える（レベルの上がり方は職業レベルと同じ式）
export function applyMonsterExp(monster, amount) {
  const next = applyJobExp({ level: monster.level || 1, exp: monster.exp || 0 }, amount)
  return { ...monster, level: next.level, exp: next.exp }
}

// 旧セーブ互換：足りない項目を既定値で補い、壊れたデータは捨てる
export function migrateMonsters(saved) {
  if (!Array.isArray(saved)) return []
  return saved
    .filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string')
    .map((m) => ({
      ...m,
      element: m.element ?? null,
      floor: Number.isFinite(m.floor) ? m.floor : null,
      isBoss: Boolean(m.isBoss),
      sprite: m.sprite ?? null,
      stats: { hp: 0, atk: 0, def: 0, spd: 0, ...(m.stats || {}) },
      level: Number.isFinite(m.level) && m.level >= 1 ? Math.floor(m.level) : 1,
      exp: Number.isFinite(m.exp) && m.exp >= 0 ? Math.floor(m.exp) : 0,
      recruitedAt: Number.isFinite(m.recruitedAt) ? m.recruitedAt : 0,
    }))
}

export function useMonsterState() {
  const [monsters, setMonsters] = usePersistentState('monsters', [], migrateMonsters)
  // 連れていく仲間のID（1体まで。nullなら誰も連れていかない）
  const [partyId, setPartyId] = usePersistentState('partyMonsterId', null, (v) => (typeof v === 'string' ? v : null))

  const isFull = monsters.length >= MONSTER_BOX_MAX
  // 連れていく仲間（一覧から消えていたらnull扱い）
  const partyMonster = monsters.find((m) => m.id === partyId) || null

  // 新しい仲間を先頭に追加する（満員なら追加しない。戻り値で成否を返す）
  const addMonster = (monster) => {
    if (monsters.length >= MONSTER_BOX_MAX) return false
    setMonsters((prev) => (prev.length >= MONSTER_BOX_MAX ? prev : [monster, ...prev]))
    return true
  }
  // 仲間と別れる（一覧から消す。連れていく仲間だったら外す）
  const releaseMonster = (monsterId) => {
    setMonsters((prev) => prev.filter((m) => m.id !== monsterId))
    setPartyId((prev) => (prev === monsterId ? null : prev))
  }
  // 連れていく仲間を選ぶ／外す（同じ仲間をもう一度選ぶと外れる）
  const toggleParty = (monsterId) => setPartyId((prev) => (prev === monsterId ? null : monsterId))
  // 仲間に経験値を入れる。戻り値は {before, after}（レベルアップ表示用）
  const gainExp = (monsterId, amount) => {
    const before = monsters.find((m) => m.id === monsterId)
    if (!before) return null
    const after = applyMonsterExp(before, amount)
    setMonsters((prev) => prev.map((m) => (m.id === monsterId ? applyMonsterExp(m, amount) : m)))
    return { before, after }
  }

  return { monsters, partyId, partyMonster, isFull, addMonster, releaseMonster, toggleParty, gainExp }
}
