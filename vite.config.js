import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))

// Vite設定（React + モバイル向けビルド）
// jsxImportSource：JSXの変換先を src/pixel-jsx に向ける。
//   文字列の中の絵文字を自作ドット絵アイコンへ自動で差し替えるための仕組み（src/pixel-jsx/iconize.js）
export default defineConfig({
  plugins: [react({ jsxImportSource: 'pixel-jsx' })],
  resolve: {
    alias: {
      'pixel-jsx/jsx-runtime': path.join(root, 'src/pixel-jsx/jsx-runtime.js'),
      'pixel-jsx/jsx-dev-runtime': path.join(root, 'src/pixel-jsx/jsx-dev-runtime.js'),
    },
  },
  server: {
    host: true, // スマホ実機からLAN経由で確認できるように
  },
})
