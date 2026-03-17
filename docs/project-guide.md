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
| 音声文字起こし | faster-whisper (Python) | Dockerコンテナ内（node:18-slim + Python3） |
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
│       ├── 010_create_wish_images_table.sql  # 画像メタ情報
│       ├── 011_create_voice_recordings_table.sql  # 音声録音メタ情報
│       ├── 012_create_transcriptions_table.sql  # 文字起こし結果
│       └── 012_create_knowledge_tables.sql  # 知識+クイズ+レビュー+クイズ試行（4テーブル）
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
│   ├── routes/recordings.js  # 音声録音API (/api/recordings/*)
│   ├── routes/transcribe.js  # 文字起こしAPI (/api/transcribe, /api/transcriptions/*)
│   ├── routes/knowledge.js  # 知識管理API (/api/knowledge/*, CRUD+フィルタ+統計)
│   ├── routes/quizzes.js    # クイズAPI (/api/knowledge/:id/quizzes, /api/quizzes/:id)
│   ├── scripts/transcribe.py # 文字起こしPythonスクリプト（faster-whisper small, CPU/int8）
│   ├── uploads/              # 画像保存ディレクトリ（{user_id}/配下、バインドマウントで永続化）
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js             # ルーティング・認証状態管理・ToastProviderラップ
│   │   ├── App.css            # グローバルCSS変数定義（:root 73+ / [data-theme="dark"] 57変数）
│   │   ├── index.js           # BrowserRouterラッパー
│   │   └── components/
│   │       ├── LoginForm.js   # ログインフォーム
│   │       ├── Header.js      # ヘッダー（40px、ログアウトボタン、🌙/☀️テーマ切替ボタン）
│   │       ├── Header.css     # Header用スタイル（CSS変数化、テーマ切替ボタン）
│   │       ├── Sidebar.js     # サイドバー（250px/40px折りたたみ、◀/▶トグル、ナビ、⚙️ 設定、🤖 Clawdbot Badge）
│   │       ├── Sidebar.css    # Sidebar用スタイル（collapsed、transition、toggle、CSS変数化）
│   │       ├── MainLayout.js  # Header+Sidebar+Content配置（sidebarCollapsed + theme state、data-theme属性管理）
│   │       ├── MainLayout.css # MainLayout用スタイル（CSS変数化）
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
│   │       ├── WishList.js    # やりたいこと一覧（カード/テーブル切替+サマリーバー+検索/ソート+フィルタ+サムネイル+モーダル+トースト+期限色）
│   │       ├── WishList.css   # WishList用スタイル（サマリーバー+テーブルCSS+期限色CSS+ビュー切替CSS+サムネイル）
│   │       ├── WishForm.js    # やりたいこと追加・編集（タグ入力+画像ペースト/選択/プレビュー）
│   │       ├── WishForm.css   # WishForm用スタイル（画像プレビュースタイル含む）
│   │       ├── ImageModal.js  # 全画面画像ビューア（モーダル）
│   │       ├── ImageModal.css # ImageModal用スタイル
│   │       ├── TagInput.js    # タグ入力コンポーネント（カンマ/Enter確定、バッジ表示）
│   │       ├── TagInput.css   # TagInput用スタイル
│   │       ├── WishFilter.js  # 統合ツールバー（タグOR/優先度OR/組合せAND+テキスト検索+6種ソート+1行flex）
│   │       ├── WishFilter.css # WishFilter用スタイル（検索フィールド+ソートドロップダウン+1行化）
│   │       ├── ActionMenu.js # コンテキストメニュー（⋯ドロップダウン、ステータス変更サブメニュー、外側クリック閉じ）
│   │       ├── ActionMenu.css # ActionMenu用スタイル（z-index: 100、ドロップダウン+サブメニュー）
│   │       ├── useKeyboardShortcuts.js # キーボードショートカット カスタムフック（9キー、3層ガード）
│   │       ├── ShortcutHelp.js  # ショートカットヘルプモーダル（?キーで表示、キー一覧テーブル）
│   │       ├── ShortcutHelp.css # ShortcutHelp用スタイル（z-index: 1500、モーダル）
│   │       ├── ClawdbotSkills.js   # Clawdbot Skills メインページ（3カテゴリ分類 + D&D並び替え）
│   │       ├── ClawdbotSkills.css  # ClawdbotSkills用スタイル
│   │       ├── SkillBadge.js  # バッジメダル（PNG画像/emoji切替 + ラベル + D&D + ティアランダム選択）
│   │       ├── SkillBadge.css # SkillBadge用スタイル（画像バッジ+カテゴリ別配色+ホバー）
│   │       ├── SkillModal.js  # スキル詳細モーダル（画像表示120px + ESC/オーバーレイクリック閉じ）
│   │       ├── SkillModal.css # SkillModal用スタイル（z-index: 1500、モーダル内画像120px）
│   │       ├── clawdbotSkillsData.js # スキルデータ定義（11件、badges配列+tier、将来拡張フィールド付き）
│   │       ├── VoiceRecorder.js  # 再利用可能な音声録音コンポーネント（MediaRecorder API、状態遷移管理）
│   │       ├── VoiceRecorder.css # VoiceRecorder用スタイル（ダークモード対応）
│   │       ├── VoiceTest.js     # 音声録音・文字起こし動作確認用テスト画面
│   │       ├── VoiceTest.css    # VoiceTest用スタイル（ダークモード対応）
│   │       ├── KnowledgeList.js # 知識一覧（統計サマリーバー+フィルタ+テーブル表示）
│   │       ├── KnowledgeList.css # KnowledgeList用スタイル（ダークモード対応）
│   │       ├── KnowledgeForm.js # 知識 新規/編集フォーム（クイズ同時作成対応）
│   │       ├── KnowledgeForm.css # KnowledgeForm用スタイル（ダークモード対応）
│   │       ├── KnowledgeDetail.js # 知識詳細（SM-2パラメータ表示+クイズ管理）
│   │       ├── KnowledgeDetail.css # KnowledgeDetail用スタイル（ダークモード対応）
│   │       ├── QuizForm.js      # 再利用可能クイズフォーム（free_text/multiple_choice切替）
│   │       └── QuizForm.css     # QuizForm用スタイル（ダークモード対応）
│   ├── public/
│   │   └── images/badges/        # バッジPNG画像（14ファイル、全11スキルにマッピング）
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
- バックエンド Docker イメージは `node:18-slim`（Python3 + faster-whisper インストール済み）
- `whisper_models` ボリュームで Whisper モデルキャッシュを永続化（初回起動時にダウンロード、以降はキャッシュ利用）

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
| PUT | `/api/wishes/:id` | 必要 | `{title, description?, status?, priority?, due_date?, tags?}` | `{message, wish}` （due_dateはformatDueDateでYYYY-MM-DDに正規化） |
| DELETE | `/api/wishes/:id` | 必要 | - | `{message}` （CASCADE で wish_tags/wish_images 削除 + ファイルクリーンアップ） |

