# 01. ActiveRecall機能 アーキテクチャ設計

## 概要

本ドキュメントは、ActiveRecall機能のアーキテクチャ設計を定義する。
既存Reflexioアーキテクチャ（React + Express + MySQL + Docker）との統合を前提に設計する。

---

## 1. システム全体構成

### 1.1 レイヤー構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌───────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │Knowledge  │ │KnowledgeForm│ │ReviewSession │ │ReviewResult│  │
│  │List       │ │+ QuizForm  │ │              │ │            │  │
│  └─────┬─────┘ └─────┬──────┘ └──────┬───────┘ └─────┬──────┘  │
│        │             │               │               │          │
│  ┌─────┴─────────────┴───────────────┴───────────────┴──────┐   │
│  │              RetentionChart (Recharts)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│        │                                                        │
│  ┌─────┴──────────────────────────────────────────────────┐     │
│  │          API Layer (fetch + credentials: 'include')     │     │
│  └─────────────────────────┬──────────────────────────────┘     │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTP (localhost:3002)
┌────────────────────────────┼────────────────────────────────────┐
│                        Backend (Express)                        │
│  ┌─────────────────────────┴──────────────────────────────┐     │
│  │                   server.js (Routes)                    │     │
│  │  /api/knowledge  /api/quizzes  /api/reviews  /api/...  │     │
│  └────┬──────────────────┬────────────────────┬───────────┘     │
│       │                  │                    │                  │
│  ┌────┴────┐      ┌──────┴──────┐     ┌──────┴──────┐          │
│  │knowledge│      │   quizzes   │     │  reviews    │          │
│  │.js      │      │   .js       │     │  .js        │          │
│  └────┬────┘      └──────┬──────┘     └──────┬──────┘          │
│       │                  │                    │                  │
│  ┌────┴──────────────────┴────────────────────┴───────────┐     │
│  │              SM-2 Engine (sm2.js)                       │     │
│  │  calculateNextReview(ef, repetitions, interval, q)      │     │
│  └────────────────────────┬───────────────────────────────┘     │
│       │                   │                                     │
│  ┌────┴──────┐     ┌──────┴──────┐                              │
│  │requireAuth│     │database.js  │                              │
│  │middleware │     │(mysql2 pool)│                              │
│  └───────────┘     └──────┬──────┘                              │
└────────────────────────────┼────────────────────────────────────┘
                             │ TCP (port 3306)
┌────────────────────────────┼────────────────────────────────────┐
│                      MySQL 8.0 (Docker)                         │
│  ┌──────────────┐ ┌────────┐ ┌────────────────┐ ┌────────────┐ │
│  │knowledge_items│ │quizzes │ │review_sessions │ │quiz_attempts│ │
│  └──────────────┘ └────────┘ └────────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 新規追加コンポーネント一覧

| レイヤー | ファイル | 役割 |
|---------|---------|------|
| **Backend** | `backend/routes/knowledge.js` | 知識アイテム CRUD API |
| **Backend** | `backend/routes/quizzes.js` | クイズ CRUD API |
| **Backend** | `backend/routes/reviews.js` | 復習セッション API + SM-2更新 |
| **Backend** | `backend/lib/sm2.js` | SM-2アルゴリズム純粋関数 |
| **DB** | `docker/mysql/init/011_create_knowledge_items_table.sql` | knowledge_items テーブル |
| **DB** | `docker/mysql/init/012_create_quizzes_table.sql` | quizzes テーブル |
| **DB** | `docker/mysql/init/013_create_review_sessions_table.sql` | review_sessions テーブル |
| **DB** | `docker/mysql/init/014_create_quiz_attempts_table.sql` | quiz_attempts テーブル |
| **Frontend** | `frontend/src/components/KnowledgeList.js` | 知識一覧ページ |
| **Frontend** | `frontend/src/components/KnowledgeList.css` | 知識一覧スタイル |
| **Frontend** | `frontend/src/components/KnowledgeForm.js` | 知識登録・編集フォーム |
| **Frontend** | `frontend/src/components/KnowledgeForm.css` | 知識フォームスタイル |
| **Frontend** | `frontend/src/components/KnowledgeDetail.js` | 知識詳細 + クイズ管理 |
| **Frontend** | `frontend/src/components/KnowledgeDetail.css` | 知識詳細スタイル |
| **Frontend** | `frontend/src/components/QuizForm.js` | クイズ追加・編集フォーム |
| **Frontend** | `frontend/src/components/QuizForm.css` | クイズフォームスタイル |
| **Frontend** | `frontend/src/components/ReviewSession.js` | 復習セッション画面 |
| **Frontend** | `frontend/src/components/ReviewSession.css` | 復習セッションスタイル |
| **Frontend** | `frontend/src/components/ReviewResult.js` | 復習結果画面 |
| **Frontend** | `frontend/src/components/ReviewResult.css` | 復習結果スタイル |
| **Frontend** | `frontend/src/components/RetentionChart.js` | 定着度グラフ（Recharts） |
| **Frontend** | `frontend/src/components/RetentionChart.css` | 定着度グラフスタイル |

