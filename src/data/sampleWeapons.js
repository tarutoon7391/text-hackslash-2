// テスト用サンプル武器12本
// GDD 9.2の抽選ルールを再現した生成関数（weaponGenerator）で作る
// シード固定なのでリロードしても同じ武器が並ぶ

import { generateWeapon, createSeededRng } from '../systems/weaponGenerator.js'

// 各武器種×主要レア度で12本。属性は6属性が2回ずつ登場するよう配分
const SAMPLE_SPECS = [
  { weaponType: 'sword',      rarity: 'rare',      element: 'fire',    name: '火のレア剣' },
  { weaponType: 'sword',      rarity: 'legendary', element: 'light',   name: '光のレジェンダリー剣' },
  { weaponType: 'greatsword', rarity: 'rare',      element: 'earth',   name: '土のレア大剣' },
  { weaponType: 'greatsword', rarity: 'epic',      element: 'dark',    name: '闇のエピック大剣' },
  { weaponType: 'staff',      rarity: 'rare',      element: 'water',   name: '水のレア杖' },
  { weaponType: 'staff',      rarity: 'epic',      element: 'light',   name: '光のエピック杖' },
  { weaponType: 'tome',       rarity: 'epic',      element: 'dark',    name: '闇のエピック魔導書' },
  { weaponType: 'tome',       rarity: 'legendary', element: 'thunder', name: '雷のレジェンダリー魔導書' },
  { weaponType: 'bow',        rarity: 'rare',      element: 'thunder', name: '雷のレア弓' },
  { weaponType: 'bow',        rarity: 'epic',      element: 'fire',    name: '火のエピック弓' },
  { weaponType: 'dualblades', rarity: 'epic',      element: 'water',   name: '水のエピック双剣' },
  { weaponType: 'dualblades', rarity: 'legendary', element: 'earth',   name: '土のレジェンダリー双剣' },
]

// シード値は固定（変えるとサンプル武器のスキル構成が変わる）
const rng = createSeededRng(20260722)

export const SAMPLE_WEAPONS = SAMPLE_SPECS.map((spec) => generateWeapon({ ...spec, rng }))