- status: `not_started` / `in_progress` / `completed`（デフォルト: not_started）
- priority: `high` / `medium` / `low`（デフォルト: medium）
- 所有権チェック: 自分のデータのみ操作可能
- tags: 文字列配列。POST/PUT時に `INSERT IGNORE` で自動作成、PUT時は全置換方式（DELETE+INSERT）
- GET時のtags取得: N+1回避のため一括取得
- due_date: POST/PUT時に `formatDueDate()` ヘルパーで YYYY-MM-DD に正規化（ISO datetime文字列や Date オブジェクトからの変換に対応）
- 注意: mysql2 は DATE型を JavaScript Date オブジェクトで返す（`dateStrings` 未設定時）。フロントエンドでJSONシリアライズされると ISO datetime 文字列になるため、PUT時にそのまま渡すと ER_TRUNCATED_WRONG_VALUE エラーが発生する

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

### 音声録音API (`/api/recordings`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/recordings` | 必要 | FormData (`audio` フィールド) | `{message, recording}` (201) |
| GET | `/api/recordings/:id` | 必要 | - | `{recording: {...}}` |
| DELETE | `/api/recordings/:id` | 必要 | - | `{message}` |

- multer による multipart/form-data アップロード
- ファイル制限: 50MB上限、audio/webm・audio/wav・audio/mp3・audio/ogg・audio/mp4 の5種MIMEタイプ
- 保存先: `backend/uploads/recordings/{user_id}/`
- 所有権チェック: 録音取得・削除時に user_id を検証

