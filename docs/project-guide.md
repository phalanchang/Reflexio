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
| 外部連携 | Google OAuth 2.0 + googleapis | カレンダー連携 |
| ファイルアップロード | multer | バックエンド |
| チャート | recharts | フロントエンド |
| インフラ | Docker Compose | - |
| 開発環境 | Windows + WSL2 | - |

## ディレクトリ構成

```
Reflexio/
├── CLAUDE.md                  # エージェント自動読み込みコンテキスト
├── docker-compose.yml         # サービス定義（DB, Backend, Frontend）
├── docker/
│   └── mysql/init/            # MySQL初期化SQL（テーブル作成・シードデータ）
│       ├── 005_create_tags_tables.sql  # タグ・wish_tags テーブル
│       ├── 006_create_google_tokens_table.sql  # Google OAuth トークン
│       ├── 007_create_google_oauth_settings_table.sql  # ユーザーごとのOAuth設定
│       ├── 008_seed_user_phalanchang.sql  # 新規ユーザー phalanchang
│       ├── 009_create_category_mappings_table.sql  # カテゴリマッピング
│       └── 010_create_wish_images_table.sql  # 画像メタ情報
├── backend/
│   ├── server.js              # Expressエントリーポイント
│   ├── config/database.js     # MySQL接続プール
│   ├── config/google.js       # Google OAuth 設定（Client ID/Secret、スコープ）
│   ├── middleware/auth.js     # 認証ミドルウェア (requireAuth、日本語エラーメッセージ)
│   ├── routes/auth.js         # 認証API (/api/auth/*、ログイン成功/失敗ログ出力)
│   ├── routes/wishes.js       # やりたいことAPI (/api/wishes/*、リクエストログ強化)
│   ├── routes/tags.js         # タグAPI (/api/tags/*)
│   ├── routes/google.js       # Google OAuth API (/api/google/*)
│   ├── routes/googleSettings.js  # OAuth設定 CRUD API (/api/google/settings)
│   ├── routes/calendar.js     # カレンダーAPI (/api/calendar/*)
│   ├── routes/categoryMappings.js  # カテゴリマッピングAPI (/api/category-mappings/*)
│   ├── routes/wishImages.js  # 画像API (/api/wishes/:wishId/images, /api/wishes/images/:imageId)
│   ├── uploads/              # 画像保存ディレクトリ（{user_id}/配下、バインドマウントで永続化）
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js             # ルーティング・認証状態管理・ToastProviderラップ
│   │   ├── index.js           # BrowserRouterラッパー
│   │   └── components/
│   │       ├── LoginForm.js   # ログインフォーム
│   │       ├── Header.js      # ヘッダー（40px、ログアウトボタン）
│   │       ├── Sidebar.js     # サイドバー（250px、ナビゲーション、⚙️ 設定メニュー）
│   │       ├── MainLayout.js  # Header+Sidebar+Content配置
│   │       ├── ProtectedRoute.js  # 未認証→/loginリダイレクト
│   │       ├── Dashboard.js   # ダッシュボード（棒グラフ+期間切替+3状態分岐）
│   │       ├── Dashboard.css  # Dashboard用スタイル（期間切替タブ含む）
│   │       ├── TimeChart.js   # Recharts 積み上げ棒グラフ（カスタムツールチップ付き）
│   │       ├── TimeChart.css  # TimeChart用スタイル
│   │       ├── GoogleConnect.js   # Google カレンダー接続管理（設定未登録時案内付き）
│   │       ├── GoogleConnect.css  # GoogleConnect用スタイル
│   │       ├── GoogleCallback.js  # OAuth コールバックハンドラ
│   │       ├── GoogleCallback.css # GoogleCallback用スタイル
│   │       ├── Settings.js    # 設定画面（OAuth設定CRUD + カテゴリマッピング11色テーブル）
│   │       ├── Settings.css   # Settings用スタイル
│   │       ├── Toast.js       # トースト通知（ToastProvider + useToast フック）
│   │       ├── Toast.css      # Toast用スタイル（右上固定、スライドイン/フェードアウト）
│   │       ├── WishList.js    # やりたいこと一覧（フィルタ統合+サムネイル+モーダル+トースト通知）
│   │       ├── WishList.css   # WishList用スタイル（サムネイルスタイル含む）
│   │       ├── WishForm.js    # やりたいこと追加・編集（タグ入力+画像ペースト/選択/プレビュー）
│   │       ├── WishForm.css   # WishForm用スタイル（画像プレビュースタイル含む）
│   │       ├── ImageModal.js  # 全画面画像ビューア（モーダル）
│   │       ├── ImageModal.css # ImageModal用スタイル
│   │       ├── TagInput.js    # タグ入力コンポーネント（カンマ/Enter確定、バッジ表示）
│   │       ├── TagInput.css   # TagInput用スタイル
│   │       ├── WishFilter.js  # フィルタリングコンポーネント（タグOR/優先度OR/組合せAND）
│   │       └── WishFilter.css # WishFilter用スタイル
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
- `backend/uploads/` は Docker バインドマウントで永続化（`docker compose down -v` でも画像データは保持される）

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

### やりたいことAPI (`/api/wishes`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/wishes` | 必要 | - | `{wishes: [...]}` （各wishに `tags` 配列 + `images` 配列含む） |
| POST | `/api/wishes` | 必要 | `{title, description?, status?, priority?, due_date?, tags?}` | `{message, wish}` (201) |
| PUT | `/api/wishes/:id` | 必要 | `{title, description?, status?, priority?, due_date?, tags?}` | `{message, wish}` |
| DELETE | `/api/wishes/:id` | 必要 | - | `{message}` （CASCADE で wish_tags/wish_images 削除 + ファイルクリーンアップ） |

