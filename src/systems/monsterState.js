// 仲間モンスターの管理（勧誘で仲間にしたモンスターの一覧）
// 現段階は「集めるだけ」：一覧で眺められるが、まだ戦闘には連れていけない
// 端末内（localStorage）に自動保存する
import { usePersistentState } from './saveStorage.js'

// 戦闘中の敵（battle.enemy）から、仲間として保存する情報を作る（純関数）
// 戦闘で減ったHPではなく、その敵の本来のステータス（最大HP）を記録する
export function createMonsterFromEnemy(enemy, { now = Date.now(), rand = Math.random } = {}) {
  const def = enemy.enemyDef || {}
  return {
    id: `mon_${now.toString(36)}_${Math.floor(rand() * 1e9).toString(36)}`,
    name: enemy.name,
    element: enemy.element || null,
    floor: def.floor ?? null,
    isBoss: Boolean(def.isBoss),
    sprite: def.sprite || null,
    stats: {
      hp: enemy.stats.maxHp,
      atk: enemy.stats.atk,
      def: enemy.stats.def,
      spd: enemy.stats.spd,
    },
    recruitedAt: now,
  }
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
      recruitedAt: Number.isFinite(m.recruitedAt) ? m.recruitedAt : 0,
    }))
}

export function useMonsterState() {
  const [monsters, setMonsters] = usePersistentState('monsters', [], migrateMonsters)
  // 新しい仲間を先頭に追加する
  const addMonster = (monster) => setMonsters((prev) => [monster, ...prev])
  // 仲間と別れる（一覧から消す）
  const releaseMonster = (monsterId) => setMonsters((prev) => prev.filter((m) => m.id !== monsterId))
  return { monsters, addMonster, releaseMonster }
}
