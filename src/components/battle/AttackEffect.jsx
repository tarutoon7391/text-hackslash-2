// 攻撃演出：敵のドット絵の上に重ねて、コマ送りで再生する
// 再生が終わったら onDone を呼ぶ（呼び出し側が一覧から外す）
import { useEffect, useState } from 'react'
import { FX_GRID, FX_FRAME_MS, getEffectFrames } from '../../data/attackEffects.js'

// 16進カラーを暗くする（残像用）
function darken(hex, t = 0.55) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * (1 - t)))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// kind：演出の種類／color：その攻撃の色（属性色など）／delay：再生開始までの待ち（連続ヒットをずらす用）
export default function AttackEffect({ kind, color = '#e8ecf4', delay = 0, onDone }) {
  const frames = getEffectFrames(kind)
  const [index, setIndex] = useState(-1) // -1＝まだ始まっていない
  useEffect(() => {
    let i = -1
    let timer = null
    const tick = () => {
      i++
      if (i >= frames.length) {
        if (onDone) onDone()
        return
      }
      setIndex(i)
      timer = setTimeout(tick, FX_FRAME_MS)
    }
    timer = setTimeout(tick, delay)
    return () => clearTimeout(timer)
    // 1回の攻撃につき1回だけ再生する（途中でpropsは変わらない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (index < 0 || index >= frames.length) return null
  const palette = { w: '#ffffff', c: color, d: darken(color), y: '#ffdd00' }
  return (
    <svg className="attack-fx" viewBox={`0 0 ${FX_GRID} ${FX_GRID}`} shapeRendering="crispEdges" aria-hidden="true">
      {frames[index].map((px) => (
        <rect key={`${px.x},${px.y}`} x={px.x} y={px.y} width={1} height={1} fill={palette[px.color]} />
      ))}
    </svg>
  )
}
