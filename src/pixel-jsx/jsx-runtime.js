// 独自JSXランタイム：Reactの標準ランタイムに「絵文字→ドット絵アイコン」の差し替えを1枚かぶせたもの
// vite.config.js の jsxImportSource で全コンポーネントに適用される（各画面のコードは書き換え不要）
import { Fragment, jsx as baseJsx, jsxs as baseJsxs } from 'react/jsx-runtime'
import { iconizeProps } from './iconize.js'

export { Fragment }
export const jsx = (type, props, key) => baseJsx(type, iconizeProps(type, props), key)
export const jsxs = (type, props, key) => baseJsxs(type, iconizeProps(type, props), key)
