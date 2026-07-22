// 状態異常の演出カラー
// スキル属性色分け（colorPalette.js / styles.cssの.elem-*）と完全に同一の値を参照する
// 火傷=赤系／凍結=青系／感電=黄系／混乱=茶系／呪い=紫系
import { ELEMENT_COLORS } from './colorPalette.js'

export const STATUS_EFFECT_COLORS = {
  burn: ELEMENT_COLORS.fire,
  freeze: ELEMENT_COLORS.water,
  shock: ELEMENT_COLORS.thunder,
  confusion: ELEMENT_COLORS.earth,
  curse: ELEMENT_COLORS.dark,
}
