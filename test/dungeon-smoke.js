// ダンジョンのスモークテスト：node test/dungeon-smoke.js で実行
// 1. ゾーン属性の巡回チェック
// 2. 1〜15階の自動周回シミュレーション（チェックポイント解放・ドロップ）
// 3. 生成敵との実戦闘（battleEngine互換確認）
// 4. ドロップのレア度分布・エンチャントルールの検証
// 5. エンチャント生成の統計検証（レア度別の枠充填率・部位別カテゴリ重み）

import { floorToZoneElement, isBossFloor } from '../src/systems/dungeonState.js'
import { generateEnemy } from '../src/systems/enemyGenerator.js'
import { generateLoot } from '../src/systems/lootSystem.js'
import { createSeededRng } from '../src/systems/weaponGenerator.js'
import { createBattle, runAutoBattle } from '../src/systems/battleEngine.js'
import { SAMPLE_WEAPONS } from '../src/data/sampleWeapons.js'
import { ELEMENTS } from '../src/data/elements.js'
import { RARITIES } from '../src/data/rarities.js'
import { ENCHANT_RULES, ENCHANTS, ENCHANTS_BY_ID } from '../src/data/itemTemplates.js'

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

// ============================================================
console.log('====== 1. ゾーン属性の巡回 ======')
const zoneExpect = [
  [1, 'fire'], [5, 'fire'], [6, 'water'], [10, 'water'], [11, 'thunder'],
  [16, 'earth'], [21, 'light'], [26, 'dark'], [30, 'dark'], [31, 'fire'], [36, 'water'],
]
for (const [floor, expected] of zoneExpect) {
  const actual = floorToZoneElement(floor)
  check(`${floor}階 = ${ELEMENTS[expected].name}ゾーン`, actual === expected, `実際: ${actual}`)
}
check('ボス階判定（5/10/15階）', isBossFloor(5) && isBossFloor(10) && isBossFloor(15))
check('非ボス階判定（1/4/6階）', !isBossFloor(1) && !isBossFloor(4) && !isBossFloor(6))

// ============================================================
console.log('\n====== 2. 1〜15階の自動周回シミュレーション ======')
{
  const rng = createSeededRng(777)
  const checkpoints = [1] // 1階は固定解放
  const drops = []
  for (let floor = 1; floor <= 15; floor++) {
    const enemy = generateEnemy({ floor, rng })
    const grade = isBossFloor(floor) ? 'boss' : 'grunt'
    // 勝利したものとしてドロップ生成＋ボスならチェックポイント解放
    const item = generateLoot({ floor, grade, rng })
    drops.push({ floor, grade, item })
    if (isBossFloor(floor) && !checkpoints.includes(floor + 1)) {
      checkpoints.push(floor + 1)
    }
    if (floor <= 3 || isBossFloor(floor)) {
      console.log(`  ${floor}階: ${enemy.icon}${enemy.name} HP${enemy.stats.hp}/ATK${enemy.stats.atk} → ドロップ「${item.name}」(${RARITIES[item.rarity].name})`)
    }
  }
  check('チェックポイントが[1,6,11,16]と解放される', JSON.stringify(checkpoints) === '[1,6,11,16]',
    `実際: ${JSON.stringify(checkpoints)}`)
  check('全15階でドロップが生成される', drops.length === 15 && drops.every((d) => d.item))
  const bossDrops = drops.filter((d) => d.grade === 'boss')
  check('ボスドロップはエピック以上確定', bossDrops.every((d) => ['epic', 'legendary', 'unique'].includes(d.item.rarity)),
    bossDrops.map((d) => d.item.rarity).join(','))
}

// ============================================================
console.log('\n====== 3. 生成敵との実戦闘（battleEngine互換） ======')
{
  const weapon = SAMPLE_WEAPONS.find((w) => w.weaponType === 'sword') // 火のレア剣
  let completed = 0
  for (let floor = 1; floor <= 3; floor++) {
    const enemyDef = generateEnemy({ floor, rng: createSeededRng(floor) })
    const battle = createBattle({ jobId: 'swordsman', weapon, enemyDef, seed: floor * 100 })
    runAutoBattle(battle, { maxTurns: 30 })
    if (battle.result) completed++
    console.log(`  ${floor}階 ${enemyDef.name}: ${battle.result}（${battle.turn}ターン）`)
  }
  check('生成敵との戦闘が3戦ともエラーなく完走', completed === 3)
}

