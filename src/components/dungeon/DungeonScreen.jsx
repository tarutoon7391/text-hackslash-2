// ダンジョン画面：現在の階層とゾーン属性を表示し、「進む」で次のエンカウントへ
// 1画面完結（スクロールなし）
import { ELEMENTS } from '../../data/elements.js'
import { ELEMENT_COLORS } from '../../data/colorPalette.js'
import { floorToZoneElement, isBossFloor, floorInBlock } from '../../systems/dungeonState.js'
import { DUNGEON_CONFIG } from '../../data/dungeonConfig.js'

export default function DungeonScreen({ floor, onAdvance, onReturnLobby }) {
  const zone = floorToZoneElement(floor)
  const boss = isBossFloor(floor)
  const elem = ELEMENTS[zone]
  const color = ELEMENT_COLORS[zone]
  const inBlock = floorInBlock(floor)

  return (
    <div className="dungeon">
      <div className="dungeon-zone" style={{ borderColor: color }}>
        <div className="dungeon-zone-label" style={{ color }}>
          {elem.icon} {elem.name}属性ゾーン
        </div>
        <div className="dungeon-floor">{floor}<small>階</small></div>
        <div className="dungeon-progress">
          ブロック {inBlock}/{DUNGEON_CONFIG.blockSize}
          {boss && <span className="dungeon-boss-label">⚠️ ボス階</span>}
        </div>
      </div>

      <div className="dungeon-hint">
        {boss
          ? 'このフロアのボスを倒すと、次のチェックポイントが解放される'
          : 'この先に敵の気配がする…'}
      </div>

      <div className="dungeon-actions">
        <button className="start-btn" onClick={onAdvance}>
          {boss ? '⚔️ ボスに挑む' : '⚔️ 進む'}
        </button>
        <button className="back-btn" onClick={onReturnLobby}>ロビーに戻る</button>
      </div>
    </div>
  )
}
