// アプリ全体の画面フロー管理
// ロビー → ダンジョン → 戦闘 → 勝利ならドロップ結果 →（次の階 or ロビー）
// 敗北・逃走は常にロビーへ戻る（GDD 14番）
// ロビー ⇔ 装備管理（抽出・移植）はフェーズ3。装備スロットと抽出物はここで保持する
// 用語辞典はオーバーレイとして重ねるので、どの画面の状態も失われない
import { useState } from 'react'
import SetupScreen from './components/SetupScreen.jsx'
import BattleScreen from './components/BattleScreen.jsx'
import DungeonScreen from './components/dungeon/DungeonScreen.jsx'
import LootResultScreen from './components/dungeon/LootResultScreen.jsx'
import GlossaryDictionary from './pages/GlossaryDictionary.jsx'
import EquipmentScreen from './pages/EquipmentScreen.jsx'
import { createBattle } from './systems/battleEngine.js'
import { useDungeonState, isBossFloor } from './systems/dungeonState.js'
import { useInventoryState } from './systems/inventoryState.js'
import { useEquipmentState } from './systems/equipmentState.js'
import { useExtractInventoryState } from './systems/extractInventoryState.js'
import { generateEnemy } from './systems/enemyGenerator.js'
import { generateLoot } from './systems/lootSystem.js'

export default function App() {
  const [screen, setScreen] = useState('lobby') // lobby | equipment | dungeon | battle | loot
  const [battle, setBattle] = useState(null)
  // 職業はロビーと装備管理画面で共有する（武器スロットの装備可否チェックに使う）
  const [jobId, setJobId] = useState('swordsman')
  const [loadout, setLoadout] = useState(null)   // {jobId, weapon}
  const [lastLoot, setLastLoot] = useState(null) // 直近のドロップ（リザルト表示用）
  const [lootFloor, setLootFloor] = useState(null)
  const [showDictionary, setShowDictionary] = useState(false)
  const dungeon = useDungeonState()
  const inventory = useInventoryState()
  const equipment = useEquipmentState()
  const extractInv = useExtractInventoryState()

  // ロビーから出発
  const depart = ({ weapon, startFloor }) => {
    setLoadout({ jobId, weapon })
    dungeon.enterDungeon(startFloor)
    setScreen('dungeon')
  }

  // ダンジョンで「進む」→ その階の敵を生成して戦闘開始
  const advance = () => {
    const enemyDef = generateEnemy({ floor: dungeon.currentFloor })
    setBattle(createBattle({ jobId: loadout.jobId, weapon: loadout.weapon, enemyDef }))
    setScreen('battle')
  }

  // 戦闘終了（勝利→ドロップ生成してリザルトへ／敗北・逃走→ロビーへ）
  const exitBattle = () => {
    const result = battle?.result
    const floor = dungeon.currentFloor
    setBattle(null)
    if (result === 'win' && floor != null) {
      const grade = isBossFloor(floor) ? 'boss' : 'grunt'
      const item = generateLoot({ floor, grade })
      inventory.addItem(item)
      // ボス撃破で次ブロックの先頭階（次のチェックポイント）を解放
      if (isBossFloor(floor)) dungeon.unlockCheckpoint(floor + 1)
      setLastLoot(item)
      setLootFloor(floor)
      setScreen('loot')
    } else {
      // 敗北・逃走時は常にロビーへ（特定階への自動帰還はしない）
      dungeon.leaveDungeon()
      setScreen('lobby')
    }
  }

  // リザルトから次の階へ
  const nextFloor = () => {
    dungeon.advanceFloor()
    setScreen('dungeon')
  }

  // ロビーへ帰還
  const toLobby = () => {
    dungeon.leaveDungeon()
    setScreen('lobby')
  }

  return (
    <>
      {screen === 'lobby' && (
        <SetupScreen
          onDepart={depart}
          checkpoints={dungeon.checkpoints}
          inventory={inventory.items}
          jobId={jobId}
          onSelectJob={setJobId}
          initialWeaponId={loadout?.weapon?.id}
          onOpenEquipment={() => setScreen('equipment')}
          onOpenDictionary={() => setShowDictionary(true)}
        />
      )}
      {screen === 'equipment' && (
        <EquipmentScreen
          jobId={jobId}
          items={inventory.items}
          equipment={equipment}
          extractInv={extractInv}
          onRemoveItem={inventory.removeItem}
          onUpdateItem={inventory.updateItem}
          onBack={() => setScreen('lobby')}
          onOpenDictionary={() => setShowDictionary(true)}
        />
      )}
      {screen === 'dungeon' && (
        <DungeonScreen floor={dungeon.currentFloor} onAdvance={advance} onReturnLobby={toLobby} />
      )}
      {screen === 'battle' && battle && (
        <BattleScreen
          battle={battle}
          setBattle={setBattle}
          onExit={exitBattle}
          onOpenDictionary={() => setShowDictionary(true)}
        />
      )}
      {screen === 'loot' && lastLoot && (
        <LootResultScreen
          item={lastLoot}
          floor={lootFloor}
          onNext={nextFloor}
          onLobby={toLobby}
          onOpenDictionary={() => setShowDictionary(true)}
        />
      )}
      {/* 用語辞典（最前面のオーバーレイ。閉じれば元の画面にそのまま復帰） */}
      {showDictionary && <GlossaryDictionary onBack={() => setShowDictionary(false)} />}
    </>
  )
}
