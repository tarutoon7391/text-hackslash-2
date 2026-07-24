// 抽出の確認ダイアログ（GDD 11番）
// 抽出は元装備が破壊される不可逆な操作なので、実行前に必ずこのダイアログを挟む
// 見た目はスキル詳細ポップアップと同系統（popup-overlay＋skill-popup）
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'

export default function ExtractConfirmDialog({ item, target, onConfirm, onCancel }) {
  // target: {kind: 'skill'|'enchant', entry} 抽出対象の1つ
  const targetName =
    target.kind === 'skill'
      ? (() => {
          const skill = ALL_SKILLS_BY_ID[target.entry.skillId]
          return `${skill.name}${target.entry.plus > 0 ? `(+${target.entry.plus})` : ''}`
        })()
      : target.entry.name.replace('%', `${target.entry.value}%`)

  const closeSelf = (ev) => {
    ev.stopPropagation()
    onCancel()
  }

  return (
    <div className="popup-overlay" onClick={closeSelf}>
      <div className="skill-popup extract-popup" onClick={(ev) => ev.stopPropagation()}>
        <div className="popup-name">
          {target.kind === 'skill' ? 'スキル' : 'エンチャント'}を抽出する？
        </div>
        <div className="extract-target-name">
          {target.kind === 'skill' ? '⚔️' : '✦'} {targetName}
        </div>
        <div className="popup-desc">
          「{targetName}」を抽出してインベントリに移す。
        </div>
        <div className="extract-warning">
          ⚠️ 抽出すると装備「{item.name}」は破壊される。
          他のスキル・エンチャントも一緒に失われ、元に戻すことはできない。
        </div>
        <button className="use-btn danger" onClick={onConfirm}>抽出する（装備は破壊）</button>
        <button className="select-btn cancel" onClick={closeSelf}>やめる</button>
      </div>
    </div>
  )
}
