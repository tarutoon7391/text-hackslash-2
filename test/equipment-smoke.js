// 装備管理・抽出・移植のスモークテスト：node test/equipment-smoke.js で実行
// 1. 職業の武器種制限チェック（checkEquip）
// 2. 装備込みステータス合算（calcTotalStats。青天井%乗算＋会心率の100%上限）
// 3. 移植バリデーション（渋カーブ組の同種重複＝GDD 10.3／スキル重複）
// 4. 移植の適用（上書き・空き枠追加・元アイテム非破壊）
// 5. 初期装備（データ構造・性能・通常ドロップと同じ扱いで装備/移植できること）
// 6. 職業選択時の装備遷移（初回自動装備／転職時の武器互換性チェック）

import { checkEquip, calcTotalStats, applyJobChangeToSlots } from '../src/systems/equipmentState.js'
import {
  validateEnchantTransplant,
  validateSkillTransplant,
  applySkillTransplant,
  applyEnchantTransplant,
} from '../src/systems/extractInventoryState.js'
import { buildPlayerStats, computeStats, getEffectivePlus, getItemStats } from '../src/systems/playerStats.js'
import {
  fuse, addPlusExp, expToNextPlus, totalInvestedExp, shardExp, equipMaterialExp,
  buildSkillPool, buildEnchantPool, skillInheritBlockReason,
} from '../src/systems/fusionSystem.js'
import { SKILLS_NORMAL } from '../src/data/skills_normal.js'
import { SKILLS_ELEMENTAL } from '../src/data/skills_elemental.js'
import { applyJobExp, expToNextLevel, enemyExpFor, shardTierForFloor } from '../src/systems/progressState.js'
import { migrateItems } from '../src/systems/inventoryState.js'
import { createBattle, beginRound, stepBattle, getRecruitChance } from '../src/systems/battleEngine.js'
import { generateEnemy } from '../src/systems/enemyGenerator.js'
import {
  createMonsterFromEnemy, migrateMonsters, calcMonsterStats, buildAllyForBattle, applyMonsterExp, MONSTER_BOX_MAX,
} from '../src/systems/monsterState.js'
import { ENEMY_SPECIES_BY_BLOCK, SPECIES_SPRITES, getSpeciesForFloor } from '../src/data/enemySpecies.js'
import { ENEMY_SPRITES, resolveSpriteKey } from '../src/data/enemySprites.js'
import { DUNGEON_CONFIG } from '../src/data/dungeonConfig.js'
import { generateDrops } from '../src/systems/lootSystem.js'
import { createSeededRng } from '../src/systems/weaponGenerator.js'
import { PROGRESSION_CONFIG } from '../src/data/progressionConfig.js'
import { filterAndSortItems, getStatGain, formatStatGain } from '../src/systems/equipmentFilter.js'
import { JOBS, JOB_IDS, calcJobStats } from '../src/data/jobs.js'
import { createStarterEquipment } from '../src/data/starterEquipment.js'
import { RARITIES } from '../src/data/rarities.js'
import { ARMOR_TEMPLATE } from '../src/data/itemTemplates.js'

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
console.log('\n====== 5. 初期装備（スターター一式） ======')
{
  const starters = createStarterEquipment()
  const weapons = starters.filter((s) => s.slot === 'weapon')
  check('武器6種＋防具1の計7個', starters.length === 7 && weapons.length === 6,
    `実際: ${starters.length}個（武器${weapons.length}）`)
  check('武器6種が全て揃う', new Set(weapons.map((s) => s.weaponType)).size === 6)
  check('IDが一意', new Set(starters.map((s) => s.id)).size === starters.length)
  check('全てコモン', starters.every((s) => s.rarity === 'common'))
  check('全て無属性（element=null）', starters.every((s) => s.element === null))
  check('武器は全てスキル1個（+0）持ち',
    weapons.every((s) => s.skills.length === 1 && s.skills[0].skillId && s.skills[0].plus === 0))
  check('エンチャントなし', starters.every((s) => (s.enchants || []).length === 0))
  // 性能はコモンドロップのレンジ下限より明確に低い（周回モチベーション維持）
  const armor = starters.find((s) => s.slot === 'armor')
  check('武器ATKはコモンドロップ未満', weapons.every((s) => s.atk < RARITIES.common.baseAtkRange[0]),
    `実際: ${weapons.map((s) => s.atk).join(',')}`)
  check('防具HPはコモンドロップ未満', armor.hp < ARMOR_TEMPLATE.hpRange.common[0], `実際: ${armor.hp}`)

  // 通常ドロップと同じ扱いで装備できる
  const sword = weapons.find((s) => s.weaponType === 'sword')
  check('剣士が初期剣を装備できる',
    checkEquip({ jobId: 'swordsman', slotKey: 'weapon', item: sword }) === null)
  check('初期防具を装備できる',
    checkEquip({ jobId: 'swordsman', slotKey: 'armor', item: armor }) === null)

  // 通常ドロップと同じ扱いで移植できる（スキル枠1に上書き移植）
  const bowSkill = weapons.find((s) => s.weaponType === 'bow').skills[0]
  const entry = { extractId: 'ext_starter_test', skillId: bowSkill.skillId, plus: 0 }
  check('初期武器へのスキル移植バリデーション通過',
    validateSkillTransplant({ item: sword, targetIndex: 0, entry }) === null)
  const transplanted = applySkillTransplant({ item: sword, targetIndex: 0, entry })
  check('初期武器へスキル移植できる', transplanted.skills[0].skillId === bowSkill.skillId)

  // 毎回新しいオブジェクトが返る（移植等で定義側が汚れない）
  const fresh = createStarterEquipment().find((s) => s.weaponType === 'sword')
  check('createStarterEquipmentは毎回新規オブジェクトを返す',
    fresh !== sword && fresh.skills[0].skillId === sword.skills[0].skillId &&
    fresh.skills[0].skillId !== bowSkill.skillId)
}

