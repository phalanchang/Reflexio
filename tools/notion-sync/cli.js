#!/usr/bin/env node

/**
 * Reflexio Notion Sync Tool — CLI エントリーポイント
 *
 * コマンド:
 *   sync      — テンプレートを使ったページ作成
 *   batch     — YAML/JSON ジョブファイルでバッチ実行
 *   upsert    — 条件付き更新（既存→更新、なし→作成）
 *   templates — テンプレート一覧表示
 */

import { syncWithTemplate, runBatchFromFile, upsert } from './lib/batch.js';
import { listTemplates } from './lib/template.js';
import logger from './lib/logger.js';

/**
 * コマンドライン引数をパース
 * @param {string[]} argv
 * @returns {Object} { command, options }
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0];
  const options = {};
  const vars = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--template' || arg === '-t') {
      options.template = args[++i];
    } else if (arg === '--file' || arg === '-f') {
      options.file = args[++i];
    } else if (arg === '--database-id' || arg === '--db') {
      options.databaseId = args[++i];
    } else if (arg === '--filter-property') {
      options.filterProperty = args[++i];
    } else if (arg === '--filter-value') {
      options.filterValue = args[++i];
    } else if (arg === '--title') {
      options.title = args[++i];
    } else if (arg === '--content') {
      options.content = args[++i];
    } else if (arg === '--append') {
      options.appendContent = args[++i];
    } else if (arg === '--var' || arg === '-v') {
      const pair = args[++i];
      if (pair) {
        const eqIndex = pair.indexOf('=');
        if (eqIndex > 0) {
          vars[pair.substring(0, eqIndex)] = pair.substring(eqIndex + 1);
        }
      }
    } else if (arg === '--page-size') {
      options.pageSize = parseInt(args[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  options.vars = vars;
  return { command, options };
}

/**
 * ヘルプメッセージを表示
 */
function showHelp() {
  console.log(`
Reflexio Notion Sync Tool — Notion 一括同期 CLI

使用方法:
  node cli.js <command> [options]

コマンド:
  sync        テンプレートを使ったページ作成
  batch       YAML/JSON ジョブファイルでバッチ実行
  upsert      条件付き更新（既存→更新、なし→新規作成）
  templates   テンプレート一覧表示

共通オプション:
  --help, -h              ヘルプ表示

sync オプション:
  --template, -t <name>   テンプレート名（必須）
  --var, -v <key=value>   変数指定（複数可）

batch オプション:
  --file, -f <path>       ジョブファイルパス（YAML/JSON）

upsert オプション:
  --database-id, --db <id>      対象 Database ID（必須）
  --filter-property <name>      検索プロパティ名（必須）
  --filter-value <value>        検索値（必須）
  --template, -t <name>         テンプレート名（任意）
  --title <title>               ページタイトル（テンプレート未使用時）
  --content <text>              コンテンツ（テンプレート未使用時）
  --append <text>               既存ページへの追記テキスト
  --var, -v <key=value>         変数指定（複数可）

環境変数:
  NOTION_API_KEY                Notion Integration API キー（必須）

使用例:
  # テンプレートでページ作成
  node cli.js sync -t agent_report -v agent=PL -v status=completed -v summary="Sprint完了" -v database_id=abc123

  # バッチ実行
  node cli.js batch -f jobs/daily_report.yaml

  # Upsert（日付で検索→更新 or 作成）
  node cli.js upsert --db abc123 --filter-property Date --filter-value 2026-02-25 \\
    -t status_update -v status=working

  # テンプレート一覧
  node cli.js templates
`);
}

/**
 * sync コマンド実行
 */
async function handleSync(options) {
  if (!options.template) {
    console.error('エラー: --template (-t) は必須です');
    process.exit(1);
  }

  try {
    const result = await syncWithTemplate(options.template, options.vars);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error(`sync 失敗: ${error.message}`);
    console.error(`エラー: ${error.message}`);
    process.exit(1);
  }
}

/**
 * batch コマンド実行
 */
async function handleBatch(options) {
  if (!options.file) {
    console.error('エラー: --file (-f) は必須です');
    process.exit(1);
  }

  try {
    const results = await runBatchFromFile(options.file);
    console.log(JSON.stringify(results, null, 2));

    const failed = results.filter(r => r.status === 'failed').length;
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    logger.error(`batch 失敗: ${error.message}`);
    console.error(`エラー: ${error.message}`);
    process.exit(1);
  }
}

/**
 * upsert コマンド実行
 */
async function handleUpsert(options) {
  if (!options.databaseId) {
    console.error('エラー: --database-id (--db) は必須です');
    process.exit(1);
  }
  if (!options.filterProperty || !options.filterValue) {
    console.error('エラー: --filter-property と --filter-value は必須です');
    process.exit(1);
  }

  try {
    // フィルター構築ヘルパー（Date 型推定対応）
    function buildFilter(property, value) {
      if (property === 'Date' || property.toLowerCase().includes('date')) {
        return { property, date: { equals: value } };
      }
      return { property, rich_text: { equals: value } };
    }

    // テンプレートからパラメータ解決（あれば）
    let params;
    if (options.template) {
      const { resolveTemplate } = await import('./lib/template.js');
      const resolved = resolveTemplate(options.template, options.vars);
      params = {
        database_id: options.databaseId,
        filter: buildFilter(options.filterProperty, options.filterValue),
        title: resolved.title,
        properties: resolved.properties,
        content: resolved.content,
        appendContent: options.appendContent,
      };
    } else {
      params = {
        database_id: options.databaseId,
        filter: buildFilter(options.filterProperty, options.filterValue),
        title: options.title || `${options.filterProperty}: ${options.filterValue}`,
        properties: {},
        content: options.content,
        appendContent: options.appendContent,
      };
    }

    const result = await upsert(params);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error(`upsert 失敗: ${error.message}`);
    console.error(`エラー: ${error.message}`);
    process.exit(1);
  }
}

/**
 * templates コマンド実行
 */
function handleTemplates() {
  const templates = listTemplates();

  if (templates.length === 0) {
    console.log('テンプレートがありません。');
    return;
  }

  console.log('利用可能なテンプレート:\n');
  for (const t of templates) {
    console.log(`  ${t.name}`);
    console.log(`    説明: ${t.description}`);
    if (t.variables.length > 0) {
      console.log('    変数:');
      for (const v of t.variables) {
        const req = v.required ? '(必須)' : `(任意, デフォルト: "${v.default}")`;
        console.log(`      - {{${v.name}}} ${req} ${v.description}`);
      }
    }
    console.log('');
  }
}

// --- メイン ---
async function main() {
  const { command, options } = parseArgs(process.argv);

  if (options.help || !command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  switch (command) {
    case 'sync':
      await handleSync(options);
      break;
    case 'batch':
      await handleBatch(options);
      break;
    case 'upsert':
      await handleUpsert(options);
      break;
    case 'templates':
      handleTemplates();
      break;
    default:
      console.error(`不明なコマンド: "${command}"`);
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  logger.error(`予期しないエラー: ${error.message}`);
  console.error(`エラー: ${error.message}`);
  process.exit(1);
});
