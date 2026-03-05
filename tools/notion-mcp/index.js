#!/usr/bin/env node

/**
 * Reflexio Notion MCP サーバー
 * Clawdbot (あおい) が Notion と連携するための MCP サーバー
 *
 * 提供ツール:
 *   1. notion_create_page   — Database に新規ページ作成
 *   2. notion_query_database — Database クエリ
 *   3. notion_update_page    — 既存ページのプロパティ更新
 *   4. notion_append_blocks  — 既存ページにブロック追記
 *
 * トランスポート: stdio（標準入出力）
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  getClient,
  formatNotionError,
  parseBlocks,
  parseProperties,
  parseJsonParam
} from './lib/notion-client.js';

// --- MCP サーバー初期化 ---
const server = new McpServer({
  name: 'reflexio-notion-mcp',
  version: '1.0.0',
});

// ============================================================
// ツール 1: notion_create_page
// ============================================================
server.registerTool(
  'notion_create_page',
  {
    title: 'Notion ページ作成',
    description:
      'Notion Database に新規ページを作成します。' +
      'タイトル、プロパティ、本文コンテンツを指定できます。' +
      '本文はテキスト（改行区切り→paragraph変換）またはNotionブロック配列(JSON)で指定可能です。',
    inputSchema: {
      database_id: z.string().describe('対象 Database の ID'),
      title: z.string().describe('ページタイトル（Nameプロパティに設定）'),
      properties: z
        .string()
        .optional()
        .describe(
          '追加プロパティ（JSON文字列）。例: {"Status":{"select":{"name":"進行中"}}}'
        ),
      content: z
        .string()
        .optional()
        .describe(
          'ページ本文。テキスト（改行で段落分割）またはNotionブロック配列のJSON文字列'
        ),
    },
  },
  async ({ database_id, title, properties, content }) => {
    try {
      const notion = getClient();

      // プロパティを構築（タイトルは Name プロパティに設定）
      const props = parseProperties(properties);
      props.Name = {
        title: [{ text: { content: title } }],
      };

      // リクエストパラメータ
      const params = {
        parent: { database_id },
        properties: props,
      };

      // コンテンツがあればブロックとして追加
      if (content) {
        params.children = parseBlocks(content);
      }

      const response = await notion.pages.create(params);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                page_id: response.id,
                url: response.url,
                title,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatNotionError(error) }],
        isError: true,
      };
    }
  }
);

// ============================================================
// ツール 2: notion_query_database
// ============================================================
server.registerTool(
  'notion_query_database',
  {
    title: 'Notion Database クエリ',
    description:
      'Notion Database をクエリし、条件に合うページ一覧を取得します。' +
      'Notion の filter/sort 構文をそのまま受け付けます。',
    inputSchema: {
      database_id: z.string().describe('対象 Database の ID'),
      filter: z
        .string()
        .optional()
        .describe(
          'フィルター条件（JSON文字列）。Notion filter構文。例: {"property":"Status","select":{"equals":"完了"}}'
        ),
      sorts: z
        .string()
        .optional()
        .describe(
          'ソート条件（JSON配列文字列）。例: [{"property":"Created","direction":"descending"}]'
        ),
      page_size: z
        .number()
        .optional()
        .default(10)
        .describe('取得件数（デフォルト: 10、最大: 100）'),
    },
  },
  async ({ database_id, filter, sorts, page_size }) => {
    try {
      const notion = getClient();

      const params = {
        database_id,
        page_size: Math.min(page_size || 10, 100),
      };

      const parsedFilter = parseJsonParam(filter);
      if (parsedFilter) params.filter = parsedFilter;

      const parsedSorts = parseJsonParam(sorts);
      if (parsedSorts) params.sorts = Array.isArray(parsedSorts) ? parsedSorts : [parsedSorts];

      const response = await notion.databases.query(params);

      // レスポンスを整形（必要な情報のみ抽出）
      const results = response.results.map((page) => ({
        id: page.id,
        url: page.url,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        properties: page.properties,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                total: results.length,
                has_more: response.has_more,
                next_cursor: response.next_cursor,
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatNotionError(error) }],
        isError: true,
      };
    }
  }
);

// ============================================================
// ツール 3: notion_update_page
// ============================================================
server.registerTool(
  'notion_update_page',
  {
    title: 'Notion ページ更新',
    description:
      '既存の Notion ページのプロパティを更新します。' +
      'プロパティは Notion API のプロパティ構文(JSON)で指定します。',
    inputSchema: {
      page_id: z.string().describe('更新対象ページの ID'),
      properties: z
        .string()
        .describe(
          '更新するプロパティ（JSON文字列）。例: {"Status":{"select":{"name":"完了"}}}'
        ),
    },
  },
  async ({ page_id, properties }) => {
    try {
      const notion = getClient();

      const props = parseProperties(properties);

      const response = await notion.pages.update({
        page_id,
        properties: props,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                page_id: response.id,
                url: response.url,
                last_edited_time: response.last_edited_time,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatNotionError(error) }],
        isError: true,
      };
    }
  }
);

// ============================================================
// ツール 4: notion_append_blocks
// ============================================================
server.registerTool(
  'notion_append_blocks',
  {
    title: 'Notion ブロック追記',
    description:
      '既存の Notion ページにブロック（コンテンツ）を追記します。' +
      'テキスト（改行で段落分割）またはNotionブロック配列(JSON)で指定可能です。' +
      '対応ブロック: paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, to_do, code',
    inputSchema: {
      page_id: z.string().describe('追記対象ページの ID'),
      blocks: z
        .string()
        .describe(
          '追記するブロック。テキスト（改行で段落分割）またはNotionブロック配列のJSON文字列。' +
          '例(テキスト): "行1\\n行2\\n行3" ' +
          '例(JSON): [{"object":"block","type":"heading_2","heading_2":{"rich_text":[{"type":"text","text":{"content":"見出し"}}]}}]'
        ),
    },
  },
  async ({ page_id, blocks }) => {
    try {
      const notion = getClient();

      const children = parseBlocks(blocks);

      const response = await notion.blocks.children.append({
        block_id: page_id,
        children,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                page_id,
                appended_blocks: response.results.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: formatNotionError(error) }],
        isError: true,
      };
    }
  }
);

// --- サーバー起動 ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr に出力（stdout は MCP プロトコル通信に使用されるため）
  console.error('Reflexio Notion MCP サーバーが起動しました (stdio)');
}

main().catch((error) => {
  console.error('MCP サーバー起動エラー:', error);
  process.exit(1);
});
