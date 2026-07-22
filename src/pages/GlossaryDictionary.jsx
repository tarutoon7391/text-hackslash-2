// 用語辞典画面：glossary.jsの全用語をカテゴリ別に一覧表示する
// 一覧性が必要なコンテンツのためスクロール可（GDDスクロール最小主義の例外）
// 元の画面（戦闘中含む）の上にオーバーレイ表示するため、
// 遷移しても元の画面の状態（戦闘のHP/MP・ターン進行等）は失われない
import { GLOSSARY } from '../data/glossary.js'

export default function GlossaryDictionary({ onBack }) {
  // カテゴリ別にグルーピング（glossary.jsの登場順を維持）
  const groups = []
  for (const entry of GLOSSARY) {
    let group = groups.find((g) => g.category === entry.category)
    if (!group) {
      group = { category: entry.category, items: [] }
      groups.push(group)
    }
    group.items.push(entry)
  }

  return (
    <div className="dict-screen">
      <div className="dict-header">
        <button className="dict-back" onClick={onBack}>← もどる</button>
        <h2 className="dict-title">📖 用語辞典</h2>
      </div>
      <div className="dict-body">
        {groups.map((g) => (
          <section key={g.category} className="dict-section">
            <h3 className="dict-category">{g.category}</h3>
            {g.items.map((t) => (
              <div key={t.term} className="gloss-item">
                <h4 style={{ color: t.color }}>{t.term}</h4>
                <p>{t.description}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