// ============================================================
console.log('\n====== 4. ドロップのレア度分布・エンチャントルール（各500件） ======')
{
  const rng = createSeededRng(2026)
  const tally = { grunt: {}, boss: {} }
  const items = []
  for (let i = 0; i < 500; i++) {
    for (const grade of ['grunt', 'boss']) {
      const item = generateLoot({ floor: grade === 'boss' ? 5 : 3, grade, rng })
      tally[grade][item.rarity] = (tally[grade][item.rarity] || 0) + 1
      items.push(item)
    }
  }
  console.log(`  雑魚(3階): ${JSON.stringify(tally.grunt)}`)
  console.log(`  ボス(5階): ${JSON.stringify(tally.boss)}`)
  check('雑魚はコモン〜レア中心・低確率エピック',
    (tally.grunt.common || 0) + (tally.grunt.rare || 0) > (tally.grunt.epic || 0) * 3 &&
    !tally.grunt.legendary && !tally.grunt.unique)
  check('ボスはエピック〜レジェンダリー確定＋極低確率ユニーク',
    !tally.boss.common && !tally.boss.rare && (tally.boss.epic || 0) > 0 && (tally.boss.legendary || 0) > 0)

  // エンチャントルール検証
  let dupViolation = 0
  let slotViolation = 0
  let elemMismatch = 0
  let zoneCount = 0
  let weaponCount = 0
  for (const item of items) {
    const ids = item.enchants.map((e) => e.enchantId)
    if (new Set(ids).size !== ids.length) dupViolation++ // 自然ドロップでは同種重複なし
    if (item.enchants.length > (ENCHANT_RULES.slotsByRarity[item.rarity] ?? 0)) slotViolation++
    if (item.slot === 'weapon') {
      weaponCount++
      if (item.element === floorToZoneElement(item.floor)) zoneCount++
      // 属性スキルは武器の属性と一致するもののみ（GDD 9.2）
      for (const s of item.skills) {
        const skillElement = s.skillId.match(/^(fire|water|thunder|earth|light|dark)_/)?.[1]
        if (skillElement && skillElement !== item.element) elemMismatch++
      }
    }
  }
  check('エンチャントの同種重複なし（自然ドロップ）', dupViolation === 0, `違反: ${dupViolation}件`)
  check('エンチャント数がレア度の枠数以内', slotViolation === 0, `違反: ${slotViolation}件`)
  check('武器の属性スキルは武器属性と一致', elemMismatch === 0, `違反: ${elemMismatch}件`)
  check(`武器属性はゾーン属性に偏る（${zoneCount}/${weaponCount}がゾーン属性）`,
    zoneCount / weaponCount > 0.3)
}

