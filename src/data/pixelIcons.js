// 自作ドット絵アイコン（12x12）。絵文字の代わりに画面に出す
// 1文字=1ドット。'.'は透明、それ以外はPALETTEの色
// アイコンを足す時は、ここに12行×12文字で絵を追加して、EMOJI_TO_ICONに「絵文字→名前」を1行書くだけ
// （画面側は文字列の中の絵文字を自動でこのアイコンに差し替える。src/pixel-jsx を参照）
export const ICON_SIZE = 12

export const PALETTE = {
  g: '#00ff41', G: '#0c8a2a', // 緑
  c: '#00ccff', C: '#0a6e99', // シアン
  y: '#ffdd00', Y: '#b38600', // 黄
  r: '#ff4444', R: '#99222a', // 赤
  o: '#ff9a3c',               // 橙
  m: '#ff66cc',               // 桃
  p: '#a06bff', P: '#5a3a99', // 紫
  b: '#4ab5ff', B: '#2a6aa8', // 青
  n: '#c98f4a', N: '#7a5226', // 茶
  s: '#b8c0cc', S: '#6b7480', // 銀
  w: '#ffffff',
  k: '#101418',               // ほぼ黒（背景になじむ「穴」用）
}

export const PIXEL_ICONS = {
  // ===== 武器種 =====
  sword: [
    '..........ss', '.........sws', '........sws.', '.......sws..', '......sws...', '.....sws....',
    '.y..sws.....', '.yysws......', '..yys.......', '..nyyy......', '.nn..y......', 'nn..........',
  ],
  greatsword: [
    '.....ss.....', '....swws....', '....swws....', '....swws....', '....swws....', '....swws....',
    '....swws....', '....swws....', '..yyyyyyyy..', '.....nn.....', '.....nn.....', '....yyyy....',
  ],
  staff: [
    '........cc..', '.......cwwc.', '.......cwcc.', '........cc..', '.......n....', '......n.....',
    '.....n......', '....n.......', '...n........', '..n.........', '.n..........', 'n...........',
  ],
  tome: [
    '..bbbbbbbb..', '.bbbbbbbbbw.', '.bbbyybbbbw.', '.bbyyyybbbw.', '.bbyyyybbbw.', '.bbbyybbbbw.',
    '.bbbbbbbbbw.', '.bbbbbbbbbw.', '.bbbbbbbbbw.', '.BBBBBBBBBw.', '..wwwwwwwww.', '............',
  ],
  bow: [
    '....nn......', '...n.w......', '..n..w......', '.n...w......', '.n...w....s.', 'nsssswssssss',
    '.n...w....s.', '.n...w......', '..n..w......', '...n.w......', '....nn......', '............',
  ],
  dualblades: [
    'c..........c', 'cc........cc', '.cc......cc.', '..cc....cc..', '...cc..cc...', '....cccc....',
    '.....cc.....', '....cccc....', '...ny..yn...', '..nn....nn..', '.nn......nn.', '............',
  ],
  // ===== 職業 =====
  orb: [
    '....pppp....', '..ppwwpppp..', '.ppwwpppppp.', '.pwwppppppp.', 'pppppppppppp', 'pppppppppPpp',
    '.ppppppppPp.', '.pppppppPPp.', '..ppppPPpp..', '....pppp....', '...yyyyyy...', '..yyyyyyyy..',
  ],
  cross: [
    '.....yy.....', '.....yy.....', '.....yy.....', '..yyyyyyyy..', '..yywwwwyy..', '.....yy.....',
    '.....yy.....', '.....yy.....', '.....yy.....', '.....yy.....', '.....yy.....', '............',
  ],
  fist: [
    '............', '...oooooo...', '..owowowoo..', '..oooooooo..', '.ooooooooo..', '.oooooooooo.',
    '.oooooooooo.', '..ooooooooo.', '...ooooooo..', '....ooooo...', '....NNNNN...', '....NNNNN...',
  ],
  // ===== 防具・アクセ =====
  shield: [
    '.ssssssssss.', '.sbbbbbbbbs.', '.sbbbwwbbbs.', '.sbbbwwbbbs.', '.sbwwwwwwbs.', '.sbwwwwwwbs.',
    '.sbbbwwbbbs.', '..sbbwwbbs..', '..sbbbbbbs..', '...sbbbbs...', '....sbbs....', '.....ss.....',
  ],
  tunic: [
    '..nn....nn..', '.nnnn..nnnn.', 'nnnnnnnnnnnn', 'nn.nnnnnn.nn', '...nnnnnn...', '...nnNNnn...',
    '...nnnnnn...', '...yyyyyy...', '...nnnnnn...', '...nnnnnn...', '...nnnnnn...', '...nnnnnn...',
  ],
  ring: [
    '....cwwc....', '....cccc....', '...yyyyyy...', '..yy....yy..', '.yy......yy.', '.y........y.',
    '.y........y.', '.y........y.', '.yy......yy.', '..yy....yy..', '...yyyyyy...', '............',
  ],
  // ===== 属性 =====
  fire: [
    '.....r......', '....rr......', '....rrr..r..', '...rroor.r..', '..rroooorr..', '..rooyyoor..',
    '.rrooyyoorr.', '.rooyyyyoor.', '.rooywwyoor.', '.rrooyyoorr.', '..rroooorr..', '...rrrrrr...',
  ],
  water: [
    '.....bb.....', '.....bb.....', '....bbbb....', '....bbbb....', '...bbbbbb...', '..bbwbbbbb..',
    '..bwwbbbbb..', '.bbwbbbbbbb.', '.bbbbbbbbBb.', '.bbbbbbbBBb.', '..bbbbBBbb..', '...bbbbbb...',
  ],
  thunder: [
    '......yyyy..', '.....yyyy...', '....yyyy....', '...yyyy.....', '..yyyyyyyy..', '.....yyyy...',
    '....yyyy....', '...yyyy.....', '..yyy.......', '..yy........', '.yy.........', '.y..........',
  ],
  earth: [
    '............', '.....ww.....', '....wwww....', '....nnnn....', '...nnnnnn...', '...nnnnnn...',
    '..nnnnnnnn..', '..nnnNnnnn..', '.nnnnNNnnnn.', '.nnnNNNNnnn.', 'nnnnnnnnnnnn', 'nnnnnnnnnnnn',
  ],
  light: [
    '.....yy.....', '.y...yy...y.', '..y......y..', '....yyyy....', '...ywwwwy...', 'yy.ywwwwy.yy',
    'yy.ywwwwy.yy', '...ywwwwy...', '....yyyy....', '..y......y..', '.y...yy...y.', '.....yy.....',
  ],
  dark: [
    '....pppp....', '..pppppp....', '.pppp.......', '.ppp........', 'ppp.........', 'ppp.........',
    'ppp.........', 'ppp.........', '.ppp........', '.pppp.....p.', '..pppppppp..', '....pppp....',
  ],
  none: [
    '............', '............', '..ssssssss..', '..s......s..', '..s......s..', '..s......s..',
    '..s......s..', '..s......s..', '..s......s..', '..ssssssss..', '............', '............',
  ],
  // ===== 状態異常 =====
  ice: [
    '.....cc.....', '..c..cc..c..', '...c.cc.c...', '....cccc....', '.cccccccccc.', '....cwwc....',
    '....cwwc....', '.cccccccccc.', '....cccc....', '...c.cc.c...', '..c..cc..c..', '.....cc.....',
  ],
  confusion: [
    '............', '....yy......', '....yy...m..', '.yyyyyyyy.m.', '..yyyyyy..m.', '...yyyy..m..',
    '..yyyyyy.m..', '..yy..yy.m..', '.y......m...', '......mm....', '...mmm......', '............',
  ],
  skull: [
    '...wwwwww...', '..wwwwwwww..', '.wwwwwwwwww.', '.wkkwwwwkkw.', '.wkkwwwwkkw.', '.wwwwkkwwww.',
    '..wwwwwwww..', '...wkwkww...', '...wwwwww...', '...w.ww.w...', '............', '............',
  ],
  // ===== コマンド・タブ =====
  attack: [
    's..........s', 'ss........ss', '.ss......ss.', '..ss....ss..', '...ss..ss...', '....ssss....',
    '....ssss....', '.y.ss..ss.y.', '.yyy....yyy.', '..yyy..yyy..', '.nn.y..y.nn.', 'nn........nn',
  ],
  sparkle: [
    '.....y......', '.....y......', '....yyy.....', '..yyywyyy...', '....yyy.....', '.....y...c..',
    '.....y...c..', '........ccc.', '.......ccwcc', '........ccc.', '.........c..', '............',
  ],
  heart: [
    '............', '..mm....mm..', '.mmmm..mmmm.', 'mmwmmmmmmmmm', 'mmwmmmmmmmmm', 'mmmmmmmmmmmm',
    '.mmmmmmmmmm.', '..mmmmmmmm..', '...mmmmmm...', '....mmmm....', '.....mm.....', '............',
  ],
  exit: [
    '............', '..gggggg....', '..g....g....', '..g....g..g.', '..g....g...g', '..g..ggggggg',
    '..g....g...g', '..g....g..g.', '..g....g....', '..g....g....', '..gggggg....', '............',
  ],
  castle: [
    'ss.ss..ss.ss', 'ss.ss..ss.ss', 'ssssssssssss', 'ssssssssssss', 'ssksssssskss', 'ssksssssskss',
    'ssssssssssss', 'ssssskksssss', 'sssskkkkssss', 'sssskkkkssss', 'sssskkkkssss', 'sssskkkkssss',
  ],
  bag: [
    '....nnnn....', '...n....n...', '...n....n...', '..nnnnnnnn..', '.nnnnnnnnnn.', '.nnyyyyyynn.',
    '.nnnnyynnnn.', '.nnnnnnnnnn.', '.nnnnnnnnnn.', '.nnnnnnnnnn.', '..nnnnnnnn..', '............',
  ],
  // ===== 敵（ログなどに出る小さい顔。戦闘画面の大きいドット絵は enemySprites.js） =====
  beast: [
    '.p........p.', 'ppp......ppp', '.pppppppppp.', '.pppppppppp.', '.pwwppppwwp.', '.pwkppppkwp.',
    '.pppppppppp.', '.ppkkkkkkpp.', '.ppkwrwrkpp.', '..pppppppp..', '..pp.pp.pp..', '............',
  ],
  guardian: [
    '.s...ss...s.', '.ssssssssss.', '..ssssssss..', '..skkwwkks..', '..ssssssss..', 'ssssssssssss',
    'ssSsrrrrsSss', 'ssSsrrrrsSss', '.sSssssssSs.', '...ss..ss...', '..sss..sss..', '............',
  ],
  // ===== スキルの書 =====
  scroll: [
    '..nnnnnnnn..', '.nwwwwwwwwn.', '.nwwwwwwwwn.', '..wkkkkkkw..', '..wwwwwwww..', '..wkkkkwww..',
    '..wwwwwwww..', '..wkkkkkkw..', '..wwwwwwww..', '.nwwwwwwwwn.', '.nwwwwwwwwn.', '..nnnnnnnn..',
  ],
  // ===== 素材・合成・演出 =====
  shard: [
    '.....cc.....', '....cwcc....', '...cwwccc...', '..cwwccccc..', '.cwwccccccc.', 'cwccccccccCC',
    'ccccccccccCC', '.CcccccccCC.', '..CccccCCC..', '...CccCCC...', '....CCCC....', '.....CC.....',
  ],
  hammer: [
    '............', '.ssssssssss.', '.swwsssssss.', '.ssssssssss.', '.SSSSSSSSSS.', '.....nn.....',
    '.....nn.....', '.....nn.....', '.....nn.....', '.....nn.....', '.....nn.....', '.....NN.....',
  ],
  star: [
    '.....yy.....', '.....yy.....', '....yyyy....', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..',
    '...yyyyyy...', '...yyyyyy...', '..yyyyyyyy..', '..yyy..yyy..', '.yy......yy.', '............',
  ],
  warning: [
    '.....yy.....', '.....yy.....', '....yyyy....', '....ykky....', '...yykkyy...', '...yykkyy...',
    '..yyykkyyy..', '..yyykkyyy..', '.yyyyyyyyyy.', '.yyyykkyyyy.', 'yyyyyyyyyyyy', '............',
  ],
  forbidden: [
    '...rrrrrr...', '..rr....rr..', '.rrr.....rr.', '.r.rr.....r.', 'r...rr.....r', 'r....rr....r',
    'r.....rr...r', 'r......rr..r', '.r......rr.r', '.rr.....rrr.', '..rr....rr..', '...rrrrrr...',
  ],
  crit: [
    '..o...o...o.', '...o.oo..o..', '.o..oyyo....', '..ooyyyyoo.o', '...oyywwyo..', 'oooyywwyyooo',
    '...oywwyyo..', '..ooyyyyoo..', '.o..oyyo..o.', '...o.oo.o...', '..o..o...o..', '............',
  ],
  heal: [
    '............', '....gggg....', '....gwgg....', '....gggg....', '.gggggggggg.', '.gwgggggggg.',
    '.gggggggggg.', '.gggggggggg.', '....gggg....', '....gggg....', '....gggg....', '............',
  ],
  down: [
    '............', 'rrrrrrrrrrrr', '.rrrrrrrrrr.', '.rrrrrrrrrr.', '..rrrrrrrr..', '..rrrrrrrr..',
    '...rrrrrr...', '...rrrrrr...', '....rrrr....', '....rrrr....', '.....rr.....', '............',
  ],
  up: [
    '............', '.....cc.....', '....cccc....', '....cccc....', '...cccccc...', '...cccccc...',
    '..cccccccc..', '..cccccccc..', '.cccccccccc.', '.cccccccccc.', 'cccccccccccc', '............',
  ],
  levelup: [
    '.....yy.....', '....yyyy....', '...yyyyyy...', '..yyyyyyyy..', '.yyyyyyyyyy.', '....yyyy....',
    '....yyyy....', '....yyyy....', '....yyyy....', '....yyyy....', '....yyyy....', '............',
  ],
  check: [
    '............', '..........gg', '.........ggg', '........ggg.', '.......ggg..', 'gg....ggg...',
    'ggg..ggg....', '.ggggggg....', '..ggggg.....', '...ggg......', '....g.......', '............',
  ],
}

