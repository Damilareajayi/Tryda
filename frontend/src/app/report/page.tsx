'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { QualityChart } from '@/components/QualityChart';
import { ExportButtons } from '@/components/ExportButtons';
import { fetchReport, fetchBusiness } from '@/lib/api';
import { PerformanceReport, BusinessProfile } from '@/types';
import { rootCauseLabel, formatDate } from '@/lib/utils';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function ReportPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchReport(7), fetchBusiness()])
      .then(([r, b]) => {
        setReport(r);
        setBusiness(b);
      })
      .catch(() => setError('Could not load the report from the Tryda API.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading report...</p>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-status-critical">{error || 'No report available'}</p>
        </main>
      </div>
    );
  }

  const { summary } = report;

  const TrendIcon = summary.trend === 'improving' ? TrendingUp
    : summary.trend === 'degrading' ? TrendingDown : Minus;

  const trendColor = summary.trend === 'improving' ? 'text-status-healthy'
    : summary.trend === 'degrading' ? 'text-status-critical' : 'text-gray-400';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Performance Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(report.period.from)} — {formatDate(report.period.to)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {business && (
              <ExportButtons
                tier={business.subscriptionTier}
                filenameBase="tryda-quality-timeline"
                sheetName="Quality Timeline"
                rows={report.qualityTimeline}
              />
            )}
            <button className="btn-primary">Download PDF</button>
          </div>
        </div>

        {/* Highlights */}
        <div className="card border-teal/20 bg-teal-glow/20">
          <p className="section-label">Weekly Summary</p>
          <ul className="space-y-2">
            {report.highlights.map((h, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-300">
                <span className="text-teal shrink-0">›</span>{h}
              </li>
            ))}
          </ul>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Conversations', value: summary.totalConversations.toLocaleString() },
            { label: 'Avg Quality Score', value: `${summary.averageQualityScore}/100` },
            { label: 'Drift Events', value: summary.driftEventsCount },
            { label: 'Critical Incidents', value: summary.criticalIncidents, highlight: summary.criticalIncidents > 0 ? 'text-status-critical' : undefined },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="card">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={cn('text-2xl font-bold tabular-nums', highlight || 'text-gray-100')}>{value}</p>
            </div>
          ))}
        </div>

        {/* Trend */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-200">Quality Trend</p>
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              <TrendIcon size={14} />
              {summary.trend === 'stable' ? 'Stable' : `${Math.abs(summary.trendPercentage)}% ${summary.trend}`}
            </div>
          </div>
          <QualityChart data={report.qualityTimeline} baseline={87} />
        </div>

        {/* Top issues */}
        {report.topIssues.length > 0 && (
          <div className="card">
            <p className="section-label">Top Issues</p>
            <div className="space-y-3">
              {report.topIssues.map((issue, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-sm text-gray-200">{rootCauseLabel(issue.rootCause)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{issue.frequency}x detected</span>
                    <span className="text-status-critical">avg -{issue.avgScoreDrop} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
