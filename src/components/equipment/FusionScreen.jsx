// 合成画面（装備管理画面の上に重ねる全画面オーバーレイ）
// ベース装備に素材を合成して+値を上げる。素材は2種類：
//   - 強化の欠片（敵が落とす。深い階のものほど経験値が多い）
//   - 他の装備（＝親。同じ部位のみ）。親が持つスキル／エンチャントはベースの枠に入る範囲で
//     好きなだけ選んで引き継げる
// 合成すると、使った欠片と親にした装備は消える。
// 実際の計算は純関数（fusionSystem.js）に任せ、ここは選択UIとプレビューだけを持つ
import { useMemo, useState } from 'react'
import { RARITIES } from '../../data/rarities.js'
import { WEAPON_TYPES } from '../../data/weaponTypes.js'
import { ALL_SKILLS_BY_ID } from '../../data/skills_elemental.js'
import { PROGRESSION_CONFIG } from '../../data/progressionConfig.js'
import {
  addPlusExp, expToNextPlus, shardExp, equipMaterialExp,
  skillSlotCount, enchantSlotCount, buildSkillPool, buildEnchantPool,
  validateSkillSelection, validateEnchantSelection, skillInheritBlockReason,
  skillPlusChance, countSkillDuplicates,
} from '../../systems/fusionSystem.js'
import { getItemStats } from '../../systems/playerStats.js'

const itemIcon = (item) => (item.slot === 'weapon' ? WEAPON_TYPES[item.weaponType].icon : item.icon)
const plusLabel = (item) => (item.plus > 0 ? ` +${item.plus}` : '')

// 装備の基礎ステータスを「ATK+12」のような短い文字列にする（+値の効果込み）
function statText(item, jobLevel) {
  const st = getItemStats(item, jobLevel)
  return [['atk', 'ATK'], ['def', 'DEF'], ['hp', 'HP'], ['mp', 'MP']]
    .filter(([key]) => (item[key] || 0) > 0)
    .map(([key, label]) => `${label}+${st[key]}`)
    .join('・')
}

