// 戦闘エンジン（ターン制1対1）
// GDDの戦闘仕様を実装する：
// - SPDで行動順決定（確定先制スキルは最優先）
// - ダメージ：ATK×スキル倍率×属性相性×属性一致ボーナス×会心 をDEFで軽減
// - 弱体効果の統一ルール（GDD 5番）
//   - バフ/デバフ同効果重ね掛け不可・再使用でターン上書き
//   - 参照系は状態異常＋デバフ両方カウント
//   - 解除系は両方対象（単体=手動選択、全体=残りターン最長を自動選択・同数なら状態異常優先）
//   - 操作系はスタック+2/ターン+2、手動選択
// - 状態異常のターン経過処理（火傷・凍結・感電・混乱・呪い）
// UIに依存しない純粋なJSモジュール。Nodeからも実行できる（スモークテスト用）

import { getElementMultiplier, ELEMENTS } from '../data/elements.js'
import { STATUS_EFFECTS, AILMENT_CHANCE_TIERS } from '../data/statusEffects.js'
import { BATTLE_CONFIG } from '../data/battleConfig.js'
import { JOBS, calcJobStats } from '../data/jobs.js'
import { WEAPON_TYPES } from '../data/weaponTypes.js'
import { ENEMIES } from '../data/enemies.js'
import { ALL_SKILLS_BY_ID } from '../data/skills_elemental.js'
import { createSeededRng } from './weaponGenerator.js'

// ============================================================
// ユーティリティ
// ============================================================

let modSeq = 1

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

// バフ/デバフ（statMod）を含む実効ステータスを返す
// atk/def/spd：乗算%、crit/evasion/damageCut/ailmentResist/healPower：加算ポイント
export function getEffStat(combatant, stat) {
  const sum = combatant.mods
    .filter((m) => m.stat === stat)
    .reduce((acc, m) => acc + m.amount, 0)
  const base = combatant.stats[stat] ?? 0
  if (stat === 'atk' || stat === 'def' || stat === 'spd') {
    return Math.max(1, Math.round(base * (1 + sum / 100)))
  }
  if (stat === 'crit') return clamp(base + sum, 0, 100)
  // 基礎値を持たない加算ステータス
  return base + sum
}

// 弱体効果（状態異常＋デバフ）の一覧。参照系・解除系・操作系はこれを対象にする
export function getWeakEffects(combatant) {
  const ailments = combatant.ailments.map((a) => ({ kind: 'ailment', key: `ailment:${a.id}`, ref: a }))
  const debuffs = combatant.mods
    .filter((m) => m.amount < 0)
    .map((m) => ({ kind: 'debuff', key: `mod:${m.uid}`, ref: m }))
  return [...ailments, ...debuffs]
}

function getBuffs(combatant, scope) {
  // 敵バフ解除の分類：attack=攻撃系、defense=防御系、any=全部
  const attackStats = ['atk', 'crit']
  const defenseStats = ['def', 'damageCut', 'evasion', 'ailmentResist']
  return combatant.mods.filter((m) => {
    if (m.amount <= 0) return false
    if (scope === 'attack') return attackStats.includes(m.stat)
    if (scope === 'defense') return defenseStats.includes(m.stat)
    return true
  })
}

function skillDisplayName(skillRef) {
  // +値は「スキル名(+N)」表記（フェーズ1は全て+0）
  const skill = ALL_SKILLS_BY_ID[skillRef.skillId]
  return skillRef.plus > 0 ? `${skill.name}(+${skillRef.plus})` : skill.name
}

// +値による実効MPコスト（TODO：実装後調整の仮式。-2%/+1、最低1）
export function getSkillMpCost(skillRef) {
  const skill = ALL_SKILLS_BY_ID[skillRef.skillId]
  const { mpReductionPerPlus, minMpCost } = BATTLE_CONFIG.plusValue
  const cost = Math.ceil(skill.mp * (1 - mpReductionPerPlus * skillRef.plus))
  return Math.max(minMpCost, cost)
}

// +値による威力補正（TODO：実装後調整の仮式。+3%/+1）
function getPlusPowerMult(plus) {
  return 1 + BATTLE_CONFIG.plusValue.powerBonusPerPlus * plus
}

// ============================================================
// 戦闘の生成
// ============================================================

export function createBattle({ jobId, weapon, enemyId, seed = null }) {
  const rng = seed != null ? createSeededRng(seed) : Math.random
  const job = JOBS[jobId]
  const jobStats = calcJobStats(jobId)
  const typeMods = WEAPON_TYPES[weapon.weaponType].statMods

  const playerStats = {
    maxHp: jobStats.hp,
    maxMp: jobStats.mp,
    hp: jobStats.hp,
    mp: jobStats.mp,
    atk: Math.round((jobStats.atk + weapon.atk) * typeMods.atk),
    def: jobStats.def,
    spd: Math.round(jobStats.spd * typeMods.spd),
    crit: Math.round(jobStats.crit * typeMods.crit),
  }

  const enemyDef = ENEMIES[enemyId]
  const enemyStats = {
    maxHp: enemyDef.stats.hp,
    maxMp: enemyDef.stats.mp,
    hp: enemyDef.stats.hp,
    mp: enemyDef.stats.mp,
    atk: enemyDef.stats.atk,
    def: enemyDef.stats.def,
    spd: enemyDef.stats.spd,
    crit: enemyDef.stats.crit,
  }

  const makeFlags = () => ({
    counterStance: null,     // {power, uses}
    nextSkillBonus: 0,       // 次の攻撃スキルへの倍率加算
    nextDebuffNullify: 0,    // 次に受けるデバフを無効化する回数
    ailmentNullifyOnce: 0,   // 次に受ける状態異常を無効化する回数
    ailmentImmunityTurns: 0, // 状態異常無効の残りターン
    hots: [],                // 継続回復 [{ratio, turns}]
    extraTurnPending: false,
  })

  const battle = {
    turn: 1,
    phase: 'input', // input | extraInput | ended
    result: null,   // null | 'win' | 'lose'
    rng,
    log: [],
    _queue: [],
    player: {
      id: 'player',
      name: `${job.name}`,
      jobId,
      weapon,
      element: weapon.element,       // 防御時の属性は武器属性とする（実装後調整の仮仕様）
      attackElement: weapon.element, // 無属性スキルの攻撃属性は武器属性
      stats: playerStats,
      skills: weapon.skills,         // [{skillId, plus}]
      ailments: [],
      mods: [],
      flags: makeFlags(),
      ailmentResists: {},
      lastHitTurn: -10,
      actedThisTurn: false,
      extraActionsThisRound: 0,
    },
    enemy: {
      id: 'enemy',
      name: enemyDef.name,
      enemyId,
      element: enemyDef.element,
      attackElement: enemyDef.element,
      stats: enemyStats,
      skills: enemyDef.skills.map((skillId) => ({ skillId, plus: 0 })),
      ailments: [],
      mods: [],
      flags: makeFlags(),
      ailmentResists: enemyDef.ailmentResists || {},
      lastHitTurn: -10,
      actedThisTurn: false,
      extraActionsThisRound: 0,
    },
  }

  addLog(battle, `${enemyDef.icon} ${enemyDef.name} が現れた！`, 'system')
  return battle
}

