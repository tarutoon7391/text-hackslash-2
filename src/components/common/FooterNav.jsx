// フッター固定ナビゲーション（フェーズ3パート2）
// 拠点の画面（ロビー・装備）で表示する下部タブバー
// ダンジョン探索中（ダンジョン・戦闘・リザルト）は表示しない（出し分けはApp側で行う）
const TABS = [
  { key: 'home', icon: '🏰', label: 'ダンジョン' },
  { key: 'equipment', icon: '🎒', label: '装備' },
  { key: 'monsters', icon: '🤝', label: '仲間' },
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
