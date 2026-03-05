# Reflexio Dashboard Viewer

Reflexio マルチエージェントシステムの全体状況を一目で把握できる Web ダッシュボード。

## 起動方法

```bash
cd tools/dashboard-viewer
npm install
node server.js
```

ブラウザで http://localhost:8080 にアクセス。

## 機能

| セクション | 説明 |
|---|---|
| サマリーカード | 依頼総数・完了・進行中・未読のカウント表示 |
| エージェント状況 | PM, PL, DEV1-5, TESTER, REVIEWER, LIBRARIAN のステータスカード |
| 進捗タイムライン | user_to_pm.md の依頼一覧（ステータスフィルタ付き） |
| レポート & 通知 | 最新レポートと agent_notify.log のエントリ表示 |

## 自動更新

10秒ごとに全APIを再取得し、画面を自動更新します。

## API エンドポイント

| Method | Path | 説明 |
|---|---|---|
| GET | `/api/agents` | エージェント状況一覧 |
| GET | `/api/timeline` | 依頼タイムライン |
| GET | `/api/summary` | 今日の Summary |
| GET | `/` | ダッシュボード画面 |

## データソース

- `.agent/dashboard.md` — エージェント状況
- `.agent/remote/user_to_pm.md` — 依頼タイムライン
- `.agent/reports/` — レポートファイル
- `.agent/agent_notify.log` — 通知ログ

## ポート変更

環境変数 `PORT` で変更可能:

```bash
PORT=9090 node server.js
```

## 技術構成

- Express (バックエンド)
- Tailwind CSS CDN (フロントエンド)
- 単一 HTML ファイル (JavaScript インライン)