function addLog(battle, text, kind = 'info') {
  battle.log.push({ turn: battle.turn, text, kind })
}

function opponentOf(battle, combatant) {
  return combatant.id === 'player' ? battle.enemy : battle.player
}

// ============================================================
// スキル使用可否・手動選択候補（UI用API）
// ============================================================

export function getActionList(battle) {
  const p = battle.player
  const skills = p.skills.map((ref) => {
    const skill = ALL_SKILLS_BY_ID[ref.skillId]
    const mpCost = getSkillMpCost(ref)
    return {
      ref,
      skill,
      mpCost,
      displayName: skillDisplayName(ref),
      usable: p.stats.mp >= mpCost,
      needsManualTarget: skillNeedsManualTarget(skill),
    }
  })
  return skills
}

// 手動選択が必要なスキルか（単体解除=手動、操作系=手動）
export function skillNeedsManualTarget(skill) {
  return skill.effects.some(
    (e) => (e.type === 'cleanse' && e.mode === 'manual') || (e.type === 'amplify' && e.mode === 'manual')
  )
}

// 手動選択の候補一覧を返す（UIが選択肢として表示する）
export function getManualTargetCandidates(battle, skill) {
  const effect = skill.effects.find(
    (e) => (e.type === 'cleanse' && e.mode === 'manual') || (e.type === 'amplify' && e.mode === 'manual')
  )
  if (!effect) return []
  // 解除系：味方（ソロでは自分）の弱体効果から選ぶ／操作系：敵の弱体効果から選ぶ
  const holder = effect.type === 'cleanse' ? battle.player : battle.enemy
  let candidates = getWeakEffects(holder)
  if (effect.scope === 'ailment') candidates = candidates.filter((c) => c.kind === 'ailment')
  return candidates.map((c) => ({
    key: c.key,
    kind: c.kind,
    label: describeWeakEffect(c),
  }))
}

export function describeWeakEffect(entry) {
  if (entry.kind === 'ailment') {
    const def = STATUS_EFFECTS[entry.ref.id]
    return `${def.icon}${def.name} ×${entry.ref.stacks}(${entry.ref.turns}T)`
  }
  const m = entry.ref
  return `${statLabel(m.stat)}${m.amount > 0 ? '+' : ''}${m.amount}%(${m.turns}T)`
}

export function statLabel(stat) {
  return {
    atk: 'ATK', def: 'DEF', spd: 'SPD', crit: '会心率',
    evasion: '回避', damageCut: '被ダメ', ailmentResist: '異常耐性', healPower: '回復力',
  }[stat] || stat
}

// ============================================================
// 行動の投入（UIエントリポイント）
// ============================================================

// action: {type:'skill', skillRef, manualTargetKey?} | {type:'normalAttack'}（'basic'は旧名の別名）
//
// ラウンド開始：敵の行動を決めて行動順キューを作る。実行はstepBattleで1手ずつ進める
// （UI側がハイライト・シェイク等の演出を挟みながら順番に処理できるようにするため）
export function beginRound(battle, action) {
  if (battle.phase === 'ended') return battle
  if (battle.phase === 'extraInput') {
    // 追加ターン：プレイヤーの行動をキュー先頭に積んで残りを続行
    battle.phase = 'acting'
    battle._queue.unshift({ actorId: 'player', action })
    return battle
  }
  battle.player.extraActionsThisRound = 0
  battle.enemy.extraActionsThisRound = 0
  const enemyAction = chooseEnemyAction(battle)
  battle._queue = buildTurnOrder(battle, action, enemyAction)
  battle.phase = 'acting'
  return battle
}

// 次に行動する予定のアクターID（行動中ハイライト演出用）。キューが空ならnull
export function peekNextActor(battle) {
  return battle._queue.length > 0 ? battle._queue[0].actorId : null
}

// 1手だけ進める。戻り値で「誰が行動したか／ラウンドが終わったか」をUIに伝える
// {type:'action'|'roundEnd'|'extraInput'|'ended', actorId?}
export function stepBattle(battle) {
  if (battle.result) {
    battle.phase = 'ended'
    return { type: 'ended' }
  }
  if (battle._queue.length === 0) {
    // 全員行動済み→ラウンド終了処理（状態異常のターン経過など）
    endRound(battle)
    battle.phase = battle.result ? 'ended' : 'input'
    return { type: battle.result ? 'ended' : 'roundEnd' }
  }
  const entry = battle._queue.shift()
  const actor = battle[entry.actorId]
  if (actor.stats.hp > 0) {
    performAction(battle, actor, entry.action)
    if (!battle.result) handleExtraTurn(battle, actor)
  }
  if (battle.result) {
    battle.phase = 'ended'
    return { type: 'ended', actorId: entry.actorId }
  }
  if (battle.phase === 'extraInput') return { type: 'extraInput', actorId: entry.actorId }
  return { type: 'action', actorId: entry.actorId }
}

// まとめて1ラウンド実行する互換API（スモークテスト・自動戦闘用）
export function submitPlayerAction(battle, action) {
  beginRound(battle, action)
  while (battle.phase === 'acting') stepBattle(battle)
  return battle
}