// ============================================================
console.log('\n====== 5. エンチャント生成の統計検証（各レア度1000個以上） ======')
{
  const rng = createSeededRng(4242)
  const MIN = 1000
  const pct = (x) => `${(x * 100).toFixed(1)}%`
  const byRarity = { common: [], rare: [], epic: [], legendary: [], unique: [] }
  const catTally = { weapon: {}, armor: {}, accessory: {} }

  // コモン/レアが揃うまでは雑魚ドロップ、その後はボスドロップで
  // エピック/レジェンダリー/ユニーク（ボス3%のみ）を集める
  let generated = 0
  while (Object.values(byRarity).some((list) => list.length < MIN) && generated < 300000) {
    generated++
    const grade = (byRarity.common.length < MIN || byRarity.rare.length < MIN) ? 'grunt' : 'boss'
    const item = generateLoot({ floor: grade === 'boss' ? 5 : 3, grade, rng })
    byRarity[item.rarity].push(item)
    for (const en of item.enchants) {
      const cat = ENCHANTS_BY_ID[en.enchantId].category
      catTally[item.slot][cat] = (catTally[item.slot][cat] || 0) + 1
    }
  }
  console.log(`  総生成数: ${generated}個`)

  // --- レア度別：平均エンチャント数・0個率・満枠率を理論値と比較 ---
  // 理論値（各枠独立に50%充填・保証なし）：
  //   平均 = 枠数×0.5 ／ 0個率 = 0.5^枠数 ／ 満枠率 = 0.5^枠数
  const fill = ENCHANT_RULES.fillChance
  for (const rarity of ['common', 'rare', 'epic', 'legendary', 'unique']) {
    const items = byRarity[rarity]
    const slots = ENCHANT_RULES.slotsByRarity[rarity]
    const n = items.length
    const mean = items.reduce((sum, it) => sum + it.enchants.length, 0) / n
    const zeroRate = items.filter((it) => it.enchants.length === 0).length / n
    const fullRate = items.filter((it) => it.enchants.length === slots).length / n
    const expMean = slots * fill
    const expZero = Math.pow(1 - fill, slots)
    const expFull = Math.pow(fill, slots)
    console.log(
      `  ${RARITIES[rarity].name}(枠${slots}) n=${n}: ` +
      `平均${mean.toFixed(3)}個(理論${expMean.toFixed(2)}) ／ ` +
      `0個率${pct(zeroRate)}(理論${pct(expZero)}) ／ ` +
      `満枠率${pct(fullRate)}(理論${pct(expFull)})`
    )
    check(`${RARITIES[rarity].name}: 平均エンチャント数が理論値±0.08以内`,
      Math.abs(mean - expMean) <= 0.08, `実測${mean.toFixed(3)}／理論${expMean}`)
    check(`${RARITIES[rarity].name}: エンチャント0個率が理論値±6pt以内`,
      Math.abs(zeroRate - expZero) <= 0.06, `実測${pct(zeroRate)}／理論${pct(expZero)}`)
    check(`${RARITIES[rarity].name}: 満枠率が理論値±6pt以内`,
      Math.abs(fullRate - expFull) <= 0.06, `実測${pct(fullRate)}／理論${pct(expFull)}`)
  }

  // --- 部位別：攻撃系/生存系/特殊系の出現比率を重み理論値と比較 ---
  // 理論値 = カテゴリ内エンチャント種類数×部位重み÷総重み（初回抽選ベース）
  // ±8pt: 同種重複除外で2枠目以降の抽選が理論値から僅かにズレるための余裕
  const CAT_LABELS = { attack: '攻撃系', survival: '生存系', special: '特殊系' }
  const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' }
  const catCounts = { attack: 0, survival: 0, special: 0 }
  for (const e of ENCHANTS) catCounts[e.category]++
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const w = ENCHANT_RULES.categoryWeightsBySlot[slot]
    const totalWeight = catCounts.attack * w.attack + catCounts.survival * w.survival + catCounts.special * w.special
    const tally = catTally[slot]
    const totalN = (tally.attack || 0) + (tally.survival || 0) + (tally.special || 0)
    const parts = []
    let allWithin = true
    for (const cat of ['attack', 'survival', 'special']) {
      const actual = (tally[cat] || 0) / totalN
      const expected = (catCounts[cat] * w[cat]) / totalWeight
      if (Math.abs(actual - expected) > 0.08) allWithin = false
      parts.push(`${CAT_LABELS[cat]}${pct(actual)}(理論${pct(expected)})`)
    }
    console.log(`  ${SLOT_LABELS[slot]} n=${totalN}: ${parts.join(' ／ ')}`)
    check(`${SLOT_LABELS[slot]}: カテゴリ比率が理論値±8pt以内`, allWithin, parts.join(' ／ '))
  }
}

// ============================================================
console.log('\n====== 結果 ======')
console.log(`✅ ${passCount}件成功 / ❌ ${failCount}件失敗`)
process.exit(failCount > 0 ? 1 : 0)
