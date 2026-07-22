# text-hackslash-2

ターン制テキストハックアンドスラッシュRPG（周回・収集・厳選型）。
初代 text-hackslash の後継作。**フェーズ1：プロジェクト基盤＋データ定義＋ソロ戦闘** まで実装済み。

## フェーズ1の内容

- 6属性の相性システム（火→土→雷→水→火サイクル、光⇔闇相互弱点、耐性0.5倍）
- 状態異常5種（火傷・凍結・感電・混乱・呪い）のスタック×残りターン2軸管理
- 無属性スキル168個＋属性スキル48個（全216個をデータ駆動で定義）
- 弱体効果の統一ルール（重ね掛け不可・上書き、参照系両カウント、解除系、操作系）
- 属性一致ボーナス（威力+20%・付与率+10%）
- GDD 9.2の抽選ルールを再現した武器生成関数（フェーズ2のドロップでそのまま使用）
- モバイルファーストの1画面完結戦闘UI
- 初級職5種＋テスト武器12本＋テスト敵5体

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（dist/）
npm start        # ビルド済みdistを配信（本番用）
npm run smoke    # 戦闘エンジンのスモークテスト
```

## Railwayデプロイ

1. Railwayで **New Project → Deploy from GitHub repo** を選ぶ
2. このリポジトリ（tarutoon7391/text-hackslash-2）を選択するだけでOK
   - ビルド：`npm install && npm run build`（自動検知）
   - 起動：`npm start`（express が dist/ を配信）
3. 環境変数・DBの設定は**一切不要**（フェーズ1はフロントのみで完結）

## 構成

```
src/
  data/            # 全ゲームデータ（ハードコーディング禁止、ここに集約）
    elements.js        # 6属性と相性表
    statusEffects.js   # 状態異常5種（dispellableフラグ付き）
    skills_normal.js   # 無属性スキル168個
    skills_elemental.js# 属性スキル48個
    weaponTypes.js     # 6武器種
    jobs.js            # 初級職5種
    rarities.js        # レア度とスキル抽選ルール（GDD 9.2）
    battleConfig.js    # 戦闘定数（会心・一致ボーナス・+値の仮式など）
    enemies.js         # テスト敵5体
    sampleWeapons.js   # テスト武器12本（生成関数で作成）
  systems/
    battleEngine.js    # 戦闘エンジン（UI非依存・Nodeでも動く）
    weaponGenerator.js # 武器生成（GDD 9.2抽選。フェーズ2ドロップで再利用）
  components/          # React UI（モバイルファースト）
test/
  battle-smoke.js  # スモークテスト（node test/battle-smoke.js）
server.js          # Railway用の静的配信サーバー
```

## 仕様書

- `text-hackslash-2_GDD_0722.md`（ゲームデザインドキュメント）
- `text-hackslash-2_skills.md`（スキル表：全216個のデータソース）

## 今後のフェーズ（予定）

- フェーズ2：ダンジョン（エンドレスタワー）・ドロップ・エンチャント
- フェーズ3：DB・セーブ・パーティ（モンスター仲間）
- フェーズ4以降：抽出・移植、昇格、マルチプレイ
