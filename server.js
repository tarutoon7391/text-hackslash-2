// Railway用の簡易静的配信サーバー
// フェーズ1はフロントのみで完結するため、distを配るだけ（DB・環境変数不要）
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.static(path.join(__dirname, 'dist')))

// SPAフォールバック（将来ルーティングを足しても動くように）
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`text-hackslash-2 起動: http://localhost:${PORT}`)
})