### 文字起こしAPI (`/api/transcribe`, `/api/transcriptions`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/transcribe` | 必要 | `{recording_id}` | `{message, transcription}` (201) |
| GET | `/api/transcriptions/:id` | 必要 | - | `{transcription: {...}}` |

- child_process で Python スクリプト（backend/scripts/transcribe.py）を実行
- faster-whisper small モデル（CPU/int8 量子化）
- headersSent ガード付き（プロセス終了時のレスポンス二重送信防止）
- ステータス管理: pending → processing → completed / failed
- Docker構成: node:18-slim ベース、コンテナ内に Python3 + faster-whisper インストール済み
- PYTHON_PATH 環境変数でPythonパス指定（コンテナ内: /usr/bin/python3）
- Whisper モデルキャッシュ: Docker volume（whisper_models）で永続化（初回ダウンロード後はキャッシュ利用）

### 知識管理API (`/api/knowledge`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/knowledge` | 必要 | - (Query: category, difficulty, status) | `{knowledge_items: [...]}` |
| GET | `/api/knowledge/stats` | 必要 | - | `{stats: {total_items, due_today, mastered, learning, not_started, retention_avg}}` |
| GET | `/api/knowledge/:id` | 必要 | - | `{knowledge_item: {..., quizzes: [...]}}` |
| POST | `/api/knowledge` | 必要 | `{title, content, category?, difficulty?, quizzes?}` | `{message, knowledge_item}` (201) |
| PUT | `/api/knowledge/:id` | 必要 | `{title?, content?, category?, difficulty?}` | `{message, knowledge_item}` |
| DELETE | `/api/knowledge/:id` | 必要 | - | `{message}` （CASCADE でクイズも自動削除） |

- difficulty: `easy` / `medium` / `hard`（デフォルト: medium）
- SM-2パラメータ: easiness_factor, repetitions, interval_days, next_review_date, retention_score
- フィルタ: category, difficulty, status（due/mastered/not_started）
- POST時クイズ同時作成: トランザクション処理
- 所有権チェック: user_id で自分のデータのみ操作可能

### クイズAPI (`/api/knowledge/.../quizzes`, `/api/quizzes`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/knowledge/:knowledgeId/quizzes` | 必要 | - | `{quizzes: [...]}` |
| POST | `/api/knowledge/:knowledgeId/quizzes` | 必要 | `{question, answer, quiz_type?, options_json?}` | `{message, quiz}` (201) |
| PUT | `/api/quizzes/:id` | 必要 | `{question?, answer?, quiz_type?, options_json?}` | `{message, quiz}` |
| DELETE | `/api/quizzes/:id` | 必要 | - | `{message}` |

- quiz_type: `free_text`（デフォルト）/ `multiple_choice`
- options_json: 選択肢（JSON型、multiple_choice時のみ使用）
- 所有権チェック: 知識アイテム所有者のみ操作可能
- 知識アイテム削除時: CASCADE でクイズも自動削除

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

### voice_recordings テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| filename | VARCHAR(255) NOT NULL | サーバー上のファイル名 |
| original_name | VARCHAR(255) NOT NULL | アップロード時の元ファイル名 |
| mime_type | VARCHAR(100) NOT NULL | MIMEタイプ（audio/webm 等） |
| size | INT NOT NULL | ファイルサイズ（バイト） |
| duration | FLOAT | 録音時間（秒、任意） |
| created_at | TIMESTAMP | 自動設定 |

- 初期化SQL: `docker/mysql/init/011_create_voice_recordings_table.sql`

### transcriptions テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| recording_id | INT NOT NULL | FK → voice_recordings(id) ON DELETE CASCADE |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| text | TEXT | 文字起こし結果テキスト |
| language | VARCHAR(10) | 検出言語（例: ja, en） |
| status | ENUM('pending','processing','completed','failed') | デフォルト: pending |
| error_message | TEXT | 失敗時のエラーメッセージ |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

- ステータス遷移: pending → processing → completed / failed
- 初期化SQL: `docker/mysql/init/012_create_transcriptions_table.sql`