// 逃げる：即座に戦闘離脱する（結果は'escape'）
export function escapeBattle(battle) {
  if (battle.phase === 'ended') return battle
  battle.result = 'escape'
  battle.phase = 'ended'
  addLog(battle, `🏃 ${battle.player.name} は戦闘から離脱した`, 'system')
  return battle
}

function buildTurnOrder(battle, playerAction, enemyAction) {
  const entries = [
    { actorId: 'player', action: playerAction, first: actionHasGuaranteedFirst(playerAction), spd: getEffStat(battle.player, 'spd') },
    { actorId: 'enemy', action: enemyAction, first: actionHasGuaranteedFirst(enemyAction), spd: getEffStat(battle.enemy, 'spd') },
  ]
  // 確定先制 > SPD降順 > 同速はプレイヤー優先
  entries.sort((a, b) => {
    if (a.first !== b.first) return a.first ? -1 : 1
    if (a.spd !== b.spd) return b.spd - a.spd
    return a.actorId === 'player' ? -1 : 1
  })
  return entries
}

function actionHasGuaranteedFirst(action) {
  if (action.type !== 'skill') return false
  const skill = ALL_SKILLS_BY_ID[action.skillRef.skillId]
  return Boolean(skill.attack?.guaranteedFirst)
}

function handleExtraTurn(battle, actor) {
  if (!actor.flags.extraTurnPending || battle.result) return
  actor.flags.extraTurnPending = false
  // 無限ループ防止：1ラウンドの追加行動は2回まで
  if (actor.extraActionsThisRound >= 2) return
  actor.extraActionsThisRound++
  addLog(battle, `⚡ ${actor.name} に追加ターン！`, 'system')
  if (actor.id === 'enemy') {
    battle._queue.unshift({ actorId: 'enemy', action: chooseEnemyAction(battle) })
  } else {
    battle.phase = 'extraInput'
  }
}

// ============================================================
// 敵AI（テスト用の単純なもの：使えるスキルからランダム）
// ============================================================

function chooseEnemyAction(battle) {
  const e = battle.enemy
  const usable = e.skills.filter((ref) => e.stats.mp >= getSkillMpCost(ref))
  if (usable.length > 0 && battle.rng() < 0.7) {
    const ref = usable[Math.floor(battle.rng() * usable.length)]
    return { type: 'skill', skillRef: ref }
  }
  return { type: 'basic' }
}

// ============================================================
// 行動実行
// ============================================================

function performAction(battle, actor, action) {
  const target = opponentOf(battle, actor)

  // --- 状態異常による行動チェック（凍結→感電→混乱の順） ---
  const freeze = actor.ailments.find((a) => a.id === 'freeze')
  if (freeze) {
    addLog(battle, `🧊 ${actor.name} は凍結していて動けない！`, 'ailment')
    actor.actedThisTurn = true
    return
  }
  const shock = actor.ailments.find((a) => a.id === 'shock')
  if (shock) {
    const p = STATUS_EFFECTS.shock.params
    const failRate = Math.min(p.failRateCap, p.failRatePerStack * shock.stacks)
    if (battle.rng() < failRate) {
      addLog(battle, `⚡ ${actor.name} は感電して行動に失敗した！`, 'ailment')
      actor.actedThisTurn = true
      return
    }
  }
  const confusion = actor.ailments.find((a) => a.id === 'confusion')
  if (confusion) {
    const p = STATUS_EFFECTS.confusion.params
    const rate = Math.min(p.selfHitRateCap, p.selfHitRatePerStack * confusion.stacks)
    if (battle.rng() < rate) {
      // 1対1では誤爆＝自傷として処理
      const dmg = Math.max(1, Math.round(getEffStat(actor, 'atk') * p.selfHitPowerRatio))
      applyDamage(battle, actor, dmg)
      addLog(battle, `💫 ${actor.name} は混乱して自分を攻撃！ ${dmg}ダメージ`, 'ailment')
      actor.actedThisTurn = true
      checkBattleEnd(battle)
      return
    }
  }

  // --- 行動本体 ---
  if (action.type === 'normalAttack' || action.type === 'basic') {
    // 通常攻撃（'basic'は旧名の別名として残す）
    executeNormalAttack(battle, actor, target)
  } else {
    const skill = ALL_SKILLS_BY_ID[action.skillRef.skillId]
    const mpCost = getSkillMpCost(action.skillRef)
    if (actor.stats.mp < mpCost) {
      // MP不足（UI側でdisabledにしているが保険）
      addLog(battle, `${actor.name} はMPが足りない！`, 'system')
      actor.actedThisTurn = true
      return
    }
    actor.stats.mp -= mpCost
    addLog(battle, `${actor.name} の「${skillDisplayName(action.skillRef)}」！`, 'action')

    // HPコスト系は使用時に払う
    for (const eff of skill.effects) {
      if (eff.type === 'hpCost') {
        const cost = Math.max(1, Math.round(actor.stats.maxHp * eff.ratio))
        actor.stats.hp = Math.max(1, actor.stats.hp - cost) // HPコストでは倒れない
        addLog(battle, `　${actor.name} はHPを${cost}削って力に変えた`, 'info')
      }
    }

    if (skill.attack) {
      executeAttack(battle, actor, target, skill, action.skillRef, action.manualTargetKey)
    } else {
      // 非攻撃スキル：効果のみ
      applySkillEffects(battle, actor, target, skill, { anyHit: false, totalDamage: 0, manualTargetKey: action.manualTargetKey, phase: 'use' })
    }
  }

  actor.actedThisTurn = true
  checkBattleEnd(battle)
}

// ============================================================
// 通常攻撃（スキル計算とは独立したシンプルな処理）
// MP消費0・威力1.0倍固定・属性なし・追加効果なし・会心判定あり
// 数値はbattleConfig.basicAttackを参照（ハードコーディング禁止）
// ============================================================

