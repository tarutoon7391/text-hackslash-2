// ダンジョン関連の定数（GDD 14番）
// ハードコーディング禁止のため、階層・敵・ドロップの数値はすべてここに集約する
// 「TODO」付きの数値はすべて仮値（実装後調整）

export const DUNGEON_CONFIG = {
  // チェックポイント制：5階ごとのブロック（1・6・11…がチェックポイント）
  blockSize: 5,

  // 属性ゾーンテーマ：5階ブロックごとに6属性を巡回（30階で一周し以降も継続）
  zoneRotation: ['fire', 'water', 'thunder', 'earth', 'light', 'dark'],

  // 敵のベースステータスと階層成長（実装後調整）
  // 階層倍率の式：ベース×(1 + 階層×growthPerFloor)
  // 2026-11 通しプレイのシミュレーション（剣士40人・初期装備から）で調整。
  // 前提：HPは階をまたいで持ち越し（ロビーに戻ると全回復）。雑魚4戦ぶんの消耗を抱えてボスに挑む形になるので、
  //   持ち越しなしの頃より雑魚・ボスとも弱めにしてある
  // 目安：5階ボスは3回目の挑戦あたり（通算15戦前後・Lv4・武器+3）、以降のボスは2〜4回の挑戦で越えられる
  enemy: {
    grunt: {
      base: { hp: 60, mp: 0, atk: 7, def: 6, spd: 8, crit: 5 },
      growthPerFloor: 0.07,
    },
    boss: {
      base: { hp: 100, mp: 0, atk: 11, def: 10, spd: 10, crit: 8 },
      growthPerFloor: 0.11,
    },
  },

  // 敵の見た目（ゾーン属性ごと）
  enemyIcons: {
    grunt: { fire: '🦊', water: '🐟', thunder: '🦅', earth: '🐗', light: '🦄', dark: '🦇' },
    boss: { fire: '🐲', water: '🐙', thunder: '🦖', earth: '🗿', light: '👼', dark: '😈' },
  },

  // ドロップのレア度抽選（GDD 12番。TODO: 確率は仮値・実装後調整）
  // 雑魚=コモン〜レア中心・低確率エピック／ボス=エピック〜レジェンダリー確定・極低確率ユニーク
  dropRates: {
    grunt: { common: 0.55, rare: 0.35, epic: 0.1, legendary: 0, unique: 0 },
    boss: { common: 0, rare: 0, epic: 0.65, legendary: 0.32, unique: 0.03 },
  },

  // 勝利時に何が落ちるか（TODO: 仮値・実装後調整）
  // equipChance：装備が落ちる確率／shards：欠片の個数レンジ（必ず落ちる）
  // 雑魚は素材メイン（装備はたまに）、ボスは装備確定
  // bookChance：スキルの書が落ちる確率（装備より低め。ボスでも確定では落ちない）
  drops: {
    grunt: { equipChance: 0.15, bookChance: 0.06, shards: [2, 3] },
    boss: { equipChance: 1, bookChance: 0.12, shards: [6, 8] },
  },

  // ドロップ部位の重み（TODO: 仮値）
  slotWeights: { weapon: 0.5, armor: 0.3, accessory: 0.2 },

  // 装備属性の抽選重み：ゾーン属性が出やすい（他属性は1。TODO: 仮値）
  zoneElementWeight: 4,
}