### knowledge_items テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| title | VARCHAR(255) NOT NULL | 知識アイテムのタイトル |
| content | TEXT NOT NULL | 知識の内容 |
| category | VARCHAR(100) | カテゴリ（任意） |
| difficulty | ENUM('easy','medium','hard') | デフォルト: medium |
| easiness_factor | DECIMAL(4,2) | SM-2 容易度係数（デフォルト: 2.50） |
| repetitions | INT | SM-2 反復回数（デフォルト: 0） |
| interval_days | INT | SM-2 次回までの間隔日数（デフォルト: 0） |
| next_review_date | DATE | SM-2 次回復習日（NULL=未開始） |
| retention_score | DECIMAL(5,2) | 定着度スコア（デフォルト: 0.00） |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

- INDEX: `(user_id, next_review_date)` — レビュー対象の効率的取得
- 初期化SQL: `docker/mysql/init/012_create_knowledge_tables.sql`

### quizzes テーブル

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| knowledge_item_id | INT NOT NULL | FK → knowledge_items(id) ON DELETE CASCADE |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| question | TEXT NOT NULL | 問題文 |
| answer | TEXT NOT NULL | 回答 |
| quiz_type | ENUM('free_text','multiple_choice') | デフォルト: free_text |
| options_json | JSON | 選択肢（multiple_choice時） |
| created_at | TIMESTAMP | 自動設定 |
| updated_at | TIMESTAMP | 自動更新 |

- 知識アイテム削除時に CASCADE で自動削除
- 初期化SQL: `docker/mysql/init/012_create_knowledge_tables.sql`

### review_sessions テーブル（Phase 3用）

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| total_items | INT | 総アイテム数 |
| correct_count | INT | 正解数 |
| score | DECIMAL(5,2) | スコア |
| started_at | TIMESTAMP | 開始時刻 |
| completed_at | TIMESTAMP | 完了時刻（NULL=未完了） |

- Phase 3 で使用予定（テーブル作成のみ）
- 初期化SQL: `docker/mysql/init/012_create_knowledge_tables.sql`

### quiz_attempts テーブル（Phase 3用）

| カラム | 型 | 備考 |
|-------|---|------|
| id | INT AUTO_INCREMENT | PK |
| quiz_id | INT NOT NULL | FK → quizzes(id) ON DELETE CASCADE |
| user_id | INT NOT NULL | FK → users(id) ON DELETE CASCADE |
| session_id | INT | FK → review_sessions(id) ON DELETE SET NULL |
| user_answer | TEXT | ユーザーの回答 |
| is_correct | BOOLEAN NOT NULL | 正解/不正解 |
| quality_rating | TINYINT NOT NULL | SM-2 quality 0-5 |
| response_time_ms | INT | 回答時間（ミリ秒） |
| attempted_at | TIMESTAMP | 回答時刻 |

- Phase 3 で使用予定（テーブル作成のみ）
- 初期化SQL: `docker/mysql/init/012_create_knowledge_tables.sql`

## フロントエンド設計

### 画面構成

```
┌─────────────────────────────────────────┐
│          Header (40px)                  │  ← ロゴ、ユーザー名、Logoutボタン
├──────────┬──────────────────────────────┤
│          │                              │
│ Sidebar  │     Main Content             │  ← 選択された機能のコンテンツ
│(250/40px)│     （全幅レイアウト）          │
│ ◀/▶     │                              │
└──────────┴──────────────────────────────┘
```

- サイドバーは折りたたみ可能（◀/▶トグル、展開250px / 折りたたみ40px）
- 折りたたみ状態は localStorage で永続化
- メインコンテンツは全幅レイアウト（max-width 制限なし）

### ルーティング

| パス | コンポーネント | 認証 |
|-----|-------------|------|
| `/login` | LoginForm | 不要（認証済みなら `/` へリダイレクト）|
| `/` | Dashboard | 必要 |
| `/dashboard` | Dashboard | 必要 |
| `/wishes` | WishList | 必要 |
| `/auth/google/callback` | GoogleCallback | 必要 |
| `/settings` | Settings | 必要 |
| `/clawdbot` | ClawdbotSkills | 必要 |
| `/voice-test` | VoiceTest | 必要 |
| `/knowledge` | KnowledgeList | 必要 |
| `/knowledge/new` | KnowledgeForm | 必要 |
| `/knowledge/:id` | KnowledgeDetail | 必要 |
| `/knowledge/:id/edit` | KnowledgeForm | 必要 |
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

