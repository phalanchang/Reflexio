/**
 * Notion API ラッパー
 * 認証・共通処理・エラーハンドリングを提供
 */
import { Client } from '@notionhq/client';

/**
 * Notion クライアントを初期化
 * @returns {Client} Notion API クライアント
 * @throws {Error} NOTION_API_KEY 未設定時
 */
function createNotionClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      'NOTION_API_KEY 環境変数が設定されていません。\n' +
      'MCP 設定の env に NOTION_API_KEY を追加してください。\n' +
      '例: "env": { "NOTION_API_KEY": "secret_xxx..." }'
    );
  }
  return new Client({ auth: apiKey });
}

/**
 * Notion API エラーを日本語メッセージに変換
 * @param {Error} error - Notion API エラー
 * @returns {string} 日本語エラーメッセージ
 */
export function formatNotionError(error) {
  const status = error.status || error.code;

  switch (status) {
    case 401:
      return 'APIキーが無効です。NOTION_API_KEY を確認してください';
    case 403:
      return 'アクセス権限がありません。Integration のページ共有設定を確認してください';
    case 404:
      return '指定された Database/Page が見つかりません';
    case 429:
      return 'レート制限に達しました。しばらく待ってリトライしてください';
    default:
      return error.message || `Notion API エラー (${status})`;
  }
}

/**
 * テキストを Notion ブロック配列に変換
 * @param {string|Array} input - テキスト文字列またはブロック配列(JSON)
 * @returns {Array} Notion ブロック配列
 */
export function parseBlocks(input) {
  // すでにブロック配列の場合はそのまま返す
  if (Array.isArray(input)) {
    return input;
  }

  // JSON 文字列の場合はパースを試みる
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // JSON ではない → テキストとして paragraph ブロックに変換
    }

    // テキストを改行で分割して paragraph ブロック化
    return input.split('\n').map(line => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: line } }]
      }
    }));
  }

  return [];
}

/**
 * プロパティ入力をパース
 * @param {string|Object} input - JSON 文字列またはオブジェクト
 * @returns {Object} プロパティオブジェクト
 */
export function parseProperties(input) {
  if (!input) return {};
  if (typeof input === 'object' && !Array.isArray(input)) return input;
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * フィルター/ソート入力をパース
 * @param {string|Object|undefined} input - JSON 文字列またはオブジェクト
 * @returns {Object|undefined} パース済みオブジェクト
 */
export function parseJsonParam(input) {
  if (!input) return undefined;
  if (typeof input === 'object') return input;
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// シングルトン Notion クライアント（遅延初期化）
let notionClient = null;

/**
 * Notion クライアントを取得（シングルトン）
 * @returns {Client}
 */
export function getClient() {
  if (!notionClient) {
    notionClient = createNotionClient();
  }
  return notionClient;
}