### 1.3 既存ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| `backend/server.js` | knowledge/quizzes/reviews ルート登録 |
| `frontend/src/App.js` | `/knowledge`, `/review` 等のルート追加 |
| `frontend/src/components/Sidebar.js` | 「📚 学習」「🔄 復習」メニュー追加 |
| `frontend/src/components/Dashboard.js` | 「今日の復習」ウィジェット追加 |
| `frontend/src/components/Dashboard.css` | 復習ウィジェットスタイル追加 |

---

## 2. 既存Reflexioアーキテクチャとの統合方針

### 2.1 統合原則

ActiveRecall機能は **既存パターンを100%踏襲** し、新たな技術やライブラリを導入しない（MVP段階）。

| 観点 | 既存パターン | ActiveRecallでの適用 |
|------|------------|---------------------|
| 認証 | `requireAuth` ミドルウェア | 全APIに適用 |
| 所有権チェック | `user_id = req.session.userId` | 全CRUD操作に適用 |
| DB操作 | `mysql2/promise` パラメータ化クエリ | 全SQL操作に適用 |
| フロントエンドパターン | 関数コンポーネント + Hooks | 全新規コンポーネントに適用 |
| CSS | コンポーネント別CSS（非Modules） | 全新規コンポーネントに適用 |
| API呼び出し | `fetch` + `credentials: 'include'` | 全API呼び出しに適用 |
| トースト通知 | `useToast` フック | 成功/エラー通知に使用 |
| ルーティング | react-router-dom v6 `<Route>` | 新ルート追加に使用 |
| チャート | Recharts | 定着度グラフに使用（追加パッケージ不要） |

### 2.2 サイドバー統合

既存の `menuItems` 配列に2エントリ追加:

```javascript
// Sidebar.js menuItems への追加
{ path: '/knowledge', label: '📚 学習', icon: '📚' },
{ path: '/review', label: '🔄 復習', icon: '🔄' },
```

配置位置: 「やりたいこと」と「⚙️ 設定」の間

### 2.3 ダッシュボード統合

Dashboard.js の既存カード型ウィジェットレイアウトに「今日の復習」カードを追加:

```
┌─────────────────────────────────────┐
│ Dashboard                           │
│ ┌─────────────┐ ┌─────────────────┐ │
│ │ 時間の使い方 │ │ 今日の復習       │ │
│ │ (TimeChart)  │ │ 復習待ち: N件    │ │
│ │              │ │ 全体定着度: X%   │ │
│ │              │ │ [復習を始める]   │ │
│ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
```

- 復習ウィジェットの表示条件: 知識アイテムが1件以上登録済みの場合のみ表示
- 「復習を始める」ボタン: `/review` へ遷移

### 2.4 Dockerとの統合

- 新テーブルのSQL: `docker/mysql/init/` に `011_` 〜 `014_` で追加
- 番号体系: 既存 `010_create_wish_images_table.sql` の次番号から連番
- 追加パッケージ: なし（既存環境で完結）
- `docker compose down -v && docker compose up --build` で初期化

---

## 3. SM-2エンジン設計

### 3.1 モジュール構成

