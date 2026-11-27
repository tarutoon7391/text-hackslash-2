// 戦闘コマンドの3ボタンメニュー（こうげき／スキル／逃げる）
// 戦闘画面下部に常時表示する
export default function ActionMenu({ disabled, onAttack, onSkills, onEscape }) {
  return (
    <div className="action-menu">
      <button className="cmd-btn" disabled={disabled} onClick={onAttack}>
        <span className="cmd-icon">⚔️</span>こうげき
      </button>
      <button className="cmd-btn" disabled={disabled} onClick={onSkills}>
        <span className="cmd-icon">✨</span>スキル
      </button>
      <button className="cmd-btn escape" disabled={disabled} onClick={onEscape}>
        <span className="cmd-icon">🏃</span>逃げる
      </button>
    </div>
  )
}