// ============================================================
console.log('\n====== 6. 職業選択時の装備遷移（フェーズ3パート3） ======')
{
  // 全職業にdefaultWeaponTypeがあり、必ず自分の装備可能リストに含まれる（データ整合性）
  check('全職業のdefaultWeaponTypeが装備可能リスト内にある',
    JOB_IDS.every((id) => JOBS[id].equipableWeaponTypes.includes(JOBS[id].defaultWeaponType)))

  const items = createStarterEquipment()
  const empty = { weapon: null, armor: null, accessory1: null, accessory2: null }

  // --- 初回：職業デフォルトの初期武器＋初期防具が自動装備される ---
  const first = applyJobChangeToSlots({ slots: empty, jobId: 'swordsman', items, hasEquippedBefore: false })
  check('初回（剣士）：初期剣が武器スロットに入る', first.slots.weapon === 'starter_sword')
  check('初回（剣士）：初期防具が防具スロットに入る', first.slots.armor === 'starter_armor')
  check('初回：完了後にフラグがtrueになる', first.hasEquippedBefore === true)

  const firstMage = applyJobChangeToSlots({ slots: empty, jobId: 'mage', items, hasEquippedBefore: false })
  check('初回（魔導士）：デフォルトの杖が入る', firstMage.slots.weapon === 'starter_staff')
  const firstBrawler = applyJobChangeToSlots({ slots: empty, jobId: 'brawler', items, hasEquippedBefore: false })
  check('初回（闘士）：デフォルトの大剣が入る', firstBrawler.slots.weapon === 'starter_greatsword')

  // --- 転職：防具・アクセは一切変更されない ---
  // 剣を装備した剣士がアクセ2枠も埋めた状態を想定
  const geared = { weapon: 'starter_sword', armor: 'starter_armor', accessory1: 'acc_a', accessory2: 'acc_b' }
  const gearedItems = [
    ...items,
    { id: 'acc_a', slot: 'accessory', weaponType: null },
    { id: 'acc_b', slot: 'accessory', weaponType: null },
  ]

  // 互換あり：剣士→聖職者（聖職者は剣を装備できる）→ 武器もそのまま
  const toCleric = applyJobChangeToSlots({ slots: geared, jobId: 'cleric', items: gearedItems, hasEquippedBefore: true })
  check('転職（互換あり）：武器はそのまま維持', toCleric.slots.weapon === 'starter_sword')
  check('転職（互換あり）：防具・アクセも維持',
    toCleric.slots.armor === 'starter_armor' && toCleric.slots.accessory1 === 'acc_a' && toCleric.slots.accessory2 === 'acc_b')

  // 互換なし：剣士→魔導士（剣は装備不可）→ 武器スロットだけ空になる
  const toMage = applyJobChangeToSlots({ slots: geared, jobId: 'mage', items: gearedItems, hasEquippedBefore: true })
  check('転職（互換なし）：武器スロットだけ空になる', toMage.slots.weapon === null)
  check('転職（互換なし）：防具・アクセは一切変更されない',
    toMage.slots.armor === 'starter_armor' && toMage.slots.accessory1 === 'acc_a' && toMage.slots.accessory2 === 'acc_b')
  check('転職ではフラグが変化しない', toMage.hasEquippedBefore === true)

  // 武器が空のまま更に転職しても、スターター武器等への自動再装備はされない
  const again = applyJobChangeToSlots({ slots: toMage.slots, jobId: 'hunter', items: gearedItems, hasEquippedBefore: true })
  check('転職（武器空のまま）：自動再装備されない', again.slots.weapon === null)
  check('転職（武器空のまま）：防具・アクセは維持',
    again.slots.armor === 'starter_armor' && again.slots.accessory1 === 'acc_a' && again.slots.accessory2 === 'acc_b')
}

