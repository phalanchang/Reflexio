# Reflexio - AIエージェント向けコンテキスト

個人の生活管理Webアプリ（React + Express + MySQL + Docker）。

## クイックリファレンス

- **詳細ガイド**: `docs/project-guide.md` を必ず参照すること
- **要件定義**: `docs/02_waterfall/01_requirement/01_reflexio_requirement.md`
- **スプリント計画**: `docs/01_agile/01_sprint_planning/`
- **ユーザーストーリー**: `docs/01_agile/02_user_stories/`
- **レビューチェックリスト**: `docs/01_agile/04_review/`

## 環境

- Docker Compose: `docker compose up -d`（初回は `down -v` してから `up --build`）
- Frontend: http://localhost:3003 (React, PORT=3003)
- Backend: http://localhost:3002 → コンテナ内 :3001 (Express)
- DB: localhost:3307 → コンテナ内 :3306 (MySQL 8.0)
- WSL2: localhost不可の場合は `ip addr show eth0` のIPを使用

## 現在の状態

- Sprint 1 完了: ログイン/ログアウト/メインレイアウト
- シードユーザー: admin / password123
- セッションベース認証（express-session、メモリストア）

## 開発ルール

- ドキュメントは日本語、コードとコミットメッセージも日本語
- フロントエンド: 関数コンポーネント + Hooks、コンポーネント別CSS
- バックエンド: CommonJS、mysql2/promise パラメータ化クエリ
- 認証: backend は `requireAuth` ミドルウェア、frontend は `ProtectedRoute`
- API fetch には `credentials: 'include'` 必須
- 新ルートは `backend/routes/` に作成し `server.js` で登録
- 新コンポーネントは `frontend/src/components/` に作成し `App.js` でルート追加、`Sidebar.js` でナビ追加
- DBテーブル追加は `docker/mysql/init/` にSQL追加（`docker compose down -v` で再初期化）
