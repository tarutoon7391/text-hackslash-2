// 武器種定義（GDD 6番）
// statMods：武器装備時のステータス補正係数（実装後調整）

export const WEAPON_TYPES = {
  sword: {
    id: 'sword',
    name: '剣',
    icon: '🗡️',
    description: 'バランス型',
    statMods: { atk: 1.0, spd: 1.0, crit: 1.0 },
  },
  greatsword: {
    id: 'greatsword',
    name: '大剣',
    icon: '⚔️',
    description: '高ATK・低SPD、重い一撃',
    statMods: { atk: 1.25, spd: 0.8, crit: 1.0 },
  },
  staff: {
    id: 'staff',
    name: '杖',
    icon: '🪄',
    description: '攻撃＋支援ハイブリッド',
    statMods: { atk: 0.9, spd: 1.0, crit: 1.0 },
  },
  tome: {
    id: 'tome',
    name: '魔導書',
    icon: '📖',
    description: '魔法特化、弱体効果シナジー',
    statMods: { atk: 1.05, spd: 0.95, crit: 1.0 },
  },
  bow: {
    id: 'bow',
    name: '弓',
    icon: '🏹',
    description: '高SPD・高会心',
    statMods: { atk: 0.95, spd: 1.15, crit: 1.3 },
  },
  dualblades: {
    id: 'dualblades',
    name: '双剣',
    icon: '⚡',
    description: '多段攻撃・手数',
    statMods: { atk: 0.9, spd: 1.1, crit: 1.1 },
  },
}

export const WEAPON_TYPE_IDS = Object.keys(WEAPON_TYPES)
