// 状態異常5種の定義（GDD 5番）
// 「スタック数（効果量）×残りターン（持続）」の2軸管理
// dispellable：解除可能フラグ（将来のボスギミック用に全効果へ最初から持たせる）
// 数値パラメータはすべて実装後調整タグ付き

export const STATUS_EFFECTS = {
  burn: {
    id: 'burn',
    name: '火傷',
    icon: '🔥',
    element: 'fire',
    dispellable: true,
    baseDuration: 3,        // 付与時の基本持続ターン（実装後調整）
    maxStacks: 5,           // スタック上限（実装後調整）
    params: {
      dotRatioPerStack: 0.04,   // 毎ターン最大HP4%×スタックの継続ダメージ（実装後調整）
      healReduction: 0.5,       // 回復量50%減少（実装後調整）
    },
  },
  freeze: {
    id: 'freeze',
    name: '凍結',
    icon: '🧊',
    element: 'water',
    dispellable: true,
    baseDuration: 2,        // 行動不可は強力なので短め（実装後調整）
    maxStacks: 3,
    params: {
      breakBonusPerStack: 0.3,  // 被弾で解除される際の追加ダメージ+30%×スタック（実装後調整）
    },
  },
  shock: {
    id: 'shock',
    name: '感電',
    icon: '⚡',
    element: 'thunder',
    dispellable: true,
    baseDuration: 3,
    maxStacks: 5,
    params: {
      failRatePerStack: 0.15,   // 行動失敗率15%×スタック（実装後調整）
      failRateCap: 0.6,         // 失敗率上限
    },
  },
  confusion: {
    id: 'confusion',
    name: '混乱',
    icon: '💫',
    element: 'earth',
    dispellable: true,
    baseDuration: 3,
    maxStacks: 5,
    params: {
      selfHitRatePerStack: 0.2, // 誤爆率20%×スタック（1対1では自傷として処理）（実装後調整）
      selfHitRateCap: 0.6,
      selfHitPowerRatio: 0.5,   // 誤爆時は自分のATK×0.5のダメージ（実装後調整）
    },
  },
  curse: {
    id: 'curse',
    name: '呪い',
    icon: '💀',
    element: 'dark',
    dispellable: true,
    baseDuration: 3,
    maxStacks: 5,
    params: {
      healBlock: true,          // 回復無効
      // デバフ蓄積：毎ターン、ランダムなステータスにスタック×-3%のデバフ（2ターン）を付与（実装後調整）
      debuffPerTurnPerStack: 3,
      debuffTurns: 2,
      debuffStats: ['atk', 'def', 'spd'],
    },
  },
}

export const STATUS_EFFECT_IDS = Object.keys(STATUS_EFFECTS)

// 状態異常付与率のティア（スキル表・共通ルール）
export const AILMENT_CHANCE_TIERS = {
  low: 0.2,
  mid: 0.35,
  high: 0.5,
}
