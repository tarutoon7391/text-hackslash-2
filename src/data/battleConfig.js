// 戦闘関連の定数（ハードコーディング禁止のため全てここに集約）
// 「実装後調整」タグの数値はプレイアブル後に調整する

export const BATTLE_CONFIG = {
  // 会心
  critMultiplier: 2.0,          // 会心ダメージ倍率（スキルに上書き指定があればそちら優先）

  // 属性一致ボーナス（GDD 9.3）：武器属性とスキル属性が一致した場合
  elementMatchPowerBonus: 0.2,      // 威力+20%（実装後調整）
  elementMatchAilmentBonus: 0.1,    // 状態異常付与率+10%（実装後調整）

  // ダメージ計算：ATK×倍率×相性×一致ボーナス×会心 を DEFで軽減する
  // 軽減式：×(defenseFactor / (defenseFactor + 有効DEF))（実装後調整）
  defenseFactor: 100,

  // ダメージの乱数幅 ±5%（実装後調整）
  damageVariance: 0.05,

  // 基本命中率・回避（実装後調整）
  baseAccuracy: 0.95,

  // バフ/デバフの基本持続ターン（スキルに明記があればそちら優先）
  defaultBuffTurns: 3,

  // スキル+値システム（フェーズ1では全て+0で動作。効果量はTODO：実装後調整の仮式）
  // TODO: +値の効果式は仮置き。威力+3%/+1、MP-2%/+1（小数点以下切り上げ、MP最低1）
  plusValue: {
    powerBonusPerPlus: 0.03,
    mpReductionPerPlus: 0.02,
    minMpCost: 1,
  },

  // 通常攻撃（MP切れ対策のフォールバック行動）
  basicAttack: {
    name: 'たたかう',
    power: 1.0,
    mp: 0,
  },

  // 操作系スキル（強化）の統一ルール（GDD 5番）
  amplify: {
    ailmentStackAdd: 2,   // 状態異常はスタック+2
    debuffTurnAdd: 2,     // デバフは残りターン+2
  },
}