### Sprint 8（完了）— Clawdbot Skills Display（メイン画面ページ化 + D&D対応）
- [x] clawdbotSkillsData.js: スキルデータ定義（11件、3カテゴリ、将来拡張フィールド）
- [x] SkillBadge.js: バッジメダルUI（hexagon/octagon CSS clip-path、カテゴリ別配色）
- [x] SkillBadge.js: バッジラベル追加（スキル名テキスト表示、13px、max-width 120px）
- [x] SkillBadge.js: HTML5 D&D API 対応（draggable, onDragStart/Over/Drop/End props）
- [x] SkillModal.js: スキル詳細モーダル（ESCキー + オーバーレイクリック閉じ、z-index: 1500）
- [x] ClawdbotSkills.js: メイン画面ページコンポーネント（Skills/MCP/Integrations 3カテゴリ分類表示）
- [x] ClawdbotSkills.js: ドラッグ&ドロップ並び替え（同カテゴリ内のみ、useState で状態管理）
- [x] App.js: `/clawdbot` ルート追加（ClawdbotSkills をメインコンテンツ表示）
- [x] Sidebar.js: ClawdbotSkills埋め込み削除 → NavLink「🤖 Clawdbot Badge」追加
- [x] キーボードアクセシビリティ対応（tabIndex, role="button", onKeyDown）
- [x] z-index階層整理: ImageModal(1000) < SkillModal(1500) < Toast(2000)
- [x] 改修2+3: バッジ emoji → PNG 画像表示切替（全11スキル PNG 統一）
  - [x] clawdbotSkillsData.js: badges 配列追加（14画像→全11スキルにマッピング）+ tier フィールド追加
  - [x] SkillBadge.js: useState lazy initializer でランダムバッジ選択（tier 設定時は優先）
  - [x] SkillBadge.js: 画像バッジ / emoji フォールバック条件分岐
  - [x] SkillModal.js: モーダル内画像表示（120x120px）+ emoji フォールバック
  - [x] PNG 画像14ファイル（frontend/public/images/badges/、全参照済み）
  - [x] 複数ティア対応: tmux（4ティア: bronz/sliver/gold/platinum）はランダム選択
  - [x] ティア定義: bronz, sliver, gold, platinum, diamond, hihiirokane
- [x] 改修4: バッジ画像サイズ2倍化（SkillBadge.css 5プロパティ変更）
  - [x] バッジサイズ: 48→96px、ラッパー幅: 72→120px、ラベル: 11→13px / max-width 120px
- [x] フロントエンドのみ（バックエンド変更なし）

### Sprint 9a（完了）— やりたいこと画面 UI改善
- [x] 改善1: テーブルビュー（カード→テーブル切替、情報密度3倍、6カラム、ゼブラストライプ）
  - [x] WishList.js: viewMode state（`card`/`table`、localStorage 永続化）
  - [x] WishList.js: テーブルビュー描画（タイトル・ステータス・優先度・期限・タグ・操作の6カラム）
  - [x] WishList.css: テーブルCSS + ビュー切替ボタンCSS（☰テーブル / ▦カード）
- [x] 改善3: サイドバー折りたたみ + 全幅レイアウト
  - [x] MainLayout.js: sidebarCollapsed state（localStorage 永続化）、toggleSidebar 関数
  - [x] Sidebar.js: collapsed/onToggle props 対応、◀/▶トグルボタン、short 表示モード
  - [x] Sidebar.css: collapsed スタイル（250px→40px transition）、トグルボタンスタイル
  - [x] WishList.css: max-width 削除（全幅レイアウト対応）
  - [x] MainLayout.css: dead CSS 削除
- [x] 改善5: 期限視覚強調（5段階色分け）
  - [x] WishList.js: getDueDateClass 関数（期限日からの残り日数で CSS クラスを決定）
  - [x] WishList.css: 赤太字（期限切れ）/ オレンジ太字（3日以内）/ 黄色（7日以内）/ グレー（8日以上）/ 薄グレー（期限なし）
- [x] フロントエンドのみ（バックエンド変更なし）

