// 開発サーバー用の独自JSXランタイム（jsx-runtime.jsの開発版。差し替えの中身は同じ）
import { Fragment, jsxDEV as baseJsxDEV } from 'react/jsx-dev-runtime'
import { iconizeProps } from './iconize.js'

export { Fragment }
export const jsxDEV = (type, props, key, isStatic, source, self) =>
  baseJsxDEV(type, iconizeProps(type, props), key, isStatic, source, self)
