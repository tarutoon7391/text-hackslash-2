// まとめ用語ポップアップ（シャドウバースの「能力詳細」方式）
// テキストに登場した用語すべてを、見出し＋説明のリストで1つのポップアップにまとめて表示する
// 閉じるボタン、または外側（背景オーバーレイ）タップで閉じる
// onOpenDictionaryを渡すと「全用語を見る」ボタンが付き、用語辞典画面を開ける
export default function GlossarySummaryPopup({ terms, onClose, onOpenDictionary }) {
  if (!terms || terms.length === 0) return null
  // 外側タップで閉じる。ただし親レイヤー（スキル詳細ポップアップ等）まで
  // 一緒に閉じないよう、イベントの伝播はここで止める
  const closeSelf = (ev) => {
    ev.stopPropagation()
    onClose()
  }
  // 用語辞典はオーバーレイとして上に重なるだけなので、
  // このポップアップは閉じずに残す（辞典から戻ると元の状態に復帰する）
  const openDictionary = (ev) => {
    ev.stopPropagation()
    onOpenDictionary()
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
        {onOpenDictionary && (
          <button className="select-btn" onClick={openDictionary}>📖 全用語を見る</button>
        )}
        <button className="select-btn cancel" onClick={closeSelf}>閉じる</button>
      </div>
    </div>
  )
}
