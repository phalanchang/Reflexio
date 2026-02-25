/**
 * レート制限管理モジュール
 * Notion API: 3 req/sec 制限に対応
 * - キュー機能で自動レート制限（リクエスト間隔 ~340ms に自動調整）
 * - 429 レスポンス時の自動リトライ（指数バックオフ）
 */
import logger from './logger.js';

/**
 * レート制限付きキュー
 */
export class RateLimiter {
  /**
   * @param {Object} options
   * @param {number} [options.requestsPerSecond=3] - 1秒あたりの最大リクエスト数
   * @param {number} [options.maxRetries=3] - 最大リトライ回数
   * @param {number} [options.baseRetryDelay=1000] - 基本リトライ待機時間（ms）
   */
  constructor(options = {}) {
    this.requestsPerSecond = options.requestsPerSecond || 3;
    this.maxRetries = options.maxRetries || 3;
    this.baseRetryDelay = options.baseRetryDelay || 1000;
    this.minInterval = Math.ceil(1000 / this.requestsPerSecond); // ~334ms
    this.lastRequestTime = 0;
    this.queue = [];
    this.processing = false;
  }

  /**
   * レート制限を考慮して非同期関数を実行
   * @param {Function} fn - 実行する非同期関数
   * @returns {Promise<*>} 関数の戻り値
   */
  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._processQueue();
    });
  }

  /**
   * キューを順次処理
   */
  async _processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();

      // レート制限の待機
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.minInterval) {
        const waitTime = this.minInterval - elapsed;
        await this._sleep(waitTime);
      }

      // リトライ付き実行
      try {
        const result = await this._executeWithRetry(fn);
        this.lastRequestTime = Date.now();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * リトライ付き実行（指数バックオフ）
   * @param {Function} fn - 実行する関数
   * @returns {Promise<*>}
   */
  async _executeWithRetry(fn) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 429 (レート制限) の場合はリトライ
        if (error.status === 429 && attempt < this.maxRetries) {
          const retryAfter = this._getRetryAfter(error);
          const delay = retryAfter || (this.baseRetryDelay * Math.pow(2, attempt));
          logger.warn(
            `レート制限 (429)。${delay}ms 後にリトライ (${attempt + 1}/${this.maxRetries})`,
            { attempt: attempt + 1, delay }
          );
          await this._sleep(delay);
          continue;
        }

        // その他の一時的エラー (5xx) もリトライ
        if (error.status >= 500 && attempt < this.maxRetries) {
          const delay = this.baseRetryDelay * Math.pow(2, attempt);
          logger.warn(
            `サーバーエラー (${error.status})。${delay}ms 後にリトライ (${attempt + 1}/${this.maxRetries})`,
            { attempt: attempt + 1, delay, status: error.status }
          );
          await this._sleep(delay);
          continue;
        }

        // リトライ不要なエラーは即座にスロー
        throw error;
      }
    }

    logger.error(`最大リトライ回数 (${this.maxRetries}) を超過`, { error: lastError.message });
    throw lastError;
  }

  /**
   * Retry-After ヘッダーからリトライ待機時間を取得
   * @param {Error} error
   * @returns {number|null} ms 単位の待機時間
   */
  _getRetryAfter(error) {
    const retryAfter = error.headers?.['retry-after'];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return null;
  }

  /**
   * スリープ
   * @param {number} ms
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// デフォルトインスタンス
export const rateLimiter = new RateLimiter();

export default RateLimiter;
