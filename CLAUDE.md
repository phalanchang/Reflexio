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
- Sprint 2 完了: 「やりたいこと」CRUD管理（wishes テーブル、REST API、一覧/追加/編集/削除UI）
- Sprint 3 完了: タグ機能（多対多、自動作成）、フィルタリング機能（タグOR/優先度OR/組合せAND）
- Sprint 4 完了: Google カレンダー連携 + ダッシュボード棒グラフ
  - 4a: Google OAuth基盤、google_tokens テーブル、/api/google/*, /api/calendar/*
  - 4b: Recharts 積み上げ棒グラフ（TimeChart）、期間切替UI（7日/週/月）、5状態分岐
  - コンポーネント: Dashboard（リニューアル済）, GoogleConnect, GoogleCallback, TimeChart
  - summary API: 全日付埋め対応
  - recharts, googleapis パッケージ追加
- Sprint 5 完了: ユーザーごとの Google OAuth 設定 + 新規ユーザー
  - 新テーブル: google_oauth_settings（ユーザーごとのClient ID/Secret保存）
  - 新API: /api/google/settings（CRUD、secretマスク処理）
  - 新コンポーネント: Settings.js（OAuth設定画面）
  - createOAuth2Client: ユーザー設定優先 + 環境変数フォールバック
  - Dashboard 3状態分岐、GoogleConnect 設定未登録時案内
  - SPA遷移修正（`<a>` → `<Link>`）
- Sprint 6 完了: カテゴリ分類機能（イベント色ベースの分類、Settings カテゴリ設定UI）
  - 新テーブル: category_mappings（ユーザーごとの色→カテゴリ名マッピング）
  - 新API: /api/category-mappings（GET/PUT/DELETE CRUD）
  - GOOGLE_EVENT_COLORS 定数（colorId 1-11 の日本語名+HEX）
  - calendar.js summary: colorId ベースのカテゴリ分類（カスタム名 or デフォルト色名）
  - Settings.js: カテゴリ設定セクション追加（11色マッピングテーブル）
- Sprint 7 完了: 画像貼り付け機能（Ctrl+Vペースト、ファイル選択、サムネイル、全画面モーダル）
  - 新テーブル: wish_images（wish_id + CASCADE DELETE、ファイルメタ情報）
  - 新API: POST /api/wishes/:wishId/images, GET/DELETE /api/wishes/images/:imageId
  - multer によるファイルアップロード（5MB上限、JPEG/PNG/GIF/WebP、5枚/wish上限）
  - 保存先: backend/uploads/{user_id}/（バインドマウントで永続化）
  - 認証付き画像配信（所有権チェック）、wish 削除時のファイル自動クリーンアップ
  - 新コンポーネント: ImageModal.js（全画面画像ビューア）
  - WishForm.js: ペーストハンドラ + プレビュー + アップロード統合
  - WishList.js: サムネイル表示 + モーダル連携
  - multer パッケージ追加
- バグ対応: wishes 保存失敗対策（コードバグなし、運用要因対策）
  - requireAuth エラーメッセージ日本語化
  - wishes/auth のリクエストログ強化（`[wishes]`/`[auth]` プレフィックス）
- トースト通知システム追加
  - Toast.js / Toast.css 新規（ToastProvider + useToast フック）
  - 画面右上固定、成功4秒/エラー8秒自動消去、複数スタック
  - WishList.js の旧 showMessage を完全置換
- Sprint 8 完了: Clawdbot Skills Display（メイン画面ページ化 + D&D対応）
  - 新コンポーネント: ClawdbotSkills, SkillBadge, SkillModal, clawdbotSkillsData
  - メイン画面 `/clawdbot` ページ（サイドバーにNavLink追加）
  - バッジメダル: 六角形(hexagon)/八角形(octagon) の CSS clip-path
  - バッジラベル: スキル名テキスト表示（13px、max-width 120px）
  - ドラッグ&ドロップ: HTML5 D&D API、同カテゴリ内並び替え
  - 3カテゴリ: Skills(7件・青), MCP(1件・紫), Integrations(3件・緑)
  - 詳細モーダル: ESCキー + オーバーレイクリック（ImageModal準拠）
  - キーボードアクセシビリティ: tabIndex, role="button", onKeyDown
  - z-index階層: ImageModal(1000) < SkillModal(1500) < Toast(2000)
  - 将来拡張: usage_frequency, last_used, update_frequency, heat_level
  - 改修2+3: バッジ emoji → PNG 画像表示切替（全11スキル PNG 統一）
    - clawdbotSkillsData.js: badges 配列（14画像→11スキル全件）+ tier フィールド追加
    - SkillBadge.js: useState ランダム選択 + 画像/emoji 条件分岐
    - SkillModal.js: モーダル内画像表示（120x120px）+ emoji フォールバック
    - 画像ファイル: frontend/public/images/badges/ に PNG 14ファイル（全参照済み）
    - ティア定義: bronz, sliver, gold, platinum, diamond, hihiirokane
  - 改修4: バッジ画像サイズ2倍化（48→96px、wrapper 72→120px、ラベル 11→13px）
  - フロントエンドのみ（バックエンド変更なし）
- Sprint 9a 完了: やりたいこと画面 UI改善
  - 改善1: テーブルビュー（カード→テーブル切替、情報密度3倍、6カラム、ゼブラストライプ）
  - 改善3: サイドバー折りたたみ（◀/▶トグル、40px/250px、localStorage永続化）+ 全幅レイアウト（max-width削除）
  - 改善5: 期限視覚強調（赤太字/オレンジ太字/黄色/グレー/薄グレーの5段階）
  - ビュー切替: ☰テーブル / ▦カード（localStorage永続化）
  - WishList.js: getDueDateClass, viewMode state, テーブルビュー描画
  - WishList.css: max-width削除, テーブルCSS, 期限色CSS, ビュー切替CSS
  - MainLayout.js: sidebarCollapsed state, toggleSidebar
  - Sidebar.js: collapsed/onToggle props, トグルボタン, short表示
  - Sidebar.css: collapsed スタイル, transition, toggle ボタン
  - フロントエンドのみ（バックエンド変更なし）
- Sprint 9b 完了: ダークモード実装 + サイドバートグル改善
  - CSS変数（Custom Properties）で全色管理（:root 73+ / [data-theme="dark"] 57変数）
  - テーマ切替ボタン（🌙/☀️）— localStorage永続化 + OS設定自動検出（matchMedia）
  - data-theme属性でテーマ切替（MainLayout.js で管理）
  - 全CSSファイル（10ファイル）のハードコード色をCSS変数化
  - ステータス/優先度/期限/タグバッジ色は意図的にハードコード維持
  - サイドバートグル改善: 展開時24x24px右上角、折りたたみ時上部100%幅
  - 変更ファイル: App.css, MainLayout.js/css, Header.js/css, Sidebar.css, WishList.css, WishFilter.css, WishForm.css, Toast.css
  - フロントエンドのみ（バックエンド変更なし）
- Sprint 9c 完了: サマリーバー + 統合ツールバー
  - 改善2: ステータスサマリーバー（全て/未着手/進行中/完了、件数付きバッジ、クリックフィルタOR条件）
  - 改善4: 統合ツールバー（テキスト検索300msデバウンス、6種ソートlocalStorage永続化、1行コンパクト化）
  - WishList.js: selectedStatuses/searchQuery/debouncedSearch/sortOrder state、PRIORITY_ORDER定数、sortWishes関数
  - WishFilter.js: SORT_OPTIONS定数、検索フィールド(🔍+×)、ソートドロップダウン、1行flex化
  - WishList.css: サマリーバースタイル(.summary-bar/.summary-badge、ステータス別セマンティックカラー)
  - WishFilter.css: ツールバースタイル(.filter-search/.filter-sort、flex 1行化)
  - フロントエンドのみ（バックエンド変更なし）
- Sprint 9d 完了: コンテキストメニュー + 一括操作 + キーボードショートカット
  - 改善6: ActionMenu（⋯ ドロップダウン、ステータス変更サブメニュー、API PUT即時反映）
  - 改善7: 一括操作（チェックボックス列、フローティングアクションバー、Promise.all一括処理）
  - 改善8: キーボードショートカット（N/E/Delete/↑↓/Space///Escape/?の9キー）
  - 新コンポーネント: ActionMenu, useKeyboardShortcuts(カスタムフック), ShortcutHelp
  - 3層ガード: テキスト入力無効化 + isDisabled + テーブル専用キー制御
  - z-index: bulk-action-bar(50) < ActionMenu(100) < ImageModal(1000) < ShortcutHelp(1500) < Toast(2000)
  - フロントエンドのみ（バックエンド変更なし、既存 PUT/DELETE API 利用）
- シードユーザー: admin / password123, phalanchang / password123
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
