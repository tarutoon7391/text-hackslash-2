// 状態異常の色付きシェイク演出
// 付与イベント・発動イベント発生時に、対象キャラのステータス表示（HP/MPバー周辺）を
// 該当状態異常の色で光らせながら揺らす。
// 白系のダメージシェイク（パネル全体の横揺れ）とは動き（縦揺れ）と色付きグローで区別する。
// colorがnullのときは何もしないラッパーとして振る舞う
export default function StatusEffectShake({ color, children }) {
  return (
    <div
      className={`se-wrap ${color ? 'se-active' : ''}`}
      style={color ? { '--se-color': color } : undefined}
    >
      {children}
    </div>
  )
}
