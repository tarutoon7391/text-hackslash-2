// 仲間モンスター一覧画面
// 戦闘中の「仲間にする」で勧誘に成功したモンスターが並ぶ（最大10体）
// 1体だけ「連れていく」に選べて、その仲間は戦闘でプレイヤーと一緒に戦う（自動で通常攻撃）
import { useState } from 'react'
import { getElementDef, getElementLabel } from '../data/elements.js'
import { ELEMENT_COLORS } from '../data/colorPalette.js'
import { MONSTER_BOX_MAX, calcMonsterStats } from '../systems/monsterState.js'
import { expToNextLevel } from '../systems/progressState.js'
import PixelSprite from '../components/battle/PixelSprite.jsx'

export default function MonsterScreen({ monsters, partyId = null, onToggleParty, onRelease, onBack }) {
  const [releasingId, setReleasingId] = useState(null) // 「別れる」の確認中のモンスターID
  const full = monsters.length >= MONSTER_BOX_MAX

  return (
    <div className="equip-screen">
      <div className="equip-header">
        <button className="dict-back" onClick={onBack}>← 拠点</button>
        <span className="dict-title">🤝 仲間モンスター（{monsters.length}/{MONSTER_BOX_MAX}）</span>
      </div>
      <div className="equip-body">
        <div className="equip-hint">
          戦闘中の「仲間にする」で勧誘できる（ボスは不可）。持てるのは{MONSTER_BOX_MAX}体まで。
          1体だけ連れていけて、戦闘で一緒に戦ってくれる（自動で攻撃）。連れていった仲間は経験値をもらって育つ
        </div>
        {full && <div className="depart-note">⚠️ 仲間が満員。これ以上仲間にするには、誰かと別れる必要がある</div>}
        {monsters.length === 0 ? (
          <div className="equip-hint">まだ仲間がいない</div>
        ) : (
          <div className="equip-list">
            {monsters.map((m) => {
              const elem = getElementDef(m.element)
              const color = ELEMENT_COLORS[m.element] || ELEMENT_COLORS.none
              const st = calcMonsterStats(m)
              const inParty = m.id === partyId
              return (
                <div key={m.id} className={`monster-card ${inParty ? 'in-party' : ''}`} style={{ borderColor: color }}>
                  <div className="monster-sprite">
                    <PixelSprite enemyDef={{ isBoss: m.isBoss, sprite: m.sprite }} element={m.element} size={56} />
                  </div>
                  <div className="monster-info">
                    <div className="monster-name">
                      {m.name} <span className="monster-level">Lv{m.level}</span>
                      {inParty && <span className="equip-badge">同行中</span>}
                    </div>
                    <div className="weapon-meta">
                      {elem.icon}{getElementLabel(m.element)}
                      {m.floor != null && ` ／ ${m.floor}階で仲間に`}
                      {` ／ 次のLvまで ${Math.max(0, expToNextLevel(m.level) - m.exp)}`}
                    </div>
                    <div className="weapon-meta">
                      HP{st.hp}／ATK{st.atk}／DEF{st.def}／SPD{st.spd}
                    </div>
                  </div>
                  <div className="monster-actions">
                    {releasingId === m.id ? (
                      <>
                        <button className="quick-equip-btn release-yes" onClick={() => { onRelease(m.id); setReleasingId(null) }}>
                          別れる
                        </button>
                        <button className="quick-equip-btn" onClick={() => setReleasingId(null)}>やめる</button>
                      </>
                    ) : (
                      <>
                        <button
                          className={`quick-equip-btn ${inParty ? 'equipped' : ''}`}
                          onClick={() => onToggleParty(m.id)}
                        >
                          {inParty ? '外す' : '連れていく'}
                        </button>
                        <button className="quick-equip-btn monster-release-btn" onClick={() => setReleasingId(m.id)}>
                          別れる
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
