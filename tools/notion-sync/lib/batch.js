/**
 * バッチ更新モジュール
 * 複数 Database への同時ページ追加・更新を管理
 * YAML/JSON ジョブファイルによる一括実行に対応
 */
import { readFileSync } from 'fs';
import { Client } from '@notionhq/client';
import yaml from 'js-yaml';
import { rateLimiter } from './rate-limiter.js';
import { resolveTemplate } from './template.js';
import logger from './logger.js';

/**
 * Notion クライアントを取得
 * @returns {Client}
 */
function getNotionClient() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      'NOTION_API_KEY 環境変数が設定されていません。\n' +
      '環境変数を設定してください: export NOTION_API_KEY="secret_xxx..."'
    );
  }
  return new Client({ auth: apiKey });
}

/**
 * テキストを Notion ブロック配列に変換
 * @param {string|Array} input
 * @returns {Array}
 */
function parseBlocks(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // テキストとして処理
    }
    return input.split('\n').map(line => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: line } }],
      },
    }));
  }
  return [];
}

/**
 * Notion API エラーを日本語メッセージに変換
 * @param {Error} error
 * @returns {string}
 */
function formatError(error) {
  const status = error.status || error.code;
  switch (status) {
    case 401: return 'APIキーが無効です。NOTION_API_KEY を確認してください';
    case 403: return 'アクセス権限がありません。Integration のページ共有設定を確認してください';
    case 404: return '指定された Database/Page が見つかりません';
    case 429: return 'レート制限に達しました。しばらく待ってリトライしてください';
    default: return error.message || `Notion API エラー (${status})`;
  }
}

/**
 * ページを作成
 * @param {Object} params - { database_id, title, properties, content }
 * @returns {Promise<Object>} 作成結果
 */
export async function createPage(params) {
  const notion = getNotionClient();

  const props = params.properties || {};
  props.Name = {
    title: [{ text: { content: params.title } }],
  };

  const apiParams = {
    parent: { database_id: params.database_id },
    properties: props,
  };

  if (params.content) {
    apiParams.children = parseBlocks(params.content);
  }

  return rateLimiter.execute(async () => {
    logger.info(`ページ作成: "${params.title}" → DB ${params.database_id.substring(0, 8)}...`);
    const response = await notion.pages.create(apiParams);
    logger.info(`ページ作成完了: ${response.id}`);
    return {
      success: true,
      page_id: response.id,
      url: response.url,
      title: params.title,
    };
  });
}

/**
 * Database をクエリ
 * @param {string} databaseId
 * @param {Object} [filter]
 * @param {number} [pageSize=10]
 * @returns {Promise<Array>}
 */
export async function queryDatabase(databaseId, filter, pageSize = 10) {
  const notion = getNotionClient();

  const params = {
    database_id: databaseId,
    page_size: Math.min(pageSize, 100),
  };
  if (filter) params.filter = filter;

  return rateLimiter.execute(async () => {
    logger.info(`Database クエリ: ${databaseId.substring(0, 8)}...`);
    const response = await notion.databases.query(params);
    logger.info(`クエリ結果: ${response.results.length} 件`);
    return response.results;
  });
}

/**
 * ページを更新
 * @param {string} pageId
 * @param {Object} properties
 * @returns {Promise<Object>}
 */
export async function updatePage(pageId, properties) {
  const notion = getNotionClient();

  return rateLimiter.execute(async () => {
    logger.info(`ページ更新: ${pageId.substring(0, 8)}...`);
    const response = await notion.pages.update({ page_id: pageId, properties });
    logger.info(`ページ更新完了: ${response.id}`);
    return {
      success: true,
      page_id: response.id,
      url: response.url,
    };
  });
}

/**
 * ページにブロックを追記
 * @param {string} pageId
 * @param {string|Array} blocks
 * @returns {Promise<Object>}
 */
export async function appendBlocks(pageId, blocks) {
  const notion = getNotionClient();
  const children = parseBlocks(blocks);

  return rateLimiter.execute(async () => {
    logger.info(`ブロック追記: ${pageId.substring(0, 8)}...`);
    const response = await notion.blocks.children.append({
      block_id: pageId,
      children,
    });
    logger.info(`ブロック追記完了: ${response.results.length} ブロック`);
    return {
      success: true,
      page_id: pageId,
      appended_blocks: response.results.length,
    };
  });
}

