// 自作ドット絵アイコン（インラインSVG）。文字と同じ高さ（1em）で、文字の流れの中に置ける
// ※このファイルはJSXを使わずcreateElementで書く：src/pixel-jsx の自動差し替えから呼ばれる側なので、
//   ここでJSXを使うと自分自身を経由してしまうため
import { createElement } from 'react'
import { PIXEL_ICONS, PALETTE, ICON_SIZE } from '../../data/pixelIcons.js'

// 絵（文字グリッド）→ 四角形のリスト。同じ色が横に続く部分は1つにまとめる。結果はアイコンごとに使い回す
const rectCache = {}
function getRects(name) {
  if (rectCache[name]) return rectCache[name]
  const rects = []
  PIXEL_ICONS[name].forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      if (ch !== '.') rects.push({ x, y, w: end - x, fill: PALETTE[ch] })
      x = end
    }
  })
  rectCache[name] = rects
  return rects
}

// name：PIXEL_ICONSのキー／emoji：差し替え元の絵文字（テストや読み上げ用にdata属性へ残す）
export default function PixelIcon({ name, emoji = null, size = '1em' }) {
  if (!PIXEL_ICONS[name]) return emoji
  return createElement(
    'svg',
    {
      className: 'pixel-icon',
      viewBox: `0 0 ${ICON_SIZE} ${ICON_SIZE}`,
      width: size,
      height: size,
      shapeRendering: 'crispEdges',
      'aria-hidden': 'true',
      'data-emoji': emoji || undefined,
    },
    getRects(name).map((r, i) =>
      createElement('rect', { key: i, x: r.x, y: r.y, width: r.w, height: 1, fill: r.fill })
    )
  )
}
