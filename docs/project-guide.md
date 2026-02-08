# Reflexio プロジェクトガイド（AIエージェント向け）

このドキュメントは、AIエージェントがプロジェクトの全体像を素早く把握するためのガイドです。

## プロジェクト概要

**Reflexio** は個人の生活管理を支援する統合型Webアプリケーション。
ダッシュボード、家計簿、ノート管理、ActiveRecall（間隔反復学習）、タスク管理の機能を段階的に開発する。

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フロントエンド | React | 18.x |
| ルーティング | react-router-dom | 6.x |
| バックエンド | Express (Node.js) | 4.x (Node 18) |
| データベース | MySQL | 8.0 |
| 認証 | express-session + bcrypt | セッションベース |
| インフラ | Docker Compose | - |
| 開発環境 | Windows + WSL2 | - |

## ディレクトリ構成

```
Reflexio/
├── CLAUDE.md                  # エージェント自動読み込みコンテキスト
├── docker-compose.yml         # サービス定義（DB, Backend, Frontend）
├── docker/
│   └── mysql/init/            # MySQL初期化SQL（テーブル作成・シードデータ）
├── backend/
│   ├── server.js              # Expressエントリーポイント
│   ├── config/database.js     # MySQL接続プール
│   ├── middleware/auth.js     # 認証ミドルウェア (requireAuth)
│   ├── routes/auth.js         # 認証API (/api/auth/*)
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js             # ルーティング・認証状態管理
│   │   ├── index.js           # BrowserRouterラッパー
│   │   └── components/
│   │       ├── LoginForm.js   # ログインフォーム
│   │       ├── Header.js      # ヘッダー（40px、ログアウトボタン）
│   │       ├── Sidebar.js     # サイドバー（250px、ナビゲーション）
│   │       ├── MainLayout.js  # Header+Sidebar+Content配置
│   │       ├── ProtectedRoute.js  # 未認証→/loginリダイレクト
│   │       └── Dashboard.js   # ダッシュボード（プレースホルダー）
│   ├── package.json
│   └── Dockerfile
└── docs/                      # ドキュメント
    ├── project-guide.md       # ← このファイル
    ├── 01_agile/              # アジャイル開発ドキュメント
    │   ├── 01_sprint_planning/  # スプリント計画
    │   ├── 02_user_stories/     # ユーザーストーリー
    │   └── 04_review/          # レビューチェックリスト
    └── 02_waterfall/          # ウォーターフォール成果物
        └── 01_requirement/    # 要件定義
```

## Docker環境

### ポート構成

| サービス | コンテナ内ポート | ホストポート | 備考 |
|---------|----------------|------------|------|
| MySQL | 3306 | 3307 | コンテナ間通信は3306 |
| Backend (Express) | 3001 | 3002 | |
| Frontend (React) | 3003 | 3003 | PORT環境変数で指定 |

### 起動コマンド

```bash
# 初回または initスクリプト変更時（ボリューム削除して再作成）
docker compose down -v && docker compose up --build

# 通常起動
docker compose up -d

# ログ確認
docker compose logs -f [backend|frontend|db]
```

### 重要な注意事項

- MySQL initスクリプト (`docker/mysql/init/`) は**ボリューム初回作成時のみ**実行される。テーブル定義やシードデータを変更した場合は `docker compose down -v` が必要
- WSL2環境では `localhost` が使えない場合がある。`ip addr show eth0` でWSL2のIPを確認し、そのIPでアクセスする
- フロントエンドのAPI接続先は `window.location.hostname` から動的に決定される（localhost でも WSL2 IP でも自動対応）

## API設計

### 認証API (`/api/auth`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/auth/login` | 不要 | `{username, password}` | `{message, user: {id, username, displayName}}` |
| POST | `/api/auth/logout` | 必要 | - | `{message}` |
| GET | `/api/auth/me` | 必要 | - | `{user: {id, username, displayName}}` |