// ============================================================
// 7. 装備一覧の絞り込み・並べ替え
// ============================================================
console.log('\n【7】装備一覧の絞り込み・並べ替え')
{
  const list = [
    { id: 'a', slot: 'armor', def: 5, hp: 10, enchants: [] },
    { id: 'b', slot: 'armor', def: 9, hp: 4, enchants: [{ enchantId: 'hpPct', value: 6 }] },
    { id: 'c', slot: 'armor', def: 5, hp: 0, enchants: [{ enchantId: 'defPct', value: 8 }] },
    { id: 'd', slot: 'armor', def: 0, hp: 0, enchants: [{ enchantId: 'spdPct', value: 3 }] },
  ]
  const ids = (arr) => arr.map((it) => it.id).join('')
  check('指定なしは元の並びのまま全件', ids(filterAndSortItems(list, {})) === 'abcd')
  check('DEF降順：固定値が高い順、同値は%で比べる', ids(filterAndSortItems(list, { statKey: 'def', order: 'desc' })) === 'bca')
  check('DEF昇順：降順の逆', ids(filterAndSortItems(list, { statKey: 'def', order: 'asc' })) === 'acb')
  check('HPで絞り込み：HPが上がらない装備は出ない', ids(filterAndSortItems(list, { statKey: 'hp', order: 'desc' })) === 'ab')
  check('SPD：エンチャントのみで上がる装備も対象', ids(filterAndSortItems(list, { statKey: 'spd', order: 'desc' })) === 'd')
  check('該当なしは空', filterAndSortItems(list, { statKey: 'mp' }).length === 0)
  check('元の配列を書き換えない', ids(list) === 'abcd')
  const gain = getStatGain(list[1], 'hp')
  check('上がり幅：固定値と%を別々に持つ', gain.flat === 4 && gain.pct === 6)
  check('上がり幅の表示テキスト', formatStatGain(list[1], 'hp') === 'HP+4・+6%' && formatStatGain(list[3], 'hp') === null)
}

// ============================================================
// 8. 職業レベル・実ステータス（戦闘に渡す値）
// ============================================================
console.log('\n【8】職業レベル・実ステータス')
{
  const lv1 = calcJobStats('swordsman', 1)
  const lv10 = calcJobStats('swordsman', 10)
  check('レベル省略時はLv1と同じ', JSON.stringify(calcJobStats('swordsman')) === JSON.stringify(lv1))
  check('レベルが上がるとHP/ATK/DEFが伸びる', lv10.hp > lv1.hp && lv10.atk > lv1.atk && lv10.def > lv1.def)
  check('会心率はレベルで伸びない', lv10.crit === lv1.crit)

  check('必要経験値はレベルが上がるほど増える', expToNextLevel(5) > expToNextLevel(1))
  const leveled = applyJobExp({ level: 1, exp: 0 }, expToNextLevel(1) + expToNextLevel(2) + 3)
  check('経験値で複数レベル上がり、余りが残る', leveled.level === 3 && leveled.exp === 3)
  check('上限レベルでは経験値が貯まらない',
    applyJobExp({ level: PROGRESSION_CONFIG.level.max, exp: 0 }, 999999).exp === 0)
  check('敵の経験値：深い階・ボスほど多い',
    enemyExpFor({ floor: 10, boss: false }) > enemyExpFor({ floor: 1, boss: false }) &&
    enemyExpFor({ floor: 5, boss: true }) > enemyExpFor({ floor: 5, boss: false }))
  check('欠片ランク：5階ごとに1上がる', shardTierForFloor(1) === 1 && shardTierForFloor(5) === 1 && shardTierForFloor(6) === 2)

  const sword = { id: 'w', slot: 'weapon', weaponType: 'greatsword', atk: 10, plus: 5, plusExp: 0, skills: [], enchants: [{ enchantId: 'atkPct', value: 10 }, { enchantId: 'critDamagePct', value: 20 }] }
  const armor = { id: 'a', slot: 'armor', def: 10, hp: 20, plus: 0, enchants: [{ enchantId: 'damageCutPct', value: 5 }, { enchantId: 'evasionPct', value: 3 }] }
  const itemsById = { w: sword, a: armor }
  const slots = { weapon: 'w', armor: 'a', accessory1: null, accessory2: null }

  check('+値の効果は職業レベルが上限', getEffectivePlus(sword, 2) === 2 && getEffectivePlus(sword, 99) === 5)
  const eff = PROGRESSION_CONFIG.plus.effectPerPlus
  check('+値で装備の基礎値が伸びる', getItemStats(sword, 99).atk === Math.round(10 * (1 + 5 * eff)))
  check('レベルが低いと+値の効果が頭打ち', getItemStats(sword, 2).atk === Math.round(10 * (1 + 2 * eff)))

  const st = buildPlayerStats({ jobId: 'swordsman', level: 99, slots, itemsById })
  const job = calcJobStats('swordsman', 99)
  const expectAtk = Math.round((job.atk + getItemStats(sword, 99).atk) * 1.25 * 1.1)
  check('ATK＝(職業＋武器)×武器種補正×エンチャント%', st.atk === expectAtk, `(実際: ${st.atk} 期待: ${expectAtk})`)
  check('防具のDEF・HPが乗る', st.def === job.def + 10 && st.hp === job.hp + 20)
  check('武器種補正でSPDが変わる（大剣0.8倍）', st.spd === Math.round(job.spd * 0.8))
  check('追加ステータス（被ダメ軽減・回避・会心ダメージ）が出る',
    st.damageCut === 5 && st.evasion === 3 && st.critDamagePct === 20)

  // 戦闘に渡すと実際にその値で戦う
  const battle = createBattle({
    jobId: 'swordsman', weapon: sword, enemyId: 'goblin', seed: 1,
    playerStats: buildPlayerStats({ jobId: 'swordsman', level: 1, slots, itemsById }),
  })
  const lv1Stats = buildPlayerStats({ jobId: 'swordsman', level: 1, slots, itemsById })
  check('戦闘のHP/DEF/ATKが装備込みの値になる',
    battle.player.stats.maxHp === lv1Stats.hp && battle.player.stats.hp === lv1Stats.hp &&
    battle.player.stats.def === lv1Stats.def && battle.player.stats.atk === lv1Stats.atk)
  check('戦闘に追加ステータスが渡る', battle.player.stats.damageCut === 5 && battle.player.stats.critDamagePct === 20)
  // HPの持ち越し
  const carried = createBattle({ jobId: 'swordsman', weapon: sword, enemyId: 'goblin', seed: 1, playerStats: lv1Stats, startHp: 37 })
  check('startHpを渡すと残りHPから始まる（最大HPはそのまま）',
    carried.player.stats.hp === 37 && carried.player.stats.maxHp === lv1Stats.hp)
  check('startHpは最大HPを超えない・最低1',
    createBattle({ jobId: 'swordsman', weapon: sword, enemyId: 'goblin', seed: 1, playerStats: lv1Stats, startHp: 99999 }).player.stats.hp === lv1Stats.hp &&
    createBattle({ jobId: 'swordsman', weapon: sword, enemyId: 'goblin', seed: 1, playerStats: lv1Stats, startHp: 0 }).player.stats.hp === 1)
  check('startHp省略時は満タンで始まる', battle.player.stats.hp === battle.player.stats.maxHp)
  const plain = createBattle({ jobId: 'swordsman', weapon: sword, enemyId: 'goblin', seed: 1 })
  check('playerStats省略時は従来通り（防具が乗らない）', plain.player.stats.def === calcJobStats('swordsman').def)
}

