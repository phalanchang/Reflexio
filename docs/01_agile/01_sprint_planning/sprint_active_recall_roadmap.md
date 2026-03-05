# ActiveRecall 実装ロードマップ

## 概要

ActiveRecall機能を5つのスプリント（AR-1〜AR-5）に分割して段階的に実装する。
Sprint AR-1〜AR-3 が **MVP（最小実装）** の範囲であり、AR-4以降は将来拡張フェーズとする。

---

## MVP定義（Sprint AR-1 〜 AR-3）

MVPで実現する機能:
- ✅ 知識アイテムのCRUD（登録・一覧・編集・削除）
- ✅ クイズの手動作成（Q&A形式 + 選択式）
- ✅ 復習セッション（フラッシュカード形式でクイズ出題）
- ✅ SM-2スケジューリング（間隔反復の自動調整）
- ✅ 結果記録（正答率、品質評価、セッション履歴）
- ✅ 定着度可視化（Rechartsグラフ）
- ✅ ダッシュボード統合（「今日の復習」ウィジェット）

MVPに含まない機能:
- ❌ AI クイズ自動生成
- ❌ 穴埋め形式クイズ
- ❌ Discord通知
- ❌ Google Calendar連携（復習リマインダー）
- ❌ 知識タグ機能
- ❌ インポート/エクスポート

---

## Sprint AR-1: 知識登録 + クイズCRUD

### 目標
知識アイテムとクイズの基本CRUD機能を実装し、学習コンテンツの管理基盤を構築する。

### スコープ

#### バックエンド（DEV1担当想定）
- [ ] `docker/mysql/init/011_create_knowledge_items_table.sql` 作成
- [ ] `docker/mysql/init/012_create_quizzes_table.sql` 作成
- [ ] `backend/routes/knowledge.js` 新規作成
  - GET /api/knowledge（一覧取得、フィルタ対応）
  - GET /api/knowledge/:id（詳細取得、クイズ含む）
  - POST /api/knowledge（新規作成、クイズ同時作成対応）
  - PUT /api/knowledge/:id（更新）
  - DELETE /api/knowledge/:id（削除、CASCADE）
- [ ] `backend/routes/quizzes.js` 新規作成
  - GET /api/knowledge/:knowledgeId/quizzes（クイズ一覧）
  - POST /api/knowledge/:knowledgeId/quizzes（クイズ追加）
  - PUT /api/quizzes/:id（クイズ更新）
  - DELETE /api/quizzes/:id（クイズ削除）
- [ ] `backend/server.js` にルート登録

#### フロントエンド（DEV2担当想定）
- [ ] `KnowledgeList.js` + `KnowledgeList.css`（知識一覧ページ）
  - 一覧表示（タイトル、カテゴリ、難易度、クイズ数）
  - フィルタ機能（カテゴリ、難易度）
  - 新規追加ボタン
- [ ] `KnowledgeForm.js` + `KnowledgeForm.css`（知識登録・編集フォーム）
  - タイトル、コンテンツ、カテゴリ、難易度入力
  - クイズ同時作成セクション（Q&Aペア追加）
- [ ] `KnowledgeDetail.js` + `KnowledgeDetail.css`（知識詳細画面）
  - 知識情報表示
  - クイズ一覧 + 追加・編集・削除
- [ ] `QuizForm.js` + `QuizForm.css`（クイズ追加・編集フォーム）
  - free_text / multiple_choice 形式対応
- [ ] `App.js` ルート追加（/knowledge, /knowledge/new, /knowledge/:id, /knowledge/:id/edit）
- [ ] `Sidebar.js` に「📚 学習」メニュー追加

### 受け入れ基準
- [ ] サイドバーに「📚 学習」メニューが表示される
- [ ] 知識アイテムの追加・一覧・編集・削除ができる
- [ ] 知識にクイズ（Q&A形式）を紐づけて管理できる
- [ ] 選択式クイズ（4択）を作成できる
- [ ] フィルタリング（カテゴリ、難易度）が機能する
- [ ] 自分のデータのみ表示される（所有権チェック）
- [ ] 未ログイン時はアクセスできない

### 見積もり
- **規模**: 中
- **バックエンド**: 新規ルート2ファイル + DB初期化2ファイル
- **フロントエンド**: 新規コンポーネント4ファイル（+CSS 4ファイル）+ 既存2ファイル修正

---

## Sprint AR-2: 復習セッション + SM-2スケジューリング

### 目標
SM-2アルゴリズムに基づく間隔反復学習の復習セッション機能を実装する。

### 前提条件
- Sprint AR-1 完了（knowledge_items + quizzes のCRUDが動作）

### スコープ

