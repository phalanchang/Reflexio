# 学習ノート

## Notion MCPサーバー設定

### 目的
- Notion上に設計書や進捗状況を管理する
- MCPサーバーを通じてCursorからNotionにアクセスできるようにする

### 進め方
1. 既存のNotion MCPサーバーを使用する方法を選択
   - コミュニティで公開されているNotion MCPサーバーを利用
   - Cursorの設定に追加するだけで使用可能

### 設定手順

#### ステップ1: 必要条件の確認
- Cursorのバージョンが0.47以上であることを確認
- Cursorの設定でEarly Accessにオプトイン

#### ステップ2: Notionインテグレーションの作成
1. [Notionのインテグレーションページ](https://www.notion.so/my-integrations)にアクセス
2. 「新しいインテグレーション」を作成し、名前とロゴを設定
3. 作成後、「内部インテグレーションシークレット」をコピー（`ntn_****`形式）

#### ステップ3: `.cursor/mcp.json`ファイルの作成
1. プロジェクトのルートフォルダに`.cursor/mcp.json`ファイルを新規作成
2. 以下の内容を記述し、`ntn_****`を取得したインテグレーションシークレットに置き換える

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

#### ステップ4: サーバーの起動と接続
1. ターミナルで以下のコマンドを実行してMCPサーバーを起動
   ```bash
   npx -y @notionhq/notion-mcp-server
   ```
2. Cursorの「…」メニューから「接続」を選択し、`mcp.json`で設定したサーバー名（例：`notionApi`）で検索して接続

### 次のステップ
- [x] Cursorのバージョン確認
- [x] Notionインテグレーションの作成
- [x] `.cursor/mcp.json`ファイルの作成
- [x] MCPサーバーの起動と接続確認（Cursor再起動で解決）
- [x] MCPサーバー経由でNotionにアクセスできることを確認
  - ✅ 読み取りテスト: 成功（最上位プロジェクト「📂 Reflexio Dashboard」を確認）
  - ✅ 書き込みテスト: 成功（Reflexio Dashboardにメモを追加）
- [x] Notion上に設計書や進捗管理用のページ/データベースを作成
  - ✅ ReflexioProjectページを作成（最上位ワークスペース直下）
  - ページID: `2b4ecf9e-9408-800a-a9fa-e96b4cd30c3a`
  - URL: https://www.notion.so/ReflexioProject-2b4ecf9e9408800aa9fae96b4cd30c3a

### トラブルシューティング

#### エラーが発生した場合の確認事項
1. **エラーメッセージの詳細確認**
   - 「Show Output」をクリックして、具体的なエラーメッセージを確認
   - エラーの種類（認証エラー、接続エラー、JSON構文エラーなど）を特定

2. **設定ファイルの確認**
   - `mcp.json`ファイルのJSON構文が正しいか確認（カンマ、引用符の漏れなど）
   - Notion APIトークンが正しく設定されているか確認（コピー漏れ、余計な空白がないか）

3. **Node.jsのインストール確認**
   - ターミナルで`node -v`を実行して、Node.jsがインストールされているか確認
   - インストールされていない場合は、[Node.js公式サイト](https://nodejs.org/)からインストール

4. **Notionインテグレーションの設定確認**
   - 作成したNotionのインテグレーションが、アクセスしたいページやデータベースの「接続」に追加されているか確認
   - これが行われていないと、権限エラーが発生する可能性がある

5. **Cursorの再起動**
   - 設定変更後は、Cursorを再起動して変更を反映させる

#### よくあるエラーと対処法
- **認証エラー**: Notion APIトークンが正しく設定されているか、インテグレーションがページに接続されているか確認
- **接続エラー**: Node.jsがインストールされているか、ネットワーク接続を確認
- **JSON構文エラー**: `mcp.json`ファイルの構文を確認（特に`OPENAPI_MCP_HEADERS`のエスケープ）

### メモ
- 作業内容はこのノートに随時記録していく
- 学習内容としてまとめていく
- 参考: [Notion MCP Server設定ガイド](https://metoo.co.jp/media/notion-mcp/)
- **2025/11/24**: エラー発生 → Cursor再起動で解決！Notion MCPサーバーが正常に読み込まれた
  - 設定変更後はCursorの再起動が必要（重要ポイント）
- **2025/11/24**: Notionへの読み書きテスト完了
  - 最上位プロジェクト「📂 Reflexio Dashboard」を確認
  - 子ページ: 📒 日記ページ、✅ タスク管理ページ、🧠 知識・メモページ、🪶 今日のひとこと、🎥💡 TikTokネタメモ、Reflexio Motivation Score Bot
  - 書き込みテスト: Reflexio Dashboardにメモを追加（成功）
  - Private配下のページも正常にアクセス可能
- **2025/11/24**: ReflexioProjectワークスペース作成完了
  - 最上位ワークスペース直下に「ReflexioProject」ページを作成
  - ページID: `2b4ecf9e-9408-800a-a9fa-e96b4cd30c3a`
  - Notionインテグレーションを接続してアクセス可能に
  - このページ配下で要件定義書、設計書、作業指示書、進捗報告書などを管理予定

