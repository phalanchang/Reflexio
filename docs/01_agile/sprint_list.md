# スプリント一覧

**最終更新**: 2026-03-05 (Sprint 9d 完了反映)

## プロジェクト概要

Reflexioは個人の生活管理Webアプリ（React + Express + MySQL + Docker）。
アジャイル方式で段階的に機能を追加している。

---

## 完了済みスプリント

| 番号 | スプリント名 | 主な成果物 | 詳細ファイル | 状態 |
|------|-------------|-----------|-------------|------|
| 01 | 認証機能と基本レイアウト | ログイン/ログアウト、ヘッダー(40px)、サイドバー(250px)、メインレイアウト | [01_sprint_01_planning.md](./01_sprint_planning/01_sprint_01_planning.md) | ✅ 完了 |
| 02 | 「やりたいこと」管理 基盤構築 | wishes テーブル、REST API (CRUD)、一覧/追加/編集/削除UI | [02_sprint_02_planning.md](./01_sprint_planning/02_sprint_02_planning.md) | ✅ 完了 |
| 03 | タグ + フィルタリング | tags/wish_tags テーブル（多対多）、タグ自動作成、フィルタリング（タグOR/優先度OR/組合せAND） | - | ✅ 完了 |
| 04a | Google カレンダー連携 | Google OAuth基盤、google_tokens テーブル、/api/google/*, /api/calendar/* | - | ✅ 完了 |
| 04b | ダッシュボード棒グラフ | Recharts 積み上げ棒グラフ（TimeChart）、期間切替UI（7日/週/月）、5状態分岐 | - | ✅ 完了 |
| 05 | ユーザーごとの Google OAuth 設定 | google_oauth_settings テーブル、Settings画面、createOAuth2Client ユーザー設定優先 | - | ✅ 完了 |
| 06 | カテゴリ分類機能 | category_mappings テーブル、イベント色→カテゴリ名マッピング、Settings カテゴリ設定UI | - | ✅ 完了 |
| 07 | 画像貼り付け機能 | wish_images テーブル、multer アップロード（5MB/5枚上限）、Ctrl+V ペースト、全画面モーダル | - | ✅ 完了 |
| - | バグ対応 + トースト通知 | requireAuth 日本語化、リクエストログ強化、Toast.js（右上固定/自動消去/複数スタック） | - | ✅ 完了 |
| 08 | Clawdbot Skills Display | ClawdbotSkills/SkillBadge/SkillModal コンポーネント、D&D並替、PNG バッジ、3カテゴリ | - | ✅ 完了 |
| 9a | やりたいこと画面 UI改善 | テーブルビュー（情報密度3倍）、全幅レイアウト、サイドバー折りたたみ、期限視覚強調（5段階色分け） | - | ✅ 完了 |
| 9b | ダークモード + トグル改善 | CSS変数73+定義、🌙/☀️テーマ切替、OS設定自動検出、全10 CSSファイル変数化、トグル24x24px化 | - | ✅ 完了 |
| 9c | サマリーバー + 統合ツールバー | ステータス別件数サマリー（クリックフィルタ）、テキスト検索（デバウンス300ms）、6種ソート（localStorage永続化） | - | ✅ 完了 |
| 9d | コンテキストメニュー + 一括操作 + キーボードショートカット | ⋯ドロップダウン（ActionMenu）、チェックボックス+フローティングバー一括操作、9キーショートカット+ヘルプモーダル | [09d](./01_sprint_planning/09d_sprint_09d_planning.md) | ✅ 完了 |

### テスト結果サマリー（Sprint 9）

| スプリント | テスト項目数 | PASS | FAIL | レビュー結果 |
|-----------|------------|------|------|-------------|
| 9a | 52 | 52 | 0 | APPROVE (SHOULD 1件) |
| 9b | 66 | 66 | 0 | APPROVE (SHOULD 1件) |
| 9c | 65 | 65 | 0 | APPROVE (指摘なし・NICE 3件) |
| 9d | 76 | 76 | 0 | APPROVE (SHOULD 2件修正済み・NICE 3件) |

---

## 計画中・未着手スプリント

### ActiveRecall シリーズ（学習支援機能）

**ステータス**: 設計完了・未着手
**ロードマップ**: [sprint_active_recall_roadmap.md](./01_sprint_planning/sprint_active_recall_roadmap.md)
**要件書**: [02_active_recall_requirement.md](../02_waterfall/01_requirement/02_active_recall_requirement.md)

| 番号 | スプリント名 | 内容 | MVP | 状態 |
|------|-------------|------|-----|------|
| AR-1 | 知識登録 + クイズCRUD | knowledge_items/quizzes テーブル、CRUD API、一覧/登録/詳細UI | ✅ | 未着手 |
| AR-2 | 復習セッション + SM-2 | SM-2アルゴリズム、フラッシュカード復習UI、セッション記録 | ✅ | 未着手 |
| AR-3 | ダッシュボード統合 + 定着度チャート | Stats API、RetentionChart（Recharts LineChart）、復習ウィジェット | ✅ | 未着手 |
| AR-4 | AI クイズ自動生成 | Claude API連携、穴埋め形式追加、レート制限 | - | 将来 |
| AR-5 | 外部通知連携 | Discord/Calendar 復習リマインダー | - | 将来 |

### 要件定義済み・未計画の機能

以下は要件定義書に記載されているが、まだスプリント計画が立てられていない機能:

| 機能 | 要件定義書での優先順位 | 備考 |
|------|---------------------|------|
| タスク管理 | 3 | タスクCRUD、優先度、期日、プロジェクト分類 |
| ノート管理 | 4 | CRUD、カテゴリ/タグ、検索、マークダウン対応 |
| 家計簿 | 5 | 収支記録、カテゴリ管理、月次/年次集計、グラフ |

---

## 全体進捗

```
完了済み: Sprint 1 〜 9d（14スプリント）
設計済み: ActiveRecall AR-1 〜 AR-3（MVP）
将来:     ActiveRecall AR-4 〜 AR-5、タスク管理、ノート管理、家計簿
```

### 機能別実装状況

| 機能カテゴリ | 完了 | 進行中 | 未着手 |
|------------|------|--------|--------|
| 認証・基盤 | ✅ ログイン/ログアウト/セッション管理 | - | - |
| やりたいこと管理 | ✅ CRUD + タグ + フィルタ + 画像 + テーブルビュー + ダークモード + サマリーバー + 検索/ソート + コンテキストメニュー + 一括操作 + キーボードショートカット | - | - |
| Google連携 | ✅ OAuth + カレンダー + カテゴリ分類 | - | - |
| ダッシュボード | ✅ TimeChart 棒グラフ + 期間切替 | - | 復習ウィジェット(AR-3) |
| Settings | ✅ OAuth設定 + カテゴリ設定 | - | 通知設定(AR-5) |
| Clawdbot Skills | ✅ バッジ表示 + D&D + モーダル | - | - |
| UI/UX共通 | ✅ トースト通知 + ダークモード + 折りたたみサイドバー | - | - |
| ActiveRecall | - | - | AR-1〜AR-5 全て未着手 |
| タスク管理 | - | - | 未計画 |
| ノート管理 | - | - | 未計画 |
| 家計簿 | - | - | 未計画 |

---

## 関連ドキュメント

- [要件定義書](../02_waterfall/01_requirement/01_reflexio_requirement.md) - 全体の機能要件
- [ペルソナ定義](../02_waterfall/02_design/01_persona.md) - UI改善の基盤
- [UI改善設計書](../02_waterfall/02_design/02_wishlist_ui_redesign.md) - Sprint 9a/9b/9c の設計
- [ActiveRecall ロードマップ](./01_sprint_planning/sprint_active_recall_roadmap.md) - 学習支援機能の計画
- [CLAUDE.md](../../CLAUDE.md) - 技術詳細・開発ルール
