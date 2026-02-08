# 002. Docker Compose の学習

## 実施日
2025年11月24日

## 目的
Docker Composeの設定ファイル（docker-compose.yml）の内容を理解し、各項目がどのような役割を果たしているかを学習する。

## docker-compose.yml の構成

### 1. version（バージョン指定）

```yaml
version: '3.8'
```

**意味：**
- Docker Composeファイルの形式バージョンを指定
- 3.8は比較的新しいバージョンで、多くの機能をサポート

**読み込む人：**
- Docker Composeコマンド（`docker-compose`または`docker compose`）

### 2. services（サービス定義）

```yaml
services:
  db:
    # データベースサービスの定義
  backend:
    # バックエンドサービスの定義
  frontend:
    # フロントエンドサービスの定義
```

**意味：**
- アプリケーションを構成する各サービス（コンテナ）を定義
- このファイルでは3つのサービス（db、backend、frontend）を定義

**読み込む人：**
- Docker Composeコマンド

## 各サービスの詳細

### dbサービス（データベース）

```yaml
db:
  image: mysql:8.0
  container_name: reflexio-db
  environment:
    MYSQL_ROOT_PASSWORD: rootpassword
    MYSQL_DATABASE: reflexio
    MYSQL_USER: reflexio_user
    MYSQL_PASSWORD: reflexio_password
  ports:
    - "3306:3306"
  volumes:
    - mysql_data:/var/lib/mysql
    - ./docker/mysql/init:/docker-entrypoint-initdb.d
  networks:
    - reflexio-network
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 10s
    timeout: 5s
    retries: 5
```

#### 各項目の説明

**`image: mysql:8.0`**
- 使用するDockerイメージを指定
- Docker Hubから`mysql:8.0`イメージを取得
- ビルド不要で、既存のイメージを使用

**`container_name: reflexio-db`**
- コンテナの名前を指定
- 指定しない場合は自動生成される
- 名前でコンテナを識別しやすくなる

**`environment:`**
- コンテナ内の環境変数を設定
- MySQLの初期設定（ルートパスワード、データベース名、ユーザー名、パスワード）を指定

**`ports: - "3306:3306"`**
- ホストマシンとコンテナのポートをマッピング
- 形式：`"ホストポート:コンテナポート"`
- ホストの3306ポート → コンテナの3306ポート
- これにより、ホストから`localhost:3306`でアクセス可能

**`volumes:`**
- データの永続化とファイルのマウントを定義
- `mysql_data:/var/lib/mysql` - 名前付きボリューム（データベースのデータを永続化）
- `./docker/mysql/init:/docker-entrypoint-initdb.d` - 初期化スクリプトをマウント

**`networks: - reflexio-network`**
- コンテナをどのネットワークに接続するか指定
- 同じネットワーク内のコンテナは互いに通信可能

**`healthcheck:`**
- コンテナの健康状態をチェック
- `test`: 健康チェックのコマンド
- `interval`: チェック間隔（10秒ごと）
- `timeout`: タイムアウト時間（5秒）
- `retries`: リトライ回数（5回）
- 他のサービスがこのサービスに依存する場合、健康状態を確認してから起動

### backendサービス（バックエンド）

```yaml
backend:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: reflexio-backend
  environment:
    NODE_ENV: development
    DB_HOST: db
    DB_PORT: 3306
    DB_NAME: reflexio
    DB_USER: reflexio_user
    DB_PASSWORD: reflexio_password
    PORT: 3001
  ports:
    - "3001:3001"
  volumes:
    - ./backend:/app
    - /app/node_modules
  depends_on:
    db:
      condition: service_healthy
  networks:
    - reflexio-network
  command: npm run dev
```

#### 各項目の説明

**`build:`**
- イメージをビルドする設定
- `context: ./backend` - ビルドコンテキスト（Dockerfileがあるディレクトリ）
- `dockerfile: Dockerfile` - 使用するDockerfileの名前
- 既存イメージではなく、Dockerfileからイメージをビルド

