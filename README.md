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
└── docs/                  # ドキュメント
    ├── project-guide.md   # プロジェクト詳細ガイド（AIエージェント向け）
    ├── 01_agile/          # アジャイル開発プロセス
    └── 02_waterfall/      # ウォーターフォール成果物
```

## AIエージェント向けドキュメント

複数のAIエージェントで開発する場合は以下を参照してください:

- **[CLAUDE.md](./CLAUDE.md)** — Claude Code が自動読み込みするコンテキスト。環境情報・開発ルールの概要
- **[docs/project-guide.md](./docs/project-guide.md)** — プロジェクトの詳細ガイド。アーキテクチャ、API設計、DB設計、新機能追加パターンなど

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