function executeNormalAttack(battle, attacker, defender) {
  const cfg = BATTLE_CONFIG.basicAttack
  addLog(battle, `${attacker.name} の${cfg.name}！`, 'action')

  // 命中判定
  const hitChance = BATTLE_CONFIG.baseAccuracy + getEffStat(attacker, 'accuracy') / 100 - getEffStat(defender, 'evasion') / 100
  if (battle.rng() >= hitChance) {
    addLog(battle, `　${defender.name} は攻撃をかわした！`, 'miss')
    return
  }

  // 会心判定
  const isCrit = battle.rng() < clamp(getEffStat(attacker, 'crit'), 0, 100) / 100
  const critMult = isCrit ? BATTLE_CONFIG.critMultiplier : 1

  // DEF軽減・被ダメ軽減（属性相性・一致ボーナスは通常攻撃には乗らない）
  const mitigation = BATTLE_CONFIG.defenseFactor / (BATTLE_CONFIG.defenseFactor + getEffStat(defender, 'def'))
  const cut = clamp(getEffStat(defender, 'damageCut'), -100, 90)

  // 凍結中の敵への追撃ボーナス（被弾で解除の統一ルール）
  let freezeMult = 1
  const frozen = defender.ailments.find((a) => a.id === 'freeze')
  if (frozen) {
    freezeMult = 1 + STATUS_EFFECTS.freeze.params.breakBonusPerStack * frozen.stacks
  }

  const variance = 1 + (battle.rng() * 2 - 1) * BATTLE_CONFIG.damageVariance
  const dmg = Math.max(1, Math.round(
    getEffStat(attacker, 'atk') * cfg.power * critMult * mitigation * (1 - cut / 100) * freezeMult * variance
  ))
  applyDamage(battle, defender, dmg)
  defender.lastHitTurn = battle.turn
  addLog(battle, `　${isCrit ? '💥会心！ ' : ''}${defender.name} に ${dmg} ダメージ`, isCrit ? 'crit' : 'damage')

  // 凍結は被弾で解除
  if (frozen) {
    defender.ailments = defender.ailments.filter((a) => a.id !== 'freeze')
    addLog(battle, `　🧊 ${defender.name} の凍結が砕けた！`, 'ailment')
  }

  // 反撃（迎撃の構え）
  if (defender.stats.hp > 0 && defender.flags.counterStance && defender.flags.counterStance.uses > 0) {
    const stance = defender.flags.counterStance
    stance.uses--
    if (stance.uses <= 0) defender.flags.counterStance = null
    const counterAtk = getEffStat(defender, 'atk')
    const counterMitigation = BATTLE_CONFIG.defenseFactor / (BATTLE_CONFIG.defenseFactor + getEffStat(attacker, 'def'))
    const counterDmg = Math.max(1, Math.round(counterAtk * stance.power * counterMitigation))
    applyDamage(battle, attacker, counterDmg)
    addLog(battle, `　⚔️ ${defender.name} の反撃！ ${attacker.name} に ${counterDmg} ダメージ`, 'damage')
  }
}

// ============================================================
// 攻撃処理
// ============================================================

function executeAttack(battle, attacker, defender, skill, skillRef, manualTargetKey) {
  const atkSpec = skill.attack

  // 攻撃前の解除（「解除してから攻撃」系）
  applyDispels(battle, attacker, defender, skill)

  // 攻撃属性：スキル属性＞武器（敵は自身の）属性
  const attackElement = skill.element || attacker.attackElement
  const elemMult = getElementMultiplier(attackElement, defender.element)

  // 属性一致ボーナス（スキル属性と武器属性が一致）
  const isMatch = Boolean(skill.element && skill.element === attacker.attackElement)
  const matchPowerMult = isMatch ? 1 + BATTLE_CONFIG.elementMatchPowerBonus : 1

  // 条件付き威力ボーナスの合計（各ヒット倍率へ加算）
  let bonusPower = 0
  for (const pb of atkSpec.powerBonuses || []) {
    bonusPower += resolvePowerBonus(battle, attacker, defender, pb)
  }
  // 「次の攻撃+X倍」フラグの消費
  if (attacker.flags.nextSkillBonus > 0) {
    bonusPower += attacker.flags.nextSkillBonus
    attacker.flags.nextSkillBonus = 0
  }

  const atkEff = getEffStat(attacker, 'atk')
  const plusMult = getPlusPowerMult(skillRef.plus)

  let anyHit = false
  let totalDamage = 0
  const hits = atkSpec.hits || 1

  for (let i = 0; i < hits; i++) {
    if (defender.stats.hp <= 0) break
    const isLast = i === hits - 1
    const lastHitSpec = (isLast && atkSpec.lastHit) || {}

    // --- 命中判定 ---
    const sureHit = atkSpec.sureHit || false
    if (!sureHit) {
      let evasion = getEffStat(defender, 'evasion')
      const accMod = (atkSpec.accuracyMod || 0) + getEffStat(attacker, 'accuracy')
      const hitChance = BATTLE_CONFIG.baseAccuracy + accMod / 100 - evasion / 100
      if (battle.rng() >= hitChance) {
        addLog(battle, `　${defender.name} は攻撃をかわした！`, 'miss')
        continue
      }
    }

    // --- 会心判定（各ヒット独立） ---
    let critChance = getEffStat(attacker, 'crit') + (atkSpec.critRateBonus || 0) + (lastHitSpec.critRateBonus || 0)
    let isCrit = battle.rng() < clamp(critChance, 0, 100) / 100
    if (atkSpec.critCertain || lastHitSpec.critCertain) isCrit = true
    if (atkSpec.critCertainCondition && checkCondition(battle, attacker, defender, atkSpec.critCertainCondition)) isCrit = true

    // --- 威力 ---
    let power = (atkSpec.power + bonusPower + (lastHitSpec.powerBonus || 0)) * plusMult
    if (isCrit && atkSpec.critExtraPower) power += atkSpec.critExtraPower
    const critMult = isCrit ? (atkSpec.critDamageMultiplier || BATTLE_CONFIG.critMultiplier) : 1

    // --- DEF軽減 ---
    let defEff = getEffStat(defender, 'def')
    if (atkSpec.sureHitIgnoreBuffs) {
      // 絶対必中：敵のDEFバフ（正のDEF補正）を無視して素のDEFで計算
      defEff = defender.stats.def
    }
    const defIgnore = (atkSpec.defIgnore || 0) + (lastHitSpec.defIgnore || 0)
    defEff = defEff * (1 - defIgnore)
    const mitigation = BATTLE_CONFIG.defenseFactor / (BATTLE_CONFIG.defenseFactor + defEff)

    // --- 被ダメ軽減（damageCut） ---
    const cut = clamp(getEffStat(defender, 'damageCut'), -100, 90)

    // --- 凍結中の敵への追撃ボーナス＋凍結解除 ---
    let freezeMult = 1
    const frozen = defender.ailments.find((a) => a.id === 'freeze')
    if (frozen) {
      freezeMult = 1 + STATUS_EFFECTS.freeze.params.breakBonusPerStack * frozen.stacks
    }

    // --- ダメージ合成 ---
    const variance = 1 + (battle.rng() * 2 - 1) * BATTLE_CONFIG.damageVariance
    let dmg = atkEff * power * elemMult * matchPowerMult * critMult * mitigation * (1 - cut / 100) * freezeMult * variance
    dmg = Math.max(1, Math.round(dmg))

    applyDamage(battle, defender, dmg)
    defender.lastHitTurn = battle.turn
    anyHit = true
    totalDamage += dmg

    const critText = isCrit ? '💥会心！ ' : ''
    const elemText = elemMult > 1 ? '⚔️弱点！ ' : elemMult < 1 ? '🛡️耐性… ' : ''
    addLog(battle, `　${critText}${elemText}${defender.name} に ${dmg} ダメージ`, isCrit ? 'crit' : 'damage')

    // 凍結は被弾で解除
    if (frozen) {
      defender.ailments = defender.ailments.filter((a) => a.id !== 'freeze')
      addLog(battle, `　🧊 ${defender.name} の凍結が砕けた！`, 'ailment')
    }

    // 反撃（迎撃の構え）：被弾側が構えていれば1回反撃
    if (defender.stats.hp > 0 && defender.flags.counterStance && defender.flags.counterStance.uses > 0) {
      defender.flags.counterStance.uses--
      const stance = defender.flags.counterStance
      if (stance.uses <= 0) defender.flags.counterStance = null
      const counterAtk = getEffStat(defender, 'atk')
      const counterMitigation = BATTLE_CONFIG.defenseFactor / (BATTLE_CONFIG.defenseFactor + getEffStat(attacker, 'def'))
      const counterDmg = Math.max(1, Math.round(counterAtk * stance.power * counterMitigation))
      applyDamage(battle, attacker, counterDmg)
      addLog(battle, `　⚔️ ${defender.name} の反撃！ ${attacker.name} に ${counterDmg} ダメージ`, 'damage')
      if (attacker.stats.hp <= 0) break
    }
  }

  // 攻撃後の効果適用（状態異常付与・onHit効果など）
  applySkillEffects(battle, attacker, defender, skill, {
    anyHit,
    totalDamage,
    manualTargetKey,
    isMatch,
    phase: 'afterAttack',
  })
}

