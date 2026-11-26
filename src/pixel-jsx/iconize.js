// 文字列の中の絵文字を、自作ドット絵アイコンに差し替える
// 画面のどこに出る文字でも（ボタン・ログ・装備名・データファイル由来の文字列…）同じ規則で差し替わる
import { createElement } from 'react'
import { EMOJI_TO_ICON } from '../data/pixelIcons.js'
import PixelIcon from '../components/common/PixelIcon.jsx'

// 対応する絵文字のどれか（直後の異体字セレクタU+FE0Fも一緒に飲み込む）
const PATTERN = new RegExp(`(${Object.keys(EMOJI_TO_ICON).join('|')})\\uFE0F?`, 'gu')

// 文字列 → 絵文字が無ければそのまま返す。あれば「文字列とアイコンの配列」を返す
export function iconizeText(text) {
  if (typeof text !== 'string' || text.length === 0) return text
  PATTERN.lastIndex = 0
  if (!PATTERN.test(text)) return text
  PATTERN.lastIndex = 0
  const parts = []
  let last = 0
  let m
  while ((m = PATTERN.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(createElement(PixelIcon, { key: `i${m.index}`, name: EMOJI_TO_ICON[m[1]], emoji: m[1] }))
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// JSXの children（文字列／配列／要素）を走査して、文字列だけ差し替える
export function iconizeChildren(children) {
  if (typeof children === 'string') return iconizeText(children)
  if (Array.isArray(children)) {
    let changed = false
    const next = children.map((child) => {
      if (typeof child !== 'string') return child
      const out = iconizeText(child)
      if (out !== child) changed = true
      return out
    })
    return changed ? next : children
  }
  return children
}

// 差し替えの対象外にするタグ（中身が純粋な文字列でないと困るもの）
const SKIP_TAGS = new Set(['title', 'option', 'textarea', 'script', 'style', 'text', 'tspan'])

// HTMLタグ（div・span・button…）のpropsを受け取り、childrenの絵文字を差し替えたpropsを返す
export function iconizeProps(type, props) {
  if (typeof type !== 'string' || SKIP_TAGS.has(type) || !props || props.children == null) return props
  const next = iconizeChildren(props.children)
  return next === props.children ? props : { ...props, children: next }
}
