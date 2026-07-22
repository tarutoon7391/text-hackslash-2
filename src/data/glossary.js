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
  // ※属性名はテキスト内で色付けせず、タップのみ可能（glossaryText.jsのplainCategories）
  { term: '火', category: '属性', color: ELEMENT_COLORS.fire,
    description: '状態異常「火傷」と結びつく属性。土属性に1.5倍のダメージを与え、水属性から1.5倍のダメージを受ける。' },
  { term: '水', category: '属性', color: ELEMENT_COLORS.water,
    description: '状態異常「凍結」と結びつく属性。火属性に1.5倍のダメージを与え、雷属性から1.5倍のダメージを受ける。' },
  { term: '雷', category: '属性', color: ELEMENT_COLORS.thunder,
    description: '状態異常「感電」と結びつく属性。水属性に1.5倍のダメージを与え、土属性から1.5倍のダメージを受ける。' },
  { term: '土', category: '属性', color: ELEMENT_COLORS.earth,
    description: '状態異常「混乱」と結びつく属性。雷属性に1.5倍のダメージを与え、火属性から1.5倍のダメージを受ける。' },
  { term: '光', category: '属性', color: ELEMENT_COLORS.light,
    description: '状態異常の解除・耐性サポートが得意な属性。闇属性との間でお互いに1.5倍のダメージを与え合う。' },
  { term: '闇', category: '属性', color: ELEMENT_COLORS.dark,
    description: '状態異常「呪い」と結びつく属性。光属性との間でお互いに1.5倍のダメージを与え合う。' },
  { term: '無属性', category: '属性', color: ELEMENT_COLORS.none,
    description: 'いずれの属性にも該当しないこと。属性相性によるダメージ倍率・軽減の対象にならない。' },

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

  // ===== 戦闘用語 =====
  { term: '被弾直後', category: '戦闘用語', color: CATEGORY_COLORS.battle,
    description: 'スキルの効果条件の一つ。直前のターンで自分が攻撃を受けていた場合に、追加効果や威力上昇が発生する。' },
  { term: '会心', category: '戦闘用語', color: CATEGORY_COLORS.battle,
    description: '攻撃が「会心（クリティカル）」になると、通常よりダメージが大きくなる。会心率の判定に成功すると発生する。' },
  { term: '命中率', category: '戦闘用語', color: CATEGORY_COLORS.battle,
    description: '攻撃やスキルが対象に当たる確率のこと。必中効果を持つスキルはこの判定を無視して必ず命中する。' },
  { term: '被ダメ', category: '戦闘用語', color: CATEGORY_COLORS.battle,
    description: '「被ダメージ」の略。攻撃や状態異常によって受けるダメージのこと。' },
  { term: 'スタック', category: '戦闘用語', color: CATEGORY_COLORS.battle,
    description: '状態異常の「効果の強さ」を表す数値。状態異常は「スタック数（強さ）×残りターン（持続時間）」の2軸で管理されており、スタックが多いほど1回あたりの効果が強くなる。スタックとターンは別々に管理される。' },
  { term: '確定先制', category: '戦闘用語', color: CATEGORY_COLORS.battle,
    description: 'このスキルを使うと、通常のSPD（素早さ）による行動順判定を無視して、必ず自分が先に行動できる効果。' },

  // ===== 総称 =====
  { term: '回避', category: 'ステータス', color: CATEGORY_COLORS.stat,
    description: '攻撃を受けた際に被弾を無効化できる確率のこと。回避+のエンチャントやバフで数値を上げられる。' },
  { term: 'バフ', category: '総称', color: CATEGORY_COLORS.general,
    description: 'ATK・DEF・SPD・会心率などのステータスを一時的に上昇させる効果の総称。デバフの逆。' },
  { term: '攻撃バフ', category: '総称', color: CATEGORY_COLORS.general,
    description: 'ATK（攻撃力）を一時的に上昇させるバフの一種。' },
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
