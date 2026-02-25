/**
 * テンプレートエンジン
 * YAML テンプレートファイルを読み込み、変数展開して Notion API パラメータを生成
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');

/**
 * テンプレートファイルを読み込む
 * @param {string} name - テンプレート名（拡張子不要）
 * @returns {Object} パース済みテンプレート
 */
export function loadTemplate(name) {
  const filePath = join(TEMPLATES_DIR, `${name}.yaml`);
  try {
    const content = readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`テンプレート "${name}" が見つかりません: ${filePath}`);
    }
    throw new Error(`テンプレート読み込みエラー: ${error.message}`);
  }
}

/**
 * 利用可能なテンプレート一覧を取得
 * @returns {Array<Object>} テンプレート情報一覧
 */
export function listTemplates() {
  try {
    const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.yaml'));
    return files.map(f => {
      try {
        const template = loadTemplate(f.replace('.yaml', ''));
        return {
          name: template.name || f.replace('.yaml', ''),
          description: template.description || '-',
          variables: (template.variables || []).map(v => ({
            name: v.name,
            required: v.required || false,
            default: v.default || '',
            description: v.description || '',
          })),
        };
      } catch {
        return { name: f.replace('.yaml', ''), description: '(読み込みエラー)', variables: [] };
      }
    });
  } catch {
    return [];
  }
}

/**
 * テンプレート内の変数を展開
 * @param {*} obj - 展開対象（文字列、配列、オブジェクトを再帰処理）
 * @param {Object} vars - 変数マップ
 * @returns {*} 展開済みオブジェクト
 */
export function expandVariables(obj, vars) {
  if (typeof obj === 'string') {
    // {{variable}} パターンを置換
    return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in vars) {
        return vars[key];
      }
      return match; // 未定義の変数はそのまま残す
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(item => expandVariables(item, vars));
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[expandVariables(key, vars)] = expandVariables(value, vars);
    }
    return result;
  }

  return obj;
}

/**
 * テンプレートを展開して Notion API 用パラメータを生成
 * @param {string} templateName - テンプレート名
 * @param {Object} vars - 変数マップ
 * @returns {Object} { database_id, title, properties, content }
 */
export function resolveTemplate(templateName, vars) {
  const template = loadTemplate(templateName);

  // デフォルト値を適用
  const resolvedVars = { ...vars };
  if (template.variables) {
    for (const v of template.variables) {
      if (!(v.name in resolvedVars)) {
        if (v.required) {
          throw new Error(`必須変数 "{{${v.name}}}" が指定されていません: ${v.description || ''}`);
        }
        // デフォルト値の特殊処理
        if (v.default === 'today') {
          resolvedVars[v.name] = new Date().toISOString().split('T')[0];
        } else {
          resolvedVars[v.name] = v.default ?? '';
        }
      }
    }
  }

  // "today" 特殊値を日付に変換
  if (resolvedVars.date === 'today') {
    resolvedVars.date = new Date().toISOString().split('T')[0];
  }

  logger.info(`テンプレート "${templateName}" を展開`, { variables: Object.keys(resolvedVars) });

  // 各フィールドを展開
  const result = {
    database_id: expandVariables(template.database_id, resolvedVars),
    title: expandVariables(template.title, resolvedVars),
    properties: template.properties ? expandVariables(template.properties, resolvedVars) : {},
    content: template.content ? expandVariables(template.content, resolvedVars) : '',
  };

  return result;
}

export default { loadTemplate, listTemplates, expandVariables, resolveTemplate };
