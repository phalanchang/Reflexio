import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import './TimeChart.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}h
        </p>
      ))}
      <p className="chart-tooltip-total">合計: {total.toFixed(1)}h</p>
    </div>
  );
}

function TimeChart({ data, calendars }) {
  // API レスポンス → Recharts データ形式に変換
  const chartData = data.map(day => {
    const item = {
      date: formatDate(day.date),
    };
    day.categories.forEach(cat => {
      item[cat.name] = cat.hours;
    });
    return item;
  });

  return (
    <div className="time-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{ value: '時間 (h)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {calendars.map(cal => (
            <Bar
              key={cal.name}
              dataKey={cal.name}
              stackId="time"
              fill={cal.color}
              name={cal.name}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TimeChart;
