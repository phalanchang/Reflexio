# Reflexio

Reflexio (Reflexio Reflection Myself) - 個人の生活をサポートする統合型Webアプリケーション

## 技術スタック

- **フロントエンド**: React 18
- **バックエンド**: Node.js 18 (Express)
- **データベース**: MySQL 8.0
- **インフラ**: Docker, Docker Compose

## 開発環境

- OS: Windows + WSL2
- Docker環境で各サービスをコンテナ化

## セットアップ

### 前提条件

- Docker Desktop (Windows + WSL)
- Git

### セットアップ手順

1. リポジトリをクローン
```bash
git clone https://github.com/phalanchang/Reflexio.git
cd Reflexio
```

2. Docker環境を起動
```bash
docker compose up --build -d
```

3. 各サービスにアクセス
- フロントエンド: http://localhost:3003
- バックエンド API: http://localhost:3002
- データベース: localhost:3307

> **WSL2環境の場合**: localhost でアクセスできない場合は、WSL2 の IP アドレス (`ip addr show eth0`) を使用してください。

4. ログイン
- ユーザー名: `admin`
- パスワード: `password123`

### 開発コマンド

```bash
# 初回起動・DBスキーマ変更時（ボリューム再作成）
docker compose down -v && docker compose up --build -d

# 通常起動
docker compose up -d

# ログ確認
docker compose logs -f

# サービス停止
docker compose down
```

## プロジェクト構造

```
Reflexio/
├── CLAUDE.md              # AIエージェント向けコンテキスト（自動読み込み）
├── docker-compose.yml     # Docker Compose設定
├── docker/                # Docker関連ファイル
│   └── mysql/init/        # MySQL初期化SQL
├── backend/               # Express バックエンド
├── frontend/              # React フロントエンド
├── .agent/                # マルチエージェントシステム
│   ├── scripts/           # 起動・監視スクリプト
│   ├── roles/             # エージェントロール定義
│   ├── messages/          # YAML通信ファイル
│   ├── dashboard.md       # エージェント状況ダッシュボード
│   └── board.md           # メッセージ通知ログ
└── docs/                  # ドキュメント
    ├── project-guide.md   # プロジェクト詳細ガイド（AIエージェント向け）
    ├── 01_agile/          # アジャイル開発プロセス
    └── 02_waterfall/      # ウォーターフォール成果物
```

## マルチエージェント開発

tmux + Claude Code で複数のAIエージェントが協調して開発を行うシステムを搭載しています。

### 前提条件

- tmux (`sudo apt install tmux`)
- Claude Code CLI (`claude` コマンド)

### 起動

```bash
# DEV5人（デフォルト）で全エージェント一括起動
bash .agent/scripts/setup-tmux.sh

# DEV数を指定する場合
bash .agent/scripts/setup-tmux.sh 3
```

1コマンドで以下が自動実行されます:
- tmux セッション作成（11ウィンドウ）
- 各ウィンドウで Claude Code がロール定義付きで起動
- メッセージ監視スクリプト（watcher）がバックグラウンドで起動

### エージェント構成

| Window | ID | 役割 |
|--------|-----|------|
| 0 | WATCHER | メッセージ監視（自動） |
| 1 | PM | ユーザーとの対話窓口 |
| 2 | PL | タスク分解・割り当て |
| 3-7 | DEV1-5 | 実装担当 |
| 8 | LIBRARIAN | ドキュメント管理 |
| 9 | TESTER | テスト実行 |
| 10 | REVIEWER | コードレビュー |

### 操作方法

```bash
# ウィンドウ切替
Ctrl+b → 番号        # 0〜10 の番号で直接移動
Ctrl+b → n           # 次のウィンドウ
Ctrl+b → p           # 前のウィンドウ
Ctrl+b → w           # ウィンドウ一覧から選択

# セッション操作
Ctrl+b → d           # デタッチ（エージェントは動き続ける）
tmux attach -t reflexio-agents   # 再接続
tmux kill-session -t reflexio-agents  # 全終了
```

### 使い方

1. **ウィンドウ1（PM）に移動**して、やりたいことを伝える
2. PM → PL → DEV の順でタスクが自動的に流れる
3. エージェント間の通信は `.agent/messages/` 内の YAML ファイルで行われる
4. watcher が新メッセージを検出し、宛先エージェントに自動通知する

### 進捗確認

```bash
# エージェント全体の状況を確認
cat .agent/dashboard.md

# メッセージログを確認
cat .agent/board.md
```

### 関連ドキュメント

- **[CLAUDE.md](./CLAUDE.md)** — Claude Code が自動読み込みするコンテキスト
- **[docs/project-guide.md](./docs/project-guide.md)** — プロジェクト詳細ガイド（アーキテクチャ、API設計など）
- **[.agent/roles/](./agent/roles/)** — 各エージェントのロール定義

## 機能

- [x] ログイン/ログアウト機能
- [x] メインレイアウト（Header / Sidebar / Main Content）
- [ ] ダッシュボード機能
- [ ] タスク管理機能
- [ ] ノート管理機能
- [ ] 家計簿機能
- [ ] ActiveRecall機能

## 開発手法

アジャイル開発方式で段階的に機能を追加していきます。

## ライセンス

[ライセンス情報を記載]