### Sprint 9b（完了）— ダークモード実装 + サイドバートグル改善
- [x] CSS変数（Custom Properties）でテーマシステム構築
  - [x] App.css: `:root` に73+変数定義（ライトテーマ）、`[data-theme="dark"]` に57変数定義（ダークテーマ）
  - [x] CSS変数カテゴリ: Header, Sidebar, Main, Card/Table, Text, Border, Filter, Form, Buttons, Empty, Toast, Toggle, Image
  - [x] 全CSSファイル（10ファイル）のハードコード色をCSS変数に置換
  - [x] ステータス/優先度/期限/タグバッジ色は意図的にハードコード維持（テーマに依存しない固定色）
- [x] テーマ切替機能
  - [x] MainLayout.js: theme state（useState + localStorage永続化 + OS設定自動検出 matchMedia）
  - [x] MainLayout.js: `document.documentElement.setAttribute('data-theme', theme)` でテーマ切替
  - [x] Header.js: 🌙/☀️テーマ切替ボタン（toggleTheme props、Header右側配置）
  - [x] Header.css: テーマ切替ボタンスタイル（背景なし・ボーダーなし・ホバー効果）
- [x] サイドバートグル改善
  - [x] 展開時: 24x24px 右上角に配置（position: absolute）
  - [x] 折りたたみ時: 上部100%幅に配置（position: static）
  - [x] Sidebar.css: CSS変数化 + トグルボタン position 切替パターン
- [x] CSS変数化対象ファイル一覧
  - [x] App.css（変数定義）、MainLayout.css、Header.css、Sidebar.css、WishList.css、WishFilter.css、WishForm.css、Toast.css
- [x] フロントエンドのみ（バックエンド変更なし）

### Sprint 9c（完了）— サマリーバー + 統合ツールバー（検索・ソート・ステータスフィルタ）
- [x] 改善2: ステータスサマリーバー
  - [x] WishList.js: selectedStatuses state（Set で OR フィルタ管理）
  - [x] WishList.js: ステータス別件数計算 + クリックでフィルタトグル
  - [x] WishList.css: .summary-bar / .summary-badge（ステータス別セマンティックカラー: 未着手=グレー、進行中=青、完了=緑）
- [x] 改善4: 統合ツールバー（検索 + ソート + コンパクト化）
  - [x] WishList.js: searchQuery / debouncedSearch state（300ms デバウンス、タイトル・説明・タグ名を検索対象）
  - [x] WishList.js: sortOrder state（localStorage 永続化）、PRIORITY_ORDER 定数、sortWishes 関数
  - [x] WishFilter.js: SORT_OPTIONS 定数（6種: 作成日降順/昇順、優先度高→低/低→高、期限昇順/降順）
  - [x] WishFilter.js: 検索フィールド（🔍プレースホルダ + × クリアボタン）+ ソートドロップダウン
  - [x] WishFilter.css: 1行 flex 化（.filter-toolbar）、.filter-search / .filter-sort スタイル
- [x] フロントエンドのみ（バックエンド変更なし）

### Sprint 9d（完了）— コンテキストメニュー + 一括操作 + キーボードショートカット
- [x] 改善6: コンテキストメニュー（ActionMenu）
  - [x] ActionMenu.js: ⋯ボタンでドロップダウン表示（編集/削除/ステータス変更サブメニュー）
  - [x] ActionMenu.js: props（wish, onEdit, onDelete, onStatusChange）、外側クリックで閉じ（useEffect + mousedown）
  - [x] ActionMenu.css: z-index: 100、ドロップダウン + サブメニュースタイル
  - [x] WishList.js: handleStatusChange 関数（既存 PUT API でステータス即時変更 + トースト通知）
- [x] 改善7: 一括操作
  - [x] WishList.js: selectedIds state（Set）、全選択/個別選択チェックボックス
  - [x] WishList.js: handleBulkStatusChange / handleBulkDelete（Promise.all で一括処理）
  - [x] WishList.css: フローティングアクションバー（.bulk-action-bar、z-index: 50、画面下部固定）
  - [x] テーブルビュー: チェックボックス列追加（7カラム化）
