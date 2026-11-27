// 画面レンダリングのスモークテスト：node test/render-smoke.js で実行
// viteのSSR変換を使ってJSXコンポーネントをNode上で読み込み、renderToStringで
// 初期描画がクラッシュしないことを確認する（タップ操作後の分岐は対象外）
// - ロビー（App）
// - 装備管理画面（ドロップ品あり・スロット/タブ/合成素材）
// - 合成画面／勝利リザルト

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({ root, server: { middlewareMode: true }, logLevel: 'error' })

// renderToStringはテキスト区切りに<!-- -->を挟むため、文字列判定の前に除去する
// 絵文字は自作ドット絵アイコン（SVG）に差し替わって出力されるので、判定しやすいよう元の絵文字に戻す
const render = (element) =>
  renderToString(element)
    .replace(/<!--.*?-->/g, '')
    .replace(/<svg class="pixel-icon"[^>]*data-emoji="([^"]*)"[^>]*>.*?<\/svg>/g, '$1')

let passCount = 0
let failCount = 0

function check(label, cond, detail = '') {
  if (cond) {
    passCount++
    console.log(`  ✅ ${label}`)
  } else {
    failCount++
    console.log(`  ❌ ${label} ${detail}`)
  }
}

try {
  // ============================================================
  console.log('====== 1. ロビー（App） ======')
  const { default: App } = await server.ssrLoadModule('/src/App.jsx')
  // SSRではuseEffectが動かないため初期装備は未付与＝インベントリ空・未装備の状態が描画される
  const lobbyHtml = render(React.createElement(App))
  check('ロビーが描画できる', lobbyHtml.includes('拠点ロビー'))
  check('フッターナビが表示される',
    ['ダンジョン', '装備', '仲間', '辞典'].every((label) => lobbyHtml.includes(label)))
  check('現在の装備（簡易表示）がある', lobbyHtml.includes('現在の装備'))
  check('テスト用サンプル武器の表示が無い', !lobbyHtml.includes('テスト用サンプル'))
  // SSRの初期状態＝未装備・初回フラグfalseなので「職業タップで自動装備」の案内が出る
  check('初回は職業選択で自動装備される案内が出る', lobbyHtml.includes('職業を選ぶと初期装備が自動で装備される'))

  // ============================================================
  console.log('\n====== 2. 装備管理画面 ======')
  const { default: EquipmentScreen } = await server.ssrLoadModule('/src/pages/EquipmentScreen.jsx')
  const { useEquipmentState } = await server.ssrLoadModule('/src/systems/equipmentState.js')
  const { generateLoot } = await server.ssrLoadModule('/src/systems/lootSystem.js')
  const { createSeededRng } = await server.ssrLoadModule('/src/systems/weaponGenerator.js')
  const { createStarterEquipment } = await server.ssrLoadModule('/src/data/starterEquipment.js')

  // シード付きでドロップ品を量産（武器・防具・アクセが混ざる）＋初期装備一式
  const rng = createSeededRng(123)
  const items = []
  for (let floor = 1; floor <= 15; floor++) {
    items.push(generateLoot({ floor, grade: floor % 5 === 0 ? 'boss' : 'grunt', rng }))
  }
  items.push(...createStarterEquipment())
  check('テスト用ドロップに武器がある', items.some((it) => it.slot === 'weapon'))

  // フックはコンポーネント内でしか呼べないため、ラッパー経由で実体を渡す
  function EquipmentWrapper() {
    const equipment = useEquipmentState()
    return React.createElement(EquipmentScreen, {
      jobId: 'swordsman',
      jobLevel: 3,
      items,
      equipment,
      shards: { 1: 5, 2: 2 },
      onSpendShards: () => {},
      onRemoveItems: () => {},
      onUpdateItem: () => {},
      onBack: () => {},
      onOpenDictionary: () => {},
    })
  }
  const eqHtml = render(React.createElement(EquipmentWrapper))
  check('装備管理画面が描画できる', eqHtml.includes('装備・アイテム'))
  check('4スロットが表示される',
    ['武器', '防具', 'アクセ1', 'アクセ2'].every((label) => eqHtml.includes(label)))
  check('ステータス合計が表示される', eqHtml.includes('装備込み') && eqHtml.includes('会心'))
  check('種別タブが表示される', eqHtml.includes('武器（') && eqHtml.includes('防具（') && eqHtml.includes('アクセ（'))
  check('合成素材（欠片）の所持数が表示される', eqHtml.includes('合成素材') && eqHtml.includes('ランク1 ×5'))
  check('一覧に合成ボタンがある', eqHtml.includes('⚒ 合成'))
  check('職業レベルが表示される', eqHtml.includes('剣士 Lv3'))
  check('初期装備（無属性）が描画できる', eqHtml.includes('なめし革の剣') && eqHtml.includes('無属性'))

  // 所持ゼロでも落ちない
  function EmptyWrapper() {
    const equipment = useEquipmentState()
    return React.createElement(EquipmentScreen, {
      jobId: 'mage',
      items: [],
      equipment,
      onRemoveItems: () => {},
      onUpdateItem: () => {},
      onBack: () => {},
      onOpenDictionary: () => {},
    })
  }
  const emptyHtml = render(React.createElement(EmptyWrapper))
  check('所持ゼロでも描画できる', emptyHtml.includes('ドロップを集めよう'))

  // ============================================================
  console.log('\n====== 3. 合成画面／勝利リザルト ======')
  const { default: FusionScreen } = await server.ssrLoadModule('/src/components/equipment/FusionScreen.jsx')
  const { default: LootResultScreen } = await server.ssrLoadModule('/src/components/dungeon/LootResultScreen.jsx')

  const weapons = items.filter((it) => it.slot === 'weapon')
  const base = { ...weapons[0], plus: 2, plusExp: 5 }
  const fusionHtml = render(React.createElement(FusionScreen, {
    base,
    candidates: weapons.slice(1),
    shards: { 1: 5, 3: 1 },
    jobLevel: 1,
    onConfirm: () => {},
    onCancel: () => {},
  }))
  check('合成画面が描画できる', fusionHtml.includes('⚒ 合成') && fusionHtml.includes('親にする装備（消える）'))
  check('ベースの+値が表示される', fusionHtml.includes('+2'))
  check('欠片の行が表示される', fusionHtml.includes('ランク1') && fusionHtml.includes('0/5'))
  check('残すスキルの枠が表示される', fusionHtml.includes('残すスキル'))
  check('素材未選択では合成ボタンが押せない', /<button class="start-btn" disabled="">/.test(fusionHtml))

  const armorBase = items.find((it) => it.slot === 'armor')
  const armorFusion = render(React.createElement(FusionScreen, {
    base: armorBase, candidates: [], shards: {}, jobLevel: 1, onConfirm: () => {}, onCancel: () => {},
  }))
  check('防具・素材ゼロでも合成画面が描画できる',
    armorFusion.includes('欠片を持っていない') && armorFusion.includes('親にできる装備がない') && !armorFusion.includes('残すスキル'))

  const lootWithItem = render(React.createElement(LootResultScreen, {
    result: { floor: 5, item: weapons[0], shards: { tier: 1, count: 7 }, exp: 105, levelBefore: 2, levelAfter: 4 },
    jobName: '剣士', onNext: () => {}, onLobby: () => {}, onOpenDictionary: () => {},
  }))
  check('リザルト：経験値・レベルアップ・欠片・装備が出る',
    lootWithItem.includes('+105') && lootWithItem.includes('Lv2 → Lv4') && lootWithItem.includes('×7') && lootWithItem.includes('装備ドロップ'))
  const lootNoItem = render(React.createElement(LootResultScreen, {
    result: { floor: 2, item: null, shards: { tier: 1, count: 2 }, exp: 16, levelBefore: 1, levelAfter: 1 },
    jobName: '剣士', onNext: () => {}, onLobby: () => {}, onOpenDictionary: () => {},
  }))
  const fireBook = (await server.ssrLoadModule('/src/data/skills_elemental.js')).SKILLS_ELEMENTAL.find((sk) => sk.element === 'fire')
  const lootBook = render(React.createElement(LootResultScreen, {
    result: { floor: 2, item: null, shards: { tier: 1, count: 2 }, book: fireBook.id, exp: 16, levelBefore: 1, levelAfter: 1 },
    jobName: '剣士', onNext: () => {}, onLobby: () => {}, onOpenDictionary: () => {},
  }))
  check('リザルト：スキルの書が出る', lootBook.includes('スキルの書を拾った') && lootBook.includes(`${fireBook.name}の書`))
  check('リザルト：装備なしでも描画できる', lootNoItem.includes('装備は落ちなかった') && !lootNoItem.includes('レベルアップ'))

  // ============================================================
  console.log('\n====== 4. 仲間モンスター ======')
  const { default: MonsterScreen } = await server.ssrLoadModule('/src/pages/MonsterScreen.jsx')
  const { default: ActionMenu } = await server.ssrLoadModule('/src/components/battle/ActionMenu.jsx')
  const mon = { id: 'm1', name: '火の魔獣', element: 'fire', floor: 3, isBoss: false, sprite: null, stats: { hp: 73, atk: 8, def: 7, spd: 10 }, level: 1, exp: 0, recruitedAt: 1 }
  const monHtml = render(React.createElement(MonsterScreen, { monsters: [mon], partyId: 'm1', onToggleParty: () => {}, onRelease: () => {}, onBack: () => {} }))
  check('連れていく仲間に「同行中」と出る', monHtml.includes('同行中') && monHtml.includes('外す') && monHtml.includes('Lv1'))
  const fullHtml = render(React.createElement(MonsterScreen, { monsters: Array.from({ length: 10 }, (_, i) => ({ ...mon, id: `m${i}` })), partyId: null, onToggleParty: () => {}, onRelease: () => {}, onBack: () => {} }))
  check('10体で満員の案内が出る', fullHtml.includes('仲間モンスター（10/10）') && fullHtml.includes('仲間が満員'))
  check('仲間一覧が描画できる', monHtml.includes('仲間モンスター（1/10）') && monHtml.includes('火の魔獣') && monHtml.includes('3階で仲間に') && monHtml.includes('HP73'))
  check('仲間ゼロでも描画できる',
    render(React.createElement(MonsterScreen, { monsters: [], onRelease: () => {}, onBack: () => {} })).includes('まだ仲間がいない'))
  const menuHtml = render(React.createElement(ActionMenu, { disabled: false, onAttack() {}, onSkills() {}, onEscape() {} }))
  check('戦闘コマンドは3つ（仲間にするは無い）', (menuHtml.match(/<button/g) || []).length === 3 && !menuHtml.includes('仲間にする'))
  const lootWith = (extra, props = {}) => render(React.createElement(LootResultScreen, {
    result: { floor: 3, item: null, shards: { tier: 1, count: 2 }, exp: 17, levelBefore: 1, levelAfter: 1, ...extra },
    jobName: '剣士', hp: 50, maxHp: 104, onNext: () => {}, onLobby: () => {}, onOpenDictionary: () => {}, ...props,
  }))
  const offer = lootWith({ joinOffer: mon, joinState: 'offer' })
  check('リザルト：起き上がった敵に「仲間にする／見送る」が出る',
    offer.includes('仲間になりたそうにこちらを見ている') && offer.includes('火の魔獣') && offer.includes('>仲間にする<') && offer.includes('>見送る<') && offer.includes('勝利') && offer.includes('50/104'))
  const offerFull = lootWith({ joinOffer: mon, joinState: 'offer' }, { boxFull: true })
  check('リザルト：仲間が満員だと仲間にできない', offerFull.includes('仲間が満員で連れていけない') && /<button[^>]*disabled[^>]*>仲間にする</.test(offerFull))
  const joined = lootWith({ joinOffer: mon, joinState: 'joined' })
  check('リザルト：仲間にした後の表示', joined.includes('が仲間になった！') && !joined.includes('>見送る<'))
  const declined = lootWith({ joinOffer: mon, joinState: 'declined' })
  check('リザルト：見送った後の表示', declined.includes('去っていった') && !declined.includes('>仲間にする<'))
  check('リザルト：起き上がらなければ何も出ない', !lootWith({}).includes('join-offer'))
} finally {
  await server.close()
}

// ============================================================
console.log('\n============================================')
console.log(`結果: ✅ ${passCount} / ❌ ${failCount}`)
if (failCount > 0) process.exit(1)
console.log('画面レンダリングスモークテスト全通過！')