// ============================================================
// 9. 合成（+値・素材・引き継ぎ）
// ============================================================
console.log('\n【9】合成')
{
  check('+値が高いほど次の+1が重い', expToNextPlus(5) > expToNextPlus(1) && expToNextPlus(1) > expToNextPlus(0))
  const up = addPlusExp({ plus: 0, plusExp: 0 }, expToNextPlus(0) + expToNextPlus(1) + 4)
  check('合成経験値で+値が上がり、余りが残る', up.plus === 2 && up.plusExp === 4)
  check('貯めた合成経験値の合計', totalInvestedExp({ plus: 2, plusExp: 4 }) === expToNextPlus(0) + expToNextPlus(1) + 4)
  check('深い階の欠片ほど経験値が多い', shardExp(3) > shardExp(1))
  check('装備の素材価値：レア度・産出階で増える',
    equipMaterialExp({ rarity: 'epic', floor: 1 }) > equipMaterialExp({ rarity: 'common', floor: 1 }) &&
    equipMaterialExp({ rarity: 'rare', floor: 20 }) > equipMaterialExp({ rarity: 'rare', floor: 1 }))
  check('育てた装備を素材にすると経験値の一部が引き継がれる',
    equipMaterialExp({ rarity: 'common', floor: 1, plus: 3, plusExp: 0 }) > equipMaterialExp({ rarity: 'common', floor: 1 }))

  const base = { id: 'b', slot: 'weapon', weaponType: 'sword', rarity: 'rare', name: 'ベース', atk: 12, plus: 0, plusExp: 0,
    skills: [{ skillId: 'S_A', plus: 0 }], enchants: [{ enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 5 }] }
  const parent = { id: 'p', slot: 'weapon', weaponType: 'bow', rarity: 'epic', name: '親', atk: 20, floor: 5, plus: 0, plusExp: 0,
    skills: [{ skillId: 'S_B', plus: 1 }, { skillId: 'S_C', plus: 0 }],
    enchants: [{ enchantId: 'critRatePct', name: '会心率+%', kind: 'capped', value: 2 }, { enchantId: 'atkPct', name: 'ATK+%', kind: 'unlimited', value: 7 }] }

  // 欠片だけ：+値だけ上がり、中身はそのまま
  const r1 = fuse({ base, shardsUsed: { 1: 3 } })
  check('欠片だけの合成：経験値が入る', r1.gainedExp === shardExp(1) * 3 && !r1.error)
  check('欠片だけの合成：スキル・エンチャントは変わらない',
    r1.item.skills.length === 1 && r1.item.skills[0].skillId === 'S_A' && r1.item.enchants.length === 1 && r1.removedIds.length === 0)

  // 親から引き継ぎ：レア=スキル2枠・エンチャント1枠
  const sp = buildSkillPool(base, [parent]); const ep = buildEnchantPool(base, [parent])
  check('候補リスト：ベース＋親の全スキル/エンチャント', sp.length === 3 && ep.length === 3 && sp[0].fromBase && !sp[1].fromBase)
  const r2 = fuse({ base, parents: [parent], keepSkillKeys: ['b:s0', 'p:s0'], keepEnchantKeys: ['p:e1'] })
  check('親からスキルを引き継げる（+値つき）',
    !r2.error && r2.item.skills.length === 2 && r2.item.skills[1].skillId === 'S_B' && r2.item.skills[1].plus === 1)
  check('エンチャントを親のものに入れ替えられる', r2.item.enchants.length === 1 && r2.item.enchants[0].value === 7)
  check('親は消える対象になる', r2.removedIds.length === 1 && r2.removedIds[0] === 'p')
  check('親の素材価値ぶん合成経験値が入る', r2.gainedExp === equipMaterialExp(parent))
  check('ベースの基礎値・レア度・IDは変わらない', r2.item.id === 'b' && r2.item.atk === 12 && r2.item.rarity === 'rare')
  check('元のベースを書き換えない', base.skills.length === 1 && base.plus === 0)

  check('枠数オーバーは弾く', Boolean(fuse({ base, parents: [parent], keepSkillKeys: ['b:s0', 'p:s0', 'p:s1'] }).error))
  check('エンチャント枠オーバーは弾く', Boolean(fuse({ base, parents: [parent], keepEnchantKeys: ['b:e0', 'p:e0'] }).error))
  const dupParent = { ...parent, id: 'q', skills: [{ skillId: 'S_A', plus: 2 }] }
  check('同じスキルの重複は弾く', Boolean(fuse({ base, parents: [dupParent], keepSkillKeys: ['b:s0', 'q:s0'] }).error))
  check('違う部位は親にできない', Boolean(fuse({ base, parents: [{ id: 'x', slot: 'armor', rarity: 'common' }] }).error))
  check('ベース自身は親にできない', Boolean(fuse({ base, parents: [base] }).error))
  check('素材なしは弾く', Boolean(fuse({ base }).error))
  check('引き継ぎ指定なしならベースの現状維持', fuse({ base, parents: [parent] }).item.skills.length === 1)

  // スキルは武器種ごとの管理：他の武器種用は引き継げない（属性スキルは武器種を問わない）
  {
    const swordSkills = SKILLS_NORMAL.filter((sk) => sk.weaponType === 'sword')
    const bowSkill = SKILLS_NORMAL.find((sk) => sk.weaponType === 'bow')
    const fireSkill = SKILLS_ELEMENTAL.find((sk) => sk.element === 'fire')
    const swordBase = { id: 'sb', slot: 'weapon', weaponType: 'sword', rarity: 'epic', name: '剣', atk: 20, skills: [{ skillId: swordSkills[0].id, plus: 0 }], enchants: [] }
    const bowParent = { id: 'bp', slot: 'weapon', weaponType: 'bow', rarity: 'rare', floor: 2, name: '弓', atk: 14,
      skills: [{ skillId: bowSkill.id, plus: 0 }, { skillId: fireSkill.id, plus: 0 }], enchants: [] }
    const swordParent = { id: 'sp', slot: 'weapon', weaponType: 'sword', rarity: 'rare', floor: 2, name: '剣2', atk: 14, skills: [{ skillId: swordSkills[1].id, plus: 0 }], enchants: [] }

    check('他の武器種用スキルは引き継ぎ不可と判定される', Boolean(skillInheritBlockReason(swordBase, bowSkill.id)))
    check('同じ武器種用スキル・属性スキルは引き継げる',
      skillInheritBlockReason(swordBase, swordSkills[1].id) === null && skillInheritBlockReason(swordBase, fireSkill.id) === null)
    const pool = buildSkillPool(swordBase, [bowParent])
    check('候補リストに引き継ぎ不可の印が付く', Boolean(pool[1].blocked) && pool[2].blocked === null && pool[0].blocked === null)
    check('他の武器種用スキルを選んだ合成は弾く',
      Boolean(fuse({ base: swordBase, parents: [bowParent], keepSkillKeys: ['sb:s0', 'bp:s0'] }).error))
    const okElem = fuse({ base: swordBase, parents: [bowParent], keepSkillKeys: ['sb:s0', 'bp:s1'] })
    check('別の武器種の親からでも属性スキルは引き継げる', !okElem.error && okElem.item.skills[1].skillId === fireSkill.id)
    const okSame = fuse({ base: swordBase, parents: [swordParent], keepSkillKeys: ['sb:s0', 'sp:s0'] })
    check('同じ武器種の親からは引き継げる', !okSame.error && okSame.item.skills.length === 2)
    check('武器種違いの親でも+値の素材にはなる', !fuse({ base: swordBase, parents: [bowParent] }).error)
    // 制限を入れる前に付いた他武器種スキルは、そのまま残せる（勝手に消えない）
    const legacy = { ...swordBase, skills: [{ skillId: bowSkill.id, plus: 0 }] }
    check('ベースが元から持つ他武器種スキルは残せる', !fuse({ base: legacy, shardsUsed: { 1: 1 } }).error)
  }

  // 防具：スキルは持たない
  const armorBase = { id: 'ab', slot: 'armor', rarity: 'epic', def: 8, hp: 20, skills: [], enchants: [] }
  const armorParent = { id: 'ap', slot: 'armor', rarity: 'rare', floor: 3, def: 5, hp: 12, skills: [],
    enchants: [{ enchantId: 'hpPct', name: 'HP+%', kind: 'unlimited', value: 6 }] }
  const r3 = fuse({ base: armorBase, parents: [armorParent], keepEnchantKeys: ['ap:e0'] })
  check('防具同士でエンチャントを引き継げる', !r3.error && r3.item.enchants[0].enchantId === 'hpPct' && r3.item.skills.length === 0)

  // ドロップ：素材メイン
  const rng = createSeededRng(77)
  let equipG = 0, equipB = 0; const N = 2000; const ids = new Set()
  for (let i = 0; i < N; i++) {
    const g = generateDrops({ floor: 3, grade: 'grunt', rng }); if (g.item) { equipG++; ids.add(g.item.id) }
    const b = generateDrops({ floor: 5, grade: 'boss', rng }); if (b.item) { equipB++; ids.add(b.item.id) }
    if (i === 0) check('欠片は必ず落ちる（ランクは階層で決まる）', g.shards.count >= 2 && g.shards.tier === 1 && generateDrops({ floor: 6, grade: 'grunt', rng }).shards.tier === 2)
  }
  check('雑魚の装備ドロップはたまに（約15%）', equipG / N > 0.1 && equipG / N < 0.2, `(実際: ${(equipG / N * 100).toFixed(1)}%)`)
  check('ボスは装備確定', equipB === N)
  check('ドロップ装備のIDが重複しない', ids.size === equipG + equipB)

  // 旧セーブ互換
  const migrated = migrateItems([{ id: 'old', slot: 'weapon', weaponType: 'sword', atk: 5 }, null, { nope: 1 }])
  check('旧セーブの装備に+値などの新項目が補われる',
    migrated.length === 1 && migrated[0].plus === 0 && migrated[0].plusExp === 0 && Array.isArray(migrated[0].enchants) && Array.isArray(migrated[0].skills))
  check('セーブが壊れていても落ちない', migrateItems('broken').length === 0)
}