- 認証はセッションベース（express-session、メモリストア）
- CORS: `origin: true` + `credentials: true` でリクエスト元オリジンを動的許可
- セッションCookieは `httpOnly: true`, `sameSite: 'lax'`
- フロントエンドの全fetchに `credentials: 'include'` が必要

### ヘルスチェック

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{status, message, database: "connected"/"disconnected"}` |

## データベース設計

### users テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| username | VARCHAR(50) UNIQUE | ログインID |
| password_hash | VARCHAR(255) | bcryptハッシュ |
| display_name | VARCHAR(100) | 表示名 |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

**シードデータ**: `admin` / `password123`

## フロントエンド設計

### 画面構成

```
┌─────────────────────────────────────────┐
│          Header (40px)                  │  ← ロゴ、ユーザー名、Logoutボタン
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │     Main Content             │  ← 選択された機能のコンテンツ
│ (250px)  │                              │
│          │                              │
└──────────┴──────────────────────────────┘
```

### ルーティング

| パス | コンポーネント | 認証 |
|-----|-------------|------|
| `/login` | LoginForm | 不要（認証済みなら `/` へリダイレクト）|
| `/` | Dashboard | 必要 |
| `/dashboard` | Dashboard | 必要 |
| その他 | `/` へリダイレクト | 必要 |

### 認証フロー

1. App.js のマウント時に `GET /api/auth/me` でセッション確認
2. 未認証 → `ProtectedRoute` が `/login` へリダイレクト
3. ログイン成功 → `App.js` の `user` state にユーザー情報を格納 → メインレイアウト表示
4. ログアウト → `POST /api/auth/logout` → `user` state を null に → `/login` へリダイレクト

## 開発手法

### アジャイル開発

- スプリント単位で機能を追加
- ユーザーストーリー → スプリント計画 → 実装 → レビュー

### ドキュメント参照先

| 内容 | パス |
|------|------|
| 要件定義 | `docs/02_waterfall/01_requirement/01_reflexio_requirement.md` |
| スプリント計画 | `docs/01_agile/01_sprint_planning/` |
| ユーザーストーリー | `docs/01_agile/02_user_stories/` |
| レビューチェックリスト | `docs/01_agile/04_review/` |

## スプリント進捗

### Sprint 1（完了）
- [x] Docker環境構築
- [x] ログイン機能
- [x] ログアウト機能
- [x] メインレイアウト（Header / Sidebar / Main Content）

### 今後の予定（優先順）
1. ダッシュボード機能
2. タスク管理機能
3. ノート管理機能
4. 家計簿機能
5. ActiveRecall機能

## コーディング規約

- **言語**: ドキュメントは日本語、コード・コミットメッセージは日本語
- **フロントエンド**: 関数コンポーネント + React Hooks（クラスコンポーネント不使用）
- **バックエンド**: CommonJS (`require`/`module.exports`)
- **CSS**: コンポーネントごとに個別CSSファイル（CSS Modules未使用）
- **状態管理**: React useState/useEffect（Redux未使用）
- **DB操作**: mysql2/promise のパラメータ化クエリ（SQLインジェクション防止）
- **認証チェック**: バックエンドは `requireAuth` ミドルウェア、フロントエンドは `ProtectedRoute` コンポーネント

## 新機能追加時のパターン

### バックエンド

1. `backend/routes/<feature>.js` にルーター作成
2. `backend/server.js` で `app.use('/api/<feature>', featureRoutes)` 登録
3. 認証が必要なルートには `requireAuth` ミドルウェアを適用
4. DBテーブルが必要なら `docker/mysql/init/` にSQLファイル追加（番号順）

### フロントエンド

1. `frontend/src/components/` にコンポーネント + CSSファイル作成
2. `frontend/src/App.js` の `<Routes>` 内にルート追加
3. `frontend/src/components/Sidebar.js` の `menuItems` にナビゲーション追加
4. API呼び出しには必ず `credentials: 'include'` を付与
