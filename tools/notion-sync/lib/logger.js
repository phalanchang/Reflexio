/**
 * ロギングモジュール
 * ファイル + コンソール出力に対応
 * ログフォーマット: [ISO8601] [LEVEL] メッセージ
 */
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_DIR = join(__dirname, '..', 'logs');
const LOG_FILE = join(LOG_DIR, 'sync.log');

// ログディレクトリを確保
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * ログレベル定義
 */
const LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

/**
 * ログメッセージをフォーマットして出力
 * @param {string} level - ログレベル
 * @param {string} message - メッセージ
 * @param {Object} [data] - 追加データ（任意）
 */
function log(level, message, data) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  const line = `[${timestamp}] [${level}] ${message}${dataStr}\n`;

  // 全レベルを stderr に出力（stdout は CLI の JSON 出力に使用）
  process.stderr.write(line);

  // ファイル出力
  try {
    appendFileSync(LOG_FILE, line, 'utf8');
  } catch {
    // ファイル書き込み失敗は無視（stderr にはすでに出力済み）
  }
}

export function debug(message, data) { log(LEVELS.DEBUG, message, data); }
export function info(message, data) { log(LEVELS.INFO, message, data); }
export function warn(message, data) { log(LEVELS.WARN, message, data); }
export function error(message, data) { log(LEVELS.ERROR, message, data); }

export default { debug, info, warn, error };
