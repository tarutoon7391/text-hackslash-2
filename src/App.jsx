// アプリ全体の画面フロー管理
// ロビー → ダンジョン → 戦闘 → 勝利ならドロップ結果 →（次の階 or ロビー）
// 敗北・逃走は常にロビーへ戻る（GDD 14番）
// 画面全体は「メイン領域＋フッターナビ」の縦シェル構造。フッターは拠点（ロビー・装備）のみ表示
// 出発武器は装備スロット（EquipmentScreenで付け替え）から取る。武器入手はインベントリ経由のみ
// 用語辞典はオーバーレイとして重ねるので、どの画面の状態も失われない
// 成長：敵を倒すと職業に経験値／ドロップは素材（欠片）メイン／装備は合成で+値を上げる
// 所持品・装備・素材・職業レベル・チェックポイントは端末内に自動保存される（saveStorage）
import { useEffect, useMemo, useState } from 'react'
import SetupScreen from './components/SetupScreen.jsx'
import BattleScreen from './components/BattleScreen.jsx'
import DungeonScreen from './components/dungeon/DungeonScreen.jsx'
import LootResultScreen from './components/dungeon/LootResultScreen.jsx'
import GlossaryDictionary from './pages/GlossaryDictionary.jsx'
import EquipmentScreen from './pages/EquipmentScreen.jsx'
import MonsterScreen from './pages/MonsterScreen.jsx'
import FooterNav from './components/common/FooterNav.jsx'
import { createBattle } from './systems/battleEngine.js'
import { useDungeonState, isBossFloor } from './systems/dungeonState.js'
import { useInventoryState } from './systems/inventoryState.js'
import { useEquipmentState } from './systems/equipmentState.js'
import { useProgressState, enemyExpFor } from './systems/progressState.js'
import { useMonsterState, createMonsterFromEnemy, buildAllyForBattle, calcMonsterStats } from './systems/monsterState.js'
import { usePersistentState } from './systems/saveStorage.js'
import { buildPlayerStats } from './systems/playerStats.js'
import { generateEnemy } from './systems/enemyGenerator.js'
import { generateDrops } from './systems/lootSystem.js'
import { createStarterEquipment } from './data/starterEquipment.js'
import { JOBS } from './data/jobs.js'

