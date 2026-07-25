// アプリ全体の画面フロー管理
// ロビー → ダンジョン → 戦闘 → 勝利ならドロップ結果 →（次の階 or ロビー）
// 敗北・逃走は常にロビーへ戻る（GDD 14番）
// 画面全体は「メイン領域＋フッターナビ」の縦シェル構造。フッターは戦闘画面のみ非表示
// 出発武器は装備スロット（EquipmentScreenで付け替え）から取る。武器入手はインベントリ経由のみ
// 用語辞典はオーバーレイとして重ねるので、どの画面の状態も失われない
import { useEffect, useState } from 'react'
import SetupScreen from './components/SetupScreen.jsx'
import BattleScreen from './components/BattleScreen.jsx'
import DungeonScreen from './components/dungeon/DungeonScreen.jsx'
import LootResultScreen from './components/dungeon/LootResultScreen.jsx'
import GlossaryDictionary from './pages/GlossaryDictionary.jsx'
import EquipmentScreen from './pages/EquipmentScreen.jsx'
import FooterNav from './components/common/FooterNav.jsx'
import { createBattle } from './systems/battleEngine.js'
import { useDungeonState, isBossFloor } from './systems/dungeonState.js'
import { useInventoryState } from './systems/inventoryState.js'
import { useEquipmentState } from './systems/equipmentState.js'
import { useExtractInventoryState } from './systems/extractInventoryState.js'
import { generateEnemy } from './systems/enemyGenerator.js'
import { generateLoot } from './systems/lootSystem.js'
import { createStarterEquipment } from './data/starterEquipment.js'

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

  // 新規プレイ（インベントリが空の状態でアプリを開いた）なら初期装備一式を配る
  // DB保存はまだ無いため、リロード後の初回マウントは毎回ここを通る
  useEffect(() => {
    if (inventory.items.length === 0) inventory.addItems(createStarterEquipment())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 職業選択（フェーズ3パート3）
  // 初回（まだ何も装備したことがない）：その職業の初期武器＋初期防具を自動装備
  // 転職：防具・アクセはそのまま。武器のみ互換性チェック（装備不可なら空にする）
  const selectJob = (id) => {
    setJobId(id)
    equipment.applyJobChange({ jobId: id, items: inventory.items })
  }

  // ロビーから出発（武器は装備スロットのものをSetupScreen経由で受け取る）
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

  // フッターナビからの画面切り替え
  // ダンジョン探索中（ダンジョン/リザルト画面）に拠点系へ移動した場合は探索終了扱い
  const navigate = (tab) => {
    if (tab === 'dictionary') {
      setShowDictionary(true)
      return
    }
    setShowDictionary(false)
    if (screen === 'dungeon' || screen === 'loot') dungeon.leaveDungeon()
    setScreen(tab === 'home' ? 'lobby' : 'equipment')
  }

  // フッターは戦闘画面のみ非表示（戦闘に集中させるため）
  const showFooter = screen !== 'battle'
  const activeTab = showDictionary ? 'dictionary' : screen === 'equipment' ? 'equipment' : 'home'

  return (
    <div className="app-shell">
      <div className="app-main">
        {screen === 'lobby' && (
          <SetupScreen
            onDepart={depart}
            checkpoints={dungeon.checkpoints}
            items={inventory.items}
            equipment={equipment}
            jobId={jobId}
            onSelectJob={selectJob}
            onOpenEquipment={() => setScreen('equipment')}
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
        {/* 用語辞典（メイン領域内の最前面オーバーレイ。閉じれば元の画面にそのまま復帰） */}
        {showDictionary && <GlossaryDictionary onBack={() => setShowDictionary(false)} />}
      </div>
      {showFooter && <FooterNav current={activeTab} onNavigate={navigate} />}
    </div>
  )
}
