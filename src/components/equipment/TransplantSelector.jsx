// 移植セレクター（GDD 11番）：抽出インベントリから1つ選んで対象の枠に上書きする
// 対象がスキル枠ならスキルインベントリ、エンチャント枠ならエンチャントインベントリのみ表示
// 候補の表示は共通チップコンポーネントの枠選択モードを再利用する
// （1タップで選択、選択済みをもう1回タップで詳細ポップアップ）
// 渋カーブ組の重複（GDD 10.3）は確定時にバリデーションして弾き、エラー表示する
import { useState } from 'react'
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'
import SkillChipList from '../common/SkillChipList.jsx'
import EnchantChipList from '../common/EnchantChipList.jsx'
import {
  validateSkillTransplant,
  validateEnchantTransplant,
} from '../../systems/extractInventoryState.js'

export default function TransplantSelector({ item, target, candidates, onApply, onCancel, onOpenDictionary }) {
  // target: {kind: 'skill'|'enchant', index} 上書き先の枠
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [error, setError] = useState(null)

  const isSkill = target.kind === 'skill'
  const kindLabel = isSkill ? 'スキル' : 'エンチャント'

  // 上書きで消滅する現在の中身（空き枠ならnull）
  const current = isSkill ? item.skills?.[target.index] : item.enchants?.[target.index]
  const currentName = current
    ? isSkill
      ? `${ALL_SKILLS_BY_ID[current.skillId].name}${current.plus > 0 ? `(+${current.plus})` : ''}`
      : current.name.replace('%', `${current.value}%`)
    : null

  // 候補を選び直したら前回のエラーは消す
  const selectCandidate = (idx) => {
    setSelectedIdx(idx)
    setError(null)
  }

  const confirm = () => {
    const entry = candidates[selectedIdx]
    if (!entry) return
    const validationError = isSkill
      ? validateSkillTransplant({ item, targetIndex: target.index, entry })
      : validateEnchantTransplant({ item, targetIndex: target.index, entry })
    if (validationError) {
      setError(validationError)
      return
    }
    onApply(entry)
  }

  return (
    <div className="modal-overlay transplant-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(ev) => ev.stopPropagation()}>
        <h3>移植する{kindLabel}を選ぶ</h3>
        <div className="transplant-note">
          {currentName
            ? `⚠️ この枠の「${currentName}」は上書きで消滅する`
            : '空き枠に新しく追加する'}
          。移植に使った{kindLabel}はインベントリから消費される。
        </div>

        {candidates.length === 0 ? (
          <div className="transplant-empty">
            抽出済みの{kindLabel}がまだ無い。装備から抽出するとここに並ぶ。
          </div>
        ) : (
          <div className="transplant-list">
            {/* 候補一覧：共通チップの枠選択モードを再利用（空き枠なし・候補数ぶんだけ表示） */}
            {isSkill ? (
              <SkillChipList
                skills={candidates}
                slotCount={candidates.length}
                selectedSlot={selectedIdx}
                onSelectSlot={selectCandidate}
                onOpenDictionary={onOpenDictionary}
              />
            ) : (
              <EnchantChipList
                enchants={candidates}
                slotCount={candidates.length}
                selectedSlot={selectedIdx}
                onSelectSlot={selectCandidate}
              />
            )}
          </div>
        )}

        {error && <div className="transplant-error">🚫 {error}</div>}

        <button className="use-btn" disabled={selectedIdx == null} onClick={confirm}>
          この{kindLabel}を移植する
        </button>
        <button className="select-btn cancel" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}