#### バックエンド（DEV1担当想定）
- [ ] `docker/mysql/init/013_create_review_sessions_table.sql` 作成
- [ ] `docker/mysql/init/014_create_quiz_attempts_table.sql` 作成
- [ ] `backend/lib/sm2.js` 新規作成（SM-2アルゴリズム純粋関数）
  - `calculateNextReview(ef, repetitions, interval, qualityRating)`
  - ユニットテスト可能な設計
- [ ] `backend/routes/reviews.js` 新規作成
  - GET /api/reviews/today（今日の復習対象取得、`?limit=N` 出題数制限対応）
  - POST /api/reviews/sessions（セッション作成、`{max_items}` 出題予定数）
  - POST /api/reviews/sessions/:sessionId/answer（回答記録 + SM-2更新）
  - POST /api/reviews/sessions/:sessionId/complete（セッション完了、途中終了対応）
  - GET /api/reviews/history（セッション履歴）
- [ ] `backend/server.js` にルート登録

#### フロントエンド（DEV2担当想定）
- [ ] `ReviewSession.js` + `ReviewSession.css`（復習セッション画面）
  - 出題数選択ステップ（setup phase: 5/10/15/全て、デフォルト10）
  - フラッシュカード形式（質問表示 → 回答表示 → 品質評価）
  - プログレスバー（進捗表示）
  - 途中終了ボタン（回答済み分のみスコア算出）
  - 6状態分岐（復習なし/ローディング/エラー/出題数選択/セッション中/完了）
- [ ] `ReviewResult.js` + `ReviewResult.css`（復習結果画面）
  - セッションスコア表示（途中終了時は「N問中M問回答」表示）
  - 各問題の正誤一覧
  - 「もう一度復習」「知識一覧へ」ボタン
- [ ] `App.js` ルート追加（/review, /review/result/:sessionId）
- [ ] `Sidebar.js` に「🔄 復習」メニュー追加

### 受け入れ基準
- [ ] セッション開始時に出題数（5/10/15/全て）を選択できる
- [ ] 復習期限が来た知識アイテムのクイズが出題される（優先度順）
- [ ] フラッシュカード形式で回答→正解表示→品質評価の流れが動作する
- [ ] 品質評価(0-5)に基づいてSM-2パラメータが正しく更新される
- [ ] 正解時は復習間隔が伸び、不正解時はリセットされる
- [ ] セッション途中で「終了する」ボタンから途中終了できる
- [ ] 途中終了時も回答済み分のスコアが正しく算出される
- [ ] セッション完了後に結果サマリーが表示される
- [ ] 復習履歴が閲覧できる
- [ ] 新規登録した知識アイテムが即座に復習対象になる
- [ ] サイドバー「🔄 復習」から直接セッション画面にアクセスできる

### 見積もり
- **規模**: 大（SM-2アルゴリズムの正確な実装とテストが重要）
- **バックエンド**: 新規ルート1ファイル + SM-2モジュール1ファイル + DB初期化2ファイル
- **フロントエンド**: 新規コンポーネント2ファイル（+CSS 2ファイル）+ 既存1ファイル修正
- **注意点**: SM-2の境界ケース（EF最小値1.3、interval計算の丸め等）のテスト必須

---

## Sprint AR-3: ダッシュボード統合 + 定着度チャート

### 目標
ダッシュボードに復習ウィジェットを追加し、定着度の可視化グラフを実装する。

### 前提条件
- Sprint AR-2 完了（復習セッション + SM-2が動作）

### スコープ

#### バックエンド（DEV1担当想定）
- [ ] `backend/routes/knowledge.js` に統計エンドポイント追加
  - GET /api/knowledge/stats（全体統計: total, due_today, mastered, learning, retention_avg）
  - GET /api/knowledge/stats/retention（定着度推移: 期間別日次データ）
- [ ] 統計集計SQL: 全日付埋め対応（既存 calendar summary と同パターン）

#### フロントエンド（DEV2担当想定）
- [ ] `RetentionChart.js` + `RetentionChart.css`（定着度グラフ）
  - Recharts LineChart で定着度推移を表示
  - 期間切替（7日/週/月）ピル型タブ
  - 既存 TimeChart と同じカスタムツールチップパターン
- [ ] `Dashboard.js` に「今日の復習」ウィジェット追加
  - 復習待ち件数表示
  - 全体定着度パーセンテージ
  - 「復習を始める」ボタン（/review へ遷移）
  - 知識アイテム未登録時は非表示
- [ ] `Dashboard.css` に復習ウィジェットスタイル追加
- [ ] `KnowledgeList.js` にRetentionChart統合

### 受け入れ基準
- [ ] ダッシュボードに「今日の復習」ウィジェットが表示される
- [ ] 復習待ち件数と全体定着度が正確に表示される
- [ ] 定着度推移グラフ（LineChart）が期間切替で表示される
- [ ] グラフの全日付が連続している（空白日なし）
- [ ] 知識アイテムが未登録の場合、復習ウィジェットは非表示
- [ ] 「復習を始める」ボタンから復習画面に遷移できる

