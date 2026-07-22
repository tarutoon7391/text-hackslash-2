// ダンジョンのスモークテスト：node test/dungeon-smoke.js で実行
// 1. ゾーン属性の巡回チェック
// 2. 1〜15階の自動周回シミュレーション（チェックポイント解放・ドロップ）
// 3. 生成敵との実戦闘（battleEngine互換確認）
// 4. ドロップのレア度分布・エンチャントルールの検証

import { floorToZoneElement, isBossFloor } from '../src/systems/dungeonState.js'
import { generateEnemy } from '../src/systems/enemyGenerator.js'
import { generateLoot } from '../src/systems/lootSystem.js'
import { createSeededRng } from '../src/systems/weaponGenerator.js'
import { createBattle, runAutoBattle } from '../src/systems/battleEngine.js'
import { SAMPLE_WEAPONS } from '../src/data/sampleWeapons.js'
import { ELEMENTS } from '../src/data/elements.js'
import { RARITIES } from '../src/data/rarities.js'
import { ENCHANT_RULES } from '../src/data/itemTemplates.js'

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
console.log('\n====== 結果 ======')
console.log(`✅ ${passCount}件成功 / ❌ ${failCount}件失敗`)
process.exit(failCount > 0 ? 1 : 0)
