// テスト用の敵データ5体（各属性・状態異常耐性のバリエーション）
// ailmentResists：状態異常ごとの耐性（0=耐性なし〜1=完全無効）
// skills：スキルID（skills_normal / skills_elemental を参照）
// 数値は全て実装後調整

export const ENEMIES = {
  goblin: {
    id: 'goblin',
    name: 'ゴブリン',
    icon: '👺',
    element: 'earth',
    stats: { hp: 90, mp: 20, atk: 16, def: 8, spd: 9, crit: 5 },
    ailmentResists: {}, // 耐性なしのベースライン
    skills: ['earth_1_1', 'earth_1_2'],
    description: '耐性なしの基本敵。状態異常のテストに',
  },
  flameLizard: {
    id: 'flameLizard',
    name: 'フレイムリザード',
    icon: '🦎',
    element: 'fire',
    stats: { hp: 110, mp: 30, atk: 20, def: 10, spd: 11, crit: 8 },
    ailmentResists: { burn: 1.0, freeze: 0.5 }, // 火傷完全無効・凍結半減
    skills: ['fire_1_1', 'fire_2_1', 'fire_2_2'],
    description: '火属性。水弱点・土耐性。火傷無効',
  },
  iceGolem: {
    id: 'iceGolem',
    name: 'アイスゴーレム',
    icon: '🗿',
    element: 'water',
    stats: { hp: 150, mp: 25, atk: 18, def: 20, spd: 5, crit: 3 },
    ailmentResists: { freeze: 1.0, confusion: 0.5 }, // 凍結完全無効・混乱半減
    skills: ['water_1_1', 'water_2_1'],
    description: '水属性の重装敵。雷弱点・火耐性。高DEF低SPD',
  },
  thunderBird: {
    id: 'thunderBird',
    name: 'サンダーバード',
    icon: '🦅',
    element: 'thunder',
    stats: { hp: 95, mp: 35, atk: 19, def: 8, spd: 18, crit: 15 },
    ailmentResists: { shock: 0.5 }, // 感電半減
    skills: ['thunder_1_1', 'thunder_2_1', 'thunder_2_2'],
    description: '雷属性の高速敵。土弱点・水耐性。高SPD高会心',
  },
  darkShade: {
    id: 'darkShade',
    name: 'ダークシェイド',
    icon: '👤',
    element: 'dark',
    stats: { hp: 120, mp: 40, atk: 22, def: 12, spd: 12, crit: 10 },
    ailmentResists: { curse: 1.0, burn: 0.3 }, // 呪い完全無効
    skills: ['dark_1_1', 'dark_2_1', 'dark_3_1'],
    description: '闇属性の強敵。光弱点。呪い無効',
  },
}

export const ENEMY_IDS = Object.keys(ENEMIES)
