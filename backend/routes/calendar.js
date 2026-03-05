const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAuthenticatedClient, GOOGLE_EVENT_COLORS } = require('../config/google');
const pool = require('../config/database');
const { google } = require('googleapis');

// 全ルートに認証ミドルウェアを適用
router.use(requireAuth);

// Google API エラーハンドリングヘルパー
function handleGoogleApiError(error, res) {
  if (error.code === 401 || error.message?.includes('invalid_grant')) {
    return res.status(401).json({
      error: 'Google カレンダーの再接続が必要です',
      code: 'TOKEN_EXPIRED'
    });
  }
  if (error.code === 429) {
    return res.status(429).json({
      error: 'しばらく待ってから再度お試しください',
      code: 'RATE_LIMITED'
    });
  }
  return res.status(502).json({
    error: 'Google カレンダーにアクセスできません',
    code: 'GOOGLE_API_ERROR'
  });
}

// 期間に基づいて timeMin / timeMax を計算
function getTimeRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  let timeMin;
  switch (period) {
    case 'week': {
      // 今週月曜日
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      timeMin = new Date(today.getTime() + mondayOffset * 24 * 60 * 60 * 1000);
      break;
    }
    case 'month':
      // 今月1日
      timeMin = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case '7days':
    default:
      // 7日前
      timeMin = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }

  return {
    timeMin: timeMin.toISOString(),
    timeMax: endOfToday.toISOString()
  };
}