function applyDamage(battle, combatant, dmg) {
  combatant.stats.hp = Math.max(0, combatant.stats.hp - dmg)
}

function checkBattleEnd(battle) {
  if (battle.result) return
  if (battle.enemy.stats.hp <= 0) {
    battle.result = 'win'
    addLog(battle, `🎉 ${battle.enemy.name} を倒した！勝利！`, 'system')
  } else if (battle.player.stats.hp <= 0) {
    battle.result = 'lose'
    addLog(battle, `💀 ${battle.player.name} は倒れてしまった…敗北`, 'system')
  }
  if (battle.result) battle.phase = 'ended'
}

// 条件付き威力ボーナスの解決（参照系は状態異常＋デバフの両方をカウント）
function resolvePowerBonus(battle, attacker, defender, pb) {
  const cond = pb.condition
  if (cond.kind === 'perWeakEffect') {
    // 弱体効果の合計数×amount
    return getWeakEffects(defender).length * pb.amount
  }
  return checkCondition(battle, attacker, defender, cond) ? pb.amount : 0
}

function checkCondition(battle, attacker, defender, cond) {
  switch (cond.kind) {
    case 'always': return true
    case 'spdHigher': return getEffStat(attacker, 'spd') > getEffStat(defender, 'spd')
    case 'recentlyHit': return battle.turn - attacker.lastHitTurn <= 1 // 被弾直後／直前ターン被弾
    case 'firstStrike': return !defender.actedThisTurn
    case 'enemyActed': return defender.actedThisTurn
    case 'enemyHpBelow': return defender.stats.hp <= defender.stats.maxHp * cond.ratio
    case 'enemyHpAbove': return defender.stats.hp >= defender.stats.maxHp * cond.ratio
    case 'selfHpFull': return attacker.stats.hp >= attacker.stats.maxHp
    case 'enemyMpAbove': return defender.stats.mp >= defender.stats.maxMp * cond.ratio
    case 'hasWeakEffect': return getWeakEffects(defender).length > 0
    case 'weakEffectCount': return getWeakEffects(defender).length >= cond.atLeast
    case 'hasAilment': return defender.ailments.some((a) => a.id === cond.ailment)
    case 'selfNoWeakEffect': return getWeakEffects(attacker).length === 0
    default: return false
  }
}

// ============================================================
// スキル効果の適用
// ============================================================

function applyDispels(battle, attacker, defender, skill) {
  for (const eff of skill.effects) {
    if (eff.type !== 'dispel') continue
    let buffs = getBuffs(defender, eff.scope)
    // 残りターンの長いものから解除
    buffs.sort((a, b) => b.turns - a.turns)
    const count = eff.count === 'all' ? buffs.length : Math.min(eff.count, buffs.length)
    for (let i = 0; i < count; i++) {
      const m = buffs[i]
      defender.mods = defender.mods.filter((x) => x.uid !== m.uid)
      addLog(battle, `　🌀 ${defender.name} の ${statLabel(m.stat)}+${m.amount}% を打ち消した！`, 'buff')
    }
    if (count === 0 && eff.count !== 'all') {
      addLog(battle, `　🌀 打ち消せるバフがなかった`, 'info')
    }
  }
}

