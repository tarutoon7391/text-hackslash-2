// 初級職5種の定義（GDD 8番）
// パッシブなし。ステータス傾向係数と装備可能武器種で差別化
// 傾向係数：低=0.8／中=1.0／高=1.25（実装後調整）
// baseStats：係数1.0のときの基準値（Lv1想定、実装後調整）
// defaultWeaponType：初回の職業選択時に自動装備される初期武器の武器種（フェーズ3パート3）

import { PROGRESSION_CONFIG } from './progressionConfig.js'

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
    defaultWeaponType: 'sword',
    tendencies: { hp: 'mid', mp: 'low', atk: 'mid', def: 'mid', spd: 'mid', crit: 'mid' },
  },
  mage: {
    id: 'mage',
    name: '魔導士',
    icon: '🔮',
    equipableWeaponTypes: ['staff', 'tome'],
    defaultWeaponType: 'staff',
    tendencies: { hp: 'low', mp: 'high', atk: 'mid', def: 'low', spd: 'low', crit: 'mid' },
  },
  hunter: {
    id: 'hunter',
    name: '狩人',
    icon: '🏹',
    equipableWeaponTypes: ['bow', 'dualblades'],
    defaultWeaponType: 'bow',
    tendencies: { hp: 'mid', mp: 'low', atk: 'mid', def: 'low', spd: 'high', crit: 'high' },
  },
  cleric: {
    id: 'cleric',
    name: '聖職者',
    icon: '🙏',
    equipableWeaponTypes: ['staff', 'sword'],
    defaultWeaponType: 'staff',
    tendencies: { hp: 'mid', mp: 'mid', atk: 'low', def: 'mid', spd: 'mid', crit: 'low' },
  },
  brawler: {
    id: 'brawler',
    name: '闘士',
    icon: '💪',
    equipableWeaponTypes: ['greatsword', 'dualblades'],
    defaultWeaponType: 'greatsword',
    tendencies: { hp: 'high', mp: 'low', atk: 'high', def: 'mid', spd: 'low', crit: 'low' },
  },
}

export const JOB_IDS = Object.keys(JOBS)

// 職業の実ステータスを計算する（基準値×傾向係数×レベル成長）
// レベル成長：Lv1の値 ×(1 + (レベル-1)×成長率)。成長率はprogressionConfig参照
export function calcJobStats(jobId, level = 1) {
  const job = JOBS[jobId]
  const growth = PROGRESSION_CONFIG.level.growthPerLevel
  const stats = {}
  for (const [stat, base] of Object.entries(BASE_STATS)) {
    const lv1 = base * TENDENCY_COEF[job.tendencies[stat]]
    stats[stat] = Math.round(lv1 * (1 + (level - 1) * (growth[stat] || 0)))
  }
  return stats
}
