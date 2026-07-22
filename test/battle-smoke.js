// スモークテスト：node test/battle-smoke.js で実行
// 1. 属性相性表の検証
// 2. 属性一致ボーナスの検証（同シードの比較で威力+20%を確認）
// 3. 弱体効果（デバフ上書き・状態異常・解除・操作系）の検証
// 4. 全職業×装備可能サンプル武器×全敵で自動戦闘を回して集計

import { getElementMultiplier, ELEMENT_IDS, ELEMENTS } from '../src/data/elements.js'
import { JOBS, JOB_IDS } from '../src/data/jobs.js'
import { ENEMIES, ENEMY_IDS } from '../src/data/enemies.js'
import { SAMPLE_WEAPONS } from '../src/data/sampleWeapons.js'
import { SKILLS_NORMAL } from '../src/data/skills_normal.js'
import { SKILLS_ELEMENTAL } from '../src/data/skills_elemental.js'
import {
  createBattle, submitPlayerAction, runAutoBattle, getWeakEffects,
} from '../src/systems/battleEngine.js'

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

// テスト用の武器を手組みする（スキル構成を固定して決定的にテストする）
function makeWeapon({ weaponType = 'sword', element = 'fire', atk = 15, skillIds = [] }) {
  return {
    id: `test_${weaponType}_${element}`,
    name: `テスト武器(${element})`,
    weaponType, element, rarity: 'rare', atk,
    skills: skillIds.map((skillId) => ({ skillId, plus: 0 })),
  }
}

// ============================================================
console.log('====== 1. データ件数チェック ======')
check(`無属性スキル168個（実際: ${SKILLS_NORMAL.length}）`, SKILLS_NORMAL.length === 168)
check(`属性スキル48個（実際: ${SKILLS_ELEMENTAL.length}）`, SKILLS_ELEMENTAL.length === 48)
for (const wt of ['sword', 'greatsword', 'staff', 'tome', 'bow', 'dualblades']) {
  const skills = SKILLS_NORMAL.filter((s) => s.weaponType === wt)
  const byStar = [1, 2, 3, 4].map((st) => skills.filter((s) => s.star === st).length)
  check(`${wt}: 28個（★1×8,★2×8,★3×6,★4×6）`,
    skills.length === 28 && byStar[0] === 8 && byStar[1] === 8 && byStar[2] === 6 && byStar[3] === 6,
    `実際: ${skills.length}個 [${byStar}]`)
}

// ============================================================
console.log('\n====== 2. 属性相性表 ======')
const expectWeak = [['fire', 'earth'], ['earth', 'thunder'], ['thunder', 'water'], ['water', 'fire'], ['light', 'dark'], ['dark', 'light']]
for (const [a, d] of expectWeak) {
  check(`${ELEMENTS[a].name}→${ELEMENTS[d].name} = 1.5倍`, getElementMultiplier(a, d) === 1.5)
}
const expectResist = [['earth', 'fire'], ['thunder', 'earth'], ['water', 'thunder'], ['fire', 'water']]
for (const [a, d] of expectResist) {
  check(`${ELEMENTS[a].name}→${ELEMENTS[d].name} = 0.5倍（耐性）`, getElementMultiplier(a, d) === 0.5)
}
check('火→雷 = 1.0倍（通常）', getElementMultiplier('fire', 'thunder') === 1.0)
check('光→光 = 1.0倍（通常）', getElementMultiplier('light', 'light') === 1.0)

// ============================================================
console.log('\n====== 3. 属性一致ボーナス（同シード比較） ======')
// 同じ火属性スキルを「火武器（一致）」と「雷武器（不一致）」で使い、同シードでダメージ比較
// 攻撃属性はスキル属性(火)なので相性倍率は同一。差は一致ボーナス(×1.2)のみのはず
function firstDamageOf(weapon, seed) {
  const battle = createBattle({ jobId: 'swordsman', weapon, enemyId: 'goblin', seed })
  submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
  const dmgLine = battle.log.find((l) => l.kind === 'damage' || l.kind === 'crit')
  const m = dmgLine ? dmgLine.text.match(/(\d+) ダメージ/) : null
  return m ? Number(m[1]) : null
}
{
  const matched = makeWeapon({ element: 'fire', skillIds: ['fire_1_1'] })
  const unmatched = makeWeapon({ element: 'thunder', skillIds: ['fire_1_1'] })
  let checked = false
  for (let seed = 1; seed <= 20 && !checked; seed++) {
    const d1 = firstDamageOf(matched, seed)
    const d2 = firstDamageOf(unmatched, seed)
    if (d1 != null && d2 != null) {
      const ratio = d1 / d2
      console.log(`  一致: ${d1}ダメージ / 不一致: ${d2}ダメージ（比率 ${ratio.toFixed(3)}）`)
      check('一致ボーナスで約1.2倍になっている', Math.abs(ratio - 1.2) < 0.02, `比率: ${ratio}`)
      checked = true
    }
  }
  if (!checked) check('一致ボーナス比較（両方命中するシードが見つからず）', false)
}

