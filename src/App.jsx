// アプリ全体：セットアップ画面⇔戦闘画面の切り替え
import { useState } from 'react'
import SetupScreen from './components/SetupScreen.jsx'
import BattleScreen from './components/BattleScreen.jsx'
import { createBattle } from './systems/battleEngine.js'

export default function App() {
  const [battle, setBattle] = useState(null)

  const startBattle = ({ jobId, weapon, enemyId }) => {
    setBattle(createBattle({ jobId, weapon, enemyId }))
  }

  const backToSetup = () => setBattle(null)

  return battle ? (
    <BattleScreen battle={battle} setBattle={setBattle} onExit={backToSetup} />
  ) : (
    <SetupScreen onStart={startBattle} />
  )
}