- status: `not_started` / `in_progress` / `completed`（デフォルト: not_started）
- priority: `high` / `medium` / `low`（デフォルト: medium）
- 所有権チェック: 自分のデータのみ操作可能
- tags: 文字列配列。POST/PUT時に `INSERT IGNORE` で自動作成、PUT時は全置換方式（DELETE+INSERT）
- GET時のtags取得: N+1回避のため一括取得

### タグAPI (`/api/tags`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/tags` | 必要 | - | `{tags: [...]}` |

- ログインユーザーのタグ一覧を取得

### Google OAuth API (`/api/google`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/google/auth/url` | 必要 | - | `{url}` （OAuth 同意画面URL） |
| POST | `/api/google/auth/callback` | 必要 | `{code, state}` | `{message, google_email}` |
| GET | `/api/google/auth/status` | 必要 | - | `{connected, google_email?, hasSettings, hasEnvConfig}` |
| POST | `/api/google/auth/disconnect` | 必要 | - | `{message}` |

- Authorization Code Grant（サーバーサイドフロー）
- CSRF防止: state パラメータ（crypto.randomBytes）
- access_token はバックエンドDB限定保持（フロントエンドに返さない）
- スコープ: `calendar.readonly`
- トークン自動リフレッシュ（有効期限5分前バッファ）
- 環境変数: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- createOAuth2Client: ユーザーDB設定優先 → 環境変数フォールバック

### OAuth設定API (`/api/google/settings`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/google/settings` | 必要 | - | `{settings: {client_id, client_secret(マスク)}}` |
| POST | `/api/google/settings` | 必要 | `{client_id, client_secret}` | `{message, settings}` (201) |
| PUT | `/api/google/settings` | 必要 | `{client_id, client_secret}` | `{message, settings}` （トークン自動リセット） |
| DELETE | `/api/google/settings` | 必要 | - | `{message}` （トークン削除+revoke付き） |

- ユーザーごとの Google OAuth Client ID/Secret を保存
- client_secret マスク処理: `'****' + secret.slice(-4)`（4文字以下は `'****'` のみ）
- PUT時: 既存トークンを自動リセット（再接続が必要）
- DELETE時: Google トークン revoke + トークン/設定の両方削除

### カレンダーAPI (`/api/calendar`)

| Method | Path | 認証 | Query Params | Response |
|--------|------|------|-------------|----------|
| GET | `/api/calendar/calendars` | 必要 | - | `{calendars: [...]}` |
| GET | `/api/calendar/events` | 必要 | `period=7days\|week\|month` | `{events: [...]}` |
| GET | `/api/calendar/summary` | 必要 | `period=7days\|week\|month` | `{summary: [...]}` （日別集計） |