SM-2アルゴリズムは **純粋関数** として `backend/lib/sm2.js` に分離。
ルートファイルからインポートして使用する。

```javascript
// backend/lib/sm2.js

/**
 * SM-2アルゴリズムに基づく次回復習パラメータの計算
 * @param {number} easinessFactor - 現在のEF値（1.3〜5.0）
 * @param {number} repetitions - 現在の連続正答回数
 * @param {number} intervalDays - 現在の復習間隔（日）
 * @param {number} qualityRating - 今回の品質評価（0〜5）
 * @returns {Object} { easinessFactor, repetitions, intervalDays, nextReviewDate }
 */
function calculateNextReview(easinessFactor, repetitions, intervalDays, qualityRating) {
    // EF更新
    let newEF = easinessFactor + (0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02));
    if (newEF < 1.3) newEF = 1.3;

    let newRepetitions, newInterval;

    if (qualityRating >= 3) {
        // 正解
        if (repetitions === 0) {
            newInterval = 1;
        } else if (repetitions === 1) {
            newInterval = 6;
        } else {
            newInterval = Math.round(intervalDays * newEF);
        }
        newRepetitions = repetitions + 1;
    } else {
        // 不正解
        newRepetitions = 0;
        newInterval = 1;
    }

    // 次回復習日
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        easinessFactor: Math.round(newEF * 100) / 100,
        repetitions: newRepetitions,
        intervalDays: newInterval,
        nextReviewDate: nextReviewDate.toISOString().split('T')[0] // YYYY-MM-DD
    };
}

module.exports = { calculateNextReview };
```

### 3.2 テスト容易性

純粋関数として分離することで:
- 入力→出力のユニットテストが容易
- DBやHTTPに依存しない
- SM-2ロジックの変更が他のコードに影響しない

### 3.3 SM-2の適用フロー

```
[ユーザーが回答] → [品質評価(0-5)選択]
        │
        ▼
reviews.js (POST /sessions/:id/answer)
        │
        ├── quiz_attempts に INSERT
        │
        ├── sm2.calculateNextReview(EF, reps, interval, q)
        │
        ├── knowledge_items を UPDATE
        │   (easiness_factor, repetitions, interval_days,
        │    next_review_date, retention_score)
        │
        └── レスポンス返却 (updated_item 含む)
```

---

## 4. データフロー設計

### 4.1 知識登録フロー

```
[KnowledgeForm] ── POST /api/knowledge ──→ [knowledge.js]
                   {title, content,           │
                    category, difficulty,      ├── INSERT knowledge_items
                    quizzes: [{Q, A}]}         ├── INSERT quizzes (if any)
                                               └── 201 {item}
```

### 4.2 復習セッションフロー

```
[Dashboard「今日の復習」] ── クリック ──→ [ReviewSession]
                                           │
[ReviewSession] ── GET /api/reviews/today ──→ [reviews.js]
                                               │
                   ◀── {items, count} ──────────┘
                                               (next_review_date <= today
                                                の知識+クイズ一覧)
                   │
                   ├── POST /api/reviews/sessions ──→ セッション作成
                   │
                   │   [クイズ表示 → 回答 → 正解表示 → 評価選択]
                   │         │
                   │         ├── POST /sessions/:id/answer
                   │         │   {quiz_id, user_answer, is_correct, quality_rating}
                   │         │         │
                   │         │         ├── INSERT quiz_attempts
                   │         │         ├── SM-2 計算
                   │         │         └── UPDATE knowledge_items
                   │         │
                   │         └── (繰り返し)
                   │
                   ├── POST /sessions/:id/complete ──→ スコア算出
                   │
                   └── [ReviewResult 表示]
```

### 4.3 統計・可視化フロー

```
[KnowledgeList] ── GET /api/knowledge/stats ──→ [knowledge.js]
                                                  │
                   ◀── {total, due_today,  ────────┘
                        mastered, learning,
                        retention_avg}

[RetentionChart] ── GET /api/knowledge/stats/retention ──→
                    ?period=7days                           │
                                                           │
                   ◀── {data: [{date, avg_retention,  ─────┘
                                items_reviewed}]}
```

