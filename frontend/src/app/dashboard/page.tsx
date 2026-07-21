'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, MessageSquare, AlertTriangle, Lightbulb } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { HealthScoreRing } from '@/components/HealthScoreRing';
import { QualityChart } from '@/components/QualityChart';
import { DriftEventCard } from '@/components/DriftEventCard';
import { RecommendationCard } from '@/components/RecommendationCard';
import { fetchReport, fetchDriftEvents, fetchRecommendations } from '@/lib/api';
import { scoreToStatus } from '@/lib/utils';
import { PerformanceReport, DriftEvent, Recommendation } from '@/types';
import { cn } from '@/lib/utils';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';

function StatCard({
  label, value, icon: Icon, sub, highlight,
}: {
  label: string; value: string | number;
  icon: React.ElementType; sub?: string; highlight?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <Icon size={14} className="text-gray-600" />
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', highlight || 'text-gray-100')}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function TrendBadge({ trend, pct }: { trend: string; pct: number }) {
  if (trend === 'improving') return (
    <span className="flex items-center gap-1 text-xs text-status-healthy font-medium">
      <TrendingUp size={13} /> +{pct}% this week
    </span>
  );
  if (trend === 'degrading') return (
    <span className="flex items-center gap-1 text-xs text-status-critical font-medium">
      <TrendingDown size={13} /> {pct}% this week
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
      <Minus size={13} /> Stable this week
    </span>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [driftEvents, setDriftEvents] = useState<DriftEvent[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchReport(7), fetchDriftEvents(), fetchRecommendations()])
      .then(([r, d, rec]) => {
        setReport(r);
        setDriftEvents(d);
        setRecs(rec);
      })
      .catch(() => setError('Could not load data from the Tryda API.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 flex items-center justify-center">
          <div className="card text-center py-12 px-10 max-w-md">
            <Link href="/">
              <img
                src="/brand/mascot/tryda-mascot-sitting-orb.png"
                alt=""
                className="w-28 mx-auto mb-4 opacity-90"
              />
            </Link>
            <p className="text-gray-300 font-medium">{error || 'No data yet'}</p>
            <p className="text-sm text-gray-500 mt-1">
              Visit the Connect page to set up your API key, then send some conversation logs.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const score = report.summary.averageQualityScore;
  const status = scoreToStatus(score);
  const openEvents = driftEvents.filter((e) => !e.resolved);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="ml-0 lg:ml-56 pt-20 lg:pt-6 flex-1 p-6 space-y-6">
        {user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password') && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-yellow-400 flex items-center gap-1.5 justify-center sm:justify-start">
                <span>✉️</span> Verify your email address
              </p>
              <p className="text-xs text-gray-400">
                Please click the link in the email we sent to <strong>{user.email}</strong> to verify your account and unlock all features.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (auth.currentUser) {
                    sendEmailVerification(auth.currentUser)
                      .then(() => alert('Verification email resent successfully!'))
                      .catch((err) => alert('Failed to resend: ' + err.message));
                  }
                }}
                className="btn-primary text-xs px-3 py-1.5 h-auto text-navy-950 font-semibold"
              >
                Resend Email
              </button>
              <button
                onClick={() => {
                  if (auth.currentUser) {
                    auth.currentUser.reload().then(() => {
                      window.location.reload();
                    });
                  }
                }}
                className="btn-ghost border border-surface-border text-xs px-3 py-1.5 h-auto text-gray-300"
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/40 pb-4 sm:border-0 sm:pb-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Real-time AI reliability overview
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-navy-900 px-3 py-1.5 rounded-full border border-surface-border">
            <div className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            <span className="text-xs text-gray-500">Live monitoring</span>
          </div>
        </div>

        {/* Top row: Health ring + stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Health ring card */}
          <div className="card col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col items-center justify-center py-6 border-surface-border">
            <HealthScoreRing score={score} status={status} size={140} />
            <div className="mt-4">
              <TrendBadge trend={report.summary.trend} pct={Math.abs(report.summary.trendPercentage)} />
            </div>
          </div>

          {/* Stat cards */}
          <StatCard
            label="Conversations Monitored"
            value={report.summary.totalConversations.toLocaleString()}
            icon={MessageSquare}
            sub="Last 7 days"
          />
          <StatCard
            label="Open Drift Events"
            value={openEvents.length}
            icon={AlertTriangle}
            sub={`${report.summary.resolvedIncidents} resolved`}
            highlight={openEvents.length > 0 ? (openEvents[0]?.severity === 'critical' ? 'text-status-critical' : 'text-status-warning') : undefined}
          />
          <StatCard
            label="Pending Fixes"
            value={recs.filter((r) => !r.applied).length}
            icon={Lightbulb}
            sub="Recommendations waiting"
            highlight={recs.length > 0 ? 'text-status-warning' : undefined}
          />
        </div>

        {/* Highlights */}
        {report.highlights.length > 0 && (
          <div className="card border-teal/20 bg-teal-glow/30">
            <p className="section-label">AI-Generated Insights</p>
            <ul className="space-y-2">
              {report.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-teal mt-0.5 shrink-0">›</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chart */}
        <div className="card w-full overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-200">Quality Score — 7 Day Trend</p>
            <span className="text-xs text-gray-500">Baseline: {87}/100</span>
          </div>
          <QualityChart data={report.qualityTimeline} baseline={87} />
        </div>

        {/* Drift events + Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="section-label">Recent Drift Events</p>
            <div className="space-y-3">
              {driftEvents.slice(0, 3).map((e) => (
                <DriftEventCard key={e.id} event={e} />
              ))}
            </div>
          </div>

          <div>
            <p className="section-label">Top Recommendations</p>
            <div className="space-y-3">
              {recs.slice(0, 3).map((r) => (
                <RecommendationCard key={r.id} rec={r} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
