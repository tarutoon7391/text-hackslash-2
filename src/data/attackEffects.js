// 攻撃演出（敵のドット絵の上に重ねる、コマ送りのドット絵アニメーション）
// 24x24マスのドットを、1コマずつ切り替えて動かす。絵は1コマずつ手で持たず、
// 「どのコマでどのマスを何色で塗るか」を関数で作っている（種類を増やしやすく、コマ数も変えやすい）
//
// 色のキー：w＝白（芯）／c＝その攻撃の色（属性色や刃の色）／d＝cを暗くした色（残像）／y＝黄（火花・炎の中心）
// 演出を足す時：下のEFFECTSに「コマの配列を返す関数」を1つ足し、resolveEffectKindで出し分けを書く

export const FX_GRID = 24      // 1辺のマス数
export const FX_FRAME_MS = 60  // 1コマの表示時間（ミリ秒）

// ---- 描画の部品（1コマ＝Map「x,y」→色キー） ----
function newFrame() { return new Map() }
function plot(frame, x, y, color) {
  const px = Math.round(x), py = Math.round(y)
  if (px < 0 || py < 0 || px >= FX_GRID || py >= FX_GRID) return
  frame.set(`${px},${py}`, color)
}
function line(frame, x0, y0, x1, y1, color, thick = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps
    const y = y0 + ((y1 - y0) * i) / steps
    for (let t = 0; t < thick; t++) plot(frame, x + t, y, color)
  }
}
function ring(frame, cx, cy, r, color, gap = 1) {
  const n = Math.max(8, Math.round(r * 7))
  for (let i = 0; i < n; i += gap) {
    const a = (Math.PI * 2 * i) / n
    plot(frame, cx + Math.cos(a) * r, cy + Math.sin(a) * r, color)
  }
}
function burst(frame, cx, cy, r0, r1, rays, color, offset = 0) {
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays + offset
    line(frame, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, color)
  }
}
// 2次ベジェ曲線の一部（t0〜t1）を描く。斬撃の弧に使う
function arc(frame, p0, p1, p2, t0, t1, color, thick = 1) {
  const pt = (t) => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
  ]
  const n = 40
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n
    const [x, y] = pt(t)
    for (let k = 0; k < thick; k++) { plot(frame, x + k, y, color); plot(frame, x, y + k, color) }
  }
}
// 毎回同じ並びになる疑似乱数（演出の形を固定するため）
function seeded(seed) {
  let s = seed
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
}
const toFrames = (frames) => frames.map((f) => [...f.entries()].map(([key, color]) => {
  const [x, y] = key.split(',').map(Number)
  return { x, y, color }
}))

// ---- 斬撃1本を「進んでいくコマ」に分けて描く共通処理 ----
function slashInto(frame, p0, p1, p2, progress, thick) {
  // progress 0〜1：刃先の位置。刃先は白く太く、通った跡は色つき→暗い色で残る
  const head = Math.min(1, progress)
  const tail = Math.max(0, progress - 0.55)
  if (progress <= 1.3) {
    arc(frame, p0, p1, p2, Math.max(0, tail - 0.25), tail, 'd', 1)
    arc(frame, p0, p1, p2, tail, head, 'c', thick)
    arc(frame, p0, p1, p2, Math.max(tail, head - 0.3), head, 'w', thick)
  } else {
    arc(frame, p0, p1, p2, 0.15, 0.85, 'd', 1) // 最後に細い残像だけ残す
  }
}

