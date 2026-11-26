// 敵のドット絵データ（16x16）
// 1文字=1ドット。色は属性色から自動で作るので、同じ形でも属性ごとに色違いになる
//   . 透明 ／ o 輪郭（濃色） ／ m 本体（属性色） ／ l ハイライト（明色）
//   w 白（目・牙） ／ k 黒（瞳） ／ r 赤（口の中・コア）
// 新しい敵を足すときは、ここに16行×16文字で追加して enemy定義に sprite: 'キー' を書く
export const SPRITE_SIZE = 16

export const ENEMY_SPRITES = {
  // 雑魚：角のある魔獣（正面向き）
  beast: [
    '..o..........o..',
    '.olo........olo.',
    '.omlo.oooo.olmo.',
    '..omoommmmoomo..',
    '..ommllmmmmmmo..',
    '.omlmmmmmmmmmmo.',
    '.omwwwmmmmwwwmo.',
    '.omwkkmmmmkkwmo.',
    '.ommmmmmmmmmmmo.',
    '.ommoooooooommo.',
    '.ommowrwrwrommo.',
    '.ommmoooooommmo.',
    '..ommmmmmmmmmo..',
    '..omoommmmoomo..',
    '.ommo.oooo.ommo.',
    '.ooo........ooo.',
  ],
  // ボス：兜をかぶった守護者（胸にコア）
  guardian: [
    '...o..oooo..o...',
    '..olooollloolo..',
    '..omommmmmmomo..',
    '...ommmmmmmmo...',
    '...okkwmmwkko...',
    '...ommmmmmmmo...',
    '.oooommmmmmoooo.',
    'olmmooooooooommo',
    'ommmomlmmmmommmo',
    'ommmommrrmmommmo',
    'oommommrrmmommoo',
    '.omoommmmmmoomo.',
    '.ooo.ommmmo.ooo.',
    '....ommoommo....',
    '...ommo..ommo...',
    '...oooo..oooo...',
  ],
}

// 16進カラーを白/黒に寄せる（t: 0〜1）
function mix(hex, target, t) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const out = ch.map((c) => Math.round(c + (target - c) * t))
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

// 属性色（本体色）からドット絵用のパレットを作る
export function buildSpritePalette(baseColor) {
  return {
    o: mix(baseColor, 0, 0.62),
    m: baseColor,
    l: mix(baseColor, 255, 0.5),
    w: '#ffffff',
    k: '#0a0a0a',
    r: '#ff3355',
  }
}

// 敵定義から使うドット絵キーを決める（sprite指定が無ければボス/雑魚で出し分け）
export function resolveSpriteKey(enemyDef) {
  if (enemyDef?.sprite && ENEMY_SPRITES[enemyDef.sprite]) return enemyDef.sprite
  return enemyDef?.isBoss ? 'guardian' : 'beast'
}
