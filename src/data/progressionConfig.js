// 成長まわりの定数（職業レベル・装備の+値・合成素材・経験値）
// ハードコーディング禁止のため数値はすべてここに集約する。全て仮値（実装後調整）

export const PROGRESSION_CONFIG = {
  // ===== 職業レベル =====
  level: {
    max: 99,
    // 次のレベルまでの必要経験値：round(base × レベル^pow)
    expBase: 20,
    expPow: 1.5,
    // レベル1ごとのステータス成長率（Lv1の値に対する割合。会心率は成長しない）
    growthPerLevel: { hp: 0.08, mp: 0.05, atk: 0.06, def: 0.06, spd: 0.02, crit: 0 },
  },

  // ===== 敵を倒した時の経験値：round(base × (1 + 階層×perFloor)) =====
  enemyExp: {
    grunt: 12,
    boss: 60,
    perFloor: 0.15,
  },

  // ===== 装備の+値（合成で上がる） =====
  plus: {
    max: 99,
    // +1ごとに装備の基礎ステータス（ATK/DEF/HP/MP）が何割増えるか
    effectPerPlus: 0.1,
    // +n → +(n+1) に必要な合成経験値：round(base × (n+1)^pow)（上がるほど重くなる）
    expBase: 12,
    expPow: 1.6,
  },

  // ===== 仲間にする（戦闘中の勧誘） =====
  // 成功率 = baseChance + (maxChance - baseChance) × (敵の減ったHPの割合)
  // 敵のHPを減らすほど成功しやすい。ボスは勧誘できない（bossChance）
  recruit: {
    baseChance: 0.05,
    maxChance: 0.6,
    bossChance: 0,
  },

  // ===== 仲間モンスター =====
  monster: {
    maxBox: 10,   // 持てる仲間の上限
    partySize: 1, // 一緒に戦える仲間の数
    // レベル1ごとのステータス成長率（仲間にした時の値に対する割合）。必要経験値は職業レベルと同じ式
    growthPerLevel: { hp: 0.08, atk: 0.08, def: 0.06, spd: 0.02 },
    crit: 5,      // 仲間の会心率（固定）
    // 敵が単体攻撃をする時、（仲間が生きていれば）仲間のほうを狙う確率
    enemyTargetsAllyRate: 0.4,
  },

  // ===== 合成素材 =====
  material: {
    // 欠片：5階ブロックごとにランクが上がる。1個あたりの合成経験値 = shardExpBase × ランク
    shardName: '強化の欠片',
    shardExpBase: 8,
    // 装備を素材にした時の合成経験値：レア度の基礎値 ×(1 + 産出階×floorBonus)
    equipExpByRarity: { common: 10, rare: 25, epic: 60, legendary: 150, unique: 300 },
    floorBonus: 0.1,
    // 素材にした装備がそれまでに貯めていた合成経験値のうち、引き継がれる割合
    investedRefundRate: 0.8,
  },
}