function applySkillEffects(battle, actor, target, skill, ctx) {
  const { anyHit, manualTargetKey, isMatch } = ctx

  for (const eff of skill.effects) {
    // dispel / hpCost は別タイミングで処理済み
    if (eff.type === 'dispel' || eff.type === 'hpCost') continue
    // onHit効果は1ヒット以上当たっていないと発動しない
    if (eff.trigger === 'onHit' && skill.attack && !anyHit) continue
    // 効果ごとの条件（例：感電中の敵に命中時のみ）
    if (eff.condition && !checkCondition(battle, actor, target, eff.condition)) continue

    switch (eff.type) {
      case 'statMod': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          applyStatMod(battle, r, eff)
        }
        break
      }
      case 'heal': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          applyHeal(battle, r, Math.round(r.stats.maxHp * eff.ratio))
        }
        break
      }
      case 'healMp': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          const amount = eff.amount ?? Math.round(r.stats.maxMp * eff.ratio)
          r.stats.mp = Math.min(r.stats.maxMp, r.stats.mp + amount)
          addLog(battle, `　💧 ${r.name} のMPが ${amount} 回復`, 'heal')
        }
        break
      }
      case 'hot': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          // 継続回復も同効果は上書き
          r.flags.hots = [{ ratio: eff.ratio, turns: eff.turns }]
          addLog(battle, `　💚 ${r.name} に継続回復（毎ターン${Math.round(eff.ratio * 100)}%、${eff.turns}ターン）`, 'heal')
        }
        break
      }
      case 'revive': {
        // TODO: 復活はパーティ実装（フェーズ3以降）で有効化。ソロでは戦闘不能者がいないのでfallback回復のみ
        applyHeal(battle, actor, Math.round(actor.stats.maxHp * eff.fallbackHealRatio))
        break
      }
      case 'cleanse':
        applyCleanse(battle, actor, eff, manualTargetKey)
        break
      case 'amplify':
        applyAmplify(battle, target, eff, manualTargetKey)
        break
      case 'ailment':
        applyAilment(battle, actor, target, eff.ailment, eff.chance, eff.stacks, isMatch)
        break
      case 'randomAilment': {
        // 全5種からランダムにcount種選んで付与判定（重複なし）
        const pool = Object.keys(STATUS_EFFECTS)
        const times = eff.perHit ? 1 : eff.count // perHitは各ヒットで1種（executeAttackから毎ヒット呼ばれない設計のため、ここでは合計ヒット数扱いにせずcount回）
        // TODO: perHit=true（九尾の呪詛）は本来「各ヒットごとに判定」。フェーズ1では簡略化して
        // ヒット数と同数回の判定を攻撃後にまとめて行う（anyHit時のみ）
        const rolls = eff.perHit ? (skill.attack?.hits || 1) : times
        const chosen = new Set()
        for (let i = 0; i < rolls; i++) {
          const remaining = eff.perHit ? pool : pool.filter((id) => !chosen.has(id))
          if (remaining.length === 0) break
          const id = remaining[Math.floor(battle.rng() * remaining.length)]
          chosen.add(id)
          applyAilment(battle, actor, target, id, eff.chance, 1, isMatch)
        }
        break
      }
      case 'ailmentStackAdd': {
        const a = target.ailments.find((x) => x.id === eff.ailment)
        if (a) {
          const def = STATUS_EFFECTS[eff.ailment]
          a.stacks = Math.min(def.maxStacks, a.stacks + eff.amount)
          addLog(battle, `　${def.icon} ${target.name} の${def.name}スタック+${eff.amount}（現在×${a.stacks}）`, 'ailment')
        }
        break
      }
      case 'ailmentTurnsReduce': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          for (const a of [...r.ailments]) {
            a.turns -= eff.amount
            if (a.turns <= 0) {
              r.ailments = r.ailments.filter((x) => x !== a)
              addLog(battle, `　✨ ${r.name} の${STATUS_EFFECTS[a.id].name}が消えた`, 'ailment')
            } else {
              addLog(battle, `　✨ ${r.name} の${STATUS_EFFECTS[a.id].name}の残りターン-${eff.amount}`, 'ailment')
            }
          }
        }
        break
      }
      case 'mpRestore':
        actor.stats.mp = Math.min(actor.stats.maxMp, actor.stats.mp + eff.amount)
        addLog(battle, `　💧 ${actor.name} のMPが ${eff.amount} 回復`, 'heal')
        break
      case 'mpDamage':
        target.stats.mp = Math.max(0, target.stats.mp - eff.amount)
        addLog(battle, `　🌫️ ${target.name} のMPを ${eff.amount} 削った`, 'info')
        break
      case 'mpDrain': {
        const drained = Math.min(eff.amount, target.stats.mp)
        target.stats.mp -= drained
        actor.stats.mp = Math.min(actor.stats.maxMp, actor.stats.mp + eff.amount)
        addLog(battle, `　💧 ${target.name} のMPを ${drained} 奪った`, 'info')
        break
      }
      case 'hpDrainOnDamage': {
        const amount = Math.max(1, Math.round(ctx.totalDamage * eff.ratio))
        applyHeal(battle, actor, amount, { isDrain: true })
        break
      }
      case 'counterStance':
        actor.flags.counterStance = { power: eff.power, uses: eff.uses }
        addLog(battle, `　⚔️ ${actor.name} は迎撃の構えをとった`, 'buff')
        break
      case 'extraTurn':
        if (battle.rng() < eff.chance) {
          actor.flags.extraTurnPending = true
        }
        break
      case 'nextSkillBonus':
        actor.flags.nextSkillBonus += eff.amount
        addLog(battle, `　🔮 ${actor.name} の次の攻撃が強化される（+${eff.amount}倍）`, 'buff')
        break
      case 'nextDebuffNullify':
        actor.flags.nextDebuffNullify += eff.uses
        addLog(battle, `　🛡️ ${actor.name} は次に受けるデバフを無効化する`, 'buff')
        break
      case 'ailmentNullifyOnce': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          r.flags.ailmentNullifyOnce += 1
          addLog(battle, `　🛡️ ${r.name} は次に受ける状態異常を無効化する`, 'buff')
        }
        break
      }
      case 'ailmentImmunity': {
        const recipients = resolveRecipients(battle, actor, target, eff.target)
        for (const r of recipients) {
          r.flags.ailmentImmunityTurns = Math.max(r.flags.ailmentImmunityTurns, eff.turns)
          addLog(battle, `　🛡️ ${r.name} は${eff.turns}ターン状態異常無効！`, 'buff')
        }
        break
      }
      default:
        // 未実装の効果はログに出す（データ側のTODOを検知しやすくする）
        addLog(battle, `　⚠️ 未実装の効果: ${eff.type}`, 'system')
    }
  }
  checkBattleEnd(battle)
}

