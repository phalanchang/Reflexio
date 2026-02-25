# 02. ActiveRecall機能 要件定義書

## 概要

ActiveRecall（アクティブリコール）は、Reflexioの学習支援機能です。
ユーザーが登録した知識に対して手動で作成したクイズを使い、SM-2アルゴリズムに基づく間隔反復学習で知識の定着を支援します。

**対象フロー**: 知識登録 → クイズ作成 → 復習セッション → 結果記録 → 定着度測定

## 1. 知識登録の仕様

### 1.1 保存先

- **Reflexio DB（MySQL）** に新テーブル `knowledge_items` を作成
- 既存アーキテクチャ（Express + MySQL）に統合
- Notion/Markdown連携は将来拡張として検討対象外

### 1.2 メタデータ

| 属性 | 型 | 必須 | 説明 |
|------|---|------|------|
| タイトル | テキスト(255文字) | 必須 | 知識の名前・トピック |
| コンテンツ | テキスト(長文) | 必須 | 知識の本文・メモ・解説 |
| カテゴリ | テキスト(100文字) | 任意 | 自由入力（例: JavaScript, 歴史, 英単語） |
| 難易度 | 選択 | 必須 | easy / medium / hard（デフォルト: medium） |
| 定着度スコア | 数値(0-100) | 自動 | 直近の復習結果から自動算出 |
| Easiness Factor | 数値(1.3-5.0) | 自動 | SM-2アルゴリズムのEF値（初期値: 2.50） |
| 復習回数 | 整数 | 自動 | 連続正答回数（SM-2の repetitions） |
| 復習間隔 | 整数(日) | 自動 | 現在の復習間隔（SM-2の interval） |
| 次回復習日 | 日付 | 自動 | SM-2で算出された次の復習予定日 |
| 登録日時 | タイムスタンプ | 自動 | 作成時刻 |
| 更新日時 | タイムスタンプ | 自動 | 最終更新時刻 |

### 1.3 入力UI

- **KnowledgeList** ページ（`/knowledge`）に知識一覧 + 新規追加ボタン
- **KnowledgeForm** モーダル/ページで登録・編集
  - タイトル入力（必須、最大255文字）
  - コンテンツ入力（必須、テキストエリア、改行・段落対応）
  - カテゴリ入力（任意、テキスト入力 or 既存候補からの選択）
  - 難易度選択（easy/medium/hard のラジオボタン or セレクト）
  - クイズ同時作成セクション（任意: Q&Aペアを同時登録可能）

### 1.4 一覧画面の表示項目

| 表示項目 | 説明 |
|----------|------|
| タイトル | 知識の名前（クリックで詳細表示） |
| カテゴリ | バッジ or テキスト表示 |
| 難易度 | アイコン or カラーバッジ（🟢easy / 🟡medium / 🔴hard） |
| 定着度 | プログレスバー（0-100%）+ 数値 |
| 次回復習日 | 日付表示（期限超過は赤色ハイライト） |
| クイズ数 | 紐づくクイズの件数 |

### 1.5 フィルタリング

- カテゴリフィルタ（テキスト一致 or 選択式）
- 難易度フィルタ（easy/medium/hard の OR 選択）
- 復習状態フィルタ（「今日復習」「復習不要」「未学習」）
- 既存WishFilterと同じピル型タブUIパターンを踏襲

---

## 2. クイズ生成の仕様

### 2.1 生成方式

- **MVP: 手動作成（Q&A形式）** を基本とする
- AI自動生成（Claude API等）は将来フェーズ（Sprint AR-4）で対応

### 2.2 クイズ形式

| 形式 | 説明 | MVPスコープ |
|------|------|-------------|
| 自由記述 (`free_text`) | 質問に対して自由に回答 → 正解と比較して自己評価 | ✅ MVP |
| 選択式 (`multiple_choice`) | 4択問題（正解1つ + 誤答3つ） | ✅ MVP |
| 穴埋め (`fill_blank`) | 文中の `___` を埋める形式 | 🔜 将来 |