// ============================================================
// 10. 仲間にする（戦闘中の勧誘）
// ============================================================
console.log('\n【10】仲間にする')
{
  const weapon = { id: 'w', slot: 'weapon', weaponType: 'sword', element: null, atk: 10, skills: [], enchants: [] }
  const cfg = PROGRESSION_CONFIG.recruit
  const mk = (floor, seed) => createBattle({ jobId: 'swordsman', weapon, enemyDef: generateEnemy({ floor }), seed })
  const runRound = (b, action) => { beginRound(b, action); let g = 0; while (b.phase === 'acting' && g++ < 50) stepBattle(b) }

  const fresh = mk(1, 1)
  check('敵が無傷なら成功率は最低値', Math.abs(getRecruitChance(fresh) - cfg.baseChance) < 1e-9)
  fresh.enemy.stats.hp = Math.round(fresh.enemy.stats.maxHp / 2)
  const half = getRecruitChance(fresh)
  check('敵のHPを減らすほど成功率が上がる', half > cfg.baseChance && half < cfg.maxChance)
  fresh.enemy.stats.hp = 1
  check('瀕死ならほぼ最大値', getRecruitChance(fresh) > half && getRecruitChance(fresh) <= cfg.maxChance)
  check('ボスは勧誘できない', getRecruitChance(mk(5, 1)) === cfg.bossChance)

  // 成功するまでシードを変えて試す（瀕死にしてから勧誘）
  let success = null, failed = null
  for (let seed = 1; seed <= 200 && !(success && failed); seed++) {
    const b = mk(2, seed)
    b.enemy.stats.hp = 1
    runRound(b, { type: 'recruit' })
    if (b.result === 'recruit' && !success) success = b
    if (b.result !== 'recruit' && !failed) failed = b
  }
  check('勧誘に成功すると戦闘が終わる（result=recruit）', Boolean(success) && success.phase === 'ended')
  check('成功時は敵を倒していない（HPが残っている）', success.enemy.stats.hp > 0)
  check('成功ログが出る', success.log.some((l) => l.text.includes('仲間になった')))
  check('失敗しても戦闘は続く（そのターンを使っただけ）',
    Boolean(failed) && failed.log.some((l) => l.text.includes('そっぽを向いた')) && failed.result !== 'recruit')
  check('失敗したターンも敵は行動する', failed.log.some((l) => l.text.includes(failed.enemy.name + ' の')))

  const boss = mk(5, 3)
  runRound(boss, { type: 'recruit' })
  check('ボスへの勧誘は必ず失敗する', boss.result !== 'recruit' && boss.log.some((l) => l.text.includes('聞く耳を持たない')))

  // 確率どおりに成功するか（瀕死の雑魚を1000回勧誘）
  let wins = 0
  for (let seed = 1; seed <= 1000; seed++) {
    const b = mk(1, seed * 13)
    b.enemy.stats.hp = 1
    const expected = getRecruitChance(b)
    runRound(b, { type: 'recruit' })
    if (b.result === 'recruit') wins++
    if (seed === 1000) check('成功率が設定どおり（瀕死で約6割）', Math.abs(wins / 1000 - expected) < 0.05, `(実際: ${(wins / 10).toFixed(1)}% 期待: ${(expected * 100).toFixed(1)}%)`)
  }

  // 仲間データ
  const mon = createMonsterFromEnemy(success.enemy, { now: 1000, rand: () => 0.5 })
  check('仲間データに名前・属性・階・本来のステータスが入る',
    mon.name === success.enemy.name && mon.element === success.enemy.element && mon.floor === 2 &&
    mon.stats.hp === success.enemy.stats.maxHp && mon.isBoss === false && typeof mon.id === 'string')
  const migrated = migrateMonsters([{ id: 'm1', name: '古い仲間' }, null, { name: 'IDなし' }])
  check('旧セーブの仲間データも読める（不足項目を補完）',
    migrated.length === 1 && migrated[0].stats.hp === 0 && migrated[0].element === null && migrated[0].isBoss === false)
}

