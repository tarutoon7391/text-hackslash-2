// 装備一覧の絞り込み・並べ替え（純関数＝スモークテスト対象）
// 「上がるステータス」を1つ選ぶと、そのステータスが上がる装備だけに絞り込み、
// その上がり幅で昇順／降順に並べ替える
//
// 上がり幅は2種類ある：
//   固定値（flat）… 装備の基礎ステータス（武器=ATK、防具=DEF/HP、アクセ=HP/MP）
//   割合（pct）  … エンチャントの「◯◯+%」
// 並べ替えは固定値を優先し、同じなら割合で比べる（単位が違うので足し合わせない）

// 絞り込みに使えるステータス一覧（表示順）
export const FILTER_STATS = [
  { key: 'atk', label: 'ATK', enchantId: 'atkPct' },
  { key: 'def', label: 'DEF', enchantId: 'defPct' },
  { key: 'hp', label: 'HP', enchantId: 'hpPct' },
  { key: 'mp', label: 'MP', enchantId: 'mpPct' },
  { key: 'spd', label: 'SPD', enchantId: 'spdPct' },
  { key: 'crit', label: '会心率', enchantId: 'critRatePct' },
]
const STAT_BY_KEY = Object.fromEntries(FILTER_STATS.map((s) => [s.key, s]))

// その装備で指定ステータスがどれだけ上がるか（{flat, pct}）
export function getStatGain(item, statKey) {
  const stat = STAT_BY_KEY[statKey]
  if (!stat) return { flat: 0, pct: 0 }
  const flat = item[statKey] || 0
  const pct = (item.enchants || [])
    .filter((en) => en.enchantId === stat.enchantId)
    .reduce((sum, en) => sum + en.value, 0)
  return { flat, pct }
}

// 上がり幅の表示用テキスト（例：「ATK+12」「HP+7・+5%」）。上がらなければnull
export function formatStatGain(item, statKey) {
  const stat = STAT_BY_KEY[statKey]
  const { flat, pct } = getStatGain(item, statKey)
  if (!stat || (flat <= 0 && pct <= 0)) return null
  const parts = []
  if (flat > 0) parts.push(`+${flat}`)
  if (pct > 0) parts.push(`+${pct}%`)
  return `${stat.label}${parts.join('・')}`
}

// 絞り込み＋並べ替え。statKeyがnullなら何もせず元の並び（入手順）のまま返す
// order: 'desc'（大きい順）| 'asc'（小さい順）
export function filterAndSortItems(items, { statKey = null, order = 'desc' } = {}) {
  if (!statKey || !STAT_BY_KEY[statKey]) return items
  const sign = order === 'asc' ? 1 : -1
  return items
    .map((item, index) => ({ item, index, gain: getStatGain(item, statKey) }))
    .filter(({ gain }) => gain.flat > 0 || gain.pct > 0)
    .sort((a, b) =>
      sign * (a.gain.flat - b.gain.flat) ||
      sign * (a.gain.pct - b.gain.pct) ||
      a.index - b.index // 完全に同じなら入手順を保つ
    )
    .map(({ item }) => item)
}
