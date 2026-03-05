/**
 * Reflexio Dashboard Viewer - Express バックエンド
 * エージェント状況、進捗タイムライン、Summaryを提供するAPIサーバー
 */

const express = require('express');
const path = require('path');
const { parseDashboard, parseTimeline, buildSummary } = require('./lib/parser');

const app = express();
const PORT = process.env.PORT || 8080;

// .agent/ ディレクトリのベースパス
const AGENT_DIR = path.resolve(__dirname, '../../.agent');
const DASHBOARD_PATH = path.join(AGENT_DIR, 'dashboard.md');
const TIMELINE_PATH = path.join(AGENT_DIR, 'remote', 'user_to_pm.md');
const REPORTS_DIR = path.join(AGENT_DIR, 'reports');
const NOTIFY_LOG_PATH = path.join(AGENT_DIR, 'agent_notify.log');

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'public')));

// --- API エンドポイント ---

/**
 * GET /api/agents - エージェント状況一覧
 */
app.get('/api/agents', (req, res) => {
  try {
    const data = parseDashboard(DASHBOARD_PATH);
    res.json(data);
  } catch (err) {
    console.error('[/api/agents] エラー:', err.message);
    res.json({ agents: [], lastUpdated: '' });
  }
});

/**
 * GET /api/timeline - 依頼タイムライン
 */
app.get('/api/timeline', (req, res) => {
  try {
    const data = parseTimeline(TIMELINE_PATH);
    res.json(data);
  } catch (err) {
    console.error('[/api/timeline] エラー:', err.message);
    res.json([]);
  }
});

/**
 * GET /api/summary - 今日のSummary
 */
app.get('/api/summary', (req, res) => {
  try {
    const data = buildSummary(TIMELINE_PATH, REPORTS_DIR, NOTIFY_LOG_PATH);
    res.json(data);
  } catch (err) {
    console.error('[/api/summary] エラー:', err.message);
    res.json({ counts: { total: 0, completed: 0, in_progress: 0, unread: 0 }, recentReports: [], recentNotifications: [] });
  }
});

// --- サーバー起動 ---
app.listen(PORT, () => {
  console.log(`Reflexio Dashboard Viewer が起動しました: http://localhost:${PORT}`);
  console.log(`データソース: ${AGENT_DIR}`);
});