// 絵文字 → アイコン名（異体字セレクタU+FE0Fは無視して照合する）
export const EMOJI_TO_ICON = {
  '🗡': 'sword', '🪓': 'greatsword', '🪄': 'staff', '📖': 'tome', '🏹': 'bow', '🔪': 'dualblades',
  '🔮': 'orb', '🙏': 'cross', '💪': 'fist',
  '🛡': 'shield', '🥋': 'tunic', '💍': 'ring',
  '🔥': 'fire', '💧': 'water', '⚡': 'thunder', '⛰': 'earth', '☀': 'light', '🌑': 'dark', '◽': 'none',
  '🧊': 'ice', '💫': 'confusion', '💀': 'skull',
  '⚔': 'attack', '✨': 'sparkle', '🤝': 'heart', '🏃': 'exit', '🏰': 'castle', '🎒': 'bag',
  '📜': 'scroll', '🔷': 'shard', '⚒': 'hammer', '🎉': 'star', '⚠': 'warning', '🚫': 'forbidden',
  // 敵：雑魚は魔獣の顔、ボスは守護者の顔にまとめる
  '🦊': 'beast', '🐟': 'beast', '🦅': 'beast', '🐗': 'beast', '🦄': 'beast', '🦇': 'beast',
  '👺': 'beast', '🦎': 'beast', '👤': 'beast',
  '🐲': 'guardian', '🐙': 'guardian', '🦖': 'guardian', '🗿': 'guardian', '👼': 'guardian', '😈': 'guardian',
  '💥': 'crit', '💚': 'heal', '🔻': 'down', '🔺': 'up', '⬆': 'levelup', '✅': 'check',
}
