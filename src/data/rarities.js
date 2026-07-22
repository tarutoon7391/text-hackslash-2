// レア度定義と武器ドロップ時のスキル抽選ルール（GDD 9.2）
// この表はフェーズ2のドロップシステムでもそのまま使う

export const RARITIES = {
  common: {
    id: 'common',
    name: 'コモン',
    color: '#9aa0a8',
    skillSlots: 1,
    // ★の出現率（合計1.0）
    starWeights: { 1: 1.0, 2: 0, 3: 0, 4: 0 },
    allowElementalSkills: false,  // コモンには属性スキルが付かない
    baseAtkRange: [8, 12],        // 武器基礎ATKレンジ（実装後調整）
  },
  rare: {
    id: 'rare',
    name: 'レア',
    color: '#4ab5ff',
    skillSlots: 2,
    starWeights: { 1: 0.8, 2: 0.2, 3: 0, 4: 0 },
    allowElementalSkills: true,
    baseAtkRange: [12, 18],
  },
  epic: {
    id: 'epic',
    name: 'エピック',
    color: '#a06bff',
    skillSlots: 3,
    starWeights: { 1: 0.6, 2: 0.3, 3: 0.1, 4: 0 },
    allowElementalSkills: true,
    baseAtkRange: [18, 26],
  },
  legendary: {
    id: 'legendary',
    name: 'レジェンダリー',
    color: '#ffb84a',
    skillSlots: 4,
    starWeights: { 1: 0.25, 2: 0.5, 3: 0.15, 4: 0.1 },
    allowElementalSkills: true,
    baseAtkRange: [26, 36],
  },
  // ユニーク：専用スキル固定。フェーズ1では未使用（ドロップ・ユニーク装備はフェーズ2以降）
  unique: {
    id: 'unique',
    name: 'ユニーク',
    color: '#ff4a6b',
    skillSlots: 0,
    starWeights: {},
    allowElementalSkills: false,
    baseAtkRange: [36, 48],
    fixedSkills: true,
  },
}

// スキル抽選の共通ルール（GDD 9.2）
export const SKILL_ROLL_RULES = {
  slotFillChance: 0.5,        // 各枠50%で充填
  guaranteeFirstSlot: true,   // 全枠空振り時は1枠目に1個保証
  normalVsElemental: 0.7,     // 無属性7:属性3（属性スキル許可レア度のみ）
}
