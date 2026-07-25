// 初期装備テンプレート（フェーズ3パート2）
// 新規プレイ開始時（インベントリが空の状態でアプリを開いたとき）に自動で配られる一式
// - 武器6種×1本（コモン相当・無属性・スキル枠1個・エンチャントなし）
// - 防具1個（コモン相当）
// - 性能はコモンドロップ（武器ATK8〜12等）より明確に低く固定し、
//   周回で拾うドロップ装備が必ず上位互換になるようにする
// - データ構造はドロップ装備と同一（EquipmentScreenで表示・装備・抽出・移植が可能）
import { SKILLS_NORMAL } from './skills_normal.js'
import { WEAPON_TYPE_IDS } from './weaponTypes.js'

// 初期装備の固定性能（コモンのレンジ下限より低い値）
export const STARTER_RULES = {
  rarity: 'common',
  element: null, // 無属性（battleEngineは無属性=nullで相性計算なし扱い）
  weaponAtk: 6,  // コモンのbaseAtkRange[8,12]より低い
  armorDef: 2,
  armorHp: 4,    // コモンのhpRange[5,10]より低い
}

// 武器6種の名前（初期装備らしい素朴なもの）
const STARTER_WEAPON_NAMES = {
  sword: 'なめし革の剣',
  greatsword: '木の大剣',
  staff: '木の杖',
  tome: '古びた魔導書',
  bow: '木の弓',
  dualblades: 'なめし革の双剣',
}

// 各武器種の★1スキルの先頭を初期スキルとする（IDを直書きせずデータ駆動で選ぶ）
function starterSkillIdFor(weaponType) {
  const skill = SKILLS_NORMAL.find((s) => s.weaponType === weaponType && s.star === 1)
  return skill ? skill.id : null
}

// 初期装備一式（武器6＋防具1）を生成して返す
// 移植等でアイテムが書き換わっても定義側が汚れないよう、毎回新しいオブジェクトを作る
export function createStarterEquipment() {
  const weapons = WEAPON_TYPE_IDS.map((weaponType) => {
    const skillId = starterSkillIdFor(weaponType)
    return {
      id: `starter_${weaponType}`,
      slot: 'weapon',
      name: STARTER_WEAPON_NAMES[weaponType],
      weaponType,
      element: STARTER_RULES.element,
      rarity: STARTER_RULES.rarity,
      atk: STARTER_RULES.weaponAtk,
      skills: skillId ? [{ skillId, plus: 0 }] : [],
      enchants: [],
      floor: null, // ドロップ産ではないので「〇階産」表示なし
    }
  })

  const armor = {
    id: 'starter_armor',
    slot: 'armor',
    name: 'なめし革の胴着',
    icon: '🥋',
    weaponType: null,
    element: STARTER_RULES.element,
    rarity: STARTER_RULES.rarity,
    def: STARTER_RULES.armorDef,
    hp: STARTER_RULES.armorHp,
    skills: [],
    enchants: [],
    floor: null,
  }

  return [...weapons, armor]
}
