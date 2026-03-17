# Reflexio ワークフロー文書

各機能の実装ワークフロー（swimlane図 + 解説）です。

## ワークフロー一覧

| # | 機能 | ディレクトリ | 概要 |
|---|------|------------|------|
| 1 | Sprint 1: ログイン認証 | [sprint01_login](./sprint01_login/workflow.md) | セッションベース認証（Express + bcrypt + express-session） |
| 2 | Sprint 2: やりたいことCRUD | [sprint02_wishes_crud](./sprint02_wishes_crud/workflow.md) | wishes テーブル、REST API、一覧/追加/編集/削除UI |
| 3 | Sprint 3: タグ+フィルタ | [sprint03_tags_filter](./sprint03_tags_filter/workflow.md) | 多対多タグ機能、INSERT IGNORE自動作成、OR/AND複合フィルタ |
| 4 | Sprint 4: Googleカレンダー | [sprint04_google_calendar](./sprint04_google_calendar/workflow.md) | Google OAuth 2.0 + カレンダーAPI + Recharts積み上げ棒グラフ |
| 5 | Sprint 5: OAuth設定 | [sprint05_oauth_settings](./sprint05_oauth_settings/workflow.md) | ユーザーごとのGoogle OAuth Client ID/Secret設定 |
| 6 | Sprint 6: カテゴリ分類 | [sprint06_category](./sprint06_category/workflow.md) | Google Event Colors（colorId 1-11）ベースのカテゴリ分類 |
| 7 | Sprint 7: 画像貼り付け | [sprint07_images](./sprint07_images/workflow.md) | Ctrl+Vペースト、multerアップロード、サムネイル、全画面モーダル |
| 8 | Sprint 8: Clawdbot Skills | [sprint08_clawdbot_skills](./sprint08_clawdbot_skills/workflow.md) | スキルバッジ表示（PNG/emoji切替、D&D並び替え、3カテゴリ） |
| 9 | Sprint 9: UI改善 | [sprint09_ui_improvements](./sprint09_ui_improvements/workflow.md) | テーブルビュー、ダークモード、サマリーバー、コンテキストメニュー、キーボードショートカット |
| 10 | バグ修正+Toast通知 | [bugfix_toast](./bugfix_toast/workflow.md) | ログ強化（日本語化+プレフィックス）+ ToastProvider/useToastフック |
| 11 | ActiveRecall Phase 1 | [activerecall_phase1_voice](./activerecall_phase1_voice/workflow.md) | 音声録音（MediaRecorder API）+ 文字起こし（faster-whisper） |
| 12 | ActiveRecall Phase 2 | [activerecall_phase2_knowledge](./activerecall_phase2_knowledge/workflow.md) | 知識管理CRUD + クイズ管理 + SM-2基盤（4テーブル + 10 API） |

## 各ディレクトリの構成

各ワークフローディレクトリには以下のファイルが含まれます:

| ファイル | 説明 |
|---------|------|
| `workflow.md` | ワークフロー解説（概要、図埋め込み、ステップ解説、関連ファイル一覧） |
| `swimlane.drawio` | draw.io XML形式のswimlane図（編集可能） |
| `swimlane.svg` | SVG形式のswimlane図（workflow.mdから参照） |
| `swimlane.mmd` | Mermaid記法のswimlane図（SVG生成元、一部ディレクトリのみ） |

## レーン色分け

| レーン | 色 | 説明 |
|-------|-----|------|
| ブラウザ (User) | 緑系 (#d5e8d4) | ユーザー操作・画面表示 |
| React (Frontend) | 青系 (#dae8fc) | Reactコンポーネント・state管理 |
| Express (Backend) | オレンジ系 (#ffe6cc) | Express API・ビジネスロジック |
| MySQL (DB) | 紫系 (#e1d5e7) | データベース操作 |
| 外部API | 灰色系 | Google OAuth等の外部サービス連携 |
