// フッター固定ナビゲーション（フェーズ3パート2）
// 通常画面（ロビー・装備・ダンジョン・リザルト）で常時表示する下部タブバー
// 戦闘画面では表示しない（戦闘に集中させるため。出し分けはApp側で行う）
const TABS = [
  { key: 'home', icon: '🏰', label: 'ダンジョン' },
  { key: 'equipment', icon: '🎒', label: '装備' },
  { key: 'dictionary', icon: '📖', label: '辞典' },
]

export default function FooterNav({ current, onNavigate }) {
  return (
    <nav className="footer-nav">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`footer-tab ${current === t.key ? 'active' : ''}`}
          onClick={() => onNavigate(t.key)}
        >
          <span className="footer-tab-icon">{t.icon}</span>
          <span className="footer-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
