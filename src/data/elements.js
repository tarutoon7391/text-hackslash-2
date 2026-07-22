// 属性定義と相性表（GDD 4番）
// 火 → 土 → 雷 → 水 → 火 の1.5倍サイクル、光⇔闇は相互1.5倍
// 弱点×1.5／耐性×0.5／通常×1.0

export const ELEMENTS = {
  fire:    { id: 'fire',    name: '火', icon: '🔥', color: '#ff6b4a' },
  water:   { id: 'water',   name: '水', icon: '💧', color: '#4ab5ff' },
  thunder: { id: 'thunder', name: '雷', icon: '⚡', color: '#ffd94a' },
  earth:   { id: 'earth',   name: '土', icon: '⛰️', color: '#c98f4a' },
  light:   { id: 'light',   name: '光', icon: '✨', color: '#fff3b0' },
  dark:    { id: 'dark',    name: '闇', icon: '🌑', color: '#a06bff' },
}

export const ELEMENT_IDS = Object.keys(ELEMENTS)

// 弱点サイクル：攻撃側 → 防御側 が1.5倍になる組み合わせ
const ADVANTAGE = [
  ['fire', 'earth'],
  ['earth', 'thunder'],
  ['thunder', 'water'],
  ['water', 'fire'],
  ['light', 'dark'],
  ['dark', 'light'],
]

export const WEAKNESS_MULT = 1.5
export const RESIST_MULT = 0.5
export const NEUTRAL_MULT = 1.0

// 相性倍率を返す（attacker/defenderはelement id。無属性はnull）
export function getElementMultiplier(attackerElement, defenderElement) {
  if (!attackerElement || !defenderElement) return NEUTRAL_MULT
  // 弱点を突いた
  if (ADVANTAGE.some(([a, d]) => a === attackerElement && d === defenderElement)) {
    return WEAKNESS_MULT
  }
  // 弱点サイクルの逆方向は耐性（例：土→火は0.5倍）
  // ※光⇔闇は両方向とも弱点なので耐性にはならない
  if (ADVANTAGE.some(([a, d]) => a === defenderElement && d === attackerElement)) {
    return RESIST_MULT
  }
  return NEUTRAL_MULT
}