**`environment:`**
- バックエンドアプリケーションの環境変数
- `DB_HOST: db` - データベースのホスト名（サービス名`db`を使用）
- コンテナ間通信では、サービス名がホスト名として使用される

**`volumes: - ./backend:/app`**
- ホストの`./backend`ディレクトリをコンテナの`/app`にマウント
- 開発中にコードを変更すると、コンテナ内にも反映される（ホットリロード）
- `- /app/node_modules` - node_modulesはマウントしない（コンテナ内のものを使用）

**`depends_on:`**
- このサービスが依存するサービスを指定
- `db: condition: service_healthy` - `db`サービスが健康状態になるまで待つ
- 起動順序を制御できる

**`command: npm run dev`**
- コンテナ起動時に実行するコマンド
- Dockerfileの`CMD`を上書き

### frontendサービス（フロントエンド）

```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: reflexio-frontend
  environment:
    REACT_APP_API_URL: http://localhost:3001
  ports:
    - "3000:3000"
  volumes:
    - ./frontend:/app
    - /app/node_modules
  depends_on:
    - backend
  networks:
    - reflexio-network
  command: npm start
```

#### 各項目の説明

**`depends_on: - backend`**
- `backend`サービスが起動してから起動
- `condition: service_healthy`がないので、起動開始を待つだけ

**`environment: REACT_APP_API_URL`**
- Reactアプリケーションの環境変数
- `REACT_APP_`で始まる変数は、Reactアプリケーション内で`process.env.REACT_APP_API_URL`でアクセス可能

### volumes（ボリューム定義）

```yaml
volumes:
  mysql_data:
```

**意味：**
- 名前付きボリュームを定義
- `mysql_data`という名前のボリュームを作成
- データベースのデータを永続化するために使用
- Dockerが管理するストレージ領域

### networks（ネットワーク定義）

```yaml
networks:
  reflexio-network:
    driver: bridge
```

**意味：**
- Dockerネットワークを定義
- `reflexio-network`という名前のネットワークを作成
- `driver: bridge` - ブリッジネットワーク（同一ホスト内のコンテナ間通信）

## 誰が読み込んでコンテナを立てているのか？

### Docker Composeコマンド

**読み込む人：**
- `docker-compose`コマンド（または`docker compose`コマンド）
- Docker Desktopに含まれるDocker Composeエンジン

**読み込み方法：**

1. **コマンド実行**
   ```bash
   docker-compose up
   # または
   docker compose up
   ```

2. **処理の流れ**
   - `docker-compose.yml`ファイルを読み込む
   - 各サービスの定義を解析
   - 必要なイメージを取得またはビルド
   - ネットワークとボリュームを作成
   - 各サービス（コンテナ）を起動
   - 依存関係に従って起動順序を制御

3. **具体的な処理**
   - `db`サービス: `mysql:8.0`イメージを取得 → コンテナ起動
   - `backend`サービス: `./backend/Dockerfile`からイメージをビルド → コンテナ起動（`db`が健康状態になるまで待機）
   - `frontend`サービス: `./frontend/Dockerfile`からイメージをビルド → コンテナ起動（`backend`の起動を待機）

## 重要なポイント

### コンテナ間通信

- 同じネットワーク（`reflexio-network`）内のコンテナは、サービス名で通信可能
- 例：`backend`から`db`に接続する場合、`DB_HOST=db`と指定
- サービス名がホスト名として機能する

### データの永続化

- `volumes`で定義されたボリュームは、コンテナを削除してもデータが残る
- `mysql_data`ボリュームにデータベースのデータが保存される

### 開発環境での利点

- `volumes`でホストのディレクトリをマウントすることで、コード変更が即座に反映される
- ホットリロードが可能

## 参考資料

- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
- [Docker Composeファイルリファレンス](https://docs.docker.com/compose/compose-file/)