// 効果の対象解決（ソロ戦闘：ally/allies=自分側1人）
function resolveRecipients(battle, actor, target, targetSpec) {
  switch (targetSpec) {
    case 'enemy': return [opponentOf(battle, actor)]
    case 'self': return [actor]
    case 'ally':
    case 'allies':
    default:
      return [actor] // パーティ実装（フェーズ3以降）で複数対象に拡張
  }
}

// ============================================================
// バフ/デバフ（statMod）
// ============================================================

function applyStatMod(battle, recipient, eff) {
  const isDebuff = eff.amount < 0

  // デバフ無効フラグ（魔力障壁）
  if (isDebuff && recipient.flags.nextDebuffNullify > 0) {
    recipient.flags.nextDebuffNullify--
    addLog(battle, `　🛡️ ${recipient.name} はデバフを無効化した！`, 'buff')
    return
  }

  const turns = eff.turns || BATTLE_CONFIG.defaultBuffTurns

  // 同効果（同ステータス・同方向）の重ね掛け不可。再使用で効果量・残りターンを上書き
  const existing = recipient.mods.find((m) => m.stat === eff.stat && (m.amount < 0) === isDebuff)
  if (existing) {
    existing.amount = eff.amount
    existing.turns = turns
    addLog(battle, `　♻️ ${recipient.name} の ${statLabel(eff.stat)}${eff.amount > 0 ? '+' : ''}${eff.amount}% を上書き（${turns}T）`, isDebuff ? 'debuff' : 'buff')
    return
  }

  recipient.mods.push({
    uid: modSeq++,
    stat: eff.stat,
    amount: eff.amount,
    turns,
    dispellable: true, // 将来のボスギミック用フラグ（GDD 5番）
  })
  const emoji = isDebuff ? '🔻' : '🔺'
  addLog(battle, `　${emoji} ${recipient.name} の ${statLabel(eff.stat)}${eff.amount > 0 ? '+' : ''}${eff.amount}%（${turns}T）`, isDebuff ? 'debuff' : 'buff')
}

// ============================================================
// 回復（火傷の回復量減少・呪いの回復無効・回復力デバフを考慮）
// ============================================================

function applyHeal(battle, recipient, baseAmount, opts = {}) {
  // 呪い：回復無効
  if (recipient.ailments.some((a) => a.id === 'curse')) {
    addLog(battle, `　💀 ${recipient.name} は呪われていて回復できない！`, 'ailment')
    return
  }
  let amount = baseAmount
  // 火傷：回復量減少
  const burn = recipient.ailments.find((a) => a.id === 'burn')
  if (burn) {
    amount = Math.round(amount * (1 - STATUS_EFFECTS.burn.params.healReduction))
  }
  // 回復力デバフ（絶望の頁など）
  const healPower = getEffStat(recipient, 'healPower')
  amount = Math.max(0, Math.round(amount * (1 + healPower / 100)))
  if (amount <= 0) return
  recipient.stats.hp = Math.min(recipient.stats.maxHp, recipient.stats.hp + amount)
  const label = opts.isDrain ? '🩸 HPを吸収し' : '💚'
  addLog(battle, `　${label} ${recipient.name} のHPが ${amount} 回復`, 'heal')
}

// ============================================================
// 解除系（単体=手動選択、全体=残りターン最長を自動選択・同数なら状態異常優先）
// ============================================================

function applyCleanse(battle, actor, eff, manualTargetKey) {
  // ソロ戦闘：解除対象は常に自分側
  const holder = eff.target === 'self' ? actor : actor
  let candidates = getWeakEffects(holder)
  if (eff.scope === 'ailment') candidates = candidates.filter((c) => c.kind === 'ailment')

  if (candidates.length === 0) {
    addLog(battle, `　✨ 解除できる弱体効果はなかった`, 'info')
    return
  }

  let toRemove = []
  if (eff.count === 'all') {
    toRemove = candidates
  } else if (eff.mode === 'manual' && manualTargetKey) {
    const found = candidates.find((c) => c.key === manualTargetKey)
    toRemove = found ? [found] : []
  } else {
    // 自動選択：残りターン最長、同数なら状態異常優先
    candidates.sort((a, b) => {
      if (b.ref.turns !== a.ref.turns) return b.ref.turns - a.ref.turns
      if (a.kind !== b.kind) return a.kind === 'ailment' ? -1 : 1
      return 0
    })
    toRemove = candidates.slice(0, eff.count)
  }

  for (const c of toRemove) {
    if (c.kind === 'ailment') {
      holder.ailments = holder.ailments.filter((a) => a !== c.ref)
      addLog(battle, `　✨ ${holder.name} の${STATUS_EFFECTS[c.ref.id].name}を解除！`, 'ailment')
    } else {
      holder.mods = holder.mods.filter((m) => m.uid !== c.ref.uid)
      addLog(battle, `　✨ ${holder.name} の${statLabel(c.ref.stat)}${c.ref.amount}%を解除！`, 'buff')
    }
  }
}

// ============================================================
// 操作系（強化）：状態異常スタック+2／デバフ残りターン+2
// ============================================================

