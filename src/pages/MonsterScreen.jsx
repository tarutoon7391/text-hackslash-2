// 仲間モンスター一覧画面
// 戦闘中の「仲間にする」で勧誘に成功したモンスターが並ぶ
// 現段階は「集めるだけ」：まだ戦闘には連れていけない（同行・育成は今後）
import { useState } from 'react'
import { getElementDef, getElementLabel } from '../data/elements.js'
import { ELEMENT_COLORS } from '../data/colorPalette.js'
import PixelSprite from '../components/battle/PixelSprite.jsx'

export default function MonsterScreen({ monsters, onRelease, onBack }) {
  const [releasingId, setReleasingId] = useState(null) // 「別れる」の確認中のモンスターID

  return (
    <div className="equip-screen">
      <div className="equip-header">
        <button className="dict-back" onClick={onBack}>← 拠点</button>
        <span className="dict-title">🤝 仲間モンスター（{monsters.length}）</span>
      </div>
      <div className="equip-body">
        <div className="equip-hint">
          戦闘中の「仲間にする」で勧誘できる。敵のHPを減らすほど成功しやすい（ボスは不可）。
          今は集めるだけで、まだ戦闘には連れていけない
        </div>
        {monsters.length === 0 ? (
          <div className="equip-hint">まだ仲間がいない</div>
        ) : (
          <div className="equip-list">
            {monsters.map((m) => {
              const elem = getElementDef(m.element)
              const color = ELEMENT_COLORS[m.element] || ELEMENT_COLORS.none
              return (
                <div key={m.id} className="monster-card" style={{ borderColor: color }}>
                  <div className="monster-sprite">
                    <PixelSprite enemyDef={{ isBoss: m.isBoss, sprite: m.sprite }} element={m.element} size={56} />
                  </div>
                  <div className="monster-info">
                    <div className="monster-name">{m.name}</div>
                    <div className="weapon-meta">
                      {elem.icon}{getElementLabel(m.element)}
                      {m.floor != null && ` ／ ${m.floor}階で仲間に`}
                    </div>
                    <div className="weapon-meta">
                      HP{m.stats.hp}／ATK{m.stats.atk}／DEF{m.stats.def}／SPD{m.stats.spd}
                    </div>
                  </div>
                  {releasingId === m.id ? (
                    <div className="monster-release">
                      <button className="quick-equip-btn release-yes" onClick={() => { onRelease(m.id); setReleasingId(null) }}>
                        別れる
                      </button>
                      <button className="quick-equip-btn" onClick={() => setReleasingId(null)}>やめる</button>
                    </div>
                  ) : (
                    <button className="quick-equip-btn monster-release-btn" onClick={() => setReleasingId(m.id)}>
                      別れる
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
