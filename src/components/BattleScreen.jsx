// 戦闘画面：1画面完結（敵情報・自HP/MP・弱体効果アイコン・スキルボタン・直近ログ）
// ログ履歴はボトムシートで別途スクロール参照
import { useState } from 'react'
import { ELEMENTS } from '../data/elements.js'
import { ENEMIES } from '../data/enemies.js'
import { STATUS_EFFECTS } from '../data/statusEffects.js'
import { BATTLE_CONFIG } from '../data/battleConfig.js'
import {
  submitPlayerAction, getActionList, getManualTargetCandidates, statLabel,
} from '../systems/battleEngine.js'

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
function EffectIcons({ combatant }) {
  const items = []
  for (const a of combatant.ailments) {
    const def = STATUS_EFFECTS[a.id]
    items.push(
      <span key={`a-${a.id}`} className="effect-chip ailment" title={def.name}>
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

export default function BattleScreen({ battle, setBattle, onExit }) {
  const [showLog, setShowLog] = useState(false)
  // 手動選択待ち：{action, candidates}
  const [pendingSelect, setPendingSelect] = useState(null)

  const p = battle.player
  const e = battle.enemy
  const enemyDef = ENEMIES[e.enemyId]
  const actions = getActionList(battle)
  const ended = battle.phase === 'ended'
  const extraTurn = battle.phase === 'extraInput'

  const doAction = (action) => {
    submitPlayerAction(battle, action)
    setBattle({ ...battle }) // 再レンダリング用に参照を更新
  }

  const onSkillTap = (entry) => {
    if (!entry.usable || ended) return
    if (entry.needsManualTarget) {
      const candidates = getManualTargetCandidates(battle, entry.skill)
      if (candidates.length > 0) {
        setPendingSelect({ ref: entry.ref, candidates })
        return
      }
      // 対象がなければそのまま使用（効果は空振り）
    }
    doAction({ type: 'skill', skillRef: entry.ref })
  }

  const recentLog = battle.log.slice(-5)

  return (
    <div className="battle">
      {/* 敵情報 */}
      <div className="enemy-panel">
        <div className="enemy-header">
          <span className="enemy-big-icon">{enemyDef.icon}</span>
          <div className="enemy-info">
            <div className="enemy-title">
              {e.name}
              <span className="elem-chip">{ELEMENTS[e.element].icon}{ELEMENTS[e.element].name}</span>
            </div>
            <Bar label="HP" value={e.stats.hp} max={e.stats.maxHp} color="#e05555" />
          </div>
        </div>
        <EffectIcons combatant={e} />
      </div>

      {/* 直近ログ */}
      <div className="log-recent" onClick={() => setShowLog(true)}>
        {recentLog.map((l, i) => (
          <div key={i} className={`log-line log-${l.kind}`}>{l.text}</div>
        ))}
        <div className="log-hint">タップで全ログ表示 ▸</div>
      </div>

      {/* 自分の情報 */}
      <div className="player-panel">
        <div className="player-name">
          {p.name}
          <span className="elem-chip">{ELEMENTS[p.element].icon}{ELEMENTS[p.element].name}</span>
          <span className="turn-label">ターン{battle.turn}</span>
        </div>
        <Bar label="HP" value={p.stats.hp} max={p.stats.maxHp} color="#4caf7d" />
        <Bar label="MP" value={p.stats.mp} max={p.stats.maxMp} color="#4a90d9" />
        <EffectIcons combatant={p} />
      </div>

      {/* 追加ターン表示 */}
      {extraTurn && <div className="extra-banner">⚡ 追加ターン！もう一度行動できる</div>}

      {/* 行動ボタン */}
      {!ended && (
        <div className="skill-area">
          <div className="skill-grid">
            {actions.map((entry, i) => (
              <button
                key={i}
                className={`skill-btn ${entry.skill.element ? 'elemental' : ''}`}
                disabled={!entry.usable}
                onClick={() => onSkillTap(entry)}
              >
                <span className="skill-name">{entry.displayName}</span>
                <span className="skill-info">
                  MP{entry.mpCost}{entry.skill.element ? ` ${ELEMENTS[entry.skill.element].icon}` : ''}
                </span>
                <span className="skill-desc">{entry.skill.desc}</span>
              </button>
            ))}
            <button className="skill-btn basic" onClick={() => doAction({ type: 'basic' })}>
              <span className="skill-name">{BATTLE_CONFIG.basicAttack.name}</span>
              <span className="skill-info">MP0</span>
              <span className="skill-desc">通常攻撃</span>
            </button>
          </div>
        </div>
      )}

      {/* 決着 */}
      {ended && (
        <div className="result-area">
          <div className={`result-banner ${battle.result}`}>
            {battle.result === 'win' ? '🎉 勝利！' : '💀 敗北…'}
          </div>
          <button className="start-btn" onClick={onExit}>セットアップへ戻る</button>
        </div>
      )}

      {/* 手動対象選択モーダル（解除・操作系） */}
      {pendingSelect && (
        <div className="modal-overlay" onClick={() => setPendingSelect(null)}>
          <div className="modal-sheet" onClick={(ev) => ev.stopPropagation()}>
            <h3>対象を選択</h3>
            {pendingSelect.candidates.map((c) => (
              <button
                key={c.key}
                className="select-btn"
                onClick={() => {
                  doAction({ type: 'skill', skillRef: pendingSelect.ref, manualTargetKey: c.key })
                  setPendingSelect(null)
                }}
              >
                {c.label}
              </button>
            ))}
            <button className="select-btn cancel" onClick={() => setPendingSelect(null)}>キャンセル</button>
          </div>
        </div>
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