- Google 接続済みユーザーのみ利用可能
- period パラメータ: `7days`（直近7日）/ `week`（今週）/ `month`（今月）
- summary API 全日付埋め: 期間内のイベントのない日も `{ date, categories: [], total: 0 }` で返却（グラフの日付軸連続性を保証）

### 画像API (`/api/wishes/.../images`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/wishes/:wishId/images` | 必要 | FormData (`image` フィールド) | `{message, image}` (201) |
| GET | `/api/wishes/images/:imageId` | 必要 | - | 画像バイナリ（Content-Type: mime_type） |
| DELETE | `/api/wishes/images/:imageId` | 必要 | - | `{message}` |

- multer による multipart/form-data アップロード
- ファイル制限: 5MB上限、JPEG/PNG/GIF/WebP のみ許可
- 枚数制限: 1 wish あたり最大5枚
- ファイル保存先: `backend/uploads/{user_id}/`（ユーザーごとにディレクトリ分離）
- ファイル名: `{timestamp}_{randomHex}.{ext}` で一意性保証
- 所有権チェック: 画像配信・削除時に user_id を検証
- DELETE: DB レコード + 物理ファイルの両方を削除
- wish 削除時: CASCADE で DB レコード削除 + ファイル自動クリーンアップ

### カテゴリマッピングAPI (`/api/category-mappings`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/category-mappings` | 必要 | - | `{mappings: [...], defaults: GOOGLE_EVENT_COLORS}` |
| PUT | `/api/category-mappings` | 必要 | `{mappings: [{google_color_id, category_name, display_color}, ...]}` | `{message, count}` |
| DELETE | `/api/category-mappings/:colorId` | 必要 | - | `{message}` |

- Google Event Colors（colorId 1-11）に対してユーザー独自のカテゴリ名を割り当て
- GET: ユーザーのカスタムマッピング一覧 + GOOGLE_EVENT_COLORS デフォルト定義を同時返却
- PUT: トランザクションで全削除→INSERT の一括アップサート方式
- DELETE: 単一マッピング削除（colorId 1-11 のバリデーション付き）
- GOOGLE_EVENT_COLORS: `backend/config/google.js` に定義（11色の日本語名+HEXカラー）
- calendar.js summary: ユーザーのカスタム名 → デフォルト色名のフォールバックでカテゴリ分類

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

**シードデータ**: `admin` / `password123`, `phalanchang` / `password123`

### wishes テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| title | VARCHAR(255) NOT NULL | やりたいことの名前 |
| description | TEXT | メモ（任意） |
| status | ENUM('not_started','in_progress','completed') | デフォルト: not_started |
| priority | ENUM('high','medium','low') | デフォルト: medium |
| due_date | DATE | 期限（任意） |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

### tags テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| name | VARCHAR(50) NOT NULL | タグ名 |
| created_at | TIMESTAMP | 自動設定 |

- UNIQUE KEY: `(user_id, name)` — 同一ユーザー内でタグ名重複不可

### wish_tags テーブル（中間テーブル）

| カラム | 型 | 備考 |
|-------|---|------|
| wish_id | INT NOT NULL | FK → wishes(id) ON DELETE CASCADE |
| tag_id | INT NOT NULL | FK → tags(id) ON DELETE CASCADE |

- 複合主キー: `(wish_id, tag_id)`
- 初期化SQL: `docker/mysql/init/005_create_tags_tables.sql`

### google_tokens テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL UNIQUE | FK → users(id) ON DELETE CASCADE |
| access_token | TEXT NOT NULL | Google アクセストークン |
| refresh_token | TEXT | Google リフレッシュトークン |
| scope | VARCHAR(500) | 許可されたスコープ |
| google_email | VARCHAR(255) | 接続先 Google アカウント |
| expires_at | DATETIME | トークン有効期限 |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

- user_id は UNIQUE — 1ユーザー1トークン
- 初期化SQL: `docker/mysql/init/006_create_google_tokens_table.sql`

### google_oauth_settings テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL UNIQUE | FK → users(id) ON DELETE CASCADE |
| client_id | VARCHAR(255) NOT NULL | Google OAuth Client ID |
| client_secret | VARCHAR(255) NOT NULL | Google OAuth Client Secret |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

- user_id は UNIQUE — 1ユーザー1設定
- 用途: ユーザーごとの Google OAuth 認証情報を保存（環境変数のフォールバックあり）
- 初期化SQL: `docker/mysql/init/007_create_google_oauth_settings_table.sql`

