// 戦闘画面：1画面完結（敵情報・自HP/MP・弱体効果アイコン・コマンド4ボタン・直近ログ）
// - 行動はSPD順に1体ずつ処理し、行動中のキャラを緑の蛍光ハイライトで表示
// - 被弾したキャラのパネルはシェイクアニメーション
// - コマンドは「こうげき／スキル／仲間にする／逃げる」の4択フロー
import { useRef, useState } from 'react'
import { ELEMENTS, getElementDef } from '../data/elements.js'
import { ENEMIES } from '../data/enemies.js'
import { STATUS_EFFECTS } from '../data/statusEffects.js'
import {
  beginRound, stepBattle, peekNextActor, escapeBattle, getRecruitChance,
  getActionList, getManualTargetCandidates, statLabel,
} from '../systems/battleEngine.js'
import ActionMenu from './battle/ActionMenu.jsx'
import PixelSprite from './battle/PixelSprite.jsx'
import SkillDetailPopup from './battle/SkillDetailPopup.jsx'
import TargetSelector from './battle/TargetSelector.jsx'
import StatusEffectShake from './battle/StatusEffectShake.jsx'
import StatusEffectPopup from './battle/StatusEffectPopup.jsx'
import GlossarySummaryPopup from './common/GlossarySummaryPopup.jsx'
import { STATUS_EFFECT_COLORS } from '../data/statusEffectColors.js'
import { ELEMENT_COLORS } from '../data/colorPalette.js'
import { GLOSSARY_BY_TERM } from '../data/glossary.js'
import { renderGlossaryText } from '../utils/glossaryText.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// HP/MPバー
function Bar({ label, value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="bar-wrap">
      <div className="bar-label">
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="bar-bg">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// 弱体効果・バフのアイコン列（種類／スタック／残りターン表示）
// 状態異常アイコンは1個ずつ独立して表示され、それぞれタップで詳細ポップアップが開く
function EffectIcons({ combatant, onAilmentTap }) {
  const items = []
  for (const a of combatant.ailments) {
    const def = STATUS_EFFECTS[a.id]
    items.push(
      <span
        key={`a-${a.id}`}
        className="effect-chip ailment"
        title={def.name}
        onClick={(ev) => onAilmentTap && onAilmentTap(ev, combatant, a)}
      >
        {def.icon}×{a.stacks}<small>({a.turns}T)</small>
      </span>
    )
  }
  for (const m of combatant.mods) {
    const isDebuff = m.amount < 0
    items.push(
      <span key={`m-${m.uid}`} className={`effect-chip ${isDebuff ? 'debuff' : 'buff'}`}>
        {statLabel(m.stat)}{m.amount > 0 ? '+' : ''}{m.amount}%<small>({m.turns}T)</small>
      </span>
    )
  }
  if (combatant.flags.ailmentImmunityTurns > 0) {
    items.push(<span key="immune" className="effect-chip buff">🛡️異常無効<small>({combatant.flags.ailmentImmunityTurns}T)</small></span>)
  }
  if (items.length === 0) return null
  return <div className="effect-row">{items}</div>
}

export default function BattleScreen({ battle, setBattle, onExit, onOpenDictionary, monsterBoxFull = false }) {
  const [showLog, setShowLog] = useState(false)
  const [uiMode, setUiMode] = useState('menu')          // 'menu' | 'skillList'
  const [selectedSkillId, setSelectedSkillId] = useState(null) // 白枠選択中のスキル
  const [popupEntry, setPopupEntry] = useState(null)     // スキル詳細ポップアップ
  const [targeting, setTargeting] = useState(null)       // {kind:'attack'|'recruit'|'skill'|'skillAlly', entry?}
  const [effectPick, setEffectPick] = useState(null)     // 弱体効果の手動選択 {entry, candidates}
  const [busy, setBusy] = useState(false)                // 行動処理中（アニメーション中）
  const [activeActor, setActiveActor] = useState(null)   // 行動中ハイライト対象
  const [shakes, setShakes] = useState({ player: false, enemy: false })
  // 敵の上に浮かぶダメージ数字・miss表記（出してから約0.9秒で消す）
  const [enemyPops, setEnemyPops] = useState([])
  const popSeq = useRef(0)
  const showEnemyPops = (pops) => {
    if (pops.length === 0) return
    const withIds = pops.map((pop, i) => ({ ...pop, id: ++popSeq.current, order: i }))
    setEnemyPops((cur) => [...cur, ...withIds])
    const ids = new Set(withIds.map((pop) => pop.id))
    setTimeout(() => setEnemyPops((cur) => cur.filter((pop) => !ids.has(pop.id))), 900 + withIds.length * 120)
  }
  const [seShakes, setSeShakes] = useState({ player: null, enemy: null }) // 状態異常の色付きシェイク（色を保持）
  const [glossTerms, setGlossTerms] = useState(null) // まとめ用語ポップアップ
  const [sePopup, setSePopup] = useState(null) // 状態異常アイコンの詳細ポップアップ
  const [toast, setToast] = useState(null)
  const busyRef = useRef(false)

  const p = battle.player
  const e = battle.enemy
  const a = battle.ally || null // 一緒に戦う仲間（いなければnull）
  // ダンジョンの生成敵はENEMIESに存在しないため、battle側が保持する定義を優先する
  const enemyDef = e.enemyDef || ENEMIES[e.enemyId]
  const actions = getActionList(battle)
  const ended = battle.phase === 'ended'
  const extraTurn = battle.phase === 'extraInput'

  const refresh = () => setBattle({ ...battle })

  const resetSelection = () => {
    setUiMode('menu')
    setSelectedSkillId(null)
    setPopupEntry(null)
    setTargeting(null)
    setEffectPick(null)
  }

  // 行動を確定し、SPD順に1手ずつアニメーション付きで処理する
  const runAction = async (action) => {
    if (busyRef.current) return
    busyRef.current = true
    resetSelection()
    setBusy(true)
    beginRound(battle, action)
    refresh()

    while (battle.phase === 'acting') {
      // 次の行動者に緑ハイライトを移してから処理する
      const next = peekNextActor(battle)
      if (next) {
        setActiveActor(next)
        await sleep(500)
      }
      const before = { player: battle.player.stats.hp, enemy: battle.enemy.stats.hp }
      stepBattle(battle)
      refresh()
      // 状態異常イベント（付与・発動）を取り出す
      const uiEvents = battle.uiEvents ? battle.uiEvents.splice(0) : []
      const seEvents = uiEvents
        .filter((ev) => ev.type === 'ailmentApplied' || ev.type === 'ailmentTriggered')
      // 敵の上に出すダメージ数字／miss表記
      const enemyPops = uiEvents
        .filter((ev) => ev.target === 'enemy' && (ev.type === 'damage' || ev.type === 'miss'))
        .map((ev) => (ev.type === 'miss'
          ? { text: 'miss', kind: 'miss' }
          : {
              text: String(ev.amount),
              kind: 'damage',
              crit: ev.crit,
              // 数字の色＝攻撃した属性の色（無属性は白）
              color: ev.element ? ELEMENT_COLORS[ev.element] : null,
              // 弱点＝大きく太く／耐性＝小さく
              eff: ev.elemMult > 1 ? 'weak' : ev.elemMult < 1 ? 'resist' : null,
            }))
      // 攻撃以外で減ったHP（火傷などの継続ダメージ・混乱の自傷）も数字で出す
      const attackTotal = uiEvents
        .filter((ev) => ev.target === 'enemy' && ev.type === 'damage')
        .reduce((sum, ev) => sum + ev.amount, 0)
      // 勧誘に失敗した時は敵の上に「…」を出す（成功時は結果バナーが出る）
      if (uiEvents.some((ev) => ev.type === 'recruit' && !ev.success)) enemyPops.push({ text: '…', kind: 'miss' })
      const otherLoss = before.enemy - battle.enemy.stats.hp - attackTotal
      if (otherLoss > 0) enemyPops.push({ text: String(otherLoss), kind: 'damage' })
      showEnemyPops(enemyPops)
      // ダメージが入った側のパネルをシェイク（白系）
      const hit = {
        player: battle.player.stats.hp < before.player,
        enemy: battle.enemy.stats.hp < before.enemy,
      }
      if (hit.player || hit.enemy) {
        setShakes(hit)
        await sleep(450)
        setShakes({ player: false, enemy: false })
      } else if (seEvents.length === 0) {
        await sleep(250)
      }
      // 状態異常の色付きシェイク（該当色で1件ずつ順に再生。長引かないよう3件まで）
      for (const ev of seEvents.slice(0, 3)) {
        setSeShakes({ player: null, enemy: null, [ev.target]: STATUS_EFFECT_COLORS[ev.ailment] })
        await sleep(420)
        setSeShakes({ player: null, enemy: null })
        await sleep(60) // アニメーションを確実に再始動させるための小休止
      }
    }

    setActiveActor(null)
    setBusy(false)
    busyRef.current = false
    refresh()
  }

  // ===== スキルフロー =====
  // スキルは1タップで発動する（以前の「選択→詳細ポップアップ→使う」の3タップは廃止）
  // 対象が1体だけならそのまま発動、2体以上いる時だけ対象選択に入る（startTargeting側で判定）
  // 効果の説明はスキルボタン内に常に出ているので、戦闘中は詳細ポップアップを挟まない
  const onSkillTap = (entry) => {
    if (!entry.usable || busyRef.current) return
    onUseSkill(entry)
  }

  const onUseSkill = (entry) => {
    setPopupEntry(null)
    const skill = entry.skill
    const targetsSelf = ['self', 'ally', 'allies'].includes(skill.target)
    if (!targetsSelf || skill.attack) {
      // 敵対象スキル：対象選択へ（対象1体のみなら自動省略される）
      startTargeting('skill', entry)
    } else if (entry.needsManualTarget) {
      // 自分側対象で弱体効果の手動選択が必要（解除系）：対象選択へ（1人なら自動省略）
      startTargeting('skillAlly', entry)
    } else {
      // 対象不要（自己バフ・全体対象等）はそのまま行動確定（選択省略の影響なし）
      runAction({ type: 'skill', skillRef: entry.ref })
    }
  }

  // 対象（敵 or 自分）タップで行動確定。弱体効果の手動選択が必要ならその選択へ
  const confirmSkillTarget = (entry) => {
    if (entry.needsManualTarget) {
      const candidates = getManualTargetCandidates(battle, entry.skill)
      if (candidates.length > 0) {
        setTargeting(null)
        setEffectPick({ entry, candidates })
        return
      }
    }
    runAction({ type: 'skill', skillRef: entry.ref })
  }

  // ===== 対象選択 =====
  // 選択可能な対象を動的に列挙する
  // ※1体前提のハードコーディング禁止：将来パーティ/複数敵でここが2体以上を
  //   返すようになれば、選択画面（TargetSelector）が自動的に復活する
  const getSelectableTargets = (side) =>
    (side === 'ally' ? [battle.player] : [battle.enemy]).filter((c) => c.stats.hp > 0)

  // 対象確定後の実行処理（手動タップ・自動選択の両方から呼ばれる）
  const executeTargetedAction = (kind, entry) => {
    if (kind === 'attack') {
      runAction({ type: 'normalAttack' })
    } else if (kind === 'recruit') {
      // 仲間にする（勧誘）：そのターンの行動を使って勧誘する。成功すれば戦闘終了
      runAction({ type: 'recruit' })
    } else {
      confirmSkillTarget(entry)
    }
  }

  // 対象選択の開始：対象が1体のみなら選択画面を省略して即確定する
  const startTargeting = (kind, entry = null) => {
    const side = kind === 'skillAlly' ? 'ally' : 'enemy'
    const targets = getSelectableTargets(side)
    if (targets.length === 1) {
      executeTargetedAction(kind, entry) // 唯一の対象を自動選択（ハイライト演出なしで即実行）
    } else {
      setTargeting({ kind, entry }) // 2体以上は従来通り手動選択
    }
  }

  // ===== 対象パネルのタップ処理（手動選択時） =====
  const onEnemyTap = () => {
    if (!targeting || targeting.kind === 'skillAlly') return
    executeTargetedAction(targeting.kind, targeting.entry)
  }

  const onPlayerTap = () => {
    if (targeting?.kind === 'skillAlly') {
      executeTargetedAction(targeting.kind, targeting.entry)
    }
  }

  const onEscape = () => {
    escapeBattle(battle)
    resetSelection()
    refresh()
  }

  // 属性バッジのタップ：その属性名1つだけをまとめ用語ポップアップで表示する
  // 無属性（elementId=null。初期装備の武器等）は用語「無属性」を表示する
  const onElemChipTap = (ev, elementId) => {
    if (busy || targeting) return // 対象選択中はパネルタップ（対象確定）を優先する
    ev.stopPropagation()
    const entry = GLOSSARY_BY_TERM[getElementDef(elementId).name]
    if (entry) setGlossTerms([entry])
  }

  // 状態異常アイコンのタップ：その状態異常の詳細ポップアップを開く（敵・味方共通）
  const onAilmentTap = (ev, combatant, ailment) => {
    if (busy || targeting) return // 対象選択中はパネルタップ（対象確定）を優先する
    ev.stopPropagation()
    setSePopup({
      ailmentId: ailment.id,
      stacks: ailment.stacks,
      turns: ailment.turns,
      ownerName: combatant.name,
    })
  }

  const enemyTargetable = targeting && ['attack', 'recruit', 'skill'].includes(targeting.kind)
  const playerTargetable = targeting?.kind === 'skillAlly'
  const recentLog = battle.log.slice(-5)

  return (
    <div className="battle">
      {/* 敵情報 */}
      <div
        className={`enemy-panel panel ${activeActor === 'enemy' ? 'acting' : ''} ${enemyTargetable ? 'targetable' : ''} ${shakes.enemy ? 'shake' : ''}`}
        onClick={onEnemyTap}
      >
        <StatusEffectShake color={seShakes.enemy}>
          {/* ドラクエ風の敵ステージ：敵のドット絵を中央に置き、名前とHPバーはその真上 */}
          <div className="enemy-stage">
            <div className="enemy-hud">
              <div className="enemy-title">
                {e.name}
                <span className="elem-chip" onClick={(ev) => onElemChipTap(ev, e.element)}>
                  {getElementDef(e.element).icon}{getElementDef(e.element).name}
                </span>
              </div>
              <Bar label="HP" value={e.stats.hp} max={e.stats.maxHp} color="#e05555" />
              <EffectIcons combatant={e} onAilmentTap={onAilmentTap} />
            </div>
            {/* 被弾中（shakes.enemy）はドット絵を点滅。倒した時は消滅演出を優先 */}
            <div className={`enemy-sprite ${e.stats.hp <= 0 ? 'defeated' : shakes.enemy ? 'hit' : ''} ${enemyDef.isBoss ? 'boss' : ''}`}>
              <PixelSprite enemyDef={enemyDef} element={e.element} />
            </div>
            {/* ダメージ数字／miss：敵の真上に浮かんで消える。連続ヒットは少しずつずらして出す */}
            <div className="dmg-pop-layer">
              {enemyPops.map((pop) => (
                <span
                  key={pop.id}
                  className={`dmg-pop dmg-${pop.kind} ${pop.crit ? 'is-crit' : ''} ${pop.eff ? `eff-${pop.eff}` : ''}`}
                  style={{
                    animationDelay: `${pop.order * 120}ms`,
                    '--pop-x': `${[0, -38, 38][pop.order % 3]}px`,
                    ...(pop.color ? { color: pop.color } : {}),
                  }}
                >
                  {pop.text}
                </span>
              ))}
            </div>
          </div>
        </StatusEffectShake>
      </div>

      {/* 直近ログ */}
      <div className="log-recent" onClick={() => setShowLog(true)}>
        {recentLog.map((l, i) => (
          <div key={i} className={`log-line log-${l.kind}`}>{l.text}</div>
        ))}
        <div className="log-hint">▸</div>
      </div>

      {/* 自分の情報 */}
      <div
        className={`player-panel panel ${activeActor === 'player' ? 'acting' : ''} ${playerTargetable ? 'targetable' : ''} ${shakes.player ? 'shake' : ''}`}
        onClick={onPlayerTap}
      >
        <StatusEffectShake color={seShakes.player}>
          <div className="player-name">
            {p.name}
            {/* 初期装備の武器は無属性（p.element=null）なので無属性対応のヘルパーで表示する */}
            <span className="elem-chip" onClick={(ev) => onElemChipTap(ev, p.element)}>
              {getElementDef(p.element).icon}{getElementDef(p.element).name}
            </span>
            <span className="turn-label">ターン{battle.turn}</span>
          </div>
          <Bar label="HP" value={p.stats.hp} max={p.stats.maxHp} color="#4caf7d" />
          <Bar label="MP" value={p.stats.mp} max={p.stats.maxMp} color="#4a90d9" />
          <EffectIcons combatant={p} onAilmentTap={onAilmentTap} />
        </StatusEffectShake>
      </div>

      {/* 一緒に戦う仲間（自動で攻撃する。倒れても戦闘は続く） */}
      {a && (
        <div className={`ally-panel panel ${activeActor === 'ally' ? 'acting' : ''} ${a.stats.hp <= 0 ? 'down' : ''}`}>
          <div className="ally-sprite">
            <PixelSprite enemyDef={{ isBoss: a.allyDef.isBoss, sprite: a.allyDef.sprite }} element={a.element} size={36} />
          </div>
          <div className="ally-info">
            <div className="player-name">
              {a.name}
              <span className="elem-chip">{getElementDef(a.element).icon}{getElementDef(a.element).name}</span>
              {a.stats.hp <= 0 && <span className="turn-label">戦闘不能</span>}
            </div>
            <Bar label="HP" value={a.stats.hp} max={a.stats.maxHp} color="#4caf7d" />
            <EffectIcons combatant={a} onAilmentTap={onAilmentTap} />
          </div>
        </div>
      )}

      {/* 追加ターン表示 */}
      {extraTurn && !busy && <div className="extra-banner">⚡ 追加ターン！</div>}

      {/* スキル一覧（スキルコマンドで開く） */}
      {!ended && uiMode === 'skillList' && !targeting && (
        <div className="skill-area">
          <div className="skill-grid">
            {actions.map((entry) => {
              const elemClass = entry.skill.element ? `elem-${entry.skill.element}` : 'elem-none'
              // スキル名・効果テキスト内の用語を色付き表示（タップでまとめ用語ポップアップ）
              const nameText = renderGlossaryText(entry.displayName, setGlossTerms)
              const descText = renderGlossaryText(entry.skill.desc, setGlossTerms)
              return (
                <button
                  key={entry.skill.id}
                  className={`skill-btn ${elemClass} ${selectedSkillId === entry.skill.id ? 'selected' : ''}`}
                  disabled={!entry.usable || busy}
                  onClick={() => onSkillTap(entry)}
                >
                  <span className="skill-stars">{'★'.repeat(entry.skill.star)}</span>
                  <span className="skill-name">{nameText.nodes}</span>
                  <span className="skill-info">
                    MP{entry.mpCost}{entry.skill.element ? ` ${ELEMENTS[entry.skill.element].icon}` : ''}
                  </span>
                  <span className="skill-desc">{descText.nodes}</span>
                </button>
              )
            })}
          </div>
          <button className="back-btn" onClick={() => { setUiMode('menu'); setSelectedSkillId(null) }}>もどる</button>
        </div>
      )}

      {/* コマンド4ボタン（常時表示） */}
      {!ended && (
        <div className="command-area">
          {targeting && <TargetSelector onCancel={() => setTargeting(null)} />}
          <ActionMenu
            disabled={busy || Boolean(targeting)}
            recruitChance={getRecruitChance(battle)}
            boxFull={monsterBoxFull}
            onAttack={() => { resetSelection(); startTargeting('attack') }}
            onSkills={() => { setUiMode(uiMode === 'skillList' ? 'menu' : 'skillList'); setSelectedSkillId(null) }}
            onRecruit={() => { resetSelection(); startTargeting('recruit') }}
            onEscape={onEscape}
          />
        </div>
      )}

      {/* 決着 */}
      {ended && (
        <div className="result-area">
          <div className={`result-banner ${battle.result}`}>
            {battle.result === 'win' && '🎉 勝利！'}
            {battle.result === 'recruit' && '🤝 仲間になった！'}
            {battle.result === 'lose' && '💀 敗北…'}
            {battle.result === 'escape' && '🏃 逃げ出した'}
            {battle.result === 'draw' && '⏱️ 引き分け'}
          </div>
          {/* 勝利ならドロップ結果へ、それ以外はロビーへ（遷移先の判断はApp側） */}
          <button className="start-btn" onClick={onExit}>
            {battle.result === 'win' || battle.result === 'recruit' ? 'けっかへ' : 'ロビーに戻る'}
          </button>
        </div>
      )}

      {/* スキル詳細ポップアップ（戦闘中は「使う」付き） */}
      {popupEntry && (
        <SkillDetailPopup
          skill={popupEntry.skill}
          displayName={popupEntry.displayName}
          mpCost={popupEntry.mpCost}
          usable={popupEntry.usable && !busy}
          onUse={() => onUseSkill(popupEntry)}
          onClose={() => setPopupEntry(null)}
          onOpenDictionary={onOpenDictionary}
        />
      )}

      {/* 弱体効果の手動選択（解除系・操作系） */}
      {effectPick && (
        <div className="modal-overlay" onClick={() => setEffectPick(null)}>
          <div className="modal-sheet" onClick={(ev) => ev.stopPropagation()}>
            <h3>対象の効果を選択</h3>
            {effectPick.candidates.map((c) => (
              <button
                key={c.key}
                className="select-btn"
                onClick={() => {
                  const { entry } = effectPick
                  setEffectPick(null)
                  runAction({ type: 'skill', skillRef: entry.ref, manualTargetKey: c.key })
                }}
              >
                {c.label}
              </button>
            ))}
            <button className="select-btn cancel" onClick={() => setEffectPick(null)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 状態異常アイコンの詳細ポップアップ */}
      {sePopup && <StatusEffectPopup info={sePopup} onClose={() => setSePopup(null)} />}

      {/* 仲間にする等の通知トースト */}
      {toast && <div className="toast">{toast}</div>}

      {/* まとめ用語ポップアップ（スキル一覧の色付き用語タップで開く） */}
      {glossTerms && (
        <GlossarySummaryPopup
          terms={glossTerms}
          onClose={() => setGlossTerms(null)}
          onOpenDictionary={onOpenDictionary}
        />
      )}

      {/* ログ履歴ボトムシート */}
      {showLog && (
        <div className="modal-overlay" onClick={() => setShowLog(false)}>
          <div className="modal-sheet log-sheet" onClick={(ev) => ev.stopPropagation()}>
            <h3>戦闘ログ</h3>
            <div className="log-history">
              {battle.log.map((l, i) => (
                <div key={i} className={`log-line log-${l.kind}`}>
                  <span className="log-turn">T{l.turn}</span> {l.text}
                </div>
              ))}
            </div>
            <button className="select-btn cancel" onClick={() => setShowLog(false)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}
