# 共通通信プロトコル

## あなたの環境
- プロジェクトルート: /mnt/c/code/20251124_Reflexio
- メッセージディレクトリ: .agent/messages/
- ボードファイル: .agent/board.md
- ダッシュボード: .agent/dashboard.md
- 設定ファイル: .agent/config.yaml
- 開発ドキュメント: CLAUDE.md および docs/project-guide.md を参照

## 通信プロトコル

### メッセージの受信
1. 「[MESSAGE] {メッセージID} を読んでください」という通知を受け取ったら、**必ず** `.agent/messages/{メッセージID}.yaml` ファイルを Read ツールで読み込む
2. YAML ファイルの内容を理解し、タスクに取り掛かる
3. YAML ファイルの `status` を `read` に更新する
4. 作業開始時に `status` を `in_progress` に更新する
5. 作業完了時に `status` を `completed` に更新する

### メッセージの送信
1. `.agent/messages/{自分のID}_to_{相手のID}_{連番3桁}.yaml` を作成する
2. 連番は、既存のファイルを Glob ツールで確認して次の番号を使う（例: 001, 002, 003...）
3. 以下の YAML フォーマットに従って内容を記述する
4. `.agent/board.md` の末尾にメッセージ情報を1行追加する

### board.md への追記フォーマット
テーブルの末尾に以下の形式で1行追加:
```
| {timestamp} | {id} | {from} | {to} | {type} | {subject} | unread |
```

### YAML メッセージフォーマット
```yaml
---
id: "{FROM}_to_{TO}_{NNN}"
from: "{FROM}"
to: "{TO}"
timestamp: "{ISO8601形式}"
type: "{task|question|response|review_request|review_result|test_request|test_result|doc_update|status_update|completion}"
priority: "{low|medium|high|critical}"
subject: "件名"
content: |
  本文（マークダウン形式可）
status: "unread"
parent_message_id: ""
related_files: []
```

### ダッシュボード更新（.agent/dashboard.md）
ステータスが変わるタイミングで、**必ず** `.agent/dashboard.md` の自分の行を更新すること:

1. **タスク受信時**: ステータスを `working` に変更し、現在のタスク・メッセージIDを記入
2. **ブロック時（質問送信時）**: ステータスを `blocked` に変更
3. **タスク完了時**: ステータスを `idle` に戻し、タスク欄を `-` にリセット。完了タスク履歴テーブルの末尾に1行追加
4. **最終更新**: 変更するたびにその行の「最終更新」列を現在時刻にする
5. **ダッシュボードのヘッダー行「最終更新」** も現在時刻に更新する

更新対象の行は自分のIDの行のみ。他のエージェントの行は編集しないこと。

### あおいさんへの進捗報告（.agent/reports/）

重要な区切り（タスク完了、レビュー完了、テスト完了等）のタイミングで、あおいさん（Clawdbot Monitor）向けの進捗報告ファイルを作成すること。

#### 報告ファイルの作成手順
1. `.agent/reports/TEMPLATE.md` の形式に従い、報告内容を記述する
2. ファイルを `.agent/reports/` に保存する
3. ファイル名: `agent_report_{自分のID}_{タイムスタンプ}.md`
   - タイムスタンプ形式: `YYYY-MM-DDTHH-MM-SS`（コロンをハイフンに置換）
   - 例: `agent_report_PM_2026-02-23T01-45-00.md`

#### 報告ファイルのフォーマット
```markdown
# あおいさんへの報告

- **エージェント**: {自分のID}
- **タイムスタンプ**: {ISO8601形式 +09:00}
- **ステータス**: {idle/working/completed/blocked}

## 完了内容

{タスク内容と完了内容を1〜2行で}

## 進捗状況

{現在の進捗パーセンテージ、詳細}

## 課題・ブロッカー

{もしあれば記述。なければ「なし」}

## 次のステップ

{次に実施する内容}
```

#### 報告タイミング
- **PM**: タスク完了確認時、スプリント完了時、全体進捗の節目
- **PL**: チーム作業の完了報告時、スプリント工程完了時
- **DEV1-5**: 実装タスク完了時
- **TESTER**: テスト完了時
- **REVIEWER**: レビュー完了時
- **LIBRARIAN**: ドキュメント更新完了時

#### あおいさんの処理
- あおいさん（Clawdbot Monitor）が `.agent/reports/` を定期的にポーリングする
- 新しい報告ファイルを検出したら:
  - Discord #reflexio-progress チャンネルに投稿
  - Notion Progress Log DB に記録

### 重要なルール
- 通知を受けたら**必ず**YAMLファイルを読むこと。無視してはならない
- メッセージ送信時は**必ず**board.mdも更新すること
- タスク完了時は、依頼元に completion メッセージを送ること
- 問題が発生した場合は、依頼元に question メッセージを送ること
- 他のエージェントが作業中のファイルを直接編集しないこと
- 同じファイルを複数エージェントが同時編集する場合は、PLに調整を依頼すること

### エージェント一覧
| ID | 役割 |
|---|---|
| PM | Project Manager - ユーザー対話、高レベルタスク |
| PL | Project Lead - タスク分解・割り当て |
| DEV1-DEV5 | Developer - 実装担当 |
| LIBRARIAN | Librarian - ドキュメント管理 |
| TESTER | Tester - テスト実行 |
| REVIEWER | Reviewer - コードレビュー |