### wish_images テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| wish_id | INT NOT NULL | FK → wishes(id) ON DELETE CASCADE |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| filename | VARCHAR(255) NOT NULL | サーバー上のファイル名（{timestamp}_{hex}.{ext}） |
| original_name | VARCHAR(255) NOT NULL | アップロード時の元ファイル名 |
| mime_type | VARCHAR(100) NOT NULL | MIMEタイプ（image/jpeg, image/png 等） |
| size | INT NOT NULL | ファイルサイズ（バイト） |
| created_at | TIMESTAMP | 自動設定 |

- wish 削除時に CASCADE で自動削除
- 初期化SQL: `docker/mysql/init/010_create_wish_images_table.sql`

### category_mappings テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| google_color_id | INT NOT NULL | Google Event Color ID（1-11） |
| category_name | VARCHAR(100) NOT NULL | ユーザー定義のカテゴリ名 |
| display_color | VARCHAR(7) NOT NULL | 表示色（HEX形式 例: #7986cb） |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

- UNIQUE KEY: `(user_id, google_color_id)` — 同一ユーザー内でcolorId重複不可
- 用途: Google カレンダーイベントの色（colorId 1-11）にユーザー独自のカテゴリ名を割り当て
- 初期化SQL: `docker/mysql/init/009_create_category_mappings_table.sql`

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
| `/wishes` | WishList | 必要 |
| `/auth/google/callback` | GoogleCallback | 必要 |
| `/settings` | Settings | 必要 |
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

### Sprint 2（完了）
- [x] 「やりたいこと」(wishes) DB設計・テーブル作成
- [x] CRUD API実装（GET/POST/PUT/DELETE /api/wishes）
- [x] 一覧画面・追加/編集フォームUI
- [x] サイドバー・ルーティング追加
- [x] ステータス/優先度管理

### Sprint 3（完了）
- [x] タグ機能（tags/wish_tags DB設計・多対多リレーション）
- [x] タグCRUD（INSERT IGNORE自動作成、DELETE CASCADE連動）
- [x] タグAPI実装（GET /api/tags）
- [x] wishes API拡張（tags配列対応、N+1回避の一括取得）
- [x] タグ入力UI（TagInput: カンマ/Enter確定、重複防止、✕削除、バッジ表示）
- [x] フィルタリングUI（WishFilter: タグOR/優先度OR/組合せAND、リセット機能）

### Sprint 4（完了）— Google カレンダー連携 + ダッシュボード棒グラフ