export default function FusionScreen({ base, candidates, shards, jobLevel, onConfirm, onCancel }) {
  const [parentIds, setParentIds] = useState([])
  const [shardUse, setShardUse] = useState({})            // {ランク: 使う個数}
  const [keepSkills, setKeepSkills] = useState(() => buildSkillPool(base, []).map((e) => e.key))
  const [keepEnchants, setKeepEnchants] = useState(() => buildEnchantPool(base, []).map((e) => e.key))
  const [confirming, setConfirming] = useState(false)
  const [notice, setNotice] = useState(null)

  const parents = useMemo(() => candidates.filter((c) => parentIds.includes(c.id)), [candidates, parentIds])
  const skillPool = useMemo(() => buildSkillPool(base, parents), [base, parents])
  const enchantPool = useMemo(() => buildEnchantPool(base, parents), [base, parents])
  const skillSlots = skillSlotCount(base)
  const enchantSlots = enchantSlotCount(base)

  const selectedSkills = keepSkills.map((k) => skillPool.find((e) => e.key === k)).filter(Boolean)
  const selectedEnchants = keepEnchants.map((k) => enchantPool.find((e) => e.key === k)).filter(Boolean)

  // ===== スキルの+値のチャンス（おまけ）：残すスキルと同じスキルが素材側に何個あるか =====
  const skillDupCounts = countSkillDuplicates(skillPool, selectedSkills)

  // ===== 経験値のプレビュー =====
  const usedShardCount = Object.values(shardUse).reduce((sum, n) => sum + n, 0)
  const gainedExp =
    Object.entries(shardUse).reduce((sum, [tier, n]) => sum + shardExp(tier) * n, 0) +
    parents.reduce((sum, p) => sum + equipMaterialExp(p), 0)
  const after = addPlusExp(base, gainedExp)
  const overCap = after.plus > jobLevel
  const hasMaterial = gainedExp > 0 || parents.length > 0

  // ===== 親装備の選択 =====
  const toggleParent = (item) => {
    setConfirming(false)
    setNotice(null)
    if (parentIds.includes(item.id)) {
      // 親から外したら、その装備由来の引き継ぎ選択も外す
      setParentIds(parentIds.filter((id) => id !== item.id))
      setKeepSkills(keepSkills.filter((k) => !k.startsWith(`${item.id}:`)))
      setKeepEnchants(keepEnchants.filter((k) => !k.startsWith(`${item.id}:`)))
      return
    }
    setParentIds([...parentIds, item.id])
    // 親に選んだ時点で、空いている枠に入る分は自動で引き継ぎ対象にする（あとで付け外しできる）
    let nextSkills = [...selectedSkills]
    for (const e of buildSkillPool(base, [item]).filter((x) => !x.fromBase)) {
      if (!validateSkillSelection(base, [...nextSkills, e])) nextSkills = [...nextSkills, e]
    }
    let nextEnchants = [...selectedEnchants]
    for (const e of buildEnchantPool(base, [item]).filter((x) => !x.fromBase)) {
      if (!validateEnchantSelection(base, [...nextEnchants, e])) nextEnchants = [...nextEnchants, e]
    }
    setKeepSkills(nextSkills.map((e) => e.key))
    setKeepEnchants(nextEnchants.map((e) => e.key))
  }

  // ===== 引き継ぎの付け外し =====
  const toggleKeep = (kind, entry) => {
    setConfirming(false)
    setNotice(null)
    const keys = kind === 'skill' ? keepSkills : keepEnchants
    const setKeys = kind === 'skill' ? setKeepSkills : setKeepEnchants
    if (keys.includes(entry.key)) {
      setKeys(keys.filter((k) => k !== entry.key))
      return
    }
    const current = kind === 'skill' ? selectedSkills : selectedEnchants
    const validate = kind === 'skill' ? validateSkillSelection : validateEnchantSelection
    const error = validate(base, [...current, entry])
    if (error) {
      setNotice(`${error}（先にどれかのチェックを外す）`)
      return
    }
    setKeys([...keys, entry.key])
  }

  const setShard = (tier, n) => {
    setConfirming(false)
    const clamped = Math.max(0, Math.min(shards[tier] || 0, n))
    setShardUse((prev) => ({ ...prev, [tier]: clamped }))
  }

  const tiers = Object.keys(shards).map(Number).filter((t) => shards[t] > 0).sort((a, b) => a - b)
  const rarity = RARITIES[base.rarity]

  return (
    <div className="equip-detail fusion-screen">
      <div className="equip-header">
        <button className="dict-back" onClick={onCancel}>← もどる</button>
        <span className="dict-title">⚒ 合成</span>
      </div>
      <div className="equip-detail-body">
        {/* ベース装備と+値の見通し */}
        <div className="loot-card" style={{ borderColor: rarity.color }}>
          <div className="loot-head">
            <span className="loot-name">{itemIcon(base)} {base.name}{plusLabel(base)}</span>
            <span className="loot-rarity" style={{ color: rarity.color }}>{rarity.name}</span>
          </div>
          <div className="loot-meta">{statText(base, jobLevel)}</div>
          <div className="fusion-preview">
            <div className="fusion-plus">
              +{base.plus || 0}
              {after.plus !== (base.plus || 0) && <span className="fusion-plus-after"> → +{after.plus}</span>}
            </div>
            <div className="bar-bg">
              <div
                className="bar-fill fusion-bar"
                style={{ width: `${Math.min(100, (after.plusExp / expToNextPlus(after.plus)) * 100)}%` }}
              />
            </div>
            <div className="fusion-exp-line">
              <span>今回の合成経験値 +{gainedExp}</span>
              <span>次の+1まで {expToNextPlus(after.plus) - after.plusExp}</span>
            </div>
            {after.plus !== (base.plus || 0) && (
              <div className="fusion-exp-line">合成後：{statText({ ...base, ...after }, jobLevel)}</div>
            )}
            {overCap && (
              <div className="depart-note fusion-cap-note">
                ⚠️ 効果が出るのは今の職業レベル（Lv{jobLevel}）ぶんの +{jobLevel} まで。+値は残るので、レベルが上がれば効いてくる
              </div>
            )}
          </div>
        </div>

        {/* 素材1：欠片 */}
        <h2 className="section-label">{PROGRESSION_CONFIG.material.shardName}を使う</h2>
        {tiers.length === 0 ? (
          <div className="equip-hint">欠片を持っていない。敵を倒すと手に入る</div>
        ) : (
          tiers.map((tier) => {
            const use = shardUse[tier] || 0
            return (
              <div key={tier} className="shard-row">
                <span className="shard-name">🔷 ランク{tier}<small>（1個 +{shardExp(tier)}）</small></span>
                <button className="shard-btn" onClick={() => setShard(tier, use - 1)} disabled={use <= 0}>−</button>
                <span className="shard-count">{use}/{shards[tier]}</span>
                <button className="shard-btn" onClick={() => setShard(tier, use + 1)} disabled={use >= shards[tier]}>＋</button>
                <button
                  className="shard-btn shard-all"
                  onClick={() => setShard(tier, use >= shards[tier] ? 0 : shards[tier])}
                >
                  {use >= shards[tier] ? '0に戻す' : '全部'}
                </button>
              </div>
            )
          })
        )}

        {/* 素材2：親にする装備（消える） */}
        <h2 className="section-label">親にする装備（消える）</h2>
        {candidates.length === 0 ? (
          <div className="equip-hint">親にできる装備がない（同じ部位で、装備中でないもの）</div>
        ) : (
          <div className="equip-list">
            {candidates.map((c) => {
              const picked = parentIds.includes(c.id)
              const r = RARITIES[c.rarity]
              const skillNames = (c.skills || [])
                .map((ref) => ALL_SKILLS_BY_ID[ref.skillId])
                .filter(Boolean)
                .map((sk) => (skillInheritBlockReason(base, sk.id) ? `${sk.name}（引継不可）` : sk.name))
              const enchantNames = (c.enchants || []).map((en) => `${en.name.replace('%', '')}${en.value}%`)
              return (
                <button
                  key={c.id}
                  className={`parent-card ${picked ? 'selected' : ''}`}
                  onClick={() => toggleParent(c)}
                >
                  <span className="parent-head">
                    <span>{picked ? '☑' : '☐'} {itemIcon(c)} {c.name}{plusLabel(c)}</span>
                    <span style={{ color: r.color }}>{r.name}</span>
                  </span>
                  <span className="parent-meta">
                    {statText(c, Infinity)} ／ 合成経験値 +{equipMaterialExp(c)}
                  </span>
                  {(skillNames.length > 0 || enchantNames.length > 0) && (
                    <span className="parent-meta">{[...skillNames, ...enchantNames].join('、')}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 引き継ぎ：ベースと親が持っているものから、枠に入るだけ選ぶ */}
        {base.slot === 'weapon' && (
          <>
            <h2 className="section-label">残すスキル（{selectedSkills.length}/{skillSlots}枠）</h2>
            <div className="chip-list">
              {skillPool.length === 0 && <span className="skill-chip empty">スキルなし</span>}
              {skillPool.map((e) => {
                const skill = ALL_SKILLS_BY_ID[e.skillId]
                const on = keepSkills.includes(e.key)
                return (
                  <button
                    key={e.key}
                    className={`skill-chip keep-chip ${skill.element ? `elem-${skill.element}` : 'elem-none'} ${on ? 'selected' : 'off'} ${e.blocked ? 'blocked' : ''}`}
                    onClick={() => (e.blocked ? setNotice(e.blocked) : toggleKeep('skill', e))}
                  >
                    {e.blocked ? '🚫' : on ? '☑' : '☐'} {'★'.repeat(skill.star)} {skill.name}{e.plus > 0 ? `(+${e.plus})` : ''}
                    {!e.fromBase && <small> ←親{e.blocked ? `（${WEAPON_TYPES[skill.weaponType].name}用）` : ''}</small>}
                    {/* 同じスキルが素材側にあると、+値が上がるチャンス（1個につき1回抽選） */}
                    {on && skillDupCounts[e.key] > 0 && skillPlusChance(e.plus) > 0 && (
                      <small className="skill-plus-chance">
                        {' '}✨+1チャンス {Math.round(skillPlusChance(e.plus) * 100)}%{skillDupCounts[e.key] > 1 ? `×${skillDupCounts[e.key]}回` : ''}
                      </small>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
        <h2 className="section-label">残すエンチャント（{selectedEnchants.length}/{enchantSlots}枠）</h2>
        <div className="chip-list">
          {enchantSlots === 0 && enchantPool.length === 0 && (
            <span className="skill-chip empty">このレア度にはエンチャント枠がない</span>
          )}
          {enchantSlots > 0 && enchantPool.length === 0 && <span className="skill-chip empty">エンチャントなし</span>}
          {enchantPool.map((e) => {
            const on = keepEnchants.includes(e.key)
            return (
              <button
                key={e.key}
                className={`skill-chip enchant-chip keep-chip ${e.kind} ${on ? 'selected' : 'off'}`}
                onClick={() => toggleKeep('enchant', e)}
              >
                {on ? '☑' : '☐'} ✦ {e.name.replace('%', '')}{e.value}%
                {!e.fromBase && <small> ←親</small>}
              </button>
            )
          })}
        </div>
        {notice && <div className="depart-note">{notice}</div>}
        <div className="equip-hint">
          チェックを付けたものが合成後に残る。外したものは消える
          {base.slot === 'weapon' && `。スキルは同じ武器種（${WEAPON_TYPES[base.weaponType].name}）用と属性スキルだけ引き継げる。残すスキルと同じスキルを親も持っていると、たまにそのスキルに+値が付く（+値が高いほど付きにくい）`}
        </div>

        {/* 実行（押し間違い防止に2段階） */}
        {!confirming ? (
          <button className="start-btn" disabled={!hasMaterial} onClick={() => setConfirming(true)}>
            ⚒ 合成する
          </button>
        ) : (
          <div className="fusion-confirm">
            <div className="depart-note">
              {parents.length > 0 && `親にした装備${parents.length}個は消える。`}
              {usedShardCount > 0 && `欠片${usedShardCount}個も消える。`}
              チェックを外したスキル・エンチャントも消える。元に戻せない
            </div>
            <button
              className="use-btn danger"
              onClick={() => onConfirm({ parents, shardsUsed: shardUse, keepSkillKeys: keepSkills, keepEnchantKeys: keepEnchants })}
            >
              この内容で合成を実行
            </button>
            <button className="back-btn" onClick={() => setConfirming(false)}>やめる</button>
          </div>
        )}
      </div>
    </div>
  )
}
