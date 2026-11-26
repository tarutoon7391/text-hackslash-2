// ドット絵スプライト：文字グリッドをSVGの四角形で描く（画像ファイル不要・拡大してもくっきり）
import { ELEMENT_COLORS } from '../../data/colorPalette.js'
import { ENEMY_SPRITES, SPRITE_SIZE, buildSpritePalette, resolveSpriteKey } from '../../data/enemySprites.js'

export default function PixelSprite({ enemyDef, element, size = 128 }) {
  const rows = ENEMY_SPRITES[resolveSpriteKey(enemyDef)]
  const palette = buildSpritePalette(ELEMENT_COLORS[element] || ELEMENT_COLORS.none)
  const rects = []
  rows.forEach((row, y) => {
    // 同じ色が横に続く部分は1つの四角形にまとめる
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      if (ch !== '.') {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={end - x} height={1} fill={palette[ch]} />)
      }
      x = end
    }
  })
  return (
    <svg
      className="pixel-sprite"
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects}
    </svg>
  )
}