### 見積もり
- **規模**: 中
- **バックエンド**: 既存ルートに2エンドポイント追加
- **フロントエンド**: 新規コンポーネント1ファイル（+CSS）+ 既存2ファイル修正
- **注意点**: TimeChart/Dashboard の既存レイアウトを崩さないこと

---

## Sprint AR-4（将来）: AI クイズ自動生成

### 目標
Claude APIを使用して、知識コンテンツからクイズを自動生成する機能を追加する。

### スコープ概要
- `backend/lib/quizGenerator.js` 新規作成（Claude API連携）
- POST /api/knowledge/:id/generate-quizzes エンドポイント追加
- 環境変数: `ANTHROPIC_API_KEY`
- `@anthropic-ai/sdk` パッケージ追加
- フロントエンドに「AI生成」ボタン追加
- 生成結果のプレビュー・編集・保存フロー
- レート制限（1日10回/ユーザー）
- 穴埋め形式（`fill_blank`）クイズタイプの追加

### 見積もり
- **規模**: 大（外部API連携の設計・エラーハンドリング・コスト管理が重要）

---

## Sprint AR-5（将来）: 外部通知連携

### 目標
復習リマインダーをDiscordとGoogle Calendarに連携する。

### スコープ概要
- Discord Webhook / Clawdbot連携で復習リマインダー送信
- 既存 Google Calendar API 拡張で復習予定イベント登録
- バッチジョブ or cron で毎朝チェック → 通知送信
- ユーザー設定画面に通知設定セクション追加

### 見積もり
- **規模**: 中（既存連携基盤の拡張のため）

---

## 全体スケジュール概要

```
 Sprint AR-1        Sprint AR-2        Sprint AR-3
 知識+クイズCRUD     復習+SM-2          ダッシュボード+グラフ
 ┌────────────┐     ┌────────────┐     ┌────────────┐
 │ DB設計      │     │ SM-2実装   │     │ Stats API  │
 │ Knowledge   │ ──→ │ Review     │ ──→ │ Retention  │
 │ CRUD API    │     │ Session    │     │ Chart      │
 │ UI基盤      │     │ UI         │     │ Dashboard  │
 └────────────┘     └────────────┘     └────────────┘
        ◀────────── MVP スコープ ──────────▶

                    Sprint AR-4        Sprint AR-5
                    AI自動生成          外部通知
                    ┌────────────┐     ┌────────────┐
                    │ Claude API │     │ Discord    │
                    │ Quiz Gen   │     │ Calendar   │
                    │ fill_blank │     │ Reminder   │
                    └────────────┘     └────────────┘
                    ◀──── 将来拡張 ────▶
```

### 依存関係

| Sprint | 依存先 | 備考 |
|--------|--------|------|
| AR-1 | なし | 独立して開始可能 |
| AR-2 | AR-1 | knowledge_items + quizzes が必要 |
| AR-3 | AR-2 | SM-2パラメータ + review_sessions が必要 |
| AR-4 | AR-1 | quizzes テーブルが必要（AR-2不要） |
| AR-5 | AR-2 | next_review_date が必要 |

### チーム割り当て方針

| Sprint | DEV1（バックエンド） | DEV2（フロントエンド） |
|--------|-------|---------|
| AR-1 | DB設計 + Knowledge/Quiz API | KnowledgeList + Form + Detail + QuizForm |
| AR-2 | SM-2エンジン + Review API | ReviewSession + ReviewResult |
| AR-3 | Stats API | RetentionChart + Dashboard統合 |

- 各スプリントでDEV1(バックエンド)とDEV2(フロントエンド)が並行作業可能
- DEV2はDEV1のAPI仕様（エンドポイント + レスポンス形式）を事前共有してモック開発可能

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| SM-2アルゴリズムの境界ケースバグ | 高 | 純粋関数分離 + ユニットテスト |
| 復習セッションUXの複雑さ | 中 | フラッシュカード形式でシンプルに保つ |
| DB初期化順序の依存関係 | 低 | SQL番号体系で順序を保証 |
| 知識コンテンツの量が増えた時のパフォーマンス | 低 | インデックス + ページネーション |
| Claude API連携のコスト | 中 | MVP段階では手動作成に限定 |

---

## 関連ドキュメント

- [ActiveRecall 機能要件書](../../02_waterfall/01_requirement/02_active_recall_requirement.md)
- [ActiveRecall アーキテクチャ設計](../../02_waterfall/02_design/01_active_recall_architecture.md)
- [Reflexio 要件定義書](../../02_waterfall/01_requirement/01_reflexio_requirement.md)
- [Sprint 2 計画（参考: CRUD実装パターン）](./02_sprint_02_planning.md)
