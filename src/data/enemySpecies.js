// 敵の種族データ（1〜25階ぶん。5階ブロックごとに4種類）
// ブロック内の出かた：1・2階目＝同じ敵／3階目・4階目＝それぞれ別の敵／5階目＝ボス
// sprite：見た目（下のSPECIES_SPRITESのキー。16x16のドット絵）
// ステータスは今のところ種族で変えていない（階層で決まる。enemyGenerator.js）
// 26階以降は種族が未定義なので、従来の汎用の敵（◯の魔獣／◯の守護者）が出る

// zone：そのブロックの属性（dungeonConfigのzoneRotationと同じ並び）
export const ENEMY_SPECIES_BY_BLOCK = [
  { zone: 'fire', species: [
    { id: 'ember', name: 'ヒノコ', floors: [1, 2] },
    { id: 'fireBat', name: 'フレイムバット', floors: [3] },
    { id: 'magmaLizard', name: 'マグマトカゲ', floors: [4] },
    { id: 'flameDjinn', name: '炎の魔人', floors: [5] },
  ] },
  { zone: 'water', species: [
    { id: 'puddleEye', name: 'ミズタマ', floors: [1, 2] },
    { id: 'aquaFish', name: 'アクアフィッシュ', floors: [3] },
    { id: 'shellCrab', name: 'シェルクラブ', floors: [4] },
    { id: 'seaSerpent', name: '大海蛇', floors: [5] },
  ] },
  { zone: 'thunder', species: [
    { id: 'stormCloud', name: 'ビリビリ雲', floors: [1, 2] },
    { id: 'thunderBird', name: 'サンダーバード', floors: [3] },
    { id: 'elecWolf', name: 'エレキウルフ', floors: [4] },
    { id: 'thunderGolem', name: '雷神ゴーレム', floors: [5] },
  ] },
  { zone: 'earth', species: [
    { id: 'mudBlob', name: 'どろんこ', floors: [1, 2] },
    { id: 'rockTurtle', name: 'ロックタートル', floors: [3] },
    { id: 'drillMole', name: 'モールドリル', floors: [4] },
    { id: 'stoneGiant', name: '岩石巨人', floors: [5] },
  ] },
  { zone: 'light', species: [
    { id: 'wisp', name: 'ひかりのたま', floors: [1, 2] },
    { id: 'holyRabbit', name: 'ホーリーラビット', floors: [3] },
    { id: 'crystalKnight', name: 'クリスタルナイト', floors: [4] },
    { id: 'lightAngel', name: '光の天使', floors: [5] },
  ] },
]

// 階層→種族（未定義の階はnull）
export function getSpeciesForFloor(floor, blockSize = 5) {
  const block = ENEMY_SPECIES_BY_BLOCK[Math.floor((floor - 1) / blockSize)]
  if (!block) return null
  const inBlock = ((floor - 1) % blockSize) + 1
  return block.species.find((sp) => sp.floors.includes(inBlock)) || null
}