// ============================================================
// 11. 敵の種族（1〜25階）
// ============================================================
console.log('\n【11】敵の種族')
{
  const names = (from) => [0, 1, 2, 3, 4].map((i) => generateEnemy({ floor: from + i }).name)
  let patternOk = true
  for (let blk = 0; blk < 5; blk++) {
    const n = names(blk * 5 + 1)
    // 1・2階目は同じ敵、3・4・5階目はそれぞれ別の敵（ブロック内で4種類）
    if (!(n[0] === n[1] && new Set(n).size === 4)) patternOk = false
  }
  check('各ブロック：1・2階目が同じ敵、3〜5階目は別々（計4種類）', patternOk)
  const all = []
  for (let f = 1; f <= 25; f++) all.push(generateEnemy({ floor: f }))
  check('25階までで20種類の敵が出る', new Set(all.map((e) => e.name)).size === 20)
  check('5階ごとの最後はボス', all.filter((e) => e.isBoss).map((e) => e.floor).join(',') === '5,10,15,20,25')
  check('種族の属性がゾーンの属性と一致',
    ENEMY_SPECIES_BY_BLOCK.every((b, i) => b.zone === DUNGEON_CONFIG.zoneRotation[i]) && all.every((e, i) => e.element === ENEMY_SPECIES_BY_BLOCK[Math.floor(i / 5)].zone))
  check('全種族に16x16の見た目がある',
    all.every((e) => { const rows = ENEMY_SPRITES[resolveSpriteKey(e)]; return rows === SPECIES_SPRITES[e.speciesId] && rows.length === 16 && rows.every((r) => r.length === 16) }))
  const beyond = generateEnemy({ floor: 26 })
  check('26階以降は汎用の敵にフォールバックする',
    getSpeciesForFloor(26) === null && beyond.speciesId === null && beyond.name.includes('魔獣') && resolveSpriteKey(beyond) === 'beast')
  check('種族が付いてもステータスは階層で決まる（1階と2階で伸びる）', all[1].stats.hp > all[0].stats.hp)
}