// ============================================================
console.log('\n====== 4. 弱体効果の統一ルール ======')
{
  // デバフの重ね掛け不可・上書き：柄打ち(ATK-10%/2T)を2回
  const weapon = makeWeapon({ skillIds: ['sword_1_1'] })
  const battle = createBattle({ jobId: 'swordsman', weapon, enemyId: 'goblin', seed: 42 })
  submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
  const modsAfter1 = battle.enemy.mods.filter((m) => m.stat === 'atk')
  submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
  const modsAfter2 = battle.enemy.mods.filter((m) => m.stat === 'atk')
  check('デバフは重複せず1件のまま（上書き）', modsAfter1.length <= 1 && modsAfter2.length <= 1,
    `1回目:${modsAfter1.length}件 2回目:${modsAfter2.length}件`)
  if (modsAfter2.length === 1) {
    check('上書きで残りターンが更新されている', modsAfter2[0].turns >= 1)
  }
}
{
  // 状態異常の付与とスタック管理：煉獄（高60%一致込み・スタック2）連打
  const weapon = makeWeapon({ element: 'fire', skillIds: ['fire_4_1'] })
  const battle = createBattle({ jobId: 'swordsman', weapon, enemyId: 'goblin', seed: 7 })
  battle.player.stats.maxMp = battle.player.stats.mp = 999 // テスト用にMPを確保
  battle.player.stats.maxHp = battle.player.stats.hp = 9999 // 決着しないように
  battle.enemy.stats.maxHp = battle.enemy.stats.hp = 99999
  let burnApplied = null
  for (let i = 0; i < 10 && !burnApplied; i++) {
    submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
    burnApplied = battle.enemy.ailments.find((a) => a.id === 'burn')
  }
  check('火傷が付与される（スタック2軸管理）', Boolean(burnApplied),
    burnApplied ? `×${burnApplied.stacks}(${burnApplied.turns}T)` : '')
  check('火傷の継続ダメージログがある', battle.log.some((l) => l.text.includes('火傷で')))
}
{
  // 操作系（呪詛の連鎖）：状態異常スタック+2
  const weapon = makeWeapon({ element: 'fire', skillIds: ['fire_4_1', 'tome_2_5'] })
  const battle = createBattle({ jobId: 'swordsman', weapon, enemyId: 'goblin', seed: 7 })
  battle.player.stats.maxMp = battle.player.stats.mp = 999
  battle.player.stats.maxHp = battle.player.stats.hp = 9999
  battle.enemy.stats.maxHp = battle.enemy.stats.hp = 99999
  let burn = null
  for (let i = 0; i < 10 && !burn; i++) {
    battle.player.ailments = [] // 敵の混乱付与で行動が誤爆に化けるのを防ぐ（テスト都合）
    submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
    burn = battle.enemy.ailments.find((a) => a.id === 'burn')
  }
  if (burn) {
    const before = burn.stacks
    battle.player.ailments = []
    submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[1], manualTargetKey: 'ailment:burn' })
    const after = battle.enemy.ailments.find((a) => a.id === 'burn')
    check(`操作系で状態異常スタック+2（${before}→${after?.stacks}）`,
      after && (after.stacks === Math.min(5, before + 2)))
  } else {
    check('操作系テストの前提（火傷付与）', false)
  }
}
{
  // 解除系（手動選択）：豪剣の型で自分にSPD-10%が付く→浄化の光で手動解除
  const weapon = makeWeapon({ skillIds: ['greatsword_2_8', 'staff_1_5'] })
  const battle = createBattle({ jobId: 'swordsman', weapon, enemyId: 'goblin', seed: 3 })
  battle.player.stats.maxHp = battle.player.stats.hp = 9999
  submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
  const debuff = battle.player.mods.find((m) => m.amount < 0 && m.stat === 'spd')
  check('豪剣の型で自SPDデバフが付与される', Boolean(debuff))
  if (debuff) {
    submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[1], manualTargetKey: `mod:${debuff.uid}` })
    check('解除系（手動選択）でデバフが消える',
      !battle.player.mods.some((m) => m.uid === debuff.uid))
  }
  // 参照系の確認：弱体効果カウントが状態異常＋デバフ両方を数えることをAPIで確認
  battle.player.ailments.push({ id: 'burn', stacks: 1, turns: 2 })
  battle.player.mods.push({ uid: 99999, stat: 'atk', amount: -10, turns: 2, dispellable: true })
  const count = getWeakEffects(battle.player).length
  check(`参照系カウント：状態異常＋デバフの両方を数える（=${count}）`, count >= 2)
}
{
  // 状態異常耐性：フレイムリザードは火傷無効
  const weapon = makeWeapon({ element: 'fire', skillIds: ['fire_4_1'] })
  const battle = createBattle({ jobId: 'swordsman', weapon, enemyId: 'flameLizard', seed: 5 })
  battle.player.stats.maxMp = battle.player.stats.mp = 999
  battle.player.stats.maxHp = battle.player.stats.hp = 9999
  battle.enemy.stats.maxHp = battle.enemy.stats.hp = 99999
  for (let i = 0; i < 15; i++) {
    submitPlayerAction(battle, { type: 'skill', skillRef: weapon.skills[0] })
  }
  check('火傷無効の敵には火傷が付かない', !battle.enemy.ailments.some((a) => a.id === 'burn'))
}

