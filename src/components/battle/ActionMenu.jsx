// 戦闘コマンドの4ボタンメニュー（こうげき／スキル／仲間にする／逃げる）
// 戦闘画面下部に常時表示する
// recruitChance：今の勧誘成功率（0〜1）。敵のHPを減らすほど上がる。0ならボス等で勧誘できない
export default function ActionMenu({ disabled, recruitChance = 0, onAttack, onSkills, onRecruit, onEscape }) {
  const canRecruit = recruitChance > 0
  return (
    <div className="action-menu">
      <button className="cmd-btn" disabled={disabled} onClick={onAttack}>
        <span className="cmd-icon">⚔️</span>こうげき
      </button>
      <button className="cmd-btn" disabled={disabled} onClick={onSkills}>
        <span className="cmd-icon">✨</span>スキル
      </button>
      <button className="cmd-btn" disabled={disabled || !canRecruit} onClick={onRecruit}>
        <span className="cmd-icon">🤝</span>仲間にする
        <span className="cmd-sub">{canRecruit ? `成功率${Math.round(recruitChance * 100)}%` : '不可'}</span>
      </button>
      <button className="cmd-btn escape" disabled={disabled} onClick={onEscape}>
        <span className="cmd-icon">🏃</span>逃げる
      </button>
    </div>
  )
}
