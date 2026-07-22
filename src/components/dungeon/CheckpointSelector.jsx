// チェックポイント選択：到達済みチェックポイントから出発階を選ぶ（初回は1階のみ）
import { ELEMENTS } from '../../data/elements.js'
import { floorToZoneElement } from '../../systems/dungeonState.js'

export default function CheckpointSelector({ checkpoints, selected, onSelect }) {
  return (
    <div className="cp-grid">
      {checkpoints.map((floor) => {
        const elem = ELEMENTS[floorToZoneElement(floor)]
        return (
          <button
            key={floor}
            className={`cp-btn ${selected === floor ? 'selected' : ''}`}
            onClick={() => onSelect(floor)}
          >
            <span className="cp-floor">{floor}階</span>
            <span className="cp-zone">{elem.icon}{elem.name}</span>
          </button>
        )
      })}
    </div>
  )
}
