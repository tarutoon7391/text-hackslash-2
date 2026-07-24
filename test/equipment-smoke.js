// 装備管理・抽出・移植のスモークテスト：node test/equipment-smoke.js で実行
// 1. 職業の武器種制限チェック（checkEquip）
// 2. 装備込みステータス合算（calcTotalStats。青天井%乗算＋会心率の100%上限）
// 3. 移植バリデーション（渋カーブ組の同種重複＝GDD 10.3／スキル重複）
// 4. 移植の適用（上書き・空き枠追加・元アイテム非破壊）

import { checkEquip, calcTotalStats } from '../src/systems/equipmentState.js'
import {
  validateEnchantTransplant,
  validateSkillTransplant,
  applySkillTransplant,
  applyEnchantTransplant,
} from '../src/systems/extractInventoryState.js'
import { calcJobStats } from '../src/data/jobs.js'

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
console.log('====== 1. 職業の武器種制限（GDD 8番） ======')
{
  const sword = { id: 'w1', slot: 'weapon', weaponType: 'sword' }
  const bow = { id: 'w2', slot: 'weapon', weaponType: 'bow' }
  const armor = { id: 'a1', slot: 'armor' }
  check('剣士は剣を装備できる', checkEquip({ jobId: 'swordsman', slotKey: 'weapon', item: sword }) === null)
  check('剣士は弓を装備できない', checkEquip({ jobId: 'swordsman', slotKey: 'weapon', item: bow }) !== null)
  check('狩人は弓を装備できる', checkEquip({ jobId: 'hunter', slotKey: 'weapon', item: bow }) === null)
  check('防具は武器スロットに入らない', checkEquip({ jobId: 'swordsman', slotKey: 'weapon', item: armor }) !== null)
  check('防具は防具スロットに入る', checkEquip({ jobId: 'swordsman', slotKey: 'armor', item: armor }) === null)
  check('アクセは両スロットに入る',
    checkEquip({ jobId: 'swordsman', slotKey: 'accessory1', item: { slot: 'accessory' } }) === null &&
    checkEquip({ jobId: 'swordsman', slotKey: 'accessory2', item: { slot: 'accessory' } }) === null)
}

// ============================================================
console.log('\n====== 2. 装備込みステータス合算 ======')
{
  // 剣士：MPのみ傾向low（40×0.8=32）、他はmid＝基準値そのまま（HP100/ATK20/DEF12/SPD10/会心10）
  const baseStats = calcJobStats('swordsman')
  const itemsById = {
    w1: { id: 'w1', slot: 'weapon', atk: 20, enchants: [{ enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 10 }] },
    a1: { id: 'a1', slot: 'armor', def: 5, hp: 10, enchants: [{ enchantId: 'hpPct', name: 'HP+%', kind: 'unlimited', value: 50 }] },
    c1: { id: 'c1', slot: 'accessory', hp: 3, mp: 4, enchants: [{ enchantId: 'critRatePct', name: '会心率+%', kind: 'capped', value: 95 }] },
  }
  const slots = { weapon: 'w1', armor: 'a1', accessory1: 'c1', accessory2: null }
  const total = calcTotalStats({ baseStats, slots, itemsById })
  check('ATK=(20+20)×1.10=44', total.atk === 44, `実際: ${total.atk}`)
  check('HP=(100+10+3)×1.50=170', total.hp === 170, `実際: ${total.hp}`)
  check('MP=32+4=36', total.mp === 36, `実際: ${total.mp}`)
  check('DEF=12+5=17', total.def === 17, `実際: ${total.def}`)
  check('SPD=10（装備なし）', total.spd === 10, `実際: ${total.spd}`)
  check('会心率は100%で頭打ち（10+95→100）', total.crit === 100, `実際: ${total.crit}`)
  // 空スロットだけの場合はベース値そのまま
  const bare = calcTotalStats({ baseStats, slots: { weapon: null, armor: null, accessory1: null, accessory2: null }, itemsById })
  check('未装備ならベース値そのまま', bare.hp === 100 && bare.atk === 20 && bare.crit === 10)
}

// ============================================================
console.log('\n====== 3. 移植バリデーション（GDD 10.3） ======')
{
  const item = {
    id: 'w1',
    slot: 'weapon',
    skills: [{ skillId: 'slash', plus: 0 }, { skillId: 'guard', plus: 1 }],
    enchants: [
      { enchantId: 'critRatePct', name: '会心率+%', kind: 'capped', value: 2 },
      { enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 5 },
    ],
  }
  const cappedDup = { enchantId: 'critRatePct', name: '会心率+%', kind: 'capped', value: 3 }
  const unlimitedDup = { enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 8 }

  check('渋カーブ組の同種重複は弾く（別枠に既存）',
    validateEnchantTransplant({ item, targetIndex: 2, entry: cappedDup }) !== null)
  check('渋カーブ組でも同じ枠への上書きは通る（同種1個のまま）',
    validateEnchantTransplant({ item, targetIndex: 0, entry: cappedDup }) === null)
  check('青天井組は移植で同種を重ねられる（単純加算）',
    validateEnchantTransplant({ item, targetIndex: 2, entry: unlimitedDup }) === null)

  check('同一スキルの重複移植は弾く',
    validateSkillTransplant({ item, targetIndex: 2, entry: { skillId: 'slash', plus: 2 } }) !== null)
  check('同じ枠へのスキル上書きは通る',
    validateSkillTransplant({ item, targetIndex: 0, entry: { skillId: 'slash', plus: 2 } }) === null)
  check('別スキルの移植は通る',
    validateSkillTransplant({ item, targetIndex: 0, entry: { skillId: 'thrust', plus: 0 } }) === null)
}

// ============================================================
console.log('\n====== 4. 移植の適用 ======')
{
  const item = {
    id: 'w1',
    slot: 'weapon',
    skills: [{ skillId: 'slash', plus: 0 }],
    enchants: [{ enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 5 }],
  }

  // 既存枠への上書き：元のスキルは消滅して置き換わる
  const overwritten = applySkillTransplant({ item, targetIndex: 0, entry: { extractId: 'ext_1', skillId: 'thrust', plus: 2 } })
  check('スキル上書き：枠0が置き換わる', overwritten.skills[0].skillId === 'thrust' && overwritten.skills[0].plus === 2)
  check('スキル上書き：枠数は増えない', overwritten.skills.length === 1)
  check('元アイテムは変更されない（イミュータブル）', item.skills[0].skillId === 'slash')

  // 空き枠への追加
  const appended = applySkillTransplant({ item, targetIndex: 2, entry: { extractId: 'ext_2', skillId: 'guard', plus: 0 } })
  check('スキル空き枠：末尾に追加される', appended.skills.length === 2 && appended.skills[1].skillId === 'guard')

  // エンチャント：+値・数値を保持したまま移植され、extractIdは持ち込まれない
  const enchanted = applyEnchantTransplant({
    item,
    targetIndex: 1,
    entry: { extractId: 'ext_3', enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 8 },
  })
  check('エンチャント空き枠：数値を保持して追加', enchanted.enchants[1].value === 8)
  check('青天井組の重ね積み：同種2個が並ぶ',
    enchanted.enchants.filter((e) => e.enchantId === 'atkPct').length === 2)
  check('移植後のエンチャントにextractIdが残らない', !('extractId' in enchanted.enchants[1]))
}

// ============================================================
console.log('\n============================================')
console.log(`結果: ✅ ${passCount} / ❌ ${failCount}`)
if (failCount > 0) process.exit(1)
console.log('装備管理・抽出・移植スモークテスト全通過！')
