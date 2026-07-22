// 初級職5種の定義（GDD 8番）
// パッシブなし。ステータス傾向係数と装備可能武器種で差別化
// 傾向係数：低=0.8／中=1.0／高=1.25（実装後調整）
// baseStats：係数1.0のときの基準値（Lv1想定、実装後調整）

export const BASE_STATS = {
  hp: 100,
  mp: 40,
  atk: 20,
  def: 12,
  spd: 10,
  crit: 10, // 会心率%
}

// 傾向→係数の対応（実装後調整）
export const TENDENCY_COEF = {
  low: 0.8,
  mid: 1.0,
  high: 1.25,
}

export const JOBS = {
  swordsman: {
    id: 'swordsman',
    name: '剣士',
    icon: '🗡️',
    equipableWeaponTypes: ['sword', 'greatsword'],
    tendencies: { hp: 'mid', mp: 'low', atk: 'mid', def: 'mid', spd: 'mid', crit: 'mid' },
  },
  mage: {
    id: 'mage',
    name: '魔導士',
    icon: '🔮',
    equipableWeaponTypes: ['staff', 'tome'],
    tendencies: { hp: 'low', mp: 'high', atk: 'mid', def: 'low', spd: 'low', crit: 'mid' },
  },
  hunter: {
    id: 'hunter',
    name: '狩人',
    icon: '🏹',
    equipableWeaponTypes: ['bow', 'dualblades'],
    tendencies: { hp: 'mid', mp: 'low', atk: 'mid', def: 'low', spd: 'high', crit: 'high' },
  },
  cleric: {
    id: 'cleric',
    name: '聖職者',
    icon: '✨',
    equipableWeaponTypes: ['staff', 'sword'],
    tendencies: { hp: 'mid', mp: 'mid', atk: 'low', def: 'mid', spd: 'mid', crit: 'low' },
  },
  brawler: {
    id: 'brawler',
    name: '闘士',
    icon: '💪',
    equipableWeaponTypes: ['greatsword', 'dualblades'],
    tendencies: { hp: 'high', mp: 'low', atk: 'high', def: 'mid', spd: 'low', crit: 'low' },
  },
}

export const JOB_IDS = Object.keys(JOBS)

// 職業の実ステータスを計算する（基準値×傾向係数）
export function calcJobStats(jobId) {
  const job = JOBS[jobId]
  const stats = {}
  for (const [stat, base] of Object.entries(BASE_STATS)) {
    stats[stat] = Math.round(base * TENDENCY_COEF[job.tendencies[stat]])
  }
  return stats
}