- [x] 改善8: キーボードショートカット
  - [x] useKeyboardShortcuts.js: カスタムフック（11パラメータ: 9コールバック + isDisabled + isTableView）
  - [x] ShortcutHelp.js: ショートカットヘルプモーダル（props: isOpen, onClose、z-index: 1500）
  - [x] キー一覧: N(新規), E(編集), Delete(削除), ↑↓(移動), Space(選択), /(検索), Escape(解除), ?(ヘルプ)
  - [x] 3層ガード: テキスト入力無効化（input/textarea/select）+ isDisabled + テーブル専用キー制御（↑↓/Space）
  - [x] focusedIndex: useEffect でクランプ（リスト件数変動時の範囲外防止）
- [x] z-index階層更新: bulk-action-bar(50) < ActionMenu(100) < ImageModal(1000) < ShortcutHelp(1500) < Toast(2000)
- [x] フロントエンドのみ（バックエンド変更なし、既存 PUT/DELETE API 利用）

### ActiveRecall Phase 1（完了）— 音声録音・文字起こし基盤
- [x] voice_recordings テーブル作成（音声ファイルメタ情報）
- [x] transcriptions テーブル作成（文字起こし結果・ステータス管理）
- [x] 音声録音 API（POST/GET/DELETE /api/recordings、multer 50MB上限、5種MIMEタイプ）
- [x] 文字起こし API（POST /api/transcribe、GET /api/transcriptions/:id）
- [x] Python スクリプト（backend/scripts/transcribe.py、faster-whisper small、CPU/int8）
- [x] child_process 実行 + headersSent ガード（レスポンス二重送信防止）
- [x] VoiceRecorder.js: 再利用可能な音声録音コンポーネント（MediaRecorder API、状態遷移管理）
- [x] VoiceTest.js: 動作確認用テスト画面（/voice-test）
- [x] App.js: /voice-test ルート追加、Sidebar.js: ナビゲーション追加
- [x] ダークモード対応（CSS変数）、credentials: 'include' 設定済み
- [x] ブランチ: feature/active-recall-voice-recording
- [x] バグ修正: DockerコンテナにPython+faster-whisperインストール（node:18-alpine→node:18-slim変更）
  - [x] Dockerfile: node:18-slim ベース + Python3/pip/faster-whisper インストール
  - [x] docker-compose.yml: whisper_models ボリューム追加（モデルキャッシュ永続化）
  - [x] PYTHON_PATH 環境変数化（コンテナ内: /usr/bin/python3）

### ActiveRecall Phase 2（完了）— 知識管理+クイズ管理（CRUD + SM-2基盤）
- [x] knowledge_items テーブル作成（SM-2パラメータ: easiness_factor, repetitions, interval_days, next_review_date, retention_score）
- [x] quizzes テーブル作成（free_text/multiple_choice、options_json JSON、CASCADE DELETE）
- [x] review_sessions, quiz_attempts テーブル作成（Phase 3用、テーブルのみ）
- [x] 知識管理API（GET/POST/PUT/DELETE /api/knowledge、GET /api/knowledge/stats）
  - [x] フィルタ対応: category, difficulty, status（due/mastered/not_started）
  - [x] 統計API: total_items, due_today, mastered, learning, not_started, retention_avg
  - [x] POST時クイズ同時作成（トランザクション処理）
- [x] クイズAPI（GET/POST /api/knowledge/:knowledgeId/quizzes、PUT/DELETE /api/quizzes/:id）
- [x] KnowledgeList.js: 統計サマリーバー + フィルタ + テーブル表示
- [x] KnowledgeForm.js: 新規/編集兼用 + QuizForm でクイズ同時作成
- [x] KnowledgeDetail.js: SM-2パラメータ表示 + クイズ一覧管理
- [x] QuizForm.js: 再利用可能、free_text/multiple_choice 切替
- [x] App.js: /knowledge, /knowledge/new, /knowledge/:id, /knowledge/:id/edit ルート追加
- [x] Sidebar.js: 📚 学習（/knowledge）ナビゲーション追加
- [x] ダークモード対応済み（CSS変数使用）

### Sprint 10 バグ修正（完了）— ステータス変更500エラー（GitHub Issue #28）
- [x] 根本原因特定: mysql2 が DATE 型を JavaScript Date オブジェクトで返却 → JSON シリアライズで ISO datetime 文字列に → PUT 時にそのまま MySQL DATE 型に挿入 → ER_TRUNCATED_WRONG_VALUE
- [x] formatDueDate() ヘルパー関数追加（backend/routes/wishes.js）
  - YYYY-MM-DD 形式はそのまま返却
  - ISO datetime 文字列は `new Date(value).toISOString().split('T')[0]` で日付部分のみ抽出
  - 無効値は null を返却