export default function App() {
  const [screen, setScreen] = useState('lobby') // lobby | equipment | monsters | dungeon | battle | loot
  const [battle, setBattle] = useState(null)
  // 職業はロビーと装備管理画面で共有する（武器スロットの装備可否チェックに使う）
  const [jobId, setJobId] = usePersistentState('jobId', 'swordsman', (saved) => (JOBS[saved] ? saved : 'swordsman'))
  // 直近の勝利リザルト（表示用）：{floor, item, shards, exp, levelBefore, levelAfter}
  const [lastResult, setLastResult] = useState(null)
  // 探索中の残りHP（階をまたいで持ち越す）。null＝満タン（ロビーから出発した直後）
  // ロビーに戻ると全回復する。MPは今まで通り戦闘ごとに全回復
  const [runHp, setRunHp] = useState(null)
  // 探索中の仲間の残りHP（持ち越し）。null＝満タン、0＝倒れている（ロビーに戻るまで戦闘に出ない）
  const [runAllyHp, setRunAllyHp] = useState(null)
  const [showDictionary, setShowDictionary] = useState(false)
  const dungeon = useDungeonState()
  const inventory = useInventoryState()
  const equipment = useEquipmentState()
  const progress = useProgressState()
  const monsterBox = useMonsterState()
  const itemsById = useMemo(() => Object.fromEntries(inventory.items.map((it) => [it.id, it])), [inventory.items])
  const jobLevel = progress.jobLevels[jobId]?.level || 1
  // 今の最大HP（職業レベル・装備込み）。探索中の残りHP表示に使う
  const currentMaxHp = buildPlayerStats({ jobId, level: jobLevel, slots: equipment.slots, itemsById }).hp

  // 新規プレイ（インベントリが空の状態でアプリを開いた）なら初期装備一式を配る
  // セーブがあればインベントリは空ではないので、ここは本当の初回だけ通る
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
  const depart = ({ startFloor }) => {
    setRunHp(null) // ロビーから出発する時は満タン
    setRunAllyHp(null)
    dungeon.enterDungeon(startFloor)
    setScreen('dungeon')
  }

  // ダンジョンで「進む」→ その階の敵を生成して戦闘開始
  const advance = () => {
    const enemyDef = generateEnemy({ floor: dungeon.currentFloor })
    // 戦闘のたびに「今の職業レベル＋今の装備」から実ステータスを作る
    // （探索中にレベルが上がれば、次の戦闘からすぐ反映される）
    const weapon = itemsById[equipment.slots.weapon]
    const playerStats = buildPlayerStats({ jobId, level: jobLevel, slots: equipment.slots, itemsById })
    // 連れていく仲間がいて、倒れていなければ一緒に戦う
    const partner = monsterBox.partyMonster
    const ally = partner && runAllyHp !== 0 ? buildAllyForBattle(partner, runAllyHp) : null
    setBattle(createBattle({ jobId, weapon, enemyDef, playerStats, startHp: runHp, ally }))
    setScreen('battle')
  }

  // 戦闘終了（勝利→ドロップ生成してリザルトへ／敗北・逃走→ロビーへ）
  const exitBattle = () => {
    const result = battle?.result
    const floor = dungeon.currentFloor
    const hpLeft = battle?.player.stats.hp ?? null
    const recruitedEnemy = result === 'recruit' ? battle.enemy : null
    // 仲間が戦闘に出ていたら残りHPを持ち越す（倒れていたら0）
    const allyHpLeft = battle?.ally ? battle.ally.stats.hp : runAllyHp
    const partner = monsterBox.partyMonster
    setBattle(null)
    if (result === 'recruit' && floor != null) {
      // 勧誘成功：敵は倒していないのでドロップは無し。仲間に加わり、経験値は入る。階は突破扱いで先へ進める
      const monster = createMonsterFromEnemy(recruitedEnemy)
      monsterBox.addMonster(monster)
      const exp = enemyExpFor({ floor, boss: false })
      const { before, after } = progress.gainExp(jobId, exp)
      const allyGain = partner ? monsterBox.gainExp(partner.id, exp) : null
      setRunHp(hpLeft)
      setRunAllyHp(allyHpLeft)
      setLastResult({
        floor, item: null, shards: null, recruited: monster, exp, levelBefore: before.level, levelAfter: after.level,
        ally: allyGain && { name: partner.name, levelBefore: allyGain.before.level, levelAfter: allyGain.after.level },
      })
      setScreen('loot')
    } else if (result === 'win' && floor != null) {
      const boss = isBossFloor(floor)
      // ドロップ：欠片は必ず、装備は雑魚だとたまに・ボスは確定
      // スキルの書は、装備より低い確率でたまに落ちる（その階の敵の属性のスキル）
      const { item, shards, book } = generateDrops({ floor, grade: boss ? 'boss' : 'grunt' })
      if (item) inventory.addItem(item)
      if (book) progress.addBook(book)
      progress.addShards(shards.tier, shards.count)
      // 経験値：今の職業に入る
      const exp = enemyExpFor({ floor, boss })
      const { before, after } = progress.gainExp(jobId, exp)
      // ボス撃破で次ブロックの先頭階（次のチェックポイント）を解放
      if (boss) dungeon.unlockCheckpoint(floor + 1)
      // 残りHPを次の階へ持ち越す（レベルアップしても回復はしない。最大HPが増えた分だけ余裕ができる）
      // 連れている仲間にも同じだけ経験値が入る（その戦闘で倒れていても入る）
      const allyGain = partner ? monsterBox.gainExp(partner.id, exp) : null
      setRunHp(hpLeft)
      setRunAllyHp(allyHpLeft)
      setLastResult({
        floor, item, shards, book, exp, levelBefore: before.level, levelAfter: after.level,
        ally: allyGain && { name: partner.name, levelBefore: allyGain.before.level, levelAfter: allyGain.after.level },
      })
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

  // 連れている仲間の探索中の状態（ダンジョン画面・リザルトのHP表示用）。連れていなければnull
  const allyStatus = monsterBox.partyMonster
    ? (() => {
        const maxHp = calcMonsterStats(monsterBox.partyMonster).hp
        return { name: monsterBox.partyMonster.name, hp: runAllyHp == null ? maxHp : Math.min(runAllyHp, maxHp), maxHp }
      })()
    : null

  // フッターナビからの画面切り替え（フッターは拠点でしか出ないが、念のため探索中なら探索終了扱いにする）
  const navigate = (tab) => {
    if (tab === 'dictionary') {
      setShowDictionary(true)
      return
    }
    setShowDictionary(false)
    if (screen === 'dungeon' || screen === 'loot') dungeon.leaveDungeon()
    setScreen(tab === 'home' ? 'lobby' : tab === 'monsters' ? 'monsters' : 'equipment')
  }

  // フッターは拠点（ロビー・装備・仲間）にいる時だけ表示する
  // ダンジョンに潜っている間（ダンジョン・戦闘・リザルト）は出さない：
  // 戦闘が終わっても下部が切り替わらず、探索中に装備タブへ飛んで探索が終わってしまう事故も防ぐ
  const showFooter = screen === 'lobby' || screen === 'equipment' || screen === 'monsters'
  const activeTab = showDictionary ? 'dictionary' : screen === 'equipment' ? 'equipment' : screen === 'monsters' ? 'monsters' : 'home'

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
            jobLevels={progress.jobLevels}
            partyMonster={monsterBox.partyMonster}
            onOpenMonsters={() => setScreen('monsters')}
            onSelectJob={selectJob}
            onOpenEquipment={() => setScreen('equipment')}
          />
        )}
        {screen === 'equipment' && (
          <EquipmentScreen
            jobId={jobId}
            jobLevel={jobLevel}
            items={inventory.items}
            equipment={equipment}
            shards={progress.shards}
            onSpendShards={progress.spendShards}
            books={progress.books}
            onSpendBook={progress.spendBook}
            onRemoveItems={inventory.removeItems}
            onUpdateItem={inventory.updateItem}
            onBack={() => setScreen('lobby')}
            onOpenDictionary={() => setShowDictionary(true)}
          />
        )}
        {screen === 'monsters' && (
          <MonsterScreen
            monsters={monsterBox.monsters}
            partyId={monsterBox.partyId}
            onToggleParty={monsterBox.toggleParty}
            onRelease={monsterBox.releaseMonster}
            onBack={() => setScreen('lobby')}
          />
        )}
        {screen === 'dungeon' && (
          <DungeonScreen
            floor={dungeon.currentFloor}
            hp={runHp ?? currentMaxHp}
            maxHp={currentMaxHp}
            ally={allyStatus}
            onAdvance={advance}
            onReturnLobby={toLobby}
          />
        )}
        {screen === 'battle' && battle && (
          <BattleScreen
            battle={battle}
            setBattle={setBattle}
            monsterBoxFull={monsterBox.isFull}
            onExit={exitBattle}
            onOpenDictionary={() => setShowDictionary(true)}
          />
        )}
        {screen === 'loot' && lastResult && (
          <LootResultScreen
            result={lastResult}
            hp={runHp ?? currentMaxHp}
            maxHp={currentMaxHp}
            allyStatus={allyStatus}
            jobName={JOBS[jobId].name}
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