### 2.3 クイズデータ構造

| 属性 | 型 | 必須 | 説明 |
|------|---|------|------|
| 質問 | テキスト(長文) | 必須 | クイズの問題文 |
| 解答 | テキスト(長文) | 必須 | 模範解答 |
| 形式 | 選択 | 必須 | free_text / multiple_choice（デフォルト: free_text） |
| 選択肢 | JSON | 条件付き | multiple_choice時の選択肢（最大4つ） |
| 知識アイテムID | 整数 | 必須 | 紐づく knowledge_item の FK |

### 2.4 クイズ管理

- 1つの知識アイテムに複数クイズを紐づけ可能（1:N）
- 知識アイテム削除時はクイズも CASCADE 削除
- 知識アイテム詳細画面からクイズの追加・編集・削除
- MVP段階での推奨: 1知識あたり1-3問

### 2.5 クイズ入力UI

- **QuizForm** コンポーネント（知識詳細画面内 or モーダル）
  - 質問テキストエリア
  - 解答テキストエリア
  - 形式選択（free_text / multiple_choice）
  - multiple_choice 時: 選択肢4つの入力フィールド + 正解選択

---

## 3. 定期実施の仕様

### 3.1 スケジューリングアルゴリズム: SM-2

SM-2（SuperMemo 2）アルゴリズムを採用し、復習間隔を自動調整する。

#### SM-2 パラメータ

| パラメータ | 初期値 | 説明 |
|-----------|--------|------|
| EF (Easiness Factor) | 2.50 | アイテムの覚えやすさ（1.3〜5.0） |
| repetitions | 0 | 連続正答回数 |
| interval | 0 | 次の復習までの日数 |

#### 品質評価（Quality Rating）

復習後にユーザーが自己評価する（0〜5）:

| 評価 | 意味 | SM-2判定 |
|------|------|----------|
| 0 | 完全に忘れた | 不正解（リセット） |
| 1 | 不正解、答えを見て思い出した | 不正解（リセット） |
| 2 | 不正解、答えは見覚えあり | 不正解（リセット） |
| 3 | 正解、かなり考えた | 正解（継続） |
| 4 | 正解、少し迷った | 正解（継続） |
| 5 | 正解、完璧に思い出せた | 正解（継続） |

#### SM-2 更新ロジック

```
// EF更新（全ケース共通）
EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
if (EF' < 1.3) EF' = 1.3

// q >= 3（正解）の場合
if (repetitions === 0) interval = 1
else if (repetitions === 1) interval = 6
else interval = Math.round(interval * EF')
repetitions++

// q < 3（不正解）の場合
repetitions = 0
interval = 1

// 次回復習日
next_review_date = today + interval
```

### 3.2 実施頻度

- `next_review_date <= today` の知識アイテムが「今日の復習対象」
- 新規登録アイテム（next_review_date = NULL）は即日復習対象
- 1日の復習数上限: 設定なし（MVP）、将来的にユーザー設定可能

### 3.3 配信方法

| 方法 | MVPスコープ | 説明 |
|------|-------------|------|
| ダッシュボード表示 | ✅ MVP | 「今日の復習」ウィジェット（復習待ち件数 + 復習開始ボタン） |
| Discord通知 | 🔜 将来 | Clawdbot経由でリマインダー送信 |
| Google Calendar連携 | 🔜 将来 | 既存の Calendar API を活用した予定登録 |

### 3.4 復習セッションフロー

```
1. ダッシュボード「今日の復習」→ 復習開始ボタン
2. セッション作成（/api/reviews/sessions POST）
3. 対象アイテムからランダム or 順次でクイズ出題
4. ユーザーが回答 → 正解表示
5. ユーザーが品質評価（0-5）を選択
6. SM-2パラメータ更新 + quiz_attempt 記録
7. 次の問題へ（残問題がなくなるまで）
8. セッション完了 → 結果サマリー表示
```

---

## 4. 結果記録の仕様

### 4.1 記録対象

