// 対象選択モードの共通UI
// 選択可能な対象は .targetable クラス（白い発光ハイライト）で示し、
// 対象パネルを直接タップして確定する方式。
// このコンポーネント自体は「もどる」操作だけを提供する（押すと対象選択をやめて直前の画面に戻る）
// （説明テキストは出さず、発光の挙動だけで直感的に分かる作りにする）
export default function TargetSelector({ onCancel }) {
  return (
    <div className="target-bar">
      <button className="cancel-target" onClick={onCancel}>← もどる</button>
    </div>
  )
}