---

## 5. フロントエンド コンポーネント設計

### 5.1 コンポーネントツリー

```
App.js
├── Dashboard.js
│   ├── TimeChart.js (既存)
│   └── ReviewWidget.js (新規: 今日の復習カード)
│
├── KnowledgeList.js
│   ├── KnowledgeFilter.js (フィルタUI)
│   └── RetentionChart.js (定着度グラフ)
│
├── KnowledgeForm.js
│   └── QuizForm.js (クイズ同時作成)
│
├── KnowledgeDetail.js
│   ├── QuizForm.js (クイズ追加)
│   └── QuizList.js (クイズ一覧)
│
├── ReviewSession.js
│   ├── QuizCard.js (フラッシュカード)
│   └── QualityRating.js (SM-2品質評価UI)
│
└── ReviewResult.js
    └── SessionSummary.js (結果サマリー)
```

### 5.2 状態管理方針

既存パターンと同じく `useState` / `useEffect` を使用。Redux等は導入しない。

| コンポーネント | 主要State |
|--------------|----------|
| KnowledgeList | `items`, `filter`, `stats`, `loading` |
| KnowledgeForm | `formData`, `quizzes`, `errors`, `submitting` |
| ReviewSession | `session`, `currentIndex`, `items`, `answers`, `phase` (question/answer/rating) |
| ReviewResult | `summary`, `attempts` |
| RetentionChart | `data`, `period`, `loading` |

### 5.3 ReviewSession の画面遷移（内部状態）

```
[phase: 'question']       [phase: 'answer']        [phase: 'rating']
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│ Q: 問題文     │ ──回答──→ │ A: 正解表示   │ ──次へ──→ │ 品質評価     │
│              │          │ ユーザー回答   │          │ 0 1 2 3 4 5  │
│ [回答を表示]  │          │ 正誤判定      │          │ [次の問題]   │
└──────────────┘          └──────────────┘          └──────┬───────┘
                                                          │
                                                    POST /answer
                                                          │
                                            ┌─────────────┴──────────┐
                                            │ 残問題あり   │ 全完了    │
                                            ▼             ▼          │
                                     [phase: 'question'] POST /complete
                                                          │
                                                    [ReviewResult]
```

### 5.4 UIデザインパターン

既存Reflexioのデザインパターンを踏襲:

| パターン | 適用箇所 | 参考コンポーネント |
|---------|---------|----------------|
| ピル型フィルタ | KnowledgeFilter | WishFilter |
| カード型ウィジェット | ReviewWidget (Dashboard) | Dashboard カード |
| トースト通知 | CRUD操作成功/失敗 | Toast + useToast |
| モーダル | KnowledgeForm (新規時) | ImageModal / SkillModal |
| 5状態分岐 | ReviewSession | Dashboard (TimeChart) |
| プログレスバー | 定着度表示 | 新規（CSS実装） |
| フラッシュカード | QuizCard | 新規（カード反転アニメーション） |

---

## 6. 外部API利用方針

### 6.1 MVP段階（Sprint AR-1 〜 AR-3）

**外部APIは使用しない。** 全機能をReflexio内で完結させる。

| 機能 | 実装方式 | 理由 |
|------|---------|------|
| クイズ作成 | 手動入力 | シンプル、外部依存なし |
| スケジューリング | SM-2（自前実装） | 標準アルゴリズム、外部依存なし |
| 定着度計算 | 自前計算 | SM-2の品質評価から算出 |

### 6.2 将来フェーズ（Sprint AR-4）: Claude API連携

| 項目 | 方針 |
|------|------|
| 目的 | 知識コンテンツからクイズを自動生成 |
| API | Anthropic Messages API (Claude 3.5 Sonnet 推奨) |
| 認証 | API Key（環境変数 `ANTHROPIC_API_KEY` で管理） |
| 呼び出し | バックエンド側からのみ呼び出し（APIキーをフロントに露出させない） |
| レート制限 | 1ユーザーあたり1日10回程度の生成上限 |
| エラーハンドリング | API障害時はフォールバック（手動作成への案内） |
| コスト管理 | 1回のクイズ生成で使用するトークン数を記録・制限 |

