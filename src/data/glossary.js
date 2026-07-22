// 用語グロッサリー（スキルテキスト内の用語強調＋説明ポップアップ用）
// 後から用語を追加しやすいよう、1用語=1エントリのフラットな配列で管理する
// color：テキスト内での強調色（属性・状態異常はcolorPaletteと完全一致させる）
import { ELEMENT_COLORS, CATEGORY_COLORS } from './colorPalette.js'

export const GLOSSARY = [
  // ===== ステータス =====
  { term: 'HP', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: '体力。0になると戦闘不能になる。' },
  { term: 'MP', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: 'スキルの使用に消費するポイント。不足しているスキルは使えない。' },
  { term: 'ATK', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: '攻撃力。与えるダメージの基準になる。' },
  { term: 'DEF', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: '防御力。受けるダメージを軽減する。' },
  { term: 'SPD', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: '素早さ。1ターン内の行動順を決める。' },
  { term: '会心率', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: '会心（ダメージ2.0倍）が発生する確率。' },

  // ===== 属性 =====
  { term: '火', category: '属性', color: ELEMENT_COLORS.fire,
    description: '土に強く、水に弱い属性。状態異常「火傷」と結びつく。' },
  { term: '水', category: '属性', color: ELEMENT_COLORS.water,
    description: '火に強く、雷に弱い属性。状態異常「凍結」と結びつく。' },
  { term: '雷', category: '属性', color: ELEMENT_COLORS.thunder,
    description: '水に強く、土に弱い属性。状態異常「感電」と結びつく。' },
  { term: '土', category: '属性', color: ELEMENT_COLORS.earth,
    description: '雷に強く、火に弱い属性。状態異常「混乱」と結びつく。' },
  { term: '光', category: '属性', color: ELEMENT_COLORS.light,
    description: '闇と互いに弱点を突き合う属性。状態異常の解除・耐性サポートが得意。' },
  { term: '闇', category: '属性', color: ELEMENT_COLORS.dark,
    description: '光と互いに弱点を突き合う属性。状態異常「呪い」と結びつく。' },

  // ===== 状態異常 =====
  { term: '火傷', category: '状態異常', color: ELEMENT_COLORS.fire,
    description: '毎ターン継続ダメージを受け、回復量が減少する。スタック数が多いほど痛い。' },
  { term: '凍結', category: '状態異常', color: ELEMENT_COLORS.water,
    description: '行動できなくなる。攻撃を受けると解除される代わりに追加ダメージが入る。' },
  { term: '感電', category: '状態異常', color: ELEMENT_COLORS.thunder,
    description: '一定確率で行動に失敗する。スタック数が多いほど失敗しやすい。' },
  { term: '混乱', category: '状態異常', color: ELEMENT_COLORS.earth,
    description: '一定確率で誤って自分（味方）を攻撃してしまう。' },
  { term: '呪い', category: '状態異常', color: ELEMENT_COLORS.dark,
    description: '回復が無効になり、毎ターンデバフが蓄積していく。' },

  // ===== 総称 =====
  { term: 'デバフ', category: '総称', color: CATEGORY_COLORS.general,
    description: 'ATK-10%などのステータス低下効果。同じ効果は重ね掛けできず、再使用で上書きされる。' },
  { term: '弱体効果', category: '総称', color: CATEGORY_COLORS.general,
    description: '状態異常とデバフをあわせた総称。参照・解除・強化スキルは両方を対象にする。' },
  { term: '状態異常', category: '総称', color: CATEGORY_COLORS.general,
    description: '火傷・凍結・感電・混乱・呪いの5種。スタック数（効果量）と残りターンの2軸で管理される。' },

  // ===== レア度 =====
  { term: 'コモン', category: 'レア度', color: '#9aa0a8',
    description: '最も基本のレア度。スキル枠1。属性スキルは付かない。' },
  { term: 'レア', category: 'レア度', color: '#4ab5ff',
    description: 'スキル枠2のレア度。属性スキルが付くことがある。' },
  { term: 'エピック', category: 'レア度', color: '#a06bff',
    description: 'スキル枠3のレア度。★3スキルが出ることがある。' },
  { term: 'レジェンダリー', category: 'レア度', color: '#ffb84a',
    description: 'スキル枠4の高レア度。★4スキルが出ることがある。' },
  { term: 'ユニーク', category: 'レア度', color: '#ff4a6b',
    description: '専用スキルを固定で持つ最高レア度。' },

  // ===== 武器種 =====
  { term: '大剣', category: '武器種', color: CATEGORY_COLORS.weapon,
    description: '高ATK・低SPDの重い一撃が特徴の武器種。' },
  { term: '双剣', category: '武器種', color: CATEGORY_COLORS.weapon,
    description: '多段攻撃と手数で攻める武器種。' },
  { term: '魔導書', category: '武器種', color: CATEGORY_COLORS.weapon,
    description: '魔法特化で弱体効果とのシナジーが強い武器種。' },
  { term: '剣', category: '武器種', color: CATEGORY_COLORS.weapon,
    description: 'バランス型の扱いやすい武器種。' },
  { term: '杖', category: '武器種', color: CATEGORY_COLORS.weapon,
    description: '攻撃と支援のハイブリッドな武器種。回復・バフが得意。' },
  { term: '弓', category: '武器種', color: CATEGORY_COLORS.weapon,
    description: '高SPD・高会心が特徴の武器種。' },
]

// termでの参照用マップ
export const GLOSSARY_BY_TERM = Object.fromEntries(GLOSSARY.map((g) => [g.term, g]))
