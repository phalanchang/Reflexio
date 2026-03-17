# Node.js バックエンド用 Dockerfile
FROM node:18-slim

WORKDIR /app

# Python3 + pip インストール
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# faster-whisper インストール
RUN pip3 install --no-cache-dir --break-system-packages faster-whisper

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# ポートを公開
EXPOSE 3001

# 開発サーバーを起動
CMD ["npm", "run", "dev"]