function applyAmplify(battle, target, eff, manualTargetKey) {
  const { ailmentStackAdd, debuffTurnAdd } = BATTLE_CONFIG.amplify
  let candidates = getWeakEffects(target)
  if (candidates.length === 0) {
    addLog(battle, `　🔮 強化できる弱体効果はなかった`, 'info')
    return
  }

  let targets = []
  if (eff.mode === 'all') {
    targets = candidates
  } else if (manualTargetKey) {
    const found = candidates.find((c) => c.key === manualTargetKey)
    targets = found ? [found] : []
  } else {
    targets = candidates.slice(0, 1) // 手動選択の指定なし（敵AI等）は先頭
  }

  for (const c of targets) {
    if (c.kind === 'ailment') {
      const def = STATUS_EFFECTS[c.ref.id]
      c.ref.stacks = Math.min(def.maxStacks, c.ref.stacks + ailmentStackAdd)
      addLog(battle, `　🔮 ${target.name} の${def.name}スタック+${ailmentStackAdd}（現在×${c.ref.stacks}）`, 'ailment')
    } else {
      c.ref.turns += debuffTurnAdd
      addLog(battle, `　🔮 ${target.name} の${statLabel(c.ref.stat)}${c.ref.amount}%の残りターン+${debuffTurnAdd}`, 'debuff')
    }
  }
}

// ============================================================
// 状態異常の付与
// ============================================================

function applyAilment(battle, attacker, target, ailmentId, chanceTier, stacks, isMatch) {
  const def = STATUS_EFFECTS[ailmentId]

  // 無効化フラグ・無効ターン
  if (target.flags.ailmentImmunityTurns > 0) {
    addLog(battle, `　🛡️ ${target.name} は状態異常無効！`, 'ailment')
    return
  }
  if (target.flags.ailmentNullifyOnce > 0) {
    target.flags.ailmentNullifyOnce--
    addLog(battle, `　🛡️ ${target.name} は${def.name}を無効化した！`, 'ailment')
    return
  }

  // 付与率 = ティア基本値 + 属性一致ボーナス、その後耐性で減衰
  let chance = typeof chanceTier === 'number' ? chanceTier : AILMENT_CHANCE_TIERS[chanceTier]
  if (isMatch) chance += BATTLE_CONFIG.elementMatchAilmentBonus
  const dataResist = target.ailmentResists[ailmentId] || 0
  const statResist = clamp(getEffStat(target, 'ailmentResist'), 0, 100) / 100
  chance = chance * (1 - dataResist) * (1 - statResist)

  if (battle.rng() >= chance) return // 付与失敗（ログは出さず簡潔に）

  const existing = target.ailments.find((a) => a.id === ailmentId)
  if (existing) {
    // スタック加算・残りターンは基本値で更新（2軸管理）
    existing.stacks = Math.min(def.maxStacks, existing.stacks + stacks)
    existing.turns = Math.max(existing.turns, def.baseDuration)
    addLog(battle, `　${def.icon} ${target.name} の${def.name}が悪化！（×${existing.stacks}）`, 'ailment')
  } else {
    target.ailments.push({ id: ailmentId, stacks, turns: def.baseDuration })
    addLog(battle, `　${def.icon} ${target.name} は${def.name}になった！（×${stacks}）`, 'ailment')
  }
}

// ============================================================
// ラウンド終了処理（状態異常のターン経過・バフ/デバフの期限管理）
// ============================================================

function endRound(battle) {
  for (const c of [battle.player, battle.enemy]) {
    if (c.stats.hp <= 0) continue

    // 火傷：継続ダメージ
    const burn = c.ailments.find((a) => a.id === 'burn')
    if (burn) {
      const dmg = Math.max(1, Math.round(c.stats.maxHp * STATUS_EFFECTS.burn.params.dotRatioPerStack * burn.stacks))
      applyDamage(battle, c, dmg)
      addLog(battle, `🔥 ${c.name} は火傷で ${dmg} ダメージ`, 'ailment')
    }

    // 呪い：デバフ蓄積（毎ターン、ランダムなステータスにデバフ）
    const curse = c.ailments.find((a) => a.id === 'curse')
    if (curse) {
      const p = STATUS_EFFECTS.curse.params
      const stat = p.debuffStats[Math.floor(battle.rng() * p.debuffStats.length)]
      applyStatMod(battle, c, { stat, amount: -(p.debuffPerTurnPerStack * curse.stacks), turns: p.debuffTurns })
    }

    // 継続回復（HoT）
    for (const hot of [...c.flags.hots]) {
      applyHeal(battle, c, Math.round(c.stats.maxHp * hot.ratio))
      hot.turns--
    }
    c.flags.hots = c.flags.hots.filter((h) => h.turns > 0)

    // 状態異常のターン経過
    for (const a of [...c.ailments]) {
      a.turns--
      if (a.turns <= 0) {
        c.ailments = c.ailments.filter((x) => x !== a)
        addLog(battle, `${STATUS_EFFECTS[a.id].icon} ${c.name} の${STATUS_EFFECTS[a.id].name}が治った`, 'ailment')
      }
    }

    // バフ/デバフのターン経過
    for (const m of [...c.mods]) {
      m.turns--
      if (m.turns <= 0) {
        c.mods = c.mods.filter((x) => x !== m)
      }
    }

    // 状態異常無効ターンの経過
    if (c.flags.ailmentImmunityTurns > 0) c.flags.ailmentImmunityTurns--

    c.actedThisTurn = false
  }

  checkBattleEnd(battle)
  if (!battle.result) battle.turn++
}

// ============================================================
// 自動戦闘（スモークテスト用）
// ============================================================

export function runAutoBattle(battle, { maxTurns = 30 } = {}) {
  while (!battle.result && battle.turn <= maxTurns) {
    const actions = getActionList(battle)
    const usable = actions.filter((a) => a.usable)
    let action
    if (usable.length > 0) {
      const choice = usable[Math.floor(battle.rng() * usable.length)]
      // 手動選択が必要なら候補の先頭を自動選択
      let manualTargetKey
      if (choice.needsManualTarget) {
        const candidates = getManualTargetCandidates(battle, choice.skill)
        manualTargetKey = candidates[0]?.key
      }
      action = { type: 'skill', skillRef: choice.ref, manualTargetKey }
    } else {
      action = { type: 'basic' }
    }
    submitPlayerAction(battle, action)
    // 追加ターンが発生したら通常攻撃で消化
    while (battle.phase === 'extraInput') {
      submitPlayerAction(battle, { type: 'basic' })
    }
  }
  if (!battle.result) {
    battle.result = 'draw'
    addLog(battle, `⏱️ ${maxTurns}ターン経過で引き分け`, 'system')
  }
  return battle
}
