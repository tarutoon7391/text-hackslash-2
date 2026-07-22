// まとめ用語ポップアップ（シャドウバースの「能力詳細」方式）
// テキストに登場した用語すべてを、見出し＋説明のリストで1つのポップアップにまとめて表示する
// 閉じるボタン、または外側（背景オーバーレイ）タップで閉じる
export default function GlossarySummaryPopup({ terms, onClose }) {
  if (!terms || terms.length === 0) return null
  // 外側タップで閉じる。ただし親レイヤー（スキル詳細ポップアップ等）まで
  // 一緒に閉じないよう、イベントの伝播はここで止める
  const closeSelf = (ev) => {
    ev.stopPropagation()
    onClose()
  }
  return (
    <div className="gloss-overlay" onClick={closeSelf}>
      <div className="gloss-popup" onClick={(ev) => ev.stopPropagation()}>
        <h3 className="gloss-title">用語詳細</h3>
        <div className="gloss-list">
          {terms.map((t) => (
            <div key={t.term} className="gloss-item">
              <h4 style={{ color: t.color }}>
                {t.term}
                <span className="gloss-category">{t.category}</span>
              </h4>
              <p>{t.description}</p>
            </div>
          ))}
        </div>
        <button className="select-btn cancel" onClick={closeSelf}>閉じる</button>
      </div>
    </div>
  )
}
