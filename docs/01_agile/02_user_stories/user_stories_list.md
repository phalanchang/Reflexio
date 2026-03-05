# ユーザーストーリー一覧

## 既存機能ストーリー

| 番号 | ストーリー名 | 概要 | 詳細ファイル | 状態 |
|------|-------------|------|-------------|------|
| 01 | ログイン機能 | ユーザー名とパスワードでログインできる | [01_user_story_login.md](./01_user_story_login.md) | 完了 |
| 02 | ログアウト機能 | ログアウトできる | [02_user_story_logout.md](./02_user_story_logout.md) | 完了 |
| 03 | メインページ基本レイアウト | ログイン後にメインページが表示される | [03_user_story_main_layout.md](./03_user_story_main_layout.md) | 完了 |
| 04 | やりたいこと一覧表示 | 登録した「やりたいこと」の一覧を見ることができる | [04_user_story_wish_list.md](./04_user_story_wish_list.md) | 完了 |
| 05 | やりたいこと追加 | 新しい「やりたいこと」を登録できる | [05_user_story_wish_create.md](./05_user_story_wish_create.md) | 完了 |
| 06 | やりたいこと編集・削除 | 登録した「やりたいこと」を編集・削除できる | [06_user_story_wish_edit_delete.md](./06_user_story_wish_edit_delete.md) | 完了 |

## ActiveRecall ストーリー（ストーリー駆動開発）

**ストーリーマップ**: [active_recall_stories.md](./active_recall_stories.md)

### 再利用可能基盤: Voice Recording (US-VR)

| ID | ストーリー名 | 概要 | 前提 | 状態 |
|---|---|---|---|---|
| US-VR-001 | 音声録音 | ブラウザでマイク録音→音声ファイル保存 | なし | 未着手 |
| US-VR-002 | 音声文字起こし | faster-whisperで音声→テキスト変換 | US-VR-001 | 未着手 |
| US-VR-003 | 文字起こし整形 | AIで生テキスト→自然な文章に成型 | US-VR-002 | 未着手 |

### 知識インプット: Knowledge Input (US-KI)

| ID | ストーリー名 | 概要 | 前提 | 状態 |
|---|---|---|---|---|
| US-KI-001 | テーマ登録 | 学習テーマの作成・管理 | なし | 未着手 |
| US-KI-002 | 知識コンテンツ作成 | テーマに対する知識ファイルの作成・編集 | US-KI-001 | 未着手 |

### ActiveRecall (US-AR)

| ID | ストーリー名 | 概要 | 前提 | 状態 |
|---|---|---|---|---|
| US-AR-001 | セッション開始 | テーマ選択→録音→文字起こし開始 | US-KI-002, US-VR-001 | 未着手 |
| US-AR-002 | リコール結果表示 | 文字起こし+整形テキストの表示 | US-AR-001, US-VR-002, US-VR-003 | 未着手 |
| US-AR-003 | AI比較採点 | リコール内容と知識コンテンツの比較採点 | US-AR-002, US-KI-002 | 未着手 |
| US-AR-004 | フィードバック表示 | 採点結果・スコア・改善点の表示 | US-AR-003 | 未着手 |