- [x] POST /api/wishes、PUT /api/wishes/:id の両方に formatDueDate() を適用
- [x] 変更ファイル: backend/routes/wishes.js（1ファイルのみ）

### 今後の予定（優先順）
1. ActiveRecall Phase 3: 間隔反復学習（SM-2アルゴリズム実行 + レビューセッション）
2. タスク管理機能
3. ノート管理機能
4. 家計簿機能

## コーディング規約

- **言語**: ドキュメントは日本語、コード・コミットメッセージは日本語
- **フロントエンド**: 関数コンポーネント + React Hooks（クラスコンポーネント不使用）
- **バックエンド**: CommonJS (`require`/`module.exports`)
- **CSS**: コンポーネントごとに個別CSSファイル（CSS Modules未使用）。色はCSS変数（`var(--xxx)`）を使用（App.css で定義、ダークモード対応）
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
- **バッジメダル**: CSS clip-path で hexagon（六角形・Skills）/ octagon（八角形・MCP/Integrations）。カテゴリ別配色（青/紫/緑）+ ホバーエフェクト。バッジラベル（スキル名テキスト、13px、max-width 120px）。バッジサイズ96px、ラッパー120px。PNG画像バッジ対応（useState lazy initializer でティアランダム選択、画像なし→emojiフォールバック）
- **ドラッグ&ドロップ**: HTML5 D&D API（dragStart/dragOver/drop/dragEnd）。同カテゴリ内のみ並び替え可能。useState で各カテゴリリストを個別管理
- **z-index階層**: bulk-action-bar(50) < ActionMenu(100) < ImageModal(1000) < SkillModal/ShortcutHelp(1500) < Toast(2000) — モーダル・通知の重なり順を統一管理
- **サイドバー折りたたみ**: ◀/▶トグルボタン。展開250px / 折りたたみ40px。CSS transition でスムーズアニメーション。localStorage で状態永続化
- **ビュー切替**: ☰テーブル / ▦カードの切替ボタン。localStorage で選択状態永続化。テーブルビューはゼブラストライプ + 6カラム情報表示
- **期限視覚強調**: getDueDateClass 関数で5段階色分け。赤太字（期限切れ）/ オレンジ太字（3日以内）/ 黄色（7日以内）/ グレー（8日以上）/ 薄グレー（期限なし）
- **ダークモード（テーマシステム）**: CSS変数ベース。App.css に `:root`（ライト73+変数）と `[data-theme="dark"]`（ダーク57変数）を定義。MainLayout.js で theme state 管理（localStorage永続化 + OS設定自動検出 `matchMedia('prefers-color-scheme: dark')`）。Header.js に 🌙/☀️ 切替ボタン。新規色追加時は App.css の両テーマに変数追加が必要。ステータス/優先度/期限色はテーマ非依存のハードコード維持
- **サマリーバー**: ステータス別件数バッジ（全て/未着手/進行中/完了）。クリックで OR フィルタ。セマンティックカラー（未着手=グレー、進行中=青、完了=緑）。Set で複数ステータス同時選択
- **統合ツールバー**: テキスト検索（300ms デバウンス、タイトル・説明・タグ名を対象）+ 6種ソート（作成日/優先度/期限の昇順・降順）+ 1行 flex レイアウト。ソート順は localStorage 永続化。🔍検索フィールド + × クリアボタン
- **コンテキストメニュー（ActionMenu）**: ⋯ボタンでドロップダウン表示。編集/削除/ステータス変更サブメニュー。外側クリックで閉じ（mousedown イベント）。z-index: 100
- **一括操作**: チェックボックス列（テーブルビュー7カラム化）。selectedIds（Set）で選択管理。フローティングアクションバー（画面下部固定、z-index: 50）。Promise.all で一括ステータス変更/一括削除
- **キーボードショートカット**: useKeyboardShortcuts カスタムフック（9キー: N/E/Delete/↑↓/Space///Escape/?）。3層ガード: テキスト入力無効化（input/textarea/select）+ isDisabled + テーブル専用キー制御。ShortcutHelp モーダル（?キーで表示、z-index: 1500）