| データ | テーブル | 説明 |
|--------|---------|------|
| 回答記録 | quiz_attempts | 各クイズへの回答（正誤、品質評価、回答時間） |
| セッション記録 | review_sessions | 復習セッション（正答数、スコア、開始・完了時刻） |
| SM-2パラメータ | knowledge_items | EF、repetitions、interval、next_review_date の更新 |

### 4.2 スコアリング方式

- **セッションスコア**: `(correct_count / total_items) * 100`（正答率ベース）
- **アイテム定着度**: 直近の品質評価から算出（最新の quality_rating を 0-100% にスケーリング: `q * 20`）
- MVP では回答速度は考慮しない（`response_time_ms` はデータ記録のみ）

### 4.3 履歴閲覧機能

- **復習履歴ページ**: セッション一覧（日時、問題数、正答率、スコア）
- **アイテム別履歴**: 知識詳細画面で回答履歴を表示
- ページネーション対応（limit/offset）

---

## 5. 定着度測定の仕様

### 5.1 スコア算出ロジック

#### アイテム別定着度（knowledge_items.retention_score）

SM-2 の品質評価とEFを組み合わせて算出:

```
retention_score = (latest_quality_rating / 5) * 100
```

- 未復習アイテム: 0%
- quality = 5: 100%
- quality = 3: 60%
- quality = 0: 0%

#### 全体定着度

```
overall_retention = AVG(all knowledge_items.retention_score for user)
```

### 5.2 忘却曲線への対応

- SM-2 の interval が自動的にエビングハウスの忘却曲線を近似
- 初回復習: 1日後
- 2回目復習: 6日後
- 3回目以降: `interval * EF` で指数的に間隔が拡大
- 不正解時はリセット（interval = 1日）で忘却曲線を再スタート

### 5.3 可視化

| グラフ | 使用ライブラリ | 表示場所 | MVPスコープ |
|--------|--------------|----------|-------------|
| 全体定着度推移（ラインチャート） | Recharts LineChart | 知識一覧ページ | ✅ MVP |
| カテゴリ別定着度（バーチャート） | Recharts BarChart | 知識一覧ページ | 🔜 将来 |
| アイテム別定着度分布（ヒストグラム） | Recharts | 統計ページ | 🔜 将来 |

- 既存の Recharts 環境をそのまま活用（追加パッケージ不要）
- TimeChart.js と同じカスタムツールチップパターンを踏襲

---

## 画面遷移フロー

```
┌──────────────┐
│  Dashboard   │
│ 「今日の復習」 │──────────────────────────────┐
│   ウィジェット │                              │
└──────┬───────┘                              │
       │ サイドバー「📚 学習」                    │ 「復習開始」ボタン
       ▼                                      ▼
┌──────────────┐                     ┌──────────────┐
│ KnowledgeList│                     │ReviewSession │
│  知識一覧     │                     │  復習画面     │
│ フィルタ機能   │                     │ カード式出題   │
│ +定着度グラフ  │                     │ 回答→評価     │
└──────┬───────┘                     └──────┬───────┘
       │ 新規追加 / 詳細                      │ セッション完了
       ▼                                      ▼
┌──────────────┐                     ┌──────────────┐
│KnowledgeForm │                     │ ReviewResult │
│ 知識登録/編集  │                     │  復習結果     │
│ +クイズ同時作成│                     │ スコア/正誤   │
└──────┬───────┘                     └──────────────┘
       │ クイズ管理
       ▼
┌──────────────┐
│  QuizForm    │
│ クイズ追加/編集│
│ Q&A形式       │
└──────────────┘
```

### ルーティング

| パス | コンポーネント | 認証 | 説明 |
|-----|-------------|------|------|
| `/knowledge` | KnowledgeList | 必要 | 知識一覧 + 定着度グラフ |
| `/knowledge/new` | KnowledgeForm | 必要 | 知識新規登録 |
| `/knowledge/:id` | KnowledgeDetail | 必要 | 知識詳細 + クイズ管理 |
| `/knowledge/:id/edit` | KnowledgeForm | 必要 | 知識編集 |
| `/review` | ReviewSession | 必要 | 復習セッション |
| `/review/result/:sessionId` | ReviewResult | 必要 | 復習結果 |

