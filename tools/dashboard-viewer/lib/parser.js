/**
 * Reflexio .agent/ ファイルパーサー
 * Markdownテーブル、TSVログ、レポートファイルをJSONに変換する
 */

const fs = require('fs');
const path = require('path');

/**
 * Markdownテーブルをパースして配列に変換する汎用関数
 * @param {string} content - Markdownファイルの内容
 * @param {string[]} columns - カラム名の配列
 * @returns {Object[]} パース済みオブジェクト配列
 */
function parseMarkdownTable(content, columns) {
  const lines = content.split('\n');
  const results = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // 空行、ヘッダー行、区切り行をスキップ
    if (!trimmed || !trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;

    const cells = trimmed
      .split('|')
      .slice(1, -1) // 先頭・末尾の空要素を除去
      .map(c => c.trim());

    // 区切り行（---）をスキップ
    if (cells.every(c => /^-+$/.test(c))) continue;

    // ヘッダー行（カラム名が含まれる行）をスキップ
    if (cells.length === columns.length && cells[0] === columns[0]) continue;

    // カラム数が合わない行はスキップ
    if (cells.length < columns.length) continue;

    const row = {};
    columns.forEach((col, i) => {
      row[col] = cells[i] || '';
    });
    results.push(row);
  }

  return results;
}

/**
 * dashboard.md をパースしてエージェント情報を返す
 * @param {string} filePath - dashboard.md のパス
 * @returns {Object} { agents: [], lastUpdated: string }
 */
function parseDashboard(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // ダッシュボード全体の最終更新を取得
    const lastUpdatedMatch = content.match(/最終更新:\s*(.+)/);
    const dashboardLastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : '';

    // エージェント状況テーブルをパース
    const columns = ['id', 'role', 'status', 'currentTask', 'messageId', 'lastUpdated'];
    const agents = parseMarkdownTable(content, columns);

    // ヘッダー行のIDカラムが "ID" な行をフィルタ
    const filtered = agents.filter(a => a.id !== 'ID');

    return {
      agents: filtered,
      lastUpdated: dashboardLastUpdated
    };
  } catch (err) {
    return { agents: [], lastUpdated: '' };
  }
}

/**
 * user_to_pm.md をパースして依頼タイムラインを返す
 * @param {string} filePath - user_to_pm.md のパス
 * @returns {Object[]} [{ id, timestamp, subject, status }, ...]
 */
function parseTimeline(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const columns = ['id', 'timestamp', 'subject', 'status'];
    const rows = parseMarkdownTable(content, columns);
    // id カラムが "id" のヘッダー行を除外し、新しい順にソート
    return rows
      .filter(r => r.id !== 'id')
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  } catch (err) {
    return [];
  }
}

/**
 * agent_notify.log をパースして通知エントリを返す
 * @param {string} filePath - agent_notify.log のパス
 * @returns {Object[]} [{ timestamp, agentId, reportFilename, summary }, ...]
 */
function parseNotifyLog(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const results = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // コメント行・空行をスキップ
      if (!trimmed || trimmed.startsWith('#')) continue;

      const parts = trimmed.split('\t');
      if (parts.length >= 4) {
        results.push({
          timestamp: parts[0],
          agentId: parts[1],
          reportFilename: parts[2],
          summary: parts[3]
        });
      }
    }

    // 新しい順にソート
    return results.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  } catch (err) {
    return [];
  }
}

/**
 * reports/ ディレクトリの最新レポートファイルを読み取る
 * @param {string} dirPath - reports/ ディレクトリのパス
 * @param {number} limit - 取得件数上限
 * @returns {Object[]} [{ filename, agentId, timestamp, summary }, ...]
 */
function parseReports(dirPath, limit = 3) {
  try {
    const files = fs.readdirSync(dirPath)
      .filter(f => f.startsWith('agent_report_') && f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, limit);

    return files.map(filename => {
      // ファイル名からエージェントID・タイムスタンプを抽出
      // agent_report_{agentId}_{timestamp}.md
      const match = filename.match(/^agent_report_(\w+)_(.+)\.md$/);
      const agentId = match ? match[1] : '';
      // YYYY-MM-DDTHH-MM-SS → YYYY-MM-DDTHH:MM:SS（T以降のハイフンのみコロンに変換）
      const rawTs = match ? match[2] : '';
      const tIdx = rawTs.indexOf('T');
      const timestamp = tIdx >= 0
        ? rawTs.substring(0, tIdx + 1) + rawTs.substring(tIdx + 1).replace(/-/g, ':')
        : rawTs;

      // ファイル先頭から summary を取得
      let summary = '';
      try {
        const content = fs.readFileSync(path.join(dirPath, filename), 'utf-8');
        // "## 完了内容" セクションの次の行を取得
        const completedMatch = content.match(/## 完了内容\s*\n\s*\n(.+)/);
        if (completedMatch) {
          summary = completedMatch[1].trim();
        }
      } catch (e) {
        // ファイル読み取り失敗は無視
      }

      return { filename, agentId, timestamp, summary };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Summary 情報を集約して返す
 * @param {string} timelinePath - user_to_pm.md のパス
 * @param {string} reportsDir - reports/ ディレクトリのパス
 * @param {string} notifyLogPath - agent_notify.log のパス
 * @returns {Object} { counts, recentReports, recentNotifications }
 */
function buildSummary(timelinePath, reportsDir, notifyLogPath) {
  const timeline = parseTimeline(timelinePath);
  const reports = parseReports(reportsDir, 3);
  const notifications = parseNotifyLog(notifyLogPath);

  // ステータス別カウント
  const counts = {
    total: timeline.length,
    completed: timeline.filter(t => t.status === 'completed').length,
    in_progress: timeline.filter(t => t.status === 'in_progress').length,
    unread: timeline.filter(t => t.status === 'unread').length
  };

  return {
    counts,
    recentReports: reports,
    recentNotifications: notifications.slice(0, 5)
  };
}

module.exports = {
  parseDashboard,
  parseTimeline,
  parseNotifyLog,
  parseReports,
  buildSummary
};