// GET /api/calendar/calendars — カレンダー一覧
router.get('/calendars', async (req, res) => {
  try {
    const oauth2Client = await getAuthenticatedClient(req.session.userId);
    if (!oauth2Client) {
      return res.status(400).json({
        error: 'Google カレンダーが接続されていません',
        code: 'NOT_CONNECTED'
      });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();

    const calendars = calendarList.data.items.map(cal => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor || '#4285f4'
    }));

    res.json({ calendars });
  } catch (error) {
    console.error('カレンダー一覧取得エラー:', error);
    if (error.code) {
      return handleGoogleApiError(error, res);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/events — イベント一覧（生データ）
router.get('/events', async (req, res) => {
  try {
    const oauth2Client = await getAuthenticatedClient(req.session.userId);
    if (!oauth2Client) {
      return res.status(400).json({
        error: 'Google カレンダーが接続されていません',
        code: 'NOT_CONNECTED'
      });
    }

    const period = req.query.period || '7days';
    const { timeMin, timeMax } = getTimeRange(period);

    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    // 全カレンダー取得
    const calendarList = await calendarApi.calendarList.list();
    const calendars = calendarList.data.items;

    // 全カレンダーのイベントを取得
    const allEvents = [];
    for (const cal of calendars) {
      try {
        const eventsResponse = await calendarApi.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = eventsResponse.data.items || [];
        for (const event of events) {
          // 終日イベントを除外（start.dateTime が存在するもののみ）
          if (!event.start?.dateTime) continue;

          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          const duration = (end.getTime() - start.getTime()) / 3600000;

          allEvents.push({
            id: event.id,
            summary: event.summary || '（無題）',
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarName: cal.summary,
            calendarColor: cal.backgroundColor || '#4285f4',
            duration: Math.round(duration * 10) / 10,
          });
        }
      } catch (calError) {
        console.error(`カレンダー "${cal.summary}" のイベント取得エラー（スキップ）:`, calError.message);
      }
    }

    // startTime でソート
    allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    res.json({ events: allEvents });
  } catch (error) {
    console.error('イベント取得エラー:', error);
    if (error.code) {
      return handleGoogleApiError(error, res);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calendar/summary — 日別×カテゴリ集計データ（棒グラフ用）
router.get('/summary', async (req, res) => {
  try {
    const oauth2Client = await getAuthenticatedClient(req.session.userId);
    if (!oauth2Client) {
      return res.status(400).json({
        error: 'Google カレンダーが接続されていません',
        code: 'NOT_CONNECTED'
      });
    }

    const period = req.query.period || '7days';
    const { timeMin, timeMax } = getTimeRange(period);

    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

    // 全カレンダー取得
    const calendarList = await calendarApi.calendarList.list();
    const calendars = calendarList.data.items;

    // カレンダー情報マップ
    const calendarInfoMap = {};
    calendars.forEach(cal => {
      calendarInfoMap[cal.id] = {
        name: cal.summary,
        color: cal.backgroundColor || '#4285f4'
      };
    });

    // 全イベント取得
    const rawEvents = [];
    for (const cal of calendars) {
      try {
        const eventsResponse = await calendarApi.events.list({
          calendarId: cal.id,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = eventsResponse.data.items || [];
        for (const event of events) {
          // 終日イベント除外
          if (!event.start?.dateTime) continue;

          rawEvents.push({
            start: new Date(event.start.dateTime),
            end: new Date(event.end.dateTime),
            calendarId: cal.id,
            colorId: event.colorId ? parseInt(event.colorId) : null,
          });
        }
      } catch (calError) {
        console.error(`カレンダー "${cal.summary}" のイベント取得エラー（スキップ）:`, calError.message);
      }
    }

    // category_mappings をDBから取得（colorIdベースのカスタム名）
    const [mappingRows] = await pool.execute(
      'SELECT google_color_id, category_name, display_color FROM category_mappings WHERE user_id = ?',
      [req.session.userId]
    );
    const userMappings = {};
    mappingRows.forEach(row => {
      userMappings[row.google_color_id] = { name: row.category_name, color: row.display_color };
    });

    // 集計: 日付 × カテゴリ名 でグループ化
    // 日をまたぐイベントは各日に分割
    const dailyData = {};

    for (const event of rawEvents) {
      let categoryName, categoryColor;

      if (event.colorId && GOOGLE_EVENT_COLORS[event.colorId]) {
        // colorId あり → カテゴリマッピング or デフォルト色名
        const mapping = userMappings[event.colorId];
        if (mapping) {
          categoryName = mapping.name;
          categoryColor = mapping.color;
        } else {
          const defaultColor = GOOGLE_EVENT_COLORS[event.colorId];
          categoryName = defaultColor.name;
          categoryColor = defaultColor.color;
        }
      } else {
        // colorId なし → カレンダー名でグルーピング（現行互換）
        const calInfo = calendarInfoMap[event.calendarId];
        if (!calInfo) continue;
        categoryName = calInfo.name;
        categoryColor = calInfo.color;
      }

      let currentDayStart = new Date(event.start);
      const eventEnd = event.end;

      while (currentDayStart < eventEnd) {
        const dateStr = currentDayStart.toISOString().slice(0, 10);

        // この日の開始と終了を計算（clamp）
        const dayStart = new Date(currentDayStart.getFullYear(), currentDayStart.getMonth(), currentDayStart.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const effectiveStart = event.start > dayStart ? event.start : dayStart;
        const effectiveEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
        const hours = (effectiveEnd.getTime() - effectiveStart.getTime()) / 3600000;

        if (hours > 0) {
          if (!dailyData[dateStr]) dailyData[dateStr] = {};
          if (!dailyData[dateStr][categoryName]) {
            dailyData[dateStr][categoryName] = { hours: 0, color: categoryColor };
          }
          dailyData[dateStr][categoryName].hours += hours;
        }

        // 次の日へ
        currentDayStart = dayEnd;
      }
    }

    // 期間内の全日付を生成（イベントのない日も含める）
    const startDate = new Date(timeMin);
    const endDate = new Date(timeMax);
    const allDates = [];
    for (
      let d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      allDates.push(d.toISOString().slice(0, 10));
    }

    // レスポンス形式に変換（全日付を含む）
    const data = allDates.map(date => {
      if (dailyData[date]) {
        const categories = Object.entries(dailyData[date]).map(([name, info]) => ({
          name,
          hours: Math.round(info.hours * 10) / 10,
          color: info.color
        }));
        const total = Math.round(categories.reduce((sum, c) => sum + c.hours, 0) * 10) / 10;
        return { date, categories, total };
      } else {
        return { date, categories: [], total: 0 };
      }
    });

    // ユニークなカレンダー一覧
    const uniqueCalendars = [];
    const seenCalNames = new Set();
    for (const day of data) {
      for (const cat of day.categories) {
        if (!seenCalNames.has(cat.name)) {
          seenCalNames.add(cat.name);
          uniqueCalendars.push({ name: cat.name, color: cat.color });
        }
      }
    }

    res.json({ period, data, calendars: uniqueCalendars });
  } catch (error) {
    console.error('集計データ取得エラー:', error);
    if (error.code) {
      return handleGoogleApiError(error, res);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