/**
 * Upsert: 条件に合うページを検索 → 見つかったら更新、なければ新規作成
 * @param {Object} params
 * @param {string} params.database_id - Database ID
 * @param {Object} params.filter - 検索フィルター
 * @param {Object} params.properties - 更新/作成するプロパティ
 * @param {string} params.title - ページタイトル（新規作成時）
 * @param {string} [params.content] - コンテンツ（新規作成時）
 * @param {string} [params.appendContent] - 追記コンテンツ（既存ページ更新時）
 * @returns {Promise<Object>}
 */
export async function upsert(params) {
  logger.info(`Upsert 開始: DB ${params.database_id.substring(0, 8)}...`);

  // 既存ページを検索
  const existing = await queryDatabase(params.database_id, params.filter, 1);

  if (existing.length > 0) {
    // 既存ページを更新
    const pageId = existing[0].id;
    logger.info(`既存ページ発見: ${pageId} → 更新モード`);

    const result = await updatePage(pageId, params.properties || {});

    // 追記コンテンツがあればブロック追記
    if (params.appendContent) {
      await appendBlocks(pageId, params.appendContent);
    }

    return { ...result, action: 'updated' };
  } else {
    // 新規ページ作成
    logger.info('既存ページなし → 新規作成モード');
    const result = await createPage({
      database_id: params.database_id,
      title: params.title,
      properties: params.properties,
      content: params.content,
    });
    return { ...result, action: 'created' };
  }
}

/**
 * テンプレートを使ったページ作成（sync コマンド）
 * @param {string} templateName - テンプレート名
 * @param {Object} vars - 変数マップ
 * @returns {Promise<Object>}
 */
export async function syncWithTemplate(templateName, vars) {
  logger.info(`テンプレート sync 開始: "${templateName}"`);
  const resolved = resolveTemplate(templateName, vars);
  return createPage(resolved);
}

/**
 * YAML/JSON ジョブファイルからバッチ実行
 * @param {string} filePath - ジョブファイルパス
 * @returns {Promise<Array<Object>>} 各ジョブの実行結果
 */
export async function runBatchFromFile(filePath) {
  logger.info(`バッチジョブファイル読み込み: ${filePath}`);

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`ジョブファイルが読み込めません: ${filePath} — ${error.message}`);
  }

  let jobs;
  if (filePath.endsWith('.json')) {
    jobs = JSON.parse(content);
  } else {
    jobs = yaml.load(content);
  }

  // jobs は配列（直接ジョブリスト）または { jobs: [...] } オブジェクト
  const jobList = Array.isArray(jobs) ? jobs : (jobs.jobs || []);

  logger.info(`バッチジョブ数: ${jobList.length}`);

  const results = [];
  for (let i = 0; i < jobList.length; i++) {
    const job = jobList[i];
    const jobLabel = `ジョブ ${i + 1}/${jobList.length}`;

    try {
      let result;

      if (job.template) {
        // テンプレートベースのジョブ
        logger.info(`${jobLabel}: テンプレート "${job.template}" 実行`);
        result = await syncWithTemplate(job.template, job.variables || {});
      } else if (job.action === 'upsert') {
        // Upsert ジョブ
        logger.info(`${jobLabel}: Upsert 実行`);
        result = await upsert(job);
      } else if (job.action === 'append') {
        // ブロック追記ジョブ
        logger.info(`${jobLabel}: ブロック追記`);
        result = await appendBlocks(job.page_id, job.blocks || job.content);
      } else if (job.action === 'update') {
        // ページ更新ジョブ
        logger.info(`${jobLabel}: ページ更新`);
        result = await updatePage(job.page_id, job.properties);
      } else {
        // デフォルト: ページ作成
        logger.info(`${jobLabel}: ページ作成`);
        result = await createPage(job);
      }

      results.push({ job: i + 1, status: 'success', ...result });
    } catch (error) {
      const errorMsg = formatError(error);
      logger.error(`${jobLabel}: 失敗 — ${errorMsg}`);
      results.push({ job: i + 1, status: 'failed', error: errorMsg });
    }
  }

  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  logger.info(`バッチ完了: ${succeeded} 成功, ${failed} 失敗 / ${jobList.length} 件`);

  return results;
}

export default {
  createPage,
  queryDatabase,
  updatePage,
  appendBlocks,
  upsert,
  syncWithTemplate,
  runBatchFromFile,
};
