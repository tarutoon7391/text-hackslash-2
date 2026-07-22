import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite設定（React + モバイル向けビルド）
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // スマホ実機からLAN経由で確認できるように
  },
})
