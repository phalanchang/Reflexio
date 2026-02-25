# Reflexio Notion MCP サーバー

Clawdbot（あおい）が Notion と連携するための MCP（Model Context Protocol）サーバーです。

## 概要

| 項目 | 内容 |
|------|------|
| トランスポート | stdio（標準入出力） |
| 提供ツール数 | 4 |
| 必要環境 | Node.js 18+ |
| Notion API | @notionhq/client v2 |

### 提供ツール

| ツール名 | 機能 |
|----------|------|
| `notion_create_page` | Database に新規ページ作成 |
| `notion_query_database` | Database クエリ（フィルター/ソート対応） |
| `notion_update_page` | 既存ページのプロパティ更新 |
| `notion_append_blocks` | 既存ページにブロック追記 |

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd tools/notion-mcp
npm install
```

### 2. Notion Integration の作成

1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. Integration 名を入力（例: `Reflexio Clawdbot`）
4. 必要な Capabilities を選択:
   - **Read content** : データベースクエリ、ページ読み取り
   - **Insert content** : ページ作成、ブロック追記
   - **Update content** : ページプロパティ更新
5. 「Submit」で作成
6. 表示される **Internal Integration Secret**（`secret_xxx...`）をコピー

### 3. Database/Page に Integration を接続

対象の Notion Database またはページで:
1. 右上の「...」メニュー → 「接続先」
2. 作成した Integration を選択して接続

### 4. MCP 設定

`.mcp.json`（または `.clawdbot.json`）に以下を追加:

```json
{
  "mcpServers": {
    "notion": {
      "type": "stdio",
      "command": "node",
      "args": ["tools/notion-mcp/index.js"],
      "env": {
        "NOTION_API_KEY": "secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## ツール詳細と使用例

### notion_create_page

Database に新規ページを作成します。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|------|------|------|
| `database_id` | string | Yes | 対象 Database の ID |
| `title` | string | Yes | ページタイトル（Name プロパティ） |
| `properties` | string(JSON) | No | 追加プロパティ |
| `content` | string | No | 本文テキストまたはブロック配列JSON |

**使用例（シンプル）:**
```json
{
  "database_id": "abc123...",
  "title": "進捗報告 2026-02-25"
}
```

**使用例（プロパティ + コンテンツ付き）:**
```json
{
  "database_id": "abc123...",
  "title": "Sprint 9 開始",
  "properties": "{\"Status\":{\"select\":{\"name\":\"進行中\"}},\"Priority\":{\"select\":{\"name\":\"High\"}}}",
  "content": "Sprint 9 の作業を開始します。\n\n主要タスク:\n- Notion MCP サーバー構築\n- Dashboard ビューア構築"
}
```

**使用例（ブロック配列）:**
```json
{
  "database_id": "abc123...",
  "title": "議事録",
  "content": "[{\"object\":\"block\",\"type\":\"heading_2\",\"heading_2\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"議題\"}}]}},{\"object\":\"block\",\"type\":\"bulleted_list_item\",\"bulleted_list_item\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"項目1\"}}]}}]"
}
```

### notion_query_database

Database をクエリし、条件に合うページ一覧を取得します。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|------|------|------|
| `database_id` | string | Yes | 対象 Database の ID |
| `filter` | string(JSON) | No | フィルター条件（Notion filter構文） |
| `sorts` | string(JSON) | No | ソート条件（Notion sort構文） |
| `page_size` | number | No | 取得件数（デフォルト: 10、最大: 100） |

**使用例（全件取得）:**
```json
{
  "database_id": "abc123...",
  "page_size": 20
}
```

**使用例（フィルター + ソート）:**
```json
{
  "database_id": "abc123...",
  "filter": "{\"property\":\"Status\",\"select\":{\"equals\":\"進行中\"}}",
  "sorts": "[{\"property\":\"Created\",\"direction\":\"descending\"}]",
  "page_size": 5
}
```

### notion_update_page

既存ページのプロパティを更新します。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|------|------|------|
| `page_id` | string | Yes | 更新対象ページの ID |
| `properties` | string(JSON) | Yes | 更新するプロパティ |

**使用例:**
```json
{
  "page_id": "page-id-xxx...",
  "properties": "{\"Status\":{\"select\":{\"name\":\"完了\"}},\"Completed\":{\"date\":{\"start\":\"2026-02-25\"}}}"
}
```

### notion_append_blocks

既存ページにブロック（コンテンツ）を追記します。

**パラメータ:**
| 名前 | 型 | 必須 | 説明 |
|------|------|------|------|
| `page_id` | string | Yes | 追記対象ページの ID |
| `blocks` | string | Yes | テキストまたはブロック配列JSON |

**使用例（テキスト）:**
```json
{
  "page_id": "page-id-xxx...",
  "blocks": "追記内容の1行目\n追記内容の2行目\n追記内容の3行目"
}
```

**使用例（構造化ブロック）:**
```json
{
  "page_id": "page-id-xxx...",
  "blocks": "[{\"object\":\"block\",\"type\":\"heading_3\",\"heading_3\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"追記セクション\"}}]}},{\"object\":\"block\",\"type\":\"to_do\",\"to_do\":{\"rich_text\":[{\"type\":\"text\",\"text\":{\"content\":\"タスク1\"}}],\"checked\":false}}]"
}
```

## 対応ブロックタイプ

`notion_create_page` と `notion_append_blocks` で使用可能:

| タイプ | 説明 |
|--------|------|
| `paragraph` | 段落テキスト |
| `heading_1` | 見出し1 |
| `heading_2` | 見出し2 |
| `heading_3` | 見出し3 |
| `bulleted_list_item` | 箇条書き |
| `numbered_list_item` | 番号付きリスト |
| `to_do` | チェックボックス |
| `code` | コードブロック |

## トラブルシューティング

### NOTION_API_KEY 未設定

```
NOTION_API_KEY 環境変数が設定されていません。
MCP 設定の env に NOTION_API_KEY を追加してください。
```

**対処**: `.mcp.json` の `env` に `NOTION_API_KEY` を設定してください。

### APIキーが無効（401 Unauthorized）

```
APIキーが無効です。NOTION_API_KEY を確認してください
```

**対処**: Notion Integration の Secret キーが正しいか確認してください。`secret_` で始まる文字列です。

### アクセス権限なし（403 Forbidden）

```
アクセス権限がありません。Integration のページ共有設定を確認してください
```

**対処**: 対象の Database/Page に Integration が接続されているか確認してください。
Notion で対象ページの「...」→「接続先」から Integration を追加してください。

### Database/Page が見つからない（404 Not Found）

```
指定された Database/Page が見つかりません
```

**対処**: Database ID や Page ID が正しいか確認してください。
Notion URL から ID を取得: `https://notion.so/xxxxx?v=yyyyy` の `xxxxx` 部分です。

### レート制限（429 Too Many Requests）

```
レート制限に達しました。しばらく待ってリトライしてください
```

**対処**: Notion API は 3 req/sec の制限があります。少し時間をおいてリトライしてください。

## Database ID の取得方法

1. Notion で対象の Database を開く
2. URL をコピー: `https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=yyyyy`
3. `?v=` の前の部分が Database ID
4. ハイフンを除いた 32文字の文字列を使用

## ライセンス

Reflexio プロジェクト内部利用
