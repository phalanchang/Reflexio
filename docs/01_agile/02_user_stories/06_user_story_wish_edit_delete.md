# 06. ユーザーストーリー：やりたいこと編集・削除

## ストーリー
**As a** ログインユーザー
**I want to** 登録した「やりたいこと」を編集・削除できる
**So that** やりたいことの内容を修正したり、不要なアイテムを整理できる

## 受け入れ基準

### 編集機能
- [ ] 一覧の各アイテムに「編集」操作がある
- [ ] 編集フォームに既存の情報がプリセットされる
- [ ] タイトル、ステータス、優先度、期限、メモを変更できる
- [ ] 「保存」で変更が反映される
- [ ] 「キャンセル」で変更が破棄される
- [ ] 更新成功時に成功メッセージが表示される
- [ ] ステータスをワンクリックで切り替えできる（クイック操作）

### 削除機能
- [ ] 一覧の各アイテムに「削除」操作がある
- [ ] 削除前に確認ダイアログが表示される
- [ ] 確認後、アイテムが削除される
- [ ] 削除成功後、一覧から消える
- [ ] 削除成功時に成功メッセージが表示される

### 非機能要件
- [ ] 他ユーザーのアイテムは編集・削除できない
- [ ] エラー時にエラーメッセージが表示される

## 技術的詳細

### フロントエンド
- WishForm コンポーネント再利用（編集モード）
- API: PUT /api/wishes/:id（credentials: 'include'）
- API: DELETE /api/wishes/:id（credentials: 'include'）
- 削除確認ダイアログ（window.confirm または カスタムモーダル）

### バックエンド
- PUT /api/wishes/:id エンドポイント
  - requireAuth ミドルウェア適用
  - user_id チェック（自分のアイテムのみ編集可能）
- DELETE /api/wishes/:id エンドポイント
  - requireAuth ミドルウェア適用
  - user_id チェック（自分のアイテムのみ削除可能）

### データベース
- UPDATE wishes SET title=?, description=?, status=?, priority=?, due_date=?, updated_at=NOW() WHERE id=? AND user_id=?
- DELETE FROM wishes WHERE id=? AND user_id=?

## 優先順位
高（2ndスプリントで実装）

## 関連ファイル
- [ユーザーストーリー一覧](./user_stories_list.md)
- [2ndスプリント計画](../01_sprint_planning/02_sprint_02_planning.md)
