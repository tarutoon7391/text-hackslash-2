// 敵データ生成システム
// 階層とゾーン属性から、その階の敵（雑魚 or ボス）を生成する
// 生成する敵定義は enemies.js のENEMIES と同じ形（battleEngineのcreateBattleにそのまま渡せる）
import { DUNGEON_CONFIG } from '../data/dungeonConfig.js'
import { ELEMENTS } from '../data/elements.js'
import { floorToZoneElement, isBossFloor } from './dungeonState.js'

let enemySeq = 1

export function generateEnemy({ floor, rng = Math.random }) {
  const zone = floorToZoneElement(floor)
  const boss = isBossFloor(floor)
  const cfg = boss ? DUNGEON_CONFIG.enemy.boss : DUNGEON_CONFIG.enemy.grunt
  const elemDef = ELEMENTS[zone]

  // TODO: 階層倍率は仮式「ベース×(1 + 階層×0.05)」。正確な対応表は実装後調整
  const mult = 1 + floor * cfg.growthPerFloor
  const stats = {}
  for (const [key, base] of Object.entries(cfg.base)) {
    stats[key] = Math.round(base * mult)
  }

  // 敵の属性はゾーンのテーマ属性に合わせる（弱点属性が分かりやすいように）
  return {
    id: `dungeon_enemy_${enemySeq++}`,
    name: boss ? `${elemDef.name}の守護者` : `${elemDef.name}の魔獣`,
    icon: DUNGEON_CONFIG.enemyIcons[boss ? 'boss' : 'grunt'][zone],
    element: zone,
    stats,
    ailmentResists: {},
    // TODO: 今後の拡張ポイント。現状ダンジョンの敵はスキルを持たず通常攻撃のみ
    // （skillsを空にするとbattleEngineの敵AIが常に通常攻撃を選ぶ）。
    // 将来はゾーン属性の属性スキルや弱体効果スキルを持たせてGDDのシナジーを出す
    skills: [],
    description: `${floor}階の${boss ? 'ボス' : '雑魚'}`,
    isBoss: boss,
    floor,
  }
}
