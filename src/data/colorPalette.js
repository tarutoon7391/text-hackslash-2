// 共通カラーパレット（属性色の単一ソース）
// ※styles.css の .elem-* クラスと完全に同一の値。変更する場合は両方を必ず更新すること
export const ELEMENT_COLORS = {
  fire: '#ff5a4a',    // 火=赤系
  water: '#4ab5ff',   // 水=青系
  thunder: '#ffd94a', // 雷=黄系
  earth: '#c98f4a',   // 土=茶系
  light: '#ffe9a0',   // 光=金系
  dark: '#a06bff',    // 闇=紫系
  none: '#8a90a0',    // 無属性=グレー
}

// 用語カテゴリ用の汎用色（グロッサリーの色付けに使用）
export const CATEGORY_COLORS = {
  stat: '#8ecbff',    // ステータス系
  general: '#e8a0d0', // 総称（デバフ・弱体効果など）
  weapon: '#c8cbe0',  // 武器種
}