// ===== 見た目（16x16） =====
// . 透明／o 輪郭（属性色の濃色）／m 本体（属性色）／d 本体の影／l ハイライト
// w 白／k 黒／r 赤／y 黄／g 灰（属性に関係なく固定の色）
export const SPECIES_SPRITES = {
  // ---------- 火（1〜5階） ----------
  ember: [
    '.......o........', '......omo.......', '......omo..o....', '.....ommo.omo...',
    '....ommmoommo...', '...ommlmmmmmo...', '...omllmmmmmo...', '..ommlymmmmmmo..',
    '..omwwymmwwmmo..', '..omwkyyywkmmo..', '..ommyyyyyymmo..', '..omyyywwyyymo..',
    '...omyyyyyymo...', '...oommmmmmoo...', '....oooooooo....', '................',
  ],
  fireBat: [
    '................', 'o..............o', 'oo............oo', 'omo..o....o..omo',
    'ommo.oo..oo.ommo', 'ommmoomoomoommmo', 'ommmmmmmmmmmmmmo', 'omdmmwkmmkwmmdmo',
    '.omdmmmmmmmmdmo.', '.omodmmrrmmdomo.', '..o.ommmmmmo.o..', '....omwmmwmo....',
    '.....ommmmo.....', '......oooo......', '................', '................',
  ],
  magmaLizard: [
    '................', '....o......o....', '...oyo....oyo...', '...omoooooomo...',
    '..ommmmmmmmmmo..', '.owwmmmmmmmmwwo.', '.owkmmmmmmmmkwo.', '.ommmmmmmmmmmmo.',
    '.omdmmmmmmmmdmo.', '..omookkkkoomo..', '..ommmorrommmo..', '...ommmrrmmmo...',
    '....ooorrooo....', '.......rr.......', '......r..r......', '................',
  ],
  flameDjinn: [
    '...y..y..y..y...', '..yryyryyryyry..', '..yrrrrrrrrrry..', '...ommmmmmmmo...',
    '...owkmmmmkwo...', '...ommmrrmmmo...', '.oooommmmmmoooo.', 'ommmoodmmdoommmo',
    'ommmmoyyyyommmmo', 'ommdmmmyymmmdmmo', '.oommmmmmmmmmoo.', '...ommmmmmmmo...',
    '...omdmmmmdmo...', '....ommmmmmo....', '.....oommoo.....', '.......oo.......',
  ],
  // ---------- 水（6〜10階） ----------
  puddleEye: [
    '................', '................', '................', '......oooo......',
    '....oommmmoo....', '...ommlmmmmmo...', '..ommlmwwwmmmo..', '..ommmwwkkwmmo..',
    '..ommmwwkkwmmo..', '.ommmmmwwwmmmmo.', '.ommmmmmmmmmmmo.', 'ommdmmmmmmmmdmmo',
    'ommmmddddddmmmmo', '.oommmmmmmmmmoo.', '...oooooooooo...', '................',
  ],
  aquaFish: [
    '................', '.......ooo......', '......ommmo.....', '...oooommmmo..o.',
    '..ommmmmmmmmoomo', '.omwkmmmmlmmmmmo', '.omwwmmmmllmmmmo', 'ommmmmmmdmmmmmmo',
    'orrmmmmddmmmmmmo', '.ommmmmmmmmmoomo', '..oommmmmmmo..o.', '....oooommo.....',
    '.......omo......', '........o.......', '................', '................',
  ],
  shellCrab: [
    '.oo..........oo.', 'omlo........olmo', 'ommo........ommo', '.oo..........oo.',
    '..o.owo..owo.o..', '..o.oko..oko.o..', '..oooooooooooo..', '..ommmmmmmmmmo..',
    '.ommlmmmmmmmmmo.', '.omllmmmmmmmdmo.', '.ommmmmmmmmddmo.', '..oommmmmmmmoo..',
    '.o.oooooooooo.o.', 'o..o..o..o..o..o', '................', '................',
  ],
  seaSerpent: [
    '....oooooo......', '...ommmmmmo.....', '..omwkmmmmmo....', '..omwwmmmmmmo...',
    '.orrmmmmmmmmo...', '..ooommmmmmmo...', '....ollmmmmo....', '.....olmmmo.....',
    '......ommmo..oo.', '..oo...ommmoommo', '.ommo..ommmmmmmo', 'ommmmoommmmmmmo.',
    'omlmmmmmmmmmoo..', '.ollmmmmmmoo....', '..oooooooo......', '................',
  ],
  // ---------- 雷（11〜15階） ----------
  stormCloud: [
    '................', '.....oooo.......', '...oogggoooo....', '..oggggggggooo..',
    '.ogggggggggggo..', 'oggwkgggkwggggo.', 'ogggggggggggggo.', 'ogggggooggggggo.',
    '.ooggggggggggo..', '...oooooooooo...', '......mm........', '.....mm.........',
    '....mmmm........', '......mm........', '.....mm.........', '.....m..........',
  ],
  thunderBird: [
    '................', 'o......oo......o', 'mo....ommo....om', 'mmo..owkkwo..omm',
    'mmmo.ommmmo.ommm', 'ommmoommmmoommmo', '.ommmmmrrmmmmmo.', '..ommmmrrmmmmo..',
    '...ommmmmmmmo...', '....ommllmmo....', '....ommllmmo....', '.....ommmmo.....',
    '....ogo..ogo....', '....ggg..ggg....', '................', '................',
  ],
  elecWolf: [
    '.o............o.', '.oo..........oo.', '.ogo........ogo.', '.oggo......oggo.',
    '.ogggoooooogggo.', '.oggggmmmggggmo.', '.ogwwgmmggwwggo.', '.ogkwggmmgwkggo.',
    '.ogggggmlggggmo.', '..ogggllllgggo..', '..oggllkkllggo..', '...ogllllllgo...',
    '...owlwrrwlwo...', '....ollrrllo....', '.....oooooo.....', '................',
  ],
  thunderGolem: [
    '....l......l....', '....ll....ll....', '...oooooooooo...', '...ommmmmmmmo...',
    '...omkkmmkkmo...', '...ommmmmmmmo...', '.oooooooooooooo.', 'ommmomwwwwmommmo',
    'ommmommwwmmommmo', 'ommmomwwwwmommmo', 'ommmommmmmmommmo', '.ooo.oooooo.ooo.',
    '....omm..mmo....', '....omm..mmo....', '...oomm..mmoo...', '...oooo..oooo...',
  ],
  // ---------- 土（16〜20階） ----------
  mudBlob: [
    '................', '................', '.....oooooo.....', '...oommmmmmoo...',
    '..ommmmmmmmmmo..', '..omwwmmmmwwmo..', '.ommwkmmmmkwmmo.', '.ommmmmmmmmmmmo.',
    '.ommmmooooommmo.', 'ommdmmmmmmmmdmmo', 'ommmmmmmmmmmmmmo', 'omdmmmdmmdmmmdmo',
    '.omo.omo.omo.oo.', '.oo..oo...o.....', '................', '................',
  ],
  rockTurtle: [
    '................', '................', '....oooooooo....', '..oommdmmdmmoo..',
    '.ommdddmmdddmmo.', '.omdmmmddmmmdmo.', 'ommdddmmmmdddmmo', 'omdmmmdddmmmmdmo',
    'oooooooooooooooo', '.ogo.oggggo.ogo.', '.ogo.owggwo.ogo.', '.ooo.okggko.ooo.',
    '.....oggggo.....', '......oooo......', '................', '................',
  ],
  drillMole: [
    '................', '....oooooooo....', '...ommmmmmmmo...', '..ommmmmmmmmmo..',
    '..omkkmmmmkkmo..', '..ommmmggmmmmo..', '..ommmggggmmmo..', '..ommgwggwgmmo..',
    '.oommmggggmmmoo.', 'omlommmggmmmolmo', 'ommo.ommmmo.ommo', '.oo..ommmmo..oo.',
    '.....oooooo.....', '................', '................', '................',
  ],
  stoneGiant: [
    '.....oooooo.....', '....ommdmmmo....', '....owkmmkwo....', '....ommmmmmo....',
    '....omkkkkmo....', '.oooooooooooooo.', 'ommdmommmmomdmmo', 'ommmmomdmmommmmo',
    'omdmmommmmommdmo', 'ommmmommdmommmmo', 'ommmo.oooo.ommmo', 'omdmo.ommo.omdmo',
    '.ooo.ommmmo.ooo.', '....ommoommo....', '...ommmoommmo...', '...oooooooooo...',
  ],
  // ---------- 光（21〜25階） ----------
  wisp: [
    '.......l........', '...l...l...l....', '....l.....l.....', '......oooo......',
    '....oolllloo....', '...ollwwwwllo...', 'l..olwwwwwwlo..l', '...olwkwwkwlo...',
    '...olwwwwwwlo...', 'l..ollwrrwllo..l', '....oolllloo....', '......oooo......',
    '....l.....l.....', '...l...l...l....', '.......l........', '................',
  ],
  holyRabbit: [
    '...oo......oo...', '..olmo....omlo..', '..olmo....omlo..', '..olmo....omlo..',
    '..olmo....omlo..', '..ommoooooommo..', '.ommmmmmmmmmmmo.', '.omwwmmmmmmwwmo.',
    '.omkwmmmmmmwkmo.', '.ommmmmrrmmmmmo.', '.omllmmmmmmllmo.', '..ommmwwwwmmmo..',
    '...oommmmmmoo...', '.....oooooo.....', '................', '................',
  ],
  crystalKnight: [
    '.......yy.......', '......yyyy......', '.....oooooo.....', '....oggggggo....',
    '....ogkkkkgo....', '....oggggggo....', '..oooooooooooo..', '.ommoggggggommo.',
    'omlmoggmmggomlmo', 'ommmogmllmgommmo', 'ommmoggmmggommmo', '.omo.oggggo.omo.',
    '..o..ogoogo..o..', '.....ogoogo.....', '....oogoogoo....', '....oooooooo....',
  ],
  lightAngel: [
    '......yyyy......', '.....y....y.....', '......yyyy......', '.o....oooo....o.',
    'omo..owwwwo..omo', 'omlo.owkkwo.olmo', 'omllooowwooollmo', 'omlllommmmolllmo',
    '.omllommmmollmo.', '..omlommmmolmo..', '...oommmmmmoo...', '....ommmmmmo....',
    '....ommmmmmo....', '...ommmmmmmmo...', '...oooooooooo...', '................',
  ],
}