#### Claude APIリクエスト例（将来設計）

```javascript
// backend/lib/quizGenerator.js（将来実装）
const prompt = `
以下の知識コンテンツからクイズを3問生成してください。
形式: JSON配列 [{question, answer, quiz_type: "free_text"}]

知識コンテンツ:
${knowledgeContent}
`;
```

#### アーキテクチャ図（将来）

```
[Frontend] → POST /api/knowledge/:id/generate-quizzes → [Backend]
                                                            │
                                                    [quizGenerator.js]
                                                            │
                                                    Anthropic API
                                                    (Messages API)
                                                            │
                                                    ◀── JSON (quizzes)
                                                            │
                                                    INSERT quizzes
                                                            │
                                                    ◀── 201 {quizzes}
```

### 6.3 将来フェーズ（Sprint AR-5）: 外部通知連携

| 連携先 | 方式 | 説明 |
|--------|------|------|
| Discord | Clawdbot Webhook | 復習リマインダーをDiscordチャンネルに通知 |
| Google Calendar | 既存 Calendar API拡張 | 復習予定をカレンダーイベントとして登録 |

---

## 7. セキュリティ設計

### 7.1 認証・認可

```
[Client] ── Cookie (session_id) ──→ [Express]
                                       │
                                  requireAuth middleware
                                       │
                                  req.session.userId
                                       │
                                  全SQL: WHERE user_id = ?
```

- 既存の `requireAuth` ミドルウェアをそのまま使用
- 全テーブルに `user_id` カラム → ユーザー間のデータ分離を保証
- CASCADE DELETE: ユーザー削除時に関連データを全自動削除

### 7.2 入力バリデーション

| 入力 | バリデーション |
|------|-------------|
| title | 必須、VARCHAR(255)上限 |
| content | 必須、TEXT型（上限なし） |
| category | 任意、VARCHAR(100)上限 |
| difficulty | ENUM('easy','medium','hard') チェック |
| quality_rating | 0〜5 の整数チェック |
| quiz_type | ENUM('free_text','multiple_choice') チェック |
| options_json | multiple_choice時のみ必須、JSON形式チェック |

---

## 8. パフォーマンス設計

### 8.1 インデックス戦略

| テーブル | インデックス | 用途 |
|---------|-----------|------|
| knowledge_items | `(user_id, next_review_date)` | 今日の復習対象検索 |
| quizzes | `(knowledge_item_id)` | 知識別クイズ取得 |
| quiz_attempts | `(quiz_id, user_id)` | クイズ別回答履歴 |
| quiz_attempts | `(session_id)` | セッション別回答取得 |
| review_sessions | `(user_id, started_at)` | ユーザー別セッション履歴 |

### 8.2 N+1問題回避

- 知識一覧取得時: `LEFT JOIN` でクイズ数をサブクエリ取得
- 今日の復習取得時: knowledge_items + quizzes を JOIN で一括取得
- セッション結果取得時: quiz_attempts + quizzes を JOIN で一括取得

```sql
-- 例: 知識一覧（クイズ数含む）
SELECT ki.*,
       (SELECT COUNT(*) FROM quizzes q WHERE q.knowledge_item_id = ki.id) as quiz_count
FROM knowledge_items ki
WHERE ki.user_id = ?
ORDER BY ki.next_review_date ASC;
```

### 8.3 トランザクション設計

| 操作 | トランザクション範囲 |
|------|-------------------|
| 知識+クイズ同時作成 | INSERT knowledge_items → INSERT quizzes (複数) |
| 復習回答記録 | INSERT quiz_attempt → UPDATE knowledge_items (SM-2) |
| セッション完了 | UPDATE review_sessions (score) |
| 知識削除 | CASCADE DELETE (DB側で自動) |

---

## 関連ドキュメント

- [ActiveRecall 機能要件書](../01_requirement/02_active_recall_requirement.md)
- [ActiveRecall 実装ロードマップ](../../01_agile/01_sprint_planning/sprint_active_recall_roadmap.md)
- [Reflexio プロジェクトガイド](../../project-guide.md)
