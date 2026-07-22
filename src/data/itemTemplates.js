// 装備テンプレートとエンチャント定義（GDD 10番・12番）
// 武器はweaponTypes.jsの6種を使用。防具・アクセサリーはここでシンプルに定義する
// 「TODO」付きの数値はすべて仮値（実装後調整）

// ===== 防具・アクセサリーのベーステンプレート =====
// レア度ごとの基礎ステータスレンジ（TODO: 仮値。武器のbaseAtkRange（rarities.js）と同様に実装後調整）
export const ARMOR_TEMPLATE = {
  name: '鎧',
  icon: '🛡️',
  defRange: { common: [2, 4], rare: [4, 7], epic: [7, 11], legendary: [11, 16], unique: [16, 22] },
  hpRange: { common: [5, 10], rare: [10, 18], epic: [18, 28], legendary: [28, 42], unique: [42, 60] },
}

export const ACCESSORY_TEMPLATE = {
  names: ['指輪', 'お守り'],
  icon: '💍',
  hpRange: { common: [3, 6], rare: [6, 10], epic: [10, 16], legendary: [16, 24], unique: [24, 34] },
  mpRange: { common: [2, 4], rare: [4, 7], epic: [7, 11], legendary: [11, 16], unique: [16, 22] },
}

// ===== エンチャント12種（GDD 10.1） =====
// kind: 'unlimited'=青天井組（際限なく伸びる）／'capped'=渋カーブ組（100%上限の有限ステータス）
// category: 部位別出現重みの分類（GDD 10.4）attack=攻撃系／survival=生存系／special=特殊系
export const ENCHANTS = [
  // 青天井組（7種）
  { id: 'atkPct', name: 'ATK+%', kind: 'unlimited', category: 'attack' },
  { id: 'skillPowerPct', name: 'スキル威力+%', kind: 'unlimited', category: 'attack' },
  { id: 'critDamagePct', name: '会心ダメージ+%', kind: 'unlimited', category: 'attack' },
  { id: 'hpPct', name: 'HP+%', kind: 'unlimited', category: 'survival' },
  { id: 'mpPct', name: 'MP+%', kind: 'unlimited', category: 'special' },
  { id: 'defPct', name: 'DEF+%', kind: 'unlimited', category: 'survival' },
  { id: 'spdPct', name: 'SPD+%', kind: 'unlimited', category: 'special' },
  // 渋カーブ組（5種）
  { id: 'critRatePct', name: '会心率+%', kind: 'capped', category: 'attack' },
  { id: 'ailmentChancePct', name: '状態異常付与率+%', kind: 'capped', category: 'attack' },
  { id: 'evasionPct', name: '回避+%', kind: 'capped', category: 'special' },
  { id: 'damageCutPct', name: '被ダメージ軽減%', kind: 'capped', category: 'survival' },
  { id: 'weakEffectResistPct', name: '弱体効果耐性+%', kind: 'capped', category: 'survival' },
]

export const ENCHANTS_BY_ID = Object.fromEntries(ENCHANTS.map((e) => [e.id, e]))

// ===== エンチャント付与ルール（GDD 10.2〜10.4） =====
export const ENCHANT_RULES = {
  // 枠数：コモン0／レア1／エピック2／レジェンダリー3／ユニーク=固有効果+1〜2（TODO: ユニークは仮で2枠）
  slotsByRarity: { common: 0, rare: 1, epic: 2, legendary: 3, unique: 2 },
  // 各枠50%で充填、保証なし（エンチャント0個の装備もあり得る）
  fillChance: 0.5,
  // TODO: 数値レンジは「ドロップした深度で決まるレンジ」だが対応表は実装後調整。
  // 暫定：固定レンジ（青天井=+3〜8%、渋カーブ=+1〜3%）×階層スケール
  valueRanges: { unlimited: [3, 8], capped: [1, 3] },
  floorScale: 0.02, // TODO: 仮係数。値 = レンジ内乱数 × (1 + 階層×0.02)
  // 部位別の出現重み（GDD 10.4）
  categoryWeightsBySlot: {
    weapon: { attack: 2.0, survival: 0.5, special: 1.0 },
    armor: { attack: 0.3, survival: 2.0, special: 1.0 },
    accessory: { attack: 1.0, survival: 1.0, special: 1.0 },
  },
}
