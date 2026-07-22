// アプリ全体：セットアップ画面⇔戦闘画面の切り替え＋用語辞典オーバーレイ
// 用語辞典は「画面切り替え」ではなくオーバーレイとして重ねるので、
// 戦闘中に開いても戦闘の状態（HP/MP・ターン進行等）は失われない
import { useState } from 'react'
import SetupScreen from './components/SetupScreen.jsx'
import BattleScreen from './components/BattleScreen.jsx'
import GlossaryDictionary from './pages/GlossaryDictionary.jsx'
import { createBattle } from './systems/battleEngine.js'

export default function App() {
  const [battle, setBattle] = useState(null)
  const [showDictionary, setShowDictionary] = useState(false)

  const startBattle = ({ jobId, weapon, enemyId }) => {
    setBattle(createBattle({ jobId, weapon, enemyId }))
  }

  const backToSetup = () => setBattle(null)
  const openDictionary = () => setShowDictionary(true)

  return (
    <>
      {battle ? (
        <BattleScreen battle={battle} setBattle={setBattle} onExit={backToSetup} onOpenDictionary={openDictionary} />
      ) : (
        <SetupScreen onStart={startBattle} onOpenDictionary={openDictionary} />
      )}
      {/* 用語辞典（最前面のオーバーレイ。閉じれば元の画面にそのまま復帰） */}
      {showDictionary && <GlossaryDictionary onBack={() => setShowDictionary(false)} />}
    </>
  )
}