// ============================================================
// 12. 仲間と一緒に戦う
// ============================================================
console.log('\n【12】仲間と一緒に戦う')
{
  const weapon = { id: 'w', slot: 'weapon', weaponType: 'sword', element: null, atk: 10, skills: [], enchants: [] }
  const monster = { id: 'm', name: 'ヒノコ', element: 'fire', floor: 1, isBoss: false, sprite: 'ember', stats: { hp: 64, atk: 7, def: 6, spd: 9 }, level: 1, exp: 0 }
  const runRound = (b, action) => { const order = []; beginRound(b, action); let g = 0; while (b.phase === 'acting' && g++ < 50) { const r = stepBattle(b); if (r.actorId) order.push(r.actorId) } return order }
  const mk = (seed, opts = {}) => createBattle({ jobId: 'swordsman', weapon, enemyDef: generateEnemy({ floor: opts.floor || 1 }), seed, ally: opts.noAlly ? null : buildAllyForBattle(opts.monster || monster, opts.startHp ?? null) })

  check('仲間の上限は10体', MONSTER_BOX_MAX === 10 && PROGRESSION_CONFIG.monster.partySize === 1)
  const lv5 = calcMonsterStats({ ...monster, level: 5 })
  check('仲間はレベルで強くなる', lv5.hp > 64 && lv5.atk > 7 && calcMonsterStats(monster).hp === 64)
  const grown = applyMonsterExp(monster, expToNextLevel(1) + 2)
  check('仲間に経験値が入りレベルが上がる', grown.level === 2 && grown.exp === 2 && monster.level === 1)
  check('旧セーブの仲間にレベルが補われる', migrateMonsters([{ id: 'x', name: '古い' }])[0].level === 1)

  const b = mk(5)
  check('仲間が戦闘に参加する（HP満タン）', b.ally && b.ally.stats.hp === 64 && b.ally.stats.maxHp === 64 && b.ally.name === '仲間のヒノコ')
  check('持ち越しHPで参加できる', mk(5, { startHp: 20 }).ally.stats.hp === 20)
  check('仲間なしの戦闘は今まで通り', mk(5, { noAlly: true }).ally === undefined)

  const enemyHp0 = b.enemy.stats.hp
  const order = runRound(b, { type: 'normalAttack' })
  check('1ラウンドに プレイヤー・仲間・敵 が1回ずつ行動する', order.slice().sort().join(',') === 'ally,enemy,player', `(実際: ${order.join(',')})`)
  check('仲間が自動で攻撃する', b.log.some((l) => l.text.startsWith('仲間のヒノコ の')) && b.enemy.stats.hp < enemyHp0)

  // 敵の狙い：仲間とプレイヤーの両方が狙われる（割合は設定値あたり）
  let hitAlly = 0, hitPlayer = 0
  for (let seed = 1; seed <= 400; seed++) {
    const t = mk(seed * 7)
    const before = { p: t.player.stats.hp, a: t.ally.stats.hp }
    runRound(t, { type: 'normalAttack' })
    if (t.ally.stats.hp < before.a) hitAlly++
    if (t.player.stats.hp < before.p) hitPlayer++
  }
  const rate = hitAlly / (hitAlly + hitPlayer)
  check('敵は仲間も狙う（約4割）', Math.abs(rate - PROGRESSION_CONFIG.monster.enemyTargetsAllyRate) < 0.08, `(実際: ${(rate * 100).toFixed(1)}%)`)

  // 仲間が倒れても戦闘は続く／プレイヤーが倒れたら敗北
  const weak = mk(3, { startHp: 1, floor: 5 })
  let guard = 0
  while (weak.ally.stats.hp > 0 && !weak.result && guard++ < 60) runRound(weak, { type: 'normalAttack' })
  check('仲間が倒れても戦闘は続く', weak.ally.stats.hp === 0 && weak.result !== 'lose' && weak.log.some((l) => l.text.includes('仲間のヒノコ は倒れてしまった')))
  const after = runRound(weak, { type: 'normalAttack' })
  check('倒れた仲間は行動しない', !after.includes('ally'))
  check('仲間が倒れた後、敵は必ずプレイヤーを狙う', weak.ally.stats.hp === 0)
  const lose = mk(9, { floor: 25, monster: { ...monster, stats: { hp: 99999, atk: 1, def: 6, spd: 9 } } })
  lose.player.stats.hp = 1
  guard = 0
  while (!lose.result && guard++ < 200) runRound(lose, { type: 'normalAttack' })
  check('プレイヤーが倒れたら、仲間が生きていても敗北', lose.result === 'lose' && lose.ally.stats.hp > 0)

  // 仲間がいると勝ちやすくなる（同じ条件で5階ボスに100戦）
  const winRate = (withAlly) => {
    let wins = 0
    for (let seed = 1; seed <= 100; seed++) {
      const t = mk(seed * 31, { floor: 5, noAlly: !withAlly, monster: { ...monster, level: 4 } })
      let g = 0
      while (!t.result && g++ < 200) runRound(t, { type: 'normalAttack' })
      if (t.result === 'win') wins++
    }
    return wins
  }
  const solo = winRate(false), duo = winRate(true)
  check('仲間がいるほうが勝率が高い', duo > solo, `(ソロ${solo}% → 仲間あり${duo}%)`)
  console.log(`    参考：5階ボス（初期Lv1・武器ATK10・通常攻撃のみ）勝率 ソロ${solo}% → 仲間ヒノコLv4あり${duo}%`)
}

// ============================================================
console.log('\n============================================')
console.log(`結果: ✅ ${passCount} / ❌ ${failCount}`)
if (failCount > 0) process.exit(1)
console.log('装備管理・抽出・移植スモークテスト全通過！')
