# 001. CursorでMCPサーバーを立てて、Notionへ書き込みする

## 実施日
2025年11月24日

## 目的
- CursorからNotionにアクセスできるようにする
- MCPサーバーを通じてNotion上に設計書や進捗状況を管理する

## 実施内容

### 1. Notion MCPサーバーの設定方法の調査
- Context7を使用してNotion APIの仕様を確認
- 既存のNotion MCPサーバー（`@notionhq/notion-mcp-server`）を使用する方法を選択
- 参考: [Notion MCP Server設定ガイド](https://metoo.co.jp/media/notion-mcp/)

### 2. `.cursor/mcp.json`ファイルの作成
プロジェクトのルートフォルダに`.cursor/mcp.json`ファイルを作成し、以下の内容を記述：

```json
{
  "mcpServers": {
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer ntn_****\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  }
}
```

**注意点：**
- `ntn_****`の部分は、Notionインテグレーションのシークレットキーに置き換える
- JSONのエスケープ（`\"`）に注意

### 3. Notionインテグレーションの作成
1. [Notionのインテグレーションページ](https://www.notion.so/my-integrations)にアクセス
2. 「新しいインテグレーション」を作成
3. 名前とロゴを設定
4. 作成後、「内部インテグレーションシークレット」をコピー（`ntn_****`形式）

### 4. Cursorの再起動とMCPサーバーの読み込み
- 設定変更後、Cursorを再起動して変更を反映
- 再起動後、MCPサーバーが正常に読み込まれたことを確認

**重要ポイント：**
- 設定変更後はCursorの再起動が必要

### 5. Notionへの読み書きテスト

#### 読み取りテスト
- 最上位プロジェクト「📂 Reflexio Dashboard」を確認
- 子ページの一覧を取得
- Private配下のページも正常にアクセス可能

#### 書き込みテスト
- Reflexio Dashboardにメモを追加
- 正常に書き込みが完了

### 6. ReflexioProjectページの作成と接続
- Notion上で手動で「ReflexioProject」ページを作成（最上位ワークスペース直下）
- ページID: `2b4ecf9e-9408-800a-a9fa-e96b4cd30c3a`
- Notionインテグレーションをページに接続
- 接続後、正常にアクセス可能であることを確認

## 学んだこと

### MCPサーバーとは
- Model Context Protocolの略
- AIモデルが異なるデータソースやツールに接続するための標準的な方法を提供
- CursorとClaudeで利用可能（将来的にはOpenAIも対応予定）

### Notion MCPサーバーの機能
- Notionページの読み取り
- 新規ページやデータベースの作成
- ブロック編集・コメント追加
- タスク管理の自動化

### トラブルシューティング
- **エラー発生時**: Cursor再起動で解決することが多い
- **権限エラー**: Notionインテグレーションをページに接続する必要がある
- **JSON構文エラー**: エスケープ（`\"`）に注意

## 参考資料
- [Notion MCP Server設定ガイド](https://metoo.co.jp/media/notion-mcp/)
- [Notion API リファレンス](https://developers.notion.com/reference)

## 次のステップ
- ReflexioProjectページ配下に、要件定義書、設計書、作業指示書、進捗報告書などの構造を作成
- ローカルの`docs`ディレクトリ構造に合わせてNotion上にページ構造を作成

