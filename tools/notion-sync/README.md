# Reflexio Notion Sync Tool

Clawdbot（あおい）が進捗報告を複数の Notion Database/Page に一括記録するための CLI ツールです。

## 概要

| 項目 | 内容 |
|------|------|
| 実行方法 | CLI（`node cli.js <command>`） |
| コマンド数 | 4（sync, batch, upsert, templates） |
| 必要環境 | Node.js 18+ |
| Notion API | @notionhq/client v2 |
| レート制限 | 3 req/sec 自動調整 + リトライ |

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd tools/notion-sync
npm install
```

### 2. 環境変数の設定

```bash
export NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Notion Integration の接続

対象の Database で「...」→「接続先」から Integration を追加してください。
（詳細は `tools/notion-mcp/README.md` を参照）

## コマンド

### sync — テンプレートでページ作成

テンプレートファイルを使って Notion Database にページを作成します。

```bash
node cli.js sync --template agent_report \
  --var database_id=abc123 \
  --var agent=PL \
  --var status=completed \
  --var summary="Sprint 9 完了"
```

### batch — バッチ実行

YAML/JSON ジョブファイルで複数操作を一括実行します。

```bash
node cli.js batch --file jobs/daily_report.yaml
```

**ジョブファイル例（YAML）:**

```yaml
jobs:
  - template: agent_report
    variables:
      database_id: "abc123..."
      agent: "DEV1"
      status: "完了"
      summary: "Notion MCP サーバー実装完了"

  - template: agent_report
    variables:
      database_id: "abc123..."
      agent: "DEV2"
      status: "完了"
      summary: "Dashboard ビューア構築完了"

  - action: append
    page_id: "page-id-xxx..."
    content: "追加の進捗メモ"
```

### upsert — 条件付き更新

既存ページを検索して見つかったら更新、なければ新規作成します。

```bash
# 日付で検索して更新 or 作成
node cli.js upsert --db abc123 \
  --filter-property Date --filter-value 2026-02-25 \
  --template status_update \
  --var status=working \
  --var agent=Clawdbot
```

### templates — テンプレート一覧

利用可能なテンプレートと変数を表示します。

```bash
node cli.js templates
```

## テンプレート

### agent_report（エージェント進捗報告）

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `database_id` | Yes | - | 対象 Database ID |
| `agent` | Yes | - | エージェント名 |
| `date` | No | today | 日付 |
| `status` | No | 完了 | ステータス |
| `summary` | Yes | - | 完了内容サマリー |
| `details` | No | (空) | 詳細情報 |

### status_update（ステータス更新）

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `database_id` | Yes | - | 対象 Database ID |
| `title` | No | ステータス更新 | ページタイトル |
| `agent` | No | Clawdbot | 更新者名 |
| `status` | Yes | - | 新しいステータス |
| `date` | No | today | 日付 |
| `memo` | No | (空) | 追加メモ |

### sprint_summary（スプリント完了サマリー）

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `database_id` | Yes | - | 対象 Database ID |
| `sprint_number` | Yes | - | スプリント番号 |
| `date` | No | today | 完了日 |
| `summary` | Yes | - | スプリント概要 |
| `completed_tasks` | No | - | 完了タスク一覧 |
| `agents` | No | 全員 | 参加エージェント |
| `next_sprint` | No | 未定 | 次スプリント予定 |
| `blockers` | No | なし | 課題・ブロッカー |

## カスタムテンプレートの作成

`templates/` ディレクトリに YAML ファイルを追加します。

```yaml
name: my_template
description: カスタムテンプレートの説明
database_id: "{{database_id}}"
title: "{{title}} - {{date}}"
properties:
  Status:
    select:
      name: "{{status}}"
content: |
  本文テキスト
  {{variable}} で変数展開
variables:
  - name: database_id
    required: true
    description: "Database ID"
  - name: title
    required: true
    description: "タイトル"
  - name: date
    required: false
    default: "today"
    description: "日付"
```

## レート制限

- Notion API の制限: 3 req/sec
- 自動レート制限: リクエスト間隔 ~340ms に自動調整
- 429 レスポンス時: 自動リトライ（指数バックオフ: 1s → 2s → 4s）
- サーバーエラー (5xx): 同様に自動リトライ（最大3回）

## ログ

全操作は `logs/sync.log` に記録されます。

```
[2026-02-25T09:00:00.000Z] [INFO] テンプレート sync 開始: "agent_report"
[2026-02-25T09:00:00.340Z] [INFO] ページ作成: "PL 報告 - 2026-02-25" → DB abc12345...
[2026-02-25T09:00:01.200Z] [INFO] ページ作成完了: page-id-xxx
[2026-02-25T09:00:01.200Z] [WARN] レート制限 (429)。1000ms 後にリトライ (1/3)
[2026-02-25T09:00:02.500Z] [ERROR] batch 失敗: APIキーが無効です
```

## トラブルシューティング

### NOTION_API_KEY 未設定

```
エラー: NOTION_API_KEY 環境変数が設定されていません。
```

→ `export NOTION_API_KEY="secret_xxx..."` を実行してください。

### テンプレートが見つからない

```
エラー: テンプレート "xxx" が見つかりません
```

→ `templates/` ディレクトリにファイルがあるか確認。`node cli.js templates` で一覧表示。

### 必須変数が不足

```
エラー: 必須変数 "{{database_id}}" が指定されていません
```

→ `--var database_id=xxx` を追加してください。

## ライセンス

Reflexio プロジェクト内部利用
