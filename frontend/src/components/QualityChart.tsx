'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { QualityTimelinePoint } from '@/types';

interface QualityChartProps {
  data: QualityTimelinePoint[];
  baseline?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-800 border border-surface-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-teal">
        Score: {payload[0]?.value}
      </p>
      {payload[1] && (
        <p className="text-xs text-gray-400">
          {payload[1]?.value?.toLocaleString()} conversations
        </p>
      )}
    </div>
  );
}

export function QualityChart({ data, baseline = 87 }: QualityChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00D4B4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00D4B4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2D40" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[40, 100]}
          tick={{ fill: '#6B7280', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={baseline}
          stroke="#374151"
          strokeDasharray="4 4"
          label={{ value: 'baseline', fill: '#4B5563', fontSize: 10, position: 'right' }}
        />
        <Area
          type="monotone"
          dataKey="averageScore"
          stroke="#00D4B4"
          strokeWidth={2}
          fill="url(#scoreGradient)"
          dot={{ fill: '#00D4B4', strokeWidth: 0, r: 3 }}
          activeDot={{ fill: '#00D4B4', r: 5, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