---

## DBテーブル設計

### knowledge_items テーブル

```sql
CREATE TABLE knowledge_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    easiness_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50,
    repetitions INT NOT NULL DEFAULT 0,
    interval_days INT NOT NULL DEFAULT 0,
    next_review_date DATE DEFAULT NULL,
    retention_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_review (user_id, next_review_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### quizzes テーブル

```sql
CREATE TABLE quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    knowledge_item_id INT NOT NULL,
    user_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    quiz_type ENUM('free_text', 'multiple_choice') NOT NULL DEFAULT 'free_text',
    options_json JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_item_id) REFERENCES knowledge_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_knowledge (knowledge_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### review_sessions テーブル

```sql
CREATE TABLE review_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_items INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    score DECIMAL(5,2) DEFAULT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### quiz_attempts テーブル

```sql
CREATE TABLE quiz_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    user_id INT NOT NULL,
    session_id INT DEFAULT NULL,
    user_answer TEXT DEFAULT NULL,
    is_correct BOOLEAN NOT NULL,
    quality_rating TINYINT NOT NULL COMMENT 'SM-2 quality 0-5',
    response_time_ms INT DEFAULT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES review_sessions(id) ON DELETE SET NULL,
    INDEX idx_quiz_user (quiz_id, user_id),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### ER図（テキスト形式）

```
users (1) ──────── (N) knowledge_items
  │                        │
  │                        │ (1:N)
  │                        ▼
  │                    quizzes
  │                        │
  │                        │ (1:N)
  │                        ▼
  │                  quiz_attempts
  │                        │
  │                        │ (N:1)
  │                        ▼
  └──────────────── review_sessions
```

**リレーション要約:**
- users 1:N knowledge_items（ユーザーが知識を登録）
- knowledge_items 1:N quizzes（知識にクイズを紐づけ、CASCADE DELETE）
- quizzes 1:N quiz_attempts（クイズに回答記録、CASCADE DELETE）
- users 1:N review_sessions（ユーザーが復習セッションを作成）
- review_sessions 1:N quiz_attempts（セッションに回答を紐づけ、SET NULL）

---

## API設計

### 知識管理API (`/api/knowledge`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/knowledge` | 必要 | Query: `?category=X&difficulty=Y&status=due\|all\|mastered` | `{items: [...], total: N}` |
| GET | `/api/knowledge/:id` | 必要 | - | `{item: {..., quizzes: [...]}}` |
| POST | `/api/knowledge` | 必要 | `{title, content, category?, difficulty?, quizzes?: [{question, answer, quiz_type?}]}` | `{message, item}` (201) |
| PUT | `/api/knowledge/:id` | 必要 | `{title?, content?, category?, difficulty?}` | `{message, item}` |
| DELETE | `/api/knowledge/:id` | 必要 | - | `{message}` |

- 所有権チェック: 自分のデータのみ操作可能（`user_id = req.session.userId`）
- GET一覧: クイズ数(`quiz_count`)を含めて返却
- POST: `quizzes` 配列を同時送信可能（トランザクション処理）

### クイズ管理API (`/api/knowledge/:knowledgeId/quizzes`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/knowledge/:knowledgeId/quizzes` | 必要 | - | `{quizzes: [...]}` |
| POST | `/api/knowledge/:knowledgeId/quizzes` | 必要 | `{question, answer, quiz_type?, options_json?}` | `{message, quiz}` (201) |
| PUT | `/api/quizzes/:id` | 必要 | `{question?, answer?, quiz_type?, options_json?}` | `{message, quiz}` |
| DELETE | `/api/quizzes/:id` | 必要 | - | `{message}` |

- knowledgeId の所有権チェック後にクイズ操作
- multiple_choice の場合: `options_json` は `{choices: ["A","B","C","D"], correct_index: 0}` 形式

### 復習API (`/api/reviews`)

| Method | Path | 認証 | Request Body | Response |
|--------|------|------|-------------|----------|
| GET | `/api/reviews/today` | 必要 | - | `{items: [{knowledge_item, quizzes}, ...], count: N}` |
| POST | `/api/reviews/sessions` | 必要 | - | `{session: {id, total_items, started_at}}` (201) |
| POST | `/api/reviews/sessions/:sessionId/answer` | 必要 | `{quiz_id, user_answer?, is_correct, quality_rating}` | `{message, attempt, updated_item}` |
| POST | `/api/reviews/sessions/:sessionId/complete` | 必要 | - | `{message, summary: {total, correct, score}}` |
| GET | `/api/reviews/history` | 必要 | Query: `?limit=20&offset=0` | `{sessions: [...], total: N}` |

- `today`: `next_review_date <= CURDATE() OR next_review_date IS NULL` の知識アイテムとクイズを返却
- `answer`: SM-2パラメータを即座に更新（knowledge_items の EF/repetitions/interval/next_review_date/retention_score）
- `complete`: セッションの score を算出して更新

### 統計API (`/api/knowledge/stats`)

| Method | Path | 認証 | Query | Response |
|--------|------|------|-------|----------|
| GET | `/api/knowledge/stats` | 必要 | - | `{total_items, due_today, mastered, learning, not_started, retention_avg}` |
| GET | `/api/knowledge/stats/retention` | 必要 | `?period=7days\|week\|month` | `{data: [{date, avg_retention, items_reviewed}, ...]}` |

- `mastered`: retention_score >= 80 かつ interval_days >= 30 のアイテム数
- `learning`: 1回以上復習済み、mastered未達のアイテム数
- `not_started`: next_review_date IS NULL のアイテム数
- retention 推移: 既存 calendar summary API と同じ全日付埋めパターン

---

## 非機能要件

### パフォーマンス
- 知識一覧API: 100件以下なら50ms以内、ページネーション対応で大量データ対応
- SM-2更新: 1回答あたり20ms以内（単一UPDATE文）
- 今日の復習API: インデックス `idx_user_review` 活用で高速検索

### セキュリティ
- 全API に `requireAuth` ミドルウェア適用
- 所有権チェック: `user_id = req.session.userId` 必須
- パラメータ化クエリ（SQLインジェクション防止）
- XSS対策: フロントエンドでのコンテンツエスケープ

### データ整合性
- 知識アイテム削除時: quizzes → quiz_attempts の CASCADE DELETE
- セッション削除時: quiz_attempts.session_id を SET NULL（回答履歴は保持）
- SM-2更新: トランザクション内で EF/interval/next_review_date を一括更新

---

## 将来拡張（MVPスコープ外）

| 機能 | 対象フェーズ | 説明 |
|------|------------|------|
| AI クイズ自動生成 | Sprint AR-4 | Claude APIで知識コンテンツからクイズを自動生成 |
| 穴埋め形式 | Sprint AR-4 | `fill_blank` クイズタイプの追加 |
| Discord通知 | Sprint AR-5 | Clawdbot経由の復習リマインダー |
| Google Calendar連携 | Sprint AR-5 | 復習予定をカレンダーに自動登録 |
| 知識タグ機能 | 将来 | 既存tagsシステムとの統合（knowledge_tags中間テーブル） |
| インポート/エクスポート | 将来 | CSV/Markdown形式でのデータ入出力 |
| Notion連携 | 将来 | Notion APIを使った知識同期 |
| 画像添付 | 将来 | 既存wish_images パターンを流用した知識への画像添付 |

---

## 関連ドキュメント

- [Reflexio 要件定義書](./01_reflexio_requirement.md)
- [ActiveRecall アーキテクチャ設計](../02_design/01_active_recall_architecture.md)
- [ActiveRecall 実装ロードマップ](../../01_agile/01_sprint_planning/sprint_active_recall_roadmap.md)