// ============================================================
console.log('\n====== 5. 全職業×装備可能サンプル武器×全敵 自動戦闘 ======')
let battleCount = 0
const tally = { win: 0, lose: 0, draw: 0, weakHits: 0, resistHits: 0, crits: 0, ailments: 0, buffs: 0, debuffs: 0 }
let seed = 1000
for (const jobId of JOB_IDS) {
  const job = JOBS[jobId]
  const weapons = SAMPLE_WEAPONS.filter((w) => job.equipableWeaponTypes.includes(w.weaponType))
  for (const weapon of weapons) {
    for (const enemyId of ENEMY_IDS) {
      const battle = createBattle({ jobId, weapon, enemyId, seed: seed++ })
      runAutoBattle(battle, { maxTurns: 30 })
      battleCount++
      tally[battle.result] = (tally[battle.result] || 0) + 1
      for (const l of battle.log) {
        if (l.text.includes('弱点')) tally.weakHits++
        if (l.text.includes('耐性…')) tally.resistHits++
        if (l.kind === 'crit') tally.crits++
        if (l.kind === 'ailment') tally.ailments++
        if (l.kind === 'buff') tally.buffs++
        if (l.kind === 'debuff') tally.debuffs++
      }
    }
  }
}
console.log(`  戦闘数: ${battleCount}（勝${tally.win}/敗${tally.lose}/引分${tally.draw}）`)
console.log(`  弱点ヒット: ${tally.weakHits} / 耐性ヒット: ${tally.resistHits} / 会心: ${tally.crits}`)
console.log(`  状態異常イベント: ${tally.ailments} / バフ: ${tally.buffs} / デバフ: ${tally.debuffs}`)
check('全戦闘がエラーなく完走', battleCount === 100, `実際: ${battleCount}`)
check('属性相性（弱点）が発生している', tally.weakHits > 0)
check('属性相性（耐性）が発生している', tally.resistHits > 0)
check('会心が発生している', tally.crits > 0)
check('状態異常が発生している', tally.ailments > 0)
check('バフ/デバフが発生している', tally.buffs > 0 && tally.debuffs > 0)

// ============================================================
console.log('\n====== 結果 ======')
console.log(`✅ ${passCount}件成功 / ❌ ${failCount}件失敗`)
process.exit(failCount > 0 ? 1 : 0)
