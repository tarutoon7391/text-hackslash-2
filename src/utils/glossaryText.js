// スキルテキスト内の用語検出・色付けユーティリティ
// 渡された文字列からglossary.jsの用語を検出し、該当部分を色付きテキスト（React要素）に変換する
// - 最長一致優先（「火傷」が「火」より先にマッチする）で誤検出を防ぐ
// - 戻り値：{ nodes: 色付け済みReact要素の配列, terms: 含まれていた用語エントリの配列（重複除去済み） }
// - 色付き用語をタップすると onTermsTap(そのテキストに含まれる全用語) が呼ばれる
//   （シャドウバースの能力詳細方式：どの用語をタップしても、テキスト内の全用語をまとめて開く）
// ※JSX構文を使わない（.jsファイルのまま使えるようcreateElementで組む）
import { createElement } from 'react'
import { GLOSSARY } from '../data/glossary.js'

// 最長一致優先のためターム長の降順で並べておく
const SORTED_GLOSSARY = [...GLOSSARY].sort((a, b) => b.term.length - a.term.length)

// options.plainCategories：色付けをスキップしつつタップは可能にするカテゴリのリスト
// （既定で「属性」。属性名は既存の属性UI表現（バッジ・ボーダー色等）と競合するため
//  テキスト内では強調色を付けず、タップだけできるようにする）
export function renderGlossaryText(text, onTermsTap, options = {}) {
  if (!text) return { nodes: [], terms: [] }
  const plainCategories = options.plainCategories ?? ['属性']

  const nodes = []
  const terms = [] // このテキストに含まれる用語（出現順・重複除去）
  let buffer = ''
  let i = 0
  let keySeq = 0

  const flushBuffer = () => {
    if (buffer) {
      nodes.push(buffer)
      buffer = ''
    }
  }

  // タップハンドラ：テキスト内の全用語をまとめて渡す
  // （termsはスキャン完了後に埋まるが、クリック発生時には確定済みなのでクロージャ参照でOK）
  const handleTap = (ev) => {
    ev.stopPropagation() // 親（スキルボタン等）のタップ処理を発火させない
    if (onTermsTap && terms.length > 0) onTermsTap(terms)
  }

  while (i < text.length) {
    let matched = null
    for (const entry of SORTED_GLOSSARY) {
      if (text.startsWith(entry.term, i)) {
        matched = entry
        break
      }
    }
    if (matched) {
      flushBuffer()
      if (!terms.includes(matched)) terms.push(matched)
      // plainCategories対象（属性名など）は強調色を付けずタップだけ可能にする
      const isPlain = plainCategories.includes(matched.category)
      nodes.push(
        createElement(
          'span',
          {
            key: `gt-${keySeq++}`,
            className: isPlain ? 'gloss-term gloss-plain' : 'gloss-term',
            style: isPlain ? undefined : { color: matched.color },
            onClick: handleTap,
          },
          matched.term
        )
      )
      i += matched.term.length
    } else {
      buffer += text[i]
      i++
    }
  }
  flushBuffer()

  return { nodes, terms }
}
