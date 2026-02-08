# Reflexio

Reflexio (Reflexio Reflecton Myself) - 個人の生活をサポートする統合型Webアプリケーション

## 技術スタック

- **フロントエンド**: React
- **バックエンド**: Node.js (Express)
- **データベース**: MySQL
- **インフラ**: Docker, Docker Compose

## 開発環境

- OS: Windows + WSL
- Docker環境で各サービスをコンテナ化

## セットアップ

### 前提条件

- Docker Desktop (Windows + WSL)
- Git

### セットアップ手順

1. リポジトリをクローン
```bash
git clone <repository-url>
cd Reflexio
```

2. Docker環境を起動
```bash
docker-compose up -d
```

3. 各サービスにアクセス
- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:3001
- データベース: localhost:3306

### 開発モード

```bash
# すべてのサービスを起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# サービスを停止
docker-compose down
```

## プロジェクト構造

```
Reflexio/
├── frontend/          # React フロントエンド
├── backend/           # Node.js バックエンド
├── docker/            # Docker関連ファイル
├── docs/              # ドキュメント
│   ├── 01_agile/      # アジャイル開発プロセス
│   └── 02_waterfall/  # ウォーターフォール成果物
└── docker-compose.yml # Docker Compose設定
```

## 機能

- ログイン機能
- ダッシュボード機能
- 家計簿機能
- ノート管理機能
- ActiveRecall機能
- タスク管理機能

## 開発手法

アジャイル開発方式で段階的に機能を追加していきます。

## ライセンス

[ライセンス情報を記載]