#### Sprint 4a: OAuth基盤 + ダッシュボードレイアウト
- [x] Google OAuth 2.0 基盤（Authorization Code Grant、サーバーサイドフロー）
- [x] google_tokens テーブル設計（トークン保存、自動リフレッシュ）
- [x] Google OAuth API（/api/google/auth/*: URL取得・コールバック・状態確認・解除）
- [x] カレンダーAPI（/api/calendar/*: カレンダー一覧・イベント取得・日別集計）
- [x] ダッシュボードUIリニューアル（カード型ウィジェットレイアウト、時間の使い方カード）
- [x] Google接続UI（GoogleConnect: 接続/解除管理、GoogleCallback: OAuthハンドラ）
- [x] npmパッケージ追加（googleapis, recharts）

#### Sprint 4b: Recharts 棒グラフ + 期間切替UI
- [x] Recharts 積み上げ棒グラフ（TimeChart: カテゴリ別色分け、カスタムツールチップで合計時間表示）
- [x] 期間切替UI（7日/週/月のタブ切替、ピル型デザイン `.period-tab`）
- [x] カスタムツールチップ + 凡例
- [x] ローディング/エラー/空データ状態管理（5状態分岐: 未接続/ローディング/エラー/データあり/データなし）
- [x] summary API 全日付埋め改善（期間内の全日付を保証）

### Sprint 5（完了）— ユーザーごとの Google OAuth 設定 + 新規ユーザー
- [x] google_oauth_settings テーブル作成
- [x] 新規ユーザー phalanchang 追加（シードデータ）
- [x] OAuth設定 CRUD API（GET/POST/PUT/DELETE /api/google/settings）
- [x] createOAuth2Client ユーザー設定優先 + 環境変数フォールバック
- [x] Settings ページ（入力・表示・編集・削除、バリデーション、エラー/成功メッセージ）
- [x] サイドバー「⚙️ 設定」メニュー追加
- [x] Dashboard 3状態分岐（設定なし→案内 / 設定あり+未接続→接続 / 接続済み→棒グラフ）
- [x] GoogleConnect 設定未登録時案内
- [x] SPA遷移修正（`<a>` → React Router `<Link>`）

### Sprint 6（完了）— カテゴリ分類機能（イベント色ベース）
- [x] category_mappings テーブル作成（ユーザーごとの colorId→カテゴリ名マッピング）
- [x] GOOGLE_EVENT_COLORS 定数定義（colorId 1-11 の日本語名+HEXカラー）
- [x] カテゴリマッピング CRUD API（GET/PUT/DELETE /api/category-mappings）
- [x] calendar.js summary 集計ロジック変更（colorId ベースのカテゴリ分類、カスタム名→デフォルト色名フォールバック）
- [x] Settings.js カテゴリ設定セクション追加（11色マッピングテーブルUI）
- [x] Settings.css テーブルスタイル追加

### Sprint 7（完了）— 画像貼り付け機能
- [x] wish_images テーブル作成（wish_id + user_id + ファイルメタ情報、CASCADE DELETE）
- [x] 画像アップロード API（POST /api/wishes/:wishId/images、multer + FormData）
- [x] 認証付き画像配信 API（GET /api/wishes/images/:imageId、所有権チェック）
- [x] 画像削除 API（DELETE /api/wishes/images/:imageId、DB + ファイル削除）
- [x] wish 削除時のファイル自動クリーンアップ
- [x] WishForm: Ctrl+V ペーストハンドラ + ファイル選択 + プレビュー + アップロード
- [x] WishList: サムネイル表示
- [x] ImageModal: 全画面画像ビューア（モーダル）
- [x] multer パッケージ追加、backend/uploads/ バインドマウント永続化

### バグ対応 + トースト通知システム（完了）
- [x] requireAuth エラーメッセージ日本語化（「ログインが必要です。再度ログインしてください。」）
- [x] wishes/auth のリクエストログ強化（`[wishes]`/`[auth]` プレフィックス付きログ出力）
- [x] トースト通知システム新規実装（Toast.js: ToastProvider + useToast フック）
- [x] 成功(緑)/エラー(赤)/情報(青) の3タイプ、成功4秒・エラー8秒の自動消去
- [x] スライドイン/フェードアウトアニメーション、複数同時スタック表示
- [x] WishList.js の旧 showMessage を useToast に完全置換
- [x] App.js に ToastProvider ラップ追加

### 今後の予定（優先順）
1. タスク管理機能
2. ノート管理機能
3. 家計簿機能
4. ActiveRecall機能

## コーディング規約

- **言語**: ドキュメントは日本語、コード・コミットメッセージは日本語
- **フロントエンド**: 関数コンポーネント + React Hooks（クラスコンポーネント不使用）
- **バックエンド**: CommonJS (`require`/`module.exports`)
- **CSS**: コンポーネントごとに個別CSSファイル（CSS Modules未使用）
- **状態管理**: React useState/useEffect（Redux未使用）
- **DB操作**: mysql2/promise のパラメータ化クエリ（SQLインジェクション防止）
- **認証チェック**: バックエンドは `requireAuth` ミドルウェア、フロントエンドは `ProtectedRoute` コンポーネント
- **ユーザー分離**: 全APIで `user_id = req.session.userId` を使用（他ユーザーのデータにアクセス不可）
- **シークレットマスク**: API応答でsecretを返す際は `'****' + secret.slice(-4)` でマスク処理

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

### UIデザインパターン

- **ピル型タブ**: `.period-tab` / `.period-tab-active`（border-radius: 14px）— 期間切替、WishFilter の `.filter-chip` と同じデザイン
- **カード型ウィジェット**: Dashboard のセクション単位でカードUIを使用
- **5状態分岐パターン**: 未接続 → ローディング → エラー → データあり → データなし（Dashboard で採用）
- **トースト通知**: ToastProvider + useToast フック。成功(緑)/エラー(赤)/情報(青)、画面右上固定、自動消去（success=4秒, error=8秒）、スライドイン/フェードアウトアニメーション