// ---- 演出の定義（コマの配列を返す） ----
export const EFFECTS = {
  // 剣：右上から左下へ弧を描いて斬る
  slash() {
    const frames = []
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      slashInto(fr, [21, 2], [17, 17], [2, 21], (f + 1) / 4, 2)
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 大剣：真上から叩き割り、地面で衝撃が広がる
  heavySlash() {
    const frames = []
    for (let f = 0; f < 7; f++) {
      const fr = newFrame()
      const bottom = Math.min(20, 4 + f * 6)
      if (f < 4) {
        for (let x = 10; x <= 13; x++) line(fr, x, Math.max(0, bottom - 12), x, bottom, x === 10 || x === 13 ? 'c' : 'w')
      } else {
        line(fr, 11, 2, 11, 20, 'd'); line(fr, 12, 2, 12, 20, 'd')
      }
      if (f >= 3) {
        const spread = (f - 2) * 3
        line(fr, 12 - spread, 21, 12 + spread, 21, f < 5 ? 'w' : 'c')
        line(fr, 12 - spread + 1, 20, 12 - spread - 1, 18 - (f - 3), 'c')
        line(fr, 12 + spread - 1, 20, 12 + spread + 1, 18 - (f - 3), 'c')
        plot(fr, 12 - spread - 1, 16 - (f - 3) * 2, 'y'); plot(fr, 12 + spread + 1, 16 - (f - 3) * 2, 'y')
      }
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 双剣：左右から続けて2回斬る（×の字）
  doubleSlash() {
    const frames = []
    for (let f = 0; f < 7; f++) {
      const fr = newFrame()
      slashInto(fr, [3, 3], [13, 9], [20, 21], (f + 1) / 3, 1)
      if (f >= 2) slashInto(fr, [20, 3], [10, 9], [3, 21], (f - 1) / 3, 1)
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 弓：左から矢が飛んできて刺さり、火花が散る
  arrow() {
    const frames = []
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      const tip = Math.min(13, 2 + f * 5)
      line(fr, Math.max(0, tip - 9), 12, tip, 12, f < 3 ? 'w' : 'c')
      plot(fr, tip - 1, 11, 'c'); plot(fr, tip - 1, 13, 'c'); plot(fr, tip - 2, 10, 'c'); plot(fr, tip - 2, 14, 'c')
      if (f < 3) { plot(fr, tip - 9, 11, 'd'); plot(fr, tip - 9, 13, 'd') } // 矢羽
      if (f >= 2) burst(fr, 14, 12, (f - 2) * 2, (f - 2) * 2 + 2, 8, f < 4 ? 'y' : 'd', 0.4)
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 杖：中心から魔力の輪が広がる
  magicBurst() {
    const frames = []
    const rnd = seeded(7)
    const sparks = Array.from({ length: 10 }, () => [rnd() * Math.PI * 2, 3 + rnd() * 7])
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      ring(fr, 12, 12, 2 + f * 2, f < 4 ? 'c' : 'd')
      if (f > 0) ring(fr, 12, 12, f * 2 - 1, 'd', 2)
      if (f < 3) { ring(fr, 12, 12, 1, 'w'); plot(fr, 12, 12, 'w') }
      for (const [a, r] of sparks) if (r < 3 + f * 2 && r > f) plot(fr, 12 + Math.cos(a) * r, 12 + Math.sin(a) * r, 'w')
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 魔導書：魔法陣（ひし形と円）が現れて、最後に十字に光る
  rune() {
    const frames = []
    for (let f = 0; f < 7; f++) {
      const fr = newFrame()
      const r = Math.min(9, 3 + f * 2)
      if (f < 5) {
        // ひし形（コマごとに45度ずつ向きを変えて回っているように見せる）
        const off = f % 2 === 0 ? 0 : Math.PI / 4
        for (let i = 0; i < 4; i++) {
          const a0 = off + (Math.PI / 2) * i, a1 = off + (Math.PI / 2) * (i + 1)
          line(fr, 12 + Math.cos(a0) * r, 12 + Math.sin(a0) * r, 12 + Math.cos(a1) * r, 12 + Math.sin(a1) * r, 'c')
        }
        ring(fr, 12, 12, r, 'd', 2)
        plot(fr, 12, 12, 'w')
      }
      if (f >= 4) {
        const len = (f - 3) * 4
        line(fr, 12 - len, 12, 12 + len, 12, f === 6 ? 'd' : 'w'); line(fr, 12, 12 - len, 12, 12 + len, f === 6 ? 'd' : 'w')
      }
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 仲間モンスター：3本の爪あと
  claw() {
    const frames = []
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      const len = Math.min(1, (f + 1) / 3)
      for (const dx of [-5, 0, 5]) {
        const x0 = 15 + dx, y0 = 3, x1 = x0 - 8 * len, y1 = y0 + 17 * len
        line(fr, x0, y0, x1, y1, f < 4 ? 'c' : 'd', 2)
        if (f < 3) plot(fr, x1, y1, 'w')
      }
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 汎用の打撃：星形の衝撃
  impact() {
    const frames = []
    for (let f = 0; f < 5; f++) {
      const fr = newFrame()
      burst(fr, 12, 12, f * 2, f * 2 + 3, 8, f < 3 ? 'w' : 'd')
      burst(fr, 12, 12, f, f + 2, 8, 'c', Math.PI / 8)
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 火：下から炎の柱が立ちのぼる
  fire() {
    const frames = []
    const rnd = seeded(3)
    const cols = Array.from({ length: 14 }, () => rnd())
    for (let f = 0; f < 7; f++) {
      const fr = newFrame()
      const power = [0.35, 0.7, 1, 1, 0.8, 0.5, 0.25][f]
      cols.forEach((seed, i) => {
        const x = 5 + i
        const center = 1 - Math.abs(i - 6.5) / 7
        const h = Math.round((6 + center * 13) * power * (0.75 + 0.25 * Math.sin(seed * 9 + f * 2)))
        for (let k = 0; k < h; k++) {
          const ratio = k / h
          plot(fr, x, 22 - k, ratio < 0.3 && center > 0.5 ? 'w' : ratio < 0.6 ? 'y' : 'c')
        }
      })
      for (let i = 0; i < 4; i++) plot(fr, 6 + ((i * 5 + f * 3) % 12), 20 - f * 3 - i * 2, 'y') // 舞い上がる火の粉
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 水：水柱が上がり、しぶきが飛び散る
  water() {
    const frames = []
    for (let f = 0; f < 7; f++) {
      const fr = newFrame()
      const h = [6, 13, 18, 16, 10, 5, 0][f]
      for (let k = 0; k < h; k++) {
        const w = k < 3 ? 3 : k > h - 3 ? 1 : 2
        for (let dx = -w; dx <= w; dx++) plot(fr, 12 + dx, 22 - k, Math.abs(dx) === w ? 'c' : k % 4 === 0 ? 'w' : 'c')
      }
      if (f >= 2) {
        const t = f - 2
        for (let i = 0; i < 6; i++) {
          const dir = i < 3 ? -1 : 1
          const vx = (1.5 + (i % 3)) * dir
          plot(fr, 12 + vx * (t + 1), 6 - 4 + t * t * 0.9 + (i % 3) * 2, i % 2 ? 'w' : 'c')
        }
      }
      if (f >= 3) line(fr, 12 - (f - 2) * 3, 22, 12 + (f - 2) * 3, 22, 'd')
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 雷：上から稲妻が落ちて、ちらついて消える
  thunder() {
    const zig = [[13, 0], [9, 6], [14, 9], [8, 15], [13, 17], [10, 23]]
    const bolt = (fr, color, thick) => { for (let i = 0; i < zig.length - 1; i++) line(fr, zig[i][0], zig[i][1], zig[i + 1][0], zig[i + 1][1], color, thick) }
    const frames = []
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      if (f === 0) bolt(fr, 'w', 1)
      if (f === 1) { bolt(fr, 'c', 3); bolt(fr, 'w', 1); line(fr, 14, 9, 19, 12, 'c'); line(fr, 8, 15, 3, 18, 'c') }
      if (f === 3) { bolt(fr, 'w', 2); line(fr, 14, 9, 20, 11, 'w'); line(fr, 8, 15, 2, 19, 'w'); burst(fr, 10, 22, 1, 4, 6, 'y') }
      if (f === 4) { bolt(fr, 'd', 1); burst(fr, 10, 22, 3, 6, 6, 'c') }
      if (f === 5) burst(fr, 10, 22, 6, 8, 6, 'd')
      frames.push(fr) // f===2 は何も描かない（ちらつき）
    }
    return toFrames(frames)
  },
  // 土：地面から岩のトゲが突き出す
  earth() {
    const frames = []
    const spikes = [[6, 9], [12, 16], [18, 11]] // [中心x, 高さ]
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      const grow = [0.3, 0.75, 1, 1, 0.9, 0.6][f]
      for (const [cx, height] of spikes) {
        const h = Math.round(height * grow)
        for (let k = 0; k < h; k++) {
          const w = Math.max(0, Math.round(3 * (1 - k / h)))
          for (let dx = -w; dx <= w; dx++) plot(fr, cx + dx, 22 - k, dx === -w ? 'w' : dx === w ? 'd' : 'c')
        }
      }
      if (f >= 1 && f <= 3) for (let i = 0; i < 6; i++) plot(fr, 3 + i * 4, 21 - f * 4 - (i % 2) * 3, 'd') // 飛び散る石
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 光：十字の光が広がり、放射状にきらめく
  light() {
    const frames = []
    for (let f = 0; f < 6; f++) {
      const fr = newFrame()
      const len = [3, 7, 11, 11, 8, 4][f]
      const col = f < 4 ? 'w' : 'c'
      line(fr, 12 - len, 12, 12 + len, 12, col); line(fr, 12, 12 - len, 12, 12 + len, col)
      line(fr, 12 - len, 11, 12 + len, 11, 'c'); line(fr, 11, 12 - len, 11, 12 + len, 'c')
      burst(fr, 12, 12, 2, Math.round(len * 0.6), 4, 'y', Math.PI / 4)
      if (f >= 2) ring(fr, 12, 12, 3 + f, 'd', 3)
      frames.push(fr)
    }
    return toFrames(frames)
  },
  // 闇：外から輪が縮んで集まり、中心で弾ける
  dark() {
    const frames = []
    for (let f = 0; f < 7; f++) {
      const fr = newFrame()
      if (f < 4) {
        ring(fr, 12, 12, 10 - f * 3, 'c')
        ring(fr, 12, 12, 11 - f * 3, 'd', 2)
        plot(fr, 12, 12, 'w')
      } else {
        const r = (f - 3) * 3
        burst(fr, 12, 12, r - 2, r + 1, 8, f < 6 ? 'c' : 'd', Math.PI / 8)
        ring(fr, 12, 12, r, 'd', 2)
        if (f === 4) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) plot(fr, 12 + dx, 12 + dy, 'w')
      }
      frames.push(fr)
    }
    return toFrames(frames)
  },
}

// コマは何度呼んでも同じなので、1回作ったら使い回す
const frameCache = {}
export function getEffectFrames(kind) {
  const key = EFFECTS[kind] ? kind : 'impact'
  if (!frameCache[key]) frameCache[key] = EFFECTS[key]()
  return frameCache[key]
}

// 武器種ごとの通常の演出
const WEAPON_EFFECT = {
  sword: 'slash',
  greatsword: 'heavySlash',
  dualblades: 'doubleSlash',
  bow: 'arrow',
  staff: 'magicBurst',
  tome: 'rune',
}

// どの演出を出すか決める
// source：誰の攻撃か（'player' | 'ally'）／skillElement：属性スキルならその属性／weaponType：プレイヤーの武器種
// - 仲間モンスターの攻撃 → 爪
// - 属性スキル（火・水・雷・土・光・闇）→ その属性の演出
// - それ以外（通常攻撃・無属性スキル）→ 武器種の演出
export function resolveEffectKind({ source, skillElement = null, weaponType = null }) {
  if (source === 'ally') return 'claw'
  if (skillElement && EFFECTS[skillElement]) return skillElement
  return WEAPON_EFFECT[weaponType] || 'impact'
}
