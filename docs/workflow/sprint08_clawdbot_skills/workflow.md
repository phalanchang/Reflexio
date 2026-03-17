# Sprint 8: Clawdbot Skills Display

## 概要

Clawdbot のスキルバッジをメイン画面ページ（/clawdbot）で表示。六角形/八角形の CSS clip-path バッジ、PNG 画像表示、ドラッグ&ドロップ並び替え、詳細モーダルを実装。フロントエンドのみの機能（バックエンド/DB不使用）。

## ワークフロー図

![swimlane](./swimlane.svg)

## 処理フロー解説

### バッジ表示フロー

1. **ブラウザ**: ユーザーがサイドバーから「Clawdbot Badge」ページに遷移（/clawdbot）
2. **React（ClawdbotSkills.js）**: clawdbotSkillsData.js からスキルデータを読み込み。3カテゴリに分けて表示: Skills(7件・青), MCP(1件・紫), Integrations(3件・緑)
3. **React（SkillBadge.js）**: 各スキルをバッジとして描画。CSS clip-path（hexagon/octagon）でメダル形状。badges配列からランダムに1枚PNG画像を選択表示（96px）。バッジラベル（スキル名テキスト 13px）

### ドラッグ&ドロップフロー

4. **ブラウザ**: ユーザーがバッジをドラッグ開始
5. **React（ClawdbotSkills.js）**: HTML5 Drag and Drop API。onDragStart/onDragOver/onDrop ハンドラ。同カテゴリ内での並び替えのみ許可
6. **React**: useState で並び順を管理（永続化なし、セッション内のみ）

### 詳細モーダルフロー

7. **ブラウザ**: ユーザーがバッジをクリック（またはEnterキー）
8. **React（SkillModal.js）**: 詳細モーダルを表示（z-index: 1500）。スキル名、説明、バッジ画像（120x120px）。ESCキー/オーバーレイクリックで閉じる
9. **React**: キーボードアクセシビリティ（tabIndex, role="button", onKeyDown）

## 関連ソースファイル

| ファイルパス | 役割 |
|---|---|
| frontend/src/components/ClawdbotSkills.js | メインコンテナ、カテゴリ分け表示、D&Dロジック |
| frontend/src/components/SkillBadge.js | バッジ描画（hexagon/octagon clip-path、PNG/emoji切替） |
| frontend/src/components/SkillModal.js | 詳細モーダル（ESC + オーバーレイ閉じ） |
| frontend/src/data/clawdbotSkillsData.js | スキルデータ定義（badges配列 + tier） |
| frontend/public/images/badges/*.png | バッジPNG画像（14ファイル） |
| frontend/src/components/ClawdbotSkills.css | スキルページスタイル |
| frontend/src/components/SkillBadge.css | バッジスタイル（clip-path、サイズ） |
| frontend/src/components/SkillModal.css | モーダルスタイル |

## DBテーブル

なし（フロントエンドのみ）

## APIエンドポイント

なし（フロントエンドのみ）

## 技術詳細

### バッジ形状
- hexagon: `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)`
- octagon: `clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)`

### z-index 階層
- ImageModal: 1000
- SkillModal: 1500
- Toast: 2000

### ティア定義
bronz, sliver, gold, platinum, diamond, hihiirokane
