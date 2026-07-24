// 画面レンダリングのスモークテスト：node test/render-smoke.js で実行
// viteのSSR変換を使ってJSXコンポーネントをNode上で読み込み、renderToStringで
// 初期描画がクラッシュしないことを確認する（タップ操作後の分岐は対象外）
// - ロビー（App）
// - 装備管理画面（ドロップ品あり・スロット/タブ/抽出インベントリ）
// - 抽出確認ダイアログ／移植セレクター

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({ root, server: { middlewareMode: true }, logLevel: 'error' })

// renderToStringはテキスト区切りに<!-- -->を挟むため、文字列判定の前に除去する
const render = (element) => renderToString(element).replace(/<!--.*?-->/g, '')

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
  const lobbyHtml = render(React.createElement(App))
  check('ロビーが描画できる', lobbyHtml.includes('拠点ロビー'))
  check('装備管理への導線がある', lobbyHtml.includes('装備・アイテム'))

  // ============================================================
  console.log('\n====== 2. 装備管理画面 ======')
  const { default: EquipmentScreen } = await server.ssrLoadModule('/src/pages/EquipmentScreen.jsx')
  const { useEquipmentState } = await server.ssrLoadModule('/src/systems/equipmentState.js')
  const { useExtractInventoryState } = await server.ssrLoadModule('/src/systems/extractInventoryState.js')
  const { generateLoot } = await server.ssrLoadModule('/src/systems/lootSystem.js')
  const { createSeededRng } = await server.ssrLoadModule('/src/systems/weaponGenerator.js')

  // シード付きでドロップ品を量産（武器・防具・アクセが混ざる）
  const rng = createSeededRng(123)
  const items = []
  for (let floor = 1; floor <= 15; floor++) {
    items.push(generateLoot({ floor, grade: floor % 5 === 0 ? 'boss' : 'grunt', rng }))
  }
  check('テスト用ドロップに武器がある', items.some((it) => it.slot === 'weapon'))

  // フックはコンポーネント内でしか呼べないため、ラッパー経由で実体を渡す
  function EquipmentWrapper() {
    const equipment = useEquipmentState()
    const extractInv = useExtractInventoryState()
    return React.createElement(EquipmentScreen, {
      jobId: 'swordsman',
      items,
      equipment,
      extractInv,
      onRemoveItem: () => {},
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
  check('抽出インベントリの案内が表示される', eqHtml.includes('抽出インベントリ'))

  // 所持ゼロでも落ちない
  function EmptyWrapper() {
    const equipment = useEquipmentState()
    const extractInv = useExtractInventoryState()
    return React.createElement(EquipmentScreen, {
      jobId: 'mage',
      items: [],
      equipment,
      extractInv,
      onRemoveItem: () => {},
      onUpdateItem: () => {},
      onBack: () => {},
      onOpenDictionary: () => {},
    })
  }
  const emptyHtml = render(React.createElement(EmptyWrapper))
  check('所持ゼロでも描画できる', emptyHtml.includes('ドロップを集めよう'))

  // ============================================================
  console.log('\n====== 3. 抽出確認ダイアログ／移植セレクター ======')
  const { default: ExtractConfirmDialog } = await server.ssrLoadModule('/src/components/equipment/ExtractConfirmDialog.jsx')
  const { default: TransplantSelector } = await server.ssrLoadModule('/src/components/equipment/TransplantSelector.jsx')

  const weapon = items.find((it) => it.slot === 'weapon' && it.skills.length > 0)
  const enchanted = items.find((it) => (it.enchants || []).length > 0)
  check('テスト用の武器・エンチャント付き装備がある', Boolean(weapon && enchanted))

  const skillDlg = render(React.createElement(ExtractConfirmDialog, {
    item: weapon,
    target: { kind: 'skill', entry: weapon.skills[0] },
    onConfirm: () => {},
    onCancel: () => {},
  }))
  check('抽出確認（スキル）に破壊警告が出る', skillDlg.includes('破壊される'))

  const enchantDlg = render(React.createElement(ExtractConfirmDialog, {
    item: enchanted,
    target: { kind: 'enchant', entry: enchanted.enchants[0] },
    onConfirm: () => {},
    onCancel: () => {},
  }))
  check('抽出確認（エンチャント）が描画できる', enchantDlg.includes('エンチャントを抽出する？'))

  const skillSelector = render(React.createElement(TransplantSelector, {
    item: weapon,
    target: { kind: 'skill', index: 0 },
    candidates: [{ extractId: 'ext_t1', skillId: weapon.skills[0].skillId, plus: 1 }],
    onApply: () => {},
    onCancel: () => {},
    onOpenDictionary: () => {},
  }))
  check('移植セレクター（スキル）が描画できる', skillSelector.includes('移植するスキルを選ぶ'))
  check('上書き消滅の警告が出る', skillSelector.includes('上書きで消滅する'))

  const emptySelector = render(React.createElement(TransplantSelector, {
    item: weapon,
    target: { kind: 'enchant', index: 0 },
    candidates: [],
    onApply: () => {},
    onCancel: () => {},
    onOpenDictionary: () => {},
  }))
  check('抽出物ゼロの移植セレクターも描画できる', emptySelector.includes('まだ無い'))
} finally {
  await server.close()
}

// ============================================================
console.log('\n============================================')
console.log(`結果: ✅ ${passCount} / ❌ ${failCount}`)
if (failCount > 0) process.exit(1)
console.log('画面レンダリングスモークテスト全通過！')
